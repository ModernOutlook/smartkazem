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
  const x0=col*cellW,x1=(col+1)*cellW,y0=18+row*cellH,y1=y0+cellH;
  const points=[{x:x0,y:y0},{x:x1,y:y0},{x:x1,y:y1},{x:x0,y:y1}];
  const polygons=(row+col)%2?[[points[0],points[1],points[3]],[points[1],points[2],points[3]]]:[[points[0],points[1],points[2]],[points[0],points[2],points[3]]];
  for(const vertices of polygons){
   const realm=REALMS[Math.floor(random()*REALMS.length)];
   triangles.push({id:triangles.length,row,col,x:vertices.reduce((s,p)=>s+p.x,0)/3,y:vertices.reduce((s,p)=>s+p.y,0)/3,realm:realm.id,color:realm.color,vertices,active:true});
  }
 }
 const game={width,height,triangles,coins:[],score:0,lives:3,running:false,over:false,paddle:{x:width/2,y:height-24,width:Math.max(76,width*.14),height:12,speed:0},ball:{x:width/2,y:height-50,vx:width*.34,vy:-height*.58,radius:Math.max(6,Math.min(9,width*.012))},wallHits:0,lastHitCluster:0,random,initialTriangleCount:triangles.length};
 const speed=Math.hypot(game.ball.vx,game.ball.vy);game.ball.vx=speed*.48;game.ball.vy=-Math.sqrt(speed*speed-game.ball.vx*game.ball.vx);return game;
}
function edgeKey(a,b){
 const p=[a,b].sort((u,v)=>u.x-v.x||u.y-v.y);
 return p.map(v=>v.x.toFixed(4)+","+v.y.toFixed(4)).join("|");
}
function adjacencyFor(game){
 const byEdge=new Map(),adjacency=new Map(game.triangles.filter(t=>t.active).map(t=>[t.id,[]]));
 for(const triangle of game.triangles){if(!triangle.active)continue;for(let i=0;i<3;i++){
  const key=edgeKey(triangle.vertices[i],triangle.vertices[(i+1)%3]);
  const list=byEdge.get(key)||[];for(const other of list){adjacency.get(triangle.id)?.push(other.id);adjacency.get(other.id)?.push(triangle.id);}list.push(triangle);byEdge.set(key,list);
 }}
 return adjacency;
}
export function connectedCluster(game,triangleId){
 const target=game.triangles.find(t=>t.id===triangleId&&t.active);if(!target)return[];
 const adjacency=adjacencyFor(game),seen=new Set([target.id]),queue=[target.id];
 for(let i=0;i<queue.length;i++)for(const id of adjacency.get(queue[i])||[]){const item=game.triangles.find(t=>t.id===id);if(item?.active&&item.realm===target.realm&&!seen.has(id)){seen.add(id);queue.push(id);}}
 return queue.map(id=>game.triangles.find(t=>t.id===id));
}
export function disintegrateCluster(game,triangleId){
 const cluster=connectedCluster(game,triangleId);if(!cluster.length)return{removed:[],coins:[]};
 const coins=cluster.map((t,i)=>({id:game.lastHitCluster*10000+t.id,x:t.x,y:t.y,vx:(i%3-1)*18,vy:24+(i%4)*5,radius:8,active:true}));
 cluster.forEach(t=>t.active=false);game.lastHitCluster++;game.coins.push(...coins);return{removed:cluster.map(t=>t.id),coins};
}
function pointInTriangle(p,a,b,c){
 const sign=(p1,p2,p3)=>(p1.x-p3.x)*(p2.y-p3.y)-(p2.x-p3.x)*(p1.y-p3.y);
 const d1=sign(p,a,b),d2=sign(p,b,c),d3=sign(p,c,a);
 return !((d1<0||d2<0||d3<0)&&(d1>0||d2>0||d3>0));
}
function pointSegmentDistanceSquared(p,a,b){
 const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;
 const t=length?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/length,0,1):0;
 return (p.x-(a.x+t*dx))**2+(p.y-(a.y+t*dy))**2;
}
function hitTriangle(ball,t){
 const [a,b,c]=t.vertices,center={x:ball.x,y:ball.y},r2=ball.radius*ball.radius;
 if(pointInTriangle(center,a,b,c))return true;
 return pointSegmentDistanceSquared(center,a,b)<=r2||pointSegmentDistanceSquared(center,b,c)<=r2||pointSegmentDistanceSquared(center,c,a)<=r2;
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
 const hit=game.triangles.find(t=>t.active&&hitTriangle(ball,t));if(hit){disintegrateCluster(game,hit.id);ball.vy=-ball.vy;ball.y=ball.vy>0?Math.max(ball.y,hit.y+ball.radius+1):Math.min(ball.y,hit.y-ball.radius-1);}
 for(const c of game.coins)if(c.active){c.x+=c.vx*step;c.y+=c.vy*step;if(c.y+c.radius>=paddle.y-paddle.height/2&&c.y-c.radius<=paddle.y+paddle.height/2&&c.x>=paddle.x-paddle.width/2-c.radius&&c.x<=paddle.x+paddle.width/2+c.radius){c.active=false;game.score++;}else if(c.y-c.radius>height)c.active=false;}
 game.coins=game.coins.filter(c=>c.active);if(!game.triangles.some(t=>t.active)){game.over=true;game.running=false;}return game;
}
export function resizeGame(game,width,height){
 const sx=width/game.width,sy=height/game.height;game.width=width;game.height=height;game.paddle.x*=sx;game.paddle.y=height-24;game.paddle.width=Math.max(76,width*.14);game.ball.x*=sx;game.ball.y=Math.min(height-50,game.ball.y*sy);game.ball.radius=Math.max(6,Math.min(9,width*.012));
 for(const t of game.triangles){t.x*=sx;t.y*=sy;t.vertices=t.vertices.map(p=>({x:p.x*sx,y:p.y*sy}));}for(const c of game.coins){c.x*=sx;c.y*=sy;}return game;
}
export function coinLogoPoints(cx,cy,radius){return REALMS.map((realm,i)=>({x:cx+Math.cos(i*Math.PI*2/5-Math.PI/2)*radius*.55,y:cy+Math.sin(i*Math.PI*2/5-Math.PI/2)*radius*.55,color:realm.color}));}
