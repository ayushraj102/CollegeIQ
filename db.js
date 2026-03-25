<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>CampusIQ — Recruiter Portal</title>
<script src="theme.js"></script>
<link rel="stylesheet" href="shared.css">
<link rel="stylesheet" href="theme.css">
</head>
<body>
<div id="toast-wrap"></div>
<div class="app-shell">
  <header class="topbar">
    <div class="tb-brand"><div class="tb-brand-icon">IQ</div>Campus<em style="color:var(--cyan);font-style:normal;font-family:var(--font-h)">IQ</em></div>
    <div class="tb-right">
      <span class="tb-badge badge-recruiter">Recruiter</span>
      <div class="tb-user"><div class="avatar av-sm" id="tbAvatar"></div><span id="tbName"></span></div>
      <button id="theme-toggle" onclick="toggleTheme()"></button>
      <button class="logout-btn" id="logoutBtn">Sign Out</button>
    </div>
  </header>
  <aside class="sidebar">
    <div class="sb-item active" data-page="discover">Discover Talent</div>
    <div class="sb-item" data-page="jobs">My Jobs</div>
  </aside>
  <main class="main-area" id="mainArea"></main>
</div>

<!-- PROFILE MODAL -->
<div class="modal-overlay" id="profileModal">
  <div class="modal-box" style="max-width: 650px">
    <div class="modal-hdr"><span class="modal-title" id="pmName">Student Profile</span><button class="modal-close" id="closePmBtn">✕</button></div>
    <div id="pmContent"></div>
  </div>
</div>

<script src="db.js"></script>
<script src="utils.js"></script>
<script src="auth.js"></script>
<script>
'use strict';
seedIfEmpty();
const session = Auth.guard('recruiter');
initTopbar(session);
document.getElementById('logoutBtn').addEventListener('click', () => Auth.logout());

const PAGES = { discover:renderDiscover, jobs:()=>{} };
function renderPage(p) { showLoading('mainArea'); setTimeout(()=>(PAGES[p]||renderDiscover)(), 80); }
setupNav(renderPage);

function renderDiscover() {
  const students = DB.getStudents();
  document.getElementById('mainArea').innerHTML = `
    <div class="page-hdr"><h2>Discover Talent</h2></div>
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem" id="studentGrid">
      ${students.map(st=>`
        <div class="card animate-in">
          <h4>${esc(st.name)}</h4>
          <p class="text-xs text-muted">${esc(st.dept)} · Year ${st.year}</p>
          <div class="divider"></div>
          <button class="btn btn-primary btn-sm w-full view-profile" data-id="${st.id}">View Full Profile</button>
        </div>
      `).join('')}
    </div>
  `;

  document.querySelectorAll('.view-profile').forEach(btn => {
    btn.onclick = () => showProfile(btn.dataset.id);
  });
}

function showProfile(sid) {
  const st = DB.getStudentById(sid);
  const skills = DB.getRawSkills(sid);
  const content = document.getElementById('pmContent');
  
  content.innerHTML = `
    <div style="margin-bottom: 1.5rem">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem">
        <label class="text-xs text-muted">Skill Map</label>
        <button class="btn btn-xs btn-ai" id="aiInterviewBtn">✨ Generate AI Interview Questions</button>
      </div>
      <div class="skill-tags">${skills.map(s=>`<span class="skill-tag">${esc(s)}</span>`).join('') || 'No verified skills'}</div>
      <div id="aiInterviewBox"></div>
    </div>
  `;
  
  document.getElementById('profileModal').classList.add('open');

  document.getElementById('aiInterviewBtn').onclick = async () => {
    const btn = document.getElementById('aiInterviewBtn');
    const box = document.getElementById('aiInterviewBox');
    btn.disabled = true;
    btn.textContent = '✨ Thinking...';
    box.innerHTML = `<div class="ai-response-box">Crafting technical questions for ${esc(st.name)}...</div>`;

    try {
      const prompt = `Candidate: ${st.name}. Skills: ${skills.join(', ')}. 
      Generate 5 challenging technical interview questions tailored to these specific skills. 
      Help the recruiter evaluate their real-world expertise.`;
      
      const questions = await callGemini(prompt, "You are an expert technical interviewer at a top tech company.");
      box.innerHTML = `<div class="ai-response-box">${questions}</div>`;
    } catch(e) {
      box.innerHTML = `<div class="ai-response-box" style="color:var(--red)">AI Interview Assistant unavailable.</div>`;
    } finally {
      btn.disabled = false;
      btn.textContent = '✨ Refresh Questions';
    }
  };
}

setupModal('profileModal', 'closePmBtn');
renderPage('discover');
</script>
</body>
</html>
