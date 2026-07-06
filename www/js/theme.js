// theme.js - Light / dark / system theme controller.
(function () {
  const STORAGE_KEY = 'rez-lector:theme';
  const ACCENT_STORAGE_KEY = 'rez-lector:accent';
  const choices = new Set(['system', 'light', 'dark']);
  const accentChoices = new Set(['blue', 'red', 'green']);
  const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  let preference = readPreference();
  let accentPreference = readAccentPreference();

  function readPreference() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return choices.has(value) ? value : 'system';
    } catch (e) {
      return 'system';
    }
  }

  function readAccentPreference() {
    try {
      const value = localStorage.getItem(ACCENT_STORAGE_KEY);
      return accentChoices.has(value) ? value : 'blue';
    } catch (e) {
      return 'blue';
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
    meta.setAttribute('content', theme === 'dark' ? '#0E1116' : '#F7F9FF');
  }

  function apply() {
    const resolved = resolvedTheme();
    if (accentPreference !== 'blue' && window.Storage && !Storage.isPremium()) {
      accentPreference = 'blue';
      try { localStorage.setItem(ACCENT_STORAGE_KEY, accentPreference); } catch (e) {}
    }
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.dataset.accent = accentPreference;
    document.documentElement.style.colorScheme = resolved;
    updateThemeColor(resolved);
    document.querySelectorAll('[data-theme-choice]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.themeChoice === preference);
      btn.setAttribute('aria-pressed', String(btn.dataset.themeChoice === preference));
    });
    document.querySelectorAll('[data-accent-choice]').forEach(btn => {
      const isActive = btn.dataset.accentChoice === accentPreference;
      const isLocked = btn.dataset.accentChoice !== 'blue' && window.Storage && !Storage.isPremium();
      btn.classList.toggle('active', isActive);
      btn.classList.toggle('locked', isLocked);
      btn.setAttribute('aria-pressed', String(isActive));
    });
  }

  function setPreference(next) {
    if (!choices.has(next)) return;
    preference = next;
    try { localStorage.setItem(STORAGE_KEY, preference); } catch (e) {}
    apply();
  }

  function setAccent(next) {
    if (!accentChoices.has(next)) return;
    if (next !== 'blue' && window.Storage && !Storage.isPremium()) {
      if (window.Premium) Premium.show(() => setAccent(next));
      return;
    }
    accentPreference = next;
    try { localStorage.setItem(ACCENT_STORAGE_KEY, accentPreference); } catch (e) {}
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
    const accentRoot = document.getElementById('accentSwitch');
    if (accentRoot) {
      accentRoot.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-accent-choice]');
        if (!btn) return;
        setAccent(btn.dataset.accentChoice);
      });
    }
  }

  if (media) {
    if (media.addEventListener) media.addEventListener('change', () => { if (preference === 'system') apply(); });
    else if (media.addListener) media.addListener(() => { if (preference === 'system') apply(); });
  }

  apply();
  window.Theme = {
    init,
    apply,
    setPreference,
    setAccent,
    getPreference: () => preference,
    getAccent: () => accentPreference,
    getResolvedTheme: resolvedTheme
  };
})();
