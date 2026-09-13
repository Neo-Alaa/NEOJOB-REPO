-- ==========================================================================
-- NeoJob — MySQL/MariaDB schema
-- Mirrors the entities already used throughout the front-end (assets/js/db.js):
-- Jobs -> offres, Companies -> entreprises, Candidates -> candidats, etc.
-- Run: mysql -u root < schema.sql
-- ==========================================================================

CREATE DATABASE IF NOT EXISTS neojob CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE neojob;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS messages, alertes, avis, paiements, favoris, creneaux_entretien,
  entretiens, candidatures, offre_competences, offres, candidat_competences,
  competences, categories, entreprise_photos, entreprises, candidats, utilisateurs;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------- Core accounts ----------

CREATE TABLE utilisateurs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('candidat','recruteur','admin') NOT NULL,
  statut ENUM('active','blocked') NOT NULL DEFAULT 'active',
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  derniere_notif_vue DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE candidats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL UNIQUE,
  prenom VARCHAR(100) NOT NULL DEFAULT '',
  nom VARCHAR(100) NOT NULL DEFAULT '',
  ville VARCHAR(100) NOT NULL DEFAULT '',
  telephone VARCHAR(30) NOT NULL DEFAULT '',
  bio TEXT,
  cv_nom VARCHAR(255),
  cv_path VARCHAR(255),
  photo_path VARCHAR(255),
  video_url VARCHAR(255),
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE entreprises (
  id INT AUTO_INCREMENT PRIMARY KEY,
  utilisateur_id INT NOT NULL UNIQUE,
  nom VARCHAR(150) NOT NULL DEFAULT '',
  secteur VARCHAR(100) NOT NULL DEFAULT '',
  ville VARCHAR(100) NOT NULL DEFAULT '',
  site_web VARCHAR(255) NOT NULL DEFAULT '',
  description TEXT,
  logo_path VARCHAR(255),
  plan ENUM('free','premium') NOT NULL DEFAULT 'free',
  verifiee TINYINT(1) NOT NULL DEFAULT 0,
  video_url VARCHAR(255),
  FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE entreprise_photos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entreprise_id INT NOT NULL,
  photo_path VARCHAR(255) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Master lists ----------

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE competences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE candidat_competences (
  candidat_id INT NOT NULL,
  competence_id INT NOT NULL,
  verifiee TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (candidat_id, competence_id),
  FOREIGN KEY (candidat_id) REFERENCES candidats(id) ON DELETE CASCADE,
  FOREIGN KEY (competence_id) REFERENCES competences(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Jobs ----------

CREATE TABLE offres (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entreprise_id INT NOT NULL,
  titre VARCHAR(150) NOT NULL,
  categorie_id INT NULL,
  type_contrat ENUM('CDI','CDD','Stage','Freelance') NOT NULL,
  ville VARCHAR(100) NOT NULL,
  remote TINYINT(1) NOT NULL DEFAULT 0,
  salaire_min INT NOT NULL DEFAULT 0,
  salaire_max INT NOT NULL DEFAULT 0,
  description TEXT,
  statut ENUM('en_attente','publiee','rejetee') NOT NULL DEFAULT 'en_attente',
  date_publication DATE NOT NULL,
  vues INT NOT NULL DEFAULT 0,
  FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE,
  FOREIGN KEY (categorie_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE offre_competences (
  offre_id INT NOT NULL,
  competence_id INT NOT NULL,
  PRIMARY KEY (offre_id, competence_id),
  FOREIGN KEY (offre_id) REFERENCES offres(id) ON DELETE CASCADE,
  FOREIGN KEY (competence_id) REFERENCES competences(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Applications / pipeline ----------

CREATE TABLE candidatures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  offre_id INT NOT NULL,
  candidat_id INT NOT NULL,
  lettre_motivation TEXT,
  cv_nom VARCHAR(255),
  cv_path VARCHAR(255),
  statut ENUM('en_attente','preselection','entretien','offre','embauchee','refusee') NOT NULL DEFAULT 'en_attente',
  date_candidature DATE NOT NULL,
  date_maj DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (offre_id) REFERENCES offres(id) ON DELETE CASCADE,
  FOREIGN KEY (candidat_id) REFERENCES candidats(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- entretiens <-> creneaux_entretien is a circular reference (an interview
-- picks one of its own slots), so the FK from entretiens to
-- creneaux_entretien is added afterwards via ALTER TABLE.
CREATE TABLE entretiens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidature_id INT NOT NULL UNIQUE,
  mode ENUM('video','presentiel','telephone') NOT NULL DEFAULT 'video',
  lieu_ou_lien VARCHAR(255),
  creneau_selectionne_id INT NULL,
  statut ENUM('proposee','confirmee','annulee') NOT NULL DEFAULT 'proposee',
  date_creation DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_maj DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidature_id) REFERENCES candidatures(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE creneaux_entretien (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entretien_id INT NOT NULL,
  date_heure DATETIME NOT NULL,
  FOREIGN KEY (entretien_id) REFERENCES entretiens(id) ON DELETE CASCADE
) ENGINE=InnoDB;

ALTER TABLE entretiens
  ADD CONSTRAINT fk_entretien_creneau FOREIGN KEY (creneau_selectionne_id)
  REFERENCES creneaux_entretien(id) ON DELETE SET NULL;

CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidature_id INT NOT NULL,
  expediteur_role ENUM('candidat','recruteur') NOT NULL,
  contenu TEXT NOT NULL,
  date_envoi DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (candidature_id) REFERENCES candidatures(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- Favorites, payments, reviews, alerts ----------

CREATE TABLE favoris (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidat_id INT NOT NULL,
  offre_id INT NOT NULL,
  UNIQUE (candidat_id, offre_id),
  FOREIGN KEY (candidat_id) REFERENCES candidats(id) ON DELETE CASCADE,
  FOREIGN KEY (offre_id) REFERENCES offres(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE paiements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entreprise_id INT NOT NULL,
  montant DECIMAL(10,2) NOT NULL,
  date_paiement DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  statut VARCHAR(30) NOT NULL DEFAULT 'reussi',
  FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE avis (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entreprise_id INT NOT NULL,
  candidat_id INT NOT NULL,
  poste_libelle VARCHAR(150),
  note_globale TINYINT NOT NULL,
  note_ambiance TINYINT NOT NULL,
  note_remuneration TINYINT NOT NULL,
  note_equilibre TINYINT NOT NULL,
  titre VARCHAR(200) NOT NULL,
  avantages TEXT NOT NULL,
  inconvenients TEXT NOT NULL,
  recommande TINYINT(1) NOT NULL DEFAULT 1,
  statut ENUM('en_attente','publiee','rejetee') NOT NULL DEFAULT 'en_attente',
  date_creation DATE NOT NULL,
  FOREIGN KEY (entreprise_id) REFERENCES entreprises(id) ON DELETE CASCADE,
  FOREIGN KEY (candidat_id) REFERENCES candidats(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE alertes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  candidat_id INT NOT NULL,
  label VARCHAR(150) NOT NULL,
  mot_cle VARCHAR(150),
  ville VARCHAR(100),
  categorie_id INT NULL,
  competence_id INT NULL,
  type_contrat VARCHAR(30),
  remote TINYINT(1) NOT NULL DEFAULT 0,
  date_creation DATE NOT NULL,
  FOREIGN KEY (candidat_id) REFERENCES candidats(id) ON DELETE CASCADE,
  FOREIGN KEY (categorie_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (competence_id) REFERENCES competences(id) ON DELETE SET NULL
) ENGINE=InnoDB;
