/* NeoJob — admin/competences.html page logic */

(async () => {
  const session = await Auth.guardPage('admin', '../');
  if (!session) return;

  await NeoComponents.renderHeader({ rootPrefix: '../' });
  NeoComponents.renderSidebar({ role: 'admin', active: 'competences' });

  const form = document.getElementById('competence-form');
  const idInput = document.getElementById('comp-id');
  const nomInput = document.getElementById('comp-nom');
  const submitBtn = document.getElementById('comp-submit-btn');
  const cancelBtn = document.getElementById('comp-cancel-btn');
  const formTitle = document.getElementById('form-title');
  const tbody = document.getElementById('competences-body');

  function resetForm(){
    idInput.value = '';
    nomInput.value = '';
    submitBtn.textContent = 'Ajouter';
    formTitle.textContent = 'Ajouter une compétence';
    cancelBtn.style.display = 'none';
  }

  function usageCount(nom, jobs, candidates){
    const jobCount = jobs.filter(j => (j.competences || []).includes(nom)).length;
    const candidateCount = candidates.filter(c => (c.skills || []).includes(nom)).length;
    return { jobs: jobCount, candidates: candidateCount, total: jobCount + candidateCount };
  }

  async function render(){
    const [competences, jobs, candidates] = await Promise.all([Competences.getAll(), Jobs.getAll(), Candidates.getAll()]);

    tbody.innerHTML = competences.map(comp => {
      const usage = usageCount(comp.nom, jobs, candidates);
      return `
        <tr>
          <td>${NeoUI.escapeHtml(comp.nom)}</td>
          <td>
            <span class="pill pill-cyan">${usage.jobs} offre${usage.jobs > 1 ? 's' : ''}</span>
            <span class="pill pill-violet">${usage.candidates} candidat${usage.candidates > 1 ? 's' : ''}</span>
          </td>
          <td class="text-end">
            <button type="button" class="btn btn-neo-outline btn-sm edit-btn" data-id="${comp.id}" aria-label="Modifier la compétence" title="Modifier la compétence"><i class="bi bi-pencil"></i></button>
            <button type="button" class="btn btn-danger-soft btn-sm delete-btn" data-id="${comp.id}" aria-label="Supprimer la compétence" ${usage.total > 0 ? 'disabled title="Compétence utilisée"' : 'title="Supprimer la compétence"'}><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const comp = await Competences.getById(Number(btn.dataset.id));
        idInput.value = comp.id;
        nomInput.value = comp.nom;
        submitBtn.textContent = 'Enregistrer';
        formTitle.textContent = 'Modifier la compétence';
        cancelBtn.style.display = 'inline-block';
        nomInput.focus();
      });
    });

    tbody.querySelectorAll('.delete-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await NeoUI.confirmDialog('Supprimer cette compétence de la liste maîtresse ?', 'Supprimer la compétence');
        if (!ok) return;
        await Competences.remove(Number(btn.dataset.id));
        NeoUI.toast('Compétence supprimée.', 'success');
        render();
      });
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nom = nomInput.value.trim();
    if (!nom) return;

    if (idInput.value){
      await Competences.update(Number(idInput.value), { nom });
      NeoUI.toast('Compétence mise à jour.', 'success');
    } else {
      await Competences.create({ nom });
      NeoUI.toast('Compétence ajoutée.', 'success');
    }
    resetForm();
    render();
  });

  cancelBtn.addEventListener('click', resetForm);

  render();
})();
