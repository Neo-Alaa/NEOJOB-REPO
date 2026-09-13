/* ==========================================================================
   NeoJob — Data Layer (db.js)
   Talks to the PHP/MySQL backend under api/*.php over fetch(). Every helper
   object below (Jobs, Companies, Candidates, ...) keeps the exact same
   method names the whole front-end already calls — only the insides changed
   from localStorage reads to fetch() calls, as planned from day one. Every
   method is now async: callers must `await` them.
   ========================================================================== */

async function apiFetch(url, options){
  const res = await fetch(url, options);
  let data = null;
  try{ data = await res.json(); }catch(e){ /* empty body, e.g. some 204s */ }
  if (!res.ok){
    const err = new Error((data && data.error) || `Erreur réseau (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function apiGet(url){ return apiFetch(url); }
function apiPost(url, body){ return apiFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }); }
function apiPut(url, body){ return apiFetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }); }
function apiDelete(url){ return apiFetch(url, { method: 'DELETE' }); }

/* ---------- Jobs (offres) ---------- */

const Jobs = {
  getAll: () => apiGet('/api/offres.php'),
  getById: (id) => apiGet(`/api/offres.php?id=${id}`),
  getPublished: () => apiGet('/api/offres.php?action=getPublished'),
  getPending: () => apiGet('/api/offres.php?action=getPending'),
  getByCompany: (companyId) => apiGet(`/api/offres.php?action=getByCompany&entrepriseId=${companyId}`),
  create: (job) => apiPost('/api/offres.php', job),
  update: (id, changes) => apiPut('/api/offres.php', Object.assign({ id }, changes)),
  remove: (id) => apiDelete(`/api/offres.php?id=${id}`),
  approve: (id) => apiPut(`/api/offres.php?action=approve&id=${id}`),
  reject: (id) => apiPut(`/api/offres.php?action=reject&id=${id}`),
  recordView: (id) => apiPost(`/api/offres.php?action=recordView&id=${id}`),
};

/* ---------- Companies (entreprises) ---------- */

const FREE_PLAN_JOB_LIMIT = 6;

const Companies = {
  getAll: () => apiGet('/api/entreprises.php'),
  getById: (id) => apiGet(`/api/entreprises.php?id=${id}`),
  getByUserId: (userId) => apiGet(`/api/entreprises.php?action=getByUserId&utilisateurId=${userId}`),
  create: (c) => apiPost('/api/entreprises.php', c),
  update: (id, changes) => apiPut('/api/entreprises.php', Object.assign({ id }, changes)),
  upgradeToPremium: (id) => apiPut(`/api/entreprises.php?action=upgradeToPremium&id=${id}`),
  activeJobCount: (id) => apiGet(`/api/entreprises.php?action=activeJobCount&id=${id}`),
  hasReachedFreeLimit: async (id) => {
    const company = await Companies.getById(id);
    if (!company || company.plan === 'premium') return false;
    const count = await Companies.activeJobCount(id);
    return count >= FREE_PLAN_JOB_LIMIT;
  },
  setVerified: (id, verified) => apiPut(`/api/entreprises.php?action=setVerified&id=${id}`, { verified }),
};

/* ---------- Candidates (candidats) ---------- */

const Candidates = {
  getAll: () => apiGet('/api/candidats.php'),
  getById: (id) => apiGet(`/api/candidats.php?id=${id}`),
  getByUserId: (userId) => apiGet(`/api/candidats.php?action=getByUserId&utilisateurId=${userId}`),
  create: (c) => apiPost('/api/candidats.php', c),
  update: (id, changes) => apiPut('/api/candidats.php', Object.assign({ id }, changes)),
  verifySkill: (id, skillName) => apiPut(`/api/candidats.php?action=verifySkill&id=${id}`, { skill: skillName }),
};

/* ---------- Categories ---------- */

const Categories = {
  getAll: () => apiGet('/api/categories.php'),
  getById: (id) => apiGet(`/api/categories.php?id=${id}`),
  create: (c) => apiPost('/api/categories.php', c),
  update: (id, changes) => apiPut('/api/categories.php', Object.assign({ id }, changes)),
  remove: (id) => apiDelete(`/api/categories.php?id=${id}`),
};

/* ---------- Competences ---------- */

const Competences = {
  getAll: () => apiGet('/api/competences.php'),
  getById: (id) => apiGet(`/api/competences.php?id=${id}`),
  create: (c) => apiPost('/api/competences.php', c),
  update: (id, changes) => apiPut('/api/competences.php', Object.assign({ id }, changes)),
  remove: (id) => apiDelete(`/api/competences.php?id=${id}`),
  findOrCreateByName: async (name) => {
    const trimmed = String(name).trim();
    if (!trimmed) return trimmed;
    const c = await apiGet(`/api/competences.php?action=findOrCreateByName&nom=${encodeURIComponent(trimmed)}`);
    return c.nom;
  },
};

/* ---------- Applications (candidatures) ---------- */

const Applications = {
  getAll: () => apiGet('/api/candidatures.php'),
  getById: (id) => apiGet(`/api/candidatures.php?id=${id}`),
  getByCandidate: (candidateId) => apiGet(`/api/candidatures.php?action=getByCandidate&candidatId=${candidateId}`),
  getByJob: (jobId) => apiGet(`/api/candidatures.php?action=getByJob&offreId=${jobId}`),
  hasApplied: (candidateId, jobId) => apiGet(`/api/candidatures.php?action=hasApplied&candidatId=${candidateId}&offreId=${jobId}`),
  create: (a) => apiPost('/api/candidatures.php', a),
  updateStatus: (id, statut) => apiPut(`/api/candidatures.php?action=updateStatus&id=${id}`, { statut }),
  remove: (id) => apiDelete(`/api/candidatures.php?id=${id}`),
};

/* ---------- Interviews (entretiens) ---------- */

const Interviews = {
  getAll: () => apiGet('/api/entretiens.php'),
  getById: (id) => apiGet(`/api/entretiens.php?id=${id}`),
  getByApplication: (applicationId) => apiGet(`/api/entretiens.php?action=getByApplication&candidatureId=${applicationId}`),
  getByCandidate: (candidateId) => apiGet(`/api/entretiens.php?action=getByCandidate&candidatId=${candidateId}`),
  getByCompany: (companyId) => apiGet(`/api/entretiens.php?action=getByCompany&entrepriseId=${companyId}`),
  create: (i) => apiPost('/api/entretiens.php', i),
  update: (id, changes) => apiPut('/api/entretiens.php', Object.assign({ id }, changes)),
  selectSlot: (id, slot) => apiPut(`/api/entretiens.php?action=selectSlot&id=${id}`, { slot }),
  cancel: (id) => apiPut(`/api/entretiens.php?action=cancel&id=${id}`),
  remove: (id) => apiDelete(`/api/entretiens.php?id=${id}`),
};

/* ---------- Favorites (favoris) ---------- */

const Favorites = {
  getByCandidate: (candidateId) => apiGet(`/api/favoris.php?action=getByCandidate&candidatId=${candidateId}`),
  isFavorite: (candidateId, jobId) => apiGet(`/api/favoris.php?action=isFavorite&candidatId=${candidateId}&offreId=${jobId}`),
  toggle: (candidateId, jobId) => apiPost('/api/favoris.php?action=toggle', { candidateId, jobId }),
};

/* ---------- Payments (paiements) ---------- */

const PREMIUM_PRICE_MAD = 299;

const Payments = {
  getAll: () => apiGet('/api/paiements.php'),
  getByCompany: (companyId) => apiGet(`/api/paiements.php?action=getByCompany&entrepriseId=${companyId}`),
  create: (p) => apiPost('/api/paiements.php', p),
};

/* ---------- Reviews (avis) ---------- */

const Reviews = {
  getAll: () => apiGet('/api/avis.php'),
  getById: (id) => apiGet(`/api/avis.php?id=${id}`),
  getByCompany: (companyId, opts) => {
    opts = opts || {};
    return apiGet(`/api/avis.php?action=getByCompany&entrepriseId=${companyId}&onlyPublished=${opts.onlyPublished ? '1' : '0'}`);
  },
  getPending: () => apiGet('/api/avis.php?action=getPending'),
  hasReviewed: (candidateId, companyId) => apiGet(`/api/avis.php?action=hasReviewed&candidatId=${candidateId}&entrepriseId=${companyId}`),
  create: (r) => apiPost('/api/avis.php', r),
  approve: (id) => apiPut(`/api/avis.php?action=approve&id=${id}`),
  reject: (id) => apiPut(`/api/avis.php?action=reject&id=${id}`),
  remove: (id) => apiDelete(`/api/avis.php?id=${id}`),
  getAverageRating: (companyId) => apiGet(`/api/avis.php?action=getAverageRating&entrepriseId=${companyId}`),
};

/* ---------- Job alerts (alertes) ---------- */

const JobAlerts = {
  getByCandidate: (candidateId) => apiGet(`/api/alertes.php?action=getByCandidate&candidatId=${candidateId}`),
  create: (a) => apiPost('/api/alertes.php', a),
  remove: (id) => apiDelete(`/api/alertes.php?id=${id}`),
  /** Whether a published job satisfies every criterion set on the alert
   *  (empty/falsy criteria are ignored, matching the offres.html filter logic). */
  matches: (alert, job) => {
    if (alert.q){
      const q = alert.q.toLowerCase();
      const inTitle = job.titre.toLowerCase().includes(q);
      const inSkills = (job.competences || []).some(c => c.toLowerCase().includes(q));
      if (!inTitle && !inSkills) return false;
    }
    if (alert.ville && !job.ville.toLowerCase().includes(alert.ville.toLowerCase())) return false;
    if (alert.categoryId && String(job.categoryId) !== String(alert.categoryId)) return false;
    if (alert.competence && !(job.competences || []).includes(alert.competence)) return false;
    if (alert.contrat && job.typeContrat !== alert.contrat) return false;
    if (alert.remote && !job.remote) return false;
    return true;
  },
  getMatchingJobs: async (alert) => {
    const jobs = await Jobs.getPublished();
    return jobs.filter(j => JobAlerts.matches(alert, j));
  },
};

/* ---------- Messages ---------- */

const Messages = {
  getByApplication: (applicationId) => apiGet(`/api/messages.php?action=getByApplication&candidatureId=${applicationId}`),
  create: (m) => apiPost('/api/messages.php', m),
};

/* ---------- Users (utilisateurs) ---------- */

const Users = {
  getAll: () => apiGet('/api/utilisateurs.php'),
  getById: (id) => apiGet(`/api/utilisateurs.php?id=${id}`),
  getByEmail: (email) => apiGet(`/api/utilisateurs.php?action=getByEmail&email=${encodeURIComponent(email)}`),
  update: (id, changes) => apiPut('/api/utilisateurs.php', Object.assign({ id }, changes)),
  remove: (id) => apiDelete(`/api/utilisateurs.php?id=${id}`),
  setStatus: (id, status) => apiPut(`/api/utilisateurs.php?action=setStatus&id=${id}`, { status }),
  markNotificationsSeen: (id) => apiPut(`/api/utilisateurs.php?action=markNotificationsSeen&id=${id}`),
};

/* ---------- File uploads ---------- */

const Uploads = {
  /** Uploads a File object, returns the server-side path to store on the record. */
  async upload(file, kind){
    const form = new FormData();
    form.append('file', file);
    form.append('kind', kind || 'photo');
    const res = await fetch('/api/upload.php', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Échec du téléversement.');
    return data; // { path, name }
  },
};
