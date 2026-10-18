import { GAME_BACKGROUNDS } from "../shared/backgrounds.mjs";

(() => {
 "use strict";
 const root=document.querySelector(".fr-hub-page");
 if(!root||root.dataset.hubReady)return;
 root.dataset.hubReady="true";
 root.querySelectorAll(".fr-game-tile").forEach((tile,index)=>{
  const asset=GAME_BACKGROUNDS[index];
  if(!asset)return;
  tile.style.backgroundImage=`linear-gradient(rgba(3,7,11,.34),rgba(3,7,11,.48)),url("${asset.dataUri}")`;
  tile.style.backgroundSize="cover";
  tile.style.backgroundPosition="center";
  tile.style.backgroundRepeat="no-repeat";
  tile.dataset.backgroundAsset=asset.source;
 });
 root.addEventListener("click",event=>{
  const button=event.target.closest("[data-talash-link]");
  if(!button)return;
  event.preventDefault();
  window.SharedPages?.open("talash","continuity").catch(error=>console.error("[Talash]",error));
 });
})();