/**
 * CampusIQ — db.js (Production Refactor)
 * Centralized Data Access Object (DAO) for localStorage.
 * Handles normalization, simulated database seeding, and fallback errors.
 */
'use strict';

const CIQ_VERSION = 'v6_prod_secure';

// ── PRIVATE DB PRIMITIVES ──
function _uuid() {
  return 'ciq-id-' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

const _S = {
  get(k)    { try { return JSON.parse(localStorage.getItem('ciq_' + k)) ?? null; } catch { return null; } },
  set(k, v) { try { localStorage.setItem('ciq_' + k, JSON.stringify(v)); } catch(e) { console.error('Store full/disabled', e); } },
  del(k)    { localStorage.removeItem('ciq_' + k); },
};

const DB = {
  // ── SESSION MANAGEMENT ──
  getSession() { return _S.get('session'); },
  setSession(s) { _S.set('session', s); },
  clearSession() { _S.del('session'); },

  // ── USER OPERATIONS ──
  getUsers() { return _S.get('users') || []; },
  saveUsers(u) { _S.set('users', u); },
  
  getUserByEmail(email) {
    if (!email) return null;
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  },
  getUserById(id) {
    return this.getUsers().find(u => u.id === id);
  },

  createUser(data) {
    const users = this.getUsers();
    if (this.getUserByEmail(data.email)) throw new Error("Email already registered.");

    const newUser = {
      id: _uuid(),
      name: data.name,
      email: data.email.toLowerCase().trim(),
      password: data.password, // IMPORTANT: Must be hashed by Auth layer before passing here
      role: data.role,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    this.saveUsers(users);

    // Auto-provision portal profiles based on role
    if (data.role === 'student') this._initStudentProfile(newUser.id, data);
    if (data.role === 'teacher') this._initTeacherProfile(newUser.id, data);
    if (data.role === 'recruiter') this._initRecruiterProfile(newUser.id, data);

    return { user: newUser };
  },

  // ── ROLE PROFILES ──
  getStudents() { return _S.get('students') || []; },
  _initStudentProfile(userId, data) {
    const list = this.getStudents();
    list.push({ id: _uuid(), userId, name: data.name, dept: data.dept || 'General', year: data.year || 1, gpa: data.gpa || 0, rollNo: data.rollNo || 'N/A' });
    _S.set('students', list);
  },

  getTeachers() { return _S.get('teachers') || []; },
  _initTeacherProfile(userId, data) {
    const list = this.getTeachers();
    list.push({ id: _uuid(), userId, name: data.name, dept: data.dept || 'Engineering' });
    _S.set('teachers', list);
  },

  getRecruiters() { return _S.get('recruiters') || []; },
  _initRecruiterProfile(userId, data) {
    const list = this.getRecruiters();
    list.push({ id: _uuid(), userId, name: data.name, company: data.company || 'TechCorp' });
    _S.set('recruiters', list);
  }
};

/**
 * INITIALIZATION ENGINE (Runs automatically)
 * Securely seeds demo data with hashed passwords.
 */
(function seedIfEmpty() {
  const currentVer = localStorage.getItem('ciq_schema_ver');
  if (currentVer !== CIQ_VERSION) {
    console.warn("CampusIQ: Initializing secure database schema...");
    localStorage.clear();
    localStorage.setItem('ciq_schema_ver', CIQ_VERSION);
    
    // Internal hashing function used strictly for safe seeding
    const _seedHash = (s) => {
        let h = 0; for(let i=0; i<s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
        return 'ciq_hash_' + Math.abs(h);
    };

    const demoAccounts = [
      { name: 'System Admin', email: 'admin@campusiq.edu', password: _seedHash('admin123'), role: 'admin' },
      { name: 'Arjun Rao', email: 'student1@campusiq.edu', password: _seedHash('stud123'), role: 'student', dept: 'CSE', year: 3 },
      { name: 'Prof. Anjali', email: 'teacher1@campusiq.edu', password: _seedHash('teach123'), role: 'teacher', dept: 'Computer Science' },
      { name: 'Nisha Patel', email: 'recruiter@techcorp.com', password: _seedHash('rec123'), role: 'recruiter', company: 'TechCorp' }
    ];

    demoAccounts.forEach(d => DB.createUser(d));
    console.log("Database seeded successfully. Demo accounts are active.");
  }
})();
