/**
 * CampusIQ — auth.js (Production Refactor)
 * Handles token generation, password hashing, Google OAuth JWT parsing, and Guards.
 */
'use strict';

const Auth = {
  // Secret key simulation for mock JWT signature
  _SECRET: 'ciq_prod_auth_secret_x99',

  /**
   * One-way Hashing Simulation for frontend security.
   * Matches the seeding logic in db.js.
   */
  _hash(s) {
    if (!s) return '';
    let h = 0; 
    for(let i = 0; i < s.length; i++) {
        h = ((h << 5) - h) + s.charCodeAt(i);
        h |= 0;
    }
    return 'ciq_hash_' + Math.abs(h);
  },

  /**
   * Generates a mock JWT session token to prevent manual localStorage tampering.
   */
  _generateToken(user) {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ id: user.id, role: user.role, exp: Date.now() + 86400000 }));
    const signature = this._hash(header + '.' + payload + this._SECRET);
    return `${header}.${payload}.${signature}`;
  },

  async login(email, password) {
    return asyncOp(() => { // asyncOp comes from utils.js
      if (!email || !password) throw new Error('Email and Password are required.');
      
      const user = DB.getUserByEmail(email);
      if (!user) throw new Error('Invalid credentials.');

      const hashedInput = this._hash(password);
      if (user.password !== hashedInput) throw new Error('Invalid credentials.');

      const token = this._generateToken(user);
      const session = { userId: user.id, role: user.role, name: user.name, email: user.email, token };
      
      DB.setSession(session);
      return session;
    }, 800);
  },

  async register(data) {
    return asyncOp(() => {
      if (!data.name?.trim()) throw new Error('Full name is required.');
      if (!data.email?.includes('@')) throw new Error('A valid email is required.');
      if (data.password?.length < 6) throw new Error('Password must be 6+ characters.');

      // Secure the password before Database storage
      data.password = this._hash(data.password);
      
      const result = DB.createUser(data);
      const token = this._generateToken(result.user);
      const session = { userId: result.user.id, role: result.user.role, name: result.user.name, email: result.user.email, token };
      
      DB.setSession(session);
      return result;
    }, 1000);
  },

  logout() {
    DB.clearSession();
    window.location.href = 'index.html';
  },

  /**
   * Verifies the user's mock JWT token signature before granting access to portal pages.
   */
  guard(requiredRole) {
    const s = DB.getSession();
    if (!s || !s.token) {
      window.location.href = 'index.html';
      return null;
    }

    const parts = s.token.split('.');
    if (parts.length !== 3 || this._hash(parts[0] + '.' + parts[1] + this._SECRET) !== parts[2]) {
      console.error("Session token validation failed. Possible tampering.");
      this.logout();
      return null;
    }

    if (requiredRole && s.role !== requiredRole) {
      window.location.href = 'index.html';
      return null;
    }
    return s;
  },

  /**
   * Fully parses Google Identity Services credential (JWT) and auto-provisions user.
   */
  handleGoogleCredential(credential) {
    try {
      const parts = credential.split('.');
      if (parts.length !== 3) throw new Error('Malformed Google token.');
      
      // Decode JWT Payload safely
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      const payload = JSON.parse(jsonPayload);
      
      const email = payload.email.toLowerCase();
      let user = DB.getUserByEmail(email);
      
      // Auto-Provision Student Account
      if (!user) {
        const result = DB.createUser({
          name: payload.name, email,
          password: '_oauth_managed_' + Date.now(), // Irrelevant since they use Google
          role: 'student'
        });
        user = result.user;
      }

      const token = this._generateToken(user);
      const session = { userId: user.id, role: user.role, name: user.name, email: user.email, token };
      DB.setSession(session);
      return session;
    } catch (e) {
      console.error('OAuth Error:', e);
      throw new Error('Google Sign-In failed. Please try again.');
    }
  }
};
