/**
 * CampusIQ — Theme System
 * • Reads saved theme from localStorage on load (no flicker)
 * • Toggles dark ↔ light via data-theme attribute on <html>
 * • Persists choice across all pages
 *
 * HOW TO USE:
 *   1. Add <script src="theme.js"></script> as the FIRST script in <head>
 *      (before any other script, to prevent flash)
 *   2. Add the toggle button HTML inside your .tb-right div (see below)
 */

/* ── 1. Apply saved theme INSTANTLY (before paint) ── */
(function () {
  const saved = localStorage.getItem('ciq-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
})();

/* ── 2. Toggle function (called by button onclick) ── */
function toggleTheme() {
  const html    = document.documentElement;
  const current = html.getAttribute('data-theme') || 'dark';
  const next    = current === 'dark' ? 'light' : 'dark';

  html.setAttribute('data-theme', next);
  localStorage.setItem('ciq-theme', next);
}
