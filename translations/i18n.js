(function(){
'use strict';
const SUPPORTED=['fa','en','zh','ar'];
const DEFAULT='fa';
const KEY='modern-outlook.lang.v1';
const cache={};
function normalize(lang){return SUPPORTED.includes(lang)?lang:DEFAULT}
function getLanguage(){
  try{return normalize(localStorage.getItem(KEY)||document.documentElement.lang||DEFAULT)}catch(_){return normalize(document.documentElement.lang)}
}
function setLanguage(lang){
  lang=normalize(lang);
  try{localStorage.setItem(KEY,lang)}catch(_){}
  document.documentElement.lang=lang;
  document.documentElement.dir=(lang==='en'||lang==='zh')?'ltr':'rtl';
  document.body.dataset.lang=lang;
  document.body.dataset.mode=lang;
  document.dispatchEvent(new CustomEvent('site:languagechange',{detail:{lang}}));
  return lang;
}
function load(lang){
  lang=normalize(lang);
  if(cache[lang])return Promise.resolve(cache[lang]);
  return fetch('translations/'+lang+'.json',{cache:'no-store'}).then(r=>{
    if(!r.ok)throw new Error('Translation file unavailable: '+lang);
    return r.json();
  }).then(data=>(cache[lang]=data));
}
function init(){
  const lang=getLanguage();
  setLanguage(lang);
  document.querySelectorAll('[data-site-lang]').forEach(btn=>{
    btn.addEventListener('click',()=>setLanguage(btn.dataset.siteLang));
  });
}
window.SiteI18n={SUPPORTED,DEFAULT,getLanguage,setLanguage,load,init};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();