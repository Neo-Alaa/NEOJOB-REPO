/* NeoJob — admin/entreprises.html page logic */

(async () => {
  const session = await Auth.guardPage('admin', '../');
  if (!session) return;

  await NeoComponents.renderHeader({ rootPrefix: '../' });
  NeoComponents.renderSidebar({ role: 'admin', active: 'entreprises' });

  const tbody = document.getElementById('companies-body');
  const emptyEl = document.getElementById('companies-empty');
  const tableWrap = document.querySelector('.table-responsive');

  async function render(){
    const companies = (await Companies.getAll()).slice().sort((a,b) => a.nom.localeCompare(b.nom));

    if (!companies.length){
      tableWrap.style.display = 'none';
      emptyEl.style.display = 'block';
      emptyEl.innerHTML = `<div class="empty-state py-4"><i class="bi bi-building"></i>Aucune entreprise inscrite.</div>`;
      return;
    }

    tableWrap.style.display = '';
    emptyEl.style.display = 'none';

    tbody.innerHTML = (await Promise.all(companies.map(async c => {
      const jobs = await Jobs.getByCompany(c.id);
      return `
        <tr>
          <td>
            <div class="d-flex align-items-center gap-2">
              ${NeoComponents.companyBadgeHtml(c.logo, c.nom, 'width:32px;height:32px;font-size:.7rem;')}
              <span>${NeoUI.escapeHtml(c.nom)}</span>
              ${c.verified ? '<i class="bi bi-patch-check-fill" style="color:var(--cyan);" title="Entreprise vérifiée"></i>' : ''}
            </div>
          </td>
          <td class="text-muted-soft">${NeoUI.escapeHtml(c.secteur || '—')}</td>
          <td class="text-muted-soft">${NeoUI.escapeHtml(c.ville || '—')}</td>
          <td class="text-muted-soft">${jobs.length}</td>
          <td>${c.plan === 'premium' ? '<span class="pill pill-violet"><i class="bi bi-stars"></i> Premium</span>' : '<span class="pill pill-cyan">Gratuit</span>'}</td>
          <td>${c.verified ? '<span class="pill pill-mint"><i class="bi bi-patch-check"></i> Vérifiée</span>' : '<span class="pill pill-muted">Non vérifiée</span>'}</td>
          <td class="text-end">
            <button type="button" class="btn ${c.verified ? 'btn-danger-soft' : 'btn-neo-primary'} btn-sm verify-btn" data-id="${c.id}">
              ${c.verified ? 'Retirer' : 'Vérifier'}
            </button>
          </td>
        </tr>
      `;
    }))).join('');

    tbody.querySelectorAll('.verify-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.id);
        const c = await Companies.getById(id);
        await Companies.setVerified(id, !c.verified);
        NeoUI.toast(!c.verified ? 'Entreprise vérifiée.' : 'Vérification retirée.', 'success');
        render();
      });
    });
  }

  render();
})();
