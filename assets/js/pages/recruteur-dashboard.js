/* NeoJob — recruteur/dashboard.html page logic */

(async () => {
  const session = await Auth.guardPage('recruteur', '../');
  if (!session) return;

  await NeoComponents.renderHeader({ rootPrefix: '../' });
  NeoComponents.renderSidebar({ role: 'recruteur', active: 'dashboard' });

  const company = await Companies.getByUserId(session.userId);
  document.getElementById('welcome-name').textContent = company ? `${company.nom} 👋` : '👋';

  const planBadge = document.getElementById('plan-badge');
  if (company.plan === 'premium'){
    planBadge.className = 'pill pill-violet';
    planBadge.innerHTML = '<i class="bi bi-stars"></i> Premium';
  } else {
    const activeCount = await Companies.activeJobCount(company.id);
    planBadge.className = 'pill pill-cyan';
    planBadge.innerHTML = `<i class="bi bi-lightning-charge"></i> Gratuit · ${activeCount}/6 offres`;
  }

  const jobs = await Jobs.getByCompany(company.id);
  const jobIds = jobs.map(j => j.id);
  const allApplicationsRaw = await Applications.getAll();
  const allApplications = allApplicationsRaw.filter(a => jobIds.includes(a.jobId));

  document.getElementById('stat-published').textContent = jobs.filter(j => j.statut === 'publiee').length;
  document.getElementById('stat-pending').textContent = jobs.filter(j => j.statut === 'en_attente').length;
  document.getElementById('stat-applications').textContent = allApplications.length;
  document.getElementById('stat-accepted').textContent = allApplications.filter(a => a.statut === 'embauchee').length;

  const tbody = document.getElementById('recent-applications-body');
  const recent = allApplications.slice().sort((a,b) => new Date(b.dateCandidature) - new Date(a.dateCandidature)).slice(0,5);

  if (!recent.length){
    document.querySelector('.table-responsive').style.display = 'none';
    const emptyEl = document.getElementById('recent-applications-empty');
    emptyEl.style.display = 'block';
    emptyEl.innerHTML = `<div class="empty-state py-4"><i class="bi bi-inbox"></i>Aucune candidature reçue pour le moment.</div>`;
  } else {
    tbody.innerHTML = (await Promise.all(recent.map(async app => {
      const job = await Jobs.getById(app.jobId);
      const candidate = await Candidates.getById(app.candidateId);
      return `
        <tr>
          <td>${NeoUI.escapeHtml(candidate ? `${candidate.prenom} ${candidate.nom}` : 'Candidat')}</td>
          <td class="text-muted-soft">${NeoUI.escapeHtml(job ? job.titre : '—')}</td>
          <td class="text-muted-soft">${NeoUI.formatDate(app.dateCandidature)}</td>
          <td>${NeoUI.statusPill(NeoUI.APP_STATUS, app.statut)}</td>
        </tr>
      `;
    }))).join('');
  }

  renderApplicationsChart(allApplications);

  /* ---------- Profile completion ---------- */
  const completionItems = [
    { label: 'Logo ajouté', done: !!company.logo },
    { label: 'Description renseignée', done: !!(company.description && company.description.trim()) },
    { label: 'Secteur renseigné', done: !!(company.secteur && company.secteur.trim()) },
    { label: 'Ville renseignée', done: !!(company.ville && company.ville.trim()) },
    { label: 'Site web renseigné', done: !!(company.siteWeb && company.siteWeb.trim()) },
  ];
  document.getElementById('completion-widget').innerHTML = NeoUI.completionWidgetHtml(completionItems);
  if (completionItems.some(i => !i.done)){
    document.getElementById('completion-widget').innerHTML += `<a href="profil.html" class="btn btn-neo-outline btn-sm w-100 mt-3">Compléter mon profil</a>`;
  }

  /* ---------- Badges ---------- */
  const badges = [
    { earned: jobs.length >= 1, icon: 'bi-flag-fill', pill: 'pill-cyan', label: 'Premier recrutement' },
    { earned: jobs.length >= 5, icon: 'bi-briefcase-fill', pill: 'pill-orange', label: 'Recruteur actif' },
    { earned: company.plan === 'premium', icon: 'bi-stars', pill: 'pill-violet', label: 'Membre Premium' },
    { earned: !!company.verified, icon: 'bi-patch-check-fill', pill: 'pill-cyan', label: 'Entreprise vérifiée' },
  ].filter(b => b.earned);

  document.getElementById('badges-container').innerHTML = badges.length
    ? badges.map(b => `<span class="pill ${b.pill}"><i class="bi ${b.icon}"></i> ${b.label}</span>`).join('')
    : `<span class="text-muted-soft small">Aucun badge pour le moment.</span>`;
})();

function renderApplicationsChart(applications){
  const canvas = document.getElementById('applications-chart');
  if (!canvas || typeof NeoCharts === 'undefined') return;

  // Anchor on the most recent submission in the data (rather than the real
  // clock) so the last-8-weeks window always has something to show.
  const dates = applications.map(a => new Date(a.dateCandidature)).filter(d => !isNaN(d));
  const anchor = dates.length ? new Date(Math.max(...dates)) : new Date();

  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const buckets = [];
  for (let i = 7; i >= 0; i--){
    const weekStart = new Date(anchor.getTime() - i * WEEK_MS);
    weekStart.setHours(0,0,0,0);
    const weekEnd = new Date(weekStart.getTime() + WEEK_MS);
    buckets.push({ start: weekStart, end: weekEnd, count: 0 });
  }

  applications.forEach(a => {
    const d = new Date(a.dateCandidature);
    const bucket = buckets.find(b => d >= b.start && d < b.end);
    if (bucket) bucket.count++;
  });

  const labels = buckets.map(b => b.start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }));
  const data = buckets.map(b => b.count);

  NeoCharts.barChart('applications-chart', labels, data, { label: 'Candidatures' });
}
