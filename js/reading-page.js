const close=document.getElementById('close');
if(close)close.onclick=()=>{if(history.length>1)history.back();else location.href='index.html'};

document.querySelectorAll('.book-tab').forEach(tab=>{
  tab.addEventListener('click',()=>{
    const id=tab.dataset.target;
    if(!id)return;
    document.querySelectorAll('.book-tab').forEach(item=>item.classList.toggle('active',item===tab));
    const target=document.getElementById(id);
    if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
  });
});
