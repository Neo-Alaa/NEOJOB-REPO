/* NeoJob — recruteur/profil.html page logic */

(async () => {
  const session = await Auth.guardPage('recruteur', '../');
  if (!session) return;

  await NeoComponents.renderHeader({ rootPrefix: '../' });
  NeoComponents.renderSidebar({ role: 'recruteur', active: 'profil' });

  let company = await Companies.getByUserId(session.userId);
  let pendingLogo = company.logo || null;

  function renderAvatar(){
    document.getElementById('company-avatar').innerHTML = NeoComponents.companyBadgeHtml(pendingLogo, company.nom, 'width:72px;height:72px;font-size:1.4rem;');
  }

  function fillForm(){
    document.getElementById('c-nom').value = company.nom || '';
    document.getElementById('c-secteur').value = company.secteur || '';
    document.getElementById('c-ville').value = company.ville || '';
    document.getElementById('c-siteweb').value = company.siteWeb || '';
    document.getElementById('c-description').value = company.description || '';
    document.getElementById('c-video').value = company.videoUrl || '';

    renderAvatar();
    document.getElementById('company-name').textContent = company.nom || 'Entreprise';
    document.getElementById('company-email').textContent = session.email;

    renderBilling();
    renderPhotoGallery();
  }

  function renderPhotoGallery(){
    const container = document.getElementById('photo-gallery-manage');
    const photos = company.photos || [];
    if (!photos.length){
      container.innerHTML = `<div class="col-12"><span class="text-muted-soft small">Aucune photo ajoutée pour le moment.</span></div>`;
      return;
    }
    container.innerHTML = photos.map((p, i) => `
      <div class="col-4 col-md-3 position-relative">
        <img src="${p}" style="width:100%; height:90px; object-fit:cover; border-radius:var(--radius-sm); border:1px solid var(--border-soft);">
        <button type="button" class="btn btn-danger-soft btn-sm remove-photo-btn" data-index="${i}" aria-label="Supprimer la photo" title="Supprimer la photo"
          style="position:absolute; top:4px; right:4px; padding:.15rem .4rem; line-height:1;">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    `).join('');

    container.querySelectorAll('.remove-photo-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const photos = (company.photos || []).slice();
        photos.splice(Number(btn.dataset.index), 1);
        company = await Companies.update(company.id, { photos });
        renderPhotoGallery();
        NeoUI.toast('Photo supprimée.', 'success');
      });
    });
  }

  async function renderBilling(){
    const planPill = document.getElementById('billing-plan-pill');
    const historyEl = document.getElementById('billing-history');
    const cta = document.getElementById('billing-cta');

    if (company.plan === 'premium'){
      planPill.className = 'pill pill-violet';
      planPill.innerHTML = '<i class="bi bi-stars"></i> Premium';
      cta.style.display = 'none';
    } else {
      planPill.className = 'pill pill-cyan';
      planPill.textContent = 'Gratuit';
      cta.style.display = '';
    }

    const payments = await Payments.getByCompany(company.id);
    if (!payments.length){
      historyEl.innerHTML = `<span class="text-muted-soft small">Aucun paiement effectué.</span>`;
      return;
    }
    historyEl.innerHTML = payments.slice(0, 5).map(p => `
      <div class="d-flex justify-content-between align-items-center small">
        <span class="text-muted-soft">${NeoUI.formatDate(p.date)}</span>
        <span>${p.montant.toFixed(2)} MAD</span>
      </div>
    `).join('');
  }

  document.getElementById('c-logo-input').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try{
      const uploaded = await Uploads.upload(file, 'photo');
      pendingLogo = uploaded.path;
      renderAvatar();
    }catch(err){
      NeoUI.toast(err.message, 'danger');
    }
  });

  document.getElementById('c-photos-input').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try{
      const uploaded = await Promise.all(files.map(f => Uploads.upload(f, 'photo')));
      company = await Companies.update(company.id, { photos: (company.photos || []).concat(uploaded.map(u => u.path)) });
      renderPhotoGallery();
      NeoUI.toast(`${files.length} photo${files.length > 1 ? 's' : ''} ajoutée${files.length > 1 ? 's' : ''}.`, 'success');
    }catch(err){
      NeoUI.toast(err.message, 'danger');
    }
    e.target.value = '';
  });

  document.getElementById('company-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    company = await Companies.update(company.id, {
      nom: document.getElementById('c-nom').value.trim(),
      secteur: document.getElementById('c-secteur').value.trim(),
      ville: document.getElementById('c-ville').value.trim(),
      siteWeb: document.getElementById('c-siteweb').value.trim(),
      description: document.getElementById('c-description').value.trim(),
      videoUrl: document.getElementById('c-video').value.trim(),
      logo: pendingLogo,
    });
    NeoUI.toast('Profil entreprise mis à jour.', 'success');
    fillForm();
    NeoComponents.renderHeader({ rootPrefix: '../' });
  });

  fillForm();
})();
