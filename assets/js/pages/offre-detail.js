/* NeoJob — offre-detail.html page logic */

(async () => {
  await NeoComponents.renderHeader({ rootPrefix: '', active: 'offres' });
  NeoComponents.renderFooter({ rootPrefix: '' });

  const root = document.getElementById('job-detail-root');
  const params = new URLSearchParams(window.location.search);
  const jobId = Number(params.get('id'));
  const job = jobId ? await Jobs.getById(jobId) : null;

  const session = await Auth.current();
  const candidate = (session && session.role === 'candidat') ? await Candidates.getByUserId(session.userId) : null;

  /* Counts one view per job per browser tab session, not per render/reload,
     so a visitor bouncing between tabs or re-rendering the page doesn't
     inflate the recruiter's stats artificially. */
  if (job){
    try{
      const viewedKey = 'neojob_viewed_jobs';
      const viewed = JSON.parse(sessionStorage.getItem(viewedKey) || '[]');
      if (!viewed.includes(job.id)){
        Jobs.recordView(job.id);
        viewed.push(job.id);
        sessionStorage.setItem(viewedKey, JSON.stringify(viewed));
      }
    }catch(e){ /* sessionStorage unavailable — skip view tracking */ }
  }

  async function ctaBlock(){
    if (!session){
      return `
        <a href="login.html" class="btn btn-neo-primary w-100 mb-2">Se connecter pour postuler</a>
        <p class="text-muted-soft small text-center mb-0">Pas encore de compte ? <a href="register.html" class="text-gradient fw-semibold">Inscrivez-vous</a></p>
      `;
    }

    if (session.role !== 'candidat'){
      return `<div class="pill pill-muted d-inline-flex">Connectez-vous avec un compte candidat pour postuler</div>`;
    }

    if (await Applications.hasApplied(candidate.id, job.id)){
      const apps = await Applications.getByCandidate(candidate.id);
      const app = apps.find(a => a.jobId === job.id);
      return `
        <div class="d-flex align-items-center gap-2 mb-2">
          <i class="bi bi-check-circle-fill" style="color:var(--mint);"></i>
          <span class="fw-semibold">Candidature envoyée</span>
        </div>
        <div>${NeoUI.statusPill(NeoUI.APP_STATUS, app.statut)}</div>
      `;
    }

    return `<button type="button" class="btn btn-neo-primary w-100" id="open-apply-btn">Postuler à cette offre</button>`;
  }

  async function similarJobsHtml(){
    const published = await Jobs.getPublished();
    const similar = published.filter(j => j.categoryId === job.categoryId && j.id !== job.id).slice(0, 3);
    if (!similar.length) return '';

    const companies = await Companies.getAll();
    const companyById = new Map(companies.map(c => [c.id, c]));

    return `
      <div class="mt-5">
        <h6 class="mb-3">Offres similaires</h6>
        <div class="row g-4">
          ${similar.map(j => NeoComponents.jobCard(j, { rootPrefix: '', company: companyById.get(j.companyId) })).join('')}
        </div>
      </div>
    `;
  }

  async function render(){
    if (!job){
      root.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-exclamation-circle"></i>
          Cette offre n'existe pas ou a été retirée.
          <div class="mt-3"><a href="offres.html" class="btn btn-neo-outline btn-sm">Retour aux offres</a></div>
        </div>`;
      return;
    }

    const company = (await Companies.getById(job.companyId)) || { nom: 'Entreprise', ville: job.ville, secteur: '—', description: '' };
    const isFav = candidate ? await Favorites.isFavorite(candidate.id, job.id) : false;
    const matchScore = candidate ? NeoUI.matchScore(candidate.skills, job.competences) : null;
    const isFeatured = company.plan === 'premium';

    root.innerHTML = `
      <nav class="mb-3"><a href="offres.html" class="text-muted-soft small"><i class="bi bi-arrow-left me-1"></i>Retour aux offres</a></nav>

      <div class="row g-4">
        <div class="col-lg-8">
          <div class="panel p-4 p-md-5 mb-4">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div class="d-flex align-items-center gap-3">
                ${NeoComponents.companyBadgeHtml(company.logo, company.nom, 'width:56px;height:56px;font-size:1.1rem;')}
                <div>
                  <h1 class="h4 mb-1">${NeoUI.escapeHtml(job.titre)}</h1>
                  <a href="entreprise.html?id=${company.id}" class="text-muted-soft small">${NeoUI.escapeHtml(company.nom)}</a>
                </div>
              </div>
              ${candidate ? `
                <button type="button" class="btn btn-neo-ghost btn-sm p-1" id="fav-toggle-btn" aria-label="${isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}" title="${isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}">
                  <i class="bi ${isFav ? 'bi-heart-fill' : 'bi-heart'} fs-5" style="color:${isFav ? 'var(--danger)' : 'var(--text-muted)'};"></i>
                </button>` : ''}
            </div>

            <div class="d-flex flex-wrap gap-2 mb-4">
              ${isFeatured ? '<span class="pill pill-featured"><i class="bi bi-stars"></i> Sponsorisé</span>' : ''}
              ${matchScore != null ? NeoUI.matchScorePill(matchScore) : ''}
              <span class="pill pill-cyan"><i class="bi bi-geo-alt"></i> ${NeoUI.escapeHtml(job.ville)}</span>
              <span class="pill pill-violet"><i class="bi bi-briefcase"></i> ${NeoUI.escapeHtml(job.typeContrat)}</span>
              ${job.remote ? `<span class="pill pill-mint"><i class="bi bi-laptop"></i> Télétravail</span>` : ''}
              <span class="pill pill-orange"><i class="bi bi-calendar3"></i> ${NeoUI.formatDate(job.datePublication)}</span>
            </div>

            <h6 class="mb-2">Description du poste</h6>
            <p class="text-secondary-soft mb-4">${NeoUI.escapeHtml(job.description)}</p>

            <h6 class="mb-2">Compétences recherchées</h6>
            <div class="d-flex flex-wrap gap-2">
              ${(job.competences || []).map(c => `<span class="pill pill-violet">${NeoUI.escapeHtml(c)}</span>`).join('')}
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="panel p-4 mb-4">
            <div class="text-muted-soft small mb-1">Salaire proposé</div>
            <div class="text-gradient fw-bold fs-4 mb-4">${NeoUI.formatMoney(job.salaireMin)} - ${NeoUI.formatMoney(job.salaireMax)}</div>
            <div id="cta-block">${await ctaBlock()}</div>
          </div>

          <div class="panel p-4">
            <div class="d-flex align-items-center gap-3 mb-3">
              ${NeoComponents.companyBadgeHtml(company.logo, company.nom, 'width:46px;height:46px;')}
              <div>
                <div class="fw-semibold">${NeoUI.escapeHtml(company.nom)}</div>
                <div class="text-muted-soft small">${NeoUI.escapeHtml(company.secteur || '')}</div>
              </div>
            </div>
            <p class="text-muted-soft small mb-3">${NeoUI.escapeHtml(company.description || '')}</p>
            <a href="entreprise.html?id=${company.id}" class="btn btn-neo-outline btn-sm w-100">Voir le profil de l'entreprise</a>
          </div>
        </div>
      </div>

      ${await similarJobsHtml()}
    `;

    wireActions(isFav);
  }

  function wireActions(isFav){
    const favBtn = document.getElementById('fav-toggle-btn');
    if (favBtn){
      favBtn.addEventListener('click', async () => {
        const nowFav = await Favorites.toggle(candidate.id, job.id);
        NeoUI.toast(nowFav ? 'Offre ajoutée à vos favoris.' : 'Offre retirée de vos favoris.', 'success');
        render();
      });
    }

    const openApplyBtn = document.getElementById('open-apply-btn');
    if (openApplyBtn){
      openApplyBtn.addEventListener('click', () => {
        new bootstrap.Modal(document.getElementById('applyModal')).show();
      });
    }
  }

  document.getElementById('apply-submit-btn').addEventListener('click', async () => {
    if (!candidate || !job) return;
    const message = document.getElementById('apply-message').value.trim();
    if (!message){
      NeoUI.toast('Merci de rédiger une courte lettre de motivation.', 'warning');
      return;
    }
    const cvInput = document.getElementById('apply-cv');
    const cvName = cvInput.files && cvInput.files[0] ? cvInput.files[0].name : null;

    await Applications.create({
      jobId: job.id,
      candidateId: candidate.id,
      lettreMotivation: message,
      cvName,
    });

    bootstrap.Modal.getInstance(document.getElementById('applyModal')).hide();
    document.getElementById('apply-form').reset();
    NeoUI.toast('Votre candidature a bien été envoyée !', 'success');
    render();
  });

  render();
})();
