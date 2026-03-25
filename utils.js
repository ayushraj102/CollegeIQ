/**
 * CampusIQ — utils.js  v4
 * Shared UI helpers. No global state except the GRADS pool.
 * Must load after db.js.
 */
'use strict';

/* Inject spinner CSS once */
(function() {
  if (document.getElementById('_ciq_spin')) return;
  const s = document.createElement('style');
  s.id = '_ciq_spin';
  s.textContent = '@keyframes _spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(s);
})();

/* ── XSS escape ──────────────────────────────────────── */
function esc(v) {
  return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ── Initials ─────────────────────────────────────────── */
function getInitials(name) {
  return String(name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase();
}

/* ── Gradient pool ────────────────────────────────────── */
const GRADS = [
  'linear-gradient(135deg,#38BDF8,#8B5CF6)',
  'linear-gradient(135deg,#10B981,#38BDF8)',
  'linear-gradient(135deg,#F59E0B,#EF4444)',
  'linear-gradient(135deg,#A78BFA,#EC4899)',
  'linear-gradient(135deg,#38BDF8,#10B981)',
  'linear-gradient(135deg,#8B5CF6,#EF4444)',
];
function grad(i) { return GRADS[Math.abs(Number(i)) % GRADS.length]; }

/* ── Toast ────────────────────────────────────────────── */
function showToast(msg, sub = '', type = 'ok') {
  const wrap = document.getElementById('toast-wrap');
  if (!wrap) return;
  const t   = document.createElement('div');
  t.className = `toast ${type === 'error' ? 'error' : ''}`;
  const ico = type === 'ok' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  const ic  = type === 'ok' ? 'toast-ico-ok' : type === 'error' ? 'toast-ico-err' : 'toast-ico-info';
  t.innerHTML = `<div class="toast-ico ${ic}">${ico}</div><div><div class="toast-t">${esc(msg)}</div>${sub ? `<div class="toast-s">${esc(sub)}</div>` : ''}</div>`;
  wrap.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('in')));
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 4200);
}

/* ── Loading spinner ──────────────────────────────────── */
function showLoading(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:180px;gap:1rem;color:var(--muted)">
    <div style="width:30px;height:30px;border:3px solid var(--b2);border-top-color:var(--cyan);border-radius:50%;animation:_spin 0.75s linear infinite"></div>
    <div class="text-sm">Loading…</div></div>`;
}

/* ── Modal helpers ────────────────────────────────────── */
function openModal(id)  { const m = document.getElementById(id); if (m) m.classList.add('open'); }
function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.remove('open'); }

/** Attach backdrop-click + ESC close to a modal */
function setupModal(id, closeBtnId) {
  const m = document.getElementById(id);
  if (!m) return;
  m.addEventListener('click', e => { if (e.target === m) closeModal(id); });
  if (closeBtnId) {
    const b = document.getElementById(closeBtnId);
    if (b) b.addEventListener('click', () => closeModal(id));
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && m.classList.contains('open')) closeModal(id); });
}

/* ── Sidebar navigation ───────────────────────────────── */
function setupNav(renderFn) {
  document.querySelectorAll('.sb-item[data-page]').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
      el.classList.add('active');
      renderFn(el.dataset.page);
    });
  });
}

/* ── Topbar init ──────────────────────────────────────── */
function initTopbar(session) {
  const nameEl   = document.getElementById('tbName');
  const avatarEl = document.getElementById('tbAvatar');
  if (nameEl)   nameEl.textContent = session.name;
  if (avatarEl) {
    avatarEl.textContent = getInitials(session.name);
    if (!avatarEl.style.background) avatarEl.style.background = grad(session.name.charCodeAt(0) || 0);
  }
}

/* ── Chip helpers ─────────────────────────────────────── */
function typeChip(type) {
  const m = { hackathon:'chip-cyan', ideathon:'chip-violet', certification:'chip-emerald', research:'chip-amber', competition:'chip-pink', project:'chip-cyan', internship:'chip-emerald', other:'chip-gray' };
  return `<span class="chip ${m[type]||'chip-gray'}">${esc(type)}</span>`;
}
function riskChip(level) {
  const m = { high:['chip-red','⚠ High Risk'], medium:['chip-amber','⚡ Medium Risk'], low:['chip-emerald','✓ On Track'] };
  const [cls, label] = m[level] || m.low;
  return `<span class="chip ${cls}">${label}</span>`;
}
function readinessColor(score) {
  return score >= 80 ? 'var(--emerald)' : score >= 60 ? 'var(--cyan)' : 'var(--amber)';
}
function statusChip(status) {
  const m = { verified:'status-verified ✓ Verified', pending:'status-pending ⏳ Pending', rejected:'status-rejected ✗ Rejected' };
  const [cls, label] = (m[status] || 'chip-gray Unknown').split(' ', 2);
  return `<span class="${cls}">${m[status]?.slice(m[status].indexOf(' ')+1) || status}</span>`;
}

/* ── Progress bar ─────────────────────────────────────── */
function progressBar(val, max = 100, color = null) {
  const pct = Math.round(Math.min(Math.max(val, 0), max) / (max || 1) * 100);
  const col = color || (pct >= 80 ? 'linear-gradient(90deg,#38BDF8,#8B5CF6)' : pct >= 60 ? 'linear-gradient(90deg,#10B981,#38BDF8)' : 'linear-gradient(90deg,#F59E0B,#EF4444)');
  return `<div class="progress-wrap"><div class="progress-fill" data-w="${pct}%" data-bg="${col}" style="width:0%"></div></div>`;
}
function animateBars(root = document) {
  root.querySelectorAll('.progress-fill[data-w]').forEach(el => {
    requestAnimationFrame(() => { el.style.width = el.dataset.w; el.style.background = el.dataset.bg; });
  });
}

/* ── Pagination ───────────────────────────────────────── */
function renderPaginator(meta, containerId, onPageFn) {
  const old = document.getElementById(containerId + '_pager');
  if (old) old.remove();
  if (meta.pages <= 1) return;
  const wrap = document.createElement('div');
  wrap.id = containerId + '_pager';
  wrap.style.cssText = 'display:flex;gap:0.4rem;margin-top:1rem;justify-content:center;flex-wrap:wrap';
  const btns = [];
  if (meta.hasPrev) btns.push(`<button class="btn btn-xs btn-secondary" data-pg="${meta.page-1}">← Prev</button>`);
  const start = Math.max(1, meta.page - 2), end = Math.min(meta.pages, meta.page + 2);
  for (let p = start; p <= end; p++) btns.push(`<button class="btn btn-xs ${p===meta.page?'btn-primary':'btn-secondary'}" data-pg="${p}">${p}</button>`);
  if (meta.hasNext) btns.push(`<button class="btn btn-xs btn-secondary" data-pg="${meta.page+1}">Next →</button>`);
  wrap.innerHTML = btns.join('');
  wrap.querySelectorAll('[data-pg]').forEach(b => b.addEventListener('click', () => onPageFn(+b.dataset.pg)));
  const container = document.getElementById(containerId);
  if (container) container.appendChild(wrap);
}

/* ── Simulated async (Promise over sync localStorage ops) ─ */
function asyncOp(fn, delay = 180) {
  return new Promise((resolve, reject) => {
    setTimeout(() => { try { resolve(fn()); } catch(e) { reject(e); } }, delay);
  });
}
