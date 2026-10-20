export const WALLET_KEY="smartkazem.brick-breaker-coins.v1";
export const MAX_COINS=999;
function notify(){if(typeof window!=="undefined")window.dispatchEvent(new Event("smartkazem:economy-updated"));}
export function createWallet(storage){
 const read=()=>{try{const n=Number(storage?.getItem(WALLET_KEY)??0);return Number.isFinite(n)?Math.max(0,Math.min(MAX_COINS,Math.floor(n))):0}catch{return 0}};
 const write=value=>{const n=Math.max(0,Math.min(MAX_COINS,Math.floor(value)));if(!storage||typeof storage.setItem!=="function")return false;try{storage.setItem(WALLET_KEY,String(n));}catch{return false}notify();return true};
 return Object.freeze({getBalance:read,creditCaughtCoins(count){const n=Number(count);if(!Number.isFinite(n)||n<=0)return read();const before=read();write(before+Math.floor(n));return read()},spend(amount){const n=Number(amount);if(!Number.isSafeInteger(n)||n<0)return {success:false};const before=read();if(before<n)return {success:false};if(!write(before-n))return {success:false};return {success:true,balance:read()}}});
}
let installed;
export function installWallet(){if(!installed){let storage;try{storage=globalThis.localStorage}catch{}installed=createWallet(storage);}if(typeof window!=="undefined")window.BrickBreakerWallet=installed;return installed;}
