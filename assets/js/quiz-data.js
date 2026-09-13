/* ==========================================================================
   NeoJob — Skill verification quiz bank (quiz-data.js)
   Small multiple-choice question sets, keyed by exact skill name as stored
   in the Competences master list. A candidate passes a skill (2/3 correct)
   to earn the "Compétence vérifiée" badge on that skill pill.
   ========================================================================== */

const NeoQuizData = {
  'JavaScript': [
    { q: "Que retourne typeof null en JavaScript ?", options: ["'null'", "'object'", "'undefined'", "'boolean'"], answer: 1 },
    { q: "Quelle méthode ajoute un élément à la fin d'un tableau ?", options: ['push()', 'shift()', 'pop()', 'unshift()'], answer: 0 },
    { q: "Quel mot-clé déclare une variable dont la valeur ne peut pas être réassignée ?", options: ['var', 'let', 'const', 'static'], answer: 2 },
  ],
  'React': [
    { q: "Quel hook permet de mémoriser un état local dans un composant fonctionnel ?", options: ['useEffect', 'useState', 'useContext', 'useMemo'], answer: 1 },
    { q: "Comment appelle-t-on la syntaxe qui mélange JavaScript et balises HTML dans React ?", options: ['JSX', 'ESX', 'TSX only', 'HTMX'], answer: 0 },
    { q: "Quel hook exécute un effet de bord après le rendu d'un composant ?", options: ['useRef', 'useReducer', 'useEffect', 'useCallback'], answer: 2 },
  ],
  'Node.js': [
    { q: "Quel module intégré permet de créer un serveur HTTP en Node.js ?", options: ['fs', 'http', 'path', 'os'], answer: 1 },
    { q: "Quel outil est utilisé pour gérer les dépendances d'un projet Node.js ?", options: ['pip', 'npm', 'composer', 'cargo'], answer: 1 },
    { q: "Node.js exécute JavaScript côté... ?", options: ['Navigateur uniquement', 'Serveur', 'Base de données', 'Aucun des deux'], answer: 1 },
  ],
  'SQL': [
    { q: "Quelle instruction permet de récupérer des données d'une table ?", options: ['GET', 'SELECT', 'FETCH', 'PULL'], answer: 1 },
    { q: "Quelle clause filtre les lignes d'une requête SELECT ?", options: ['WHERE', 'FILTER', 'HAVING ONLY', 'LIMIT'], answer: 0 },
    { q: "Quelle instruction ajoute une nouvelle ligne dans une table ?", options: ['ADD', 'INSERT INTO', 'CREATE ROW', 'APPEND'], answer: 1 },
  ],
  'Figma': [
    { q: "Comment appelle-t-on un composant réutilisable dans Figma ?", options: ['Frame', 'Component', 'Layer', 'Board'], answer: 1 },
    { q: "Quelle fonctionnalité permet de gérer les styles de couleur/texte de façon centralisée ?", options: ['Auto Layout', 'Styles', 'Plugins', 'Prototype'], answer: 1 },
    { q: "Quel mode permet de tester la navigation entre les écrans dans Figma ?", options: ['Mode Prototype', 'Mode Dev', 'Mode Présentation', 'Mode Export'], answer: 0 },
  ],
  'Python': [
    { q: "Comment définit-on une fonction en Python ?", options: ['function nom():', 'def nom():', 'func nom():', 'fn nom():'], answer: 1 },
    { q: "Quelle structure de données Python est immuable ?", options: ['list', 'dict', 'tuple', 'set'], answer: 2 },
    { q: "Quel mot-clé est utilisé pour importer un module ?", options: ['include', 'require', 'import', 'using'], answer: 2 },
  ],
  'Excel': [
    { q: "Quelle fonction additionne une plage de cellules ?", options: ['TOTAL()', 'SUM()', 'ADD()', 'PLUS()'], answer: 1 },
    { q: "Quelle fonction recherche une valeur dans un tableau et retourne une valeur correspondante ?", options: ['SEARCH()', 'FIND()', 'RECHERCHEV / VLOOKUP()', 'MATCH ONLY()'], answer: 2 },
    { q: "Quel symbole fige une référence de cellule dans une formule ?", options: ['#', '$', '%', '&'], answer: 1 },
  ],
  'SEO': [
    { q: "Que signifie SEO ?", options: ['Search Engine Optimization', 'Site Export Online', 'Secure Encrypted Object', 'Server Efficiency Output'], answer: 0 },
    { q: "Quelle balise HTML influence le titre affiché dans les résultats de recherche ?", options: ['<meta description>', '<title>', '<header>', '<h6>'], answer: 1 },
    { q: "Qu'est-ce qu'un backlink ?", options: ['Un lien interne', 'Un lien entrant depuis un autre site', 'Un lien cassé', 'Une redirection'], answer: 1 },
  ],
  'Java': [
    { q: "Que signifie SEO ?", options: ['Search Engine Optimization', 'Site Export Online', 'Secure Encrypted Object', 'Server Efficiency Output'], answer: 0 },
    { q: "Quelle balise HTML influence le titre affiché dans les résultats de recherche ?", options: ['<meta description>', '<title>', '<header>', '<h6>'], answer: 1 },
    { q: "Qu'est-ce qu'un backlink ?", options: ['Un lien interne', 'Un lien entrant depuis un autre site', 'Un lien cassé', 'Une redirection'], answer: 1 },
  ],
  'Kotlin': [
    { q: "Que signifie SEO ?", options: ['Search Engine Optimization', 'Site Export Online', 'Secure Encrypted Object', 'Server Efficiency Output'], answer: 0 },
    { q: "Quelle balise HTML influence le titre affiché dans les résultats de recherche ?", options: ['<meta description>', '<title>', '<header>', '<h6>'], answer: 1 },
    { q: "Qu'est-ce qu'un backlink ?", options: ['Un lien interne', 'Un lien entrant depuis un autre site', 'Un lien cassé', 'Une redirection'], answer: 1 },
  ],
};
