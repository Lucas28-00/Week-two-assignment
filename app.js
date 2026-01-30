(function(){
  const TYPE_KEY = 'anytalk_user_type';
  const PHONE_KEY = 'anytalk_phone';
  const LANG_KEY = 'anytalk_lang';
  const CODE_KEY = 'anytalk_country_code';

  function setType(type){
    localStorage.setItem(TYPE_KEY, type);
    const label = document.getElementById('type-result');
    if(label) label.textContent = type === 'deaf' ? 'Selected: Deaf/Hard of hearing' : 'Selected: Hearing';
    document.querySelectorAll('.type-btn').forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.type === type);
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    const hearingBtn = document.getElementById('hearing-btn');
    const deafBtn = document.getElementById('deaf-btn');
    const proceedBtn = document.getElementById('proceed-btn');
    const phoneInput = document.getElementById('phone');
    const codeSelect = document.getElementById('country-code');
    const langSelect = document.getElementById('lang-select');

    const storedType = localStorage.getItem(TYPE_KEY);
    if(storedType) setType(storedType);

    hearingBtn?.addEventListener('click', ()=> setType('hearing'));
    deafBtn?.addEventListener('click', ()=> setType('deaf'));

    phoneInput?.addEventListener('input', ()=>{
      localStorage.setItem(PHONE_KEY, phoneInput.value.trim());
    });

    if(codeSelect){
      const storedCode = localStorage.getItem(CODE_KEY) || '+256';
      codeSelect.value = storedCode;
      localStorage.setItem(CODE_KEY, codeSelect.value || '+256');
      codeSelect.addEventListener('change', ()=>{
        localStorage.setItem(CODE_KEY, codeSelect.value || '+256');
      });
    }

    if(langSelect){
      const storedLang = localStorage.getItem(LANG_KEY) || 'en-GB';
      langSelect.value = storedLang;
      localStorage.setItem(LANG_KEY, langSelect.value || 'en-GB');
      langSelect.addEventListener('change', ()=>{
        localStorage.setItem(LANG_KEY, langSelect.value || 'en-GB');
      });
    }

    proceedBtn?.addEventListener('click', ()=>{
      const currentType = localStorage.getItem(TYPE_KEY);
      if(!currentType){
        alert('Please choose whether you can hear or not.');
        return;
      }
      window.location.href = 'call.html';
    });
  });
})();
