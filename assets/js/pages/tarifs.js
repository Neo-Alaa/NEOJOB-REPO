/* NeoJob — tarifs.html page logic (recruiter plan upgrade) */

(async () => {
  await NeoComponents.renderHeader({ rootPrefix: '' });
  NeoComponents.renderFooter({ rootPrefix: '' });

  const session = await Auth.current();
  const btnFree = document.getElementById('btn-free');
  const btnPremium = document.getElementById('btn-premium');
  const note = document.getElementById('tarifs-note');

  async function render(){
    if (!session){
      btnFree.textContent = 'Créer un compte';
      btnFree.disabled = false;
      btnFree.onclick = () => window.location.href = 'register.html';
      btnPremium.textContent = 'Créer un compte recruteur';
      btnPremium.onclick = () => window.location.href = 'register.html';
      note.textContent = "Connectez-vous en tant que recruteur pour gérer votre abonnement.";
      return;
    }

    if (session.role !== 'recruteur'){
      btnFree.disabled = true;
      btnPremium.disabled = true;
      btnPremium.classList.remove('btn-neo-primary');
      btnPremium.classList.add('btn-neo-outline');
      note.textContent = "Les plans tarifaires concernent les comptes recruteurs.";
      return;
    }

    const company = await Companies.getByUserId(session.userId);
    const activeCount = await Companies.activeJobCount(company.id);

    if (company.plan === 'premium'){
      btnPremium.textContent = 'Plan actuel';
      btnPremium.disabled = true;
      note.innerHTML = `Vous êtes actuellement sur le plan <strong>Premium</strong>.`;
    } else {
      btnPremium.onclick = () => window.location.href = 'recruteur/paiement.html';
      note.textContent = `Vous utilisez actuellement ${activeCount} offre${activeCount > 1 ? 's' : ''} active${activeCount > 1 ? 's' : ''} sur 6 (plan gratuit).`;
    }
  }

  render();
})();
