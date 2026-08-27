/* =============================================================
   data.work.js — Petits boulots, emplois déclarés, entreprises.
   ============================================================= */
(function (NS) {
  'use strict';
  var D = NS.D;

  /* ---------------------------------------------------------
     PETITS BOULOTS (informels, payés le jour même)
     --------------------------------------------------------- */
  D.GIGS = [
    {
      id: 'squeegee', n: 'Laveur de pare-brise', ico: '🪣', hours: 3, energy: 22, when: 'day',
      d: 'Aux feux rouges. Un client sur dix accepte, mais il paie.',
      req: { item: 'seau' },
      pay: function (G) { return G.rnd(14, 26) + G.lvl('charisme') * 4; },
      xp: { charisme: 8, force: 3 }, rep: { rue: 1 }, hyg: -8
    },
    {
      id: 'flyers', n: 'Distribution de tracts', ico: '📄', hours: 3, energy: 16, when: 'day',
      d: 'Déclaré nulle part, payé en liquide le soir même.',
      req: { hyg: 35, app: 30 },
      pay: function (G) { return G.rnd(24, 34) + G.lvl('charisme') * 2; },
      xp: { charisme: 5 }, rep: { legale: 1 }, hyg: -5
    },
    {
      id: 'labor', n: 'Manutention / déménagement', ico: '📦', hours: 4, energy: 34, when: 'day',
      d: 'Dur, payé correctement, sans questions posées.',
      req: { force: 2, hyg: 30, sante: 35 },
      pay: function (G) { return G.rnd(45, 65) + G.lvl('force') * 7; },
      xp: { force: 14 }, rep: { rue: 1 }, hyg: -14
    },
    {
      id: 'market', n: 'Aide au marché', ico: '🥬', hours: 3, energy: 24, when: 'day',
      d: 'Monter et démonter les étals à l’aube. Invendus offerts.',
      req: { force: 1, period: ['matin'] },
      pay: function (G) { return G.rnd(28, 42) + G.lvl('force') * 4; },
      xp: { force: 8, charisme: 2 }, rep: { rue: 1 }, faim: 20, hyg: -7
    },
    {
      id: 'dish', n: 'Plonge en cuisine', ico: '🍽️', hours: 4, energy: 26, when: 'any',
      d: 'Au noir, dans l’arrière-cuisine. Repas du personnel inclus.',
      req: { hyg: 45 },
      pay: function (G) { return G.rnd(42, 58); },
      xp: { force: 6 }, rep: { legale: 1 }, hyg: -8, faim: 25
    },
    {
      id: 'courier', n: 'Livraison à vélo', ico: '🚴', hours: 4, energy: 30, when: 'any',
      d: 'Application, casque, chrono. Autonome et régulier.',
      req: { item: 'velo', item2: 'smartphone', hyg: 30 },
      pay: function (G) { return G.rnd(52, 74) + G.lvl('force') * 5 + G.lvl('charisme') * 2; },
      xp: { force: 9, charisme: 3 }, rep: { legale: 2 }, hyg: -10
    },
    {
      id: 'handy', n: 'Petits dépannages', ico: '🧰', hours: 4, energy: 28, when: 'day',
      d: 'Fuites, serrures, étagères. Le bouche-à-oreille fait le reste.',
      req: { item: 'outils', hyg: 40, force: 2 },
      pay: function (G) { return G.rnd(70, 105) + G.lvl('force') * 5 + G.lvl('intelligence') * 4; },
      xp: { force: 8, intelligence: 6 }, rep: { legale: 2, rue: 1 }, hyg: -9
    },
    {
      id: 'sitter', n: 'Garde d’enfants', ico: '🧸', hours: 4, energy: 18, when: 'any',
      d: 'Une famille du quartier, deux enfants, un dîner à réchauffer.',
      req: { app: 50, hyg: 55, repLeg: 15, charisme: 3 },
      pay: function (G) { return G.rnd(48, 66) + G.lvl('charisme') * 5; },
      xp: { charisme: 9 }, rep: { legale: 3 }, faim: 15, moral: 4
    },
    {
      id: 'photo', n: 'Photographe d’événement', ico: '📷', hours: 5, energy: 24, when: 'any',
      d: 'Mariages, inaugurations, anniversaires. Facturé à la journée.',
      req: { item: 'appareil', app: 55, charisme: 4 },
      pay: function (G) { return G.rnd(150, 240) + G.lvl('charisme') * 14; },
      xp: { charisme: 12, intelligence: 5 }, rep: { legale: 3 }, hyg: -6
    },
    {
      id: 'freelance', n: 'Mission freelance', ico: '💻', hours: 5, energy: 22, when: 'any',
      d: 'Rédaction, saisie, montage, traduction. Plateforme, facture, virement.',
      req: { item: 'ordi', edu: 2, intelligence: 4 },
      pay: function (G) { return G.rnd(120, 190) + G.lvl('intelligence') * 22; },
      xp: { intelligence: 16 }, rep: { legale: 3 }, moral: -3
    },
    {
      id: 'security', n: 'Videur en soirée', ico: '🛡️', hours: 5, energy: 34, when: 'night',
      d: 'À l’entrée d’un club, de 23h à 4h. Il faut de la carrure et du sang-froid.',
      req: { force: 5, app: 45, sante: 50 },
      pay: function (G) { return G.rnd(95, 140) + G.lvl('force') * 12; },
      xp: { force: 14, charisme: 5 }, rep: { rue: 2, legale: 1 }, hyg: -8
    },
    {
      id: 'baker', n: 'Aide-boulanger', ico: '🥖', hours: 5, energy: 32, when: 'night',
      d: 'Fournée de 2h à 6h. Chaud, silencieux, et on repart avec du pain.',
      req: { hyg: 50, force: 2 },
      pay: function (G) { return G.rnd(60, 85) + G.lvl('force') * 4; },
      xp: { force: 8, intelligence: 3 }, rep: { legale: 2 }, faim: 30, hyg: -6
    },
    {
      id: 'taxi', n: 'Chauffeur VTC de nuit', ico: '🚕', hours: 5, energy: 26, when: 'night',
      d: 'Les courses de nuit paient double. Il faut une voiture et un téléphone.',
      req: { item: 'voiture', item2: 'smartphone', app: 50, hyg: 45 },
      pay: function (G) { return G.rnd(140, 210) + G.lvl('charisme') * 8; },
      xp: { charisme: 8, intelligence: 4 }, rep: { legale: 3 }, moral: -4
    },
    {
      id: 'consult', n: 'Mission de conseil', ico: '📊', hours: 6, energy: 26, when: 'day',
      d: 'Deux jours d’audit facturés à un tarif que vous n’osiez pas demander avant.',
      req: { edu: 3, intelligence: 7, app: 70, item: 'pro' },
      pay: function (G) { return G.rnd(400, 620) + G.lvl('intelligence') * 60; },
      xp: { intelligence: 22, charisme: 10 }, rep: { legale: 5 }
    }
  ];
  D.GIG = {};
  D.GIGS.forEach(function (g) { D.GIG[g.id] = g; });

  /* ---------------------------------------------------------
     EMPLOIS DÉCLARÉS
     casierMax : casier judiciaire toléré par l'employeur
     --------------------------------------------------------- */
  D.JOBS = [
    {
      id: 'cleaner', n: 'Agent d’entretien', ico: '🧽', hours: 6, energy: 30, pay: 78, when: 'day',
      d: 'Le premier contrat qu’on accorde sans rien regarder d’autre que votre présence.',
      req: { app: 38, addr: true, hyg: 40 }, casierMax: 9,
      xp: { force: 7 }, repLeg: 2
    },
    {
      id: 'cashier', n: 'Caissier·ère', ico: '🛒', hours: 6, energy: 30, pay: 92, when: 'day',
      d: 'Premier bulletin de salaire. Premier vrai statut administratif.',
      req: { app: 48, addr: true, hyg: 45 }, casierMax: 4,
      xp: { charisme: 6, intelligence: 3 }, repLeg: 2.5
    },
    {
      id: 'warehouse', n: 'Cariste en entrepôt', ico: '🏗️', hours: 7, energy: 40, pay: 128, when: 'day',
      d: 'Physique, cadencé, correctement payé. Personne ne vous parle de la journée.',
      req: { app: 40, addr: true, force: 4, sante: 45 }, casierMax: 6,
      xp: { force: 16 }, repLeg: 3
    },
    {
      id: 'waiter', n: 'Serveur·euse', ico: '🍷', hours: 6, energy: 34, pay: 118, when: 'any',
      d: 'Pourboires proportionnels à votre charisme.',
      req: { app: 55, addr: true, charisme: 3, hyg: 55 }, casierMax: 3,
      xp: { charisme: 11, force: 4 }, repLeg: 3,
      bonus: function (G) { return G.rnd(4, 12) + G.lvl('charisme') * 4; }
    },
    {
      id: 'driver', n: 'Chauffeur-livreur', ico: '🚐', hours: 7, energy: 34, pay: 145, when: 'day',
      d: 'Cent quatre-vingts colis par jour, un scanner, un dos qui vieillit vite.',
      req: { app: 45, addr: true, force: 3, item: 'smartphone', bank: true }, casierMax: 3, payBank: true,
      xp: { force: 10, charisme: 4 }, repLeg: 3
    },
    {
      id: 'nurseaide', n: 'Aide-soignant·e', ico: '🩺', hours: 7, energy: 36, pay: 168, when: 'any',
      d: 'Le métier le plus utile et le moins bien payé du pays. On vous respecte.',
      req: { app: 55, addr: true, edu: 2, hyg: 65, charisme: 4, bank: true }, casierMax: 1, payBank: true,
      xp: { charisme: 10, force: 8 }, repLeg: 5, moral: 3
    },
    {
      id: 'clerk', n: 'Agent administratif', ico: '🗂️', hours: 7, energy: 26, pay: 175, when: 'day',
      d: 'Bureau, horaires fixes, et un diplôme exigé.',
      req: { app: 62, addr: true, edu: 2, intelligence: 3, hyg: 60, bank: true }, casierMax: 1, payBank: true,
      xp: { intelligence: 12, charisme: 4 }, repLeg: 4
    },
    {
      id: 'sales', n: 'Commercial·e', ico: '📈', hours: 7, energy: 32, pay: 250, when: 'day',
      d: 'Fixe modeste, variable indexé sur votre bagout. Aucun diplôme exigé.',
      req: { app: 70, addr: true, edu: 3, charisme: 5, item: 'propre', bank: true }, casierMax: 1, payBank: true,
      xp: { charisme: 16, intelligence: 6 }, repLeg: 5,
      bonus: function (G) { return G.lvl('charisme') * 22 + G.rnd(0, 60); }
    },
    {
      id: 'agent', n: 'Agent immobilier', ico: '🔑', hours: 7, energy: 30, pay: 300, when: 'day',
      d: 'Commission sur chaque vente. Le costume fait la moitié du travail. Aucun diplôme exigé.',
      req: { app: 72, addr: true, edu: 3, charisme: 6, repLeg: 30, item: 'pro', bank: true }, casierMax: 0, payBank: true,
      xp: { charisme: 18, intelligence: 8 }, repLeg: 5,
      bonus: function (G) { return G.chance(35) ? G.rnd(300, 900) : 0; }
    },
    {
      id: 'manager', n: 'Chef de projet', ico: '📊', hours: 8, energy: 34, pay: 410, when: 'day',
      d: 'On vous confie une équipe et un budget, sur la seule foi de votre expérience.',
      req: { app: 74, addr: true, edu: 3, intelligence: 7, repLeg: 45, bank: true }, casierMax: 0, payBank: true,
      xp: { intelligence: 18, charisme: 10 }, repLeg: 6
    },
    {
      id: 'exec', n: 'Directeur·rice général·e', ico: '🏛️', hours: 8, energy: 30, pay: 980, when: 'day',
      d: 'Le sommet qu’on peut atteindre sans diplôme spécialisé — à force d’expérience pure.',
      req: { app: 82, addr: true, edu: 3, intelligence: 9, charisme: 8, repLeg: 70, item: 'costume', bank: true }, casierMax: 0, payBank: true,
      xp: { intelligence: 20, charisme: 16 }, repLeg: 8,
      bonus: function (G) { return G.lvl('intelligence') * 40; }
    },

    /* --- Postes de la filière Informatique --- */
    {
      id: 'dev', n: 'Développeur·euse logiciel', ico: '⌨️', hours: 7, energy: 24, pay: 300, when: 'any',
      d: 'Licence en informatique exigée. On ne vous demande plus d’où vous venez.',
      req: { app: 50, addr: true, filiere: 'info', filiereLvl: 1, item: 'ordi', bank: true }, casierMax: 3, payBank: true,
      xp: { intelligence: 20 }, repLeg: 4
    },
    {
      id: 'archsoft', n: 'Architecte logiciel', ico: '🏗️', hours: 7, energy: 26, pay: 560, when: 'any',
      d: 'Vous concevez les systèmes que d’autres développeurs construiront.',
      req: { app: 60, addr: true, filiere: 'info', filiereLvl: 2, item: 'ordi', bank: true }, casierMax: 2, payBank: true,
      xp: { intelligence: 22 }, repLeg: 5
    },
    {
      id: 'cto', n: 'Directeur·rice technique', ico: '🖥️', hours: 8, energy: 28, pay: 1350, when: 'day',
      d: 'Doctorat en informatique. Vous décidez de l’architecture d’une entreprise entière.',
      req: { app: 78, addr: true, filiere: 'info', filiereLvl: 3, repLeg: 55, item: 'costume', bank: true }, casierMax: 0, payBank: true,
      xp: { intelligence: 26, charisme: 10 }, repLeg: 8,
      bonus: function (G) { return G.lvl('intelligence') * 35; }
    },

    /* --- Postes de la filière Commerce & Gestion --- */
    {
      id: 'accountmgr', n: 'Chargé·e d’affaires', ico: '🤝', hours: 7, energy: 28, pay: 310, when: 'day',
      d: 'Licence en commerce exigée. Portefeuille de clients, objectifs mensuels.',
      req: { app: 58, addr: true, filiere: 'commerce', filiereLvl: 1, charisme: 4, bank: true }, casierMax: 3, payBank: true,
      xp: { charisme: 14 }, repLeg: 4
    },
    {
      id: 'trader', n: 'Opérateur de marché', ico: '💹', hours: 8, energy: 38, pay: 560, when: 'day',
      d: 'Master en commerce exigé. Salle de marché, écrans, cris.',
      req: { app: 76, addr: true, filiere: 'commerce', filiereLvl: 2, repLeg: 40, item: 'costume', bank: true }, casierMax: 0, payBank: true,
      xp: { intelligence: 24 }, repLeg: 6,
      bonus: function (G) { return G.chance(45) ? G.rnd(200, 1400) : -G.rnd(0, 300); }
    },
    {
      id: 'salesdir', n: 'Directeur·rice commercial·e', ico: '📢', hours: 8, energy: 30, pay: 580, when: 'day',
      d: 'Master en commerce exigé. Vous pilotez toute la force de vente.',
      req: { app: 70, addr: true, filiere: 'commerce', filiereLvl: 2, charisme: 6, item: 'costume', bank: true }, casierMax: 1, payBank: true,
      xp: { charisme: 20 }, repLeg: 6,
      bonus: function (G) { return G.lvl('charisme') * 25 + G.rnd(0, 80); }
    },
    {
      id: 'execvp', n: 'Directeur·rice général·e adjoint·e', ico: '🏢', hours: 8, energy: 28, pay: 1450, when: 'day',
      d: 'Executive MBA exigé. Le second poste le mieux payé de l’entreprise.',
      req: { app: 82, addr: true, filiere: 'commerce', filiereLvl: 3, repLeg: 65, item: 'costume', bank: true }, casierMax: 0, payBank: true,
      xp: { charisme: 24, intelligence: 16 }, repLeg: 9,
      bonus: function (G) { return G.lvl('charisme') * 40; }
    },

    /* --- Postes de la filière Droit --- */
    {
      id: 'corplaw', n: 'Juriste d’entreprise', ico: '📚', hours: 7, energy: 24, pay: 340, when: 'day',
      d: 'Licence en droit exigée. Contrats, conformité, litiges mineurs.',
      req: { app: 62, addr: true, filiere: 'droit', filiereLvl: 1, bank: true }, casierMax: 1, payBank: true,
      xp: { intelligence: 18 }, repLeg: 5
    },
    {
      id: 'lawyer', n: 'Avocat·e d’affaires', ico: '⚖️', hours: 8, energy: 32, pay: 660, when: 'day',
      d: 'Master en droit exigé. Vous connaissez la loi par les deux bouts.',
      req: { app: 78, addr: true, filiere: 'droit', filiereLvl: 2, repLeg: 55, item: 'costume', bank: true }, casierMax: 0, payBank: true,
      xp: { intelligence: 24, charisme: 14 }, repLeg: 8
    },
    {
      id: 'partner', n: 'Associé·e de cabinet', ico: '🏛️', hours: 8, energy: 26, pay: 1600, when: 'day',
      d: 'Doctorat en droit exigé. Votre nom est désormais sur la porte.',
      req: { app: 84, addr: true, filiere: 'droit', filiereLvl: 3, repLeg: 65, item: 'costume', bank: true }, casierMax: 0, payBank: true,
      xp: { intelligence: 28, charisme: 16 }, repLeg: 10
    },

    /* --- Postes de la filière Santé --- */
    {
      id: 'nursediploma', n: 'Infirmier·ère diplômé·e', ico: '💉', hours: 7, energy: 32, pay: 290, when: 'any',
      d: 'Licence en soins infirmiers exigée. Bien plus qu’une aide-soignante : un vrai diplôme d’État.',
      req: { app: 52, addr: true, filiere: 'sante', filiereLvl: 1, hyg: 60, bank: true }, casierMax: 2, payBank: true,
      xp: { charisme: 10, force: 6 }, repLeg: 5
    },
    {
      id: 'headcare', n: 'Cadre de santé', ico: '🩺', hours: 8, energy: 30, pay: 540, when: 'day',
      d: 'Master en santé publique exigé. Vous encadrez un service entier.',
      req: { app: 64, addr: true, filiere: 'sante', filiereLvl: 2, bank: true }, casierMax: 1, payBank: true,
      xp: { intelligence: 16, charisme: 12 }, repLeg: 6
    },
    {
      id: 'doctor', n: 'Médecin spécialiste', ico: '⚕️', hours: 8, energy: 32, pay: 1800, when: 'any',
      d: 'Doctorat en médecine exigé. Le poste le mieux payé du jeu — et le plus long à obtenir.',
      req: { app: 80, addr: true, filiere: 'sante', filiereLvl: 3, repLeg: 55, bank: true }, casierMax: 0, payBank: true,
      xp: { intelligence: 30 }, repLeg: 12,
      bonus: function (G) { return G.chance(30) ? G.rnd(200, 600) : 0; }
    },

    /* --- Postes de la filière Ingénierie --- */
    {
      id: 'juniorEng', n: 'Ingénieur·e junior', ico: '⚙️', hours: 7, energy: 28, pay: 330, when: 'day',
      d: 'Licence en ingénierie exigée. Bureau d’études, premiers plans signés.',
      req: { app: 56, addr: true, filiere: 'ingenierie', filiereLvl: 1, force: 2, bank: true }, casierMax: 3, payBank: true,
      xp: { intelligence: 16, force: 6 }, repLeg: 4
    },
    {
      id: 'seniorEng', n: 'Ingénieur·e senior', ico: '🔩', hours: 8, energy: 28, pay: 610, when: 'day',
      d: 'Master en ingénierie exigé. Vous validez les plans des autres.',
      req: { app: 66, addr: true, filiere: 'ingenierie', filiereLvl: 2, bank: true }, casierMax: 1, payBank: true,
      xp: { intelligence: 22 }, repLeg: 6
    },
    {
      id: 'rndDir', n: 'Directeur·rice R&D', ico: '🧪', hours: 8, energy: 28, pay: 1500, when: 'day',
      d: 'Doctorat en ingénierie exigé. Le laboratoire est à vous.',
      req: { app: 80, addr: true, filiere: 'ingenierie', filiereLvl: 3, repLeg: 50, item: 'costume', bank: true }, casierMax: 0, payBank: true,
      xp: { intelligence: 28 }, repLeg: 9
    }
  ];
  D.JOB = {};
  D.JOBS.forEach(function (j) { D.JOB[j.id] = j; });

  /* ---------------------------------------------------------
     ENTREPRISES
     legal:false = activité de couverture (rapporte de l'argent sale
     mais augmente la pression policière chaque nuit)
     --------------------------------------------------------- */
  D.BIZ = [
    {
      id: 'resale', n: 'Revente en ligne', ico: '📦', cost: 500, rev: 42, maxLvl: 10, legal: true,
      d: 'Acheter en brocante, revendre sur internet.',
      req: { intelligence: 2, item: 'smartphone' }
    },
    {
      id: 'cleaning', n: 'Société de nettoyage', ico: '🧴', cost: 1600, rev: 105, maxLvl: 10, legal: true,
      d: 'Trois salariés, deux camionnettes, des contrats renouvelables.',
      req: { intelligence: 2, repLeg: 15 }
    },
    {
      id: 'truck', n: 'Food truck', ico: '🚚', cost: 4000, rev: 230, maxLvl: 10, legal: true,
      d: 'Un camion, une carte courte, un emplacement.',
      req: { intelligence: 3, edu: 2 }
    },
    {
      id: 'laverie', n: 'Laverie automatique', ico: '🧺', cost: 7000, rev: 300, maxLvl: 10, legal: true, wash: 2500,
      d: 'Peu rentable, ouverte 24h/24, et sa caisse accepte tout ce qu’on y met.',
      req: { intelligence: 3, repLeg: 12 }
    },
    {
      id: 'bar', n: 'Bar de quartier', ico: '🍺', cost: 15000, rev: 640, maxLvl: 10, legal: true, wash: 5000,
      d: 'Le comptoir rapporte, l’arrière-salle rapporte davantage.',
      req: { charisme: 5, repLeg: 20 }
    },
    {
      id: 'garage', n: 'Garage automobile', ico: '🔧', cost: 22000, rev: 950, maxLvl: 10, legal: true, wash: 9000,
      d: 'Réparations, carrosserie, et des plaques qui changent parfois de véhicule.',
      req: { force: 5, intelligence: 4, edu: 2 }
    },
    {
      id: 'agency', n: 'Agence de communication', ico: '🏢', cost: 26000, rev: 1250, maxLvl: 10, legal: true,
      d: 'Vous vendez le talent des autres — et le vôtre.',
      req: { intelligence: 5, charisme: 5, edu: 3 }
    },
    {
      id: 'security', n: 'Société de sécurité', ico: '🛡️', cost: 48000, rev: 2100, maxLvl: 10, legal: true,
      d: 'Vingt agents, des badges, et une connaissance intime des angles morts.',
      req: { force: 6, repLeg: 30, edu: 2 }
    },
    {
      id: 'realestate', n: 'Société immobilière', ico: '🏗️', cost: 110000, rev: 4600, maxLvl: 10, legal: true, wash: 40000,
      d: 'Acheter des murs. Les louer. Recommencer.',
      req: { intelligence: 6, edu: 3, repLeg: 45 }
    },
    {
      id: 'fund', n: 'Fonds d’investissement', ico: '🏦', cost: 220000, rev: 9200, maxLvl: 10, legal: true,
      d: 'Vous gérez l’argent des autres, et vous prenez deux pour cent au passage.',
      req: { intelligence: 9, edu: 3, repLeg: 55 }
    },
    {
      id: 'startup', n: 'Startup technologique', ico: '🚀', cost: 300000, rev: 13500, maxLvl: 10, legal: true,
      d: 'Lever, recruter, croître. Le dernier étage se rapproche.',
      req: { intelligence: 9, edu: 3, repLeg: 60 }
    },
    {
      id: 'cartel', n: 'Réseau de distribution', ico: '🕶️', cost: 60000, rev: 5400, maxLvl: 8, legal: false, heat: 4,
      d: 'Quinze points de vente, quarante guetteurs. Rapporte énormément, en argent sale, et attire l’attention chaque nuit.',
      req: { repPegre: 55, force: 6 }
    }
  ];
  D.BIZI = {};
  D.BIZ.forEach(function (b) { D.BIZI[b.id] = b; });

})(window.LifeRPG);
