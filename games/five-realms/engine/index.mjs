/**
 * Five Realms pure rules engine. No DOM, browser APIs, or network access.
 * All gameplay numbers are supplied by data/config.json by the caller.
 */
export const REALM_IDS = Object.freeze(["blue", "yellow", "purple", "red", "green"]);
const rankValue = rank => ({ A: 14, K: 13, Q: 12, J: 11 }[rank] ?? Number(rank));
const roundHalfUp = (value, scale) => Math.sign(value) * Math.floor(Math.abs(value) * scale + 0.5) / scale;
const clone = value => structuredClone(value);

export function createSeededRng(seed) {
  let state = (Number(seed) >>> 0) || 0x6d2b79f5;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createDeck(config, rng = Math.random) {
  const { ranks, suits, jokers } = config.deck;
  const cards = suits.flatMap(suit => ranks.map(rank => ({ id: `${rank}-${suit}`, rank, suit, realm: ({spades:"blue",diamonds:"yellow",hearts:"red",clubs:"green"})[suit], joker:false })));
  for (let i = 0; i < jokers; i++) cards.push({id:`joker-${i+1}`,rank:"JOKER",suit:"joker",realm:"purple",joker:true});
  return shuffle(cards, rng);
}
export function shuffle(items, rng = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function scoreFewCards(count, config) {
  if (!Number.isInteger(count) || count < 1 || count > config.game.handSize) throw new RangeError("A poker action requires 1 to handSize cards.");
  return config.poker.fewCardPoints[count];
}
export function evaluateHand(cards, config) {
  if (!Array.isArray(cards) || cards.length < 1 || cards.length > config.game.handSize) throw new RangeError("Choose 1 to handSize cards.");
  if (cards.some(c => c.joker || c.suit === "joker" || c.rank === "JOKER")) throw new TypeError("Jokers cannot enter poker hands.");
  if (new Set(cards.map(c => c.id)).size !== cards.length) throw new TypeError("Cards in a hand must be distinct.");
  if (cards.length < config.game.handSize) return {category:["","highCard","pair","threeOfAKind","fourOfAKind"][cards.length] || "highCard", points:scoreFewCards(cards.length, config)};
  const values = cards.map(c => rankValue(c.rank)).sort((a,b)=>a-b);
  const counts = [...new Set(values)].map(v=>values.filter(n=>n===v).length).sort((a,b)=>b-a);
  const flush = cards.every(c=>c.suit===cards[0].suit);
  const unique = [...new Set(values)];
  const normalStraight = unique.length===5 && unique[4]-unique[0]===4;
  const lowStraight = unique.join(",")==="2,3,4,5,14" && config.poker.aceLow;
  const straight = normalStraight || lowStraight;
  const royal = unique.join(",")==="10,11,12,13,14" && config.poker.aceHigh;
  let category;
  if (straight && flush && royal) category="royalFlush";
  else if (straight && flush) category="straightFlush";
  else if (counts[0]===4) category="fourOfAKind";
  else if (counts[0]===3 && counts[1]===2) category="fullHouse";
  else if (flush) category="flush";
  else if (straight) category="straight";
  else if (counts[0]===3) category="threeOfAKind";
  else if (counts[0]===2 && counts[1]===2) category="twoPair";
  else if (counts[0]===2) category="pair";
  else category="highCard";
  return {category, points:config.poker.points[category]};
}
export function createEventEmitter() {
  const listeners = new Set();
  return Object.freeze({
    on(fn) { if (typeof fn !== "function") throw new TypeError("Listener must be a function."); listeners.add(fn); return () => listeners.delete(fn); },
    emit(type, detail = {}) { const event = Object.freeze({type, detail:clone(detail)}); for (const fn of [...listeners]) fn(event); }
  });
}
export function createEngine(config, {seed = Date.now(), onEvent = () => {}} = {}) {
  if (!config?.deck || !config?.game || !config?.poker || !config?.realms || !config?.badges || !config?.bank) throw new TypeError("A complete game config is required.");
  const rng = createSeededRng(seed), events = createEventEmitter();
  events.on(onEvent);
  const money = n => Math.round(roundHalfUp(n, config.game.roundingScale) * config.game.roundingScale);
  const drawFrom = state => { if (!state.deck.length) state.deck = createDeck(config, rng); return state.deck.pop(); };
  function newGame(playerNames) {
    if (!Array.isArray(playerNames) || playerNames.length < config.game.minPlayers || playerNames.length > config.game.maxPlayers) throw new RangeError("Player count is outside configured limits.");
    const deck = createDeck(config, rng);
    const state = {round:1,currentPlayer:0,players:playerNames.map((name,id)=>({id,name:String(name),hand:[],points:money(config.game.startingPoints),badges:[],bank:null,bankTurn:0})),deck,badgePool:Object.fromEntries(REALM_IDS.map(realm=>[realm:Array.from({length:config.realms[realm].badgeCount},(_,i)=>({id:`${realm}-${i+1}`,realm,value:badgeValueAt(i,config.realms[realm])}))])),over:false,history:[]};
    for (const player of state.players) for (let i=0;i<config.game.startingCards;i++) player.hand.push(drawFrom(state));
    events.emit("turn-start",{playerId:state.players[0].id,round:state.round});
    return state;
  }
  function badgeValueAt(index, realm) { const values=[]; for(const value of [3,2,1]) for(let i=0;i<(realm.badgeValues[value]||0);i++) values.push(value); return values[index] ?? 1; }
  function ownedValue(player, realm) { return player.badges.filter(b=>b.realm===realm).reduce((s,b)=>s+b.value,0); }
  function realmTotal(realm) { const r=config.realms[realm]; return Object.entries(r.badgeValues).reduce((s,[v,count])=>s+Number(v)*count,0); }
  function realmOwned(player, realm) { return player.badges.filter(b=>b.realm===realm).length >= config.realms[realm].badgeCount; }
  function finishAction(state, player) { state.history.push({round:state.round,playerId:player.id}); state.currentPlayer=(state.currentPlayer+1)%state.players.length; if(state.currentPlayer===0) state.round++; if(Object.values(state.badgePool).every(pool=>pool.length===0)||state.round>config.game.maxRounds) state.over=true; if(state.over) events.emit("game-over",{round:state.round}); else events.emit("turn-start",{playerId:state.players[state.currentPlayer].id,round:state.round}); return state; }
  function buyBadge(state, player, realm, badgeId) {
    const pool=state.badgePool[realm]; if(!pool) throw new TypeError("Unknown realm.");
    const index=pool.findIndex(b=>!badgeId||b.id===badgeId); if(index<0) return {ok:false,reason:"unavailable"};
    const badge=pool[index], T=realmTotal(realm), value=ownedValue(player,realm);
    const price=money(badge.value*(config.realms[realm].basePriceMultiplier??1)*(1-value/(config.badges.discountShareDivisor*T)));
    if(player.points<price) return {ok:false,reason:"insufficient-points",price};
    player.points-=price; pool.splice(index,1); player.badges.push({...badge,purchasePrice:price});
    events.emit("badge-bought",{playerId:player.id,realm,badgeId:badge.id,price}); return {ok:true,price,badge};
  }
  function sellBadge(player, badgeId) {
    const index=player.badges.findIndex(b=>b.id===badgeId); if(index<0) return {ok:false,reason:"not-owned"};
    const [badge]=player.badges.splice(index,1), price=money(badge.purchasePrice*config.game.exchangeResaleRate);
    player.points+=price; return {ok:true,price,badge};
  }
  function bankDeposit(player, amount) {
    const fraction=(player.points%config.game.roundingScale)/config.game.roundingScale;
    const max=money(config.bank.maxDepositFactor*fraction);
    if(!Number.isFinite(amount)||amount<0||amount>max||amount>player.points) return {ok:false,reason:"invalid-deposit",max};
    const value=money(amount); player.points-=value; player.bank={principal:value,turns:0}; player.bankTurn=0; events.emit("deposit",{playerId:player.id,amount:value}); return {ok:true,amount:value};
  }
  function bankWithdraw(player) { if(!player.bank) return {ok:false,reason:"empty"}; const amount=player.bank.principal; player.points+=amount; player.bank=null; events.emit("withdraw",{playerId:player.id,amount}); return {ok:true,amount}; }
  function accrueBank(player) {
    if(!player.bank) return 0;
    const {interestRates,interestTurns}=config.bank;
    if(player.bank.turns>=interestTurns) return 0;
    const s=player.bank.principal/config.game.roundingScale;
    const p=2*Math.floor(s)-s;
    const interest=money(p*interestRates[player.bank.turns]);
    player.bank.principal+=interest; player.bank.turns++; return interest;
  }
  function questionAction(state, player, answers) {
    const counts=Object.fromEntries(REALM_IDS.map(realm=>[realm,player.hand.filter(c=>c.realm===realm).length]));
    const max=Math.max(...Object.values(counts)), tied=REALM_IDS.filter(r=>counts[r]===max);
    const forgiven=answers.forgivenRealm && tied.includes(answers.forgivenRealm)?answers.forgivenRealm:null;
    let delta=0;
    for(const realm of REALM_IDS) {
      const part=answers.parts?.[realm], correct=realmOwned(player,realm)||part?.correct===true;
      const wrong=!correct&&part?.correct===false&&realm!==forgiven;
      if(correct){player.hand.push(drawFrom(state));delta++;}
      else if(wrong&&player.hand.length){const removed=player.hand.splice(Math.floor(rng()*player.hand.length),1)[0];state.deck.push(removed);delta--;}
    }
    events.emit("answer-correct",{playerId:player.id,delta}); finishAction(state,player); return {delta};
  }
  function exchangeAction(state,player,returnedCardId,chosenCardId) {
    const i=player.hand.findIndex(c=>c.id===returnedCardId); if(i<0) return {ok:false,reason:"card-not-owned"};
    const returned=player.hand[i], incoming=drawFrom(state), returnedOwned=realmOwned(player,returned.realm), incomingOwned=realmOwned(player,incoming.realm);
    player.hand.splice(i,1); state.deck.push(returned); player.hand.push(incoming);
    if(!returnedOwned&&incomingOwned){const extra=drawFrom(state);player.hand.push(extra);events.emit("card-drawn",{playerId:player.id,cardId:extra.id,reason:"exchange-bonus"});}
    else if(returnedOwned&&incomingOwned){player.hand.push(drawFrom(state));}
    else if(returned.realm===incoming.realm){/* no additional exchange unless realm ownership rule applies */}
    events.emit("card-drawn",{playerId:player.id,cardId:incoming.id,reason:"exchange"}); finishAction(state,player); return {ok:true,card:incoming};
  }
  function scoreAction(state,player,cardIds) {
    const selected=cardIds.map(id=>player.hand.find(c=>c.id===id)); if(selected.some(c=>!c)) return {ok:false,reason:"card-not-owned"};
    const result=evaluateHand(selected,config); player.points+=money(result.points);
    const consumed=selected.filter(c=>!c.lucky); player.hand=player.hand.filter(c=>!consumed.some(x=>x.id===c.id));
    events.emit("hand-scored",{playerId:player.id,...result}); finishAction(state,player); return {ok:true,...result};
  }
  function act(state,playerId,action) {
    if(state.over) return {ok:false,reason:"game-over"};
    const player=state.players.find(p=>p.id===playerId); if(!player||state.players[state.currentPlayer].id!==playerId) return {ok:false,reason:"not-your-turn"};
    if(player.bank) accrueBank(player);
    let result;
    switch(action.type){
      case "question": result=questionAction(state,player,action.answers||{}); break;
      case "exchange": result=exchangeAction(state,player,action.returnedCardId,action.chosenCardId); break;
      case "score": result=scoreAction(state,player,action.cardIds||[]); break;
      case "buy-badge": result=buyBadge(state,player,action.realm,action.badgeId); if(result.ok) finishAction(state,player); break;
      case "sell-badge": result=sellBadge(player,action.badgeId); if(result.ok) {events.emit("badge-sold",{playerId, badgeId:action.badgeId,price:result.price});finishAction(state,player);} break;
      case "deposit": result=bankDeposit(player,action.amount); if(result.ok) finishAction(state,player); break;
      case "withdraw": result=bankWithdraw(player); if(result.ok) finishAction(state,player); break;
      default: return {ok:false,reason:"unknown-action"};
    }
    return result;
  }
  return Object.freeze({newGame,act,evaluateHand:cards=>evaluateHand(cards,config),buyBadge,sellBadge,bankDeposit,bankWithdraw,accrueBank,realmOwned,ownedValue,realmTotal,events,config});
}
