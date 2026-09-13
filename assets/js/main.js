/* ==========================================================================
   NeoJob — Shared UI helpers (main.js)
   Toasts, confirm dialogs, formatting helpers used across every page.
   ========================================================================== */

/** Dark/light preference. The actual attribute is applied a second time (and
 *  earlier) by a small inline script in every page's <head> — before this
 *  file loads — so there's no flash of the wrong theme; this object is the
 *  one place that reads/writes the stored choice afterwards (e.g. from the
 *  Paramètres page, or to reflect the current choice back into a toggle). */
const NeoTheme = {
  KEY: 'neojob_theme',
  get(){
    try{ return localStorage.getItem(this.KEY) === 'light' ? 'light' : 'dark'; }
    catch(e){ return 'dark'; }
  },
  set(theme){
    try{ localStorage.setItem(this.KEY, theme); }catch(e){}
    if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
  },
};

/** Ctrl+K / Cmd+K command palette — searches jobs, companies (everyone) and
 *  candidates (recruteur/admin only, matching the CVthèque's own access
 *  rule) from anywhere on the site. Lives outside any single page's markup
 *  since it needs to work identically everywhere. */
const NeoPalette = (() => {

  function rootPrefix(){
    const p = window.location.pathname;
    return (/\/(candidat|recruteur|admin)\//.test(p)) ? '../' : '';
  }

  function ensureModal(){
    let modal = document.getElementById('neo-command-palette');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'neo-command-palette';
    modal.className = 'command-palette-overlay';
    modal.innerHTML = `
      <div class="command-palette-box">
        <div class="input-icon-group">
          <i class="bi bi-search"></i>
          <input type="text" id="neo-command-input" class="form-control" placeholder="Rechercher une offre, une entreprise...">
          <kbd class="command-esc-hint">Échap</kbd>
        </div>
        <div id="neo-command-results" class="command-palette-results"></div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    modal.querySelector('#neo-command-input').addEventListener('input', (e) => { renderResults(e.target.value); });
    return modal;
  }

  function section(title, rows){
    if (!rows.length) return '';
    return `<div class="command-section"><div class="command-section-title">${title}</div>${rows.join('')}</div>`;
  }

  function row(icon, title, subtitle, url){
    return `<a class="command-result" href="${url}">
      <i class="bi ${icon}"></i>
      <span class="flex-grow-1 overflow-hidden">
        <div class="text-truncate">${NeoUI.escapeHtml(title)}</div>
        ${subtitle ? `<div class="text-muted-soft text-truncate" style="font-size:.75rem;">${NeoUI.escapeHtml(subtitle)}</div>` : ''}
      </span>
    </a>`;
  }

  async function renderResults(query){
    const resultsEl = document.getElementById('neo-command-results');
    const prefix = rootPrefix();
    const session = typeof Auth !== 'undefined' ? await Auth.current() : null;
    const q = query.trim().toLowerCase();

    if (!q){
      const quick = [
        row('bi-briefcase', 'Voir les offres', '', `${prefix}offres.html`),
        row('bi-speedometer2', 'Mon tableau de bord', '', `${prefix}${session ? Auth.spaceHome(session.role) : 'login.html'}`),
        row('bi-gear', 'Paramètres', '', `${prefix}parametres.html`),
        row('bi-cash-coin', 'Tarifs recruteurs', '', `${prefix}tarifs.html`),
      ];
      resultsEl.innerHTML = section('Accès rapide', quick);
      return;
    }

    let html = '';

    if (typeof Jobs !== 'undefined'){
      const allJobs = await Jobs.getPublished();
      const matchingJobs = allJobs.filter(j => j.titre.toLowerCase().includes(q)).slice(0, 5);
      const jobs = await Promise.all(matchingJobs.map(async j => {
        const company = await Companies.getById(j.companyId);
        return row('bi-briefcase', j.titre, company ? company.nom : '', `${prefix}offre-detail.html?id=${j.id}`);
      }));
      html += section('Offres', jobs);
    }

    if (typeof Companies !== 'undefined'){
      const allCompanies = await Companies.getAll();
      const companies = allCompanies.filter(c => c.nom.toLowerCase().includes(q)).slice(0, 5)
        .map(c => row('bi-building', c.nom, c.secteur || '', `${prefix}entreprise.html?id=${c.id}`));
      html += section('Entreprises', companies);
    }

    if (session && (session.role === 'recruteur' || session.role === 'admin') && typeof Candidates !== 'undefined'){
      const allCandidates = await Candidates.getAll();
      const candidates = allCandidates.filter(c => `${c.prenom} ${c.nom}`.toLowerCase().includes(q)).slice(0, 5)
        .map(c => row('bi-person', `${c.prenom} ${c.nom}`, c.ville || '', `${prefix}candidat-profil.html?id=${c.id}`));
      html += section('Candidats', candidates);
    }

    resultsEl.innerHTML = html || `<div class="text-muted-soft small text-center py-4">Aucun résultat pour « ${NeoUI.escapeHtml(query)} ».</div>`;
  }

  function open(){
    const modal = ensureModal();
    modal.classList.add('open');
    const input = document.getElementById('neo-command-input');
    input.value = '';
    renderResults('');
    setTimeout(() => input.focus(), 30);
  }

  function close(){
    const modal = document.getElementById('neo-command-palette');
    if (modal) modal.classList.remove('open');
  }

  function isOpen(){
    const modal = document.getElementById('neo-command-palette');
    return !!(modal && modal.classList.contains('open'));
  }

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'){
      e.preventDefault();
      isOpen() ? close() : open();
    } else if (e.key === 'Escape' && isOpen()){
      close();
    }
  });

  return { open, close };
})();

const NeoUI = (() => {

  function ensureToastContainer(){
    let c = document.getElementById('neo-toast-container');
    if (!c){
      c = document.createElement('div');
      c.id = 'neo-toast-container';
      c.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      c.style.zIndex = 1080;
      document.body.appendChild(c);
    }
    return c;
  }

  function toast(message, type){
    type = type || 'success';
    const icon = { success: 'bi-check-circle-fill', danger: 'bi-x-circle-fill', info: 'bi-info-circle-fill', warning: 'bi-exclamation-triangle-fill' }[type] || 'bi-info-circle-fill';
    const color = { success: 'var(--mint)', danger: 'var(--danger)', info: 'var(--cyan)', warning: 'var(--orange)' }[type] || 'var(--cyan)';
    const container = ensureToastContainer();
    const el = document.createElement('div');
    el.className = 'toast toast-neo align-items-center border-0 mb-2';
    el.setAttribute('role', 'alert');
    el.innerHTML = `
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="bi ${icon}" style="color:${color};"></i> ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>`;
    container.appendChild(el);
    const t = new bootstrap.Toast(el, { delay: 3200 });
    t.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
  }

  function ensureConfirmModal(){
    let m = document.getElementById('neo-confirm-modal');
    if (!m){
      m = document.createElement('div');
      m.id = 'neo-confirm-modal';
      m.className = 'modal fade';
      m.tabIndex = -1;
      m.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content panel border-0">
            <div class="modal-body p-4">
              <div class="d-flex align-items-start gap-3">
                <i class="bi bi-exclamation-triangle-fill fs-3" style="color:var(--orange);"></i>
                <div>
                  <h6 class="mb-1" id="neo-confirm-title">Confirmer l'action</h6>
                  <p class="text-muted-soft small mb-0" id="neo-confirm-message">Êtes-vous sûr ?</p>
                </div>
              </div>
            </div>
            <div class="modal-footer border-0 pt-0">
              <button type="button" class="btn btn-neo-ghost btn-sm" data-bs-dismiss="modal" id="neo-confirm-cancel">Annuler</button>
              <button type="button" class="btn btn-danger-soft btn-sm" id="neo-confirm-ok">Confirmer</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(m);
    }
    return m;
  }

  function confirmDialog(message, title){
    return new Promise((resolve) => {
      const modalEl = ensureConfirmModal();
      modalEl.querySelector('#neo-confirm-message').textContent = message || 'Êtes-vous sûr ?';
      modalEl.querySelector('#neo-confirm-title').textContent = title || "Confirmer l'action";
      const modal = new bootstrap.Modal(modalEl);
      const okBtn = modalEl.querySelector('#neo-confirm-ok');

      const onOk = () => { modal.hide(); resolve(true); cleanup(); };
      const onHide = () => { resolve(false); cleanup(); };
      function cleanup(){
        okBtn.removeEventListener('click', onOk);
        modalEl.removeEventListener('hidden.bs.modal', onHide);
      }
      okBtn.addEventListener('click', onOk);
      modalEl.addEventListener('hidden.bs.modal', onHide);
      modal.show();
    });
  }

  function formatMoney(n){
    if (n === null || n === undefined || n === '') return '—';
    return Number(n).toLocaleString('fr-FR') + ' MAD';
  }

  function formatDate(d){
    if (!d) return '—';
    const date = new Date(d);
    if (isNaN(date)) return d;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatDateTime(d){
    if (!d) return '—';
    const date = new Date(d);
    if (isNaN(date)) return d;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' à ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  const JOB_STATUS = {
    publiee:   { label: 'Publiée',    pill: 'pill-mint' },
    en_attente:{ label: 'En attente', pill: 'pill-orange' },
    rejetee:   { label: 'Rejetée',    pill: 'pill-danger' },
  };

  /* Recruitment pipeline: an application moves left-to-right through these
     stages (or drops to "refusee" at any point). Order here also drives the
     Kanban board's column order on the recruiter's "Candidatures reçues" page. */
  const APP_STATUS = {
    en_attente:   { label: 'Reçue',          pill: 'pill-muted'  },
    preselection: { label: 'Présélection',   pill: 'pill-orange' },
    entretien:    { label: 'Entretien',      pill: 'pill-violet' },
    offre:        { label: 'Offre envoyée',  pill: 'pill-cyan'   },
    embauchee:    { label: 'Embauché(e)',    pill: 'pill-mint'   },
    refusee:      { label: 'Refusée',        pill: 'pill-danger' },
  };
  const APP_PIPELINE_ORDER = ['en_attente', 'preselection', 'entretien', 'offre', 'embauchee', 'refusee'];

  function statusPill(map, key){
    const s = map[key] || { label: key, pill: 'pill-muted' };
    return `<span class="pill ${s.pill}">${s.label}</span>`;
  }

  function initials(name){
    if (!name) return '?';
    return name.trim().split(/\s+/).map(p => p[0]).slice(0,2).join('').toUpperCase();
  }

  /** Renders a circular avatar: the uploaded photo if present, otherwise initials. */
  function avatarHtml(photoUrl, name, styleStr){
    styleStr = styleStr || '';
    if (photoUrl){
      return `<img src="${photoUrl}" class="avatar-img" style="${styleStr}" alt="${escapeHtml(name)}">`;
    }
    return `<span class="avatar-circle" style="${styleStr}">${initials(name)}</span>`;
  }

  function readFileAsDataUrl(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  /** Read-only 5-star display (ratings summaries, review cards). */
  function starsHtml(value, size){
    size = size || '.9rem';
    const rounded = Math.round((value || 0) * 2) / 2; // nearest half-star
    let html = '';
    for (let i = 1; i <= 5; i++){
      const icon = rounded >= i ? 'bi-star-fill' : (rounded >= i - .5 ? 'bi-star-half' : 'bi-star');
      html += `<i class="bi ${icon}" style="color:var(--orange);font-size:${size};"></i>`;
    }
    return html;
  }

  /** Clickable 5-star input. Renders into a container; call wireStarInput()
   *  after inserting it into the DOM to make the stars clickable. */
  function starInputHtml(inputId, currentValue){
    currentValue = currentValue || 0;
    let stars = '';
    for (let i = 1; i <= 5; i++){
      stars += `<i class="bi ${i <= currentValue ? 'bi-star-fill' : 'bi-star'} star-input-icon" data-value="${i}" style="cursor:pointer;font-size:1.3rem;color:var(--orange);margin-right:.2rem;"></i>`;
    }
    return `<div class="star-input" id="${inputId}-stars" data-target="${inputId}">${stars}</div><input type="hidden" id="${inputId}" value="${currentValue}">`;
  }

  function wireStarInput(inputId){
    const wrap = document.getElementById(`${inputId}-stars`);
    const hidden = document.getElementById(inputId);
    if (!wrap || !hidden) return;
    const icons = wrap.querySelectorAll('.star-input-icon');
    function paint(value){
      icons.forEach(icon => {
        const v = Number(icon.dataset.value);
        icon.className = `bi ${v <= value ? 'bi-star-fill' : 'bi-star'} star-input-icon`;
      });
    }
    icons.forEach(icon => {
      icon.addEventListener('click', () => {
        hidden.value = icon.dataset.value;
        paint(Number(icon.dataset.value));
      });
      icon.addEventListener('mouseenter', () => paint(Number(icon.dataset.value)));
    });
    wrap.addEventListener('mouseleave', () => paint(Number(hidden.value)));
  }

  /** Extracts a YouTube video ID from watch/share/embed URL formats and
   *  returns an embeddable URL, or null if the input isn't a YouTube link. */
  /** Renders a message thread as chat bubbles, aligning the viewer's own
   *  messages to the right regardless of whether they're the candidat or
   *  the recruteur side of the conversation. */
  function messageThreadHtml(messages, viewerRole){
    if (!messages.length) return `<p class="text-muted-soft small text-center py-3">Aucun message pour le moment. Lancez la conversation !</p>`;
    return messages.map(m => {
      const isOwn = m.senderRole === viewerRole;
      const label = m.senderRole === 'recruteur' ? 'Recruteur' : 'Candidat';
      return `
        <div class="d-flex ${isOwn ? 'justify-content-end' : 'justify-content-start'} mb-2">
          <div style="max-width:80%;">
            <div class="small text-muted-soft mb-1 ${isOwn ? 'text-end' : ''}">${label} · ${formatDateTime(m.dateEnvoi)}</div>
            <div class="p-2 px-3" style="border-radius:var(--radius-md); background:${isOwn ? 'var(--bg-panel-hover)' : 'var(--bg-panel-alt)'}; border:1px solid var(--border-soft);">
              ${escapeHtml(m.body)}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function youtubeEmbedUrl(url){
    if (!url) return null;
    const match = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  }

  /** % overlap between a candidate's skills and a job's required skills.
   *  Returns null when the job lists no requirements (nothing to score against). */
  function matchScore(candidateSkills, jobSkills){
    const required = (jobSkills || []).map(s => s.toLowerCase());
    if (!required.length) return null;
    const owned = new Set((candidateSkills || []).map(s => s.toLowerCase()));
    const matched = required.filter(s => owned.has(s)).length;
    return Math.round((matched / required.length) * 100);
  }

  function matchScorePill(score){
    if (score === null || score === undefined) return '';
    const tier = score >= 75 ? 'pill-mint' : score >= 40 ? 'pill-cyan' : 'pill-muted';
    return `<span class="pill ${tier}"><i class="bi bi-bullseye"></i> ${score}% compatible</span>`;
  }

  /** A 0-1 weighted checklist rendered as a progress bar + item list.
   *  items: [{ label, done }] */
  function completionWidgetHtml(items){
    const total = items.length || 1;
    const doneCount = items.filter(i => i.done).length;
    const pct = Math.round((doneCount / total) * 100);
    return `
      <div class="d-flex justify-content-between align-items-center mb-2">
        <span class="small text-muted-soft">Profil complété</span>
        <span class="small fw-semibold">${pct}%</span>
      </div>
      <div style="height:8px;border-radius:4px;background:var(--bg-panel-alt);overflow:hidden;" class="mb-3">
        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--cyan),var(--violet));transition:width .3s ease;"></div>
      </div>
      <div class="d-flex flex-column gap-2">
        ${items.map(i => `
          <div class="d-flex align-items-center gap-2 small">
            <i class="bi ${i.done ? 'bi-check-circle-fill' : 'bi-circle'}" style="color:${i.done ? 'var(--mint)' : 'var(--border-strong)'};"></i>
            <span style="color:${i.done ? 'var(--text-primary)' : 'var(--text-muted)'};">${escapeHtml(i.label)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  /** A short on-brand confetti burst — plain DOM + CSS, no external library. */
  function confetti(){
    const colors = ['#5fd8ff', '#9a86ff', '#6df0c0', '#ffb15e'];
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2000;overflow:hidden;';
    document.body.appendChild(container);

    for (let i = 0; i < 60; i++){
      const piece = document.createElement('div');
      const size = 6 + Math.random() * 6;
      const left = Math.random() * 100;
      const duration = 1.6 + Math.random() * 1.2;
      const delay = Math.random() * 0.3;
      const rotate = Math.random() * 360;
      piece.style.cssText = `
        position:absolute; top:-5%; left:${left}%;
        width:${size}px; height:${size * .4}px;
        background:${colors[i % colors.length]};
        opacity:.9; border-radius:2px;
        transform:rotate(${rotate}deg);
        animation:neo-confetti-fall ${duration}s ease-in ${delay}s forwards;
      `;
      container.appendChild(piece);
    }
    setTimeout(() => container.remove(), 3200);
  }

  return { toast, confirmDialog, formatMoney, formatDate, formatDateTime, statusPill, JOB_STATUS, APP_STATUS, APP_PIPELINE_ORDER, initials, escapeHtml, avatarHtml, readFileAsDataUrl, matchScore, matchScorePill, completionWidgetHtml, confetti, starsHtml, starInputHtml, wireStarInput, youtubeEmbedUrl, messageThreadHtml };
})();

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));

  document.querySelectorAll('.password-toggle-btn').forEach(btn => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    btn.addEventListener('click', () => {
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.querySelector('i').className = showing ? 'bi bi-eye' : 'bi bi-eye-slash';
      btn.setAttribute('aria-label', showing ? 'Afficher le mot de passe' : 'Masquer le mot de passe');
    });
  });
});
