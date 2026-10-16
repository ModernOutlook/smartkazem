export const REALMS = Object.freeze([
 {id:"blue",color:"#164E63",background:"content/bk1.jpg"},
 {id:"yellow",color:"#B89B45",background:"content/bk2.jpg"},
 {id:"purple",color:"#7542A6",background:"content/bk3.jpg"},
 {id:"red",color:"#C94F55",background:"content/bk4.jpg"},
 {id:"green",color:"#218653",background:"content/bk5.jpg"}
]);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function createGame({width=720,height=480,seed=1,columns=18,rows=8}={}){
 let randomState=seed>>>0||1;
 const random=()=>{randomState=(1664525*randomState+1013904223)>>>0;return randomState/4294967296;};
 const cellW=width/columns,cellH=Math.min(25,cellW*.78),triangles=[];
 for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
  const realm=REALMS[Math.floor(random()*REALMS.length)],x=(col+.5)*cellW+(row%2?cellW*.5:0),y=18+row*cellH,orientation=(row+col)%2? -1:1,half=cellW*.49,h=cellH*.86;
  const vertices=orientation===1?[{x:x-half,y:y+h/2},{x:x+half,y:y+h/2},{x,y:y-h/2}]:[{x:x-half,y:y-h/2},{x:x+half,y:y-h/2},{x,y:y+h/2}];
  triangles.push({id:row*columns+col,row,col,x,y,realm:realm.id,color:realm.color,vertices,active:true});
 }
 const game={width,height,triangles,coins:[],score:0,lives:3,running:false,over:false,paddle:{x:width/2,y:height-24,width:Math.max(76,width*.14),height:12,speed:0},ball:{x:width/2,y:height-50,vx:width*.34,vy:-height*.58,radius:Math.max(6,Math.min(9,width*.012))},wallHits:0,lastHitCluster:0,random,initialTriangleCount:triangles.length};
 const speed=Math.hypot(game.ball.vx,game.ball.vy);game.ball.vx=speed*.48;game.ball.vy=-Math.sqrt(speed*speed-game.ball.vx*game.ball.vx);return game;
}
function neighbors(game,a){
 return game.triangles.filter(b=>b.active&&b.id!==a.id&&((a.row===b.row&&Math.abs(a.col-b.col)===1)||(Math.abs(a.row-b.row)===1&&Math.abs(a.col-b.col)<=1)));
}
export function connectedCluster(game,triangleId){
 const target=game.triangles.find(t=>t.id===triangleId&&t.active);if(!target)return[];
 const seen=new Set([target.id]),queue=[target.id];
 for(let i=0;i<queue.length;i++){const current=game.triangles.find(t=>t.id===queue[i]);for(const n of neighbors(game,current))if(n.realm===target.realm&&!seen.has(n.id)){seen.add(n.id);queue.push(n.id);}}
 return queue.map(id=>game.triangles.find(t=>t.id===id));
}
export function disintegrateCluster(game,triangleId){
 const cluster=connectedCluster(game,triangleId);if(!cluster.length)return{removed:[],coins:[]};
 const coins=cluster.map((t,i)=>({id:game.lastHitCluster*10000+t.id,x:t.x,y:t.y,vx:(i%3-1)*18,vy:24+(i%4)*5,radius:8,active:true}));
 cluster.forEach(t=>t.active=false);game.lastHitCluster++;game.coins.push(...coins);return{removed:cluster.map(t=>t.id),coins};
}
function hitTriangle(ball,t){
 const minX=Math.min(...t.vertices.map(p=>p.x)),maxX=Math.max(...t.vertices.map(p=>p.x)),minY=Math.min(...t.vertices.map(p=>p.y)),maxY=Math.max(...t.vertices.map(p=>p.y));
 return ball.x+ball.radius>=minX&&ball.x-ball.radius<=maxX&&ball.y+ball.radius>=minY&&ball.y-ball.radius<=maxY;
}
export function stepGame(game,dt,inputX=game.paddle.x){
 if(!game.running||game.over||dt<=0)return game;
 const step=Math.min(dt,.04),{width,height,ball,paddle}=game;paddle.x=clamp(inputX,paddle.width/2,width-paddle.width/2);ball.x+=ball.vx*step;ball.y+=ball.vy*step;
 if(ball.x-ball.radius<=0){ball.x=ball.radius;ball.vx=Math.abs(ball.vx);game.wallHits++;}
 if(ball.x+ball.radius>=width){ball.x=width-ball.radius;ball.vx=-Math.abs(ball.vx);game.wallHits++;}
 if(ball.y-ball.radius<=0){ball.y=ball.radius;ball.vy=Math.abs(ball.vy);game.wallHits++;}
 if(game.wallHits){const magnitude=Math.hypot(ball.vx,ball.vy)*1.012,angle=Math.atan2(ball.vy,ball.vx);ball.vx=Math.cos(angle)*magnitude;ball.vy=Math.sin(angle)*magnitude;game.wallHits=0;}
 if(ball.vy>0&&ball.y+ball.radius>=paddle.y-paddle.height/2&&ball.y-ball.radius<=paddle.y+paddle.height/2&&ball.x>=paddle.x-paddle.width/2-ball.radius&&ball.x<=paddle.x+paddle.width/2+ball.radius){
  ball.y=paddle.y-paddle.height/2-ball.radius;const offset=clamp((ball.x-paddle.x)/(paddle.width/2),-1,1),magnitude=Math.hypot(ball.vx,ball.vy),angle=offset*.95;ball.vx=Math.sin(angle)*magnitude;ball.vy=-Math.cos(angle)*magnitude;
 }
 if(ball.y-ball.radius>height){game.lives--;if(game.lives<=0){game.over=true;game.running=false;}else{ball.x=width/2;ball.y=height-50;ball.vx=width*.34;ball.vy=-height*.58;}}
 const hit=game.triangles.find(t=>t.active&&hitTriangle(ball,t));if(hit){disintegrateCluster(game,hit.id);ball.vy=Math.abs(ball.vy);ball.y=Math.max(ball.y,hit.y+ball.radius+1);}
 for(const c of game.coins)if(c.active){c.x+=c.vx*step;c.y+=c.vy*step;if(c.y+c.radius>=paddle.y-paddle.height/2&&c.y-c.radius<=paddle.y+paddle.height/2&&c.x>=paddle.x-paddle.width/2-c.radius&&c.x<=paddle.x+paddle.width/2+c.radius){c.active=false;game.score++;}else if(c.y-c.radius>height)c.active=false;}
 game.coins=game.coins.filter(c=>c.active);if(!game.triangles.some(t=>t.active)){game.over=true;game.running=false;}return game;
}
export function resizeGame(game,width,height){
 const sx=width/game.width,sy=height/game.height;game.width=width;game.height=height;game.paddle.x*=sx;game.paddle.y=height-24;game.paddle.width=Math.max(76,width*.14);game.ball.x*=sx;game.ball.y=Math.min(height-50,game.ball.y*sy);game.ball.radius=Math.max(6,Math.min(9,width*.012));
 for(const t of game.triangles){t.x*=sx;t.y*=sy;t.vertices=t.vertices.map(p=>({x:p.x*sx,y:p.y*sy}));}for(const c of game.coins){c.x*=sx;c.y*=sy;}return game;
}
export function coinLogoPoints(cx,cy,radius){return REALMS.map((realm,i)=>({x:cx+Math.cos(i*Math.PI*2/5-Math.PI/2)*radius*.55,y:cy+Math.sin(i*Math.PI*2/5-Math.PI/2)*radius*.55,color:realm.color}));}
