(() => {
  const THEME_KEY = 'asfar-fashion-theme';
  const root = document.documentElement;
  const sun = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  const moon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  let savedTheme;
  try {
    savedTheme = localStorage.getItem(THEME_KEY);
  } catch {
    savedTheme = null;
  }
  let theme = savedTheme === 'dark' || savedTheme === 'light'
    ? savedTheme
    : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  function applyTheme() {
    root.setAttribute('data-theme', theme);
    const toggle = document.querySelector('[data-theme-toggle]');
    if (!toggle) return;
    toggle.innerHTML = theme === 'dark' ? sun : moon;
    toggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
  }

  applyTheme();
  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.querySelector('[data-theme-toggle]');
    if (!toggle) return;
    applyTheme();
    toggle.addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_KEY, theme);
      } catch {
        // Keep the current page toggle usable when storage is unavailable.
      }
      applyTheme();
    });
  }, { once: true });
})();