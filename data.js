// ═══════════════════════════════════════════
// CampusIQ — Shared Data Layer (localStorage)
// ═══════════════════════════════════════════

const DB = {
  // ─── Raw get/set ───────────────────────
  get(key) {
    try { return JSON.parse(localStorage.getItem('ciq_' + key)) || null; } catch { return null; }
  },
  set(key, val) {
    localStorage.setItem('ciq_' + key, JSON.stringify(val));
  },

  // ─── Users ────────────────────────────
  getUsers()        { return this.get('users') || []; },
  saveUsers(u)      { this.set('users', u); },
  getUserById(id)   { return this.getUsers().find(u => u.id === id) || null; },
  getUserByEmail(e) { return this.getUsers().find(u => u.email === e) || null; },

  // ─── Students ─────────────────────────
  getStudents()          { return this.get('students') || []; },
  saveStudents(s)        { this.set('students', s); },
  getStudentById(id)     { return this.getStudents().find(s => s.id === id) || null; },
  getStudentByUserId(uid){ return this.getStudents().find(s => s.userId === uid) || null; },

  // ─── Teachers ─────────────────────────
  getTeachers()          { return this.get('teachers') || []; },
  saveTeachers(t)        { this.set('teachers', t); },
  getTeacherByUserId(uid){ return this.getTeachers().find(t => t.userId === uid) || null; },

  // ─── Achievements ─────────────────────
  getAchievements()      { return this.get('achievements') || []; },
  saveAchievements(a)    { this.set('achievements', a); },
  addAchievement(a)      { const list = this.getAchievements(); list.push(a); this.saveAchievements(list); },
  updateAchievement(id, changes) {
    const list = this.getAchievements();
    const idx = list.findIndex(a => a.id === id);
    if(idx >= 0) { list[idx] = {...list[idx], ...changes}; this.saveAchievements(list); }
  },

  // ─── Academic Records ─────────────────
  getAcademic()      { return this.get('academic') || []; },
  saveAcademic(a)    { this.set('academic', a); },
  getStudentAcademic(sid) { return this.getAcademic().filter(r => r.studentId === sid); },
  addAcademic(r)     { const list = this.getAcademic(); list.push(r); this.saveAcademic(list); },
  updateAcademic(id, changes) {
    const list = this.getAcademic();
    const idx = list.findIndex(r => r.id === id);
    if(idx >= 0) { list[idx] = {...list[idx], ...changes}; this.saveAcademic(list); }
  },

  // ─── Research / Teacher Achievements ──
  getResearch()      { return this.get('research') || []; },
  saveResearch(r)    { this.set('research', r); },
  addResearch(r)     { const list = this.getResearch(); list.push(r); this.saveResearch(list); },
  updateResearch(id, changes) {
    const list = this.getResearch();
    const idx = list.findIndex(r => r.id === id);
    if(idx >= 0) { list[idx] = {...list[idx], ...changes}; this.saveResearch(list); }
  },

  // ─── Session ─────────────────────────
  getSession()    { return this.get('session'); },
  setSession(s)   { this.set('session', s); },
  clearSession()  { localStorage.removeItem('ciq_session'); },

  // ─── Notifications ────────────────────
  getNotifications(userId) { return (this.get('notifs') || []).filter(n => n.userId === userId); },
  addNotification(n) { const list = this.get('notifs') || []; list.push(n); this.set('notifs', list); },
  markRead(userId)   { const list = this.get('notifs') || []; list.forEach(n => { if(n.userId === userId) n.read = true; }); this.set('notifs', list); },

  // ─── Skill mapping from achievements ──
  mapSkills(achievements) {
    const SKILL_MAP = {
      'React':['React.js','Frontend','JSX','State Management'],
      'Machine Learning':['ML','Python','TensorFlow','Data Science'],
      'Python':['Python','Scripting','Data Analysis','Automation'],
      'Java':['Java','OOP','Spring Boot','Backend'],
      'DSA':['Algorithms','Data Structures','Problem Solving','Competitive Coding'],
      'Cloud':['AWS','DevOps','Docker','Microservices'],
      'Flutter':['Flutter','Dart','Mobile Dev','UI Design'],
      'NLP':['NLP','BERT','Text Mining','Deep Learning'],
      'IoT':['IoT','Embedded Systems','Arduino','Sensor Fusion'],
      'Blockchain':['Blockchain','Solidity','Web3','Smart Contracts'],
      'Cybersecurity':['Security','Ethical Hacking','Cryptography','Networking'],
      'UI/UX':['Figma','Design Systems','User Research','Prototyping'],
      'Node.js':['Node.js','Express','REST API','Backend'],
      'Data Science':['Pandas','NumPy','Visualization','Statistics'],
      'Research':['Academic Writing','Literature Review','Methodology','Publication'],
    };
    const skills = new Set();
    achievements.filter(a => a.status === 'verified').forEach(a => {
      (a.skills || []).forEach(s => {
        (SKILL_MAP[s] || [s]).forEach(mapped => skills.add(mapped));
      });
    });
    return [...skills];
  },

  // ─── Readiness Score ──────────────────
  calcReadiness(student, achievements, academic) {
    const verified = achievements.filter(a => a.studentId === student.id && a.status === 'verified');
    const acRecs = academic.filter(r => r.studentId === student.id);
    let score = 40;
    score += Math.min(verified.length * 8, 30);
    if(acRecs.length) {
      const avgMark = acRecs.reduce((s,r) => s + (r.marks || 0), 0) / acRecs.length;
      score += Math.round((avgMark / 100) * 20);
    }
    const avgAttend = acRecs.length ? acRecs.reduce((s,r) => s + (r.attendance || 0), 0) / acRecs.length : 0;
    score += Math.round((avgAttend / 100) * 10);
    return Math.min(Math.round(score), 100);
  },
};

// ═══════════════════════════════════════════
// SEED DATA — runs once
// ═══════════════════════════════════════════
function seedIfEmpty() {
  if(DB.getUsers().length > 0) return;

  const users = [
    { id:'u1', email:'admin@campusiq.edu',   password:'admin123',   role:'admin',     name:'Dr. Admin Kumar' },
    { id:'u2', email:'teacher1@campusiq.edu', password:'teach123',  role:'teacher',   name:'Prof. Anjali Sharma' },
    { id:'u3', email:'teacher2@campusiq.edu', password:'teach123',  role:'teacher',   name:'Prof. Ravi Verma' },
    { id:'u4', email:'student1@campusiq.edu', password:'stud123',   role:'student',   name:'Arjun Rao' },
    { id:'u5', email:'student2@campusiq.edu', password:'stud123',   role:'student',   name:'Priya Sharma' },
    { id:'u6', email:'student3@campusiq.edu', password:'stud123',   role:'student',   name:'Karan Mehta' },
    { id:'u7', email:'student4@campusiq.edu', password:'stud123',   role:'student',   name:'Sara Nair' },
    { id:'u8', email:'recruiter@techcorp.com',password:'rec123',    role:'recruiter', name:'Nisha Patel (TechCorp)' },
  ];
  DB.saveUsers(users);

  const teachers = [
    { id:'t1', userId:'u2', name:'Prof. Anjali Sharma', dept:'Computer Science', subjects:['Data Structures','Machine Learning','Python'], researchCount:4 },
    { id:'t2', userId:'u3', name:'Prof. Ravi Verma',    dept:'Electronics',       subjects:['Digital Circuits','IoT','Embedded Systems'],  researchCount:2 },
  ];
  DB.saveTeachers(teachers);

  const students = [
    { id:'s1', userId:'u4', name:'Arjun Rao',    dept:'CSE', year:3, section:'A', rollNo:'CS21001', gpa:8.9, skills:[], readiness:0 },
    { id:'s2', userId:'u5', name:'Priya Sharma',  dept:'ECE', year:4, section:'B', rollNo:'EC20002', gpa:9.2, skills:[], readiness:0 },
    { id:'s3', userId:'u6', name:'Karan Mehta',   dept:'IT',  year:2, section:'A', rollNo:'IT22003', gpa:7.4, skills:[], readiness:0 },
    { id:'s4', userId:'u7', name:'Sara Nair',     dept:'DS',  year:3, section:'C', rollNo:'DS21004', gpa:8.6, skills:[], readiness:0 },
  ];
  DB.saveStudents(students);

  const achievements = [
    { id:'a1', studentId:'s1', ownerId:'u4', type:'hackathon',    title:'HackIndia 2024 — 1st Place',   org:'HackIndia',   skills:['React','Machine Learning'], date:'2024-03-15', status:'verified', verifiedBy:'t1', desc:'Built an AI-powered health diagnosis tool.' },
    { id:'a2', studentId:'s1', ownerId:'u4', type:'certification', title:'AWS Solutions Architect',      org:'Amazon',      skills:['Cloud'],                    date:'2024-01-10', status:'verified', verifiedBy:'t1', desc:'Associate level certification.' },
    { id:'a3', studentId:'s2', ownerId:'u5', type:'research',      title:'IoT Based Smart Agriculture',  org:'IEEE',        skills:['IoT','Python'],             date:'2024-04-20', status:'verified', verifiedBy:'t2', desc:'Published in IEEE IoT Journal.' },
    { id:'a4', studentId:'s3', ownerId:'u6', type:'competition',   title:'LeetCode Top 5%',              org:'LeetCode',    skills:['DSA','Java'],               date:'2024-02-01', status:'pending',  verifiedBy:null, desc:'Achieved Knight badge on LeetCode.' },
    { id:'a5', studentId:'s4', ownerId:'u7', type:'hackathon',     title:'Kaggle Silver Medal',          org:'Kaggle',      skills:['Machine Learning','Python'], date:'2024-05-10', status:'verified', verifiedBy:'t1', desc:'Top 3% in NLP competition.' },
    { id:'a6', studentId:'s2', ownerId:'u5', type:'certification', title:'Google Cloud Professional',    org:'Google',      skills:['Cloud','Python'],           date:'2024-03-01', status:'pending',  verifiedBy:null, desc:'Professional Data Engineer cert.' },
  ];
  DB.saveAchievements(achievements);

  const academic = [
    // Arjun — s1
    { id:'ac1',  studentId:'s1', teacherId:'t1', subject:'Data Structures',   marks:88, quiz:85, assignment:90, attendance:92, semester:'Sem 5', feedback:'Excellent performance, strong in trees and graphs.' },
    { id:'ac2',  studentId:'s1', teacherId:'t1', subject:'Machine Learning',  marks:92, quiz:90, assignment:95, attendance:88, semester:'Sem 5', feedback:'Top performer, innovative project ideas.' },
    { id:'ac3',  studentId:'s1', teacherId:'t2', subject:'Digital Circuits',  marks:76, quiz:72, assignment:80, attendance:85, semester:'Sem 5', feedback:'Good but needs more practice on combinational circuits.' },
    // Priya — s2
    { id:'ac4',  studentId:'s2', teacherId:'t2', subject:'IoT Systems',       marks:95, quiz:92, assignment:96, attendance:96, semester:'Sem 7', feedback:'Outstanding. Best project in class.' },
    { id:'ac5',  studentId:'s2', teacherId:'t1', subject:'Python Programming', marks:89, quiz:88, assignment:91, attendance:90, semester:'Sem 7', feedback:'Consistent and thorough.' },
    // Karan — s3
    { id:'ac6',  studentId:'s3', teacherId:'t1', subject:'Data Structures',   marks:62, quiz:58, assignment:65, attendance:72, semester:'Sem 3', feedback:'Struggles with complex data structures. Needs focused attention.' },
    { id:'ac7',  studentId:'s3', teacherId:'t1', subject:'Python Programming', marks:70, quiz:68, assignment:74, attendance:78, semester:'Sem 3', feedback:'Average performance. More practice needed.' },
    // Sara — s4
    { id:'ac8',  studentId:'s4', teacherId:'t1', subject:'Machine Learning',  marks:91, quiz:89, assignment:93, attendance:94, semester:'Sem 5', feedback:'Exceptional understanding of neural networks.' },
    { id:'ac9',  studentId:'s4', teacherId:'t1', subject:'Data Structures',   marks:84, quiz:82, assignment:87, attendance:90, semester:'Sem 5', feedback:'Strong foundation, good analytical thinking.' },
  ];
  DB.saveAcademic(academic);

  const research = [
    { id:'r1', teacherId:'t1', title:'Deep Learning for Medical Imaging: A Survey', journal:'Nature ML', year:2024, doi:'10.1038/xxx', citations:28, status:'published', coAuthors:['Dr. Mehta, IIT Delhi'] },
    { id:'r2', teacherId:'t1', title:'Attention Mechanisms in NLP',                 journal:'ACL 2024',  year:2024, doi:'10.18653/xxx', citations:15, status:'published', coAuthors:[] },
    { id:'r3', teacherId:'t2', title:'Low-Power IoT Sensor Fusion Framework',       journal:'IEEE IoT',  year:2024, doi:'10.1109/xxx', citations:9,  status:'published', coAuthors:['Prof. Singh'] },
    { id:'r4', teacherId:'t2', title:'Embedded ML on Edge Devices',                 journal:null,        year:2024, doi:null,          citations:0,  status:'under_review', coAuthors:[] },
  ];
  DB.saveResearch(research);

  console.log('CampusIQ: Seed data loaded ✓');
}
