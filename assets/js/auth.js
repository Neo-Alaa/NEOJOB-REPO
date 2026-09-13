/* ==========================================================================
   NeoJob — Auth Layer (auth.js)
   Talks to api/auth.php over fetch(); the real session now lives server-side
   in a PHP session (cookie-based), not in localStorage. Every method is
   async — pages awaiting these must run inside an async function.
   ========================================================================== */

const Auth = {
  async login(email, password){
    const res = await fetch('/api/auth.php?action=login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'Erreur de connexion.' };
    return { ok: true, user: data };
  },

  async register(payload){
    const res = await fetch('/api/auth.php?action=register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || "Erreur lors de la création du compte." };
    return { ok: true, user: data };
  },

  async logout(){
    await fetch('/api/auth.php?action=logout');
  },

  async changePassword(currentPassword, newPassword){
    const res = await fetch('/api/auth.php?action=changePassword', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'Erreur.' };
    return { ok: true };
  },

  async current(){
    const res = await fetch('/api/auth.php?action=current');
    if (!res.ok) return null;
    return res.json();
  },

  async isLoggedIn(){ return !!(await this.current()); },

  /** Redirects to login if not authenticated, or to the right space if wrong role.
   *  @param {string|string[]} roles allowed roles for this page, or null for "any logged-in user"
   *  @param {string} rootPrefix relative path prefix to reach the site root (e.g. "../") */
  async guardPage(roles, rootPrefix){
    rootPrefix = rootPrefix || '';
    const session = await this.current();
    if (!session){
      window.location.href = rootPrefix + 'login.html';
      return null;
    }
    if (roles){
      const allowed = Array.isArray(roles) ? roles : [roles];
      if (!allowed.includes(session.role)){
        window.location.href = rootPrefix + this.spaceHome(session.role);
        return null;
      }
    }
    return session;
  },

  spaceHome(role){
    if (role === 'candidat') return 'candidat/dashboard.html';
    if (role === 'recruteur') return 'recruteur/dashboard.html';
    if (role === 'admin') return 'admin/dashboard.html';
    return 'index.html';
  },
};
