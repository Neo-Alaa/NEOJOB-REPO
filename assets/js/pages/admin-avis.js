/* NeoJob — admin/avis.html page logic (review moderation) */

(async () => {
  const session = await Auth.guardPage('admin', '../');
  if (!session) return;

  await NeoComponents.renderHeader({ rootPrefix: '../' });
  NeoComponents.renderSidebar({ role: 'admin', active: 'avis' });

  const tabs = document.querySelectorAll('#status-tabs [data-status]');
  const tbody = document.getElementById('reviews-body');
  const emptyEl = document.getElementById('reviews-empty');
  const tableWrap = document.querySelector('.table-responsive');
  const reviewModalEl = document.getElementById('reviewModal');
  const reviewModal = new bootstrap.Modal(reviewModalEl);
  let activeReviewId = null;
  let currentStatus = 'en_attente';

  const STATUS_LABEL = { en_attente: 'En attente', publiee: 'Publié', rejetee: 'Rejeté' };
  const STATUS_PILL = { en_attente: 'pill-orange', publiee: 'pill-mint', rejetee: 'pill-danger' };

  async function render(){
    let [reviews, companies] = await Promise.all([Reviews.getAll(), Companies.getAll()]);
    const companyById = new Map(companies.map(c => [c.id, c]));
    if (currentStatus) reviews = reviews.filter(r => r.statut === currentStatus);
    reviews.sort((a,b) => new Date(b.dateCreation) - new Date(a.dateCreation));

    if (!reviews.length){
      tableWrap.style.display = 'none';
      emptyEl.style.display = 'block';
      emptyEl.innerHTML = `<div class="empty-state py-4"><i class="bi bi-chat-square-text"></i>Aucun avis dans cette catégorie.</div>`;
      return;
    }

    tableWrap.style.display = '';
    emptyEl.style.display = 'none';

    tbody.innerHTML = reviews.map(r => {
      const company = companyById.get(r.companyId);
      return `
        <tr>
          <td>${NeoUI.escapeHtml(r.titre)}</td>
          <td class="text-muted-soft">${NeoUI.escapeHtml(company ? company.nom : '—')}</td>
          <td>${NeoUI.starsHtml(r.noteGlobale)}</td>
          <td class="text-muted-soft">${NeoUI.formatDate(r.dateCreation)}</td>
          <td><span class="pill ${STATUS_PILL[r.statut]}">${STATUS_LABEL[r.statut]}</span></td>
          <td class="text-end"><button type="button" class="btn btn-neo-outline btn-sm view-review-btn" data-id="${r.id}">Voir <i class="bi bi-arrow-right"></i></button></td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.view-review-btn').forEach(btn => {
      btn.addEventListener('click', () => openReview(Number(btn.dataset.id)));
    });
  }

  async function openReview(id){
    activeReviewId = id;
    const r = await Reviews.getById(id);
    const company = await Companies.getById(r.companyId);
    const candidate = await Candidates.getById(r.candidateId);

    document.getElementById('review-modal-title').textContent = r.titre;
    document.getElementById('review-modal-body').innerHTML = `
      <div class="d-flex flex-wrap gap-2 mb-3">
        <span class="pill pill-cyan">${NeoUI.escapeHtml(company ? company.nom : '—')}</span>
        <span class="pill pill-muted">${NeoUI.escapeHtml(r.posteLibelle || 'Anonyme')}</span>
        <span class="pill ${r.recommande ? 'pill-mint' : 'pill-danger'}"><i class="bi ${r.recommande ? 'bi-hand-thumbs-up' : 'bi-hand-thumbs-down'}"></i> ${r.recommande ? 'Recommande' : 'Ne recommande pas'}</span>
      </div>
      <div class="row g-3 mb-3">
        <div class="col-6 col-md-3"><div class="text-muted-soft small">Global</div>${NeoUI.starsHtml(r.noteGlobale)}</div>
        <div class="col-6 col-md-3"><div class="text-muted-soft small">Ambiance</div>${NeoUI.starsHtml(r.noteAmbiance)}</div>
        <div class="col-6 col-md-3"><div class="text-muted-soft small">Rémunération</div>${NeoUI.starsHtml(r.noteRemuneration)}</div>
        <div class="col-6 col-md-3"><div class="text-muted-soft small">Équilibre vie pro/perso</div>${NeoUI.starsHtml(r.noteEquilibre)}</div>
      </div>
      <h6 class="small text-muted-soft text-uppercase mb-1">Avantages</h6>
      <p class="text-secondary-soft">${NeoUI.escapeHtml(r.avantages || '—')}</p>
      <h6 class="small text-muted-soft text-uppercase mb-1">Inconvénients</h6>
      <p class="text-secondary-soft mb-0">${NeoUI.escapeHtml(r.inconvenients || '—')}</p>
      <p class="text-muted-soft small mt-3 mb-0">Déposé par ${candidate ? NeoUI.escapeHtml(`${candidate.prenom} ${candidate.nom}`) : 'un candidat'} (masqué publiquement) le ${NeoUI.formatDate(r.dateCreation)}.</p>
    `;

    reviewModal.show();
  }

  reviewModalEl.querySelectorAll('[data-status]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!activeReviewId) return;
      if (btn.dataset.status === 'publiee') await Reviews.approve(activeReviewId);
      else await Reviews.reject(activeReviewId);
      NeoUI.toast('Statut de l\'avis mis à jour.', 'success');
      reviewModal.hide();
      render();
    });
  });

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentStatus = tab.dataset.status;
      render();
    });
  });

  render();
})();
