/* NeoJob — parametres.html page logic (any logged-in role) */

(async () => {
  const session = await Auth.guardPage(null, '');

  if (session){
    await NeoComponents.renderHeader({ rootPrefix: '' });
    NeoComponents.renderSidebar({ role: session.role, active: 'parametres' });

    /* ---------- Appearance ---------- */
    const themeButtons = document.querySelectorAll('.theme-option');

    function renderThemeState(){
      const current = NeoTheme.get();
      themeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.themeChoice === current);
      });
    }

    themeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        NeoTheme.set(btn.dataset.themeChoice);
        renderThemeState();
        NeoUI.toast(btn.dataset.themeChoice === 'light' ? 'Thème clair activé.' : 'Thème sombre activé.', 'success');
      });
    });

    renderThemeState();

    /* ---------- Security: change password ---------- */
    document.getElementById('password-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const current = document.getElementById('current-password').value;
      const next = document.getElementById('new-password').value;
      const confirm = document.getElementById('confirm-password').value;
      const errorBox = document.getElementById('password-error');

      function showError(msg){
        errorBox.textContent = msg;
        errorBox.style.display = 'block';
      }

      if (next !== confirm){
        showError('Les nouveaux mots de passe ne correspondent pas.');
        return;
      }

      const result = await Auth.changePassword(current, next);
      if (!result.ok){
        showError(result.error);
        return;
      }

      errorBox.style.display = 'none';
      e.target.reset();
      NeoUI.toast('Mot de passe mis à jour.', 'success');
    });

    /* ---------- Danger zone: delete account ---------- */
    document.getElementById('delete-account-btn').addEventListener('click', async () => {
      const ok = await NeoUI.confirmDialog(
        'Cette action supprimera définitivement votre compte NeoJob. Cette action est irréversible.',
        'Supprimer mon compte'
      );
      if (!ok) return;

      await Users.remove(session.userId);
      NeoUI.toast('Votre compte a été supprimé.', 'success');
      window.location.href = 'index.html';
    });
  }
})();
