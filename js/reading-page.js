const body=document.body;
document.getElementById('close').onclick=()=>{if(history.length>1)history.back();else location.href='index.html'};
document.querySelectorAll('.book-tab').forEach(b=>b.onclick=()=>{const id=b.dataset.target;if(id){const el=document.getElementById(id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'})}});