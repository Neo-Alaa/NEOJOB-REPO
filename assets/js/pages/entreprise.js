/* NeoJob — entreprise.html page logic */

(async () => {
  await NeoComponents.renderHeader({ rootPrefix: '', active: 'offres' });
  NeoComponents.renderFooter({ rootPrefix: '' });

  const root = document.getElementById('company-root');
  const params = new URLSearchParams(window.location.search);
  const companyId = Number(params.get('id'));
  const company = companyId ? await Companies.getById(companyId) : null;

  const session = await Auth.current();
  const candidate = (session && session.role === 'candidat') ? await Candidates.getByUserId(session.userId) : null;

  if (!company){
    root.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-building-x"></i>
        Cette entreprise n'existe pas.
        <div class="mt-3"><a href="offres.html" class="btn btn-neo-outline btn-sm">Retour aux offres</a></div>
      </div>`;
    return;
  }

  async function renderPage(){
    const [companyJobs, reviews, avgRating] = await Promise.all([
      Jobs.getByCompany(company.id),
      Reviews.getByCompany(company.id, { onlyPublished: true }),
      Reviews.getAverageRating(company.id),
    ]);
    const activeJobs = companyJobs.filter(j => j.statut === 'publiee');
    const alreadyReviewed = !!candidate && await Reviews.hasReviewed(candidate.id, company.id);
    const canReview = !!candidate && !alreadyReviewed;
    const embedUrl = NeoUI.youtubeEmbedUrl(company.videoUrl);
    const photos = company.photos || [];

    root.innerHTML = `
      <nav class="mb-3"><a href="offres.html" class="text-muted-soft small"><i class="bi bi-arrow-left me-1"></i>Retour aux offres</a></nav>

      <div class="panel p-4 p-md-5 mb-4">
        <div class="d-flex align-items-center gap-4 flex-wrap">
          ${NeoComponents.companyBadgeHtml(company.logo, company.nom, 'width:72px;height:72px;font-size:1.4rem;')}
          <div class="flex-grow-1">
            <h1 class="h4 mb-1">
              ${NeoUI.escapeHtml(company.nom)}
              ${company.verified ? '<i class="bi bi-patch-check-fill" style="color:var(--cyan);font-size:.75em;" title="Entreprise vérifiée"></i>' : ''}
            </h1>
            <div class="d-flex flex-wrap align-items-center gap-2">
              ${company.verified ? `<span class="pill pill-cyan"><i class="bi bi-patch-check"></i> Entreprise vérifiée</span>` : ''}
              ${company.secteur ? `<span class="pill pill-cyan">${NeoUI.escapeHtml(company.secteur)}</span>` : ''}
              ${company.ville ? `<span class="pill pill-violet"><i class="bi bi-geo-alt"></i> ${NeoUI.escapeHtml(company.ville)}</span>` : ''}
              ${company.siteWeb ? `<span class="pill pill-muted"><i class="bi bi-link-45deg"></i> ${NeoUI.escapeHtml(company.siteWeb)}</span>` : ''}
              ${avgRating !== null ? `<span class="d-inline-flex align-items-center gap-1">${NeoUI.starsHtml(avgRating)} <span class="small text-muted-soft ms-1">${avgRating} (${reviews.length} avis)</span></span>` : ''}
            </div>
          </div>
        </div>
        ${company.description ? `<p class="text-secondary-soft mt-4 mb-0">${NeoUI.escapeHtml(company.description)}</p>` : ''}
      </div>

      ${embedUrl ? `
        <div class="panel p-3 mb-4">
          <h6 class="mb-3 px-2"><i class="bi bi-camera-reels me-1"></i> Une journée chez ${NeoUI.escapeHtml(company.nom)}</h6>
          <div style="position:relative; padding-top:56.25%; border-radius:var(--radius-md); overflow:hidden;">
            <iframe src="${embedUrl}" style="position:absolute; inset:0; width:100%; height:100%; border:0;" allowfullscreen title="Vidéo entreprise"></iframe>
          </div>
        </div>
      ` : ''}

      ${photos.length ? `
        <div class="panel p-4 mb-4">
          <h6 class="mb-3"><i class="bi bi-images me-1"></i> Photos de l'équipe</h6>
          <div class="row g-2" id="photo-gallery">
            ${photos.map((p, i) => `
              <div class="col-4 col-md-3">
                <img src="${p}" data-index="${i}" class="gallery-thumb" style="width:100%; height:110px; object-fit:cover; border-radius:var(--radius-sm); cursor:pointer; border:1px solid var(--border-soft);">
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="panel p-4 mb-4">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <h6 class="mb-0"><i class="bi bi-chat-square-text me-1"></i> Avis des employés (${reviews.length})</h6>
          ${canReview ? `<button type="button" class="btn btn-neo-primary btn-sm" id="open-review-btn">Laisser un avis</button>` : ''}
          ${alreadyReviewed ? `<span class="pill pill-mint"><i class="bi bi-check-circle"></i> Vous avez déjà laissé un avis</span>` : ''}
        </div>
        <div class="d-flex flex-column gap-3" id="reviews-list"></div>
      </div>

      <h6 class="mb-3">Offres actives (${activeJobs.length})</h6>
      <div class="row g-4" id="company-jobs"></div>
    `;

    document.getElementById('company-jobs').innerHTML = activeJobs.length
      ? activeJobs.map(j => NeoComponents.jobCard(j, { rootPrefix: '', company })).join('')
      : `<div class="col-12"><div class="empty-state"><i class="bi bi-briefcase"></i>Aucune offre active pour cette entreprise en ce moment.</div></div>`;

    renderReviewsList(reviews);
    wirePhotoGallery();
    wireReviewButton();
  }

  function renderReviewsList(reviews){
    const listEl = document.getElementById('reviews-list');
    if (!reviews.length){
      listEl.innerHTML = `<div class="empty-state py-4"><i class="bi bi-chat-square"></i>Aucun avis publié pour le moment.</div>`;
      return;
    }
    listEl.innerHTML = reviews.map(r => `
      <div class="p-3" style="border:1px solid var(--border-soft); border-radius:var(--radius-md);">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
          <div>
            <div class="fw-semibold">${NeoUI.escapeHtml(r.titre)}</div>
            <div class="text-muted-soft small">${NeoUI.escapeHtml(r.posteLibelle || 'Employé anonyme')} · ${NeoUI.formatDate(r.dateCreation)}</div>
          </div>
          <div class="text-nowrap">${NeoUI.starsHtml(r.noteGlobale)}</div>
        </div>
        <div class="row g-2 mb-2">
          <div class="col-12"><span class="pill ${r.recommande ? 'pill-mint' : 'pill-danger'}"><i class="bi ${r.recommande ? 'bi-hand-thumbs-up' : 'bi-hand-thumbs-down'}"></i> ${r.recommande ? 'Recommande cette entreprise' : 'Ne recommande pas'}</span></div>
        </div>
        <p class="small mb-1"><i class="bi bi-plus-circle" style="color:var(--mint);"></i> ${NeoUI.escapeHtml(r.avantages)}</p>
        <p class="small mb-0"><i class="bi bi-dash-circle" style="color:var(--danger);"></i> ${NeoUI.escapeHtml(r.inconvenients)}</p>
      </div>
    `).join('');
  }

  function wirePhotoGallery(){
    const lightboxImg = document.getElementById('lightbox-img');
    document.querySelectorAll('.gallery-thumb').forEach(img => {
      img.addEventListener('click', () => {
        lightboxImg.src = img.src;
        new bootstrap.Modal(document.getElementById('photoLightbox')).show();
      });
    });
  }

  function wireReviewButton(){
    const openBtn = document.getElementById('open-review-btn');
    if (!openBtn) return;

    openBtn.addEventListener('click', () => {
      ['rv-global', 'rv-ambiance', 'rv-remuneration', 'rv-equilibre'].forEach(id => {
        document.getElementById(`${id}-wrap`).innerHTML = NeoUI.starInputHtml(id, id === 'rv-global' ? 5 : 4);
        NeoUI.wireStarInput(id);
      });
      document.getElementById('review-form').reset();
      document.getElementById('rv-recommande').checked = true;
      new bootstrap.Modal(document.getElementById('reviewFormModal')).show();
    });
  }

  document.getElementById('review-submit-btn').addEventListener('click', async () => {
    if (!candidate) return;

    const titre = document.getElementById('rv-titre').value.trim();
    const avantages = document.getElementById('rv-avantages').value.trim();
    const inconvenients = document.getElementById('rv-inconvenients').value.trim();

    if (!titre || !avantages || !inconvenients){
      NeoUI.toast('Merci de remplir le titre, les avantages et les inconvénients.', 'warning');
      return;
    }

    await Reviews.create({
      companyId: company.id,
      candidateId: candidate.id,
      posteLibelle: document.getElementById('rv-poste').value.trim(),
      noteGlobale: Number(document.getElementById('rv-global').value),
      noteAmbiance: Number(document.getElementById('rv-ambiance').value),
      noteRemuneration: Number(document.getElementById('rv-remuneration').value),
      noteEquilibre: Number(document.getElementById('rv-equilibre').value),
      titre,
      avantages,
      inconvenients,
      recommande: document.getElementById('rv-recommande').checked,
    });

    bootstrap.Modal.getInstance(document.getElementById('reviewFormModal')).hide();
    NeoUI.toast('Merci ! Votre avis a été soumis et sera visible après modération.', 'success');
    renderPage();
  });

  renderPage();
})();
