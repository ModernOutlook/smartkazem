import { createEngine, REALM_IDS } from "./engine/index.mjs";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const root = $("#five-realms-game");
if (root && !root.dataset.initialized) {
  root.dataset.initialized = "true";
  const t = (key, fallback = "") => window.SiteI18n?.get("pages.fiveRealms." + key, fallback) || fallback;
  let realmsData = [], questionsData = [], currentQuestion = null;
  let config, engine, state, selected = new Set(), pendingAction = null, awaitingReveal = false;
  const announce = (message) => { $("#fr-announcer").textContent = ""; requestAnimationFrame(() => { $("#fr-announcer").textContent = message; }); };
  const emitSound = (type, detail = {}) => {
    document.dispatchEvent(new CustomEvent("site:game-sound", {detail:{game:"five-realms",type,...detail}}));
    const realm = detail.realm || ({ "card-drawn":"blue", "answer-correct":"yellow", "answer-wrong":"red", "hand-scored":"purple", "badge-bought":"green", "badge-sold":"green", "deposit":"yellow", "withdraw":"yellow", "realm-completed":"purple", "turn-start":"blue", "game-over":"green" })[type] || "share";
    window.SiteAudio?.play?.(realm);
    announce(t(type, type.replaceAll("-", " ")));
  };
  const current = () => state?.players[state.currentPlayer];
  const realmLabel = (realm) => {
    const data = realmsData.find(item => item.id === realm);
    return data ? (window.SiteI18n?.get(data.i18nKey, data.name) || data.name) : realm;
  };
  const suitSymbol = (card) => card.joker ? "🃏" : ({spades:"♠",diamonds:"♦",hearts:"♥",clubs:"♣"})[card.suit] || "";
  const cardText = (card) => card.joker ? "JOKER" : card.rank;
  const setMessage = (key, fallback) => { $("#fr-action-message").textContent = t(key, fallback); announce(t(key, fallback)); };
  const points = value => (value / config.game.roundingScale).toLocaleString(window.SiteI18n?.getLanguage?.() || "fa", {maximumFractionDigits:2});
  const moneyInput = raw => Math.round(Number(raw) * config.game.roundingScale);
  async function loadConfig() {
    const [configResponse, realmsResponse, questionsResponse] = await Promise.all([
      fetch("games/five-realms/data/config.json"),
      fetch("games/five-realms/data/realms.json"),
      fetch("games/five-realms/data/questions.json")
    ]);
    if (!configResponse.ok || !realmsResponse.ok || !questionsResponse.ok) throw new Error("Five Realms data could not be loaded");
    config = await configResponse.json();
    realmsData = (await realmsResponse.json()).realms;
    questionsData = (await questionsResponse.json()).questions || [];
    if (!questionsData.length) throw new Error("No question sets are configured");
  }
  function refreshNameInputs() {
    const count = Number($("#fr-player-count").value);
    $("#fr-player-names").innerHTML = Array.from({length:count},(_,i)=>'<label><span>'+t("playerName","نام بازیکن")+' '+(i+1)+'</span><input maxlength="40" required value="'+t("player","بازیکن")+' '+(i+1)+'" data-player-name="'+i+'"></label>').join("");
  }
  function refresh() {
    if (!state) return;
    const player = current();
    $$("#five-realms-game [data-action]").forEach(button=>{button.disabled=!!state.exchangeBonusAvailable&&button.dataset.action!=="exchange";});
    $("#fr-round").textContent = state.round;
    $("#fr-current").textContent = player.name;
    $("#fr-points").textContent = points(player.points);
    $("#fr-bank").textContent = player.bank ? points(player.bank.principal)+(player.bank.negativeFormula?" · "+t("bankNegativeFormula","negative-interest formula applies"):"") : "0";
    $("#fr-hand").replaceChildren();
    player.hand.forEach(card => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "fr-card"; button.dataset.realm = card.realm;
      button.style.setProperty("--fr-card-realm-color", realmsData.find(item => item.id === card.realm)?.color || "#c9d5cc");
      button.setAttribute("aria-pressed", String(selected.has(card.id)));
      button.setAttribute("aria-label", cardText(card) + " " + suitSymbol(card) + ", " + realmLabel(card.realm));
      const face=document.createElement("span");face.textContent=cardText(card)+" "+suitSymbol(card);
      const realmCaption=document.createElement("small");realmCaption.textContent=realmLabel(card.realm);
      if(card.lucky){const luckyCaption=document.createElement("small");luckyCaption.textContent=t("luckyCard","Lucky card");button.append(face,realmCaption,luckyCaption);}else button.append(face,realmCaption);
      button.addEventListener("click",()=>{ if (card.joker) { setMessage("jokerNoPoker","Jokers cannot enter poker hands; use an exchange action."); return; } if(!selected.has(card.id)&&selected.size>=config.game.handSize){setMessage("selectUpToFive","Select no more than five cards.");return;} selected.has(card.id) ? selected.delete(card.id) : selected.add(card.id); refresh(); });
      $("#fr-hand").append(button);
    });
    $("#fr-badges").textContent = player.badges.length ? player.badges.map(b=>realmLabel(b.realm)+" · "+b.value).join(" / ") : t("noBadges","هنوز نشانی ندارید");
    $("#fr-scoreboard").innerHTML = '<table class="fr-table"><thead><tr><th>'+t("player","بازیکن")+'</th><th>'+t("points","امتیاز")+'</th><th>'+t("badges","نشان‌ها")+'</th></tr></thead><tbody>'+state.players.map(p=>'<tr><td>'+escapeHtml(p.name)+'</td><td>'+points(p.points)+'</td><td>'+p.badges.length+'</td></tr>').join("")+'</tbody></table>';
    $("#fr-play").hidden = false;
    $("#fr-pass").hidden = true;
    $("#fr-setup").hidden = true;
    $("#fr-game-over").hidden = !state.over;
    if (state.over) {
      const winners = (state.winnerIds || []).map(id=>state.players.find(p=>p.id===id)).filter(Boolean);
      $("#fr-winner").textContent = winners.length ? t("winner","Winner: ") + winners.map(p=>p.name).join(" / ") : "";
      $("#fr-play").hidden = true;
    }
  }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function advance(result) {
    if (!result?.ok && result?.ok !== undefined) { setMessage("actionFailed","That action could not be completed."); return; }
    selected.clear(); pendingAction = null; $("#fr-action-form").replaceChildren();
    refresh();
    if (result?.turnContinues && !state.over) { setMessage("extraExchange","You earned one extra exchange. Exchange once more to end your turn."); return; }
    if (!state.over) {
      $("#fr-pass-name").textContent = t("passTo","Pass the device to") + " " + current().name;
      $("#fr-pass").hidden = false; $("#fr-play").hidden = true; awaitingReveal = true;
    }
  }
  function actionForm(action) {
    pendingAction = action; const form = $("#fr-action-form"); form.replaceChildren();
    const field = (label, control) => { const wrap=document.createElement("label");wrap.append(document.createTextNode(label),control);form.append(wrap);return control; };
    const select = (options, label) => { const node=document.createElement("select");options.forEach(o=>{const op=document.createElement("option");op.value=o.value;op.textContent=o.label;node.append(op);});field(label,node);return node; };
    const submit = (text,fn) => {const b=document.createElement("button");b.type="button";b.className="fr-primary";b.textContent=text;b.addEventListener("click",fn);form.append(b);};
    const player=current();
    if(action==="exchange"){
      const exchangeCards=player.hand.filter(card=>!card.lucky||card.joker);
      if(!exchangeCards.length){setMessage("actionFailed","No exchangeable cards are available.");return;}
      const card=select(exchangeCards.map(c=>({value:c.id,label:cardText(c)+" "+suitSymbol(c)+" · "+realmLabel(c.realm)})),t("returnCard","Card to exchange"));
      const chosenCard=select(engine.availableExchangeCards(state).map(c=>({value:c.id,label:cardText(c)+" "+suitSymbol(c)+" · "+realmLabel(c.realm)})),t("jokerChooseCard","Card to take with joker"));
      const chosenLabel=chosenCard.closest("label");
      const updateJokerChoice=()=>{const isJoker=!!player.hand.find(c=>c.id===card.value)?.joker;chosenLabel.hidden=!isJoker;chosenCard.required=isJoker;};
      card.addEventListener("change",updateJokerChoice);updateJokerChoice();
      submit(t("confirm","Confirm"),()=>{const selectedCard=player.hand.find(c=>c.id===card.value);const result=engine.act(state,player.id,{type:"exchange",returnedCardId:card.value,...(selectedCard?.joker?{chosenCardId:chosenCard.value}:{})});if(result.ok){advance(result);}else setMessage(result.reason==="chosen-card-unavailable"?"unavailable":"actionFailed",result.reason==="chosen-card-unavailable"?"That card is no longer available.":"Action failed.");});
    } else if(action==="score"){
      const chosen=player.hand.filter(c=>selected.has(c.id) && !c.joker);
      const preview=document.createElement("p");preview.textContent=chosen.length ? t("selectedCards","Selected cards: ")+chosen.length+" · "+points(engine.evaluateHand(chosen).points*config.game.roundingScale)+" "+t("points","points") : t("selectUpToFive","Select 1 to 5 cards above.");form.append(preview);
      submit(t("scoreHand","Score hand"),()=>{const ids=player.hand.filter(c=>selected.has(c.id) && !c.joker).map(c=>c.id);if(!ids.length||ids.length>config.game.handSize){setMessage("selectUpToFive","Select 1 to 5 cards.");return;}const result=engine.act(state,player.id,{type:"score",cardIds:ids});if(result.ok){advance(result);}});
    } else if(action==="buy"){
      const realm=select(REALM_IDS.map(r=>({value:r,label:realmLabel(r)})),t("realm","Realm"));
      const badge=()=>state.badgePool[realm.value]?.[0];
      submit(t("buyBadge","Buy badge"),()=>{const b=badge();if(!b){setMessage("unavailable","No badges remain in this realm.");return;}const result=engine.act(state,player.id,{type:"buy-badge",realm:realm.value,badgeId:b.id});if(result.ok){advance(result);}else setMessage("actionFailed","Not enough points or badge unavailable.");});
    } else if(action==="sell"){
      const badge=select(player.badges.map(b=>({value:b.id,label:realmLabel(b.realm)+" · "+b.value}),),t("sellBadge","Badge to sell"));
      submit(t("sellBadge","Sell badge"),()=>{const result=engine.act(state,player.id,{type:"sell-badge",badgeId:badge.value});if(result.ok){advance(result);}else setMessage("actionFailed","Action failed.");});
    } else if(action==="deposit"){
      const amount=document.createElement("input");amount.type="number";amount.min="0";amount.step="0.01";amount.inputMode="decimal";field(t("depositAmount","Deposit amount"),amount);
      submit(t("deposit","Deposit"),()=>{const result=engine.act(state,player.id,{type:"deposit",amount:moneyInput(amount.value)});if(result.ok){advance(result);}else setMessage("actionFailed","Deposit is above the allowed limit.");});
    } else if(action==="withdraw"){
      submit(t("withdraw","Withdraw"),()=>{const result=engine.act(state,player.id,{type:"withdraw"});if(result.ok){advance(result);}else setMessage("emptyBank","No active deposit.");});
    } else if(action==="question"){
      if(!questionsData.length){setMessage("actionFailed","No question sets are configured.");return;}
      currentQuestion=questionsData[Math.floor(Math.random()*questionsData.length)];
      const formset=document.createElement("fieldset");
      const legend=document.createElement("legend");
      legend.textContent=currentQuestion.placeholder?t("questionPlaceholder","Placeholder question set"):t("question","Question");
      formset.append(legend);
      REALM_IDS.forEach(realm=>{
        const wrap=document.createElement("div");wrap.className="fr-choice-list";
        const label=document.createElement("strong");label.textContent=realmLabel(realm);wrap.append(label);
        const part=currentQuestion.parts?.[realm]||{prompt:"",options:[],answerIndex:-1};
        const prompt=document.createElement("p");prompt.textContent=part.prompt||"";wrap.append(prompt);
        if(engine.realmOwned(player,realm)){
          const free=document.createElement("p");free.textContent=t("fullyOwnedFree","This realm's question part is free because you own all its badges.");wrap.append(free);
        }else{
          (part.options||[]).forEach((optionText,i)=>{
            const label=document.createElement("label"),input=document.createElement("input");
            input.type="radio";input.name="fr-q-"+realm;input.value=String(i);
            label.append(input,document.createTextNode(" "+optionText));wrap.append(label);
          });
        }
        formset.append(wrap);
      });
      form.append(formset);
      const counts=Object.fromEntries(REALM_IDS.map(realm=>[realm,player.hand.filter(card=>card.realm===realm).length]));
      const maxHeld=Math.max(...Object.values(counts));
      const tiedRealms=REALM_IDS.filter(realm=>counts[realm]===maxHeld);
      let forgivenSelect=null;
      if(tiedRealms.length>1){
        const label=document.createElement("label");label.append(document.createTextNode(t("forgivenRealm","Choose which tied realm's wrong answer is forgiven")));
        forgivenSelect=document.createElement("select");
        tiedRealms.forEach(realm=>{const option=document.createElement("option");option.value=realm;option.textContent=realmLabel(realm);forgivenSelect.append(option);});
        label.append(forgivenSelect);form.append(label);
      }
      submit(t("confirm","Confirm"),()=>{
        const parts={};
        for(const realm of REALM_IDS){
          if(engine.realmOwned(player,realm))continue;
          const chosen=$('input[name="fr-q-'+realm+'"]:checked',form);
          if(!chosen){setMessage("actionFailed","Choose one answer for every realm that is not fully owned.");return;}
          parts[realm]={correct:Number(chosen.value)===Number(currentQuestion.parts?.[realm]?.answerIndex)};
        }
        const answers={parts};if(forgivenSelect)answers.forgivenRealm=forgivenSelect.value;
        const result=engine.act(state,player.id,{type:"question",answers});
        if(result.ok)advance(result);else setMessage("actionFailed","Complete the answers before confirming.");
      });

    }
  }
  $("#fr-player-count").addEventListener("change",refreshNameInputs);
  $("#fr-start").addEventListener("click",async()=>{try{if(!config)await loadConfig();engine=createEngine(config,{seed:Date.now(),onEvent:event=>emitSound(event.type,event.detail)});const names=$$("[data-player-name]").map((input,i)=>input.value.trim()||t("player","Player")+" "+(i+1));state=engine.newGame(names);awaitingReveal=false;refresh();}catch(error){$("#fr-action-message").textContent=error.message;}});
  $("#fr-reveal").addEventListener("click",()=>{awaitingReveal=false;refresh();});
  $$("#five-realms-game [data-action]").forEach(button=>button.addEventListener("click",()=>actionForm(button.dataset.action)));
  $("#fr-restart").addEventListener("click",()=>{state=null;selected.clear();$("#fr-game-over").hidden=true;$("#fr-setup").hidden=false;$("#fr-play").hidden=true;refreshNameInputs();});
  document.addEventListener("site:languagechange",()=>{if(state)refresh();refreshNameInputs();});
  refreshNameInputs();
}