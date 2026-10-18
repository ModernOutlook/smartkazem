(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const t = (key,fallback='') => window.SiteI18n?.get('pages.tadbir.'+key,fallback) || fallback;
  const number = value => Number(value||0).toLocaleString(window.SiteI18n?.getLanguage?.()||'fa',{maximumFractionDigits:2});
  const statusNode=$('#tadbir-status'),account=$('#tadbir-account'),depositForm=$('#tadbir-deposit-form'),withdrawButton=$('#tadbir-withdraw'),returnButton=$('#tadbir-return-game'),startButton=$('#tadbir-start-game'),limitNode=$('#tadbir-limit'),messageNode=$('#tadbir-message');
  const setMessage=(message,isError=false)=>{messageNode.textContent=message;messageNode.classList.toggle('is-error',isError);};
  function render(){
    const bank=window.FiveRealmsBankMachine;
    if(!bank){
      statusNode.textContent=t('noGame','ابتدا بازی Poker Hands را آغاز کنید تا حساب بانکی بازیکن در دسترس باشد.');
      account.hidden=true;depositForm.hidden=true;withdrawButton.hidden=true;limitNode.hidden=true;returnButton.hidden=true;startButton.hidden=false;return;
    }
    const s=bank.getStatus();
    account.hidden=true;depositForm.hidden=true;withdrawButton.hidden=true;limitNode.hidden=true;returnButton.hidden=true;startButton.hidden=true;
    if(s.reason==='no-game'){
      statusNode.textContent=t('noGame','ابتدا بازی Poker Hands را آغاز کنید تا حساب بانکی بازیکن در دسترس باشد.');
      startButton.hidden=false;return;
    }
    if(s.reason==='pending-handoff'){
      statusNode.textContent=t('operationSaved','عملیات ثبت شد. برای ادامه، به بازی بازگردید و دستگاه را واگذار کنید.');
      returnButton.hidden=false;return;
    }
    if(s.reason==='handoff'){
      statusNode.textContent=t('handoff','نوبت بازیکن بعدی هنوز در صفحه بازی آشکار نشده است. برای ادامه به بازی برگردید.');
      returnButton.hidden=false;return;
    }
    if(s.reason==='game-over'){
      statusNode.textContent=t('gameOver','بازی پایان یافته است. موجودی بانک در امتیاز نهایی حساب نمی‌شود مگر پیش از پایان بازی برداشت شود.');
      returnButton.hidden=false;return;
    }
    statusNode.textContent=t('connected','حساب بانکی به بازی فعال متصل است.');
    returnButton.hidden=false;
    account.hidden=false;
    $('#tadbir-player').textContent=s.playerName;
    $('#tadbir-points').textContent=number(s.points);
    $('#tadbir-bank').textContent=s.bankActive?number(s.bankPrincipal):'0';
    $('#tadbir-interest-turns').textContent=String(s.bankTurns||0);
    depositForm.hidden=!!s.bankActive;
    const amount=$('#tadbir-amount');
    amount.max=String(s.maxDeposit??0);
    amount.value='';
    limitNode.hidden=false;
    limitNode.textContent=t('maxDeposit','حداکثر سپرده مجاز در این نوبت: ')+number(s.maxDeposit??0);
    withdrawButton.hidden=!s.bankActive;
    withdrawButton.disabled=!s.bankActive;
  }
  depositForm.addEventListener('submit',event=>{
    event.preventDefault();
    const amount=$('#tadbir-amount').value;
    if(amount===''||!Number.isFinite(Number(amount))||Number(amount)<0){setMessage(t('invalidAmount','مقدار سپرده معتبر نیست.'),true);return;}
    const result=window.FiveRealmsBankMachine?.deposit(amount);
    if(!result?.ok){setMessage(t('depositFailed','سپرده‌گذاری انجام نشد. مبلغ از سقف مجاز بیشتر است یا حساب شرایط لازم را ندارد.'),true);render();return;}
    setMessage(t('operationSaved','سپرده ثبت شد. برای ادامه، به بازی بازگردید و دستگاه را واگذار کنید.'));
    render();
  });
  withdrawButton.addEventListener('click',()=>{
    const result=window.FiveRealmsBankMachine?.withdraw();
    if(!result?.ok){setMessage(t('withdrawFailed','برداشت انجام نشد. سپرده فعالی وجود ندارد.'),true);render();return;}
    setMessage(t('operationSaved','برداشت ثبت شد. برای ادامه، به بازی بازگردید و دستگاه را واگذار کنید.'));
    render();
  });
  returnButton.addEventListener('click',async()=>{
    const ok=await window.FiveRealmsBankMachine?.returnToGame?.();
    if(!ok){setMessage(t('returnFailed','بازگشت به بازی انجام نشد.'),true);return;}
  });
  startButton.addEventListener('click',()=>window.SharedPages?.open?.('five-realms-cards','share').catch(error=>setMessage(error.message,true)));
  document.addEventListener('site:languagechange',()=>{if(window.SharedPages?.getActive?.()==='tadbir')render();});
  document.addEventListener('shared-page:opened',event=>{if(event.detail?.key==='tadbir')render();});
  render();
})();