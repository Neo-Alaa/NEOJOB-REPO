/* NeoJob — admin/dashboard.html page logic */

(async () => {
  const session = await Auth.guardPage('admin', '../');
  if (!session) return;

  await NeoComponents.renderHeader({ rootPrefix: '../' });
  NeoComponents.renderSidebar({ role: 'admin', active: 'dashboard' });

  const [users, jobs, companies, payments, categories] = await Promise.all([
    Users.getAll(), Jobs.getAll(), Companies.getAll(), Payments.getAll(), Categories.getAll(),
  ]);
  const companyById = new Map(companies.map(c => [c.id, c]));
  const totalRevenue = payments.reduce((sum, p) => sum + (p.montant || 0), 0);

  document.getElementById('stat-users').textContent = users.length;
  document.getElementById('stat-companies').textContent = companies.length;
  document.getElementById('stat-jobs').textContent = jobs.filter(j => j.statut === 'publiee').length;
  document.getElementById('stat-pending').textContent = jobs.filter(j => j.statut === 'en_attente').length;
  document.getElementById('stat-revenue').textContent = `${totalRevenue.toLocaleString('fr-FR')} MAD`;
  document.getElementById('stat-premium').textContent = companies.filter(c => c.plan === 'premium').length;

  const pendingJobs = jobs.filter(j => j.statut === 'en_attente').sort((a,b) => new Date(b.datePublication) - new Date(a.datePublication));
  const tbody = document.getElementById('pending-jobs-body');

  if (!pendingJobs.length){
    document.querySelector('.table-responsive').style.display = 'none';
    const emptyEl = document.getElementById('pending-jobs-empty');
    emptyEl.style.display = 'block';
    emptyEl.innerHTML = `<div class="empty-state py-4"><i class="bi bi-check2-circle"></i>Aucune offre en attente. Tout est à jour !</div>`;
  } else {
    tbody.innerHTML = pendingJobs.slice(0,6).map(job => {
      const company = companyById.get(job.companyId);
      return `
        <tr>
          <td>${NeoUI.escapeHtml(job.titre)}</td>
          <td class="text-muted-soft">${NeoUI.escapeHtml(company ? company.nom : '—')}</td>
          <td class="text-muted-soft">${NeoUI.formatDate(job.datePublication)}</td>
        </tr>
      `;
    }).join('');
  }

  const roleCounts = { candidat: 0, recruteur: 0, admin: 0 };
  users.forEach(u => { if (roleCounts[u.role] !== undefined) roleCounts[u.role]++; });
  const roleMeta = {
    candidat: { label: 'Candidats', pill: 'pill-cyan' },
    recruteur: { label: 'Recruteurs', pill: 'pill-violet' },
    admin: { label: 'Admins', pill: 'pill-orange' },
  };

  document.getElementById('role-breakdown').innerHTML = Object.keys(roleCounts).map(role => {
    const pct = users.length ? Math.round((roleCounts[role] / users.length) * 100) : 0;
    return `
      <div>
        <div class="d-flex justify-content-between mb-1">
          <span class="pill ${roleMeta[role].pill}">${roleMeta[role].label}</span>
          <span class="text-muted-soft small">${roleCounts[role]} (${pct}%)</span>
        </div>
        <div style="height:6px;border-radius:4px;background:var(--bg-panel-alt);overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--cyan),var(--violet));"></div>
        </div>
      </div>
    `;
  }).join('');

  const publishedJobs = jobs.filter(j => j.statut === 'publiee');
  const categoryLabels = categories.map(c => c.nom);
  const categoryData = categories.map(c => publishedJobs.filter(j => j.categoryId === c.id).length);
  NeoCharts.barChart('category-chart', categoryLabels, categoryData, { label: 'Offres publiées' });
})();
