import {createGame,stepGame,resizeGame,coinLogoPoints} from "./engine.mjs";
import { GAME_BACKGROUNDS } from "../shared/backgrounds.mjs";
const root=document.querySelector(".talash-page");
if(root&&!root.dataset.initialized){
 root.dataset.initialized="true";
 const $=id=>root.querySelector("#"+id),canvas=$("talash-canvas"),ctx=canvas.getContext("2d"),overlay=$("talash-overlay"),status=$("talash-status");
 let game=null,lastTime=0,raf=0,desiredX=0,keys=new Set(),paused=false,backgrounds=[];
 const tr=(key,fallback)=>window.SiteI18n?.get("pages.talash."+key,fallback)||fallback;
 const images=[new Image()];images[0].src=GAME_BACKGROUNDS[0].dataUri;images[0].onload=()=>{if(game)draw();};
 backgrounds=images;
 function resize(){
  const rect=canvas.getBoundingClientRect(),w=Math.max(240,Math.floor(rect.width)),h=Math.max(280,Math.floor(rect.height));
  const dpr=Math.min(window.devicePixelRatio||1,2);
  const old=game;canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  if(old)resizeGame(old,w,h);else game=createGame({width:w,height:h,seed:Date.now()&0xffffffff});
  desiredX=game.paddle.x;draw();
 }
 function drawCoin(c){
  ctx.save();ctx.translate(c.x,c.y);ctx.beginPath();ctx.arc(0,0,c.radius,0,Math.PI*2);ctx.fillStyle="#e8c76a";ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle="#fff1b4";ctx.stroke();
  for(const p of coinLogoPoints(0,0,c.radius)){ctx.beginPath();ctx.arc(p.x,p.y,Math.max(1.2,c.radius*.19),0,Math.PI*2);ctx.fillStyle=p.color;ctx.fill();}
  ctx.beginPath();ctx.arc(0,0,c.radius*.17,0,Math.PI*2);ctx.fillStyle="#fff9d9";ctx.fill();ctx.restore();
 }
 function draw(){
  if(!game)return;const w=game.width,h=game.height;ctx.clearRect(0,0,w,h);ctx.fillStyle="#000";ctx.fillRect(0,0,w,h);
  // Supplied realm artwork remains deliberately faint and never replaces the black base.
  for(let i=0;i<backgrounds.length;i++){const img=backgrounds[i];if(img.complete&&img.naturalWidth){ctx.save();ctx.globalAlpha=.12;ctx.drawImage(img,0,0,w,h);ctx.restore();}}
  for(const t of game.triangles){if(!t.active)continue;ctx.beginPath();ctx.moveTo(t.vertices[0].x,t.vertices[0].y);for(let i=1;i<t.vertices.length;i++)ctx.lineTo(t.vertices[i].x,t.vertices[i].y);ctx.closePath();ctx.fillStyle=t.color;ctx.globalAlpha=.86;ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle="#ffffff35";ctx.lineWidth=.8;ctx.stroke();}
  for(const coin of game.coins)drawCoin(coin);
  const p=game.paddle;ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle="#55bfff";ctx.shadowColor="#238fd1";ctx.shadowBlur=12;roundRect(-p.width/2,-p.height/2,p.width,p.height,5);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle="#bfeaff";ctx.fillRect(-p.width*.35,-p.height*.12,p.width*.7,p.height*.16);ctx.fillStyle="#a5b1be";for(const x of [-p.width*.32,p.width*.32]){ctx.beginPath();ctx.arc(x,p.height*.7,3.5,0,Math.PI*2);ctx.fill();}ctx.restore();
  const b=game.ball;ctx.save();ctx.translate(b.x,b.y);ctx.fillStyle="#e33a32";ctx.shadowColor="#ff443b";ctx.shadowBlur=10;ctx.beginPath();ctx.arc(0,0,b.radius,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle="#7b160f";ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,b.radius*.72,-1.1,1.1);ctx.stroke();ctx.beginPath();ctx.arc(0,0,b.radius*.72,Math.PI-.95,Math.PI+.95);ctx.stroke();ctx.restore();
  $("talash-score").textContent=String(game.score);$("talash-lives").textContent=String(game.lives);$("talash-speed").textContent=(Math.hypot(b.vx,b.vy)/Math.max(1,Math.hypot(game.width*.34,game.height*.58))).toFixed(1)+"×";
 }
 function roundRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
 function tick(time){raf=0;if(!game)return;const dt=lastTime?Math.min(.04,(time-lastTime)/1000):0;lastTime=time;if(game.running&&!paused){const direction=(keys.has("ArrowLeft")||keys.has("a")||keys.has("A")?-1:0)+(keys.has("ArrowRight")||keys.has("d")||keys.has("D")?1:0);if(direction)desiredX=game.paddle.x+direction*game.width*.8*dt;stepGame(game,dt,desiredX);}draw();if(game.over){overlay.hidden=false;$("talash-overlay-title").textContent=tr("gameOver","بازی تمام شد");$("talash-overlay-text").textContent=tr("finalScore","امتیاز نهایی: ")+game.score;$("talash-start").disabled=false;$("talash-pause").disabled=true;status.textContent=tr("gameOver","بازی تمام شد");}else raf=requestAnimationFrame(tick);}
 function ensureLoop(){if(!raf){lastTime=0;raf=requestAnimationFrame(tick);}}
 function start(){if(game.over||!game.triangles.some(t=>t.active))game=createGame({width:game.width,height:game.height,seed:Date.now()&0xffffffff});game.running=true;paused=false;overlay.hidden=true;$("talash-start").disabled=true;$("talash-pause").disabled=false;status.textContent=tr("playing","بازی در جریان است.");canvas.focus({preventScroll:true});ensureLoop();}
 function togglePause(){if(!game||game.over)return;paused=!paused;game.running=!paused;$("talash-pause").textContent=paused?tr("resume","ادامه"):tr("pause","مکث");$("talash-start").disabled=!paused;if(paused){overlay.hidden=false;$("talash-overlay-title").textContent=tr("paused","بازی متوقف شد");$("talash-overlay-text").textContent=tr("resumeHint","برای ادامه، دکمهٔ ادامه را بزنید.");status.textContent=tr("paused","بازی متوقف شد.");}else{overlay.hidden=true;status.textContent=tr("playing","بازی در جریان است.");ensureLoop();}}
 function restart(){if(raf)cancelAnimationFrame(raf);raf=0;paused=false;game=createGame({width:Math.max(240,canvas.clientWidth),height:Math.max(280,canvas.clientHeight),seed:Date.now()&0xffffffff});desiredX=game.paddle.x;game.running=false;overlay.hidden=false;$("talash-overlay-title").textContent=tr("ready","آماده‌ای؟");$("talash-overlay-text").textContent=tr("instructions","با لمس یا حرکت اشاره‌گر راکت آبی را افقی حرکت بده.");$("talash-start").disabled=false;$("talash-pause").disabled=true;$("talash-pause").textContent=tr("pause","مکث");status.textContent=tr("instructions","با لمس یا حرکت اشاره‌گر راکت آبی را افقی حرکت بده.");draw();}
 function setPointer(event){const r=canvas.getBoundingClientRect();desiredX=(event.clientX-r.left)/r.width*game.width;}
 canvas.addEventListener("pointermove",event=>{if(event.pointerType==="mouse"||event.buttons)setPointer(event);});
 canvas.addEventListener("pointerdown",event=>{setPointer(event);canvas.focus({preventScroll:true});});
 root.addEventListener("keydown",event=>{if(["ArrowLeft","ArrowRight","a","A","d","D"," "].includes(event.key)){keys.add(event.key);if(event.key.startsWith("Arrow"))event.preventDefault();}});
 root.addEventListener("keyup",event=>keys.delete(event.key));
 $("talash-start").addEventListener("click",start);$("talash-pause").addEventListener("click",togglePause);$("talash-reset").addEventListener("click",restart);
 window.addEventListener("blur",()=>{keys.clear();if(game?.running)togglePause();});
 const observer=new ResizeObserver(()=>resize());observer.observe(canvas);resize();ensureLoop();
 document.addEventListener("shared-page:opened",event=>{if(event.detail?.key!=="talash"&&game?.running)togglePause();});
 window.addEventListener("pagehide",()=>{observer.disconnect();if(raf)cancelAnimationFrame(raf);});
}