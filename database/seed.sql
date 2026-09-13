-- ==========================================================================
-- NeoJob — demo data, mirrors assets/js/db.js's seed() exactly.
-- Run after schema.sql: mysql -u root neojob < seed.sql
-- Passwords: admin@neojob.com / admin123, everyone else / demo1234
-- ==========================================================================

USE neojob;
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE messages; TRUNCATE TABLE alertes; TRUNCATE TABLE avis;
TRUNCATE TABLE paiements; TRUNCATE TABLE favoris; TRUNCATE TABLE creneaux_entretien;
TRUNCATE TABLE entretiens; TRUNCATE TABLE candidatures; TRUNCATE TABLE offre_competences;
TRUNCATE TABLE offres; TRUNCATE TABLE candidat_competences; TRUNCATE TABLE competences;
TRUNCATE TABLE categories; TRUNCATE TABLE entreprise_photos; TRUNCATE TABLE entreprises;
TRUNCATE TABLE candidats; TRUNCATE TABLE utilisateurs;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------- Users ----------
-- admin123 / demo1234, bcrypt-hashed via PHP's password_hash()
INSERT INTO utilisateurs (id, email, password_hash, role, statut, date_creation, derniere_notif_vue) VALUES
(1, 'admin@neojob.com', '$2y$10$Pv70rtMb4Qt0G9RtbRcvaO/0QIT/aUpVqFRgiwn3XDpVqFoX9boYm', 'admin', 'active', '2026-01-05', '2026-01-05'),
(2, 'sara.recruteur@neojob.com', '$2y$10$.8TsBIuwSw/UmGqpneU8neLoL88CiVOELBGF8WY0lwmwYSJ/LwEcm', 'recruteur', 'active', '2026-01-10', '2026-01-10'),
(3, 'omar.recruteur@neojob.com', '$2y$10$.8TsBIuwSw/UmGqpneU8neLoL88CiVOELBGF8WY0lwmwYSJ/LwEcm', 'recruteur', 'active', '2026-01-12', '2026-01-12'),
(4, 'yassine.candidat@neojob.com', '$2y$10$.8TsBIuwSw/UmGqpneU8neLoL88CiVOELBGF8WY0lwmwYSJ/LwEcm', 'candidat', 'active', '2026-02-01', '2026-02-01'),
(5, 'imane.candidat@neojob.com', '$2y$10$.8TsBIuwSw/UmGqpneU8neLoL88CiVOELBGF8WY0lwmwYSJ/LwEcm', 'candidat', 'active', '2026-02-03', '2026-02-03');

INSERT INTO candidats (id, utilisateur_id, prenom, nom, ville, telephone, bio, cv_nom, photo_path, video_url) VALUES
(1, 4, 'Yassine', 'El Amrani', 'Casablanca', '0600000000', 'Développeur full-stack passionné par les architectures scalables.', NULL, NULL, NULL),
(2, 5, 'Imane', 'Bensaid', 'Rabat', '0600000001', 'UX designer orientée recherche utilisateur et design systems.', NULL, NULL, NULL);

INSERT INTO entreprises (id, utilisateur_id, nom, secteur, ville, site_web, description, logo_path, plan, verifiee, video_url) VALUES
(1, 2, 'Vertex Digital', 'Technologie', 'Casablanca', 'vertexdigital.com', 'Agence tech spécialisée en produits web & mobile à forte échelle.', NULL, 'free', 1, NULL),
(2, 3, 'Atlas Finance Group', 'Finance', 'Rabat', 'atlasfinance.ma', 'Groupe financier régional, services bancaires et conseil.', NULL, 'free', 0, NULL);

-- ---------- Master lists ----------

INSERT INTO categories (id, nom) VALUES
(1, 'Développement Web'), (2, 'Design & UX/UI'), (3, 'Marketing Digital'),
(4, 'Data & IA'), (5, 'Réseaux & Sécurité'), (6, 'Gestion de Projet');

INSERT INTO competences (id, nom) VALUES
(1, 'JavaScript'), (2, 'React'), (3, 'Node.js'), (4, 'SQL'), (5, 'CSS'), (6, 'MongoDB'),
(7, 'Docker'), (8, 'Figma'), (9, 'Design System'), (10, 'UX Research'), (11, 'Prototypage'),
(12, 'Excel'), (13, 'Finance'), (14, 'SEO'), (15, 'Réseaux sociaux'), (16, 'Analytics'),
(17, 'Python'), (18, 'Power BI'), (19, 'Réseaux'), (20, 'Sécurité'), (21, 'Firewall'),
(22, 'Gestion de projet'), (23, 'Agile'), (24, 'Scrum');

INSERT INTO candidat_competences (candidat_id, competence_id, verifiee) VALUES
(1, 1, 1), (1, 2, 0), (1, 3, 0), (1, 4, 0),
(2, 8, 0), (2, 10, 0), (2, 11, 0);

-- ---------- Jobs ----------

INSERT INTO offres (id, entreprise_id, titre, categorie_id, type_contrat, ville, remote, salaire_min, salaire_max, description, statut, date_publication, vues) VALUES
(1, 1, 'Développeur Front-End React', 1, 'CDI', 'Casablanca', 1, 8000, 13000, "Nous recherchons un développeur front-end pour renforcer notre équipe produit. Vous travaillerez sur des interfaces React à fort trafic.", 'publiee', '2026-08-20', 186),
(2, 1, 'Développeur Back-End Node.js', 1, 'CDI', 'Casablanca', 0, 9000, 15000, "Conception et maintenance d'APIs REST performantes pour notre plateforme SaaS.", 'publiee', '2026-08-22', 134),
(3, 1, 'UI/UX Designer', 2, 'CDI', 'Casablanca', 1, 7000, 11000, "Créer des expériences utilisateur cohérentes sur l'ensemble de nos produits.", 'publiee', '2026-08-25', 210),
(4, 2, 'Analyste Financier Junior', 4, 'CDI', 'Rabat', 0, 6000, 9000, "Analyse de données financières et production de rapports pour la direction.", 'publiee', '2026-08-18', 97),
(5, 2, 'Chargé(e) de Marketing Digital', 3, 'CDD', 'Rabat', 1, 5500, 8000, "Gestion des campagnes digitales et du contenu réseaux sociaux du groupe.", 'publiee', '2026-08-27', 152),
(6, 1, 'Data Analyst', 4, 'Stage', 'Casablanca', 1, 3000, 4500, "Stage de 6 mois autour de l'analyse de données produit et la Business Intelligence.", 'en_attente', '2026-09-01', 58),
(7, 2, 'Ingénieur Sécurité Réseaux', 5, 'CDI', 'Rabat', 0, 10000, 16000, "Sécurisation de l'infrastructure réseau et audit de vulnérabilités.", 'en_attente', '2026-09-02', 41),
(8, 1, 'Chef de Projet Digital', 6, 'CDI', 'Casablanca', 0, 11000, 17000, "Pilotage de projets digitaux multi-équipes de la cadration au déploiement.", 'publiee', '2026-08-15', 229);

INSERT INTO offre_competences (offre_id, competence_id) VALUES
(1,2),(1,1),(1,5), (2,3),(2,6),(2,7), (3,8),(3,9), (4,12),(4,4),(4,13),
(5,14),(5,15),(5,16), (6,17),(6,4),(6,18), (7,19),(7,20),(7,21), (8,22),(8,23),(8,24);

-- ---------- Applications / pipeline ----------

INSERT INTO candidatures (id, offre_id, candidat_id, lettre_motivation, statut, date_candidature, date_maj) VALUES
(1, 1, 1, "Je suis très motivé pour rejoindre votre équipe front-end.", 'en_attente', '2026-08-28', '2026-08-28'),
(2, 3, 2, "Mon expérience en design system correspond parfaitement au poste.", 'embauchee', '2026-08-26', '2026-09-03'),
(3, 2, 1, "Mon expérience Node.js correspond aux besoins du poste.", 'refusee', '2026-08-24', '2026-09-02'),
(4, 8, 2, "Mon parcours en gestion de projet correspond à ce poste de chef de projet.", 'preselection', '2026-08-30', '2026-09-01'),
(5, 1, 2, "Je suis très intéressée par ce poste de développeuse front-end.", 'entretien', '2026-08-29', '2026-09-02');

INSERT INTO entretiens (id, candidature_id, mode, lieu_ou_lien, creneau_selectionne_id, statut, date_creation, date_maj) VALUES
(1, 5, 'video', 'Lien Google Meet envoyé par email', NULL, 'proposee', '2026-09-02 09:00:00', '2026-09-02 09:00:00');

INSERT INTO creneaux_entretien (id, entretien_id, date_heure) VALUES
(1, 1, '2026-09-08 10:00:00'), (2, 1, '2026-09-08 14:30:00'), (3, 1, '2026-09-09 09:30:00');

INSERT INTO messages (candidature_id, expediteur_role, contenu, date_envoi) VALUES
(5, 'recruteur', "Bonjour Imane, merci pour votre candidature ! Nous serions ravis d'échanger avec vous en entretien.", '2026-09-02 09:05:00'),
(5, 'candidat', "Bonjour, merci beaucoup, je suis disponible aux créneaux proposés !", '2026-09-02 11:30:00');

-- ---------- Favorites, payments, reviews, alerts ----------

INSERT INTO favoris (candidat_id, offre_id) VALUES (1, 4);

INSERT INTO avis (entreprise_id, candidat_id, poste_libelle, note_globale, note_ambiance, note_remuneration, note_equilibre, titre, avantages, inconvenients, recommande, statut, date_creation) VALUES
(1, 2, 'Ancienne Stagiaire UX', 5, 5, 4, 5, "Une équipe passionnée et bienveillante", "Ambiance de travail excellente, encadrement de qualité, vrais projets dès le premier jour.", "Les locaux pourraient être plus grands.", 1, 'publiee', '2026-07-10'),
(1, 1, 'Développeur Front-End (poste actuel)', 4, 4, 4, 3, "Bonne entreprise pour progresser techniquement", "Stack moderne, veille technologique encouragée, bons salaires pour Casablanca.", "Rythme parfois soutenu en période de livraison.", 1, 'publiee', '2026-08-02'),
(2, 1, 'Ancien Consultant', 3, 3, 4, 2, "Salaires corrects mais culture assez rigide", "Rémunération compétitive, sécurité de l'emploi.", "Processus hiérarchiques lourds, peu de flexibilité horaire.", 0, 'publiee', '2026-06-15'),
(2, 2, 'Candidate en entretien', 4, 4, 3, 4, "Process de recrutement professionnel", "Entretiens bien organisés, équipe accueillante.", "Délai de réponse un peu long.", 1, 'en_attente', '2026-09-01');

INSERT INTO alertes (candidat_id, label, mot_cle, ville, categorie_id, competence_id, type_contrat, remote, date_creation) VALUES
(1, 'Développeur Front-End à Casablanca', 'React', 'Casablanca', 1, NULL, NULL, 0, '2026-08-20');
