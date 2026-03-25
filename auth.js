/**
 * CampusIQ — auth.js  v5
 * Session management + Google OAuth + Registration. Must load after db.js.
 */
'use strict';

const Auth = {
  login(email, password) {
    return asyncOp(() => {
      const user = DB.getUserByEmail(email);
      if (!user)                       throw new Error('No account found with that email.');
      if (user.password !== password)  throw new Error('Incorrect password.');
      const session = { userId: user.id, role: user.role, name: user.name, email: user.email };
      DB.setSession(session);
      return session;
    }, 700);
  },

  register(data) {
    return asyncOp(() => {
      if (!data.name  || !String(data.name).trim())   throw new Error('Name is required.');
      if (!data.email || !String(data.email).trim())  throw new Error('Email is required.');
      if (!data.password || data.password.length < 6) throw new Error('Password must be at least 6 characters.');
      if (!data.role) throw new Error('Role is required.');

      const result  = DB.createUser(data);
      const session = { userId: result.user.id, role: result.user.role, name: result.user.name, email: result.user.email };
      DB.setSession(session);
      return result;
    }, 900);
  },

  logout() { DB.clearSession(); window.location.href = 'index.html'; },

  guard(requiredRole) {
    const s = DB.getSession();
    if (!s) { window.location.href = 'index.html'; return null; }
    if (requiredRole && s.role !== requiredRole) { window.location.href = 'index.html'; return null; }
    return s;
  },

  handleGoogleCredential(credential, allowedDomain = '') {
    try {
      const parts = credential.split('.');
      if (parts.length !== 3) throw new Error('Invalid credential format.');
      const pad     = parts[1].replace(/-/g,'+').replace(/_/g,'/');
      const payload = JSON.parse(atob(pad + '=='.slice((pad.length % 4) || 4)));
      const email   = (payload.email || '').toLowerCase().trim();
      const name    = payload.name   || email.split('@')[0];

      if (!email) throw new Error('Could not read email from Google account.');
      if (allowedDomain && !email.endsWith('@' + allowedDomain))
        throw new Error('Only @' + allowedDomain + ' accounts are allowed.');

      let user = DB.getUserByEmail(email);
      if (!user) {
        const r = DB.createUser({
          name, email,
          password:  '_google_oauth_' + Date.now(),
          role:      'student',
          dept:      'General',
          year:      1,
          rollNo:    'G-' + Date.now().toString(36).toUpperCase(),
          section:   'A',
          gpa:       0,
          phone:     '', linkedIn: '', githubUrl: '',
        });
        user = r.user;
      }

      const session = { userId: user.id, role: user.role, name: user.name, email: user.email };
      DB.setSession(session);
      return session;
    } catch(e) {
      throw new Error('Google sign-in failed: ' + e.message);
    }
  },
};
