/* NeoJob — offres.html page logic (search, filters, sort, pagination) */

(async () => {
  await NeoComponents.renderHeader({ rootPrefix: '', active: 'offres' });
  NeoComponents.renderFooter({ rootPrefix: '' });

  const PAGE_SIZE = 6;
  let currentPage = 1;
  const compareIds = new Set();
  const MAX_COMPARE = 3;

  const els = {
    q: document.getElementById('f-q'),
    ville: document.getElementById('f-ville'),
    categorie: document.getElementById('f-categorie'),
    competence: document.getElementById('f-competence'),
    contrat: document.getElementById('f-contrat'),
    remote: document.getElementById('f-remote'),
    sort: document.getElementById('f-sort'),
    reset: document.getElementById('f-reset'),
    container: document.getElementById('jobs-container'),
    count: document.getElementById('results-count'),
    pagination: document.getElementById('pagination-container'),
  };

  const session = await Auth.current();
  const candidate = (session && session.role === 'candidat') ? await Candidates.getByUserId(session.userId) : null;

  let allJobs = await Jobs.getPublished();
  let companyById = new Map((await Companies.getAll()).map(c => [c.id, c]));
  let favoriteJobIds = candidate
    ? new Set((await Favorites.getByCandidate(candidate.id)).map(f => f.jobId))
    : new Set();

  function populateCategories(categories){
    els.categorie.innerHTML = '<option value="">Toutes les catégories</option>' +
      categories.map(c => `<option value="${c.id}">${NeoUI.escapeHtml(c.nom)}</option>`).join('');
  }

  function populateCompetences(comps){
    els.competence.innerHTML = '<option value="">Toutes les compétences</option>' +
      comps.map(c => `<option value="${NeoUI.escapeHtml(c.nom)}">${NeoUI.escapeHtml(c.nom)}</option>`).join('');
  }

  const categories = await Categories.getAll();

  function prefillFromUrl(){
    const params = new URLSearchParams(window.location.search);
    if (params.get('q')) els.q.value = params.get('q');
    if (params.get('ville')) els.ville.value = params.get('ville');
    if (params.get('categorie')) els.categorie.value = params.get('categorie');
  }

  function getFilteredJobs(){
    const q = els.q.value.trim().toLowerCase();
    const ville = els.ville.value.trim().toLowerCase();
    const categorie = els.categorie.value;
    const contrat = els.contrat.value;
    const remoteOnly = els.remote.checked;

    let jobs = allJobs.slice();

    if (q){
      jobs = jobs.filter(j =>
        j.titre.toLowerCase().includes(q) ||
        (j.competences || []).some(c => c.toLowerCase().includes(q))
      );
    }
    if (ville) jobs = jobs.filter(j => j.ville.toLowerCase().includes(ville));
    if (categorie) jobs = jobs.filter(j => String(j.categoryId) === categorie);
    if (els.competence.value) jobs = jobs.filter(j => (j.competences || []).includes(els.competence.value));
    if (contrat) jobs = jobs.filter(j => j.typeContrat === contrat);
    if (remoteOnly) jobs = jobs.filter(j => j.remote);

    const sort = els.sort.value;
    if (sort === 'salaire-desc') jobs.sort((a,b) => (b.salaireMax||0) - (a.salaireMax||0));
    else if (sort === 'salaire-asc') jobs.sort((a,b) => (a.salaireMax||0) - (b.salaireMax||0));
    else {
      // Default sort: newest first, but Premium companies' jobs get pinned to
      // the top first — the "offres mises en avant" perk the pricing page sells.
      jobs.sort((a,b) => new Date(b.datePublication) - new Date(a.datePublication));
      jobs.sort((a,b) => (NeoComponents.isFeaturedJob(companyById.get(b.companyId)) ? 1 : 0) - (NeoComponents.isFeaturedJob(companyById.get(a.companyId)) ? 1 : 0));
    }

    return jobs;
  }

  function currentFilterCriteria(){
    return {
      q: els.q.value.trim(),
      ville: els.ville.value.trim(),
      categoryId: els.categorie.value ? Number(els.categorie.value) : null,
      competence: els.competence.value,
      contrat: els.contrat.value,
      remote: els.remote.checked,
    };
  }

  function criteriaSummaryHtml(criteria){
    const parts = [];
    if (criteria.q) parts.push(`<span class="pill pill-cyan">« ${NeoUI.escapeHtml(criteria.q)} »</span>`);
    if (criteria.ville) parts.push(`<span class="pill pill-violet"><i class="bi bi-geo-alt"></i> ${NeoUI.escapeHtml(criteria.ville)}</span>`);
    if (criteria.categoryId){
      const cat = categories.find(c => c.id === criteria.categoryId);
      if (cat) parts.push(`<span class="pill pill-orange">${NeoUI.escapeHtml(cat.nom)}</span>`);
    }
    if (criteria.competence) parts.push(`<span class="pill pill-mint">${NeoUI.escapeHtml(criteria.competence)}</span>`);
    if (criteria.contrat) parts.push(`<span class="pill pill-muted">${NeoUI.escapeHtml(criteria.contrat)}</span>`);
    if (criteria.remote) parts.push(`<span class="pill pill-mint"><i class="bi bi-laptop"></i> Télétravail</span>`);
    return parts.length ? parts.join(' ') : `<span class="text-muted-soft small">Aucun critère — toutes les offres.</span>`;
  }

  function suggestedAlertLabel(criteria){
    const bits = [criteria.q, criteria.ville].filter(Boolean);
    if (criteria.categoryId){
      const cat = categories.find(c => c.id === criteria.categoryId);
      if (cat) bits.push(cat.nom);
    }
    return bits.length ? bits.join(' — ') : 'Nouvelles offres';
  }

  document.getElementById('create-alert-btn').addEventListener('click', () => {
    if (!candidate){
      NeoUI.toast('Connectez-vous en tant que candidat pour créer une alerte.', 'info');
      return;
    }
    const criteria = currentFilterCriteria();
    document.getElementById('alert-label').value = suggestedAlertLabel(criteria);
    document.getElementById('alert-criteria-summary').innerHTML = criteriaSummaryHtml(criteria);
    new bootstrap.Modal(document.getElementById('alertModal')).show();
  });

  document.getElementById('alert-save-btn').addEventListener('click', async () => {
    if (!candidate) return;
    const criteria = currentFilterCriteria();
    const label = document.getElementById('alert-label').value.trim() || suggestedAlertLabel(criteria);

    await JobAlerts.create(Object.assign({ candidateId: candidate.id, label }, criteria));

    bootstrap.Modal.getInstance(document.getElementById('alertModal')).hide();
    NeoUI.toast('Alerte créée ! Retrouvez-la dans « Mes alertes ».', 'success');
  });

  function render(){
    const all = getFilteredJobs();
    const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageJobs = all.slice(start, start + PAGE_SIZE);

    els.count.textContent = `${all.length} résultat${all.length > 1 ? 's' : ''}`;

    if (!pageJobs.length){
      els.container.innerHTML = `<div class="col-12"><div class="empty-state"><i class="bi bi-search"></i>Aucune offre ne correspond à votre recherche.</div></div>`;
    } else {
      els.container.innerHTML = pageJobs.map(j => NeoComponents.jobCard(j, {
        rootPrefix: '',
        company: companyById.get(j.companyId),
        showFavorite: !!candidate,
        isFavorite: favoriteJobIds.has(j.id),
        matchScore: candidate ? NeoUI.matchScore(candidate.skills, j.competences) : null,
        showCompare: true,
        compareChecked: compareIds.has(j.id),
      })).join('');
    }

    renderPagination(totalPages);
    wireFavoriteButtons();
    wireCompareCheckboxes();
  }

  function wireCompareCheckboxes(){
    els.container.querySelectorAll('.compare-checkbox').forEach(cb => {
      cb.addEventListener('click', (e) => e.stopPropagation());
      cb.addEventListener('change', () => {
        const jobId = Number(cb.dataset.jobId);
        if (cb.checked){
          if (compareIds.size >= MAX_COMPARE){
            cb.checked = false;
            NeoUI.toast(`Vous pouvez comparer jusqu'à ${MAX_COMPARE} offres.`, 'warning');
            return;
          }
          compareIds.add(jobId);
        } else {
          compareIds.delete(jobId);
        }
        updateCompareBar();
      });
    });
  }

  function updateCompareBar(){
    const bar = document.getElementById('compare-bar');
    const countEl = document.getElementById('compare-count');
    const compareBtn = document.getElementById('compare-open-btn');
    if (!bar) return;
    bar.classList.toggle('show', compareIds.size > 0);
    countEl.textContent = `${compareIds.size} offre${compareIds.size > 1 ? 's' : ''} sélectionnée${compareIds.size > 1 ? 's' : ''}`;
    compareBtn.disabled = compareIds.size < 2;
  }

  function openCompareModal(){
    const jobs = Array.from(compareIds).map(id => allJobs.find(j => j.id === id)).filter(Boolean);
    const rows = [
      { label: 'Entreprise', get: j => (companyById.get(j.companyId) || {}).nom || '—' },
      { label: 'Ville', get: j => j.ville },
      { label: 'Contrat', get: j => j.typeContrat },
      { label: 'Télétravail', get: j => j.remote ? 'Oui' : 'Non' },
      { label: 'Salaire', get: j => `${NeoUI.formatMoney(j.salaireMin)} - ${NeoUI.formatMoney(j.salaireMax)}` },
      { label: 'Compétences', get: j => (j.competences || []).join(', ') || '—' },
    ];

    document.getElementById('compare-modal-body').innerHTML = `
      <div class="table-responsive">
        <table class="table table-neo mb-0">
          <thead><tr><th></th>${jobs.map(j => `<th>${NeoUI.escapeHtml(j.titre)}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows.map(r => `<tr><td class="text-muted-soft">${r.label}</td>${jobs.map(j => `<td>${NeoUI.escapeHtml(String(r.get(j)))}</td>`).join('')}</tr>`).join('')}
            <tr><td></td>${jobs.map(j => `<td><a href="offre-detail.html?id=${j.id}" class="btn btn-neo-outline btn-sm">Voir l'offre</a></td>`).join('')}</tr>
          </tbody>
        </table>
      </div>
    `;
    new bootstrap.Modal(document.getElementById('compareModal')).show();
  }

  function renderPagination(totalPages){
    if (totalPages <= 1){ els.pagination.innerHTML = ''; return; }
    let html = '';
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage - 1}">&laquo;</a></li>`;
    for (let p = 1; p <= totalPages; p++){
      html += `<li class="page-item ${p === currentPage ? 'active' : ''}"><a class="page-link" href="#" data-page="${p}">${p}</a></li>`;
    }
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage + 1}">&raquo;</a></li>`;
    els.pagination.innerHTML = html;

    els.pagination.querySelectorAll('.page-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = Number(link.dataset.page);
        if (page < 1 || page > totalPages) return;
        currentPage = page;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  function wireFavoriteButtons(){
    els.container.querySelectorAll('.job-fav-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!candidate){
          NeoUI.toast('Connectez-vous en tant que candidat pour sauvegarder une offre.', 'info');
          return;
        }
        const jobId = Number(btn.dataset.jobId);
        const isNowFavorite = await Favorites.toggle(candidate.id, jobId);
        if (isNowFavorite) favoriteJobIds.add(jobId); else favoriteJobIds.delete(jobId);
        NeoUI.toast(isNowFavorite ? 'Offre ajoutée à vos favoris.' : 'Offre retirée de vos favoris.', 'success');
        render();
      });
    });
  }

  function resetFilters(){
    els.q.value = '';
    els.ville.value = '';
    els.categorie.value = '';
    els.competence.value = '';
    els.contrat.value = '';
    els.remote.checked = false;
    els.sort.value = 'recent';
    currentPage = 1;
    render();
  }

  [els.q, els.ville].forEach(el => el.addEventListener('input', () => { currentPage = 1; render(); }));
  [els.categorie, els.competence, els.contrat, els.remote, els.sort].forEach(el => el.addEventListener('change', () => { currentPage = 1; render(); }));
  els.reset.addEventListener('click', resetFilters);

  document.getElementById('compare-open-btn').addEventListener('click', openCompareModal);
  document.getElementById('compare-clear-btn').addEventListener('click', () => {
    compareIds.clear();
    updateCompareBar();
    render();
  });

  populateCategories(categories);
  populateCompetences(await Competences.getAll());
  prefillFromUrl();
  render();
})();
