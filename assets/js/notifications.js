/* ==========================================================================
   NeoJob — Notifications (notifications.js)
   Derives a small "unread events" feed per role from existing data (status
   changes on a candidat's applications, new candidatures for a recruteur's
   jobs, the admin's moderation backlog, interviews, messages, job alerts).
   Every lookup now goes through the async, fetch-based db.js helpers.
   ========================================================================== */

const Notifications = {

  async getForSession(session, rootPrefix){
    rootPrefix = rootPrefix || '';
    if (!session) return { count: 0, items: [], dismissible: false };

    if (session.role === 'candidat') return this._forCandidat(session, rootPrefix);
    if (session.role === 'recruteur') return this._forRecruteur(session, rootPrefix);
    if (session.role === 'admin') return this._forAdmin(session, rootPrefix);
    return { count: 0, items: [], dismissible: false };
  },

  async _forCandidat(session, rootPrefix){
    const candidate = await Candidates.getByUserId(session.userId);
    const user = await Users.getById(session.userId);
    if (!candidate || !user) return { count: 0, items: [], dismissible: true };
    const lastSeen = new Date(user.lastSeenNotifAt || 0);

    const applications = await Applications.getByCandidate(candidate.id);

    const statusItems = applications
      .filter(a => a.statut !== 'en_attente' && new Date(a.updatedAt || a.dateCandidature) > lastSeen)
      .map(async a => {
        const job = await Jobs.getById(a.jobId);
        const statusLabel = (NeoUI.APP_STATUS[a.statut] || {}).label || a.statut;
        return {
          message: `Votre candidature pour « ${job ? job.titre : 'une offre'} » est <strong>${statusLabel}</strong>.`,
          date: a.updatedAt || a.dateCandidature,
          url: rootPrefix + 'candidat/candidatures.html',
        };
      });

    const interviews = await Interviews.getByCandidate(candidate.id);
    const interviewItems = interviews
      .filter(iv => iv.statut === 'proposee' && new Date(iv.createdAt) > lastSeen)
      .map(async iv => {
        const job = await Jobs.getById(iv.jobId);
        return {
          message: `Un entretien vous a été proposé pour « ${job ? job.titre : 'une offre'} ». Choisissez un créneau.`,
          date: iv.createdAt,
          url: rootPrefix + 'candidat/candidatures.html',
        };
      });

    const alerts = await JobAlerts.getByCandidate(candidate.id);
    const alertItemLists = await Promise.all(alerts.map(async alert => {
      const matches = await JobAlerts.getMatchingJobs(alert);
      return matches
        .filter(j => new Date(j.datePublication) > lastSeen)
        .map(j => ({
          message: `Nouvelle offre pour votre alerte « ${alert.label} » : « ${j.titre} ».`,
          date: j.datePublication,
          url: rootPrefix + `offre-detail.html?id=${j.id}`,
        }));
    }));
    const alertItems = alertItemLists.flat();

    const messageItemLists = await Promise.all(applications.map(async a => {
      const msgs = await Messages.getByApplication(a.id);
      const fresh = msgs.filter(m => m.senderRole === 'recruteur' && new Date(m.dateEnvoi) > lastSeen);
      if (!fresh.length) return [];
      const job = await Jobs.getById(a.jobId);
      const company = job ? await Companies.getById(job.companyId) : null;
      return fresh.map(m => ({
        message: `Nouveau message de <strong>${company ? company.nom : 'un recruteur'}</strong> concernant « ${job ? job.titre : 'votre candidature'} ».`,
        date: m.dateEnvoi,
        url: rootPrefix + 'candidat/candidatures.html',
      }));
    }));
    const messageItems = messageItemLists.flat();

    const items = (await Promise.all(statusItems.concat(interviewItems)))
      .concat(alertItems, messageItems)
      .sort((a,b) => new Date(b.date) - new Date(a.date));

    return { count: items.length, items, dismissible: true };
  },

  async _forRecruteur(session, rootPrefix){
    const company = await Companies.getByUserId(session.userId);
    const user = await Users.getById(session.userId);
    if (!company || !user) return { count: 0, items: [], dismissible: true };
    const lastSeen = new Date(user.lastSeenNotifAt || 0);
    const jobs = await Jobs.getByCompany(company.id);
    const jobIds = jobs.map(j => j.id);

    const allApplications = await Applications.getAll();
    const myApplications = allApplications.filter(a => jobIds.includes(a.jobId));

    const applicationItems = await Promise.all(
      myApplications
        .filter(a => new Date(a.dateCandidature) > lastSeen)
        .map(async a => {
          const job = await Jobs.getById(a.jobId);
          const candidate = await Candidates.getById(a.candidateId);
          return {
            message: `Nouvelle candidature de <strong>${candidate ? `${candidate.prenom} ${candidate.nom}` : 'un candidat'}</strong> pour « ${job ? job.titre : 'une offre'} ».`,
            date: a.dateCandidature,
            url: rootPrefix + `recruteur/candidatures-recues.html?offre_id=${a.jobId}`,
          };
        })
    );

    const interviews = await Interviews.getByCompany(company.id);
    const interviewItems = await Promise.all(
      interviews
        .filter(iv => iv.statut === 'confirmee' && new Date(iv.updatedAt) > lastSeen)
        .map(async iv => {
          const job = await Jobs.getById(iv.jobId);
          const candidate = await Candidates.getById(iv.candidateId);
          return {
            message: `<strong>${candidate ? `${candidate.prenom} ${candidate.nom}` : 'Un candidat'}</strong> a confirmé l'entretien pour « ${job ? job.titre : 'une offre'} ».`,
            date: iv.updatedAt,
            url: rootPrefix + `recruteur/candidatures-recues.html?offre_id=${iv.jobId}`,
          };
        })
    );

    const messageItemLists = await Promise.all(myApplications.map(async a => {
      const msgs = await Messages.getByApplication(a.id);
      const fresh = msgs.filter(m => m.senderRole === 'candidat' && new Date(m.dateEnvoi) > lastSeen);
      if (!fresh.length) return [];
      const job = await Jobs.getById(a.jobId);
      const candidate = await Candidates.getById(a.candidateId);
      return fresh.map(m => ({
        message: `Nouveau message de <strong>${candidate ? `${candidate.prenom} ${candidate.nom}` : 'un candidat'}</strong> concernant « ${job ? job.titre : 'une offre'} ».`,
        date: m.dateEnvoi,
        url: rootPrefix + `recruteur/candidatures-recues.html?offre_id=${a.jobId}`,
      }));
    }));
    const messageItems = messageItemLists.flat();

    const items = applicationItems.concat(interviewItems, messageItems).sort((a,b) => new Date(b.date) - new Date(a.date));

    return { count: items.length, items, dismissible: true };
  },

  async _forAdmin(session, rootPrefix){
    const pendingJobsRaw = await Jobs.getPending();
    const pendingJobs = await Promise.all(pendingJobsRaw.map(async j => {
      const company = await Companies.getById(j.companyId);
      return {
        message: `Offre en attente : « ${j.titre} » — ${company ? company.nom : 'entreprise'}.`,
        date: j.datePublication,
        url: rootPrefix + 'admin/moderation.html',
      };
    }));

    const pendingReviewsRaw = await Reviews.getPending();
    const pendingReviews = await Promise.all(pendingReviewsRaw.map(async r => {
      const company = await Companies.getById(r.companyId);
      return {
        message: `Avis en attente : « ${r.titre} » — ${company ? company.nom : 'entreprise'}.`,
        date: r.dateCreation,
        url: rootPrefix + 'admin/avis.html',
      };
    }));

    const items = pendingJobs.concat(pendingReviews).sort((a,b) => new Date(b.date) - new Date(a.date));

    // Admin's bell reflects the live moderation queue, not a dismissible
    // "seen" state — it should still show a count next time the queue is empty.
    return { count: items.length, items, dismissible: false };
  },

  async markSeen(session){
    if (!session || !session.userId) return;
    if (session.role !== 'candidat' && session.role !== 'recruteur') return;
    await Users.markNotificationsSeen(session.userId);
  },
};
