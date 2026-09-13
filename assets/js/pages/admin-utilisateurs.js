/* NeoJob — admin/utilisateurs.html page logic */

(async () => {
  const session = await Auth.guardPage('admin', '../');
  if (!session) return;

  await NeoComponents.renderHeader({ rootPrefix: '../' });
  NeoComponents.renderSidebar({ role: 'admin', active: 'utilisateurs' });

  const roleFilter = document.getElementById('role-filter');
  const tbody = document.getElementById('users-body');
  const ROLE_LABEL = { candidat: 'Candidat', recruteur: 'Recruteur', admin: 'Admin' };
  const ROLE_PILL = { candidat: 'pill-cyan', recruteur: 'pill-violet', admin: 'pill-orange' };

  async function profileFor(user){
    if (user.role === 'candidat') return Candidates.getByUserId(user.id);
    if (user.role === 'recruteur') return Companies.getByUserId(user.id);
    return null;
  }

  function displayName(user, profile){
    if (user.role === 'candidat') return profile ? `${profile.prenom} ${profile.nom}` : user.email;
    if (user.role === 'recruteur') return profile ? profile.nom : user.email;
    return 'Administrateur';
  }

  function avatarFor(user, profile, name){
    if (user.role === 'candidat') return NeoUI.avatarHtml(profile ? profile.photo : null, name, 'width:34px;height:34px;font-size:.78rem;');
    if (user.role === 'recruteur') return NeoComponents.companyBadgeHtml(profile ? profile.logo : null, name, 'width:34px;height:34px;font-size:.78rem;');
    return NeoUI.avatarHtml(null, name, 'width:34px;height:34px;font-size:.78rem;');
  }

  async function render(){
    let users = await Users.getAll();
    if (roleFilter.value) users = users.filter(u => u.role === roleFilter.value);
    users.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    tbody.innerHTML = (await Promise.all(users.map(async u => {
      const profile = await profileFor(u);
      const name = displayName(u, profile);
      return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            ${avatarFor(u, profile, name)}
            <div>
              <div class="fw-semibold">${NeoUI.escapeHtml(name)}</div>
              <div class="text-muted-soft small">${NeoUI.escapeHtml(u.email)}</div>
            </div>
          </div>
        </td>
        <td><span class="pill ${ROLE_PILL[u.role] || 'pill-muted'}">${ROLE_LABEL[u.role] || u.role}</span></td>
        <td class="text-muted-soft">${NeoUI.formatDate(u.createdAt)}</td>
        <td>${u.status === 'blocked' ? '<span class="pill pill-danger">Bloqué</span>' : '<span class="pill pill-mint">Actif</span>'}</td>
        <td class="text-end text-nowrap">
          ${u.role !== 'admin' ? `
            <button type="button" class="btn btn-neo-outline btn-sm toggle-status-btn" data-id="${u.id}" data-status="${u.status}">
              ${u.status === 'blocked' ? '<i class="bi bi-unlock"></i> Débloquer' : '<i class="bi bi-lock"></i> Bloquer'}
            </button>
            <button type="button" class="btn btn-danger-soft btn-sm delete-btn" data-id="${u.id}" aria-label="Supprimer l'utilisateur" title="Supprimer l'utilisateur"><i class="bi bi-trash"></i></button>
          ` : `<span class="text-muted-soft small">—</span>`}
        </td>
      </tr>
    `; }))).join('');

    tbody.querySelectorAll('.toggle-status-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const newStatus = btn.dataset.status === 'blocked' ? 'active' : 'blocked';
        await Users.setStatus(Number(btn.dataset.id), newStatus);
        NeoUI.toast(newStatus === 'blocked' ? 'Utilisateur bloqué.' : 'Utilisateur débloqué.', 'success');
        render();
      });
    });

    tbody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await NeoUI.confirmDialog("Supprimer définitivement ce compte utilisateur ?", "Supprimer l'utilisateur");
        if (!ok) return;
        await Users.remove(Number(btn.dataset.id));
        NeoUI.toast('Utilisateur supprimé.', 'success');
        render();
      });
    });
  }

  roleFilter.addEventListener('change', render);
  render();
})();
