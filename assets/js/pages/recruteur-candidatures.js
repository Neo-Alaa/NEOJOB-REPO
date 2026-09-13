/* NeoJob — recruteur/candidatures-recues.html page logic (Kanban pipeline) */

(async () => {
  const session = await Auth.guardPage('recruteur', '../');
  if (!session) return;

  await NeoComponents.renderHeader({ rootPrefix: '../' });
  NeoComponents.renderSidebar({ role: 'recruteur', active: 'candidatures' });

  const company = await Companies.getByUserId(session.userId);
  const myJobs = await Jobs.getByCompany(company.id);
  const myJobIds = myJobs.map(j => j.id);
  const myJobById = new Map(myJobs.map(j => [j.id, j]));

  const MODE_LABELS = { video: 'Vidéo (visioconférence)', presentiel: 'Présentiel', telephone: 'Téléphone' };

  const jobFilter = document.getElementById('job-filter');
  const boardEl = document.getElementById('kanban-board');
  const emptyEl = document.getElementById('applications-empty');

  const detailModalEl = document.getElementById('detailModal');
  const detailModal = new bootstrap.Modal(detailModalEl);
  const interviewModalEl = document.getElementById('interviewModal');
  const interviewModal = new bootstrap.Modal(interviewModalEl);
  let activeAppId = null;
  let activeInterviewAppId = null;

  // Populated fresh at the top of every render() so the synchronous HTML
  // builders below (cardHtml/columnHtml) don't need to be async themselves.
  let candidateById = new Map();
  let interviewByAppId = new Map();

  jobFilter.innerHTML += myJobs.map(j => `<option value="${j.id}">${NeoUI.escapeHtml(j.titre)}</option>`).join('');

  const params = new URLSearchParams(window.location.search);
  if (params.get('offre_id')) jobFilter.value = params.get('offre_id');

  async function filteredApps(){
    const all = await Applications.getAll();
    let apps = all.filter(a => myJobIds.includes(a.jobId));
    if (jobFilter.value) apps = apps.filter(a => a.jobId === Number(jobFilter.value));
    return apps;
  }

  function interviewBadge(interview){
    if (!interview) return '';
    if (interview.statut === 'confirmee'){
      return `<div class="mt-2"><span class="pill pill-mint small"><i class="bi bi-calendar-check"></i> ${NeoUI.formatDateTime(interview.selectedSlot)}</span></div>`;
    }
    if (interview.statut === 'annulee') return '';
    return `<div class="mt-2"><span class="pill pill-muted small"><i class="bi bi-hourglass-split"></i> En attente du candidat</span></div>`;
  }

  function cardHtml(app){
    const job = myJobById.get(app.jobId);
    const candidate = candidateById.get(app.candidateId);
    const name = candidate ? `${candidate.prenom} ${candidate.nom}` : 'Candidat';
    const interview = interviewByAppId.get(app.id);
    const showScheduleBtn = app.statut === 'entretien' && !interview;

    return `
      <div class="kanban-card" draggable="true" data-app-id="${app.id}">
        <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
          <div class="d-flex align-items-center gap-2 overflow-hidden">
            ${NeoUI.avatarHtml(candidate ? candidate.photo : null, name, 'width:28px;height:28px;font-size:.65rem;flex-shrink:0;')}
            <span class="small fw-semibold text-truncate">${NeoUI.escapeHtml(name)}</span>
          </div>
          <div class="dropdown">
            <button class="kanban-move-btn" type="button" data-bs-toggle="dropdown" aria-label="Déplacer la candidature">
              <i class="bi bi-three-dots-vertical"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end panel border-0 py-1">
              ${NeoUI.APP_PIPELINE_ORDER.filter(s => s !== app.statut).map(s => `
                <li><a class="dropdown-item small move-item" href="#" data-app-id="${app.id}" data-target-status="${s}">→ ${NeoUI.APP_STATUS[s].label}</a></li>
              `).join('')}
            </ul>
          </div>
        </div>
        ${!jobFilter.value ? `<div class="text-muted-soft small text-truncate mb-1">${NeoUI.escapeHtml(job ? job.titre : '—')}</div>` : ''}
        <div class="text-muted-soft small"><i class="bi bi-calendar3 me-1"></i>${NeoUI.formatDate(app.dateCandidature)}</div>
        ${interviewBadge(interview)}
        ${showScheduleBtn ? `<button type="button" class="btn btn-neo-outline btn-sm w-100 mt-2 schedule-btn" data-app-id="${app.id}"><i class="bi bi-calendar-plus me-1"></i>Planifier un entretien</button>` : ''}
      </div>
    `;
  }

  function columnHtml(status, apps){
    const meta = NeoUI.APP_STATUS[status];
    const sorted = apps.slice().sort((a,b) => new Date(b.updatedAt || b.dateCandidature) - new Date(a.updatedAt || a.dateCandidature));
    return `
      <div class="kanban-column">
        <div class="kanban-column-header">
          <span>${meta.label}</span>
          <span class="pill ${meta.pill}">${apps.length}</span>
        </div>
        <div class="kanban-cards" data-status="${status}">
          ${sorted.length ? sorted.map(cardHtml).join('') : `<div class="text-muted-soft small text-center py-4">Aucune candidature</div>`}
        </div>
      </div>
    `;
  }

  async function render(){
    if (!myJobs.length){
      boardEl.style.display = 'none';
      emptyEl.style.display = 'block';
      emptyEl.innerHTML = `<div class="empty-state py-4"><i class="bi bi-inbox"></i>Vous n'avez publié aucune offre pour le moment.</div>`;
      return;
    }

    boardEl.style.display = '';
    emptyEl.style.display = 'none';

    const apps = await filteredApps();

    const candidateIds = [...new Set(apps.map(a => a.candidateId))];
    const [candidates, interviews] = await Promise.all([
      Promise.all(candidateIds.map(id => Candidates.getById(id))),
      Promise.all(apps.map(a => Interviews.getByApplication(a.id))),
    ]);
    candidateById = new Map(candidateIds.map((id, i) => [id, candidates[i]]));
    interviewByAppId = new Map(apps.map((a, i) => [a.id, interviews[i]]));

    boardEl.innerHTML = NeoUI.APP_PIPELINE_ORDER.map(status => columnHtml(status, apps.filter(a => a.statut === status))).join('');
    wireBoard();
  }

  async function moveApplication(appId, newStatus){
    const app = await Applications.getById(appId);
    if (!app || app.statut === newStatus) return;
    await Applications.updateStatus(appId, newStatus);
    if (newStatus === 'embauchee') NeoUI.confetti();
    NeoUI.toast(`Candidature déplacée vers « ${NeoUI.APP_STATUS[newStatus].label} ».`, 'success');
    render();
  }

  function wireBoard(){
    boardEl.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('dragstart', () => {
        card.classList.add('dragging');
        card.dataset.dragging = '1';
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
      card.addEventListener('click', (e) => {
        if (e.target.closest('.dropdown') || e.target.closest('.schedule-btn')) return;
        openDetail(Number(card.dataset.appId));
      });
    });

    boardEl.querySelectorAll('.move-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        moveApplication(Number(item.dataset.appId), item.dataset.targetStatus);
      });
    });

    boardEl.querySelectorAll('.schedule-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openInterviewModal(Number(btn.dataset.appId));
      });
    });

    boardEl.querySelectorAll('.kanban-cards').forEach(col => {
      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        col.classList.add('drag-over');
      });
      col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');
        const dragging = boardEl.querySelector('.kanban-card.dragging');
        if (!dragging) return;
        moveApplication(Number(dragging.dataset.appId), col.dataset.status);
      });
    });
  }

  function interviewDetailHtml(interview){
    const modeLabel = MODE_LABELS[interview.mode] || interview.mode;
    const statusHtml = interview.statut === 'confirmee'
      ? `<span class="pill pill-mint mt-1 d-inline-flex"><i class="bi bi-calendar-check"></i> Confirmé : ${NeoUI.formatDateTime(interview.selectedSlot)}</span>`
      : `<span class="pill pill-muted mt-1 d-inline-flex">En attente du choix du candidat (${interview.slots.length} créneau${interview.slots.length > 1 ? 'x' : ''} proposé${interview.slots.length > 1 ? 's' : ''})</span>`;
    return `
      <h6 class="small text-muted-soft text-uppercase mb-2 mt-4">Entretien</h6>
      <p class="small mb-1">${modeLabel}${interview.lieuOuLien ? ` — ${NeoUI.escapeHtml(interview.lieuOuLien)}` : ''}</p>
      ${statusHtml}
    `;
  }

  async function openDetail(appId){
    activeAppId = appId;
    const app = await Applications.getById(appId);
    const job = await Jobs.getById(app.jobId);
    const candidate = await Candidates.getById(app.candidateId);

    const candidateName = candidate ? `${candidate.prenom} ${candidate.nom}` : 'Candidat';
    document.getElementById('detail-candidate-header').innerHTML =
      NeoUI.avatarHtml(candidate ? candidate.photo : null, candidateName, 'width:38px;height:38px;font-size:.85rem;') +
      `<h5 class="modal-title mb-0" id="detail-candidate-name">${NeoUI.escapeHtml(candidateName)}</h5>`;
    document.getElementById('detail-meta').innerHTML = `
      <span class="pill pill-cyan">${NeoUI.escapeHtml(job ? job.titre : '—')}</span>
      ${candidate && candidate.ville ? `<span class="pill pill-violet"><i class="bi bi-geo-alt"></i> ${NeoUI.escapeHtml(candidate.ville)}</span>` : ''}
      ${candidate && candidate.telephone ? `<span class="pill pill-muted"><i class="bi bi-telephone"></i> ${NeoUI.escapeHtml(candidate.telephone)}</span>` : ''}
      ${NeoUI.statusPill(NeoUI.APP_STATUS, app.statut)}
    `;
    document.getElementById('detail-message').textContent = app.lettreMotivation || '—';
    document.getElementById('detail-cv').textContent = app.cvName ? `📄 ${app.cvName}` : "Aucun CV joint (simulation).";

    const sel = document.getElementById('detail-status-select');
    sel.innerHTML = NeoUI.APP_PIPELINE_ORDER.map(s => `<option value="${s}" ${s === app.statut ? 'selected' : ''}>${NeoUI.APP_STATUS[s].label}</option>`).join('');

    const interview = await Interviews.getByApplication(app.id);
    document.getElementById('detail-interview-info').innerHTML = interview ? interviewDetailHtml(interview) : '';
    document.getElementById('detail-schedule-btn').innerHTML = interview
      ? '<i class="bi bi-calendar-event me-1"></i>Modifier l\'entretien'
      : '<i class="bi bi-calendar-plus me-1"></i>Planifier un entretien';

    renderMessages();
    detailModal.show();
  }

  async function renderMessages(){
    const threadEl = document.getElementById('messages-thread');
    threadEl.innerHTML = NeoUI.messageThreadHtml(await Messages.getByApplication(activeAppId), 'recruteur');
    threadEl.scrollTop = threadEl.scrollHeight;
  }

  document.getElementById('message-send-btn').addEventListener('click', async () => {
    const input = document.getElementById('message-input');
    const body = input.value.trim();
    if (!body || !activeAppId) return;
    await Messages.create({ applicationId: activeAppId, senderRole: 'recruteur', body });
    input.value = '';
    renderMessages();
  });

  document.getElementById('detail-update-btn').addEventListener('click', () => {
    const sel = document.getElementById('detail-status-select');
    moveApplication(activeAppId, sel.value);
    detailModal.hide();
  });

  document.getElementById('detail-schedule-btn').addEventListener('click', () => {
    const appId = activeAppId;
    // Swapping straight to hide()-then-show() and relying on the
    // "hidden.bs.modal" transition-end event to chain the two modals is
    // fragile: Bootstrap can leave the first modal's backdrop behind if the
    // second is shown before its own hide transition has fully settled.
    // Tearing the first modal down synchronously (no animation) sidesteps
    // that timing entirely and guarantees the swap is clean either way.
    detailModal.hide();
    detailModalEl.classList.remove('show');
    detailModalEl.style.display = 'none';
    detailModalEl.setAttribute('aria-hidden', 'true');
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('padding-right');
    document.body.style.removeProperty('overflow');
    openInterviewModal(appId);
  });

  async function openInterviewModal(appId){
    activeInterviewAppId = appId;
    const existing = await Interviews.getByApplication(appId);
    document.getElementById('iv-mode').value = existing ? existing.mode : 'video';
    document.getElementById('iv-lieu').value = existing ? (existing.lieuOuLien || '') : '';
    ['iv-slot-1', 'iv-slot-2', 'iv-slot-3'].forEach((id, i) => {
      document.getElementById(id).value = existing && existing.slots[i] ? existing.slots[i] : '';
    });
    interviewModal.show();
  }

  document.getElementById('interview-submit-btn').addEventListener('click', async () => {
    if (!activeInterviewAppId) return;
    const app = await Applications.getById(activeInterviewAppId);
    if (!app) return;

    const mode = document.getElementById('iv-mode').value;
    const lieuOuLien = document.getElementById('iv-lieu').value.trim();
    const slots = ['iv-slot-1', 'iv-slot-2', 'iv-slot-3'].map(id => document.getElementById(id).value).filter(Boolean);

    if (!slots.length){
      NeoUI.toast('Merci de proposer au moins un créneau.', 'warning');
      return;
    }

    const existing = await Interviews.getByApplication(activeInterviewAppId);
    if (existing){
      await Interviews.update(existing.id, { mode, lieuOuLien, slots, selectedSlot: null, statut: 'proposee' });
    } else {
      await Interviews.create({ applicationId: activeInterviewAppId, jobId: app.jobId, candidateId: app.candidateId, companyId: company.id, mode, lieuOuLien, slots });
    }

    interviewModal.hide();
    NeoUI.toast("Créneaux d'entretien envoyés au candidat.", 'success');
    render();
  });

  jobFilter.addEventListener('change', render);

  render();
})();
