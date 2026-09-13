/* NeoJob — recruteur/paiement.html page logic (simulated checkout) */

(async () => {
  const session = await Auth.guardPage('recruteur', '../');
  if (!session) return;

  await NeoComponents.renderHeader({ rootPrefix: '../' });

  let company = await Companies.getByUserId(session.userId);

  if (company.plan === 'premium'){
    NeoUI.toast('Vous êtes déjà sur le plan Premium.', 'info');
    window.location.href = 'dashboard.html';
    return;
  }

  const root = document.getElementById('payment-root');

  // Payment method tabs
  const methodTabs = document.querySelectorAll('#method-tabs [data-method]');
  const cardForm = document.getElementById('card-form');
  const transferPanel = document.getElementById('transfer-panel');
  document.getElementById('transfer-ref').textContent = `NEO-${company.id}-${Date.now().toString().slice(-6)}`;

  methodTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      methodTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isCard = tab.dataset.method === 'carte';
      cardForm.style.display = isCard ? '' : 'none';
      transferPanel.style.display = isCard ? 'none' : '';
    });
  });

  // Card number auto-spacing (#### #### #### ####)
  document.getElementById('pay-card-number').addEventListener('input', (e) => {
    let digits = e.target.value.replace(/\D/g, '').slice(0, 16);
    e.target.value = digits.replace(/(.{4})/g, '$1 ').trim();
  });

  // Expiry auto-slash (MM/AA)
  document.getElementById('pay-expiry').addEventListener('input', (e) => {
    let digits = e.target.value.replace(/\D/g, '').slice(0, 4);
    e.target.value = digits.length > 2 ? `${digits.slice(0,2)}/${digits.slice(2)}` : digits;
  });

  document.getElementById('pay-cvc').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 3);
  });

  document.getElementById('card-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const cardDigits = document.getElementById('pay-card-number').value.replace(/\D/g, '');
    const expiry = document.getElementById('pay-expiry').value;

    if (cardDigits.length !== 16){
      NeoUI.toast('Numéro de carte invalide (16 chiffres attendus).', 'warning');
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry)){
      NeoUI.toast("Date d'expiration invalide (format MM/AA).", 'warning');
      return;
    }

    const btn = document.getElementById('pay-submit-btn');
    processPayment(btn);
  });

  document.getElementById('transfer-confirm-btn').addEventListener('click', () => {
    processPayment(document.getElementById('transfer-confirm-btn'));
  });

  function processPayment(btn){
    btn.disabled = true;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Traitement du paiement...`;

    setTimeout(async () => {
      const payment = await Payments.create({ companyId: company.id, montant: 358.80 });
      await Companies.upgradeToPremium(company.id);
      showSuccess(payment);
    }, 1200);
  }

  function showSuccess(payment){
    root.innerHTML = `
      <div class="row justify-content-center">
        <div class="col-lg-6">
          <div class="panel p-5 text-center">
            <div class="mx-auto mb-3" style="width:64px;height:64px;border-radius:50%;background:rgba(109,240,192,.12);display:flex;align-items:center;justify-content:center;">
              <i class="bi bi-check-lg" style="font-size:1.8rem;color:var(--mint);"></i>
            </div>
            <h2 class="h5 mb-2">Paiement réussi !</h2>
            <p class="text-muted-soft mb-4">Votre compte est maintenant Premium. Profitez des offres illimitées et de la recherche de candidats avancée.</p>
            <div class="panel p-3 mb-4 text-start" style="background:var(--bg-panel-alt);">
              <div class="d-flex justify-content-between small py-1"><span class="text-muted-soft">Référence</span><span>NEO-${payment.id}</span></div>
              <div class="d-flex justify-content-between small py-1"><span class="text-muted-soft">Montant</span><span>358,80 MAD</span></div>
              <div class="d-flex justify-content-between small py-1"><span class="text-muted-soft">Date</span><span>${NeoUI.formatDate(payment.date)}</span></div>
            </div>
            <a href="dashboard.html" class="btn btn-neo-primary w-100">Aller à mon tableau de bord</a>
          </div>
        </div>
      </div>
    `;
    NeoComponents.renderHeader({ rootPrefix: '../' });
    NeoUI.confetti();
  }
})();
