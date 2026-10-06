/*! SmartKazem Audio Engine 3.0 — lightweight realm cues + gesture accessibility. */
(() => {
  'use strict';
  if (window.SmartKazemAudio) return;

  const STORAGE_KEY = 'smartkazem.audio.v3';
  const ACCESSIBILITY_KEY = 'smartkazem.audio.accessibility.v1';
  const TRIPLE_WINDOW = 620;
  const LONG_PRESS_MS = 720;
  const DEFAULT_STATE = Object.freeze({ enabled:true, muted:false, volume:0.18, realm:'structure', accessibility:false, speechEnabled:true, voiceVersion:1 });

  let state={...DEFAULT_STATE}, ctx=null, master=null, initialized=false, voices=[], lastSpoken='', clickTimes=[], longPressTimer=0, longPressPointer=null, longPressTriggered=false, suppressNextClick=false;

  const REALM_CUES=Object.freeze({
    structure:{notes:[220,329.63],length:.105,peak:.095,type:'sine'},
    continuity:{notes:[277.18,415.3],length:.115,peak:.095,type:'triangle'},
    experience:{notes:[329.63,493.88],length:.125,peak:.09,type:'sine'},
    reference:{notes:[392,587.33],length:.135,peak:.09,type:'triangle'},
    share:{notes:[493.88,739.99],length:.145,peak:.085,type:'sine'}
  });

  function loadState(){
    try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(saved&&typeof saved==='object')state={...DEFAULT_STATE,...saved};}catch(_){}
    state.enabled=state.enabled!==false; state.muted=state.muted===true;
    state.volume=Math.min(1,Math.max(.02,Number(state.volume)||DEFAULT_STATE.volume));
    state.realm=REALM_CUES[state.realm]?state.realm:DEFAULT_STATE.realm;
    try{const access=JSON.parse(localStorage.getItem(ACCESSIBILITY_KEY)||'null');if(access&&typeof access==='object'){state.accessibility=access.enabled===true;state.speechEnabled=access.speechEnabled!==false;state.voiceVersion=Number(access.voiceVersion)||1;}}catch(_){}
  }
  function saveState(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));localStorage.setItem(ACCESSIBILITY_KEY,JSON.stringify({enabled:state.accessibility,speechEnabled:state.speechEnabled,voiceVersion:state.voiceVersion}));}catch(_){}}
  function ensureGraph(){
    if(ctx&&master)return true;
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
    try{ctx=new AC();master=ctx.createGain();master.gain.value=state.enabled&&!state.muted?state.volume:0;master.connect(ctx.destination);return true;}catch(_){ctx=null;master=null;return false;}
  }
  async function resume(){if(!ensureGraph()||!ctx)return false;try{if(ctx.state!=='running')await ctx.resume();return ctx.state==='running';}catch(_){return false;}}
  function setMasterGain(){if(!master||!ctx)return;master.gain.setTargetAtTime(state.enabled&&!state.muted?state.volume:0,ctx.currentTime,.025);}
  function setVolume(value){state.volume=Math.min(1,Math.max(.02,Number(value)||.02));setMasterGain();saveState();}
  function setMuted(value){state.muted=Boolean(value);setMasterGain();saveState();}
  function setEnabled(value){state.enabled=Boolean(value);setMasterGain();saveState();}
  function realmFromElement(target){
    const explicit=target?.closest?.('[data-realm]')?.dataset?.realm;if(REALM_CUES[explicit])return explicit;
    const realm=target?.closest?.('.realm')?.dataset?.id;if(REALM_CUES[realm])return realm;
    const id=target?.closest?.('.page')?.id||'';
    if(id.includes('structure'))return'structure';if(id.includes('continuity'))return'continuity';if(id.includes('experience'))return'experience';if(id.includes('reference'))return'reference';if(id.includes('share'))return'share';
    return state.realm;
  }
  function setRealm(realm){if(!REALM_CUES[realm])return;state.realm=realm;saveState();}
  function play(realm=state.realm){
    if(!state.enabled||state.muted)return false;if(!REALM_CUES[realm])realm=state.realm;
    if(!ensureGraph()||!ctx||!master||ctx.state!=='running')return false;
    const profile=REALM_CUES[realm],now=ctx.currentTime;
    try{profile.notes.forEach((frequency,index)=>{const oscillator=ctx.createOscillator(),gain=ctx.createGain(),start=now+index*.018,end=start+profile.length;oscillator.type=profile.type;oscillator.frequency.setValueAtTime(frequency,start);oscillator.frequency.exponentialRampToValueAtTime(frequency*.992,end);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(profile.peak,start+.012);gain.gain.exponentialRampToValueAtTime(.0001,end);oscillator.connect(gain);gain.connect(master);oscillator.start(start);oscillator.stop(end+.018);});return true;}catch(_){return false;}
  }
  function accessibleName(element){
    if(!element)return'';
    const i18nAria=element.dataset?.i18nAria;if(i18nAria){const value=i18nGet(i18nAria,'');if(value)return value.trim();}
    const i18nText=element.dataset?.i18n;if(i18nText){const value=i18nGet(i18nText,'');if(value)return value.trim();}
    const labelled=element.getAttribute('aria-label');if(labelled)return labelled.trim();
    const labelledBy=element.getAttribute('aria-labelledby');if(labelledBy){const text=labelledBy.split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' ').trim();if(text)return text;}
    const title=element.getAttribute('title');if(title)return title.trim();
    return(element.innerText||element.textContent||'').replace(/\s+/g,' ').trim().slice(0,220);
  }
  function i18nGet(path,fallback){try{if(window.SiteI18n?.get)return String(window.SiteI18n.get(path,fallback)||fallback);}catch(_){}return fallback;}
  function currentLanguage(){const lang=window.SiteI18n?.getLanguage?.()||document.documentElement.lang||'fa';if(lang.startsWith('fa'))return'fa-IR';if(lang.startsWith('ar'))return'ar-SA';if(lang.startsWith('zh'))return'zh-CN';return'en-US';}
  function chooseVoice(lang){if(!voices.length)return null;const exact=voices.find(v=>v.lang?.toLowerCase()===lang.toLowerCase());if(exact)return exact;const prefix=lang.split('-')[0].toLowerCase();return voices.find(v=>v.lang?.toLowerCase().startsWith(prefix))||null;}
  function refreshVoices(){if('speechSynthesis'in window)voices=window.speechSynthesis.getVoices()||[];}
  function speak(text,options={}){
    if(!state.accessibility||!state.speechEnabled||!('speechSynthesis'in window))return false;
    const value=String(text||'').replace(/\s+/g,' ').trim();if(!value)return false;
    try{const synth=window.speechSynthesis;synth.cancel();const utterance=new SpeechSynthesisUtterance(value),lang=options.lang||currentLanguage();utterance.lang=lang;utterance.rate=Number(options.rate)||.92;utterance.pitch=Number(options.pitch)||1;utterance.volume=state.volume;const voice=chooseVoice(lang);if(voice)utterance.voice=voice;lastSpoken=value;synth.speak(utterance);return true;}catch(_){return false;}
  }
  function speakTarget(target){const element=target?.closest?.('button,a,[role="button"],summary,[tabindex]');if(!element)return;setRealm(realmFromElement(element));const name=accessibleName(element);if(name)window.setTimeout(()=>speak(name),25);}


  // Accessible navigation layer: semantic focus + fast speech + touch/keyboard movement.
  const NAV_SELECTOR='h1,h2,h3,h4,a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),summary,[tabindex]:not([tabindex="-1"]),[role="button"],[role="link"],[role="checkbox"],[role="radio"],[role="switch"],[role="tab"],[role="menuitem"],[role="heading"]';
  let navIndex=-1, navItems=[], navRegion=null;

  function ensureAccessibilityRegion(){
    if(navRegion)return navRegion;
    navRegion=document.createElement('div');
    navRegion.id='smartkazem-accessibility-announcer';
    navRegion.className='sr-only';
    navRegion.setAttribute('aria-live','assertive');
    navRegion.setAttribute('aria-atomic','true');
    navRegion.setAttribute('role','status');
    navRegion.style.cssText='position:fixed;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
    document.body.appendChild(navRegion);
    return navRegion;
  }
  function navigationItems(){
    const root=document.querySelector('main')||document.body;
    return [...root.querySelectorAll(NAV_SELECTOR)].filter(el=>{
      if(el.matches('h1,h2,h3,h4,[role="heading"]')&&!el.hasAttribute('tabindex'))el.setAttribute('tabindex','-1');
      if(el.hidden||el.getAttribute('aria-hidden')==='true')return false;
      const rect=el.getBoundingClientRect();
      return rect.width>0&&rect.height>0;
    });
  }
  function semanticDescription(el){
    const role=el.getAttribute('role')||({BUTTON:'دکمه',A:'پیوند',INPUT:'ورودی',TEXTAREA:'متن',SELECT:'انتخاب',SUMMARY:'بازکننده'}[el.tagName]||'');
    const name=accessibleName(el);
    const state=[];
    if(el.hasAttribute('aria-pressed'))state.push(el.getAttribute('aria-pressed')==='true'?'فعال':'غیرفعال');
    if(el.hasAttribute('aria-expanded'))state.push(el.getAttribute('aria-expanded')==='true'?'باز':'بسته');
    if(el.checked===true)state.push('انتخاب‌شده');
    if(el.disabled)state.push('غیرفعال');
    const href=el.getAttribute('href');
    const destination=href&&href.startsWith('#')?'':(href?'لینک':'');
    return [role,name,state.join('، '),destination].filter(Boolean).join('، ');
  }
  function syncNavigation(){
    navItems=navigationItems();
    if(navIndex>=navItems.length)navIndex=navItems.length-1;
    return navItems;
  }
  function focusNavigation(index,announce=true){
    syncNavigation();
    if(!navItems.length)return false;
    navIndex=(index+navItems.length)%navItems.length;
    const el=navItems[navIndex];
    el.focus({preventScroll:false});
    if(announce)announceNavigation(el);
    return true;
  }
  function announceNavigation(el){
    if(!el)return;
    const description=semanticDescription(el);
    if(!description)return;
    const position='عنصر '+(navIndex+1)+' از '+navItems.length;
    const text=position+'، '+description;
    const region=ensureAccessibilityRegion();
    region.textContent='';
    requestAnimationFrame(()=>{region.textContent=text;});
    speak(text,{rate:1.08});
  }
  function announcePage(){
    if(!state.accessibility)return;
    syncNavigation();
    const title=document.title.replace(/\s*[—|·-]\s*Modern Outlook.*$/i,'').trim();
    const main=document.querySelector('main');
    const heading=main?.querySelector('h1,h2,[role="heading"]');
    const pageName=accessibleName(heading)||title||'صفحه';
    const landmarks=[...document.querySelectorAll('main,nav,aside,section[aria-label],section[aria-labelledby]')].filter(el=>el.offsetParent!==null).length;
    speak('صفحه '+pageName+'، '+navItems.length+' گزینه قابل پیمایش'+(landmarks?'، '+landmarks+' بخش':'')+'. برای حرکت از کلیدهای بالا و پایین استفاده کنید. برای اجرا Enter را بزنید.',{rate:1.04});
  }
  function activateNavigation(){
    const el=navItems[navIndex];
    if(!el)return;
    el.click();
  }
  function handleAccessibilityKeyboard(event){
    if(!state.accessibility)return;
    const keys=['ArrowDown','ArrowUp','Home','End','Enter',' ','Escape'];
    if(!keys.includes(event.key))return;
    syncNavigation();
    if(event.key==='Escape'){
      if('speechSynthesis'in window)window.speechSynthesis.cancel();
      return;
    }
    if(event.key==='ArrowDown'||event.key==='ArrowRight'){event.preventDefault();focusNavigation(navIndex+1);return;}
    if(event.key==='ArrowUp'||event.key==='ArrowLeft'){event.preventDefault();focusNavigation(navIndex-1);return;}
    if(event.key==='Home'){event.preventDefault();focusNavigation(0);return;}
    if(event.key==='End'){event.preventDefault();focusNavigation(navItems.length-1);return;}
    if(event.key==='Enter'||event.key===' '){event.preventDefault();activateNavigation();return;}
  }
  let touchStartX=0,touchStartY=0,touchPointer=null;
  function handleAccessibilityTouchStart(event){
    if(!state.accessibility||event.pointerType!=='touch')return;
    touchPointer=event.pointerId;touchStartX=event.clientX;touchStartY=event.clientY;
  }
  function handleAccessibilityTouchEnd(event){
    if(!state.accessibility||event.pointerType!=='touch'||touchPointer!==event.pointerId)return;
    touchPointer=null;
    const dx=event.clientX-touchStartX,dy=event.clientY-touchStartY;
    if(Math.abs(dx)<42||Math.abs(dx)<Math.abs(dy)*1.25)return;
    event.preventDefault();
    focusNavigation(navIndex+(dx<0?1:-1));
  }
  function enableAccessibilityNavigation(){
    ensureAccessibilityRegion();
    syncNavigation();
    document.documentElement.dataset.accessibilityNavigation='on';
    const first=navItems.findIndex(el=>el.matches('main h1,h1,h2,[role="heading"]'))>=0?navItems.findIndex(el=>el.matches('main h1,h1,h2,[role="heading"]')):0;
    focusNavigation(first,false);
    window.setTimeout(announcePage,40);
  }
  function disableAccessibilityNavigation(){
    document.documentElement.dataset.accessibilityNavigation='off';
    if(navRegion)navRegion.textContent='';
    if('speechSynthesis'in window)window.speechSynthesis.cancel();
    navIndex=-1;navItems=[];
  }

  function toggleAccessibility(){
    state.accessibility=!state.accessibility;saveState();
    if(state.accessibility){const enabled=i18nGet('labels.accessibility.enabled','Accessibility mode enabled.');const repeat=i18nGet('labels.accessibility.repeat','Double-click to repeat the last announcement.');const hold=i18nGet('labels.accessibility.hold','Long-press to pause, resume, or repeat speech.');speak([enabled,repeat,hold].join(' '));}
    else if('speechSynthesis'in window)window.speechSynthesis.cancel();
    document.documentElement.dataset.audioAccessibility=state.accessibility?'on':'off';
    if(state.accessibility)enableAccessibilityNavigation();else disableAccessibilityNavigation();
    document.dispatchEvent(new CustomEvent('audio:accessibilitychange',{detail:{enabled:state.accessibility}}));
    return state.accessibility;
  }
  function handleTripleClick(event){
    const now=performance.now();
    clickTimes=clickTimes.filter(time=>now-time<=TRIPLE_WINDOW);
    clickTimes.push(now);
    if(clickTimes.length<3)return false;

    clickTimes=[];
    event.preventDefault();
    event.stopImmediatePropagation();
    toggleAccessibility();
    return true;
  }
  function handlePointerDown(event){
    if(event.button!==undefined&&event.button!==0)return;resume();setRealm(realmFromElement(event.target));if(!state.accessibility)return;
    longPressPointer=event.pointerId??'mouse';window.clearTimeout(longPressTimer);
    longPressTimer=window.setTimeout(()=>{if(longPressPointer!==(event.pointerId??'mouse'))return;longPressTriggered=true;suppressNextClick=true;if(!('speechSynthesis'in window))return;if(window.speechSynthesis.speaking&&!window.speechSynthesis.paused)window.speechSynthesis.pause();else if(window.speechSynthesis.paused)window.speechSynthesis.resume();else if(lastSpoken)speak(lastSpoken);},LONG_PRESS_MS);
  }
  function handlePointerUp(event){if(longPressPointer===(event.pointerId??'mouse')){window.clearTimeout(longPressTimer);longPressPointer=null;}}
  function handleClick(event){if(handleTripleClick(event))return;if(suppressNextClick){suppressNextClick=false;event.preventDefault();event.stopImmediatePropagation();return;}const realm=realmFromElement(event.target);setRealm(realm);resume().then(()=>play(realm)).catch(()=>{});if(state.accessibility)speakTarget(event.target);}
  function handleDoubleClick(){if(state.accessibility&&lastSpoken)speak(lastSpoken);}
  function handleKeyboard(event){handleAccessibilityKeyboard(event);if(!state.accessibility||event.key!=='Escape')return;if('speechSynthesis'in window)window.speechSynthesis.cancel();}
  function initSpeech(){if(!('speechSynthesis'in window))return;refreshVoices();window.speechSynthesis.addEventListener?.('voiceschanged',refreshVoices);}
  function init(){
    if(initialized)return getState();initialized=true;loadState();ensureGraph();initSpeech();
    document.documentElement.style.touchAction='manipulation';
    document.documentElement.dataset.audioAccessibility=state.accessibility?'on':'off';
    document.addEventListener('pointerdown',handlePointerDown,{capture:true,passive:true});
    document.addEventListener('pointerup',handlePointerUp,{capture:true,passive:true});
    document.addEventListener('pointercancel',handlePointerUp,{capture:true,passive:true});
    document.addEventListener('click',handleClick,{capture:true});
    document.addEventListener('dblclick',handleDoubleClick,{capture:true});
    document.addEventListener('keydown',handleKeyboard,{capture:true});
    document.addEventListener('pointerdown',handleAccessibilityTouchStart,{capture:true,passive:true});
    document.addEventListener('pointerup',handleAccessibilityTouchEnd,{capture:true,passive:false});
    document.addEventListener('focusin',event=>{if(state.accessibility&&event.target?.matches?.(NAV_SELECTOR)){syncNavigation();const index=navItems.indexOf(event.target);if(index>=0)navIndex=index;announceNavigation(event.target);}}, {capture:true});
    window.addEventListener('pageshow',()=>{resume();if(state.accessibility)window.setTimeout(announcePage,80);});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.enabled&&!state.muted)resume();});
    return getState();
  }
  function getState(){return Object.freeze({...state,supported:Boolean(ctx),running:ctx?.state==='running',speechSupported:'speechSynthesis'in window,voiceCount:voices.length});}
  window.SmartKazemAudio=Object.freeze({VERSION:'3.0.0',init,resume,play,speak,setRealm,getState,setVolume,setMuted,setEnabled,toggleAccessibility,registerVoiceManifest(){state.voiceVersion+=1;saveState();return state.voiceVersion;}});
  window.SiteAudio=Object.freeze({play:(realm)=>play(realm),enable:()=>setEnabled(true),disable:()=>setEnabled(false),get enabled(){return getState().enabled;}});
  init();
})();