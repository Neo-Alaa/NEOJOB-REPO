/* NeoJob — candidat/favoris.html page logic */

(async () => {
  const session = await Auth.guardPage('candidat', '../');
  if (!session) return;

  await NeoComponents.renderHeader({ rootPrefix: '../' });
  NeoComponents.renderSidebar({ role: 'candidat', active: 'favoris' });

  const candidate = await Candidates.getByUserId(session.userId);
  const container = document.getElementById('favorites-container');

  async function render(){
    const favs = await Favorites.getByCandidate(candidate.id);
    const jobs = (await Promise.all(favs.map(f => Jobs.getById(f.jobId)))).filter(Boolean);

    if (!jobs.length){
      container.innerHTML = `<div class="col-12"><div class="empty-state"><i class="bi bi-heart"></i>Vous n'avez pas encore d'offre favorite. <br><a href="../offres.html" class="text-gradient fw-semibold">Parcourir les offres</a></div></div>`;
      return;
    }

    const companies = await Companies.getAll();
    const companyById = new Map(companies.map(c => [c.id, c]));

    container.innerHTML = jobs.map(j => NeoComponents.jobCard(j, {
      rootPrefix: '../',
      company: companyById.get(j.companyId),
      showFavorite: true,
      isFavorite: true,
      matchScore: NeoUI.matchScore(candidate.skills, j.competences),
    })).join('');

    container.querySelectorAll('.job-fav-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await Favorites.toggle(candidate.id, Number(btn.dataset.jobId));
        NeoUI.toast('Offre retirée de vos favoris.', 'success');
        render();
      });
    });
  }

  render();
})();
