/**
 * Five Realms pure rules engine. No DOM, browser APIs, or network access.
 * Gameplay values are data-driven from data/config.json.
 */
export const REALM_IDS = Object.freeze(["blue","yellow","purple","red","green"]);
const rankValue = rank => ({A:14,K:13,Q:12,J:11}[rank] ?? Number(rank));
const clone = value => structuredClone(value);
const roundHalfUp = (value, scale) => Math.sign(value) * Math.floor(Math.abs(value) * scale + 0.5) / scale;

export function createSeededRng(seed) {
  let state=(Number(seed)>>>0)||0x6d2b79f5;
  return ()=>{state+=0x6D2B79F5;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
export function shuffle(items,rng=Math.random){
  const result=[...items];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
}
export function createDeck(config,rng=Math.random){
  const {ranks,suits,jokers}=config.deck;
  const cards=suits.flatMap(suit=>ranks.map(rank=>({id:`${rank}-${suit}`,rank,suit,realm:({spades:"blue",diamonds:"yellow",hearts:"red",clubs:"green"})[suit],joker:false,lucky:false})));
  for(let i=0;i<jokers;i++)cards.push({id:`joker-${i+1}`,rank:"JOKER",suit:"joker",realm:"purple",joker:true,lucky:false});
  return shuffle(cards,rng);
}
export function scoreFewCards(count,config){
  if(!Number.isInteger(count)||count<1||count>config.game.handSize)throw new RangeError("A poker action requires 1 to handSize cards.");
  if(config.poker.fewCardMode==="structural"){
    const points={1:1,2:2,3:6,4:16};
    return points[count]??config.poker.fewCardPoints[count];
  }
  return config.poker.fewCardPoints[count];
}
export function evaluateHand(cards,config){
  if(!Array.isArray(cards)||cards.length<1||cards.length>config.game.handSize)throw new RangeError("Choose 1 to handSize cards.");
  if(cards.some(c=>c.joker||c.suit==="joker"||c.rank==="JOKER"))throw new TypeError("Jokers cannot enter poker hands.");
  if(new Set(cards.map(c=>c.id)).size!==cards.length)throw new TypeError("Cards in a hand must be distinct.");
  if(cards.length<config.game.handSize){
    const category={1:"highCard",2:"pair",3:"threeOfAKind",4:"fourOfAKind"}[cards.length]||"highCard";
    return {category,points:scoreFewCards(cards.length,config)};
  }
  const values=cards.map(c=>rankValue(c.rank)).sort((a,b)=>a-b);
  const counts=[...new Set(values)].map(v=>values.filter(n=>n===v).length).sort((a,b)=>b-a);
  const flush=cards.every(c=>c.suit===cards[0].suit),unique=[...new Set(values)];
  const normalStraight=unique.length===5&&unique[4]-unique[0]===4;
  const lowStraight=unique.join(",")==="2,3,4,5,14"&&config.poker.aceLow;
  const straight=normalStraight||lowStraight,royal=unique.join(",")==="10,11,12,13,14"&&config.poker.aceHigh;
  let category;
  if(straight&&flush&&royal)category="royalFlush";
  else if(straight&&flush)category="straightFlush";
  else if(counts[0]===4)category="fourOfAKind";
  else if(counts[0]===3&&counts[1]===2)category="fullHouse";
  else if(flush)category="flush";
  else if(straight)category="straight";
  else if(counts[0]===3)category="threeOfAKind";
  else if(counts[0]===2&&counts[1]===2)category="twoPair";
  else if(counts[0]===2)category="pair";
  else category="highCard";
  return {category,points:config.poker.points[category]};
}
export function createEventEmitter(){
  const listeners=new Set();
  return Object.freeze({
    on(fn){if(typeof fn!=="function")throw new TypeError("Listener must be a function.");listeners.add(fn);return()=>listeners.delete(fn);},
    emit(type,detail={}){const event=Object.freeze({type,detail:clone(detail)});for(const fn of [...listeners])fn(event);}
  });
}
export function createEngine(config,{seed=Date.now(),onEvent=()=>{}}={}){
  if(!config?.deck||!config?.game||!config?.poker||!config?.realms||!config?.badges||!config?.bank)throw new TypeError("A complete game config is required.");
  const rng=createSeededRng(seed),events=createEventEmitter();events.on(onEvent);
  const scale=config.game.roundingScale;
  const money=n=>Math.round(roundHalfUp(Number(n),scale)*scale);
  const drawFrom=state=>{if(!state.deck.length&&state.discard.length)state.deck=shuffle(state.discard,rng),state.discard=[];if(!state.deck.length)throw new Error("No cards remain in the deck or discard pile.");return state.deck.pop();};
  const allCards=state=>[...state.deck,...state.players.flatMap(p=>p.hand)];
  function badgeValueAt(index,realm){const values=[];for(const value of [3,2,1])for(let i=0;i<(realm.badgeValues[value]||0);i++)values.push(value);return values[index]??1;}
  function ownedValue(player,realm){return player.badges.filter(b=>b.realm===realm).reduce((s,b)=>s+b.value,0);}
  function realmTotal(realm){return Object.entries(config.realms[realm].badgeValues).reduce((s,[v,count])=>s+Number(v)*count,0);}
  function realmOwned(player,realm){return player.badges.filter(b=>b.realm===realm).length>=config.realms[realm].badgeCount;}
  function giveLuckyCards(state,player,realm){
    const r=config.realms[realm],definitions=r.luckyCards|| (r.luckyCard?[r.luckyCard]:[]);
    for(const definition of definitions){
      const id=definition.id||`${definition.rank}-${definition.suit}`;
      const own=player.hand.find(c=>c.id===id);
      if(own){own.lucky=true;continue;}
      const deckIndex=state.deck.findIndex(c=>c.id===id);
      let card=deckIndex>=0?state.deck.splice(deckIndex,1)[0]:null;
      if(!card){const discardIndex=state.discard.findIndex(c=>c.id===id);if(discardIndex>=0)card=state.discard.splice(discardIndex,1)[0];}
      if(!card){
        for(const other of state.players){
          if(other.id===player.id)continue;
          const index=other.hand.findIndex(c=>c.id===id);
          if(index>=0){card=other.hand.splice(index,1)[0];break;}
        }
      }
      if(!card)card={id,rank:definition.rank,suit:definition.suit,realm,joker:definition.rank==="JOKER",lucky:true};
      card.lucky=true;card.realm=realm;
      player.hand.push(card);
      events.emit("lucky-card-granted",{playerId:player.id,realm,cardId:id});
    }
  }
  function refreshRealmCompletion(state,player,realm){
    if(realmOwned(player,realm)&&!player.completedRealms.includes(realm)){
      player.completedRealms.push(realm);giveLuckyCards(state,player,realm);
      events.emit("realm-completed",{playerId:player.id,realm});
    }
  }
  function currentWinners(state){
    const sorted=[...state.players].sort((a,b)=>{
      if(b.points!==a.points)return b.points-a.points;
      const bv=b.badges.reduce((s,x)=>s+x.value,0),av=a.badges.reduce((s,x)=>s+x.value,0);
      return bv-av;
    });
    if(!sorted.length)return [];
    const top=sorted[0],value=p=>p.badges.reduce((s,b)=>s+b.value,0);
    return sorted.filter(p=>p.points===top.points&&value(p)===value(top)).map(p=>p.id);
  }
  function beginTurn(state,player){
    if(player.bank){
      const previousTurns=player.bank.turns;
      const interest=accrueBank(player);
      if(player.bank&&player.bank.turns!==previousTurns)events.emit("bank-interest",{playerId:player.id,amount:interest,principal:player.bank.principal,turns:player.bank.turns,negativeFormula:player.bank.negativeFormula});
    }
    events.emit("turn-start",{playerId:player.id,round:state.round});
  }
  function newGame(playerNames){
    if(!Array.isArray(playerNames)||playerNames.length<config.game.minPlayers||playerNames.length>config.game.maxPlayers)throw new RangeError("Player count is outside configured limits.");
    const state={round:1,currentPlayer:0,players:playerNames.map((name,id)=>({id,name:String(name).trim()||`Player ${id+1}`,hand:[],points:money(config.game.startingPoints),badges:[],bank:null,completedRealms:[]})),deck:createDeck(config,rng),discard:[],badgePool:Object.fromEntries(REALM_IDS.map(realm=>[realm,Array.from({length:config.realms[realm].badgeCount},(_,i)=>({id:`${realm}-${i+1}`,realm,value:badgeValueAt(i,config.realms[realm])}))])),over:false,history:[],exchangeBonusAvailable:false,exchangeBonusUsed:false};
    for(const player of state.players)for(let i=0;i<config.game.startingCards;i++)player.hand.push(drawFrom(state));
    beginTurn(state,state.players[0]);return state;
  }
  function finishAction(state,player,{keepTurn=false}={}){
    if(keepTurn){events.emit("exchange-bonus-turn",{playerId:player.id});return state;}
    state.history.push({round:state.round,playerId:player.id});
    state.exchangeBonusAvailable=false;state.exchangeBonusUsed=false;
    state.currentPlayer=(state.currentPlayer+1)%state.players.length;
    if(state.currentPlayer===0)state.round++;
    if(Object.values(state.badgePool).every(pool=>pool.length===0)||state.round>config.game.maxRounds){
      if(state.round>config.game.maxRounds)state.round=config.game.maxRounds;
      state.over=true;state.winnerIds=currentWinners(state);events.emit("game-over",{round:state.round,winnerIds:state.winnerIds});
    }else beginTurn(state,state.players[state.currentPlayer]);
    return state;
  }
  function buyBadge(state,player,realm,badgeId){
    const pool=state.badgePool[realm];if(!pool)return {ok:false,reason:"unknown-realm"};
    const index=pool.findIndex(b=>!badgeId||b.id===badgeId);if(index<0)return {ok:false,reason:"unavailable"};
    const badge=pool[index],T=realmTotal(realm),value=ownedValue(player,realm);
    const hasBlueAce=realm==="blue"&&player.hand.some(card=>card.id==="A-spades");
    const aceDiscount=hasBlueAce?(config.realms.blue.acePurchaseDiscount??0):0;
    const price=money(badge.value*(config.realms[realm].basePriceMultiplier??1)*(1-value/(config.badges.discountShareDivisor*T))*(1-aceDiscount));
    if(player.points<price)return {ok:false,reason:"insufficient-points",price};
    player.points-=price;pool.splice(index,1);player.badges.push({...badge,purchasePrice:price});
    events.emit("badge-bought",{playerId:player.id,realm,badgeId:badge.id,price});
    refreshRealmCompletion(state,player,realm);
    return {ok:true,price,badge};
  }
  function sellBadge(state,player,badgeId){
    const index=player.badges.findIndex(b=>b.id===badgeId);if(index<0)return {ok:false,reason:"not-owned"};
    const [badge]=player.badges.splice(index,1),price=Math.floor(badge.purchasePrice*config.game.exchangeResaleRate+0.5);
    player.points+=price;state.badgePool[badge.realm].push({...badge,purchasePrice:undefined});
    events.emit("badge-sold",{playerId:player.id,realm:badge.realm,badgeId:badge.id,price});
    return {ok:true,price,badge};
  }
  function bankDeposit(player,amount){
    const fraction=(player.points%scale)/scale,max=money(config.bank.maxDepositFactor*fraction);
    if(!Number.isInteger(amount)||!Number.isFinite(amount)||amount<0||amount>max||amount>player.points)return {ok:false,reason:"invalid-deposit",max};
    if(player.bank)return {ok:false,reason:"already-deposited",max};
    player.points-=amount;player.bank={principal:amount,turns:0};events.emit("deposit",{playerId:player.id,amount});return {ok:true,amount};
  }
  function bankWithdraw(player){
    if(!player.bank)return {ok:false,reason:"empty"};
    const amount=player.bank.principal;player.points+=amount;player.bank=null;events.emit("withdraw",{playerId:player.id,amount});return {ok:true,amount};
  }
  function accrueBank(player){
    if(!player.bank||player.bank.turns>=config.bank.interestTurns)return 0;
    const s=player.bank.principal/scale,p=2*Math.floor(s)-s;
    player.bank.negativeFormula=p<0;
    const interest=money(p*config.bank.interestRates[player.bank.turns]);
    player.bank.principal+=interest;player.bank.turns++;return interest;
  }
  function questionAction(state,player,answers){
    for(const realm of REALM_IDS)if(!realmOwned(player,realm)&&typeof answers.parts?.[realm]?.correct!=="boolean")return {ok:false,reason:"missing-answer",realm};
    const counts=Object.fromEntries(REALM_IDS.map(realm=>[realm,player.hand.filter(c=>c.realm===realm).length]));
    const max=Math.max(...Object.values(counts)),tied=REALM_IDS.filter(realm=>counts[realm]===max);
    const forgiven=answers.forgivenRealm&&tied.includes(answers.forgivenRealm)?answers.forgivenRealm:null;
    if(tied.length>1&&!forgiven)return {ok:false,reason:"forgiveness-choice-required",tiedRealms:tied};
    let delta=0;
    for(const realm of REALM_IDS){
      const part=answers.parts?.[realm],free=realmOwned(player,realm);
      const correct=free||part?.correct===true,wrong=!free&&part?.correct===false;
      if(correct){
        const card=drawFrom(state);player.hand.push(card);delta++;
        events.emit("answer-correct",{playerId:player.id,realm,free});
        events.emit("card-drawn",{playerId:player.id,cardId:card.id,reason:"question"});
      }else if(wrong){
        const isForgiven=realm===forgiven;
        events.emit("answer-wrong",{playerId:player.id,realm,forgiven:isForgiven});
        if(!isForgiven){
          const removable=player.hand.filter(c=>!c.lucky);
          if(removable.length){const removed=removable[Math.floor(rng()*removable.length)];player.hand.splice(player.hand.findIndex(c=>c.id===removed.id),1);state.deck.push(removed);delta--;}
        }
      }else return {ok:false,reason:"missing-answer",realm};
    }
    finishAction(state,player);return {ok:true,delta};
  }
  function exchangeAction(state,player,returnedCardId,chosenCardId){
    const index=player.hand.findIndex(c=>c.id===returnedCardId);if(index<0)return {ok:false,reason:"card-not-owned"};
    const returned=player.hand[index];
    if(returned.lucky&&!returned.joker)return {ok:false,reason:"lucky-card-protected"};
    if(returned.joker||returned.suit==="joker"){
      if(!chosenCardId)return {ok:false,reason:"joker-choice-required"};
      let chosenIndex=state.deck.findIndex(c=>c.id===chosenCardId),chosen;
      if(chosenIndex>=0)chosen=state.deck.splice(chosenIndex,1)[0];
      else {chosenIndex=state.discard.findIndex(c=>c.id===chosenCardId);if(chosenIndex<0)return {ok:false,reason:"chosen-card-unavailable"};chosen=state.discard.splice(chosenIndex,1)[0];}
      player.hand.push(chosen);
      events.emit("joker-swapped",{playerId:player.id,jokerId:returned.id,cardId:chosen.id,realm:"purple"});
      finishAction(state,player);return {ok:true,card:chosen,jokerRetained:true};
    }
    if(state.exchangeBonusAvailable){
      state.exchangeBonusAvailable=false;state.exchangeBonusUsed=true;
      const incoming=drawFrom(state);player.hand.splice(index,1);state.deck.push(returned);player.hand.push(incoming);
      events.emit("card-drawn",{playerId:player.id,cardId:incoming.id,reason:"exchange-bonus"});
      finishAction(state,player);return {ok:true,card:incoming,bonusExchange:true};
    }
    const incoming=drawFrom(state),returnedOwned=realmOwned(player,returned.realm),incomingOwned=realmOwned(player,incoming.realm);
    if(returnedOwned&&incomingOwned){
      player.hand.push(incoming);const extra=drawFrom(state);player.hand.push(extra);
      events.emit("card-drawn",{playerId:player.id,cardId:incoming.id,reason:"owned-exchange"});
      events.emit("card-drawn",{playerId:player.id,cardId:extra.id,reason:"owned-exchange-bonus"});
      finishAction(state,player);return {ok:true,card:incoming,extraCard:extra,returned:false};
    }
    player.hand.splice(index,1);state.deck.push(returned);player.hand.push(incoming);
    events.emit("card-drawn",{playerId:player.id,cardId:incoming.id,reason:"exchange"});
    if(!returnedOwned&&incomingOwned&&!state.exchangeBonusUsed){
      state.exchangeBonusAvailable=true;
      return {ok:true,card:incoming,extraExchange:true,turnContinues:true};
    }
    finishAction(state,player);return {ok:true,card:incoming};
  }
  function scoreAction(state,player,cardIds){
    if(!Array.isArray(cardIds)||new Set(cardIds).size!==cardIds.length)return {ok:false,reason:"invalid-card-selection"};
    const selected=cardIds.map(id=>player.hand.find(c=>c.id===id));if(selected.some(c=>!c))return {ok:false,reason:"card-not-owned"};
    const result=evaluateHand(selected,config);player.points+=money(result.points);
    const consumed=selected.filter(c=>!c.lucky);player.hand=player.hand.filter(c=>!consumed.some(x=>x.id===c.id));state.discard.push(...consumed);
    events.emit("hand-scored",{playerId:player.id,...result});finishAction(state,player);return {ok:true,...result};
  }
  function act(state,playerId,action){
    if(state.over)return {ok:false,reason:"game-over"};
    const player=state.players.find(p=>p.id===playerId);
    if(!player||state.players[state.currentPlayer].id!==playerId)return {ok:false,reason:"not-your-turn"};
    if(state.exchangeBonusAvailable&&action.type!=="exchange")return {ok:false,reason:"extra-exchange-required"};
    let result;
    switch(action.type){
      case "question":result=questionAction(state,player,action.answers||{});break;
      case "exchange":result=exchangeAction(state,player,action.returnedCardId,action.chosenCardId);break;
      case "score":result=scoreAction(state,player,action.cardIds||[]);break;
      case "buy-badge":result=buyBadge(state,player,action.realm,action.badgeId);if(result.ok)finishAction(state,player);break;
      case "sell-badge":result=sellBadge(state,player,action.badgeId);if(result.ok)finishAction(state,player);break;
      case "deposit":result=bankDeposit(player,action.amount);if(result.ok)finishAction(state,player);break;
      case "withdraw":result=bankWithdraw(player);if(result.ok)finishAction(state,player);break;
      default:return {ok:false,reason:"unknown-action"};
    }
    return result;
  }
  return Object.freeze({newGame,act,evaluateHand:cards=>evaluateHand(cards,config),buyBadge,sellBadge,bankDeposit,bankWithdraw,accrueBank,realmOwned,ownedValue,realmTotal,events,config,availableExchangeCards:state=>[...state.deck,...state.discard].filter(c=>!c.joker)});
}
