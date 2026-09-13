/* ==========================================================================
   NeoJob — Shared UI Components (components.js)
   Injects navbar / footer / sidebar so markup isn't duplicated by hand on
   every page. renderHeader/renderSidebar are async (they read the session
   and notifications over the API); jobCard/candidateCard stay synchronous
   on purpose — they're called in tight render loops, so callers fetch
   company data once (e.g. via Companies.getAll()) and pass it in via
   opts.company rather than each card re-fetching its own company.
   ========================================================================== */

const NeoComponents = (() => {

  function navLinks(rootPrefix, active){
    const links = [
      { key: 'home', href: rootPrefix + 'index.html', label: 'Accueil' },
      { key: 'offres', href: rootPrefix + 'offres.html', label: 'Offres' },
    ];
    return links.map(l => `<li class="nav-item">
        <a class="nav-link ${active === l.key ? 'active' : ''}" href="${l.href}">${l.label}</a>
      </li>`).join('');
  }

  function guestButtons(rootPrefix){
    return `
      <a href="${rootPrefix}login.html" class="btn btn-neo-outline btn-sm px-3">Connexion</a>
      <a href="${rootPrefix}register.html" class="btn btn-neo-primary btn-sm px-3">S'inscrire</a>
    `;
  }

  function companyBadgeHtml(logoUrl, name, styleStr){
    styleStr = styleStr || '';
    if (logoUrl){
      return `<img src="${logoUrl}" class="company-badge-img" style="${styleStr}" alt="${NeoUI.escapeHtml(name)}">`;
    }
    return `<span class="company-badge" style="${styleStr}">${NeoUI.initials(name)}</span>`;
  }

  async function sessionAvatarInfo(session){
    if (session.role === 'candidat'){
      const c = typeof Candidates !== 'undefined' && await Candidates.getByUserId(session.userId);
      return { photo: c ? c.photo : null, name: c ? `${c.prenom} ${c.nom}` : session.email };
    }
    if (session.role === 'recruteur'){
      const c = typeof Companies !== 'undefined' && await Companies.getByUserId(session.userId);
      return { photo: c ? c.logo : null, name: c ? c.nom : session.email };
    }
    return { photo: null, name: session.email };
  }

  async function notificationBell(rootPrefix, session){
    if (typeof Notifications === 'undefined') return '';
    const { count, items } = await Notifications.getForSession(session, rootPrefix);
    const badge = count > 0 ? `<span class="notif-badge">${count > 9 ? '9+' : count}</span>` : '';
    const itemsHtml = items.length
      ? items.slice(0, 8).map(it => `
          <li><a class="dropdown-item notif-item small" href="${it.url}">
            ${it.message}
            <div class="text-muted-soft notif-date mt-1">${NeoUI.formatDate(it.date)}</div>
          </a></li>
        `).join('')
      : `<li><span class="dropdown-item-text text-muted-soft small">Aucune nouvelle notification.</span></li>`;

    return `
      <div class="dropdown">
        <button class="btn btn-neo-ghost notif-bell-btn" type="button" data-bs-toggle="dropdown" id="neo-notif-btn" aria-label="Notifications${count > 0 ? ` (${count} nouvelles)` : ''}">
          <i class="bi bi-bell fs-5"></i>
          ${badge}
        </button>
        <ul class="dropdown-menu dropdown-menu-end panel border-0 mt-2" style="width:320px; max-height:380px; overflow-y:auto;">
          <li><h6 class="dropdown-header text-muted-soft">Notifications</h6></li>
          ${itemsHtml}
        </ul>
      </div>
    `;
  }

  async function userMenu(rootPrefix, session){
    const home = rootPrefix + Auth.spaceHome(session.role);
    const roleLabel = { candidat: 'Candidat', recruteur: 'Recruteur', admin: 'Admin' }[session.role] || session.role;
    const avatarInfo = await sessionAvatarInfo(session);
    return `
      <div class="dropdown">
        <button class="btn btn-neo-ghost d-flex align-items-center gap-2 dropdown-toggle" type="button" data-bs-toggle="dropdown">
          ${NeoUI.avatarHtml(avatarInfo.photo, avatarInfo.name, 'width:32px;height:32px;font-size:.75rem;')}
          <span class="d-none d-md-inline small">${session.email}</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end panel border-0 mt-2">
          <li><span class="dropdown-item-text text-muted-soft small">Connecté en tant que <span class="pill pill-cyan">${roleLabel}</span></span></li>
          <li><hr class="dropdown-divider divider-soft"></li>
          <li><a class="dropdown-item" href="${home}"><i class="bi bi-speedometer2 me-2"></i>Mon espace</a></li>
          <li><a class="dropdown-item" href="${rootPrefix}parametres.html"><i class="bi bi-gear me-2"></i>Paramètres</a></li>
          <li><a class="dropdown-item text-danger" href="#" id="neo-logout-btn"><i class="bi bi-box-arrow-right me-2"></i>Déconnexion</a></li>
        </ul>
      </div>
    `;
  }

  async function renderHeader(opts){
    opts = opts || {};
    const rootPrefix = opts.rootPrefix || '';
    const active = opts.active || '';
    const el = document.getElementById('site-header');
    if (!el) return;
    const session = typeof Auth !== 'undefined' ? await Auth.current() : null;

    el.innerHTML = `
      <nav class="navbar navbar-expand-lg navbar-neo fixed-top">
        <div class="container">
          <a class="navbar-brand" href="${rootPrefix}index.html">
            <span class="logo-mark">N</span>
            <span>Neo<span class="text-gradient">Job</span></span>
          </a>
          <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#neoNav" aria-label="Ouvrir le menu">
            <i class="bi bi-list fs-2" style="color:var(--text-primary);"></i>
          </button>
          <div class="collapse navbar-collapse" id="neoNav">
            <ul class="navbar-nav me-auto ms-lg-4 mt-3 mt-lg-0">
              ${navLinks(rootPrefix, active)}
            </ul>
            <div class="d-flex align-items-center gap-2 mt-3 mt-lg-0">
              <button type="button" class="btn btn-neo-ghost d-flex align-items-center gap-2" id="neo-search-trigger" aria-label="Rechercher (Ctrl+K)">
                <i class="bi bi-search"></i>
                <kbd class="command-esc-hint d-none d-lg-inline">Ctrl K</kbd>
              </button>
              ${session ? await notificationBell(rootPrefix, session) : ''}
              ${session ? await userMenu(rootPrefix, session) : guestButtons(rootPrefix)}
            </div>
          </div>
        </div>
      </nav>
      <div style="height:76px;"></div>
    `;

    const searchTrigger = document.getElementById('neo-search-trigger');
    if (searchTrigger){
      searchTrigger.addEventListener('click', () => NeoPalette.open());
    }

    const logoutBtn = document.getElementById('neo-logout-btn');
    if (logoutBtn){
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await Auth.logout();
        window.location.href = rootPrefix + 'index.html';
      });
    }

    const notifBtn = document.getElementById('neo-notif-btn');
    if (notifBtn && session){
      notifBtn.addEventListener('shown.bs.dropdown', async () => {
        const info = await Notifications.getForSession(session, rootPrefix);
        if (!info.dismissible) return;
        await Notifications.markSeen(session);
        const badge = notifBtn.querySelector('.notif-badge');
        if (badge) badge.remove();
      });
    }
  }

  function renderFooter(opts){
    opts = opts || {};
    const rootPrefix = opts.rootPrefix || '';
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.innerHTML = `
      <footer class="footer-neo">
        <div class="container">
          <div class="row gy-4">
            <div class="col-lg-3">
              <a class="navbar-brand mb-2 d-inline-flex" href="${rootPrefix}index.html">
                <span class="logo-mark">N</span>
                <span>Neo<span class="text-gradient">Job</span></span>
              </a>
              <p class="text-muted-soft small mt-2 mb-0">La plateforme qui connecte les talents aux entreprises qui comptent.</p>
            </div>
            <div class="col-6 col-lg-3">
              <h6 class="text-muted-soft text-uppercase small mb-3">Candidats</h6>
              <ul class="list-unstyled d-flex flex-column gap-2">
                <li><a href="${rootPrefix}offres.html" class="text-muted-soft small">Voir les offres</a></li>
                <li><a href="${rootPrefix}simulateur-salaire.html" class="text-muted-soft small">Simulateur de salaire</a></li>
                <li><a href="${rootPrefix}register.html" class="text-muted-soft small">Créer un compte</a></li>
              </ul>
            </div>
            <div class="col-6 col-lg-3">
              <h6 class="text-muted-soft text-uppercase small mb-3">Recruteurs</h6>
              <ul class="list-unstyled d-flex flex-column gap-2">
                <li><a href="${rootPrefix}register.html" class="text-muted-soft small">Publier une offre</a></li>
                <li><a href="${rootPrefix}recruteur/rechercher-candidats.html" class="text-muted-soft small">Rechercher des candidats</a></li>
                <li><a href="${rootPrefix}tarifs.html" class="text-muted-soft small">Tarifs</a></li>
              </ul>
            </div>
            <div class="col-6 col-lg-3">
              <h6 class="text-muted-soft text-uppercase small mb-3">Entreprise</h6>
              <ul class="list-unstyled d-flex flex-column gap-2">
                <li><a href="${rootPrefix}a-propos.html" class="text-muted-soft small">À propos</a></li>
                <li><a href="${rootPrefix}contact.html" class="text-muted-soft small">Contact</a></li>
                <li><a href="${rootPrefix}faq.html" class="text-muted-soft small">FAQ</a></li>
              </ul>
            </div>
          </div>
          <hr class="divider-soft my-4">
          <p class="text-muted-soft small mb-0">&copy; 2026 NeoJob. Tous droits réservés.</p>
        </div>
      </footer>
    `;
  }

  const SIDEBAR_ITEMS = {
    candidat: [
      { key: 'dashboard', href: 'dashboard.html', icon: 'bi-speedometer2', label: 'Tableau de bord' },
      { key: 'candidatures', href: 'candidatures.html', icon: 'bi-send-check', label: 'Mes candidatures' },
      { key: 'favoris', href: 'favoris.html', icon: 'bi-heart', label: 'Offres favorites' },
      { key: 'alertes', href: 'alertes.html', icon: 'bi-bell', label: 'Mes alertes' },
      { key: 'profil', href: 'profil.html', icon: 'bi-person-circle', label: 'Mon profil' },
      { key: 'parametres', href: '../parametres.html', icon: 'bi-gear', label: 'Paramètres' },
    ],
    recruteur: [
      { key: 'dashboard', href: 'dashboard.html', icon: 'bi-speedometer2', label: 'Tableau de bord' },
      { key: 'poster-offre', href: 'poster-offre.html', icon: 'bi-plus-circle', label: 'Publier une offre' },
      { key: 'mes-offres', href: 'mes-offres.html', icon: 'bi-briefcase', label: 'Mes offres' },
      { key: 'candidatures', href: 'candidatures-recues.html', icon: 'bi-inbox', label: 'Candidatures reçues' },
      { key: 'rechercher-candidats', href: 'rechercher-candidats.html', icon: 'bi-search', label: 'Rechercher des candidats' },
      { key: 'profil', href: 'profil.html', icon: 'bi-building', label: "Profil entreprise" },
      { key: 'parametres', href: '../parametres.html', icon: 'bi-gear', label: 'Paramètres' },
    ],
    admin: [
      { key: 'dashboard', href: 'dashboard.html', icon: 'bi-speedometer2', label: 'Tableau de bord' },
      { key: 'moderation', href: 'moderation.html', icon: 'bi-shield-check', label: 'Modération des offres' },
      { key: 'avis', href: 'avis.html', icon: 'bi-chat-square-text', label: 'Avis des employés' },
      { key: 'entreprises', href: 'entreprises.html', icon: 'bi-patch-check', label: 'Entreprises' },
      { key: 'utilisateurs', href: 'utilisateurs.html', icon: 'bi-people', label: 'Utilisateurs' },
      { key: 'categories', href: 'categories.html', icon: 'bi-tags', label: 'Catégories' },
      { key: 'competences', href: 'competences.html', icon: 'bi-award', label: 'Compétences' },
      { key: 'parametres', href: '../parametres.html', icon: 'bi-gear', label: 'Paramètres' },
    ],
  };

  function sidebarNavHtml(role, active){
    const items = SIDEBAR_ITEMS[role] || [];
    return `
      <nav class="nav flex-column">
        ${items.map(it => `
          <a class="nav-link ${active === it.key ? 'active' : ''}" href="${it.href}">
            <i class="bi ${it.icon}"></i> ${it.label}
          </a>
        `).join('')}
      </nav>
    `;
  }

  function renderSidebar(opts){
    opts = opts || {};
    const role = opts.role;
    const active = opts.active || '';
    const navHtml = sidebarNavHtml(role, active);

    const desktopEl = document.getElementById('site-sidebar');
    if (desktopEl){
      desktopEl.innerHTML = `<div class="sidebar-neo p-3 h-100">${navHtml}</div>`;
    }

    const mobileEl = document.getElementById('site-sidebar-mobile');
    if (mobileEl){
      mobileEl.innerHTML = `<div class="sidebar-neo" style="background:transparent;border:none;">${navHtml}</div>`;
    }
  }

  /** company must already be resolved by the caller (e.g. from a
   *  Companies.getAll() lookup map) — kept synchronous since this runs in
   *  render loops and sort comparators. */
  function isFeaturedJob(company){
    return !!(company && company.plan === 'premium');
  }

  function jobCard(job, opts){
    opts = opts || {};
    const rootPrefix = opts.rootPrefix || '';
    const company = opts.company || { nom: 'Entreprise', ville: job.ville, logo: null, plan: 'free', verified: false };
    const favActive = !!opts.isFavorite;
    const favBtn = opts.showFavorite ? `
      <button type="button" class="btn btn-neo-ghost btn-sm p-1 job-fav-btn" data-job-id="${job.id}" aria-label="${favActive ? 'Retirer des favoris' : 'Ajouter aux favoris'}" title="${favActive ? 'Retirer des favoris' : 'Ajouter aux favoris'}">
        <i class="bi ${favActive ? 'bi-heart-fill' : 'bi-heart'}" style="color:${favActive ? 'var(--danger)' : 'var(--text-muted)'};"></i>
      </button>` : '';
    const featured = company.plan === 'premium';
    const compareChecked = !!opts.compareChecked;

    return `
      <div class="col-md-6 col-lg-4">
        <div class="card-neo job-card p-4 h-100 d-flex flex-column position-relative">
          ${opts.showCompare ? `
            <label class="d-flex align-items-center gap-2 small text-muted-soft mb-2" style="cursor:pointer;">
              <input type="checkbox" class="form-check-input compare-checkbox" data-job-id="${job.id}" ${compareChecked ? 'checked' : ''}>
              Comparer
            </label>` : ''}
          <div class="d-flex align-items-center gap-3 mb-3">
            ${companyBadgeHtml(company.logo, company.nom, 'width:46px;height:46px;')}
            <div class="flex-grow-1 overflow-hidden">
              <div class="fw-semibold text-truncate" style="color:var(--text-primary)">
                ${NeoUI.escapeHtml(company.nom)}
                ${company.verified ? '<i class="bi bi-patch-check-fill" style="color:var(--cyan);font-size:.8em;" title="Entreprise vérifiée"></i>' : ''}
              </div>
              <div class="text-muted-soft small">${NeoUI.escapeHtml(job.ville)} · ${NeoUI.escapeHtml(job.typeContrat)}</div>
            </div>
            ${favBtn}
          </div>
          <div class="d-flex flex-wrap gap-2 mb-2">
            ${featured ? '<span class="pill pill-featured"><i class="bi bi-stars"></i> Sponsorisé</span>' : ''}
            ${opts.matchScore != null ? NeoUI.matchScorePill(opts.matchScore) : ''}
          </div>
          <a href="${rootPrefix}offre-detail.html?id=${job.id}" class="text-decoration-none">
            <h6 class="mb-2" style="color:var(--text-primary)">${NeoUI.escapeHtml(job.titre)}</h6>
          </a>
          <div class="d-flex flex-wrap gap-2 mb-3">
            ${(job.competences || []).slice(0,3).map(c => `<span class="pill pill-violet">${NeoUI.escapeHtml(c)}</span>`).join('')}
          </div>
          <div class="mt-auto d-flex justify-content-between align-items-center">
            <span class="text-gradient fw-bold small">${NeoUI.formatMoney(job.salaireMin)} - ${NeoUI.formatMoney(job.salaireMax)}</span>
            <a href="${rootPrefix}offre-detail.html?id=${job.id}" class="btn btn-neo-outline btn-sm">Voir l'offre</a>
          </div>
        </div>
      </div>
    `;
  }

  function candidateCard(candidate, opts){
    opts = opts || {};
    const rootPrefix = opts.rootPrefix || '';
    const fullName = `${candidate.prenom} ${candidate.nom}`.trim();

    return `
      <div class="col-md-6 col-lg-4">
        <a href="${rootPrefix}candidat-profil.html?id=${candidate.id}" class="text-decoration-none">
          <div class="card-neo p-4 h-100 d-flex flex-column">
            <div class="d-flex align-items-center gap-3 mb-3">
              ${NeoUI.avatarHtml(candidate.photo, fullName, 'width:46px;height:46px;')}
              <div class="flex-grow-1 overflow-hidden">
                <div class="fw-semibold text-truncate" style="color:var(--text-primary)">${NeoUI.escapeHtml(fullName)}</div>
                <div class="text-muted-soft small">${NeoUI.escapeHtml(candidate.ville || 'Ville non renseignée')}</div>
              </div>
            </div>
            <p class="text-muted-soft small mb-3" style="display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
              ${NeoUI.escapeHtml(candidate.bio || 'Aucune bio renseignée.')}
            </p>
            <div class="d-flex flex-wrap gap-2 mt-auto">
              ${(candidate.skills || []).slice(0,3).map(s => {
                const isVerified = (candidate.verifiedSkills || []).includes(s);
                return `<span class="pill ${isVerified ? 'pill-mint' : 'pill-violet'}">${isVerified ? '<i class="bi bi-patch-check-fill me-1"></i>' : ''}${NeoUI.escapeHtml(s)}</span>`;
              }).join('')}
              ${!(candidate.skills || []).length ? '<span class="text-muted-soft small">Aucune compétence renseignée.</span>' : ''}
            </div>
          </div>
        </a>
      </div>
    `;
  }

  return { renderHeader, renderFooter, renderSidebar, jobCard, companyBadgeHtml, candidateCard, isFeaturedJob };
})();
