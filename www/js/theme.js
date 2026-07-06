// theme.js - Light / dark / system theme controller.
(function () {
  const STORAGE_KEY = 'rez-lector:theme';
  const choices = new Set(['system', 'light', 'dark']);
  const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  let preference = readPreference();

  function readPreference() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return choices.has(value) ? value : 'system';
    } catch (e) {
      return 'system';
    }
  }

  function systemTheme() {
    return media && media.matches ? 'dark' : 'light';
  }

  function resolvedTheme() {
    return preference === 'system' ? systemTheme() : preference;
  }

  function updateThemeColor(theme) {
    const meta = document.getElementById('themeColorMeta');
    if (!meta) return;
    meta.setAttribute('content', theme === 'dark' ? '#1A1714' : '#EDE6D6');
  }

  function apply() {
    const resolved = resolvedTheme();
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.style.colorScheme = resolved;
    updateThemeColor(resolved);
    document.querySelectorAll('[data-theme-choice]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.themeChoice === preference);
      btn.setAttribute('aria-pressed', String(btn.dataset.themeChoice === preference));
    });
  }

  function setPreference(next) {
    if (!choices.has(next)) return;
    preference = next;
    try { localStorage.setItem(STORAGE_KEY, preference); } catch (e) {}
    apply();
  }

  function init() {
    apply();
    const root = document.getElementById('themeSwitch');
    if (root) {
      root.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-theme-choice]');
        if (!btn) return;
        setPreference(btn.dataset.themeChoice);
      });
    }
  }

  if (media) {
    if (media.addEventListener) media.addEventListener('change', () => { if (preference === 'system') apply(); });
    else if (media.addListener) media.addListener(() => { if (preference === 'system') apply(); });
  }

  apply();
  window.Theme = { init, apply, setPreference, getPreference: () => preference, getResolvedTheme: resolvedTheme };
})();
