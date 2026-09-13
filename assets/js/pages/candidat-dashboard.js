/* NeoJob — candidat/dashboard.html page logic */

(async () => {
  const session = await Auth.guardPage('candidat', '../');
  if (!session) return;

  await NeoComponents.renderHeader({ rootPrefix: '../' });
  NeoComponents.renderSidebar({ role: 'candidat', active: 'dashboard' });

  const candidate = await Candidates.getByUserId(session.userId);
  document.getElementById('welcome-name').textContent = candidate ? `${candidate.prenom} 👋` : '👋';

  const [applications, favorites] = await Promise.all([
    Applications.getByCandidate(candidate.id),
    Favorites.getByCandidate(candidate.id),
  ]);

  document.getElementById('stat-total').textContent = applications.length;
  document.getElementById('stat-pending').textContent = applications.filter(a => a.statut === 'en_attente').length;
  document.getElementById('stat-accepted').textContent = applications.filter(a => a.statut === 'embauchee').length;
  document.getElementById('stat-favorites').textContent = favorites.length;

  const tbody = document.getElementById('recent-applications-body');
  const recent = applications.slice().sort((a,b) => new Date(b.dateCandidature) - new Date(a.dateCandidature)).slice(0,5);

  if (!recent.length){
    document.querySelector('.table-responsive').style.display = 'none';
    const emptyEl = document.getElementById('recent-applications-empty');
    emptyEl.style.display = 'block';
    emptyEl.innerHTML = `<div class="empty-state py-4"><i class="bi bi-send"></i>Vous n'avez pas encore postulé à une offre.</div>`;
  } else {
    tbody.innerHTML = (await Promise.all(recent.map(async app => {
      const job = await Jobs.getById(app.jobId);
      const company = job ? await Companies.getById(job.companyId) : null;
      return `
        <tr>
          <td><a href="../offre-detail.html?id=${app.jobId}" class="text-decoration-none" style="color:var(--text-primary);">${NeoUI.escapeHtml(job ? job.titre : 'Offre supprimée')}</a></td>
          <td class="text-muted-soft">${NeoUI.escapeHtml(company ? company.nom : '—')}</td>
          <td class="text-muted-soft">${NeoUI.formatDate(app.dateCandidature)}</td>
          <td>${NeoUI.statusPill(NeoUI.APP_STATUS, app.statut)}</td>
        </tr>
      `;
    }))).join('');
  }

  /* ---------- Recommended jobs (skill match) ---------- */
  const appliedJobIds = new Set(applications.map(a => a.jobId));
  const published = await Jobs.getPublished();
  const companies = await Companies.getAll();
  const companyById = new Map(companies.map(c => [c.id, c]));
  const recommended = published
    .filter(j => !appliedJobIds.has(j.id))
    .map(j => ({ job: j, score: NeoUI.matchScore(candidate.skills, j.competences) }))
    .filter(r => r.score !== null && r.score > 0)
    .sort((a,b) => b.score - a.score)
    .slice(0, 3);

  const recoContainer = document.getElementById('recommended-jobs-container');
  recoContainer.innerHTML = recommended.length
    ? recommended.map(r => NeoComponents.jobCard(r.job, { rootPrefix: '../', company: companyById.get(r.job.companyId), matchScore: r.score })).join('')
    : `<div class="col-12"><div class="empty-state py-4"><i class="bi bi-stars"></i>Ajoutez des compétences à votre profil pour recevoir des recommandations.</div></div>`;

  /* ---------- Profile completion ---------- */
  const completionItems = [
    { label: 'Photo de profil', done: !!candidate.photo },
    { label: 'Bio renseignée', done: !!(candidate.bio && candidate.bio.trim()) },
    { label: 'Au moins une compétence', done: (candidate.skills || []).length > 0 },
    { label: 'Ville renseignée', done: !!(candidate.ville && candidate.ville.trim()) },
    { label: 'CV téléversé', done: !!candidate.cvName },
  ];
  document.getElementById('completion-widget').innerHTML = NeoUI.completionWidgetHtml(completionItems);
  if (completionItems.some(i => !i.done)){
    document.getElementById('completion-widget').innerHTML += `<a href="profil.html" class="btn btn-neo-outline btn-sm w-100 mt-3">Compléter mon profil</a>`;
  }

  /* ---------- Badges ---------- */
  const allComplete = completionItems.every(i => i.done);
  const badges = [
    { earned: applications.length >= 1, icon: 'bi-flag-fill', pill: 'pill-cyan', label: 'Premier pas' },
    { earned: applications.length >= 5, icon: 'bi-fire', pill: 'pill-orange', label: 'Candidat actif' },
    { earned: allComplete, icon: 'bi-star-fill', pill: 'pill-mint', label: 'Profil complet' },
  ].filter(b => b.earned);

  document.getElementById('badges-container').innerHTML = badges.length
    ? badges.map(b => `<span class="pill ${b.pill}"><i class="bi ${b.icon}"></i> ${b.label}</span>`).join('')
    : `<span class="text-muted-soft small">Aucun badge pour le moment.</span>`;
})();
