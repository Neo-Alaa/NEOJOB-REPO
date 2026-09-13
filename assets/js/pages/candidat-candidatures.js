/* NeoJob — candidat/candidatures.html page logic */

(async () => {
  const session = await Auth.guardPage('candidat', '../');
  if (!session) return;

  await NeoComponents.renderHeader({ rootPrefix: '../' });
  NeoComponents.renderSidebar({ role: 'candidat', active: 'candidatures' });

  const candidate = await Candidates.getByUserId(session.userId);
  const filterEl = document.getElementById('status-filter');
  const tbody = document.getElementById('applications-body');
  const emptyEl = document.getElementById('applications-empty');
  const tableWrap = document.querySelector('.table-responsive');
  const slotModalEl = document.getElementById('slotModal');
  const slotModal = new bootstrap.Modal(slotModalEl);
  const messageModalEl = document.getElementById('messageModal');
  const messageModal = new bootstrap.Modal(messageModalEl);
  let activeMessageAppId = null;

  function interviewCell(interview){
    if (!interview) return '<span class="text-muted-soft small">—</span>';
    if (interview.statut === 'confirmee'){
      return `<span class="pill pill-mint"><i class="bi bi-calendar-check"></i> ${NeoUI.formatDateTime(interview.selectedSlot)}</span>`;
    }
    if (interview.statut === 'annulee'){
      return `<span class="pill pill-muted">Annulé</span>`;
    }
    return `<button type="button" class="btn btn-neo-primary btn-sm choose-slot-btn" data-interview-id="${interview.id}">Choisir un créneau</button>`;
  }

  async function render(){
    let apps = (await Applications.getByCandidate(candidate.id))
      .slice()
      .sort((a,b) => new Date(b.dateCandidature) - new Date(a.dateCandidature));

    if (filterEl.value) apps = apps.filter(a => a.statut === filterEl.value);

    if (!apps.length){
      tableWrap.style.display = 'none';
      emptyEl.style.display = 'block';
      emptyEl.innerHTML = `<div class="empty-state py-4"><i class="bi bi-send"></i>Aucune candidature à afficher.</div>`;
      return;
    }

    tableWrap.style.display = '';
    emptyEl.style.display = 'none';

    tbody.innerHTML = (await Promise.all(apps.map(async app => {
      const job = await Jobs.getById(app.jobId);
      const company = job ? await Companies.getById(job.companyId) : null;
      const interview = await Interviews.getByApplication(app.id);
      return `
        <tr>
          <td>
            ${job
              ? `<a href="../offre-detail.html?id=${app.jobId}" class="text-decoration-none" style="color:var(--text-primary);">${NeoUI.escapeHtml(job.titre)}</a>`
              : `<span class="text-muted-soft">Offre supprimée</span>`}
          </td>
          <td class="text-muted-soft">${NeoUI.escapeHtml(company ? company.nom : '—')}</td>
          <td class="text-muted-soft">${NeoUI.formatDate(app.dateCandidature)}</td>
          <td>${NeoUI.statusPill(NeoUI.APP_STATUS, app.statut)}</td>
          <td>${interviewCell(interview)}</td>
          <td>
            <button type="button" class="btn btn-neo-outline btn-sm message-btn" data-id="${app.id}" aria-label="Messages" title="Messages">
              <i class="bi bi-chat-dots"></i>
            </button>
          </td>
          <td class="text-end">
            <button type="button" class="btn btn-danger-soft btn-sm withdraw-btn" data-id="${app.id}">
              <i class="bi bi-x-lg"></i> Retirer
            </button>
          </td>
        </tr>
      `;
    }))).join('');

    tbody.querySelectorAll('.withdraw-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await NeoUI.confirmDialog('Voulez-vous vraiment retirer cette candidature ?', 'Retirer la candidature');
        if (!ok) return;
        await Applications.remove(Number(btn.dataset.id));
        NeoUI.toast('Candidature retirée.', 'success');
        render();
      });
    });

    tbody.querySelectorAll('.choose-slot-btn').forEach(btn => {
      btn.addEventListener('click', () => openSlotPicker(Number(btn.dataset.interviewId)));
    });

    tbody.querySelectorAll('.message-btn').forEach(btn => {
      btn.addEventListener('click', () => openMessages(Number(btn.dataset.id)));
    });
  }

  async function openMessages(applicationId){
    activeMessageAppId = applicationId;
    const app = await Applications.getById(applicationId);
    const job = await Jobs.getById(app.jobId);
    document.getElementById('message-modal-job').textContent = job ? job.titre : 'cette candidature';
    await renderMessages();
    messageModal.show();
  }

  async function renderMessages(){
    const threadEl = document.getElementById('messages-thread');
    threadEl.innerHTML = NeoUI.messageThreadHtml(await Messages.getByApplication(activeMessageAppId), 'candidat');
    threadEl.scrollTop = threadEl.scrollHeight;
  }

  document.getElementById('message-send-btn').addEventListener('click', async () => {
    const input = document.getElementById('message-input');
    const body = input.value.trim();
    if (!body || !activeMessageAppId) return;
    await Messages.create({ applicationId: activeMessageAppId, senderRole: 'candidat', body });
    input.value = '';
    renderMessages();
  });

  async function openSlotPicker(interviewId){
    const interview = await Interviews.getById(interviewId);
    if (!interview) return;
    const job = await Jobs.getById(interview.jobId);
    const modeLabel = { video: 'Vidéo (visioconférence)', presentiel: 'Présentiel', telephone: 'Téléphone' }[interview.mode] || interview.mode;
    document.getElementById('slot-modal-meta').innerHTML = `
      Entretien pour « ${NeoUI.escapeHtml(job ? job.titre : 'ce poste')} » · <strong>${modeLabel}</strong><br>
      ${NeoUI.escapeHtml(interview.lieuOuLien || '')}
    `;
    document.getElementById('slot-modal-list').innerHTML = interview.slots.map(slot => `
      <button type="button" class="btn btn-neo-outline text-start slot-pick-btn" data-slot="${slot}">
        <i class="bi bi-calendar-event me-2"></i>${NeoUI.formatDateTime(slot)}
      </button>
    `).join('');
    document.getElementById('slot-modal-list').querySelectorAll('.slot-pick-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        await Interviews.selectSlot(interviewId, btn.dataset.slot);
        slotModal.hide();
        NeoUI.toast('Créneau confirmé ! Bonne chance pour votre entretien.', 'success');
        render();
      });
    });
    slotModal.show();
  }

  filterEl.addEventListener('change', render);
  render();
})();
