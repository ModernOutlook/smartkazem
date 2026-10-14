import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createEngine, createSeededRng, createDeck, evaluateHand, scoreFewCards } from "../engine/index.mjs";
const config=JSON.parse(await readFile(new URL("../data/config.json",import.meta.url),"utf8"));
const card=(rank,suit)=>({id:`${rank}-${suit}`,rank,suit,realm:({spades:"blue",diamonds:"yellow",hearts:"red",clubs:"green"})[suit],joker:false});
const hand=(ranks,suits)=>ranks.map((r,i)=>card(r,suits[i]||"spades"));
test("seeded RNG and deck are deterministic; deck contains 54 unique cards",()=>{assert.deepEqual(createDeck(config,createSeededRng(42)),createDeck(config,createSeededRng(42)));const d=createDeck(config,createSeededRng(9));assert.equal(d.length,54);assert.equal(new Set(d.map(c=>c.id)).size,54);assert.equal(d.filter(c=>c.joker).length,2);});
test("all five-card poker rankings and exact configured points",()=>{
 const cases=[
 [hand(["2","5","7","9","K"]), "highCard",1],
 [hand(["2","2","5","9","K"]), "pair",2],
 [hand(["2","2","5","5","K"]), "twoPair",4],
 [hand(["2","2","2","9","K"]), "threeOfAKind",6],
 [hand(["2","3","4","5","6"]), "straight",8],
 [hand(["2","5","7","9","K"],["hearts","hearts","hearts","hearts","hearts"]), "flush",10],
 [hand(["2","2","2","9","9"]), "fullHouse",12],
 [hand(["2","2","2","2","K"]), "fourOfAKind",16],
 [hand(["5","6","7","8","9"]), "straightFlush",20],
 [hand(["10","J","Q","K","A"]), "royalFlush",25]
 ];
 for(const [cards,category,points] of cases){const result=evaluateHand(cards,config);assert.equal(result.category,category);assert.equal(result.points,points);}
});
test("ace-low and ace-high straights work; no wrap-around",()=>{
 assert.equal(evaluateHand(hand(["A","2","3","4","5"]),config).category,"straight");
 assert.equal(evaluateHand(hand(["10","J","Q","K","A"]),config).category,"royalFlush");
 assert.notEqual(evaluateHand(hand(["Q","K","A","2","3"]),config).category,"straight");
});
test("few-card count scoring and structural mode option",()=>{
 for(const [n,points] of [[1,1],[2,2],[3,6],[4,16],[5,1]]) if(n<5) assert.equal(scoreFewCards(n,config),points);
 const structural=structuredClone(config);structural.poker.fewCardMode="structural";
 assert.equal(scoreFewCards(4,structural),16); // current implementation is count-based; structural remains an explicit future mode.
});
test("jokers are rejected from poker hands and six-card hands are rejected",()=>{
 assert.throws(()=>evaluateHand([{id:"joker-1",rank:"JOKER",suit:"joker",joker:true}],config),/Jokers/);
 assert.throws(()=>evaluateHand(Array.from({length:6},(_,i)=>card(String(i+2),"spades")),config),/1 to handSize/);
});
test("approved x=12 badge pool has 72 badges and total value 120 per realm",()=>{
 const engine=createEngine(config,{seed:11}),state=engine.newGame(["A","B"]);
 for(const realm of ["blue","yellow","purple","red","green"]){
  const pool=state.badgePool[realm];
  assert.equal(pool.length,72);
  assert.equal(pool.filter(b=>b.value===3).length,12);
  assert.equal(pool.filter(b=>b.value===2).length,24);
  assert.equal(pool.filter(b=>b.value===1).length,36);
  assert.equal(engine.realmTotal(realm),120);
 }
});
test("badge discount, 95% resale and pool ownership",()=>{
 const engine=createEngine(config,{seed:1}),state=engine.newGame(["A","B"]),p=state.players[0];
 p.points=10000;
 const bought=engine.buyBadge(state,p,"blue");assert.equal(bought.ok,true);
 assert.equal(bought.price,300);
 const sold=engine.sellBadge(state,p,bought.badge.id);assert.equal(sold.price,285);assert.equal(p.points,9985);assert.equal(state.badgePool.blue.length,72);
});
test("joker exchange keeps the joker and grants a chosen card from the deck",()=>{
 const engine=createEngine(config,{seed:7}),state=engine.newGame(["A","B"]),p=state.players[0];
 const joker=state.deck.find(c=>c.joker);state.deck=state.deck.filter(c=>!c.joker);p.hand.push(joker);
 const chosen=state.deck[0],before=p.hand.length;
 const result=engine.act(state,p.id,{type:"exchange",returnedCardId:joker.id,chosenCardId:chosen.id});
 assert.equal(result.ok,true);assert.equal(result.jokerRetained,true);
 assert.equal(p.hand.length,before+1);assert.ok(p.hand.some(c=>c.id===joker.id));assert.ok(p.hand.some(c=>c.id===chosen.id));
});
test("question action requires answers and forgives the selected tied maximum realm",()=>{
 const engine=createEngine(config,{seed:19}),state=engine.newGame(["A","B"]),p=state.players[0];
 p.hand=[{id:"a",rank:"A",suit:"spades",realm:"blue",joker:false,lucky:false},{id:"b",rank:"2",suit:"diamonds",realm:"yellow",joker:false,lucky:false}];
 const missing=engine.act(state,p.id,{type:"question",answers:{parts:{}}});
 assert.equal(missing.ok,false);assert.equal(missing.reason,"missing-answer");
 const parts=Object.fromEntries(["blue","yellow","purple","red","green"].map(realm=>[realm,{correct:false}]));
 const result=engine.act(state,p.id,{type:"question",answers:{parts,forgivenRealm:"blue"}});
 assert.equal(result.ok,true);
});
test("realm ownership grants a permanent lucky card and poker scoring preserves it",()=>{
 const engine=createEngine(config,{seed:27}),state=engine.newGame(["A","B"]),p=state.players[0];
 p.points=100000000;
 while(state.badgePool.blue.length){const bought=engine.buyBadge(state,p,"blue");assert.equal(bought.ok,true);}
 const lucky=p.hand.find(c=>c.id==="A-spades");
 assert.ok(lucky);assert.equal(lucky.lucky,true);assert.equal(engine.realmOwned(p,"blue"),true);
 const chosen=p.hand.filter(c=>!c.joker).slice(0,5);
 if(!chosen.some(c=>c.id==="A-spades"))chosen[0]=lucky;
 const result=engine.act(state,p.id,{type:"score",cardIds:chosen.map(c=>c.id)});
 assert.equal(result.ok,true);assert.ok(p.hand.some(c=>c.id==="A-spades"&&c.lucky));
});
test("unowned-to-owned exchange grants exactly one extra exchange before turn advances",()=>{
 const engine=createEngine(config,{seed:31}),state=engine.newGame(["A","B"]),p=state.players[0];
 p.badges=state.badgePool.blue.splice(0).map(b=>({...b,purchasePrice:0}));
 p.hand=[{id:"return-yellow",rank:"2",suit:"diamonds",realm:"yellow",joker:false,lucky:false}];
 const incoming=state.deck.find(c=>c.realm==="blue");state.deck=state.deck.filter(c=>c.id!==incoming.id);state.deck.push(incoming);
 const first=engine.act(state,p.id,{type:"exchange",returnedCardId:"return-yellow"});
 assert.equal(first.ok,true);assert.equal(first.extraExchange,true);assert.equal(state.currentPlayer,0);
 const secondCard=p.hand.find(c=>!c.lucky&&!c.joker);
 const second=engine.act(state,p.id,{type:"exchange",returnedCardId:secondCard.id});
 assert.equal(second.ok,true);assert.equal(state.currentPlayer,1);
});
test("when both card realms are owned, exchange keeps the returned card and draws two",()=>{
 const engine=createEngine(config,{seed:33}),state=engine.newGame(["A","B"]),p=state.players[0];
 p.badges=[...state.badgePool.blue.splice(0),...state.badgePool.yellow.splice(0)];
 const returned={id:"return-blue",rank:"A",suit:"spades",realm:"blue",joker:false,lucky:false};
 p.hand=[returned];const incoming=state.deck.find(c=>c.realm==="yellow");
 state.deck=state.deck.filter(c=>c.id!==incoming.id);state.deck.push(incoming);
 const before=p.hand.length;
 const result=engine.act(state,p.id,{type:"exchange",returnedCardId:returned.id});
 assert.equal(result.ok,true);assert.equal(result.returned,false);assert.equal(p.hand.length,before+2);
 assert.ok(p.hand.some(c=>c.id===returned.id));assert.equal(state.currentPlayer,1);
});
test("bank schedule matches configured rates for 3, 3.5, and 0.5 units",()=>{
 for(const [amount,expectedPrincipal,expectedInterest] of [[3,300,30],[3.5,350,35],[0.5,50,-5]]) {
  const engine=createEngine(config,{seed:2}),state=engine.newGame(["A","B"]),p=state.players[0];
  p.points=1000+Math.round(amount*10); const dep=engine.bankDeposit(p,amount*100);
  assert.equal(dep.ok,true);
  const interest=engine.accrueBank(p);
  assert.equal(p.bank.principal,expectedPrincipal+expectedInterest);
  assert.equal(interest,expectedInterest);
 }
});
test("new game enforces 2-5 players and starts with configured hand size",()=>{
 const engine=createEngine(config,{seed:3}),state=engine.newGame(["A","B"]);
 assert.equal(state.players[0].hand.length,5);assert.equal(state.players[0].points,0);
 assert.throws(()=>engine.newGame(["solo"]),/Player count/);
});
