/* NeoJob — admin/moderation.html page logic */

(async () => {
  const session = await Auth.guardPage('admin', '../');
  if (!session) return;

  await NeoComponents.renderHeader({ rootPrefix: '../' });
  NeoComponents.renderSidebar({ role: 'admin', active: 'moderation' });

  const tabs = document.querySelectorAll('#status-tabs [data-status]');
  const tbody = document.getElementById('jobs-body');
  const emptyEl = document.getElementById('jobs-empty');
  const tableWrap = document.querySelector('.table-responsive');
  let currentStatus = 'en_attente';

  function actionButtons(job){
    if (job.statut === 'en_attente'){
      return `
        <button type="button" class="btn btn-neo-primary btn-sm approve-btn" data-id="${job.id}"><i class="bi bi-check-lg"></i> Approuver</button>
        <button type="button" class="btn btn-danger-soft btn-sm reject-btn" data-id="${job.id}"><i class="bi bi-x-lg"></i> Refuser</button>
      `;
    }
    if (job.statut === 'publiee'){
      return `<button type="button" class="btn btn-danger-soft btn-sm reject-btn" data-id="${job.id}"><i class="bi bi-slash-circle"></i> Dépublier</button>`;
    }
    return `<button type="button" class="btn btn-neo-outline btn-sm approve-btn" data-id="${job.id}"><i class="bi bi-arrow-counterclockwise"></i> Republier</button>`;
  }

  async function render(){
    let [jobs, companies] = await Promise.all([Jobs.getAll(), Companies.getAll()]);
    const companyById = new Map(companies.map(c => [c.id, c]));
    if (currentStatus) jobs = jobs.filter(j => j.statut === currentStatus);
    jobs.sort((a,b) => new Date(b.datePublication) - new Date(a.datePublication));

    if (!jobs.length){
      tableWrap.style.display = 'none';
      emptyEl.style.display = 'block';
      emptyEl.innerHTML = `<div class="empty-state py-4"><i class="bi bi-inbox"></i>Aucune offre dans cette catégorie.</div>`;
      return;
    }

    tableWrap.style.display = '';
    emptyEl.style.display = 'none';

    tbody.innerHTML = jobs.map(job => {
      const company = companyById.get(job.companyId);
      return `
        <tr>
          <td>${NeoUI.escapeHtml(job.titre)}</td>
          <td class="text-muted-soft">${NeoUI.escapeHtml(company ? company.nom : '—')}</td>
          <td class="text-muted-soft">${NeoUI.escapeHtml(job.ville)}</td>
          <td class="text-muted-soft">${NeoUI.formatDate(job.datePublication)}</td>
          <td>${NeoUI.statusPill(NeoUI.JOB_STATUS, job.statut)}</td>
          <td class="text-end text-nowrap">${actionButtons(job)}</td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.approve-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        await Jobs.approve(Number(btn.dataset.id));
        NeoUI.toast('Offre publiée.', 'success');
        render();
      });
    });
    tbody.querySelectorAll('.reject-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await NeoUI.confirmDialog("Voulez-vous vraiment refuser/dépublier cette offre ?", "Refuser l'offre");
        if (!ok) return;
        await Jobs.reject(Number(btn.dataset.id));
        NeoUI.toast('Offre refusée.', 'success');
        render();
      });
    });
  }

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
