import { createEngine, REALM_IDS } from "./engine/index.mjs";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const root = $("#five-realms-game");
if (root && !root.dataset.initialized) {
  root.dataset.initialized = "true";
  const t = (key, fallback = "") => window.SiteI18n?.get("pages.fiveRealms." + key, fallback) || fallback;
  let realmsData = [], currentQuestion = null;
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
  const REALM_TO_DOMAIN = Object.freeze({blue:"S",yellow:"T",purple:"E",red:"R",green:"C"});
  const DOMAIN_TO_REALM = Object.freeze({S:"blue",T:"yellow",E:"purple",R:"red",C:"green"});
  const JUDGMENT_OPTIONS = Object.freeze({
    fa:[["ok","مطابق"],["warn","مبهم"],["bad","متناقض"]],
    en:[["ok","Consistent"],["warn","Ambiguous"],["bad","Contradictory"]],
    zh:[["ok","一致"],["warn","模糊"],["bad","矛盾"]],
    ar:[["ok","متوافق"],["warn","ملتبس"],["bad","متناقض"]]
  });
  async function populateRecognitionQuestion(form, player) {
    const actionButtons = $("#five-realms-game [data-action]");
    actionButtons.forEach(button => { button.disabled = true; });
    const loading = document.createElement("p");
    loading.className = "fr-question-loading";
    loading.setAttribute("role", "status");
    loading.textContent = t("questionGenerating", "در حال تولید پاراگراف و ارزیابی پنج قلمرو...");
    form.append(loading);
    try {
      const workspace = window.ParagraphWorkspaceAdapter;
      if (!workspace?.generateParagraphs || !workspace?.evaluateText) {
        throw new Error(t("questionServiceUnavailable", "مسیر بازشناسی ماشین پاراگراف در دسترس نیست."));
      }
      const language = window.SiteI18n?.getLanguage?.() || "fa";
      const generated = await workspace.generateParagraphs(1, "mixed", language);
      const paragraph = generated?.[0];
      if (typeof paragraph?.text !== "string" || !paragraph.text.trim()) {
        throw new Error(t("questionGenerationFailed", "ماشین پاراگراف متنی معتبر تولید نکرد."));
      }
      const evaluated = await workspace.evaluateText(paragraph.text, language);
      const judgment = evaluated?.judgment;
      for (const domain of ["S","T","E","R","C"]) {
        if (!["ok","warn","bad"].includes(judgment?.[domain]?.status)) {
          throw new Error(t("questionJudgmentFailed", "داوری مرجع پنج قلمرو کامل یا معتبر نیست."));
        }
      }
      if (!form.isConnected || pendingAction !== "question") return;
      currentQuestion = {text:paragraph.text, judgment};
      form.replaceChildren();

      const paragraphFieldset = document.createElement("fieldset");
      paragraphFieldset.className = "fr-question-paragraph";
      const paragraphLegend = document.createElement("legend");
      paragraphLegend.textContent = t("recognitionParagraph", "پاراگراف برای بازشناسی");
      const paragraphText = document.createElement("p");
      paragraphText.className = "fr-question-text";
      paragraphText.textContent = paragraph.text;
      paragraphFieldset.append(paragraphLegend, paragraphText);
      form.append(paragraphFieldset);

      const languageOptions = JUDGMENT_OPTIONS[language] || JUDGMENT_OPTIONS.fa;
      const judgmentsFieldset = document.createElement("fieldset");
      judgmentsFieldset.className = "fr-judgment-grid";
      const judgmentsLegend = document.createElement("legend");
      judgmentsLegend.textContent = t("judgeFiveRealms", "قضاوت پنج قلمرو");
      judgmentsFieldset.append(judgmentsLegend);
      for (const realm of REALM_IDS) {
        const realmFieldset = document.createElement("fieldset");
        realmFieldset.className = "fr-judgment-realm";
        realmFieldset.dataset.realm = realm;
        const realmLegend = document.createElement("legend");
        realmLegend.textContent = realmLabel(realm);
        realmFieldset.append(realmLegend);
        for (const [status, labelText] of languageOptions) {
          const label = document.createElement("label");
          label.className = "fr-judgment-option fr-judgment-" + status;
          const input = document.createElement("input");
          input.type = "radio";
          input.name = "fr-judgment-" + realm;
          input.value = status;
          input.required = true;
          label.append(input, document.createTextNode(" " + labelText));
          realmFieldset.append(label);
        }
        judgmentsFieldset.append(realmFieldset);
      }
      form.append(judgmentsFieldset);

      const counts = Object.fromEntries(REALM_IDS.map(realm => [realm, player.hand.filter(card => card.realm === realm).length]));
      const maxHeld = Math.max(...Object.values(counts));
      const tiedRealms = REALM_IDS.filter(realm => counts[realm] === maxHeld);
      let forgivenSelect = null;
      if (tiedRealms.length > 1) {
        const label = document.createElement("label");
        label.className = "fr-forgiven-realm";
        label.append(document.createTextNode(t("forgivenRealm", "قلمرو دارای بیشترین کارت که پاسخ نادرست آن بخشوده می‌شود")));
        forgivenSelect = document.createElement("select");
        forgivenSelect.setAttribute("aria-label", t("forgivenRealm", "قلمرو بخشوده‌شده"));
        tiedRealms.forEach(realm => {
          const option = document.createElement("option");
          option.value = realm;
          option.textContent = realmLabel(realm);
          forgivenSelect.append(option);
        });
        label.append(forgivenSelect);
        form.append(label);
      }

      const confirm = document.createElement("button");
      confirm.type = "button";
      confirm.className = "fr-primary";
      confirm.textContent = t("confirm", "تأیید");
      confirm.addEventListener("click", () => {
        const parts = {};
        let exactMatch = true;
        for (const realm of REALM_IDS) {
          const chosen = $('input[name="fr-judgment-' + realm + '"]:checked', form);
          if (!chosen) {
            setMessage("judgeAllRealms", "برای هر پنج قلمرو یک قضاوت انتخاب کنید.");
            return;
          }
          const domain = REALM_TO_DOMAIN[realm];
          const matchesReference = chosen.value === currentQuestion.judgment?.[domain]?.status;
          if (!matchesReference) exactMatch = false;
          parts[realm] = {correct:matchesReference};
        }
        const answers = {parts};
        if (forgivenSelect) answers.forgivenRealm = forgivenSelect.value;
        const result = engine.act(state, player.id, {type:"question", answers});
        if (result.ok) {
          advance(result);
          setMessage(exactMatch ? "recognitionCorrect" : "recognitionIncorrect",
            exactMatch ? "قضاوت شما در هر پنج قلمرو با داوری مرجع ماشین منطبق است." : "قضاوت شما با داوری مرجع ماشین در هر پنج قلمرو منطبق نیست.");
        } else {
          setMessage("actionFailed", "پاسخ هر پنج قلمرو را کامل کنید.");
        }
      });
      form.append(confirm);
    } catch (error) {
      if (form.isConnected && pendingAction === "question") {
        form.replaceChildren();
        const message = document.createElement("p");
        message.className = "fr-question-error";
        message.setAttribute("role", "alert");
        message.textContent = error?.message || String(error);
        form.append(message);
        const retry = document.createElement("button");
        retry.type = "button";
        retry.className = "fr-primary";
        retry.textContent = t("retry", "تلاش دوباره");
        retry.addEventListener("click", () => {
          pendingAction = "question";
          void populateRecognitionQuestion(form, player);
        });
        form.append(retry);
      }
    } finally {
      actionButtons.forEach(button => {
        button.disabled = !!state?.exchangeBonusAvailable && button.dataset.action !== "exchange";
      });
    }
  }
  async function loadConfig() {
    const [configResponse, realmsResponse] = await Promise.all([
      fetch("games/five-realms/data/config.json"),
      fetch("games/five-realms/data/realms.json")
    ]);
    if (!configResponse.ok || !realmsResponse.ok) throw new Error("Five Realms data could not be loaded");
    config = await configResponse.json();
    realmsData = (await realmsResponse.json()).realms;
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
      button.setAttribute("aria-label", cardText(card) + " " + suitSymbol(card) + ", " + realmLabel(card.realm) + (card.lucky ? ", " + t("luckyCard","Lucky card") : ""));
      const catalog = window.PlayingCardsCatalog;
      const catalogRank = ({A:"ace",K:"king",Q:"queen",J:"jack"})[card.rank] || String(card.rank);
      const catalogCard = card.joker
        ? catalog?.byId?.[Number(String(card.id).split("-").at(-1)) === 2 ? 2 : 1]
        : catalog?.cards?.find(entry => entry.suit === card.suit && entry.rank === catalogRank);
      const image = document.createElement("img");
      image.className = "fr-card-image";
      image.alt = cardText(card) + " " + suitSymbol(card) + ", " + realmLabel(card.realm);
      image.decoding = "async";
      image.loading = "lazy";
      image.draggable = false;
      const imagePath = catalogCard && catalog?.imagePath(catalogCard);
      if (imagePath) image.src = imagePath;
      else {
        image.classList.add("fr-card-image-fallback");
        image.alt = "";
      }
      const accessibleLabel = document.createElement("span");
      accessibleLabel.className = "fr-sr-only";
      accessibleLabel.textContent = cardText(card) + " " + suitSymbol(card);
      button.append(image, accessibleLabel);
      if (card.lucky) {
        const luckyCaption = document.createElement("span");
        luckyCaption.className = "fr-card-lucky";
        luckyCaption.textContent = t("luckyCard","Lucky card");
        button.append(luckyCaption);
      }
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
      void populateRecognitionQuestion(form, player);
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