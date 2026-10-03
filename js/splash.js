(function(){
  const splash=document.getElementById('splash');
  if(!splash)return;
  const root=document.documentElement;
  const waitForApp=root.hasAttribute('data-splash-wait');
  let dom=0,load=0,imgT=0,imgD=0,last=0,done=false,appReady=0;

  function paint(){
    if(done)return;
    let p=Math.min(1,.15*dom+.25*load+(dom?.6*(imgT?(imgD/imgT):1):0));
    if(p<last)p=last;
    last=p;
    splash.style.opacity=String(1-p);
    if(p>=.999)finish();
  }

  function finish(){
    if(done)return;
    done=true;
    splash.style.opacity='0';
    const remove=()=>splash.remove();
    splash.addEventListener('transitionend',remove,{once:true});
    setTimeout(remove,700);
  }

  function trackImages(){
    const images=[...document.images].filter(img=>img!==splash.querySelector('img')&&!img.loading?.toLowerCase?.().includes('lazy'));
    imgT=images.length;
    imgD=images.filter(img=>img.complete).length;
    images.forEach(img=>{
      if(img.complete)return;
      img.addEventListener('load',()=>{imgD++;paint()},{once:true});
      img.addEventListener('error',()=>{imgD++;paint()},{once:true});
    });
    paint();
  }

  function domReady(){
    dom=1;
    trackImages();
    paint();
  }

  function windowReady(){
    (document.fonts?.ready||Promise.resolve()).then(()=>{
      load=1;
      if(!waitForApp||appReady)paint();
    });
  }

  document.addEventListener('DOMContentLoaded',domReady,{once:true});
  window.addEventListener('load',windowReady,{once:true});
  document.addEventListener('app-ready',()=>{
    appReady=1;
    if(load)paint();
  });

  if(document.readyState!=='loading')domReady();
  if(document.readyState==='complete')windowReady();
  setTimeout(finish,15000);
})();
