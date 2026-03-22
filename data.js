// CampusIQ Data Layer v2 — AI Engine + GitHub + Resume + Rich Seed
const DB = {
  get(key){try{return JSON.parse(localStorage.getItem('ciq_'+key))||null;}catch{return null;}},
  set(key,val){localStorage.setItem('ciq_'+key,JSON.stringify(val));},
  getUsers(){return this.get('users')||[];},saveUsers(u){this.set('users',u);},
  getUserById(id){return this.getUsers().find(u=>u.id===id)||null;},
  getUserByEmail(e){return this.getUsers().find(u=>u.email.toLowerCase()===e.toLowerCase())||null;},
  getStudents(){return this.get('students')||[];},saveStudents(s){this.set('students',s);},
  getStudentById(id){return this.getStudents().find(s=>s.id===id)||null;},
  getStudentByUserId(uid){return this.getStudents().find(s=>s.userId===uid)||null;},
  getTeachers(){return this.get('teachers')||[];},saveTeachers(t){this.set('teachers',t);},
  getTeacherByUserId(uid){return this.getTeachers().find(t=>t.userId===uid)||null;},
  getAchievements(){return this.get('achievements')||[];},saveAchievements(a){this.set('achievements',a);},
  addAchievement(a){const l=this.getAchievements();l.push(a);this.saveAchievements(l);},
  updateAchievement(id,ch){const l=this.getAchievements(),i=l.findIndex(a=>a.id===id);if(i>=0){l[i]={...l[i],...ch};this.saveAchievements(l);}},
  getAcademic(){return this.get('academic')||[];},saveAcademic(a){this.set('academic',a);},
  getStudentAcademic(sid){return this.getAcademic().filter(r=>r.studentId===sid);},
  addAcademic(r){const l=this.getAcademic();l.push(r);this.saveAcademic(l);},
  updateAcademic(id,ch){const l=this.getAcademic(),i=l.findIndex(r=>r.id===id);if(i>=0){l[i]={...l[i],...ch};this.saveAcademic(l);}},
  getResearch(){return this.get('research')||[];},saveResearch(r){this.set('research',r);},
  addResearch(r){const l=this.getResearch();l.push(r);this.saveResearch(l);},
  updateResearch(id,ch){const l=this.getResearch(),i=l.findIndex(r=>r.id===id);if(i>=0){l[i]={...l[i],...ch};this.saveResearch(l);}},
  getGithub(){return this.get('github')||[];},saveGithub(g){this.set('github',g);},
  getGithubByStudent(sid){return this.getGithub().find(g=>g.studentId===sid)||null;},
  getJobs(){return this.get('jobs')||[];},saveJobs(j){this.set('jobs',j);},
  addJob(j){const l=this.getJobs();l.push(j);this.saveJobs(l);},
  getApplications(){return this.get('applications')||[];},saveApplications(a){this.set('applications',a);},
  addApplication(a){const l=this.getApplications();l.push(a);this.saveApplications(l);},
  getSession(){return this.get('session');},setSession(s){this.set('session',s);},
  clearSession(){localStorage.removeItem('ciq_session');},
  getNotifications(uid){return(this.get('notifs')||[]).filter(n=>n.userId===uid);},
  addNotification(n){const l=this.get('notifs')||[];l.push(n);this.set('notifs',l);},
  markRead(uid){const l=this.get('notifs')||[];l.forEach(n=>{if(n.userId===uid)n.read=true;});this.set('notifs',l);},

  SKILL_MAP:{
    'React':['React.js','Frontend Dev','JSX','State Management','Hooks'],
    'Machine Learning':['ML Engineering','Python','TensorFlow','Model Training','Data Science'],
    'Python':['Python','Scripting','Data Analysis','Automation','Flask'],
    'Java':['Java','OOP','Spring Boot','Backend Dev','Maven'],
    'DSA':['Algorithms','Data Structures','Problem Solving','Competitive Coding'],
    'Cloud':['AWS','DevOps','Docker','Microservices','CI/CD'],
    'Flutter':['Flutter','Dart','Mobile Dev','Cross-Platform','UI Design'],
    'NLP':['NLP','BERT','Text Mining','Deep Learning','Transformers'],
    'IoT':['IoT','Embedded Systems','Arduino','Sensor Fusion','MQTT'],
    'Blockchain':['Blockchain','Solidity','Web3','Smart Contracts','DeFi'],
    'Cybersecurity':['Security','Ethical Hacking','Cryptography','Networking','Pentesting'],
    'UI/UX':['Figma','Design Systems','User Research','Prototyping','Accessibility'],
    'Node.js':['Node.js','Express','REST API','Backend','MongoDB'],
    'Data Science':['Pandas','NumPy','Visualization','Statistics','Jupyter'],
    'Research':['Academic Writing','Literature Review','Methodology','Publication','LaTeX'],
    'AI':['Artificial Intelligence','Neural Networks','Computer Vision','Reinforcement Learning'],
    'SQL':['SQL','Database Design','PostgreSQL','Query Optimization'],
    'C++':['C++','Systems Programming','STL','Competitive Programming'],
    'Android':['Android Dev','Kotlin','Material Design','App Publishing'],
    'Web':['HTML/CSS','JavaScript','Responsive Design','Web Performance'],
  },

  mapSkills(achievements){
    const s=new Set();
    achievements.filter(a=>a.status==='verified').forEach(a=>{
      (a.skills||[]).forEach(sk=>(this.SKILL_MAP[sk]||[sk]).forEach(m=>s.add(m)));
    });
    return[...s];
  },

  getRawSkills(achievements){
    const s=new Set();
    achievements.filter(a=>a.status==='verified').forEach(a=>(a.skills||[]).forEach(sk=>s.add(sk)));
    return[...s];
  },

  calcReadiness(student,achievements,academic){
    const v=achievements.filter(a=>a.studentId===student.id&&a.status==='verified');
    const ac=academic.filter(r=>r.studentId===student.id);
    const gh=this.getGithubByStudent(student.id);
    let score=30;
    score+=Math.min(v.length*6,24);
    if(ac.length){
      score+=Math.round((ac.reduce((s,r)=>s+(r.marks||0),0)/ac.length/100)*20);
      score+=Math.round((ac.reduce((s,r)=>s+(r.attendance||0),0)/ac.length/100)*10);
    }
    if(gh)score+=Math.min(Math.round((gh.consistencyScore||0)/100*16),16);
    return Math.min(Math.round(score),100);
  },

  getReadinessBreakdown(student,achievements,academic){
    const v=achievements.filter(a=>a.studentId===student.id&&a.status==='verified');
    const ac=academic.filter(r=>r.studentId===student.id);
    const gh=this.getGithubByStudent(student.id);
    const achS=Math.min(v.length*6,24);
    let acS=0,atS=0,ghS=0;
    if(ac.length){
      acS=Math.round((ac.reduce((s,r)=>s+(r.marks||0),0)/ac.length/100)*20);
      atS=Math.round((ac.reduce((s,r)=>s+(r.attendance||0),0)/ac.length/100)*10);
    }
    if(gh)ghS=Math.min(Math.round((gh.consistencyScore||0)/100*16),16);
    return{total:Math.min(30+achS+acS+atS+ghS,100),base:30,achievements:achS,academics:acS,attendance:atS,github:ghS};
  },

  getWeakAreas(studentId){
    return this.getStudentAcademic(studentId).flatMap(r=>{
      const w=[];
      if((r.marks||0)<65)w.push({subject:r.subject,type:'marks',value:r.marks,threshold:65});
      if((r.attendance||0)<75)w.push({subject:r.subject,type:'attendance',value:r.attendance,threshold:75});
      return w;
    });
  },

  getRiskLevel(studentId){
    const w=this.getWeakAreas(studentId).length;
    return w>=4?'high':w>=2?'medium':'low';
  },

  analyzeFakeRisk(ach){
    const flags=[];
    const title=(ach.title||'').toLowerCase().trim();
    const dups=this.getAchievements().filter(a=>a.id!==ach.id&&a.studentId===ach.studentId&&a.title.toLowerCase().trim()===title&&a.status!=='rejected');
    if(dups.length)flags.push('Duplicate title found');
    if(ach.date&&new Date(ach.date)>new Date())flags.push('Future date — event not yet occurred');
    if(['fake','test','dummy','sample','lorem'].some(w=>title.includes(w)))flags.push('Suspicious keywords');
    if(['na','none','n/a','-','unknown'].includes((ach.org||'').toLowerCase().trim()))flags.push('Organisation not specified');
    return{risk:flags.length>1?'high':flags.length===1?'medium':'low',flags};
  },

  generateResume(studentId){
    const st=this.getStudentById(studentId);
    if(!st)return null;
    const user=this.getUserById(st.userId);
    const achievs=this.getAchievements().filter(a=>a.studentId===studentId&&a.status==='verified');
    const acRecs=this.getStudentAcademic(studentId);
    const gh=this.getGithubByStudent(studentId);
    return{
      name:st.name,email:user?.email||'',dept:st.dept,year:st.year,
      rollNo:st.rollNo,gpa:st.gpa,phone:st.phone||'',
      linkedIn:st.linkedIn||'',githubUrl:st.github||'',
      readiness:this.calcReadiness(st,this.getAchievements(),this.getAcademic()),
      skills:this.getRawSkills(achievs),
      mappedSkills:this.mapSkills(achievs).slice(0,12),
      achievements:achievs.map(a=>({title:a.title,org:a.org,date:a.date,type:a.type,skills:a.skills,desc:a.desc})),
      academics:acRecs.map(r=>({subject:r.subject,marks:r.marks,attendance:r.attendance,semester:r.semester,feedback:r.feedback})),
      github:gh?{username:gh.username,repos:gh.repos,commits:gh.totalCommits,streak:gh.longestStreak,consistency:gh.consistencyScore,topLanguages:gh.topLanguages}:null,
      generatedAt:new Date().toISOString()
    };
  },
};

function seedIfEmpty(){
  // Version migration — clear stale data before checking
  const _V='v2';
  if(localStorage.getItem('ciq_version')!==_V){
    Object.keys(localStorage).filter(k=>k.startsWith('ciq_')&&k!=='ciq_version').forEach(k=>localStorage.removeItem(k));
    localStorage.setItem('ciq_version',_V);
  }
  if(DB.getUsers().length>0)return;
  DB.saveUsers([
    {id:'u1',email:'admin@campusiq.edu',password:'admin123',role:'admin',name:'Dr. Admin Kumar'},
    {id:'u2',email:'teacher1@campusiq.edu',password:'teach123',role:'teacher',name:'Prof. Anjali Sharma'},
    {id:'u3',email:'teacher2@campusiq.edu',password:'teach123',role:'teacher',name:'Prof. Ravi Verma'},
    {id:'u4',email:'student1@campusiq.edu',password:'stud123',role:'student',name:'Arjun Rao'},
    {id:'u5',email:'student2@campusiq.edu',password:'stud123',role:'student',name:'Priya Sharma'},
    {id:'u6',email:'student3@campusiq.edu',password:'stud123',role:'student',name:'Karan Mehta'},
    {id:'u7',email:'student4@campusiq.edu',password:'stud123',role:'student',name:'Sara Nair'},
    {id:'u8',email:'recruiter@techcorp.com',password:'rec123',role:'recruiter',name:'Nisha Patel (TechCorp)'},
    {id:'u9',email:'student5@campusiq.edu',password:'stud123',role:'student',name:'Dev Patel'},
    {id:'u10',email:'student6@campusiq.edu',password:'stud123',role:'student',name:'Riya Singh'},
    {id:'u11',email:'student7@campusiq.edu',password:'stud123',role:'student',name:'Aditya Kumar'},
    {id:'u12',email:'student8@campusiq.edu',password:'stud123',role:'student',name:'Meera Joshi'},
  ]);
  DB.saveTeachers([
    {id:'t1',userId:'u2',name:'Prof. Anjali Sharma',dept:'Computer Science',subjects:['Data Structures','Machine Learning','Python','AI'],researchCount:4},
    {id:'t2',userId:'u3',name:'Prof. Ravi Verma',dept:'Electronics',subjects:['Digital Circuits','IoT','Embedded Systems','VLSI'],researchCount:3},
  ]);
  DB.saveStudents([
    {id:'s1',userId:'u4',name:'Arjun Rao',dept:'CSE',year:3,section:'A',rollNo:'CS21001',gpa:8.9,skills:[],readiness:0,phone:'9876543210',linkedIn:'linkedin.com/in/arjunrao',github:'github.com/arjunrao'},
    {id:'s2',userId:'u5',name:'Priya Sharma',dept:'ECE',year:4,section:'B',rollNo:'EC20002',gpa:9.2,skills:[],readiness:0,phone:'9876543211',linkedIn:'linkedin.com/in/priyasharma',github:'github.com/priyasharma'},
    {id:'s3',userId:'u6',name:'Karan Mehta',dept:'IT',year:2,section:'A',rollNo:'IT22003',gpa:7.4,skills:[],readiness:0,phone:'9876543212',linkedIn:'linkedin.com/in/karanmehta',github:'github.com/karanmehta'},
    {id:'s4',userId:'u7',name:'Sara Nair',dept:'DS',year:3,section:'C',rollNo:'DS21004',gpa:8.6,skills:[],readiness:0,phone:'9876543213',linkedIn:'linkedin.com/in/saranair',github:'github.com/saranair'},
    {id:'s5',userId:'u9',name:'Dev Patel',dept:'CSE',year:4,section:'B',rollNo:'CS20005',gpa:9.0,skills:[],readiness:0,phone:'9876543214',linkedIn:'linkedin.com/in/devpatel',github:'github.com/devpatel'},
    {id:'s6',userId:'u10',name:'Riya Singh',dept:'DS',year:1,section:'A',rollNo:'DS23006',gpa:7.8,skills:[],readiness:0,phone:'9876543215',linkedIn:'linkedin.com/in/riyasingh',github:'github.com/riyasingh'},
    {id:'s7',userId:'u11',name:'Aditya Kumar',dept:'CSE',year:3,section:'C',rollNo:'CS21007',gpa:8.2,skills:[],readiness:0,phone:'9876543216',linkedIn:'linkedin.com/in/adityakumar',github:'github.com/adityakumar'},
    {id:'s8',userId:'u12',name:'Meera Joshi',dept:'IT',year:4,section:'B',rollNo:'IT20008',gpa:9.4,skills:[],readiness:0,phone:'9876543217',linkedIn:'linkedin.com/in/meerajoshi',github:'github.com/meerajoshi'},
  ]);
  DB.saveAchievements([
    {id:'a1',studentId:'s1',ownerId:'u4',type:'hackathon',title:'HackIndia 2024 — 1st Place',org:'HackIndia',skills:['React','Machine Learning'],date:'2024-03-15',status:'verified',verifiedBy:'t1',desc:'Built an AI-powered health diagnosis tool that won national hackathon.'},
    {id:'a2',studentId:'s1',ownerId:'u4',type:'certification',title:'AWS Solutions Architect Associate',org:'Amazon',skills:['Cloud'],date:'2024-01-10',status:'verified',verifiedBy:'t1',desc:'Passed with 92% score on first attempt.'},
    {id:'a3',studentId:'s1',ownerId:'u4',type:'project',title:'Open Source ML Library — 200 Stars',org:'GitHub',skills:['Python','Machine Learning'],date:'2024-05-20',status:'verified',verifiedBy:'t1',desc:'Built open-source ML utility library with 200+ GitHub stars.'},
    {id:'a4',studentId:'s1',ownerId:'u4',type:'competition',title:'Google Kick Start — Top 10%',org:'Google',skills:['DSA','Python'],date:'2024-02-10',status:'pending',verifiedBy:null,desc:'Ranked in top 10% globally.'},
    {id:'a5',studentId:'s2',ownerId:'u5',type:'research',title:'IoT Based Smart Agriculture',org:'IEEE',skills:['IoT','Python'],date:'2024-04-20',status:'verified',verifiedBy:'t2',desc:'Published in IEEE IoT Journal, cited 9 times.'},
    {id:'a6',studentId:'s2',ownerId:'u5',type:'certification',title:'Google Cloud Professional DE',org:'Google',skills:['Cloud','Python'],date:'2024-03-01',status:'verified',verifiedBy:'t1',desc:'Professional Data Engineer certification.'},
    {id:'a7',studentId:'s2',ownerId:'u5',type:'hackathon',title:'Smart India Hackathon — Winner',org:'Govt. of India',skills:['IoT','Machine Learning'],date:'2024-09-10',status:'verified',verifiedBy:'t2',desc:'National level winner in hardware category.'},
    {id:'a8',studentId:'s2',ownerId:'u5',type:'internship',title:'Research Intern — IIT Bombay',org:'IIT Bombay',skills:['Research','Python'],date:'2024-06-01',status:'verified',verifiedBy:'t1',desc:'6-month research internship in ML lab.'},
    {id:'a9',studentId:'s3',ownerId:'u6',type:'competition',title:'LeetCode Knight Badge',org:'LeetCode',skills:['DSA','Java'],date:'2024-02-01',status:'pending',verifiedBy:null,desc:'Achieved Knight badge solving 300+ problems.'},
    {id:'a10',studentId:'s3',ownerId:'u6',type:'project',title:'College Event Management System',org:'IILM College',skills:['Web','Node.js'],date:'2024-01-20',status:'verified',verifiedBy:'t1',desc:'Full-stack event management system for college fest.'},
    {id:'a11',studentId:'s4',ownerId:'u7',type:'hackathon',title:'Kaggle Silver Medal — NLP 2024',org:'Kaggle',skills:['Machine Learning','Python'],date:'2024-05-10',status:'verified',verifiedBy:'t1',desc:'Top 3% in NLP competition, BERT fine-tuning challenge.'},
    {id:'a12',studentId:'s4',ownerId:'u7',type:'certification',title:'TensorFlow Developer Certificate',org:'Google',skills:['Machine Learning','AI'],date:'2024-03-22',status:'verified',verifiedBy:'t1',desc:'Passed TensorFlow professional exam.'},
    {id:'a13',studentId:'s4',ownerId:'u7',type:'research',title:'Explainable AI for Healthcare',org:'Elsevier',skills:['AI','Research'],date:'2024-07-15',status:'verified',verifiedBy:'t1',desc:'Co-authored paper on XAI, accepted in Elsevier journal.'},
    {id:'a14',studentId:'s4',ownerId:'u7',type:'internship',title:'Data Science Intern — Flipkart',org:'Flipkart',skills:['Data Science','Python'],date:'2024-05-01',status:'verified',verifiedBy:'t1',desc:'2-month internship on recommendation systems.'},
    {id:'a15',studentId:'s5',ownerId:'u9',type:'certification',title:'Ethereum Developer Certification',org:'ConsenSys',skills:['Blockchain'],date:'2024-02-15',status:'verified',verifiedBy:'t1',desc:'Certified Ethereum smart contract developer.'},
    {id:'a16',studentId:'s5',ownerId:'u9',type:'hackathon',title:'ETHIndia 2023 — 2nd Place',org:'ETHIndia',skills:['Blockchain','Web'],date:'2023-12-08',status:'verified',verifiedBy:'t1',desc:'Built DeFi lending protocol, 2nd place nationwide.'},
    {id:'a17',studentId:'s5',ownerId:'u9',type:'project',title:'DeFi Yield Aggregator Protocol',org:'GitHub',skills:['Blockchain','Node.js'],date:'2024-04-10',status:'verified',verifiedBy:'t1',desc:'Open source DeFi project with testnet deployment.'},
    {id:'a18',studentId:'s5',ownerId:'u9',type:'internship',title:'Smart Contract Auditor — CoinDCX',org:'CoinDCX',skills:['Blockchain','Cybersecurity'],date:'2024-06-15',status:'pending',verifiedBy:null,desc:'Internship auditing smart contracts for security.'},
    {id:'a19',studentId:'s6',ownerId:'u10',type:'project',title:'Personal Portfolio Website',org:'Self',skills:['Web','UI/UX'],date:'2024-08-01',status:'verified',verifiedBy:'t1',desc:'Responsive portfolio with 3D animations.'},
    {id:'a20',studentId:'s7',ownerId:'u11',type:'certification',title:'CEH — Certified Ethical Hacker',org:'EC-Council',skills:['Cybersecurity'],date:'2024-04-05',status:'verified',verifiedBy:'t1',desc:'Passed CEH exam with distinction.'},
    {id:'a21',studentId:'s7',ownerId:'u11',type:'competition',title:'CTF Champion — NIT Hackfest',org:'NIT Warangal',skills:['Cybersecurity','DSA'],date:'2024-03-18',status:'verified',verifiedBy:'t2',desc:'Won national CTF competition.'},
    {id:'a22',studentId:'s7',ownerId:'u11',type:'project',title:'ML-based Intrusion Detection System',org:'GitHub',skills:['Cybersecurity','Machine Learning'],date:'2024-06-01',status:'verified',verifiedBy:'t1',desc:'IDS system with 97% accuracy on CICIDS dataset.'},
    {id:'a23',studentId:'s8',ownerId:'u12',type:'internship',title:'Flutter Dev Intern — Zomato',org:'Zomato',skills:['Flutter','UI/UX'],date:'2024-03-10',status:'verified',verifiedBy:'t1',desc:'Contributed to Zomato app features used by 1M+ users.'},
    {id:'a24',studentId:'s8',ownerId:'u12',type:'certification',title:'Google Flutter Certified Developer',org:'Google',skills:['Flutter','Android'],date:'2024-02-28',status:'verified',verifiedBy:'t1',desc:'Official Google Flutter developer certification.'},
    {id:'a25',studentId:'s8',ownerId:'u12',type:'hackathon',title:'AppNation 2024 — Best UX Award',org:'AppNation',skills:['Flutter','UI/UX'],date:'2024-05-25',status:'verified',verifiedBy:'t2',desc:'Best UX design award at national app competition.'},
    {id:'a26',studentId:'s8',ownerId:'u12',type:'project',title:'CampusConnect App — 5K Downloads',org:'PlayStore',skills:['Flutter','Node.js'],date:'2024-07-01',status:'verified',verifiedBy:'t1',desc:'Published campus management app with 5000+ downloads.'},
  ]);
  DB.saveAcademic([
    {id:'ac1',studentId:'s1',teacherId:'t1',subject:'Data Structures',marks:88,quiz:85,assignment:90,attendance:92,semester:'Sem 5',feedback:'Excellent. Strong in trees and graphs.'},
    {id:'ac2',studentId:'s1',teacherId:'t1',subject:'Machine Learning',marks:92,quiz:90,assignment:95,attendance:88,semester:'Sem 5',feedback:'Top performer, innovative project ideas.'},
    {id:'ac3',studentId:'s1',teacherId:'t2',subject:'Digital Circuits',marks:76,quiz:72,assignment:80,attendance:85,semester:'Sem 5',feedback:'Good, needs practice on combinational circuits.'},
    {id:'ac4',studentId:'s1',teacherId:'t1',subject:'Python Programming',marks:94,quiz:92,assignment:96,attendance:90,semester:'Sem 4',feedback:'Outstanding Python skills.'},
    {id:'ac5',studentId:'s2',teacherId:'t2',subject:'IoT Systems',marks:95,quiz:92,assignment:96,attendance:96,semester:'Sem 7',feedback:'Outstanding. Best project in class.'},
    {id:'ac6',studentId:'s2',teacherId:'t1',subject:'Python Programming',marks:89,quiz:88,assignment:91,attendance:90,semester:'Sem 7',feedback:'Consistent and thorough.'},
    {id:'ac7',studentId:'s2',teacherId:'t1',subject:'AI & Deep Learning',marks:96,quiz:95,assignment:97,attendance:94,semester:'Sem 7',feedback:'Research-grade understanding of deep learning.'},
    {id:'ac8',studentId:'s3',teacherId:'t1',subject:'Data Structures',marks:62,quiz:58,assignment:65,attendance:72,semester:'Sem 3',feedback:'Struggles with complex data structures. Needs attention.'},
    {id:'ac9',studentId:'s3',teacherId:'t1',subject:'Python Programming',marks:70,quiz:68,assignment:74,attendance:78,semester:'Sem 3',feedback:'Average. More practice needed.'},
    {id:'ac10',studentId:'s3',teacherId:'t2',subject:'Digital Circuits',marks:55,quiz:50,assignment:60,attendance:65,semester:'Sem 3',feedback:'Below average. High risk if not improved.'},
    {id:'ac11',studentId:'s4',teacherId:'t1',subject:'Machine Learning',marks:91,quiz:89,assignment:93,attendance:94,semester:'Sem 5',feedback:'Exceptional understanding of neural networks.'},
    {id:'ac12',studentId:'s4',teacherId:'t1',subject:'Data Structures',marks:84,quiz:82,assignment:87,attendance:90,semester:'Sem 5',feedback:'Strong foundation, good analytical thinking.'},
    {id:'ac13',studentId:'s4',teacherId:'t1',subject:'Statistics',marks:87,quiz:85,assignment:90,attendance:92,semester:'Sem 5',feedback:'Great at statistical analysis.'},
    {id:'ac14',studentId:'s5',teacherId:'t1',subject:'Blockchain Tech',marks:93,quiz:91,assignment:94,attendance:89,semester:'Sem 7',feedback:'Excellent blockchain knowledge, industry ready.'},
    {id:'ac15',studentId:'s5',teacherId:'t1',subject:'Web Development',marks:87,quiz:85,assignment:89,attendance:86,semester:'Sem 7',feedback:'Strong full-stack skills.'},
    {id:'ac16',studentId:'s6',teacherId:'t1',subject:'Python Programming',marks:74,quiz:70,assignment:76,attendance:82,semester:'Sem 1',feedback:'Good start for first semester.'},
    {id:'ac17',studentId:'s6',teacherId:'t2',subject:'Digital Circuits',marks:68,quiz:65,assignment:72,attendance:78,semester:'Sem 1',feedback:'Average. Needs to focus on basics.'},
    {id:'ac18',studentId:'s7',teacherId:'t1',subject:'Cybersecurity',marks:90,quiz:88,assignment:92,attendance:93,semester:'Sem 5',feedback:'Deep understanding of network security.'},
    {id:'ac19',studentId:'s7',teacherId:'t1',subject:'Data Structures',marks:82,quiz:80,assignment:85,attendance:87,semester:'Sem 5',feedback:'Good problem solving skills.'},
    {id:'ac20',studentId:'s8',teacherId:'t1',subject:'Mobile Dev',marks:96,quiz:94,assignment:97,attendance:95,semester:'Sem 7',feedback:'Exceptional. Industry-grade Flutter development.'},
    {id:'ac21',studentId:'s8',teacherId:'t2',subject:'UI/UX Design',marks:93,quiz:91,assignment:95,attendance:92,semester:'Sem 7',feedback:'Creative and technically strong.'},
  ]);
  DB.saveGithub([
    {studentId:'s1',username:'arjunrao',repos:24,totalCommits:847,longestStreak:42,consistencyScore:85,topLanguages:['Python','JavaScript','TypeScript'],contributions:[4,7,2,8,5,9,3,6,8,4,7,5,9,6,3,8,4,7,2,5,8,6,4,9,3,7,5,8,4,6,3,7,5,9,4,8,3,6,7,5,4,8,3,7,9,5,6,4,8,3]},
    {studentId:'s2',username:'priyasharma',repos:18,totalCommits:632,longestStreak:35,consistencyScore:78,topLanguages:['Python','C++','MATLAB'],contributions:[3,6,4,8,2,7,5,9,4,6,3,8,5,7,2,9,4,6,3,8,5,7,4,6,2,8,5,7,3,9,4,6,2,8,5,7,3,9,4,6,5,8,2,7,4,9,3,6,5,8]},
    {studentId:'s3',username:'karanmehta',repos:8,totalCommits:213,longestStreak:14,consistencyScore:38,topLanguages:['Java','C++'],contributions:[1,0,2,1,0,3,1,2,0,1,2,0,1,3,0,2,1,0,2,1,0,2,1,3,0,1,2,0,1,2,3,1,0,2,1,0,2,1,3,0,1,2,0,1,2,0,3,1,0,2]},
    {studentId:'s4',username:'saranair',repos:21,totalCommits:716,longestStreak:51,consistencyScore:90,topLanguages:['Python','Jupyter','R'],contributions:[5,8,3,9,6,4,8,5,7,3,9,4,8,6,3,9,5,7,4,8,3,6,9,5,7,4,8,3,9,5,6,4,8,3,7,9,4,6,5,8,3,7,9,4,6,5,8,3,7,4]},
    {studentId:'s5',username:'devpatel',repos:31,totalCommits:1024,longestStreak:68,consistencyScore:92,topLanguages:['Solidity','TypeScript','Rust'],contributions:[7,9,5,8,4,9,6,8,5,7,4,9,6,8,3,9,5,7,4,8,9,5,7,3,8,6,9,4,7,5,8,3,9,6,5,8,4,7,9,5,6,8,4,7,9,5,6,8,3,7]},
    {studentId:'s6',username:'riyasingh',repos:5,totalCommits:89,longestStreak:8,consistencyScore:25,topLanguages:['HTML','CSS','JavaScript'],contributions:[0,1,2,0,1,0,2,1,0,2,0,1,2,0,1,0,2,1,0,2,1,0,1,2,0,1,2,0,1,0,2,1,0,1,2,0,1,0,2,1,0,2,0,1,2,0,1,2,0,1]},
    {studentId:'s7',username:'adityakumar',repos:16,totalCommits:521,longestStreak:29,consistencyScore:72,topLanguages:['Python','C','Bash'],contributions:[3,5,2,7,4,6,3,8,2,5,4,7,3,6,2,8,4,5,3,7,2,6,4,8,3,5,2,7,4,6,3,8,5,4,7,2,6,3,8,5,4,7,2,6,3,8,4,5,7,2]},
    {studentId:'s8',username:'meerajoshi',repos:28,totalCommits:893,longestStreak:62,consistencyScore:94,topLanguages:['Dart','Flutter','Node.js'],contributions:[6,9,4,8,5,9,6,7,4,9,5,8,3,9,6,7,4,8,5,9,4,7,6,8,5,9,3,8,6,7,4,9,5,8,4,7,6,9,3,8,5,7,4,9,6,8,3,7,5,9]},
  ]);
  DB.saveResearch([
    {id:'r1',teacherId:'t1',title:'Deep Learning for Medical Imaging: A Survey',journal:'Nature Machine Intelligence',year:2024,doi:'10.1038/s42256-024-001',citations:42,status:'published',coAuthors:['Dr. Mehta (IIT Delhi)'],abstract:'Comprehensive survey of deep learning in medical image analysis.'},
    {id:'r2',teacherId:'t1',title:'Attention Mechanisms in Low-Resource NLP',journal:'ACL 2024',year:2024,doi:'10.18653/v1/2024',citations:18,status:'published',coAuthors:['Prof. Rao (IISc)'],abstract:'Novel attention mechanism for Hindi and Marathi NLP.'},
    {id:'r3',teacherId:'t2',title:'Low-Power IoT Sensor Fusion for Agriculture',journal:'IEEE IoT Journal',year:2024,doi:'10.1109/JIOT.2024.001',citations:11,status:'published',coAuthors:['Prof. Singh (NIT)'],abstract:'Energy-efficient sensor fusion with 3x battery improvement.'},
    {id:'r4',teacherId:'t2',title:'Embedded ML on Ultra-Low-Power MCUs',journal:'IEEE TECS',year:2024,doi:null,citations:0,status:'under_review',coAuthors:[],abstract:'TFLite on Cortex-M0 with 95% accuracy retention.'},
    {id:'r5',teacherId:'t1',title:'Federated Learning for Privacy-Preserving Healthcare AI',journal:'Nature Digital Medicine',year:2024,doi:'10.1038/s41746-024-002',citations:7,status:'published',coAuthors:['Google Research'],abstract:'Federated approach for diagnostic AI without sharing patient data.'},
  ]);
  DB.saveJobs([
    {id:'j1',recruiterId:'u8',company:'TechCorp',role:'ML Engineer',skills:['Machine Learning','Python'],ctc:'18-22 LPA',location:'Bangalore',deadline:'2025-01-31',status:'open',type:'fulltime',desc:'Build production ML models for our recommendation engine.'},
    {id:'j2',recruiterId:'u8',company:'TechCorp',role:'Frontend Developer',skills:['React','JavaScript'],ctc:'12-16 LPA',location:'Remote',deadline:'2025-02-15',status:'open',type:'fulltime',desc:'Build next-gen UI for our SaaS platform.'},
    {id:'j3',recruiterId:'u8',company:'TechCorp',role:'Blockchain Dev Intern',skills:['Blockchain','Node.js'],ctc:'50K/month',location:'Mumbai',deadline:'2025-01-20',status:'open',type:'internship',desc:'Work on DeFi protocols and smart contract development.'},
    {id:'j4',recruiterId:'u8',company:'TechCorp',role:'Data Analyst',skills:['Data Science','SQL'],ctc:'10-14 LPA',location:'Pune',deadline:'2025-02-28',status:'open',type:'fulltime',desc:'Analyse product data and build dashboards.'},
  ]);
  console.log('%cCampusIQ v2 — Seed loaded ✓','color:#38BDF8;font-weight:800;font-size:13px');
}


