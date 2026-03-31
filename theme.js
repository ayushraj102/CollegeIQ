/**
 * CampusIQ — Theme System (Fixed: unified across login + portals)
 *
 * Login page   uses: body.light-mode class  + localStorage key 'theme'
 * Portal pages use:  html[data-theme] attr  + localStorage key 'ciq-theme'
 *
 * This file reads BOTH keys and writes BOTH keys so toggling on any page
 * carries over correctly to every other page.
 *
 * Load as FIRST script in <head> to prevent theme flash.
 */

/* ── 1. Determine initial theme from EITHER storage key ── */
(function () {
  // Read from both keys — prefer 'ciq-theme', fall back to 'theme'
  const saved   = localStorage.getItem('ciq-theme') || localStorage.getItem('theme') || 'dark';
  const isLight = saved === 'light';

  // Portal mechanism: html[data-theme]
  document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');

  // Login-page mechanism: body.light-mode (body may not exist yet at <head> parse time)
  if (isLight) {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.classList.add('light-mode');
    });
  }

  // Keep both keys in sync from the start
  localStorage.setItem('ciq-theme', isLight ? 'light' : 'dark');
  localStorage.setItem('theme',     isLight ? 'light' : 'dark');
})();

/* ── 2. Toggle — writes both keys, updates both mechanisms ── */
function toggleTheme() {
  const html    = document.documentElement;
  const current = html.getAttribute('data-theme') || 'dark';
  const next    = current === 'dark' ? 'light' : 'dark';
  const isLight = next === 'light';

  // Portal mechanism
  html.setAttribute('data-theme', next);

  // Login-page mechanism
  if (isLight) {
    document.body.classList.add('light-mode');
  } else {
    document.body.classList.remove('light-mode');
  }

  // Write BOTH keys so every page picks up the change
  localStorage.setItem('ciq-theme', next);
  localStorage.setItem('theme',     next);
}
