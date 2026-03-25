/**
 * CampusIQ — db.js  v4
 * ─────────────────────────────────────────────────────────
 * Central data service. ALL localStorage access goes here.
 * No portal ever touches localStorage directly.
 *
 * Exports: DB, seedIfEmpty (global, no module system needed)
 */
'use strict';

const CIQ_VERSION = 'v5';

/* ═══════════════════════════════════════════════════════
   PRIVATE: UUID + Store primitives
═══════════════════════════════════════════════════════ */
function _uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const _S = {
  get(k)    { try { return JSON.parse(localStorage.getItem('ciq_' + k)) ?? null; } catch { return null; } },
  set(k, v) { try { localStorage.setItem('ciq_' + k, JSON.stringify(v)); } catch(e) { console.error('Store.set', k, e); } },
  del(k)    { localStorage.removeItem('ciq_' + k); },
};

/* ═══════════════════════════════════════════════════════
   VERSION MIGRATION — runs immediately on load
═══════════════════════════════════════════════════════ */
(function _migrate() {
  if (localStorage.getItem('ciq_schema') !== CIQ_VERSION) {
    Object.keys(localStorage).filter(k => k.startsWith('ciq_')).forEach(k => localStorage.removeItem(k));
    localStorage.setItem('ciq_schema', CIQ_VERSION);
    console.info('%c[CampusIQ] Fresh schema v5 — data cleared', 'color:#38BDF8;font-weight:700');
  }
})();

/* ═══════════════════════════════════════════════════════
   VALIDATION HELPERS
═══════════════════════════════════════════════════════ */
const _V = {
  req(v, name) {
    const s = String(v || '').trim();
    if (!s) throw new Error(`${name} is required`);
    return s;
  },
  email(v) {
    const s = String(v || '').trim().toLowerCase();
    if (!s) throw new Error('Email is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new Error('Invalid email format');
    return s;
  },
  num(v, name, min = 0, max = 100) {
    const n = parseFloat(v);
    if (isNaN(n)) throw new Error(`${name} must be a number`);
    if (n < min || n > max) throw new Error(`${name} must be ${min}–${max}`);
    return n;
  },
  minLen(v, name, len = 6) {
    const s = String(v || '').trim();
    if (s.length < len) throw new Error(`${name} must be at least ${len} characters`);
    return s;
  },
};

/* ═══════════════════════════════════════════════════════
   DB — the single global object every portal uses
═══════════════════════════════════════════════════════ */
const DB = {

  /* ── Session ─────────────────────────────────────────── */
  getSession()   { return _S.get('session'); },
  setSession(s)  { _S.set('session', s); },
  clearSession() { _S.del('session'); },

  /* ── Users ───────────────────────────────────────────── */
  getUsers()         { return _S.get('users') || []; },
  getUserById(id)    { return this.getUsers().find(u => u.id === id) || null; },
  getUserByEmail(em) {
    if (!em) return null;
    return this.getUsers().find(u => u.email === em.toLowerCase().trim()) || null;
  },

  /**
   * Create a user + linked role profile atomically.
   * Throws on duplicate email, bad input, or missing role fields.
   */
  createUser(data) {
    const name     = _V.req(data.name,     'Name');
    const email    = _V.email(data.email);
    // Google OAuth passwords start with '_google_oauth_' — skip length check
    const rawPwd   = String(data.password || '');
    const password = rawPwd.startsWith('_google_oauth_') ? rawPwd : _V.minLen(data.password, 'Password', 6);
    const role     = _V.req(data.role, 'Role');

    if (!['student','teacher','recruiter','admin'].includes(role))
      throw new Error('Invalid role. Must be student/teacher/recruiter/admin.');
    if (this.getUserByEmail(email))
      throw new Error(`Email "${email}" is already registered.`);

    const userId = _uuid();
    const now    = new Date().toISOString();
    const user   = { id: userId, name, email, password, role, createdAt: now };

    const users = this.getUsers();
    users.push(user);
    _S.set('users', users);

    let profile = null;

    if (role === 'student') {
      const dept   = _V.req(data.dept,   'Department');
      const year   = _V.num(data.year,   'Year', 1, 6);
      const rollNo = _V.req(data.rollNo, 'Roll Number');
      const gpa    = data.gpa ? _V.num(data.gpa, 'GPA', 0, 10) : 0;
      profile = {
        id: _uuid(), userId, name, dept,
        year:     Math.round(year),
        section:  String(data.section || 'A').trim(),
        rollNo,
        gpa:      parseFloat(gpa.toFixed(2)),
        phone:    data.phone    || '',
        linkedIn: data.linkedIn || '',
        githubUrl:data.githubUrl|| '',
        createdAt: now,
      };
      const list = this.getStudents(); list.push(profile); _S.set('students', list);
    }
    else if (role === 'teacher') {
      const dept     = _V.req(data.dept, 'Department');
      const subjects = String(data.subjects || '').split(',').map(s => s.trim()).filter(Boolean);
      profile = { id: _uuid(), userId, name, dept, subjects, researchCount: 0, createdAt: now };
      const list = this.getTeachers(); list.push(profile); _S.set('teachers', list);
    }
    else if (role === 'recruiter') {
      profile = { id: _uuid(), userId, name, company: data.company || '', createdAt: now };
      const list = this.getRecruiters(); list.push(profile); _S.set('recruiters', list);
    }

    return { user, profile };
  },

  /** Hard-delete user + all cascade records */
  deleteUser(userId) {
    const user = this.getUserById(userId);
    if (!user) throw new Error('User not found');

    _S.set('users', this.getUsers().filter(u => u.id !== userId));

    if (user.role === 'student') {
      const st = this.getStudentByUserId(userId);
      if (st) {
        _S.set('students',     this.getStudents().filter(s => s.userId !== userId));
        _S.set('achievements', this.getAchievements().filter(a => a.studentId !== st.id));
        _S.set('academic',     this.getAcademic().filter(r => r.studentId !== st.id));
      }
    } else if (user.role === 'teacher') {
      _S.set('teachers', this.getTeachers().filter(t => t.userId !== userId));
    } else if (user.role === 'recruiter') {
      _S.set('recruiters', this.getRecruiters().filter(r => r.userId !== userId));
      _S.set('jobs', this.getJobs().filter(j => j.recruiterId !== userId));
    }
  },

  /* ── Students ────────────────────────────────────────── */
  getStudents()           { return _S.get('students') || []; },
  getStudentById(id)      { return this.getStudents().find(s => s.id === id)     || null; },
  getStudentByUserId(uid) { return this.getStudents().find(s => s.userId === uid) || null; },

  updateStudent(id, changes) {
    const list = this.getStudents();
    const idx  = list.findIndex(s => s.id === id);
    if (idx < 0) throw new Error('Student not found');
    if (changes.gpa  !== undefined) changes.gpa  = _V.num(changes.gpa,  'GPA',  0, 10);
    if (changes.year !== undefined) changes.year = Math.round(_V.num(changes.year, 'Year', 1, 6));
    list[idx] = { ...list[idx], ...changes, updatedAt: new Date().toISOString() };
    _S.set('students', list);
    return list[idx];
  },

  /* ── Teachers ────────────────────────────────────────── */
  getTeachers()           { return _S.get('teachers') || []; },
  getTeacherById(id)      { return this.getTeachers().find(t => t.id === id)     || null; },
  getTeacherByUserId(uid) { return this.getTeachers().find(t => t.userId === uid) || null; },

  /* ── Recruiters ──────────────────────────────────────── */
  getRecruiters()           { return _S.get('recruiters') || []; },
  getRecruiterByUserId(uid) { return this.getRecruiters().find(r => r.userId === uid) || null; },

  /* ── Achievements ────────────────────────────────────── */
  getAchievements()            { return _S.get('achievements') || []; },
  getAchievementsByStudent(sid){ return this.getAchievements().filter(a => a.studentId === sid); },
  getAchievementById(id)       { return this.getAchievements().find(a => a.id === id) || null; },

  addAchievement(data) {
    const title = _V.req(data.title, 'Title');
    if (!data.studentId) throw new Error('studentId required');
    // Duplicate check
    const existing = this.getAchievements().find(a =>
      a.studentId === data.studentId &&
      a.title.trim().toLowerCase() === title.toLowerCase() &&
      a.status !== 'rejected'
    );
    if (existing) throw new Error('You already submitted an achievement with this title.');

    const ach = {
      id:         _uuid(),
      studentId:  data.studentId,
      ownerId:    data.ownerId || null,
      type:       data.type   || 'other',
      title,
      org:        String(data.org   || '').trim(),
      skills:     Array.isArray(data.skills) ? data.skills.filter(Boolean) : [],
      date:       data.date   || '',
      desc:       String(data.desc  || '').trim(),
      status:     'pending',
      verifiedBy: null,
      verifiedAt: null,
      createdAt:  new Date().toISOString(),
    };
    const list = this.getAchievements();
    list.push(ach);
    _S.set('achievements', list);
    return ach;
  },

  updateAchievement(id, changes) {
    const list = this.getAchievements();
    const idx  = list.findIndex(a => a.id === id);
    if (idx < 0) throw new Error('Achievement not found');
    list[idx] = { ...list[idx], ...changes, updatedAt: new Date().toISOString() };
    _S.set('achievements', list);
    return list[idx];
  },

  verifyAchievement(id, teacherId, approve) {
    const status = approve ? 'verified' : 'rejected';
    return this.updateAchievement(id, {
      status,
      verifiedBy: teacherId,
      verifiedAt: new Date().toISOString(),
    });
  },

  deleteAchievement(id) {
    const ach = this.getAchievementById(id);
    if (!ach) throw new Error('Achievement not found');
    if (ach.status === 'verified') throw new Error('Cannot delete a verified achievement');
    _S.set('achievements', this.getAchievements().filter(a => a.id !== id));
  },

  analyzeFakeRisk(ach) {
    const flags = [];
    const title = (ach.title || '').toLowerCase().trim();
    if (['fake','test','dummy','sample','lorem'].some(w => title.includes(w)))
      flags.push('Suspicious keywords in title');
    if (ach.date && new Date(ach.date) > new Date())
      flags.push('Future date — event not yet occurred');
    if (!ach.org || ['na','none','n/a','-','unknown'].includes((ach.org || '').toLowerCase().trim()))
      flags.push('No valid organisation specified');
    const dup = this.getAchievements().find(a =>
      a.id !== ach.id && a.studentId === ach.studentId && a.status !== 'rejected' &&
      (a.title || '').toLowerCase().trim() === title
    );
    if (dup) flags.push('Duplicate title for this student');
    return { risk: flags.length >= 2 ? 'high' : flags.length === 1 ? 'medium' : 'low', flags };
  },

  /* ── Academic Records ────────────────────────────────── */
  getAcademic()                  { return _S.get('academic') || []; },
  getStudentAcademic(studentId)  { return this.getAcademic().filter(r => r.studentId === studentId); },
  getAcademicById(id)            { return this.getAcademic().find(r => r.id === id) || null; },

  addAcademic(data) {
    const subject = _V.req(data.subject, 'Subject');
    if (!data.studentId) throw new Error('studentId required');
    const marks      = _V.num(data.marks,        'Marks',      0, 100);
    const attendance = _V.num(data.attendance,    'Attendance', 0, 100);
    const quiz       = _V.num(data.quiz       || 0, 'Quiz',    0, 100);
    const assignment = _V.num(data.assignment || 0, 'Assignment', 0, 100);
    // Duplicate: same student + subject + semester
    const dup = this.getAcademic().find(r =>
      r.studentId === data.studentId &&
      r.subject.trim().toLowerCase()  === subject.toLowerCase() &&
      r.semester === (data.semester || '')
    );
    if (dup) throw new Error(`Record for "${subject}" in "${data.semester || 'N/A'}" already exists. Edit instead.`);

    const rec = {
      id: _uuid(),
      studentId:  data.studentId,
      teacherId:  data.teacherId || null,
      subject,
      semester:   String(data.semester || '').trim(),
      marks, quiz, assignment, attendance,
      feedback:   String(data.feedback || '').trim(),
      createdAt:  new Date().toISOString(),
    };
    const list = this.getAcademic();
    list.push(rec);
    _S.set('academic', list);
    return rec;
  },

  updateAcademic(id, changes) {
    const list = this.getAcademic();
    const idx  = list.findIndex(r => r.id === id);
    if (idx < 0) throw new Error('Academic record not found');
    if (changes.marks      !== undefined) changes.marks      = _V.num(changes.marks,      'Marks',      0, 100);
    if (changes.attendance !== undefined) changes.attendance = _V.num(changes.attendance, 'Attendance', 0, 100);
    if (changes.quiz       !== undefined) changes.quiz       = _V.num(changes.quiz,       'Quiz',       0, 100);
    if (changes.assignment !== undefined) changes.assignment = _V.num(changes.assignment, 'Assignment', 0, 100);
    list[idx] = { ...list[idx], ...changes, updatedAt: new Date().toISOString() };
    _S.set('academic', list);
    return list[idx];
  },

  deleteAcademic(id) { _S.set('academic', this.getAcademic().filter(r => r.id !== id)); },

  /* ── Research ────────────────────────────────────────── */
  getResearch()            { return _S.get('research') || []; },
  getResearchByTeacher(tid){ return this.getResearch().filter(r => r.teacherId === tid); },
  getResearchById(id)      { return this.getResearch().find(r => r.id === id) || null; },

  addResearch(data) {
    const title = _V.req(data.title, 'Title');
    const pub = {
      id:         _uuid(),
      teacherId:  data.teacherId || null,
      title,
      journal:    String(data.journal  || '').trim(),
      year:       parseInt(data.year)  || new Date().getFullYear(),
      doi:        String(data.doi      || '').trim(),
      status:     data.status          || 'under_review',
      coAuthors:  Array.isArray(data.coAuthors) ? data.coAuthors : String(data.coAuthors || '').split(',').map(s => s.trim()).filter(Boolean),
      citations:  parseInt(data.citations) || 0,
      abstract:   String(data.abstract || '').trim(),
      createdAt:  new Date().toISOString(),
    };
    const list = this.getResearch(); list.push(pub); _S.set('research', list);
    return pub;
  },

  updateResearch(id, changes) {
    const list = this.getResearch();
    const idx  = list.findIndex(r => r.id === id);
    if (idx < 0) throw new Error('Research record not found');
    list[idx] = { ...list[idx], ...changes, updatedAt: new Date().toISOString() };
    _S.set('research', list);
    return list[idx];
  },

  deleteResearch(id) { _S.set('research', this.getResearch().filter(r => r.id !== id)); },

  /* ── Notifications ───────────────────────────────────── */
  getNotifications(userId) {
    return (_S.get('notifs') || []).filter(n => n.userId === userId);
  },

  addNotification(data) {
    if (!data.userId) return;
    const list  = _S.get('notifs') || [];
    const notif = { id: _uuid(), userId: data.userId, type: data.type || 'info', text: data.text || '', read: false, createdAt: new Date().toISOString() };
    list.unshift(notif);
    // Keep max 60 per user
    const filtered = list.filter(n => n.userId !== data.userId).concat(
      list.filter(n => n.userId === data.userId).slice(0, 60)
    );
    _S.set('notifs', filtered);
  },

  markNotifsRead(userId) {
    const list = _S.get('notifs') || [];
    list.forEach(n => { if (n.userId === userId) n.read = true; });
    _S.set('notifs', list);
  },

  /* ── Jobs ────────────────────────────────────────────── */
  getJobs()                { return _S.get('jobs') || []; },
  getJobsByRecruiter(uid)  { return this.getJobs().filter(j => j.recruiterId === uid); },
  getJobById(id)           { return this.getJobs().find(j => j.id === id) || null; },

  addJob(data) {
    const role    = _V.req(data.role,    'Job title');
    const company = _V.req(data.company, 'Company');
    const job = {
      id:          _uuid(),
      recruiterId: data.recruiterId,
      company, role,
      type:        data.type      || 'fulltime',
      ctc:         String(data.ctc      || '').trim(),
      location:    String(data.location || '').trim(),
      deadline:    data.deadline  || '',
      skills:      Array.isArray(data.skills) ? data.skills.filter(Boolean) : String(data.skills || '').split(',').map(s => s.trim()).filter(Boolean),
      desc:        String(data.desc     || '').trim(),
      status:      'open',
      createdAt:   new Date().toISOString(),
    };
    const list = this.getJobs(); list.push(job); _S.set('jobs', list);
    return job;
  },

  closeJob(id) {
    const list = this.getJobs();
    const idx  = list.findIndex(j => j.id === id);
    if (idx >= 0) { list[idx].status = 'closed'; _S.set('jobs', list); }
  },

  deleteJob(id) { _S.set('jobs', this.getJobs().filter(j => j.id !== id)); },

  /* ── Saved Profiles ──────────────────────────────────── */
  getSaved(recruiterId) {
    return (_S.get('saved') || []).filter(s => s.recruiterId === recruiterId);
  },
  isSaved(recruiterId, studentId) {
    return (_S.get('saved') || []).some(s => s.recruiterId === recruiterId && s.studentId === studentId);
  },
  toggleSaved(recruiterId, studentId) {
    const list = _S.get('saved') || [];
    const idx  = list.findIndex(s => s.recruiterId === recruiterId && s.studentId === studentId);
    if (idx >= 0) { list.splice(idx, 1); _S.set('saved', list); return false; }
    list.push({ recruiterId, studentId, savedAt: new Date().toISOString() });
    _S.set('saved', list);
    return true;
  },

  /* ═══════════════════════════════════════════════════════
     AI ENGINE
  ═══════════════════════════════════════════════════════ */
  SKILL_MAP: {
    'React':           ['React.js','Frontend Dev','JSX','State Management','Hooks','JavaScript'],
    'Machine Learning':['ML Engineering','Python','TensorFlow','Model Training','Data Science','AI'],
    'Python':          ['Python','Scripting','Data Analysis','Automation','Flask','Pandas'],
    'Java':            ['Java','OOP','Spring Boot','Backend Dev','Maven'],
    'DSA':             ['Algorithms','Data Structures','Problem Solving','Competitive Coding','LeetCode'],
    'Cloud':           ['AWS','DevOps','Docker','Microservices','CI/CD','GCP','Azure'],
    'Flutter':         ['Flutter','Dart','Mobile Dev','Cross-Platform','Android','iOS'],
    'NLP':             ['NLP','BERT','Text Mining','Deep Learning','Transformers','LLM'],
    'IoT':             ['IoT','Embedded Systems','Arduino','Sensor Fusion','MQTT'],
    'Blockchain':      ['Blockchain','Solidity','Web3','Smart Contracts','DeFi','Ethereum'],
    'Cybersecurity':   ['Security','Ethical Hacking','Cryptography','Networking','Pentesting','CTF'],
    'UI/UX':           ['Figma','Design Systems','User Research','Prototyping','Accessibility'],
    'Node.js':         ['Node.js','Express','REST API','Backend','MongoDB','API Design'],
    'Data Science':    ['Pandas','NumPy','Visualization','Statistics','Jupyter','R'],
    'Research':        ['Academic Writing','Literature Review','Methodology','Publication','LaTeX'],
    'AI':              ['Artificial Intelligence','Neural Networks','Computer Vision','Deep Learning'],
    'SQL':             ['SQL','Database Design','PostgreSQL','MySQL','Query Optimization'],
    'C++':             ['C++','Systems Programming','STL','Competitive Programming'],
    'Android':         ['Android Dev','Kotlin','Material Design','Jetpack Compose'],
    'Web':             ['HTML/CSS','JavaScript','Responsive Design','Web Performance'],
  },

  getRawSkills(studentId) {
    const s = new Set();
    this.getAchievements()
      .filter(a => a.studentId === studentId && a.status === 'verified')
      .forEach(a => (a.skills || []).forEach(sk => s.add(sk)));
    return [...s];
  },

  getMappedSkills(studentId) {
    const raw = this.getRawSkills(studentId);
    const s   = new Set();
    raw.forEach(sk => (this.SKILL_MAP[sk] || [sk]).forEach(m => s.add(m)));
    return [...s];
  },

  /**
   * Readiness Score 0–100
   * Base 20 + Achievements 25 + Academics 25 + Attendance 15 + Skill Diversity 15
   */
  calcReadiness(studentId) {
    const verified  = this.getAchievements().filter(a => a.studentId === studentId && a.status === 'verified');
    const acRecs    = this.getStudentAcademic(studentId);
    const rawSkills = this.getRawSkills(studentId);

    let score = 20;
    score += Math.min(verified.length * 5, 25);
    if (acRecs.length) {
      const avgM = acRecs.reduce((s,r) => s+(r.marks||0),0)      / acRecs.length;
      const avgA = acRecs.reduce((s,r) => s+(r.attendance||0),0) / acRecs.length;
      score += Math.round((avgM / 100) * 25);
      score += Math.round((avgA / 100) * 15);
    }
    score += Math.min(rawSkills.length * 2, 15);
    return Math.min(Math.round(score), 100);
  },

  getReadinessBreakdown(studentId) {
    const verified  = this.getAchievements().filter(a => a.studentId === studentId && a.status === 'verified');
    const acRecs    = this.getStudentAcademic(studentId);
    const rawSkills = this.getRawSkills(studentId);
    const achS      = Math.min(verified.length * 5, 25);
    let acS = 0, atS = 0;
    if (acRecs.length) {
      acS = Math.round((acRecs.reduce((s,r)=>s+(r.marks||0),0)/acRecs.length/100)*25);
      atS = Math.round((acRecs.reduce((s,r)=>s+(r.attendance||0),0)/acRecs.length/100)*15);
    }
    const divS = Math.min(rawSkills.length * 2, 15);
    return { total: Math.min(20+achS+acS+atS+divS, 100), base:20, achievements:achS, academics:acS, attendance:atS, skills:divS };
  },

  getWeakAreas(studentId) {
    return this.getStudentAcademic(studentId).flatMap(r => {
      const issues = [];
      if ((r.marks||0)      < 60) issues.push({ subject:r.subject, type:'marks',      value:r.marks,      threshold:60, severity:r.marks<50?'high':'medium' });
      if ((r.attendance||0) < 75) issues.push({ subject:r.subject, type:'attendance', value:r.attendance, threshold:75, severity:r.attendance<60?'high':'medium' });
      return issues;
    });
  },

  getRiskLevel(studentId) {
    const w    = this.getWeakAreas(studentId);
    const high = w.filter(x => x.severity === 'high').length;
    if (high >= 2 || w.length >= 4) return 'high';
    if (w.length >= 2)              return 'medium';
    return 'low';
  },

  /**
   * Skill-match score 0–100 for recruiter AI ranking.
   * Checks raw skills + mapped synonyms.
   */
  skillMatchScore(studentId, requiredSkills) {
    if (!requiredSkills || !requiredSkills.length) return 50;
    const raw    = this.getRawSkills(studentId).map(s => s.toLowerCase());
    const mapped = this.getMappedSkills(studentId).map(s => s.toLowerCase());
    let matched  = 0;
    requiredSkills.forEach(req => {
      const r = req.toLowerCase();
      if (raw.includes(r) || mapped.includes(r)) { matched++; return; }
      // Partial via SKILL_MAP keys
      if (Object.entries(this.SKILL_MAP).some(([k,v]) =>
        k.toLowerCase() === r && v.some(m => raw.includes(m.toLowerCase()))
      )) matched++;
    });
    return Math.round((matched / requiredSkills.length) * 100);
  },

  /**
   * Rank students by combined readiness + skill match.
   * Returns sorted array with added fields: readiness, matchScore, combinedScore.
   */
  rankStudents(requiredSkills = []) {
    const achievs = this.getAchievements();
    const acRecs  = this.getAcademic();
    return this.getStudents()
      .map(st => {
        const readiness  = this.calcReadiness(st.id);
        const matchScore = this.skillMatchScore(st.id, requiredSkills);
        // Weight: 60% readiness, 40% skill match (if skills provided)
        const combined   = requiredSkills.length
          ? Math.round(readiness * 0.6 + matchScore * 0.4)
          : readiness;
        return { ...st, readiness, matchScore, combinedScore: combined };
      })
      .sort((a, b) => b.combinedScore - a.combinedScore);
  },

  generateResume(studentId) {
    const st = this.getStudentById(studentId);
    if (!st) return null;
    const user    = this.getUserById(st.userId);
    const achievs = this.getAchievements().filter(a => a.studentId === studentId && a.status === 'verified');
    const acRecs  = this.getStudentAcademic(studentId);
    return {
      name: st.name, email: user?.email||'', phone: st.phone||'',
      dept: st.dept, year: st.year, rollNo: st.rollNo, gpa: st.gpa,
      linkedIn: st.linkedIn||'', githubUrl: st.githubUrl||'',
      readiness:    this.calcReadiness(studentId),
      rawSkills:    this.getRawSkills(studentId),
      mappedSkills: this.getMappedSkills(studentId).slice(0, 16),
      achievements: achievs.map(a => ({ title:a.title, org:a.org, date:a.date, type:a.type, skills:a.skills, desc:a.desc })),
      academics:    acRecs.map(r => ({ subject:r.subject, marks:r.marks, attendance:r.attendance, semester:r.semester })),
      generatedAt:  new Date().toISOString(),
    };
  },

  /* ── Pagination ──────────────────────────────────────── */
  paginate(list, page = 1, perPage = 10) {
    const total = list.length;
    const pages = Math.ceil(total / perPage) || 1;
    const p     = Math.max(1, Math.min(page, pages));
    return {
      items:   list.slice((p-1)*perPage, p*perPage),
      total, page: p, pages, perPage,
      hasNext: p < pages,
      hasPrev: p > 1,
    };
  },
};

/* ═══════════════════════════════════════════════════════
   SEED DATA — realistic, runs only on fresh install
═══════════════════════════════════════════════════════ */
function seedIfEmpty() {
  if (DB.getUsers().length > 0) return;

  _S.set('users', [
    { id:'u-admin', name:'Dr. Admin Kumar',         email:'admin@campusiq.edu',    password:'admin123', role:'admin',     createdAt:new Date().toISOString() },
    { id:'u-t1',    name:'Prof. Anjali Sharma',      email:'teacher1@campusiq.edu', password:'teach123', role:'teacher',   createdAt:new Date().toISOString() },
    { id:'u-t2',    name:'Prof. Ravi Verma',         email:'teacher2@campusiq.edu', password:'teach123', role:'teacher',   createdAt:new Date().toISOString() },
    { id:'u-s1',    name:'Arjun Rao',                email:'student1@campusiq.edu', password:'stud123',  role:'student',   createdAt:new Date().toISOString() },
    { id:'u-s2',    name:'Priya Sharma',             email:'student2@campusiq.edu', password:'stud123',  role:'student',   createdAt:new Date().toISOString() },
    { id:'u-s3',    name:'Karan Mehta',              email:'student3@campusiq.edu', password:'stud123',  role:'student',   createdAt:new Date().toISOString() },
    { id:'u-s4',    name:'Sara Nair',                email:'student4@campusiq.edu', password:'stud123',  role:'student',   createdAt:new Date().toISOString() },
    { id:'u-s5',    name:'Dev Patel',                email:'student5@campusiq.edu', password:'stud123',  role:'student',   createdAt:new Date().toISOString() },
    { id:'u-s6',    name:'Riya Singh',               email:'student6@campusiq.edu', password:'stud123',  role:'student',   createdAt:new Date().toISOString() },
    { id:'u-s7',    name:'Aditya Kumar',             email:'student7@campusiq.edu', password:'stud123',  role:'student',   createdAt:new Date().toISOString() },
    { id:'u-s8',    name:'Meera Joshi',              email:'student8@campusiq.edu', password:'stud123',  role:'student',   createdAt:new Date().toISOString() },
    { id:'u-rec1',  name:'Nisha Patel',              email:'recruiter@techcorp.com',password:'rec123',   role:'recruiter', createdAt:new Date().toISOString() },
  ]);

  _S.set('teachers', [
    { id:'t1', userId:'u-t1', name:'Prof. Anjali Sharma', dept:'Computer Science', subjects:['Data Structures','Machine Learning','Python','AI'],    researchCount:3, createdAt:new Date().toISOString() },
    { id:'t2', userId:'u-t2', name:'Prof. Ravi Verma',    dept:'Electronics',      subjects:['Digital Circuits','IoT','Embedded Systems','VLSI'],   researchCount:2, createdAt:new Date().toISOString() },
  ]);

  _S.set('students', [
    { id:'s1', userId:'u-s1', name:'Arjun Rao',    dept:'CSE', year:3, section:'A', rollNo:'CS21001', gpa:8.9, phone:'9876543210', linkedIn:'linkedin.com/in/arjunrao',    githubUrl:'github.com/arjunrao',    createdAt:new Date().toISOString() },
    { id:'s2', userId:'u-s2', name:'Priya Sharma', dept:'ECE', year:4, section:'B', rollNo:'EC20002', gpa:9.2, phone:'9876543211', linkedIn:'linkedin.com/in/priyasharma', githubUrl:'github.com/priyasharma', createdAt:new Date().toISOString() },
    { id:'s3', userId:'u-s3', name:'Karan Mehta',  dept:'IT',  year:2, section:'A', rollNo:'IT22003', gpa:7.1, phone:'9876543212', linkedIn:'',                            githubUrl:'github.com/karanmehta',  createdAt:new Date().toISOString() },
    { id:'s4', userId:'u-s4', name:'Sara Nair',    dept:'DS',  year:3, section:'C', rollNo:'DS21004', gpa:8.6, phone:'9876543213', linkedIn:'linkedin.com/in/saranair',    githubUrl:'github.com/saranair',    createdAt:new Date().toISOString() },
    { id:'s5', userId:'u-s5', name:'Dev Patel',    dept:'CSE', year:4, section:'B', rollNo:'CS20005', gpa:9.0, phone:'9876543214', linkedIn:'linkedin.com/in/devpatel',    githubUrl:'github.com/devpatel',    createdAt:new Date().toISOString() },
    { id:'s6', userId:'u-s6', name:'Riya Singh',   dept:'DS',  year:1, section:'A', rollNo:'DS23006', gpa:7.8, phone:'9876543215', linkedIn:'',                            githubUrl:'github.com/riyasingh',   createdAt:new Date().toISOString() },
    { id:'s7', userId:'u-s7', name:'Aditya Kumar', dept:'CSE', year:3, section:'C', rollNo:'CS21007', gpa:8.2, phone:'9876543216', linkedIn:'linkedin.com/in/adityakumar', githubUrl:'github.com/adityakumar', createdAt:new Date().toISOString() },
    { id:'s8', userId:'u-s8', name:'Meera Joshi',  dept:'IT',  year:4, section:'B', rollNo:'IT20008', gpa:9.4, phone:'9876543217', linkedIn:'linkedin.com/in/meerajoshi',  githubUrl:'github.com/meerajoshi',  createdAt:new Date().toISOString() },
  ]);

  _S.set('recruiters', [
    { id:'rec1', userId:'u-rec1', name:'Nisha Patel', company:'TechCorp', createdAt:new Date().toISOString() },
  ]);

  _S.set('achievements', [
    { id:'a1',  studentId:'s1', ownerId:'u-s1', type:'hackathon',    title:'HackIndia 2024 — 1st Place',            org:'HackIndia',      skills:['React','Machine Learning'],     date:'2024-03-15', status:'verified',  verifiedBy:'t1', verifiedAt:'2024-03-20T10:00:00Z', desc:'AI-powered health diagnosis tool.',              createdAt:new Date().toISOString() },
    { id:'a2',  studentId:'s1', ownerId:'u-s1', type:'certification',title:'AWS Solutions Architect Associate',      org:'Amazon',         skills:['Cloud'],                        date:'2024-01-10', status:'verified',  verifiedBy:'t1', verifiedAt:'2024-01-15T10:00:00Z', desc:'Passed with 92% score.',                         createdAt:new Date().toISOString() },
    { id:'a3',  studentId:'s1', ownerId:'u-s1', type:'project',      title:'Open Source ML Library — 200 Stars',    org:'GitHub',         skills:['Python','Machine Learning'],    date:'2024-05-20', status:'verified',  verifiedBy:'t1', verifiedAt:'2024-05-25T10:00:00Z', desc:'ML utility library.',                            createdAt:new Date().toISOString() },
    { id:'a4',  studentId:'s1', ownerId:'u-s1', type:'competition',  title:'Google Kick Start — Top 10%',           org:'Google',         skills:['DSA','Python'],                 date:'2024-02-10', status:'pending',   verifiedBy:null, verifiedAt:null,                   desc:'Ranked globally top 10%.',                       createdAt:new Date().toISOString() },
    { id:'a5',  studentId:'s2', ownerId:'u-s2', type:'research',     title:'IoT Based Smart Agriculture',           org:'IEEE',           skills:['IoT','Python'],                 date:'2024-04-20', status:'verified',  verifiedBy:'t2', verifiedAt:'2024-04-25T10:00:00Z', desc:'Published in IEEE IoT Journal.',                  createdAt:new Date().toISOString() },
    { id:'a6',  studentId:'s2', ownerId:'u-s2', type:'certification',title:'Google Cloud Professional DE',          org:'Google',         skills:['Cloud','Python'],               date:'2024-03-01', status:'verified',  verifiedBy:'t1', verifiedAt:'2024-03-06T10:00:00Z', desc:'Professional Data Engineer cert.',               createdAt:new Date().toISOString() },
    { id:'a7',  studentId:'s2', ownerId:'u-s2', type:'hackathon',    title:'Smart India Hackathon — Winner',        org:'Govt. of India', skills:['IoT','Machine Learning'],       date:'2024-09-10', status:'verified',  verifiedBy:'t2', verifiedAt:'2024-09-15T10:00:00Z', desc:'National level winner.',                          createdAt:new Date().toISOString() },
    { id:'a8',  studentId:'s2', ownerId:'u-s2', type:'internship',   title:'Research Intern — IIT Bombay',          org:'IIT Bombay',     skills:['Research','Python'],            date:'2024-06-01', status:'verified',  verifiedBy:'t1', verifiedAt:'2024-06-06T10:00:00Z', desc:'6-month ML research internship.',                createdAt:new Date().toISOString() },
    { id:'a9',  studentId:'s3', ownerId:'u-s3', type:'competition',  title:'LeetCode Knight Badge',                 org:'LeetCode',       skills:['DSA','Java'],                   date:'2024-02-01', status:'pending',   verifiedBy:null, verifiedAt:null,                   desc:'300+ problems solved.',                          createdAt:new Date().toISOString() },
    { id:'a10', studentId:'s3', ownerId:'u-s3', type:'project',      title:'College Event Management System',       org:'IILM College',   skills:['Web','Node.js'],                date:'2024-01-20', status:'verified',  verifiedBy:'t1', verifiedAt:'2024-01-25T10:00:00Z', desc:'Full-stack event platform.',                     createdAt:new Date().toISOString() },
    { id:'a11', studentId:'s4', ownerId:'u-s4', type:'hackathon',    title:'Kaggle Silver Medal — NLP 2024',        org:'Kaggle',         skills:['Machine Learning','Python'],    date:'2024-05-10', status:'verified',  verifiedBy:'t1', verifiedAt:'2024-05-15T10:00:00Z', desc:'Top 3% in NLP competition.',                     createdAt:new Date().toISOString() },
    { id:'a12', studentId:'s4', ownerId:'u-s4', type:'certification',title:'TensorFlow Developer Certificate',      org:'Google',         skills:['Machine Learning','AI'],        date:'2024-03-22', status:'verified',  verifiedBy:'t1', verifiedAt:'2024-03-27T10:00:00Z', desc:'TensorFlow professional exam.',                   createdAt:new Date().toISOString() },
    { id:'a13', studentId:'s4', ownerId:'u-s4', type:'research',     title:'Explainable AI for Healthcare',         org:'Elsevier',       skills:['AI','Research'],                date:'2024-07-15', status:'verified',  verifiedBy:'t1', verifiedAt:'2024-07-20T10:00:00Z', desc:'Co-authored XAI paper.',                         createdAt:new Date().toISOString() },
    { id:'a14', studentId:'s4', ownerId:'u-s4', type:'internship',   title:'Data Science Intern — Flipkart',        org:'Flipkart',       skills:['Data Science','Python'],        date:'2024-05-01', status:'verified',  verifiedBy:'t1', verifiedAt:'2024-05-06T10:00:00Z', desc:'Recommendation systems work.',                   createdAt:new Date().toISOString() },
    { id:'a15', studentId:'s5', ownerId:'u-s5', type:'certification',title:'Ethereum Developer Certification',      org:'ConsenSys',      skills:['Blockchain'],                   date:'2024-02-15', status:'verified',  verifiedBy:'t1', verifiedAt:'2024-02-20T10:00:00Z', desc:'Certified Solidity developer.',                  createdAt:new Date().toISOString() },
    { id:'a16', studentId:'s5', ownerId:'u-s5', type:'hackathon',    title:'ETHIndia 2023 — 2nd Place',             org:'ETHIndia',       skills:['Blockchain','Web'],             date:'2023-12-08', status:'verified',  verifiedBy:'t1', verifiedAt:'2023-12-13T10:00:00Z', desc:'DeFi lending protocol.',                         createdAt:new Date().toISOString() },
    { id:'a17', studentId:'s5', ownerId:'u-s5', type:'project',      title:'DeFi Yield Aggregator Protocol',        org:'GitHub',         skills:['Blockchain','Node.js'],         date:'2024-04-10', status:'verified',  verifiedBy:'t1', verifiedAt:'2024-04-15T10:00:00Z', desc:'Open source DeFi project.',                      createdAt:new Date().toISOString() },
    { id:'a18', studentId:'s5', ownerId:'u-s5', type:'internship',   title:'Smart Contract Auditor — CoinDCX',     org:'CoinDCX',        skills:['Blockchain','Cybersecurity'],   date:'2024-06-15', status:'pending',   verifiedBy:null, verifiedAt:null,                   desc:'Security audit internship.',                     createdAt:new Date().toISOString() },
    { id:'a19', studentId:'s6', ownerId:'u-s6', type:'project',      title:'Personal Portfolio Website',            org:'Self',           skills:['Web','UI/UX'],                  date:'2024-08-01', status:'verified',  verifiedBy:'t1', verifiedAt:'2024-08-06T10:00:00Z', desc:'Responsive portfolio site.',                     createdAt:new Date().toISOString() },
    { id:'a20', studentId:'s7', ownerId:'u-s7', type:'certification',title:'CEH — Certified Ethical Hacker',        org:'EC-Council',     skills:['Cybersecurity'],                date:'2024-04-05', status:'verified',  verifiedBy:'t1', verifiedAt:'2024-04-10T10:00:00Z', desc:'CEH with distinction.',                          createdAt:new Date().toISOString() },
    { id:'a21', studentId:'s7', ownerId:'u-s7', type:'competition',  title:'CTF Champion — NIT Hackfest',           org:'NIT Warangal',   skills:['Cybersecurity','DSA'],          date:'2024-03-18', status:'verified',  verifiedBy:'t2', verifiedAt:'2024-03-23T10:00:00Z', desc:'National CTF winner.',                           createdAt:new Date().toISOString() },
    { id:'a22', studentId:'s7', ownerId:'u-s7', type:'project',      title:'ML-based Intrusion Detection System',   org:'GitHub',         skills:['Cybersecurity','Machine Learning'],date:'2024-06-01',status:'verified', verifiedBy:'t1', verifiedAt:'2024-06-06T10:00:00Z', desc:'97% accuracy IDS.',                              createdAt:new Date().toISOString() },
    { id:'a23', studentId:'s8', ownerId:'u-s8', type:'internship',   title:'Flutter Dev Intern — Zomato',           org:'Zomato',         skills:['Flutter','UI/UX'],              date:'2024-03-10', status:'verified',  verifiedBy:'t1', verifiedAt:'2024-03-15T10:00:00Z', desc:'1M+ user app features.',                         createdAt:new Date().toISOString() },
    { id:'a24', studentId:'s8', ownerId:'u-s8', type:'certification',title:'Google Flutter Certified Developer',    org:'Google',         skills:['Flutter','Android'],            date:'2024-02-28', status:'verified',  verifiedBy:'t1', verifiedAt:'2024-03-04T10:00:00Z', desc:'Official Flutter certification.',                 createdAt:new Date().toISOString() },
    { id:'a25', studentId:'s8', ownerId:'u-s8', type:'hackathon',    title:'AppNation 2024 — Best UX Award',        org:'AppNation',      skills:['Flutter','UI/UX'],              date:'2024-05-25', status:'verified',  verifiedBy:'t2', verifiedAt:'2024-05-30T10:00:00Z', desc:'Best UX, national app competition.',              createdAt:new Date().toISOString() },
    { id:'a26', studentId:'s8', ownerId:'u-s8', type:'project',      title:'CampusConnect App — 5K Downloads',      org:'PlayStore',      skills:['Flutter','Node.js'],            date:'2024-07-01', status:'verified',  verifiedBy:'t1', verifiedAt:'2024-07-06T10:00:00Z', desc:'5000+ downloads campus app.',                    createdAt:new Date().toISOString() },
  ]);

  _S.set('academic', [
    { id:'ac1',  studentId:'s1', teacherId:'t1', subject:'Data Structures',    semester:'Sem 5', marks:88, quiz:85, assignment:90, attendance:92, feedback:'Excellent. Strong in trees and graphs.',              createdAt:new Date().toISOString() },
    { id:'ac2',  studentId:'s1', teacherId:'t1', subject:'Machine Learning',   semester:'Sem 5', marks:92, quiz:90, assignment:95, attendance:88, feedback:'Top performer, innovative ideas.',                    createdAt:new Date().toISOString() },
    { id:'ac3',  studentId:'s1', teacherId:'t2', subject:'Digital Circuits',   semester:'Sem 5', marks:76, quiz:72, assignment:80, attendance:85, feedback:'Good, needs more practice.',                          createdAt:new Date().toISOString() },
    { id:'ac4',  studentId:'s1', teacherId:'t1', subject:'Python Programming', semester:'Sem 4', marks:94, quiz:92, assignment:96, attendance:90, feedback:'Outstanding Python skills.',                          createdAt:new Date().toISOString() },
    { id:'ac5',  studentId:'s2', teacherId:'t2', subject:'IoT Systems',        semester:'Sem 7', marks:95, quiz:92, assignment:96, attendance:96, feedback:'Outstanding. Best project in class.',                  createdAt:new Date().toISOString() },
    { id:'ac6',  studentId:'s2', teacherId:'t1', subject:'Python Programming', semester:'Sem 7', marks:89, quiz:88, assignment:91, attendance:90, feedback:'Consistent and thorough.',                            createdAt:new Date().toISOString() },
    { id:'ac7',  studentId:'s2', teacherId:'t1', subject:'AI & Deep Learning', semester:'Sem 7', marks:96, quiz:95, assignment:97, attendance:94, feedback:'Research-grade understanding.',                       createdAt:new Date().toISOString() },
    { id:'ac8',  studentId:'s3', teacherId:'t1', subject:'Data Structures',    semester:'Sem 3', marks:55, quiz:52, assignment:60, attendance:65, feedback:'Struggles with complex structures. Needs urgent help.', createdAt:new Date().toISOString() },
    { id:'ac9',  studentId:'s3', teacherId:'t1', subject:'Python Programming', semester:'Sem 3', marks:63, quiz:60, assignment:68, attendance:72, feedback:'Average. More practice needed.',                      createdAt:new Date().toISOString() },
    { id:'ac10', studentId:'s3', teacherId:'t2', subject:'Digital Circuits',   semester:'Sem 3', marks:49, quiz:45, assignment:55, attendance:60, feedback:'Below average. High risk of failing.',                 createdAt:new Date().toISOString() },
    { id:'ac11', studentId:'s4', teacherId:'t1', subject:'Machine Learning',   semester:'Sem 5', marks:91, quiz:89, assignment:93, attendance:94, feedback:'Exceptional understanding of neural networks.',         createdAt:new Date().toISOString() },
    { id:'ac12', studentId:'s4', teacherId:'t1', subject:'Data Structures',    semester:'Sem 5', marks:84, quiz:82, assignment:87, attendance:90, feedback:'Strong analytical thinking.',                         createdAt:new Date().toISOString() },
    { id:'ac13', studentId:'s4', teacherId:'t1', subject:'Statistics',         semester:'Sem 5', marks:87, quiz:85, assignment:90, attendance:92, feedback:'Great at statistical analysis.',                      createdAt:new Date().toISOString() },
    { id:'ac14', studentId:'s5', teacherId:'t1', subject:'Blockchain Tech',    semester:'Sem 7', marks:93, quiz:91, assignment:94, attendance:89, feedback:'Excellent blockchain knowledge.',                      createdAt:new Date().toISOString() },
    { id:'ac15', studentId:'s5', teacherId:'t1', subject:'Web Development',    semester:'Sem 7', marks:87, quiz:85, assignment:89, attendance:86, feedback:'Strong full-stack skills.',                            createdAt:new Date().toISOString() },
    { id:'ac16', studentId:'s6', teacherId:'t1', subject:'Python Programming', semester:'Sem 1', marks:71, quiz:68, assignment:74, attendance:79, feedback:'Good start for first semester.',                       createdAt:new Date().toISOString() },
    { id:'ac17', studentId:'s6', teacherId:'t2', subject:'Digital Circuits',   semester:'Sem 1', marks:64, quiz:60, assignment:67, attendance:74, feedback:'Average. Focus on basics.',                            createdAt:new Date().toISOString() },
    { id:'ac18', studentId:'s7', teacherId:'t1', subject:'Cybersecurity',      semester:'Sem 5', marks:90, quiz:88, assignment:92, attendance:93, feedback:'Deep network security understanding.',                  createdAt:new Date().toISOString() },
    { id:'ac19', studentId:'s7', teacherId:'t1', subject:'Data Structures',    semester:'Sem 5', marks:82, quiz:80, assignment:85, attendance:87, feedback:'Good problem-solving skills.',                        createdAt:new Date().toISOString() },
    { id:'ac20', studentId:'s8', teacherId:'t1', subject:'Mobile Dev',         semester:'Sem 7', marks:96, quiz:94, assignment:97, attendance:95, feedback:'Industry-grade Flutter development.',                   createdAt:new Date().toISOString() },
    { id:'ac21', studentId:'s8', teacherId:'t2', subject:'UI/UX Design',       semester:'Sem 7', marks:93, quiz:91, assignment:95, attendance:92, feedback:'Creative and technically strong.',                     createdAt:new Date().toISOString() },
  ]);

  _S.set('research', [
    { id:'r1', teacherId:'t1', title:'Deep Learning for Medical Imaging: A Survey',         journal:'Nature Machine Intelligence', year:2024, doi:'10.1038/s42256-024-001', citations:42, status:'published',    coAuthors:['Dr. Mehta (IIT Delhi)'],   abstract:'Comprehensive survey of deep learning in medical image analysis.', createdAt:new Date().toISOString() },
    { id:'r2', teacherId:'t1', title:'Attention Mechanisms in Low-Resource NLP',             journal:'ACL 2024',                   year:2024, doi:'10.18653/v1/2024',       citations:18, status:'published',    coAuthors:['Prof. Rao (IISc)'],        abstract:'Novel attention mechanism for Hindi and Marathi NLP.',            createdAt:new Date().toISOString() },
    { id:'r3', teacherId:'t2', title:'Low-Power IoT Sensor Fusion for Agriculture',          journal:'IEEE IoT Journal',           year:2024, doi:'10.1109/JIOT.2024.001', citations:11, status:'published',    coAuthors:['Prof. Singh (NIT)'],       abstract:'Energy-efficient sensor fusion with 3x battery improvement.',     createdAt:new Date().toISOString() },
    { id:'r4', teacherId:'t2', title:'Embedded ML on Ultra-Low-Power MCUs',                  journal:'IEEE TECS',                  year:2024, doi:'',                       citations:0,  status:'under_review', coAuthors:[],                          abstract:'TFLite on Cortex-M0 with 95% accuracy retention.',               createdAt:new Date().toISOString() },
    { id:'r5', teacherId:'t1', title:'Federated Learning for Privacy-Preserving Healthcare', journal:'Nature Digital Medicine',    year:2024, doi:'10.1038/s41746-024-002', citations:7,  status:'published',    coAuthors:['Google Research'],         abstract:'Federated approach for diagnostic AI without sharing patient data.', createdAt:new Date().toISOString() },
  ]);

  _S.set('jobs', [
    { id:'j1', recruiterId:'u-rec1', company:'TechCorp', role:'ML Engineer',        type:'fulltime',   ctc:'18-22 LPA', location:'Bangalore', deadline:'2025-05-31', skills:['Machine Learning','Python','TensorFlow'], desc:'Build production ML models for recommendation engine.', status:'open', createdAt:new Date().toISOString() },
    { id:'j2', recruiterId:'u-rec1', company:'TechCorp', role:'Frontend Developer', type:'fulltime',   ctc:'12-16 LPA', location:'Remote',    deadline:'2025-06-15', skills:['React','JavaScript','UI/UX'],             desc:'Build next-gen UI for SaaS platform.',                  status:'open', createdAt:new Date().toISOString() },
    { id:'j3', recruiterId:'u-rec1', company:'TechCorp', role:'Blockchain Intern',  type:'internship', ctc:'50K/month', location:'Mumbai',    deadline:'2025-05-20', skills:['Blockchain','Solidity','Node.js'],         desc:'DeFi protocol development internship.',                 status:'open', createdAt:new Date().toISOString() },
    { id:'j4', recruiterId:'u-rec1', company:'TechCorp', role:'Data Analyst',       type:'fulltime',   ctc:'10-14 LPA', location:'Pune',      deadline:'2025-06-30', skills:['Data Science','SQL','Python'],             desc:'Analyse product data and build dashboards.',             status:'open', createdAt:new Date().toISOString() },
  ]);

  console.info('%c[CampusIQ] Seed data v5 loaded ✓', 'color:#10B981;font-weight:700;font-size:13px');
}
