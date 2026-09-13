/* NeoJob — recruteur/poster-offre.html page logic (create + edit) */

(async () => {
  const session = await Auth.guardPage('recruteur', '../');
  if (!session) return;

  await NeoComponents.renderHeader({ rootPrefix: '../' });
  NeoComponents.renderSidebar({ role: 'recruteur', active: 'poster-offre' });

  const company = await Companies.getByUserId(session.userId);
  const params = new URLSearchParams(window.location.search);
  const editId = params.get('id') ? Number(params.get('id')) : null;
  const existingJob = editId ? await Jobs.getById(editId) : null;
  const isEdit = !!(existingJob && existingJob.companyId === company.id);

  // Editing an existing job never adds to the active-job count, so the free
  // plan limit only blocks *new* postings.
  if (!isEdit && await Companies.hasReachedFreeLimit(company.id)){
    document.getElementById('plan-limit-panel').style.display = 'block';
    document.getElementById('job-form-row').style.display = 'none';
  }

  let skills = isEdit ? (existingJob.competences || []).slice() : [];

  async function populateCategories(){
    const select = document.getElementById('j-categorie');
    const cats = await Categories.getAll();
    select.innerHTML = cats.map(c => `<option value="${c.id}">${NeoUI.escapeHtml(c.nom)}</option>`).join('');
  }

  function renderSkills(){
    const list = document.getElementById('skills-list');
    if (!skills.length){
      list.innerHTML = `<span class="text-muted-soft small">Aucune compétence ajoutée.</span>`;
      return;
    }
    list.innerHTML = skills.map((s, i) => `
      <span class="pill pill-violet">
        ${NeoUI.escapeHtml(s)}
        <i class="bi bi-x-lg ms-1" style="cursor:pointer;" data-index="${i}"></i>
      </span>
    `).join('');
    list.querySelectorAll('i[data-index]').forEach(icon => {
      icon.addEventListener('click', () => {
        skills.splice(Number(icon.dataset.index), 1);
        renderSkills();
      });
    });
  }

  async function populateSkillsDatalist(){
    const comps = await Competences.getAll();
    document.getElementById('skills-datalist').innerHTML =
      comps.map(c => `<option value="${NeoUI.escapeHtml(c.nom)}">`).join('');
  }

  document.getElementById('skill-input').addEventListener('keydown', async (e) => {
    if (e.key === 'Enter'){
      e.preventDefault();
      const raw = e.target.value.trim();
      if (raw){
        const canonical = await Competences.findOrCreateByName(raw);
        if (!skills.includes(canonical)){
          skills.push(canonical);
          renderSkills();
          populateSkillsDatalist();
        }
      }
      e.target.value = '';
    }
  });

  function fillFormForEdit(){
    if (!isEdit) return;
    document.getElementById('page-title').textContent = "Modifier l'offre";
    document.getElementById('submit-btn').textContent = 'Enregistrer les modifications';
    document.getElementById('j-titre').value = existingJob.titre;
    document.getElementById('j-categorie').value = existingJob.categoryId;
    document.getElementById('j-contrat').value = existingJob.typeContrat;
    document.getElementById('j-ville').value = existingJob.ville;
    document.getElementById('j-remote').checked = !!existingJob.remote;
    document.getElementById('j-salaire-min').value = existingJob.salaireMin || '';
    document.getElementById('j-salaire-max').value = existingJob.salaireMax || '';
    document.getElementById('j-description').value = existingJob.description;
  }

  document.getElementById('job-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      titre: document.getElementById('j-titre').value.trim(),
      categoryId: Number(document.getElementById('j-categorie').value),
      typeContrat: document.getElementById('j-contrat').value,
      ville: document.getElementById('j-ville').value.trim(),
      remote: document.getElementById('j-remote').checked,
      salaireMin: Number(document.getElementById('j-salaire-min').value) || 0,
      salaireMax: Number(document.getElementById('j-salaire-max').value) || 0,
      description: document.getElementById('j-description').value.trim(),
      competences: skills,
    };

    if (isEdit){
      await Jobs.update(existingJob.id, Object.assign({}, payload, { statut: 'en_attente' }));
      NeoUI.toast('Offre mise à jour. Elle repasse en modération avant republication.', 'success');
    } else {
      await Jobs.create(Object.assign({ companyId: company.id }, payload));
      NeoUI.toast('Offre soumise pour modération.', 'success');
    }
    window.location.href = 'mes-offres.html';
  });

  populateCategories();
  populateSkillsDatalist();
  fillFormForEdit();
  renderSkills();
})();
