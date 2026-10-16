(() => {
 "use strict";
 const root=document.querySelector(".fr-hub-page");
 if(!root||root.dataset.hubReady)return;
 root.dataset.hubReady="true";
 root.addEventListener("click",event=>{
  const button=event.target.closest("[data-talash-link]");
  if(!button)return;
  event.preventDefault();
  window.SharedPages?.open("talash","continuity").catch(error=>console.error("[Talash]",error));
 });
})();