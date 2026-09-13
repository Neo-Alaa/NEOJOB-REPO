/* NeoJob — candidat/profil.html page logic */

(async () => {
  const session = await Auth.guardPage("candidat", "../");
  if (!session) return;

  await NeoComponents.renderHeader({ rootPrefix: "../" });
  NeoComponents.renderSidebar({ role: "candidat", active: "profil" });

  let candidate = await Candidates.getByUserId(session.userId);
  let skills = (candidate.skills || []).slice();
  let pendingPhoto = candidate.photo || null;
  let pendingCv = {
    name: candidate.cvName || null,
    path: candidate.cvPath || null,
  };

  function renderAvatar() {
    const name = `${candidate.prenom} ${candidate.nom}`;
    document.getElementById("profile-avatar").innerHTML = NeoUI.avatarHtml(
      pendingPhoto,
      name,
      "width:72px;height:72px;font-size:1.4rem;",
    );
  }

  function fillForm() {
    document.getElementById("p-prenom").value = candidate.prenom || "";
    document.getElementById("p-nom").value = candidate.nom || "";
    document.getElementById("p-ville").value = candidate.ville || "";
    document.getElementById("p-telephone").value = candidate.telephone || "";
    document.getElementById("p-bio").value = candidate.bio || "";
    document.getElementById("p-video").value = candidate.videoUrl || "";
    document.getElementById("cv-current").textContent = pendingCv.name
      ? `CV actuel : ${pendingCv.name}`
      : "Aucun CV téléversé.";

    renderAvatar();
    document.getElementById("profile-fullname").textContent =
      `${candidate.prenom} ${candidate.nom}`.trim() || "Candidat NeoJob";
    document.getElementById("profile-email").textContent = session.email;
    document.getElementById("view-public-profile-link").href =
      `../candidat-profil.html?id=${candidate.id}`;

    renderSkills();
  }

  document.getElementById("p-photo").addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const uploaded = await Uploads.upload(file, "photo");
      pendingPhoto = uploaded.path;
      renderAvatar();
    } catch (err) {
      NeoUI.toast(err.message, "danger");
    }
  });

  document.getElementById("p-cv").addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const uploaded = await Uploads.upload(file, "cv");
      pendingCv = { name: uploaded.name, path: uploaded.path };
      document.getElementById("cv-current").textContent =
        `CV actuel : ${pendingCv.name}`;
    } catch (err) {
      NeoUI.toast(err.message, "danger");
    }
  });

  function renderSkills() {
    const list = document.getElementById("skills-list");
    if (!skills.length) {
      list.innerHTML = `<span class="text-muted-soft small">Aucune compétence ajoutée.</span>`;
      return;
    }
    const verified = candidate.verifiedSkills || [];
    list.innerHTML = skills
      .map((s, i) => {
        const isVerified = verified.includes(s);
        const hasQuiz = typeof NeoQuizData !== "undefined" && NeoQuizData[s];
        return `
        <span class="pill ${isVerified ? "pill-mint" : "pill-violet"}">
          ${isVerified ? '<i class="bi bi-patch-check-fill me-1" title="Compétence vérifiée"></i>' : ""}
          ${NeoUI.escapeHtml(s)}
          ${!isVerified && hasQuiz ? `<button type="button" class="btn-quiz-trigger" data-skill="${NeoUI.escapeHtml(s)}" title="Passer le quiz de vérification">Vérifier</button>` : ""}
          <i class="bi bi-x-lg ms-1" style="cursor:pointer;" data-index="${i}"></i>
        </span>
      `;
      })
      .join("");
    list.querySelectorAll("i[data-index]").forEach((icon) => {
      icon.addEventListener("click", () => {
        skills.splice(Number(icon.dataset.index), 1);
        renderSkills();
      });
    });
    list.querySelectorAll(".btn-quiz-trigger").forEach((btn) => {
      btn.addEventListener("click", () => openQuiz(btn.dataset.skill));
    });
  }

  const quizModal = new bootstrap.Modal(document.getElementById("quizModal"));
  let activeQuizSkill = null;

  function openQuiz(skillName) {
    activeQuizSkill = skillName;
    const questions = NeoQuizData[skillName];
    document.getElementById("quiz-skill-name").textContent = skillName;
    document.getElementById("quiz-result").style.display = "none";
    document.getElementById("quiz-questions").style.display = "";
    document.getElementById("quiz-submit-btn").style.display = "";
    document.getElementById("quiz-questions").innerHTML = questions
      .map(
        (item, qi) => `
      <div class="mb-4">
        <p class="fw-semibold mb-2">${qi + 1}. ${NeoUI.escapeHtml(item.q)}</p>
        <div class="d-flex flex-column gap-2">
          ${item.options
            .map(
              (opt, oi) => `
            <label class="d-flex align-items-center gap-2 small" style="cursor:pointer;">
              <input type="radio" name="quiz-q${qi}" value="${oi}" class="form-check-input mt-0">
              ${NeoUI.escapeHtml(opt)}
            </label>
          `,
            )
            .join("")}
        </div>
      </div>
    `,
      )
      .join("");
    quizModal.show();
  }

  document
    .getElementById("quiz-submit-btn")
    .addEventListener("click", async () => {
      const questions = NeoQuizData[activeQuizSkill];
      let correct = 0;
      let answeredAll = true;
      questions.forEach((item, qi) => {
        const checked = document.querySelector(
          `input[name="quiz-q${qi}"]:checked`,
        );
        if (!checked) {
          answeredAll = false;
          return;
        }
        if (Number(checked.value) === item.answer) correct++;
      });

      if (!answeredAll) {
        NeoUI.toast("Merci de répondre à toutes les questions.", "warning");
        return;
      }

      const passed = correct >= Math.ceil((questions.length * 2) / 3);
      document.getElementById("quiz-questions").style.display = "none";
      document.getElementById("quiz-submit-btn").style.display = "none";
      const resultEl = document.getElementById("quiz-result");
      resultEl.style.display = "";
      resultEl.innerHTML = passed
        ? `<div class="empty-state py-4"><i class="bi bi-patch-check-fill" style="color:var(--mint);"></i>Bravo ! ${correct}/${questions.length} bonnes réponses. Compétence vérifiée sur « ${NeoUI.escapeHtml(activeQuizSkill)} ».</div>`
        : `<div class="empty-state py-4"><i class="bi bi-x-circle"></i>${correct}/${questions.length} bonnes réponses. Il en faut au moins ${Math.ceil((questions.length * 2) / 3)} pour valider. <div class="mt-3"><button type="button" class="btn btn-neo-outline btn-sm" id="quiz-retry-btn">Réessayer</button></div></div>`;

      if (passed) {
        candidate = await Candidates.verifySkill(candidate.id, activeQuizSkill);
        NeoUI.confetti();
        setTimeout(() => {
          quizModal.hide();
          renderSkills();
        }, 1600);
      } else {
        document
          .getElementById("quiz-retry-btn")
          .addEventListener("click", () => openQuiz(activeQuizSkill));
      }
    });

  async function populateSkillsDatalist() {
    const comps = await Competences.getAll();
    document.getElementById("skills-datalist").innerHTML = comps
      .map((c) => `<option value="${NeoUI.escapeHtml(c.nom)}">`)
      .join("");
  }

  document
    .getElementById("skill-input")
    .addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const raw = e.target.value.trim();
        if (raw) {
          const canonical = await Competences.findOrCreateByName(raw);
          if (!skills.includes(canonical)) {
            skills.push(canonical);
            renderSkills();
            populateSkillsDatalist();
          }
        }
        e.target.value = "";
      }
    });

  document
    .getElementById("profile-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      candidate = await Candidates.update(candidate.id, {
        prenom: document.getElementById("p-prenom").value.trim(),
        nom: document.getElementById("p-nom").value.trim(),
        ville: document.getElementById("p-ville").value.trim(),
        telephone: document.getElementById("p-telephone").value.trim(),
        bio: document.getElementById("p-bio").value.trim(),
        videoUrl: document.getElementById("p-video").value.trim(),
        skills,
        cvName: pendingCv.name,
        cvPath: pendingCv.path,
        photo: pendingPhoto,
      });

      NeoUI.toast("Profil mis à jour avec succès.", "success");
      fillForm();
      NeoComponents.renderHeader({ rootPrefix: "../" });
    });

  populateSkillsDatalist();
  fillForm();
})();
