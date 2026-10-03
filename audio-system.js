/* Modern Outlook — Central Audio System */
(function(){
'use strict';
const KEY='modern-outlook.audio.v1';
const AC=window.AudioContext||window.webkitAudioContext;
let ctx=null,master=null,enabled=true,volume=.34,last={};
try{const s=JSON.parse(localStorage.getItem(KEY)||'{}');if(typeof s.enabled==='boolean')enabled=s.enabled;if(Number.isFinite(s.volume))volume=Math.max(0,Math.min(1,s.volume))}catch(_){}
const cues={
'ui.click':{f:680,d:.11,v:.20,t:'triangle',g:1.18},
'ui.back':{f:430,d:.14,v:.18,t:'sine',g:.82},
'realm.select':{c:[440,660,880],d:.26,v:.17,t:'sine'},
'page.open':{c:[392,523,784],d:.34,v:.18,t:'sine'},
'page.close':{c:[659,494,330],d:.22,v:.15,t:'sine'},
'core.open':{c:[523,659,784,1047],d:.42,v:.18,t:'sine'},
'card.flip':{n:1,d:.10,v:.12},
'card.draw':{f:740,d:.12,v:.14,t:'triangle',g:1.32},
'card.play':{c:[392,494,587],d:.24,v:.16,t:'triangle'},
'game.success':{c:[523,659,784,1047],d:.55,v:.18,t:'sine'},
'game.error':{f:180,d:.22,v:.16,t:'sawtooth',g:.72}
};
function save(){try{localStorage.setItem(KEY,JSON.stringify({enabled,volume}))}catch(_){}}
function ensure(){
 if(!AC)return null;
 if(!ctx){ctx=new AC({latencyHint:'interactive'});const comp=ctx.createDynamicsCompressor();comp.threshold.value=-18;comp.knee.value=16;comp.ratio.value=4;comp.attack.value=.003;comp.release.value=.18;master=ctx.createGain();master.gain.value=enabled?volume:0;master.connect(comp).connect(ctx.destination)}
 return ctx
}
async function unlock(){const c=ensure();if(!c)return false;try{if(c.state==='suspended')await c.resume();return c.state==='running'}catch(_){return false}}
function env(g,now,peak,d){g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),now+.008);g.gain.exponentialRampToValueAtTime(.0001,now+d)}
function playTone(c,q,now){
 const o=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter(),hz=q.f||440;
 o.type=q.t||'sine';o.frequency.setValueAtTime(hz,now);if(q.g)o.frequency.exponentialRampToValueAtTime(hz*q.g,now+q.d*.82);
 f.type='lowpass';f.frequency.setValueAtTime(Math.max(700,hz*5),now);f.frequency.exponentialRampToValueAtTime(Math.max(500,hz*2),now+q.d);
 env(g,now,q.v||.15,q.d);o.connect(f).connect(g).connect(master);o.start(now);o.stop(now+q.d+.02)
}
function playChord(c,q,now){
 (q.c||[440]).forEach((hz,i)=>{const o=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter(),st=now+i*.018;o.type=q.t||'sine';o.frequency.value=hz;f.type='lowpass';f.frequency.value=Math.min(4200,hz*5);env(g,st,(q.v||.15)/Math.sqrt(q.c.length),q.d);o.connect(f).connect(g).connect(master);o.start(st);o.stop(st+q.d+.03)})
}
function playNoise(c,q,now){
 const b=c.createBuffer(1,Math.max(1,Math.floor(c.sampleRate*q.d)),c.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*(1-i/a.length);
 const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=b;f.type='bandpass';f.frequency.value=2600;env(g,now,q.v||.1,q.d);s.connect(f).connect(g).connect(master);s.start(now);s.stop(now+q.d+.02)
}
async function play(name,opt={}){
 if(!enabled)return false;const q=cues[name];if(!q)return false;const t=performance.now();if(t-(last[name]||0)<(opt.cooldown??25))return false;last[name]=t;
 const c=await unlock();if(!c)return false;const now=c.currentTime+.005;
 if(q.n)playNoise(c,{...q,...opt},now);else if(q.c)playChord(c,{...q,...opt},now);else playTone(c,{...q,...opt},now);return true
}
function setEnabled(v){enabled=!!v;save();if(master&&ctx)master.gain.setTargetAtTime(enabled?volume:0,ctx.currentTime,.025);ui()}
function toggle(){setEnabled(!enabled);if(enabled)play('ui.click',{cooldown:0});return enabled}
function setVolume(v){volume=Math.max(0,Math.min(1,Number(v)||0));save();if(master&&ctx)master.gain.setTargetAtTime(enabled?volume:0,ctx.currentTime,.025)}
function registerCue(name,definition){if(name&&definition)cues[name]={...definition}}
function ui(){document.querySelectorAll('[data-audio-toggle]').forEach(b=>{b.setAttribute('aria-pressed',String(enabled));b.setAttribute('aria-label',enabled?'خاموش کردن صدا':'روشن کردن صدا');b.textContent=enabled?'◖))':'×))'})}
window.SiteAudio=Object.freeze({play,unlock,toggle,setEnabled,setVolume,registerCue,isEnabled:()=>enabled,getVolume:()=>volume});
document.addEventListener('pointerdown',()=>unlock(),{capture:true,passive:true});
document.addEventListener('keydown',()=>unlock(),{capture:true,passive:true});
document.addEventListener('DOMContentLoaded',ui);
})();