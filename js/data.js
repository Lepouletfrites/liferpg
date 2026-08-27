/* =============================================================
   data.js — SOCLE : temps, jauges, stats, paliers, logements,
             objets, formation, origines.
   Le reste du contenu vit dans data.*.js (actions, crime,
   travail, personnes, finance).
   Aucune logique ici : uniquement des données et des run(G).
   ============================================================= */
window.LifeRPG = window.LifeRPG || {};

(function (NS) {
  'use strict';

  var D = {};

  /* ---------------------------------------------------------
     1. TEMPS
     La journée court de 06h à 22h. Après 22h commence la NUIT,
     jouable jusqu'à 04h (heure 28) — mais elle se paie.
     --------------------------------------------------------- */
  D.DAY_START = 6;
  D.DAY_END = 22;       // fin des activités diurnes
  D.NIGHT_END = 28;     // 04h du matin : coucher imposé

  D.PERIODS = [
    { id: 'matin', label: 'Matin', from: 6, ico: '🌅' },
    { id: 'midi', label: 'Midi', from: 12, ico: '☀️' },
    { id: 'soir', label: 'Soir', from: 17, ico: '🌆' },
    { id: 'nuit', label: 'Nuit', from: 22, ico: '🌙' }
  ];
  D.PERIOD_LABEL = {};
  D.PERIODS.forEach(function (p) { D.PERIOD_LABEL[p.id] = p.label; });

  /** Affichage horaire : 26 -> "02h" */
  D.hh = function (h) { return String(((h % 24) + 24) % 24).padStart(2, '0') + 'h'; };

  /* --------- CALENDRIER ---------
     Le jour 1 est un lundi. Mois de 30 jours, semaines de 7 jours :
     les deux ne s'alignent pas, exactement comme dans la vraie vie. */
  D.WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  D.WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  D.MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  D.MONTH_LEN = 30;

  /** @returns { dow, dowName, dowShort, week, month, monthName, dom, weekend } */
  D.cal = function (day) {
    var i = Math.max(0, day - 1);
    var dow = i % 7;
    var mi = Math.floor(i / D.MONTH_LEN);
    return {
      dow: dow,
      dowName: D.WEEKDAYS[dow],
      dowShort: D.WEEKDAYS_SHORT[dow],
      weekend: dow >= 5,
      week: Math.floor(i / 7) + 1,
      month: mi + 1,
      monthName: D.MONTHS[mi % 12],
      dom: (i % D.MONTH_LEN) + 1
    };
  };

  /** Étiquette compacte : « Lun 12 Janvier » */
  D.dateLabel = function (day) {
    var c = D.cal(day);
    return c.dowShort + ' ' + c.dom + ' ' + c.monthName;
  };

  /* Périodicités de facturation et de paie */
  D.PERIODS_PAY = {
    day: { n: 'par jour', short: '/j', days: 1 },
    week: { n: 'par semaine', short: '/sem', days: 7 },
    month: { n: 'par mois', short: '/mois', days: 30 }
  };

  /* ---------------------------------------------------------
     2. JAUGES
     --------------------------------------------------------- */
  D.GAUGES = [
    { id: 'faim', label: 'Faim', ico: '🍞', color: 'var(--g-faim)', d: 'À zéro, votre santé se dégrade chaque heure.' },
    { id: 'energie', label: 'Énergie', ico: '⚡', color: 'var(--g-energie)', d: 'Se récupère en dormant. En dessous de 20, tout rate plus souvent.' },
    { id: 'moral', label: 'Moral', ico: '🙂', color: 'var(--g-moral)', d: 'Module la réussite de toutes vos actions (±30 %).' },
    { id: 'hygiene', label: 'Hygiène', ico: '🚿', color: 'var(--g-hygiene)', d: 'Conditionne votre apparence, donc l’accès au travail déclaré.' },
    { id: 'sante', label: 'Santé', ico: '❤️', color: 'var(--g-sante)', d: 'À zéro, la partie s’arrête.' }
  ];

  /* Usure horaire de base (appliquée par heure consommée) */
  D.DECAY = { faim: 2.4, hygiene: 1.05, moral: 0.42 };
  /* Usure supplémentaire pendant la nuit blanche */
  D.NIGHT_DECAY = { energie: 4.2, moral: 0.9, sante: 0.45 };

  /* ---------------------------------------------------------
     3. STATISTIQUES
     --------------------------------------------------------- */
  D.STATS = [
    { id: 'charisme', label: 'Charisme', ico: '🎭', desc: 'Mendicité, vente, négociation, entretiens, manipulation.' },
    { id: 'intelligence', label: 'Intelligence', ico: '🧠', desc: 'Études, postes qualifiés, bourse, fraude, rendement des entreprises.' },
    { id: 'force', label: 'Force', ico: '💪', desc: 'Travaux physiques, bagarres, fuite, intimidation.' },
    { id: 'discretion', label: 'Discrétion', ico: '🥷', desc: 'Vol, cambriolage, filature, effacer ses traces.' }
  ];
  D.STAT_IDS = D.STATS.map(function (s) { return s.id; });
  D.MAX_LVL = 10;
  D.xpNeeded = function (lvl) { return Math.round(35 * Math.pow(lvl, 1.35)); };

  /* ---------------------------------------------------------
     4. RÉPUTATIONS
     --------------------------------------------------------- */
  D.REPS = [
    { id: 'rue', label: 'Rue', ico: '🏙️', d: 'Ce que la rue pense de vous. Ouvre squats, combines et contacts.' },
    { id: 'legale', label: 'Légale', ico: '⚖️', d: 'Votre dossier aux yeux du monde propre. Emplois, banque, logement.' },
    { id: 'pegre', label: 'Pègre', ico: '🕶️', d: 'Votre crédit dans le milieu. Débloque les gros coups et les receleurs.' }
  ];

  /* ---------------------------------------------------------
     5. PALIERS SOCIAUX
     --------------------------------------------------------- */
  D.TIERS = [
    { n: 'Sans-abri', min: -99999999, c: '#7a8699', av: '🧍' },
    { n: 'Survivant', min: 200, c: '#96826a', av: '🧑‍🦰' },
    { n: 'Débrouillard', min: 1200, c: '#c08a4e', av: '🧑‍🔧' },
    { n: 'Travailleur', min: 5000, c: '#c3ccd8', av: '🧑‍🍳' },
    { n: 'Classe moyenne', min: 18000, c: '#7fd3bb', av: '🧑‍💼' },
    { n: 'Aisé', min: 60000, c: '#6fb6f0', av: '🕴️' },
    { n: 'Entrepreneur', min: 180000, c: '#a97bf0', av: '🤵' },
    { n: 'Magnat', min: 500000, c: '#f5b942', av: '🎩' },
    { n: 'Légende', min: 1000000, c: '#ffe08a', av: '👑' }
  ];
  D.WIN_NET = 1000000;

  /* ---------------------------------------------------------
     6. LOGEMENTS
     safe  : protège l'argent liquide et les affaires
     cool  : pression policière retirée en plus chaque nuit
     --------------------------------------------------------- */
  D.HOMES = [
    {
      id: 'street', name: 'Trottoir', ico: '📦', rent: 0, rentPer: 'day', sleep: 30, shower: false, addr: false,
      moral: -4, risk: 0.30, deposit: 0, safe: 0, cool: 0,
      desc: 'Un carton, un porche, et le bruit de la ville.', req: {}
    },
    {
      id: 'tent', name: 'Tente sous le pont', ico: '⛺', rent: 0, rentPer: 'day', sleep: 40, shower: false, addr: false,
      moral: -3, risk: 0.22, deposit: 0, safe: 1, cool: 0,
      desc: 'Un camp toléré, entre le fleuve et la bretelle d’autoroute.', req: { item: 'tente' }
    },
    {
      id: 'squat', name: 'Squat', ico: '🏚️', rent: 0, rentPer: 'day', sleep: 46, shower: false, addr: false,
      moral: -2, risk: 0.18, deposit: 0, safe: 1, cool: 1,
      desc: 'Un toit, pas de facture. Et pas de garantie.', req: { repRue: 32 }
    },
    {
      id: 'shelter', name: 'Foyer d’accueil', ico: '🛏️', rent: 8, rentPer: 'day', sleep: 58, shower: true, addr: true,
      moral: 0, risk: 0.06, deposit: 0, safe: 2, cool: 1,
      desc: 'Douche, lit, adresse administrative. Places limitées : il faut un dossier ouvert, ou quelqu’un qui parle pour vous.', req: { hyg: 20, repLeg: 14 }
    },
    {
      id: 'caravane', name: 'Caravane', ico: '🚐', rent: 84, rentPer: 'week', sleep: 62, shower: false, addr: true,
      moral: 1, risk: 0.10, deposit: 250, safe: 2, cool: 3,
      desc: 'Sur un terrain en périphérie. À vous, et mobile.', req: { repRue: 30 }
    },
    {
      id: 'coloc', name: 'Colocation', ico: '🚻', rent: 140, rentPer: 'week', sleep: 68, shower: true, addr: true,
      moral: 3, risk: 0.03, deposit: 120, safe: 2, cool: 0,
      desc: 'Quatre inconnus, une salle de bain, beaucoup de bruit.', req: { app: 34, repLeg: 10 }
    },
    {
      id: 'room', name: 'Chambre meublée', ico: '🚪', rent: 196, rentPer: 'week', sleep: 72, shower: true, addr: true,
      moral: 2, risk: 0.02, deposit: 90, safe: 3, cool: 0,
      desc: 'Neuf mètres carrés à vous. Le luxe.', req: { app: 40 }
    },
    {
      id: 'studio', name: 'Studio', ico: '🏢', rent: 1560, rentPer: 'month', sleep: 85, shower: true, addr: true,
      moral: 4, risk: 0, deposit: 400, safe: 4, cool: 0,
      desc: 'Un vrai bail. Un vrai début.', req: { repLeg: 25 }
    },
    {
      id: 'planque', name: 'Planque', ico: '🕳️', rent: 280, rentPer: 'week', sleep: 60, shower: true, addr: false,
      moral: -1, risk: 0, deposit: 600, safe: 5, cool: 6,
      desc: 'Un local sans nom sur la boîte aux lettres. La police ne vous y cherchera pas.', req: { repPegre: 30 }
    },
    {
      id: 'appart', name: 'Appartement', ico: '🏙️', rent: 3600, rentPer: 'month', sleep: 93, shower: true, addr: true,
      moral: 7, risk: 0, deposit: 1200, safe: 5, cool: 1,
      desc: 'Deux chambres, balcon, quartier calme.', req: { repLeg: 40 }
    },
    {
      id: 'loft', name: 'Loft d’architecte', ico: '🌇', rent: 8400, rentPer: 'month', sleep: 97, shower: true, addr: true,
      moral: 11, risk: 0, deposit: 4000, safe: 6, cool: 2,
      desc: 'Béton ciré, baies vitrées, vue sur le fleuve.', req: { repLeg: 55 }
    },
    {
      id: 'penthouse', name: 'Penthouse', ico: '🌃', rent: 22500, rentPer: 'month', sleep: 100, shower: true, addr: true,
      moral: 16, risk: 0, deposit: 15000, safe: 8, cool: 3,
      desc: 'Le dernier étage. Vous regardez la rue d’où vous venez.', req: { repLeg: 70 }
    },
    {
      id: 'villa', name: 'Villa avec gardien', ico: '🏰', rent: 63000, rentPer: 'month', sleep: 100, shower: true, addr: true,
      moral: 20, risk: 0, deposit: 60000, safe: 10, cool: 5,
      desc: 'Grille électrique, caméras, personnel. Plus personne n’entre sans être annoncé.', req: { repLeg: 80 }
    }
  ];
  D.HOME = {};
  D.HOMES.forEach(function (h) { D.HOME[h.id] = h; });

  /* ---------------------------------------------------------
     7. OBJETS
     cat   : food | care | tool | tenue | transport | tech | luxe | crime
     shop  : 'city' (boutique légale) | 'street' (marché parallèle)
     style : points d'apparence (tenues)
     keep  : durable (un seul exemplaire)
     --------------------------------------------------------- */
  D.ITEMS = [
    /* --- Nourriture --- */
    { id: 'eau', n: 'Bouteille d’eau', ico: '💧', cat: 'food', shop: 'city', price: 1, d: 'Basique et vital.', use: { faim: 6, energie: 4, sante: 1 } },
    { id: 'sandwich', n: 'Sandwich', ico: '🥪', cat: 'food', shop: 'city', price: 3, d: 'Froid, mais ça cale.', use: { faim: 22 } },
    { id: 'cafe', n: 'Café', ico: '☕', cat: 'food', shop: 'city', price: 2, d: 'Un coup de fouet immédiat.', use: { energie: 14, faim: -2, moral: 2 } },
    { id: 'energydrink', n: 'Boisson énergisante', ico: '🥤', cat: 'food', shop: 'city', price: 4, d: 'Tenir la nuit. Le corps encaissera.', use: { energie: 30, sante: -4, moral: 1 } },
    { id: 'fruits', n: 'Fruits', ico: '🍎', cat: 'food', shop: 'city', price: 4, d: 'Le corps vous remerciera.', use: { faim: 16, sante: 5 } },
    { id: 'conserve', n: 'Conserves', ico: '🥫', cat: 'food', shop: 'city', price: 5, d: 'Se garde, ne pourrit pas, ne trahit pas.', use: { faim: 28 } },
    { id: 'kebab', n: 'Kebab', ico: '🌯', cat: 'food', shop: 'city', price: 8, d: 'Le repas des vainqueurs fauchés.', use: { faim: 42, moral: 4, sante: -1 } },
    { id: 'restau', n: 'Repas au restaurant', ico: '🍽️', cat: 'food', shop: 'city', price: 26, d: 'Assis, au chaud, servi.', use: { faim: 60, moral: 12, sante: 3 }, req: { app: 45 } },
    { id: 'gastro', n: 'Table étoilée', ico: '🍾', cat: 'food', shop: 'city', price: 240, d: 'On retient votre nom à l’entrée.', use: { faim: 70, moral: 26, sante: 4 }, req: { app: 72 } },

    /* --- Soins & hygiène --- */
    { id: 'savon', n: 'Savon & gant', ico: '🧼', cat: 'care', shop: 'city', price: 3, d: 'Change tout à la fontaine.', use: { hygiene: 26 } },
    { id: 'rasoir', n: 'Nécessaire de rasage', ico: '🪒', cat: 'care', shop: 'city', price: 7, keep: true, d: 'Un visage net vaut dix euros de vêtements.', style: 4 },
    { id: 'medoc', n: 'Médicaments', ico: '💊', cat: 'care', shop: 'city', price: 18, d: 'Soigne blessures et infections.', use: { sante: 32 } },
    { id: 'vitamines', n: 'Vitamines', ico: '🧴', cat: 'care', shop: 'city', price: 10, d: 'Coup de boost général.', use: { sante: 12, energie: 16 } },
    { id: 'antidep', n: 'Traitement prescrit', ico: '🩺', cat: 'care', shop: 'city', price: 45, d: 'Stabilise le moral pour plusieurs jours.', use: { moral: 30, sante: 4 }, req: { addr: true } },
    { id: 'alcool', n: 'Bouteille d’alcool', ico: '🍾', cat: 'care', shop: 'city', price: 6, d: 'Oublier vite. Le payer lentement.', use: { moral: 18, sante: -8, hygiene: -4, energie: -5 } },
    { id: 'livre', n: 'Livre d’occasion', ico: '📕', cat: 'care', shop: 'city', price: 14, d: 'Lecture : +30 XP Intelligence.', use: { xp: ['intelligence', 30], moral: 3 } },
    { id: 'manuel', n: 'Manuel technique', ico: '📘', cat: 'care', shop: 'city', price: 55, d: 'Dense, aride, décisif : +90 XP Intelligence.', use: { xp: ['intelligence', 90], moral: -2 } },

    /* --- Outils (durables) --- */
    { id: 'carton', n: 'Carton & couverture', ico: '📦', cat: 'tool', shop: 'city', price: 9, keep: true, d: 'Dormir dehors sans y laisser sa santé.' },
    { id: 'duvet', n: 'Duvet grand froid', ico: '🛌', cat: 'tool', shop: 'city', price: 45, keep: true, d: 'Sommeil dehors nettement amélioré.' },
    { id: 'tente', n: 'Tente 2 places', ico: '⛺', cat: 'tool', shop: 'city', price: 120, keep: true, d: 'Débloque le campement sous le pont.' },
    { id: 'seau', n: 'Seau & raclette', ico: '🪣', cat: 'tool', shop: 'city', price: 18, keep: true, d: 'Débloque le lavage de pare-brise.' },
    { id: 'guitare', n: 'Guitare abîmée', ico: '🎸', cat: 'tool', shop: 'city', price: 55, keep: true, d: 'Débloque la manche musicale.' },
    { id: 'sono', n: 'Enceinte & micro', ico: '🎤', cat: 'tool', shop: 'city', price: 190, keep: true, d: 'Transforme la manche en vrai concert de rue.' },
    { id: 'sac', n: 'Sac à dos solide', ico: '🎒', cat: 'tool', shop: 'city', price: 30, keep: true, d: 'Vos affaires ne disparaissent plus la nuit.' },
    { id: 'outils', n: 'Caisse à outils', ico: '🧰', cat: 'tool', shop: 'city', price: 95, keep: true, d: 'Débloque les dépannages rémunérés.' },
    { id: 'appareil', n: 'Appareil photo', ico: '📷', cat: 'tool', shop: 'city', price: 320, keep: true, d: 'Débloque la photographie d’événements.' },

    /* --- Tenues --- */
    { id: 'fripes', n: 'Fripes correctes', ico: '👕', cat: 'tenue', shop: 'city', price: 22, keep: true, style: 28, d: 'On ne vous fuit plus dans le métro.' },
    { id: 'propre', n: 'Tenue propre', ico: '👔', cat: 'tenue', shop: 'city', price: 85, keep: true, style: 48, d: 'Le minimum pour un entretien.' },
    { id: 'pro', n: 'Tenue professionnelle', ico: '🥼', cat: 'tenue', shop: 'city', price: 260, keep: true, style: 68, d: 'Crédible dans un bureau.' },
    { id: 'costume', n: 'Costume taillé', ico: '🤵', cat: 'tenue', shop: 'city', price: 1100, keep: true, style: 86, d: 'On vous écoute avant même de parler.' },
    { id: 'hautecouture', n: 'Haute couture', ico: '🕶️', cat: 'tenue', shop: 'city', price: 6500, keep: true, style: 100, d: 'Vous êtes la référence.' },

    /* --- Transport --- */
    { id: 'velo', n: 'Vélo', ico: '🚲', cat: 'transport', shop: 'city', price: 110, keep: true, speed: 1, d: 'Débloque la livraison à vélo.' },
    { id: 'scooter', n: 'Scooter', ico: '🛵', cat: 'transport', shop: 'city', price: 1400, keep: true, speed: 2, d: 'Certains quarts coûtent 1 h de moins. Utile pour filer.' },
    { id: 'voiture', n: 'Voiture', ico: '🚗', cat: 'transport', shop: 'city', price: 9000, keep: true, speed: 3, d: 'Confort, image, mobilité. Et un coffre.' },
    { id: 'berline', n: 'Berline de luxe', ico: '🏎️', cat: 'transport', shop: 'city', price: 48000, keep: true, speed: 4, d: 'Un actif, et un message.' },

    /* --- Tech --- */
    { id: 'smartphone', n: 'Smartphone', ico: '📱', cat: 'tech', shop: 'city', price: 160, keep: true, tech: 1, d: 'Indispensable : applications, banque, bourse.' },
    { id: 'ordi', n: 'Ordinateur portable', ico: '💻', cat: 'tech', shop: 'city', price: 700, keep: true, tech: 2, d: 'Formations en ligne, e-commerce, trading.' },
    { id: 'serveur', n: 'Station de travail', ico: '🖥️', cat: 'tech', shop: 'city', price: 3200, keep: true, tech: 3, d: 'Puissance de calcul. Légale ou non.' },

    /* --- Luxe / patrimoine --- */
    { id: 'montre', n: 'Montre de luxe', ico: '⌚', cat: 'luxe', shop: 'city', price: 4500, keep: true, style: 6, d: 'Un actif qui se porte au poignet.' },
    { id: 'bijou', n: 'Parure de joaillerie', ico: '💍', cat: 'luxe', shop: 'city', price: 12000, keep: true, style: 5, d: 'Se revend presque au prix. Se vole aussi.' },
    { id: 'art', n: 'Œuvre d’art', ico: '🖼️', cat: 'luxe', shop: 'city', price: 25000, keep: true, d: 'Le patrimoine des gens arrivés.' },
    { id: 'bateau', n: 'Bateau à quai', ico: '🛥️', cat: 'luxe', shop: 'city', price: 90000, keep: true, d: 'Coûte cher, ne rapporte rien, dit tout.' },

    /* --- Marché parallèle --- */
    { id: 'crochets', n: 'Jeu de crochets', ico: '🗝️', cat: 'crime', shop: 'street', price: 70, keep: true, d: 'Débloque le cambriolage.', req: { repRue: 15 } },
    { id: 'gants', n: 'Gants & cagoule', ico: '🧤', cat: 'crime', shop: 'street', price: 30, keep: true, d: 'Moins de traces, moins de pression policière.', req: { repRue: 10 } },
    { id: 'brouilleur', n: 'Brouilleur d’alarme', ico: '📡', cat: 'crime', shop: 'street', price: 850, keep: true, d: 'Neutralise la plupart des systèmes domestiques.', req: { repPegre: 20 } },
    { id: 'faux', n: 'Faux papiers', ico: '🪪', cat: 'crime', shop: 'street', price: 600, d: 'Consommable : annule une arrestation.', req: { repPegre: 15 } },
    { id: 'arme', n: 'Arme de poing', ico: '🔫', cat: 'crime', shop: 'street', price: 1800, keep: true, d: 'Ouvre les gros coups. Alourdit chaque condamnation.', req: { repPegre: 35 } },
    { id: 'came', n: 'Lot de marchandise', ico: '🧊', cat: 'crime', shop: 'street', price: 200, d: 'Stock à écouler. Se revend au détail, la nuit.', req: { repRue: 20 } },
    { id: 'contrefacon', n: 'Lot de contrefaçons', ico: '👜', cat: 'crime', shop: 'street', price: 140, d: 'Sacs, montres, parfums. À vendre à la sauvette.', req: { repRue: 12 } },
    { id: 'skimmer', n: 'Copieur de cartes', ico: '💳', cat: 'crime', shop: 'street', price: 1200, keep: true, d: 'Débloque la fraude bancaire.', req: { repPegre: 25, intelligence: 5 } }
  ];
  D.ITEM = {};
  D.ITEMS.forEach(function (i) { D.ITEM[i.id] = i; });

  /* ---------------------------------------------------------
     8. FORMATION — tronc commun.
     Le Baccalauréat est le premier vrai mur : une fois les séances
     faites, il faut le réussir à un examen (voir G.sitEduExam).
     Au-delà, la formation continue dans une filière (data.education.js).
     --------------------------------------------------------- */
  D.EDU = [
    { n: 'Aucune scolarité', short: '—' },
    { n: 'Remise à niveau', short: 'Base', sessions: 6, cost: 0, hours: 3, energy: 14, ico: '✏️', d: 'Lire, écrire, compter correctement. À la bibliothèque, gratuitement.', req: {} },
    { n: 'CAP / Bac pro', short: 'CAP', sessions: 9, cost: 22, hours: 3, energy: 16, ico: '🔧', d: 'Une qualification reconnue. Ouvre les emplois de bureau.', req: { addr: true } },
    {
      n: 'Baccalauréat', short: 'Bac', sessions: 14, cost: 45, hours: 4, energy: 18, ico: '🎓',
      d: 'Cours du soir, deux ans de travail. Et un examen final qu’on ne réussit pas toujours du premier coup.',
      req: { addr: true },
      exam: true, examHours: 4, examEnergy: 20, examBase: 48, stat: 'intelligence', statW: 5.5
    }
  ];

  /* ---------------------------------------------------------
     9. ORIGINES
     --------------------------------------------------------- */
  D.ORIGINS = [
    {
      id: 'expulse', n: 'Expulsé', ico: '🔑',
      d: 'Vous aviez un appartement il y a trois semaines. Vous savez encore vous tenir.',
      apply: function (s) { s.money = 35; s.gauges.hygiene = 62; s.gauges.moral = 45; s.inv.fripes = 1; s.rep.legale = 12; }
    },
    {
      id: 'fugue', n: 'Fugueur', ico: '🎒',
      d: 'Jeune, rapide, sans papiers. La rue vous a adopté avant l’administration.',
      apply: function (s) { s.money = 8; s.gauges.energie = 100; s.gauges.hygiene = 40; s.rep.rue = 18; s.stats.charisme.xp = 40; s.stats.discretion.xp = 40; s.inv.sac = 1; }
    },
    {
      id: 'ruine', n: 'Ruiné', ico: '📉',
      d: 'Vous aviez une entreprise. Il reste un costume et beaucoup de honte.',
      apply: function (s) { s.money = 0; s.gauges.moral = 25; s.gauges.hygiene = 50; s.inv.propre = 1; s.stats.intelligence.xp = 90; s.edu = 2; s.rep.legale = 20; s.bank.open = true; s.bank.score = 30; s.bank.loan = { id: 'conso', amount: 2400, principal: 2000, rate: 0.011, daily: 22, due: 110 }; }
    },
    {
      id: 'sortie', n: 'Sorti de prison', ico: '⛓️',
      d: 'Deux ans purgés. Des contacts solides, un casier qui vous suit.',
      apply: function (s) { s.money = 60; s.gauges.hygiene = 45; s.rep.rue = 35; s.rep.pegre = 25; s.rep.legale = 0; s.stats.force.xp = 110; s.casier = 2; }
    },
    {
      id: 'migrant', n: 'Sans papiers', ico: '🧭',
      d: 'Vous êtes arrivé il y a six jours. Personne ici ne connaît votre nom, ni votre métier.',
      apply: function (s) { s.money = 120; s.gauges.moral = 55; s.gauges.energie = 90; s.rep.legale = 0; s.rep.rue = 8; s.stats.force.xp = 60; s.stats.intelligence.xp = 60; s.flags.nopapers = true; }
    },
    {
      id: 'addict', n: 'En sevrage', ico: '🚬',
      d: 'Trois semaines sans rien. Le corps encaisse encore, l’esprit tangue.',
      apply: function (s) { s.money = 15; s.gauges.sante = 55; s.gauges.moral = 30; s.gauges.hygiene = 35; s.rep.rue = 25; s.flags.addict = 2; s.stats.charisme.xp = 60; }
    },
    {
      id: 'orphelin', n: 'Sorti de foyer', ico: '🏫',
      d: 'Dix-huit ans hier, dehors aujourd’hui. Vous avez un dossier, un référent, et rien d’autre.',
      apply: function (s) { s.money = 240; s.gauges.moral = 50; s.gauges.hygiene = 65; s.edu = 1; s.rep.legale = 18; s.home = 'shelter'; s.npc.sofia = 25; s.inv.fripes = 1; }
    },
    {
      id: 'vet', n: 'Ancien militaire', ico: '🎖️',
      d: 'Douze ans de service, puis plus rien à quoi obéir. Le corps tient, le reste beaucoup moins.',
      apply: function (s) { s.money = 90; s.gauges.moral = 32; s.gauges.energie = 95; s.stats.force.xp = 200; s.stats.discretion.xp = 80; s.rep.legale = 10; s.inv.duvet = 1; }
    }
  ];

  /* ---------------------------------------------------------
     10. JALONS DE PATRIMOINE
     --------------------------------------------------------- */
  D.MILES = [
    { id: 'm100', at: 100, t: '💶 Cent euros', x: 'La première somme que vous n’avez pas dépensée le jour même. C’est là que commence tout le reste.' },
    { id: 'm1k', at: 1000, t: '💰 Mille euros', x: 'Vous avez de quoi voir venir. Vous pouvez enfin décider, au lieu de subir.' },
    { id: 'm10k', at: 10000, t: '🏦 Dix mille euros', x: 'Un capital. Un vrai. De quoi transformer votre temps en machine.' },
    { id: 'm50k', at: 50000, t: '📈 Cinquante mille', x: 'Votre argent commence à produire plus que vos heures. Le rapport de force s’inverse.' },
    { id: 'm100k', at: 100000, t: '💎 Cent mille euros', x: 'On ne vous demande plus d’où vous venez. On vous demande ce que vous faites.' },
    { id: 'm500k', at: 500000, t: '🎩 Un demi-million', x: 'Le sommet est visible. Vous savez exactement ce qu’il a coûté.' }
  ];

  /* ---------------------------------------------------------
     11. LIBELLÉS D'AFFINITÉ (−100 → 100)
     --------------------------------------------------------- */
  D.RELATIONS = [
    { min: -100, n: 'Ennemi juré', c: 'var(--danger)', ico: '🗡️' },
    { min: -60, n: 'Hostile', c: 'var(--danger)', ico: '😡' },
    { min: -25, n: 'Rancunier', c: '#e08a5a', ico: '😒' },
    { min: -8, n: 'Méfiant', c: 'var(--text-3)', ico: '😐' },
    { min: 8, n: 'Connaissance', c: 'var(--text-2)', ico: '🙂' },
    { min: 30, n: 'Ami', c: 'var(--info)', ico: '😊' },
    { min: 55, n: 'Proche', c: 'var(--good)', ico: '🤝' },
    { min: 80, n: 'Confident', c: 'var(--gold)', ico: '💛' }
  ];
  D.relation = function (v) {
    var r = D.RELATIONS[0];
    for (var i = 0; i < D.RELATIONS.length; i++) if (v >= D.RELATIONS[i].min) r = D.RELATIONS[i];
    return r;
  };

  NS.D = D;
})(window.LifeRPG);
