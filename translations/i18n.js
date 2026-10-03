/* Modern Outlook — Single Source i18n Runtime */
(function(){
'use strict';
const SUPPORTED=['fa','en','zh','ar'];
const DEFAULT='fa';
const KEY='modern-outlook.lang.v2';
const cache=Object.create(null);
const CATALOG_BASE=new URL('./',document.currentScript?.src||new URL('translations/i18n.js',document.baseURI).href);
let current=DEFAULT;
let serial=0;

function normalize(lang){return SUPPORTED.includes(lang)?lang:DEFAULT}
function getLanguage(){
  try{return normalize(localStorage.getItem(KEY)||localStorage.getItem('modern-outlook.lang.v1')||document.documentElement.lang||DEFAULT)}
  catch(_){return normalize(document.documentElement.lang)}
}
function get(path,fallback=''){
  const parts=String(path||'').split('.');
  let value=cache[current];
  for(const p of parts){if(value==null)return fallback;value=value[p]}
  return value==null?fallback:value;
}
function applyDom(data){
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const value=String(get(el.dataset.i18n,''));
    if(value!=='')el.textContent=value;
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el=>{
    const value=String(get(el.dataset.i18nHtml,''));
    if(value!=='')el.innerHTML=value;
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el=>{
    const value=String(get(el.dataset.i18nAria,''));
    if(value!=='')el.setAttribute('aria-label',value);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el=>{
    const value=String(get(el.dataset.i18nTitle,''));
    if(value!=='')el.setAttribute('title',value);
  });
  document.querySelectorAll('[data-i18n-lang]').forEach(el=>{
    const lang=el.dataset.i18nLang;
    el.hidden=lang!==current;
  });
  document.querySelectorAll('[data-site-lang]').forEach(btn=>{
    btn.classList.toggle('active',btn.dataset.siteLang===current);
    btn.setAttribute('aria-pressed',btn.dataset.siteLang===current?'true':'false');
  });
  document.documentElement.lang=current;
  document.documentElement.dir=data.dir||((current==='fa'||current==='ar')?'rtl':'ltr');
  document.body.dataset.lang=current;
  document.body.dataset.mode=current;
}
async function load(lang){
  lang=normalize(lang);
  if(cache[lang])return cache[lang];
  const response=await fetch(new URL(lang+'.json',CATALOG_BASE),{cache:'no-store'});
  if(!response.ok)throw new Error('Translation catalog unavailable: '+lang);
  const data=await response.json();
  cache[lang]=data;
  return data;
}
async function setLanguage(lang){
  lang=normalize(lang);
  const token=++serial;
  const data=await load(lang);
  if(token!==serial)return lang;
  current=lang;
  try{localStorage.setItem(KEY,lang);localStorage.setItem('modern-outlook.lang.v1',lang)}catch(_){}
  applyDom(data);
  const pageKey=document.querySelector('meta[name="i18n-page"]')?.content;
  document.title=pageKey?get('pages.'+pageKey+'.title',get('home.title',document.title)):get('home.title',document.title);
  document.dispatchEvent(new CustomEvent('site:languagechange',{detail:{lang,data}}));
  return lang;
}
async function init(){
  const lang=getLanguage();
  try{await setLanguage(lang)}catch(_){
    current=DEFAULT;
    try{await setLanguage(DEFAULT)}catch(__){}
  }
}
window.SiteI18n=Object.freeze({SUPPORTED,DEFAULT,KEY,getLanguage,setLanguage,load,get:(path,fallback='')=>get(path,fallback),getCatalog:()=>cache[current]||null});
let observer=null;
function installObserver(){
  if(observer||!document.body)return;
  observer=new MutationObserver(()=>{
    const data=cache[current];
    if(!data)return;
    observer.disconnect();
    applyDom(data);
    observer.observe(document.body,{subtree:true,childList:true});
  });
  observer.observe(document.body,{subtree:true,childList:true});
}
document.addEventListener('DOMContentLoaded',()=>{init();installObserver()},{once:true});
document.addEventListener('click',event=>{
  const btn=event.target.closest&&event.target.closest('[data-site-lang]');
  if(!btn)return;
  event.preventDefault();
  event.stopPropagation();
  setLanguage(btn.dataset.siteLang);
});
})();
