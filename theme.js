(function(){
  const THEME_KEY = 'anytalk_theme';
  const themes = ['dark','light','ocean','sunset'];

  function applyTheme(theme){
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    document.querySelectorAll('.theme-pill').forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.theme === theme);
    });
  }

  window.AnyTalkTheme = { applyTheme };

  document.addEventListener('DOMContentLoaded', ()=>{
    const stored = localStorage.getItem(THEME_KEY) || 'dark';
    applyTheme(themes.includes(stored) ? stored : 'dark');

    document.querySelectorAll('.theme-pill').forEach(btn=>{
      btn.addEventListener('click', ()=> applyTheme(btn.dataset.theme));
    });
  });
})();
