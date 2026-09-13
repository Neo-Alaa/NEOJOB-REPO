/* NeoJob — candidat-profil.html (public) page logic */

(async () => {
  await NeoComponents.renderHeader({ rootPrefix: '' });
  NeoComponents.renderFooter({ rootPrefix: '' });

  const root = document.getElementById('candidate-root');
  const params = new URLSearchParams(window.location.search);
  const candidateId = Number(params.get('id'));
  const candidate = candidateId ? await Candidates.getById(candidateId) : null;

  if (!candidate){
    root.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-person-x"></i>
        Ce profil n'existe pas.
        <div class="mt-3"><a href="index.html" class="btn btn-neo-outline btn-sm">Retour à l'accueil</a></div>
      </div>`;
    return;
  }

  const user = await Users.getById(candidate.userId);
  const fullName = `${candidate.prenom} ${candidate.nom}`.trim();
  const embedUrl = NeoUI.youtubeEmbedUrl(candidate.videoUrl);
  const verified = candidate.verifiedSkills || [];

  root.innerHTML = `
    <nav class="mb-3 no-print d-flex justify-content-between align-items-center">
      <a href="javascript:history.back()" class="text-muted-soft small"><i class="bi bi-arrow-left me-1"></i>Retour</a>
      <button type="button" class="btn btn-neo-outline btn-sm" onclick="window.print()"><i class="bi bi-printer me-1"></i> Imprimer / Télécharger le CV</button>
    </nav>

    <div class="row g-4">
      <div class="col-lg-8">
        <div class="panel p-4 p-md-5 mb-4">
          <div class="d-flex align-items-center gap-3 mb-4">
            ${NeoUI.avatarHtml(candidate.photo, fullName, 'width:64px;height:64px;font-size:1.3rem;')}
            <div>
              <h1 class="h4 mb-1">${NeoUI.escapeHtml(fullName)}</h1>
              <div class="text-muted-soft small"><i class="bi bi-geo-alt me-1"></i>${NeoUI.escapeHtml(candidate.ville || 'Ville non renseignée')}</div>
            </div>
          </div>

          <h6 class="mb-2">À propos</h6>
          <p class="text-secondary-soft mb-4">${NeoUI.escapeHtml(candidate.bio || "Ce candidat n'a pas encore renseigné de bio.")}</p>

          <h6 class="mb-2">Compétences</h6>
          <div class="d-flex flex-wrap gap-2">
            ${(candidate.skills || []).length
              ? candidate.skills.map(s => `<span class="pill ${verified.includes(s) ? 'pill-mint' : 'pill-violet'}">${verified.includes(s) ? '<i class="bi bi-patch-check-fill me-1" title="Compétence vérifiée"></i>' : ''}${NeoUI.escapeHtml(s)}</span>`).join('')
              : `<span class="text-muted-soft small">Aucune compétence renseignée.</span>`}
          </div>
        </div>

        ${embedUrl ? `
          <div class="panel p-3 mb-4 no-print">
            <h6 class="mb-3 px-2"><i class="bi bi-camera-reels me-1"></i> Vidéo de présentation</h6>
            <div style="position:relative; padding-top:56.25%; border-radius:var(--radius-md); overflow:hidden;">
              <iframe src="${embedUrl}" style="position:absolute; inset:0; width:100%; height:100%; border:0;" allowfullscreen title="Vidéo de présentation"></iframe>
            </div>
          </div>
        ` : ''}
      </div>

      <div class="col-lg-4">
        <div class="panel p-4">
          <h6 class="mb-3">Coordonnées</h6>
          <ul class="list-unstyled d-flex flex-column gap-3 mb-0">
            ${user ? `<li class="d-flex align-items-center gap-2 small"><i class="bi bi-envelope text-muted-soft"></i> <a href="mailto:${NeoUI.escapeHtml(user.email)}" class="text-decoration-none" style="color:var(--cyan);">${NeoUI.escapeHtml(user.email)}</a></li>` : ''}
            ${candidate.telephone ? `<li class="d-flex align-items-center gap-2 small"><i class="bi bi-telephone text-muted-soft"></i> ${NeoUI.escapeHtml(candidate.telephone)}</li>` : ''}
            <li class="d-flex align-items-center gap-2 small">
              <i class="bi bi-file-earmark-text text-muted-soft"></i>
              ${candidate.cvName ? `📄 ${NeoUI.escapeHtml(candidate.cvName)}` : `<span class="text-muted-soft">Aucun CV disponible</span>`}
            </li>
          </ul>
        </div>
      </div>
    </div>
  `;
})();
