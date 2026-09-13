/* NeoJob — register.html page logic */

(async () => {
  await NeoComponents.renderHeader({ rootPrefix: '' });
  NeoComponents.renderFooter({ rootPrefix: '' });

  if (await Auth.isLoggedIn()){
    window.location.href = Auth.spaceHome((await Auth.current()).role);
    return;
  }

  let selectedRole = 'candidat';

  document.querySelectorAll('.role-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.role-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      selectedRole = opt.dataset.role;
      document.getElementById('fields-candidat').style.display = selectedRole === 'candidat' ? 'flex' : 'none';
      document.getElementById('fields-recruteur').style.display = selectedRole === 'recruteur' ? 'flex' : 'none';
    });
  });

  function showError(msg){
    const box = document.getElementById('register-error');
    box.textContent = msg;
    box.style.display = 'block';
  }

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const passwordConfirm = document.getElementById('reg-password-confirm').value;

    if (!email || !password){
      showError('Merci de remplir tous les champs obligatoires.');
      return;
    }
    if (password.length < 6){
      showError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== passwordConfirm){
      showError('Les mots de passe ne correspondent pas.');
      return;
    }

    const payload = { email, password, role: selectedRole };

    if (selectedRole === 'candidat'){
      payload.prenom = document.getElementById('reg-prenom').value.trim();
      payload.nom = document.getElementById('reg-nom').value.trim();
      if (!payload.prenom || !payload.nom){
        showError('Merci de renseigner votre prénom et nom.');
        return;
      }
    } else {
      payload.nom = document.getElementById('reg-entreprise').value.trim();
      payload.secteur = document.getElementById('reg-secteur').value.trim();
      if (!payload.nom){
        showError('Merci de renseigner le nom de votre entreprise.');
        return;
      }
    }

    const result = await Auth.register(payload);
    if (!result.ok){
      showError(result.error);
      return;
    }

    document.getElementById('register-error').style.display = 'none';
    NeoUI.toast('Compte créé avec succès, bienvenue sur NeoJob !', 'success');
    NeoUI.confetti();
    setTimeout(() => { window.location.href = Auth.spaceHome(result.user.role); }, 900);
  });
})();
