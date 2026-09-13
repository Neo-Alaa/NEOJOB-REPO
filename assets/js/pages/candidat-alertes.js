/* NeoJob — candidat/alertes.html page logic */

(async () => {
  const session = await Auth.guardPage('candidat', '../');
  if (!session) return;

  await NeoComponents.renderHeader({ rootPrefix: '../' });
  NeoComponents.renderSidebar({ role: 'candidat', active: 'alertes' });

  const candidate = await Candidates.getByUserId(session.userId);
  const container = document.getElementById('alerts-container');
  const categories = await Categories.getAll();

  function criteriaSummaryHtml(alert){
    const parts = [];
    if (alert.q) parts.push(`<span class="pill pill-cyan">« ${NeoUI.escapeHtml(alert.q)} »</span>`);
    if (alert.ville) parts.push(`<span class="pill pill-violet"><i class="bi bi-geo-alt"></i> ${NeoUI.escapeHtml(alert.ville)}</span>`);
    if (alert.categoryId){
      const cat = categories.find(c => c.id === alert.categoryId);
      if (cat) parts.push(`<span class="pill pill-orange">${NeoUI.escapeHtml(cat.nom)}</span>`);
    }
    if (alert.competence) parts.push(`<span class="pill pill-mint">${NeoUI.escapeHtml(alert.competence)}</span>`);
    if (alert.contrat) parts.push(`<span class="pill pill-muted">${NeoUI.escapeHtml(alert.contrat)}</span>`);
    if (alert.remote) parts.push(`<span class="pill pill-mint"><i class="bi bi-laptop"></i> Télétravail</span>`);
    return parts.length ? parts.join(' ') : `<span class="text-muted-soft small">Toutes les offres</span>`;
  }

  function alertOffresUrl(alert){
    const params = new URLSearchParams();
    if (alert.q) params.set('q', alert.q);
    if (alert.ville) params.set('ville', alert.ville);
    if (alert.categoryId) params.set('categorie', alert.categoryId);
    return `../offres.html?${params.toString()}`;
  }

  async function render(){
    const rawAlerts = await JobAlerts.getByCandidate(candidate.id);
    const alerts = rawAlerts.slice().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!alerts.length){
      container.innerHTML = `<div class="empty-state py-5"><i class="bi bi-bell"></i>Vous n'avez aucune alerte. <br><a href="../offres.html" class="text-gradient fw-semibold">Créez-en une depuis la page des offres</a>.</div>`;
      return;
    }

    container.innerHTML = (await Promise.all(alerts.map(async alert => {
      const matches = await JobAlerts.getMatchingJobs(alert);
      return `
        <div class="panel p-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <div class="fw-semibold mb-1">${NeoUI.escapeHtml(alert.label)}</div>
            <div class="d-flex flex-wrap gap-2 mb-2">${criteriaSummaryHtml(alert)}</div>
            <div class="text-muted-soft small">Créée le ${NeoUI.formatDate(alert.createdAt)}</div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <a href="${alertOffresUrl(alert)}" class="btn btn-neo-outline btn-sm">
              <span class="pill pill-mint me-1">${matches.length}</span>offre${matches.length > 1 ? 's' : ''} correspondante${matches.length > 1 ? 's' : ''}
            </a>
            <button type="button" class="btn btn-danger-soft btn-sm delete-alert-btn" data-id="${alert.id}" aria-label="Supprimer l'alerte" title="Supprimer l'alerte">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      `;
    }))).join('');

    container.querySelectorAll('.delete-alert-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await NeoUI.confirmDialog('Supprimer cette alerte ?', "Supprimer l'alerte");
        if (!ok) return;
        await JobAlerts.remove(Number(btn.dataset.id));
        NeoUI.toast('Alerte supprimée.', 'success');
        render();
      });
    });
  }

  render();
})();
