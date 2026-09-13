/* NeoJob — admin/categories.html page logic */

(async () => {
  const session = await Auth.guardPage('admin', '../');
  if (!session) return;

  await NeoComponents.renderHeader({ rootPrefix: '../' });
  NeoComponents.renderSidebar({ role: 'admin', active: 'categories' });

  const form = document.getElementById('category-form');
  const idInput = document.getElementById('cat-id');
  const nomInput = document.getElementById('cat-nom');
  const submitBtn = document.getElementById('cat-submit-btn');
  const cancelBtn = document.getElementById('cat-cancel-btn');
  const formTitle = document.getElementById('form-title');
  const tbody = document.getElementById('categories-body');

  function resetForm(){
    idInput.value = '';
    nomInput.value = '';
    submitBtn.textContent = 'Ajouter';
    formTitle.textContent = 'Ajouter une catégorie';
    cancelBtn.style.display = 'none';
  }

  async function render(){
    const [categories, jobs] = await Promise.all([Categories.getAll(), Jobs.getAll()]);

    tbody.innerHTML = categories.map(cat => {
      const count = jobs.filter(j => j.categoryId === cat.id).length;
      return `
        <tr>
          <td>${NeoUI.escapeHtml(cat.nom)}</td>
          <td><span class="pill pill-cyan">${count} offre${count > 1 ? 's' : ''}</span></td>
          <td class="text-end">
            <button type="button" class="btn btn-neo-outline btn-sm edit-btn" data-id="${cat.id}" aria-label="Modifier la catégorie" title="Modifier la catégorie"><i class="bi bi-pencil"></i></button>
            <button type="button" class="btn btn-danger-soft btn-sm delete-btn" data-id="${cat.id}" aria-label="Supprimer la catégorie" ${count > 0 ? 'disabled title="Catégorie utilisée par des offres"' : 'title="Supprimer la catégorie"'}><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cat = await Categories.getById(Number(btn.dataset.id));
        idInput.value = cat.id;
        nomInput.value = cat.nom;
        submitBtn.textContent = 'Enregistrer';
        formTitle.textContent = 'Modifier la catégorie';
        cancelBtn.style.display = 'inline-block';
        nomInput.focus();
      });
    });

    tbody.querySelectorAll('.delete-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await NeoUI.confirmDialog('Supprimer cette catégorie ?', 'Supprimer la catégorie');
        if (!ok) return;
        await Categories.remove(Number(btn.dataset.id));
        NeoUI.toast('Catégorie supprimée.', 'success');
        render();
      });
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nom = nomInput.value.trim();
    if (!nom) return;

    if (idInput.value){
      await Categories.update(Number(idInput.value), { nom });
      NeoUI.toast('Catégorie mise à jour.', 'success');
    } else {
      await Categories.create({ nom });
      NeoUI.toast('Catégorie ajoutée.', 'success');
    }
    resetForm();
    render();
  });

  cancelBtn.addEventListener('click', resetForm);

  render();
})();
