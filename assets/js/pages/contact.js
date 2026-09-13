/* NeoJob — contact.html page logic (mock submit, no backend yet) */

(async () => {
  await NeoComponents.renderHeader({ rootPrefix: '' });
  NeoComponents.renderFooter({ rootPrefix: '' });

  const session = await Auth.current();
  if (session){
    const candidate = session.role === 'candidat' ? await Candidates.getByUserId(session.userId) : null;
    document.getElementById('c-email').value = session.email;
    if (candidate) document.getElementById('c-nom').value = `${candidate.prenom} ${candidate.nom}`.trim();
  }

  document.getElementById('contact-form').addEventListener('submit', (e) => {
    e.preventDefault();
    NeoUI.toast('Message envoyé ! Notre équipe vous répondra sous 24 à 48h.', 'success');
    e.target.reset();
  });
})();
