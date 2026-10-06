/*! SmartKazem Audio Engine 3.0 — lightweight realm cues + gesture accessibility. */
(() => {
  'use strict';
  if (window.SmartKazemAudio) return;

  const STORAGE_KEY = 'smartkazem.audio.v3';
  const ACCESSIBILITY_KEY = 'smartkazem.audio.accessibility.v1';
  const TRIPLE_WINDOW = 620;
  const LONG_PRESS_MS = 720;
  const DEFAULT_STATE = Object.freeze({ enabled:true, muted:false, volume:0.18, realm:'structure', accessibility:false, speechEnabled:true, voiceVersion:1 });

  let state={...DEFAULT_STATE}, ctx=null, master=null, initialized=false, voices=[], lastSpoken='', clickTimes=[], longPressTimer=0, longPressPointer=null;

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
    if(!element)return'';const labelled=element.getAttribute('aria-label');if(labelled)return labelled.trim();
    const labelledBy=element.getAttribute('aria-labelledby');if(labelledBy){const text=labelledBy.split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' ').trim();if(text)return text;}
    const title=element.getAttribute('title');if(title)return title.trim();
    return(element.innerText||element.textContent||'').replace(/\s+/g,' ').trim().slice(0,220);
  }
  function currentLanguage(){const lang=document.documentElement.lang||'fa';if(lang.startsWith('fa'))return'fa-IR';if(lang.startsWith('ar'))return'ar-SA';if(lang.startsWith('zh'))return'zh-CN';return'en-US';}
  function chooseVoice(lang){if(!voices.length)return null;const exact=voices.find(v=>v.lang?.toLowerCase()===lang.toLowerCase());if(exact)return exact;const prefix=lang.split('-')[0].toLowerCase();return voices.find(v=>v.lang?.toLowerCase().startsWith(prefix))||null;}
  function refreshVoices(){if('speechSynthesis'in window)voices=window.speechSynthesis.getVoices()||[];}
  function speak(text,options={}){
    if(!state.accessibility||!state.speechEnabled||!('speechSynthesis'in window))return false;
    const value=String(text||'').replace(/\s+/g,' ').trim();if(!value)return false;
    try{const synth=window.speechSynthesis;synth.cancel();const utterance=new SpeechSynthesisUtterance(value),lang=options.lang||currentLanguage();utterance.lang=lang;utterance.rate=Number(options.rate)||.92;utterance.pitch=Number(options.pitch)||1;utterance.volume=state.volume;const voice=chooseVoice(lang);if(voice)utterance.voice=voice;lastSpoken=value;synth.speak(utterance);return true;}catch(_){return false;}
  }
  function speakTarget(target){const element=target?.closest?.('button,a,[role="button"],summary,[tabindex]');if(!element)return;setRealm(realmFromElement(element));const name=accessibleName(element);if(name)window.setTimeout(()=>speak(name),25);}
  function toggleAccessibility(){
    state.accessibility=!state.accessibility;saveState();
    if(state.accessibility)speak('حالت دسترس پذیر فعال شد. برای تکرار آخرین اعلان، دوبار کلیک کنید. برای توقف یا ادامه صدا، کلیک طولانی انجام دهید.');
    else if('speechSynthesis'in window)window.speechSynthesis.cancel();
    document.documentElement.dataset.audioAccessibility=state.accessibility?'on':'off';
    document.dispatchEvent(new CustomEvent('audio:accessibilitychange',{detail:{enabled:state.accessibility}}));
    return state.accessibility;
  }
  function handleTripleClick(event){
    const now=performance.now();clickTimes=clickTimes.filter(time=>now-time<=TRIPLE_WINDOW);clickTimes.push(now);
    if(clickTimes.length<3)return false;clickTimes=[];event.preventDefault();event.stopImmediatePropagation();toggleAccessibility();return true;
  }
  function handlePointerDown(event){
    if(event.button!==undefined&&event.button!==0)return;resume();setRealm(realmFromElement(event.target));if(!state.accessibility)return;
    longPressPointer=event.pointerId??'mouse';window.clearTimeout(longPressTimer);
    longPressTimer=window.setTimeout(()=>{if(longPressPointer!==(event.pointerId??'mouse'))return;if(!('speechSynthesis'in window))return;if(window.speechSynthesis.speaking&&!window.speechSynthesis.paused)window.speechSynthesis.pause();else if(window.speechSynthesis.paused)window.speechSynthesis.resume();else if(lastSpoken)speak(lastSpoken);},LONG_PRESS_MS);
  }
  function handlePointerUp(event){if(longPressPointer===(event.pointerId??'mouse')){window.clearTimeout(longPressTimer);longPressPointer=null;}}
  function handleClick(event){if(handleTripleClick(event))return;const realm=realmFromElement(event.target);setRealm(realm);resume().then(()=>play(realm)).catch(()=>{});if(state.accessibility)speakTarget(event.target);}
  function handleDoubleClick(){if(state.accessibility&&lastSpoken)speak(lastSpoken);}
  function handleKeyboard(event){if(!state.accessibility||event.key!=='Escape')return;if('speechSynthesis'in window)window.speechSynthesis.cancel();}
  function initSpeech(){if(!('speechSynthesis'in window))return;refreshVoices();window.speechSynthesis.addEventListener?.('voiceschanged',refreshVoices);}
  function releaseSplash(){const splash=document.getElementById('splash');if(!splash)return;splash.classList.add('is-ready');splash.setAttribute('aria-hidden','true');window.setTimeout(()=>{splash.hidden=true;},360);}
  function init(){
    if(initialized)return getState();initialized=true;loadState();ensureGraph();initSpeech();
    document.documentElement.dataset.audioAccessibility=state.accessibility?'on':'off';
    document.addEventListener('pointerdown',handlePointerDown,{capture:true,passive:true});
    document.addEventListener('pointerup',handlePointerUp,{capture:true,passive:true});
    document.addEventListener('pointercancel',handlePointerUp,{capture:true,passive:true});
    document.addEventListener('click',handleClick,{capture:true});
    document.addEventListener('dblclick',handleDoubleClick,{capture:true});
    document.addEventListener('keydown',handleKeyboard,{capture:true});
    window.addEventListener('pageshow',()=>{resume();});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.enabled&&!state.muted)resume();});
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',releaseSplash,{once:true});else releaseSplash();
    return getState();
  }
  function getState(){return Object.freeze({...state,supported:Boolean(ctx),running:ctx?.state==='running',speechSupported:'speechSynthesis'in window,voiceCount:voices.length});}
  window.SmartKazemAudio=Object.freeze({VERSION:'3.0.0',init,resume,play,speak,setRealm,getState,setVolume,setMuted,setEnabled,toggleAccessibility,registerVoiceManifest(){state.voiceVersion+=1;saveState();return state.voiceVersion;}});
  window.SiteAudio=Object.freeze({play:(realm)=>play(realm),enable:()=>setEnabled(true),disable:()=>setEnabled(false),get enabled(){return getState().enabled;}});
  init();
})();