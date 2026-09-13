/* NeoJob — index.html page logic */

(async () => {
  await NeoComponents.renderHeader({ rootPrefix: '', active: 'home' });
  NeoComponents.renderFooter({ rootPrefix: '' });

  async function renderFeatured(){
    const container = document.getElementById('featured-jobs-container');
    const [allJobs, companies] = await Promise.all([Jobs.getPublished(), Companies.getAll()]);
    const companyById = new Map(companies.map(c => [c.id, c]));

    let jobs = allJobs.slice().sort((a,b) => new Date(b.datePublication) - new Date(a.datePublication));
    jobs.sort((a,b) => (NeoComponents.isFeaturedJob(companyById.get(b.companyId)) ? 1 : 0) - (NeoComponents.isFeaturedJob(companyById.get(a.companyId)) ? 1 : 0));
    jobs = jobs.slice(0, 6);

    if (!jobs.length){
      container.innerHTML = `<div class="col-12"><div class="empty-state"><i class="bi bi-inboxes"></i>Aucune offre publiée pour le moment.</div></div>`;
      return;
    }
    container.innerHTML = jobs.map(j => NeoComponents.jobCard(j, { rootPrefix: '', company: companyById.get(j.companyId) })).join('');
  }

  async function renderStats(){
    const [jobs, companies, candidates] = await Promise.all([Jobs.getPublished(), Companies.getAll(), Candidates.getAll()]);
    document.getElementById('stat-jobs').textContent = jobs.length;
    document.getElementById('stat-companies').textContent = companies.length;
    document.getElementById('stat-candidates').textContent = candidates.length;
  }

  document.getElementById('hero-search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('hero-search-title').value.trim();
    const city = document.getElementById('hero-search-city').value.trim();
    const params = new URLSearchParams();
    if (title) params.set('q', title);
    if (city) params.set('ville', city);
    window.location.href = 'offres.html' + (params.toString() ? '?' + params.toString() : '');
  });

  renderFeatured();
  renderStats();
})();
