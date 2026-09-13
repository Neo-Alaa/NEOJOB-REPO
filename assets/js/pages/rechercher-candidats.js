/* NeoJob — recruteur/rechercher-candidats.html page logic (CVthèque) */

(async () => {
  const session = await Auth.guardPage('recruteur', '../');
  if (!session) return;

  await NeoComponents.renderHeader({ rootPrefix: '../' });
  NeoComponents.renderSidebar({ role: 'recruteur', active: 'rechercher-candidats' });

  const PAGE_SIZE = 6;
  let currentPage = 1;

  const els = {
    q: document.getElementById('f-q'),
    ville: document.getElementById('f-ville'),
    competence: document.getElementById('f-competence'),
    reset: document.getElementById('f-reset'),
    container: document.getElementById('candidates-container'),
    count: document.getElementById('results-count'),
    pagination: document.getElementById('pagination-container'),
  };

  const allCandidates = await Candidates.getAll();

  async function populateCompetences(){
    const comps = await Competences.getAll();
    els.competence.innerHTML = '<option value="">Toutes les compétences</option>' +
      comps.map(c => `<option value="${NeoUI.escapeHtml(c.nom)}">${NeoUI.escapeHtml(c.nom)}</option>`).join('');
  }

  function getFilteredCandidates(){
    const q = els.q.value.trim().toLowerCase();
    const ville = els.ville.value.trim().toLowerCase();
    const competence = els.competence.value;

    let candidates = allCandidates;

    if (q){
      candidates = candidates.filter(c =>
        `${c.prenom} ${c.nom}`.toLowerCase().includes(q) ||
        (c.bio || '').toLowerCase().includes(q)
      );
    }
    if (ville) candidates = candidates.filter(c => (c.ville || '').toLowerCase().includes(ville));
    if (competence) candidates = candidates.filter(c => (c.skills || []).includes(competence));

    return candidates;
  }

  function render(){
    const all = getFilteredCandidates();
    const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageCandidates = all.slice(start, start + PAGE_SIZE);

    els.count.textContent = `${all.length} candidat${all.length > 1 ? 's' : ''}`;

    if (!pageCandidates.length){
      els.container.innerHTML = `<div class="col-12"><div class="empty-state"><i class="bi bi-people"></i>Aucun candidat ne correspond à votre recherche.</div></div>`;
    } else {
      els.container.innerHTML = pageCandidates.map(c => NeoComponents.candidateCard(c, { rootPrefix: '../' })).join('');
    }

    renderPagination(totalPages);
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

  function resetFilters(){
    els.q.value = '';
    els.ville.value = '';
    els.competence.value = '';
    currentPage = 1;
    render();
  }

  [els.q, els.ville].forEach(el => el.addEventListener('input', () => { currentPage = 1; render(); }));
  els.competence.addEventListener('change', () => { currentPage = 1; render(); });
  els.reset.addEventListener('click', resetFilters);

  populateCompetences();
  render();
})();
