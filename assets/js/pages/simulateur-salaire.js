/* NeoJob — simulateur-salaire.html page logic */

(async () => {
  await NeoComponents.renderHeader({ rootPrefix: '', active: '' });
  NeoComponents.renderFooter({ rootPrefix: '' });

  const EXPERIENCE_MULTIPLIER = { debutant: 0.8, intermediaire: 1, senior: 1.35 };
  const CITY_MULTIPLIER = { Casablanca: 1.05, Rabat: 1, Marrakech: 0.9, Tanger: 0.92, Fès: 0.88, Agadir: 0.87 };
  const DEFAULT_CITY_MULTIPLIER = 0.95;
  const FALLBACK_RANGE = { min: 6000, max: 10000 };

  const categories = await Categories.getAll();
  const catSelect = document.getElementById('sim-categorie');
  catSelect.innerHTML += categories.map(c => `<option value="${c.id}">${NeoUI.escapeHtml(c.nom)}</option>`).join('');

  function roundTo100(n){ return Math.round(n / 100) * 100; }

  async function estimateSalary(categoryId, ville, experience){
    const published = await Jobs.getPublished();
    const jobsInCat = published.filter(j => String(j.categoryId) === String(categoryId));
    const base = jobsInCat.length
      ? {
          min: jobsInCat.reduce((s, j) => s + j.salaireMin, 0) / jobsInCat.length,
          max: jobsInCat.reduce((s, j) => s + j.salaireMax, 0) / jobsInCat.length,
        }
      : FALLBACK_RANGE;

    const expMult = EXPERIENCE_MULTIPLIER[experience] || 1;
    const cityMult = CITY_MULTIPLIER[ville] || DEFAULT_CITY_MULTIPLIER;

    return {
      min: roundTo100(base.min * expMult * cityMult),
      max: roundTo100(base.max * expMult * cityMult),
      sampleSize: jobsInCat.length,
    };
  }

  document.getElementById('simulator-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const categoryId = catSelect.value;
    if (!categoryId){
      NeoUI.toast('Merci de choisir une catégorie de poste.', 'warning');
      return;
    }
    const ville = document.getElementById('sim-ville').value;
    const experience = document.getElementById('sim-experience').value;
    const cat = categories.find(c => c.id === Number(categoryId));
    const result = await estimateSalary(categoryId, ville, experience);

    document.getElementById('simulator-result').innerHTML = `
      <div class="text-center">
        <div class="text-muted-soft small mb-2">Estimation pour</div>
        <h4 class="mb-3">${NeoUI.escapeHtml(cat ? cat.nom : '—')}${ville ? ` · ${NeoUI.escapeHtml(ville)}` : ''}</h4>
        <div class="text-gradient fw-bold" style="font-size:2.4rem;">${NeoUI.formatMoney(result.min)} - ${NeoUI.formatMoney(result.max)}</div>
        <p class="text-muted-soft small mt-3 mb-0">
          ${result.sampleSize
            ? `Basé sur ${result.sampleSize} offre${result.sampleSize > 1 ? 's' : ''} publiée${result.sampleSize > 1 ? 's' : ''} dans cette catégorie sur NeoJob, ajusté selon la ville et l'expérience.`
            : `Aucune offre publiée dans cette catégorie pour le moment — estimation basée sur une fourchette de marché générale.`}
        </p>
        <a href="offres.html?categorie=${categoryId}" class="btn btn-neo-outline btn-sm mt-4">
          <i class="bi bi-search me-1"></i> Voir les offres correspondantes
        </a>
      </div>
    `;
  });
})();
