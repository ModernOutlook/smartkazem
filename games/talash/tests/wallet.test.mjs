import test from "node:test";
import assert from "node:assert/strict";
import {createWallet,WALLET_KEY,MAX_COINS} from "../wallet.mjs";
function storage(initial="0"){const data=new Map([[WALLET_KEY,initial]]);return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};}
test("caught coins persist and wallet caps at 999",()=>{const s=storage("995"),w=createWallet(s);assert.equal(w.creditCaughtCoins(3),998);assert.equal(w.creditCaughtCoins(8),MAX_COINS);assert.equal(createWallet(s).getBalance(),999);});
test("navigation or recreating wallet does not change balance",()=>{const s=storage("42");assert.equal(createWallet(s).getBalance(),42);assert.equal(createWallet(s).getBalance(),42);});
test("maze spending deducts shared coins only when affordable",()=>{const s=storage("20"),w=createWallet(s);assert.deepEqual(w.spend(25),{success:false});assert.equal(w.getBalance(),20);assert.deepEqual(w.spend(15),{success:true,balance:5});assert.equal(createWallet(s).getBalance(),5);});
test("invalid coin credits and spends cannot create balance",()=>{const w=createWallet(storage("7"));assert.equal(w.creditCaughtCoins(-4),7);assert.equal(w.spend(-1).success,false);assert.equal(w.getBalance(),7);});
