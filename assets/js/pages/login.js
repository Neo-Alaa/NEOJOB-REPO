/* NeoJob — login.html page logic */

(async () => {
  await NeoComponents.renderHeader({ rootPrefix: '' });
  NeoComponents.renderFooter({ rootPrefix: '' });

  if (await Auth.isLoggedIn()){
    window.location.href = Auth.spaceHome((await Auth.current()).role);
    return;
  }

  const ROLE_LABEL = { candidat: 'Candidat', recruteur: 'Recruteur', admin: 'Admin' };

  // Known demo/seed accounts for quick access — plaintext passwords only ever
  // exist here (a fixed local list for grading convenience), never on the
  // server, which now only ever stores bcrypt hashes.
  const DEMO_ACCOUNTS = [
    { email: 'admin@neojob.com', password: 'admin123', role: 'admin' },
    { email: 'sara.recruteur@neojob.com', password: 'demo1234', role: 'recruteur' },
    { email: 'omar.recruteur@neojob.com', password: 'demo1234', role: 'recruteur' },
    { email: 'yassine.candidat@neojob.com', password: 'demo1234', role: 'candidat' },
    { email: 'imane.candidat@neojob.com', password: 'demo1234', role: 'candidat' },
  ];

  function renderDemoAccounts(){
    const list = document.getElementById('demo-accounts-list');
    list.innerHTML = DEMO_ACCOUNTS.map(u => `
      <button type="button" class="btn btn-neo-outline btn-sm d-flex justify-content-between align-items-center demo-account-btn"
        data-email="${u.email}" data-password="${u.password}">
        <span>${u.email}</span>
        <span class="pill pill-cyan">${ROLE_LABEL[u.role] || u.role}</span>
      </button>
    `).join('');

    list.querySelectorAll('.demo-account-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('login-email').value = btn.dataset.email;
        document.getElementById('login-password').value = btn.dataset.password;
      });
    });
  }

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorBox = document.getElementById('login-error');

    const result = await Auth.login(email, password);
    if (!result.ok){
      errorBox.textContent = result.error;
      errorBox.style.display = 'block';
      return;
    }
    errorBox.style.display = 'none';
    NeoUI.toast('Connexion réussie, bienvenue !', 'success');
    window.location.href = Auth.spaceHome(result.user.role);
  });

  renderDemoAccounts();
})();
