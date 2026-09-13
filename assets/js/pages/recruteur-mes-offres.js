/* NeoJob — recruteur/mes-offres.html page logic */

(async () => {
  const session = await Auth.guardPage('recruteur', '../');
  if (!session) return;

  await NeoComponents.renderHeader({ rootPrefix: '../' });
  NeoComponents.renderSidebar({ role: 'recruteur', active: 'mes-offres' });

  const company = await Companies.getByUserId(session.userId);
  const tbody = document.getElementById('jobs-body');
  const emptyEl = document.getElementById('jobs-empty');
  const tableWrap = document.querySelector('.table-responsive');

  async function render(){
    const jobsRaw = await Jobs.getByCompany(company.id);
    const jobs = jobsRaw.slice().sort((a,b) => new Date(b.datePublication) - new Date(a.datePublication));

    if (!jobs.length){
      tableWrap.style.display = 'none';
      emptyEl.style.display = 'block';
      emptyEl.innerHTML = `<div class="empty-state py-4"><i class="bi bi-briefcase"></i>Vous n'avez publié aucune offre. <br><a href="poster-offre.html" class="text-gradient fw-semibold">Publier votre première offre</a></div>`;
      return;
    }

    tableWrap.style.display = '';
    emptyEl.style.display = 'none';

    tbody.innerHTML = (await Promise.all(jobs.map(async job => {
      const apps = await Applications.getByJob(job.id);
      return `
        <tr>
          <td><a href="../offre-detail.html?id=${job.id}" class="text-decoration-none" style="color:var(--text-primary);">${NeoUI.escapeHtml(job.titre)}</a></td>
          <td class="text-muted-soft">${NeoUI.escapeHtml(job.ville)}</td>
          <td class="text-muted-soft">${NeoUI.escapeHtml(job.typeContrat)}</td>
          <td>${NeoUI.statusPill(NeoUI.JOB_STATUS, job.statut)}</td>
          <td><a href="candidatures-recues.html?offre_id=${job.id}" class="pill pill-cyan">${apps.length} candidature${apps.length > 1 ? 's' : ''}</a></td>
          <td class="text-end text-nowrap">
            <button type="button" class="btn btn-neo-outline btn-sm stats-btn" data-id="${job.id}" aria-label="Statistiques de l'offre" title="Statistiques de l'offre"><i class="bi bi-bar-chart-line"></i></button>
            <a href="poster-offre.html?id=${job.id}" class="btn btn-neo-outline btn-sm" aria-label="Modifier l'offre" title="Modifier l'offre"><i class="bi bi-pencil"></i></a>
            <button type="button" class="btn btn-danger-soft btn-sm delete-btn" data-id="${job.id}" aria-label="Supprimer l'offre" title="Supprimer l'offre"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `;
    }))).join('');

    tbody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await NeoUI.confirmDialog("Supprimer définitivement cette offre et toutes ses candidatures associées ?", "Supprimer l'offre");
        if (!ok) return;
        await Jobs.remove(Number(btn.dataset.id));
        NeoUI.toast('Offre supprimée.', 'success');
        render();
      });
    });

    tbody.querySelectorAll('.stats-btn').forEach(btn => {
      btn.addEventListener('click', () => openStats(Number(btn.dataset.id)));
    });
  }

  const statsModalEl = document.getElementById('statsModal');
  const statsModal = new bootstrap.Modal(statsModalEl);

  async function openStats(jobId){
    const job = await Jobs.getById(jobId);
    const apps = await Applications.getByJob(jobId);
    const vues = job.vues || 0;
    const tauxConversion = vues ? Math.round((apps.length / vues) * 1000) / 10 : 0;

    document.getElementById('stats-job-title').textContent = job.titre;
    document.getElementById('stats-vues').textContent = vues;
    document.getElementById('stats-candidatures').textContent = apps.length;
    document.getElementById('stats-taux').textContent = `${tauxConversion}%`;

    const labels = NeoUI.APP_PIPELINE_ORDER.map(s => NeoUI.APP_STATUS[s].label);
    const data = NeoUI.APP_PIPELINE_ORDER.map(s => apps.filter(a => a.statut === s).length);
    NeoCharts.barChart('stats-funnel-chart', labels, data, { label: 'Candidatures par étape' });

    statsModal.show();
  }

  render();
})();
