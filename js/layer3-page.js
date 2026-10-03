(()=>{ 
  const page=document.getElementById('layer3-page');
  const title=document.getElementById('layer3-title');
  const subtitle=document.getElementById('layer3-subtitle');
  const tabs=document.getElementById('layer3-tabs');
  const body=document.getElementById('layer3-body');
  const close=document.getElementById('layer3-close');

  function data(){return window.SiteI18n?.getCatalog?.()?.pages?.layer3||{};}
  function render(){
    const d=data();
    title.textContent=d.title||'پژواک لایه سوم';
    subtitle.textContent=d.subtitle||'';
    close.setAttribute('aria-label',d.close||'بازگشت');
    tabs.innerHTML='';
    body.innerHTML='';
    const chapter=(label)=>{
      const el=document.createElement('div');
      el.className='layer3-chapter';
      el.textContent=label||'';
      tabs.appendChild(el);
    };
    const section=(name,index)=>{
      const b=document.createElement('button');
      b.type='button'; b.className='layer3-tab'; b.textContent=(index+1)+' . '+name;
      b.addEventListener('click',()=>activate(index));
      tabs.appendChild(b);
      const article=document.createElement('section');
      article.className='layer3-section';
      article.id='layer3-section-'+index;
      const h=document.createElement('h2'); h.textContent=name;
      const p=document.createElement('p'); p.textContent='';
      article.append(h,p); body.appendChild(article);
    };
    chapter(d.chapter1);
    (d.sections||[]).forEach(section);
    chapter(d.chapter2);
    const chapter2=document.createElement('section');
    chapter2.className='layer3-section'; chapter2.id='layer3-utopia';
    const h=document.createElement('h2'); h.textContent=d.chapter2||'';
    const p=document.createElement('p'); p.textContent='';
    chapter2.append(h,p); body.appendChild(chapter2);
    activate(0);
  }
  function activate(index){
    document.querySelectorAll('.layer3-tab').forEach((b,i)=>b.classList.toggle('active',i===index));
    document.querySelectorAll('.layer3-section').forEach((s,i)=>s.classList.toggle('active',i===index));
    const active=document.querySelector('.layer3-tab.active');
    if(active) active.scrollIntoView({block:'nearest',behavior:'smooth'});
  }
  close.addEventListener('click',()=>{window.location.href='index.html';});
  window.addEventListener('site:languagechange',render);
  render();
})();