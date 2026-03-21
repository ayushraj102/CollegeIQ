# CampusIQ — Campus Talent Intelligence Platform

A fully frontend-only multi-portal SaaS demo built with HTML, CSS, and Vanilla JavaScript.  
Uses `localStorage` as the data layer — no backend, no server required.

🔗 **Live Demo:** https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/

---

## Portals

| Role | Login | Password |
|------|-------|----------|
| 🛡️ Admin | admin@campusiq.edu | admin123 |
| 👨‍🏫 Teacher | teacher1@campusiq.edu | teach123 |
| 🎓 Student | student1@campusiq.edu | stud123 |
| 🏢 Recruiter | recruiter@techcorp.com | rec123 |

---

## Files

```
campusiq/
├── index.html       ← Login page (entry point)
├── student.html     ← Student portal
├── teacher.html     ← Teacher portal
├── admin.html       ← Admin portal
├── recruiter.html   ← Recruiter portal
├── data.js          ← Shared localStorage DB layer + seed data
├── shared.css       ← Shared design system styles
└── .nojekyll        ← Required for GitHub Pages
```

---

## Deploy to GitHub Pages

1. Push all files to your repository root (or a subfolder)
2. Go to **Settings → Pages**
3. Source: **Deploy from branch** → `main` → `/ (root)`
4. Save — your site will be live at:  
   `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

> If your files are in a subfolder (e.g. `campusiq/`), the URL will be:  
> `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/campusiq/`

---

## Tech Stack

- HTML5, CSS3, Vanilla JavaScript (ES6+)
- `localStorage` as mock database
- Google Identity Services (optional OAuth)
- Canvas API for particle background
- No frameworks, no build tools, no dependencies
