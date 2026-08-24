/* =============================================================
   data.js — Contenu du jeu (équilibrage, textes, tables)
   Aucune logique ici : uniquement des données + fonctions run()
   qui s'appuient sur l'API "G" fournie par engine.js
   ============================================================= */
window.LifeRPG = window.LifeRPG || {};

(function (NS) {
  'use strict';

  var D = {};

  /* ---------------------------------------------------------
     1. TEMPS
     --------------------------------------------------------- */
  D.DAY_START = 6;      // 06h00
  D.DAY_END = 22;       // 22h00 -> coucher forcé
  D.PERIODS = [
    { id: 'matin', label: 'Matin', from: 6, ico: '🌅' },
    { id: 'midi', label: 'Midi', from: 12, ico: '☀️' },
    { id: 'soir', label: 'Soir', from: 17, ico: '🌆' },
    { id: 'nuit', label: 'Nuit', from: 21, ico: '🌙' }
  ];

  /* ---------------------------------------------------------
     2. JAUGES
     --------------------------------------------------------- */
  D.GAUGES = [
    { id: 'faim', label: 'Faim', ico: '🍞', color: 'var(--g-faim)', decay: 2.4 },
    { id: 'energie', label: 'Énergie', ico: '⚡', color: 'var(--g-energie)', decay: 0 },
    { id: 'moral', label: 'Moral', ico: '🙂', color: 'var(--g-moral)', decay: 0.45 },
    { id: 'hygiene', label: 'Hygiène', ico: '🚿', color: 'var(--g-hygiene)', decay: 1.1 },
    { id: 'sante', label: 'Santé', ico: '❤️', color: 'var(--g-sante)', decay: 0 }
  ];

  /* ---------------------------------------------------------
     3. STATISTIQUES RPG
     --------------------------------------------------------- */
  D.STATS = [
    { id: 'charisme', label: 'Charisme', ico: '🎭', desc: 'Mendicité, vente, négociation, séduction sociale.' },
    { id: 'intelligence', label: 'Intelligence', ico: '🧠', desc: 'Études, postes qualifiés, rendement des entreprises.' },
    { id: 'force', label: 'Force', ico: '💪', desc: 'Travaux physiques, résistance, bagarres, endurance.' }
  ];
  D.MAX_LVL = 10;
  D.xpNeeded = function (lvl) { return Math.round(35 * Math.pow(lvl, 1.35)); };

  /* ---------------------------------------------------------
     4. PALIERS SOCIAUX (statut affiché en haut)
     --------------------------------------------------------- */
  D.TIERS = [
    { n: 'Sans-abri', min: -99999, c: '#7a8699', av: '🧍' },
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
     5. LOGEMENTS
     --------------------------------------------------------- */
  D.HOMES = [
    {
      id: 'street', name: 'Trottoir', ico: '📦', rent: 0, sleep: 30, shower: false, addr: false,
      moral: -4, risk: 0.30, deposit: 0,
      desc: 'Un carton, un porche, et le bruit de la ville.', req: {}
    },
    {
      id: 'squat', name: 'Squat', ico: '🏚️', rent: 0, sleep: 44, shower: false, addr: false,
      moral: -2, risk: 0.18, deposit: 0,
      desc: 'Un toit, pas de facture. Et pas de garantie.', req: { repRue: 25 }
    },
    {
      id: 'shelter', name: 'Foyer d’accueil', ico: '🛏️', rent: 8, sleep: 58, shower: true, addr: true,
      moral: 0, risk: 0.06, deposit: 0,
      desc: 'Douche, lit, adresse administrative. Places limitées.', req: { hyg: 20 }
    },
    {
      id: 'room', name: 'Chambre meublée', ico: '🚪', rent: 28, sleep: 72, shower: true, addr: true,
      moral: 2, risk: 0.02, deposit: 90,
      desc: 'Neuf mètres carrés à vous. Le luxe.', req: { app: 40 }
    },
    {
      id: 'studio', name: 'Studio', ico: '🏢', rent: 52, sleep: 85, shower: true, addr: true,
      moral: 4, risk: 0, deposit: 400,
      desc: 'Un vrai bail. Un vrai début.', req: { repLeg: 25 }
    },
    {
      id: 'appart', name: 'Appartement', ico: '🏙️', rent: 120, sleep: 93, shower: true, addr: true,
      moral: 7, risk: 0, deposit: 1200,
      desc: 'Deux chambres, balcon, quartier calme.', req: { repLeg: 40 }
    },
    {
      id: 'loft', name: 'Loft d’architecte', ico: '🌇', rent: 280, sleep: 97, shower: true, addr: true,
      moral: 11, risk: 0, deposit: 4000,
      desc: 'Béton ciré, baies vitrées, vue sur le fleuve.', req: { repLeg: 55 }
    },
    {
      id: 'penthouse', name: 'Penthouse', ico: '🌃', rent: 750, sleep: 100, shower: true, addr: true,
      moral: 16, risk: 0, deposit: 15000,
      desc: 'Le dernier étage. Vous regardez la rue d’où vous venez.', req: { repLeg: 70 }
    }
  ];

  /* ---------------------------------------------------------
     6. OBJETS  (cat: food | care | tool | tenue | transport | tech | luxe)
        style  = points d'apparence apportés (tenues)
        keep   = objet durable (non consommable)
     --------------------------------------------------------- */
  D.ITEMS = [
    /* --- Nourriture --- */
    { id: 'eau', n: 'Bouteille d’eau', ico: '💧', cat: 'food', price: 1, d: 'Basique et vital.', use: { faim: 6, energie: 4, sante: 1 } },
    { id: 'sandwich', n: 'Sandwich', ico: '🥪', cat: 'food', price: 3, d: 'Froid, mais ça cale.', use: { faim: 22 } },
    { id: 'cafe', n: 'Café', ico: '☕', cat: 'food', price: 2, d: 'Un coup de fouet immédiat.', use: { energie: 14, faim: -2, moral: 2 } },
    { id: 'fruits', n: 'Fruits', ico: '🍎', cat: 'food', price: 4, d: 'Le corps vous remerciera.', use: { faim: 16, sante: 5 } },
    { id: 'kebab', n: 'Kebab', ico: '🌯', cat: 'food', price: 8, d: 'Le repas des vainqueurs fauchés.', use: { faim: 42, moral: 4, sante: -1 } },
    { id: 'restau', n: 'Repas au restaurant', ico: '🍽️', cat: 'food', price: 26, d: 'Assis, au chaud, servi.', use: { faim: 60, moral: 12, sante: 3 }, req: { app: 45 } },

    /* --- Soins & hygiène --- */
    { id: 'savon', n: 'Savon & gant', ico: '🧼', cat: 'care', price: 3, d: 'Change tout à la fontaine.', use: { hygiene: 26 } },
    { id: 'medoc', n: 'Médicaments', ico: '💊', cat: 'care', price: 18, d: 'Soigne blessures et infections.', use: { sante: 32 } },
    { id: 'vitamines', n: 'Vitamines', ico: '🧴', cat: 'care', price: 10, d: 'Coup de boost général.', use: { sante: 12, energie: 16 } },
    { id: 'alcool', n: 'Bouteille d’alcool', ico: '🍾', cat: 'care', price: 6, d: 'Oublier vite. Le payer lentement.', use: { moral: 18, sante: -8, hygiene: -4, energie: -5 } },
    { id: 'livre', n: 'Livre d’occasion', ico: '📕', cat: 'care', price: 14, d: 'Lecture : +30 XP Intelligence.', use: { xp: ['intelligence', 30], moral: 3 } },

    /* --- Outils (durables) --- */
    { id: 'carton', n: 'Carton & couverture', ico: '📦', cat: 'tool', price: 9, keep: true, d: 'Dormir dehors sans y laisser sa santé.' },
    { id: 'duvet', n: 'Duvet grand froid', ico: '🛌', cat: 'tool', price: 45, keep: true, d: 'Sommeil dehors nettement amélioré.' },
    { id: 'seau', n: 'Seau & raclette', ico: '🪣', cat: 'tool', price: 18, keep: true, d: 'Débloque le lavage de pare-brise.' },
    { id: 'guitare', n: 'Guitare abîmée', ico: '🎸', cat: 'tool', price: 55, keep: true, d: 'Débloque la manche musicale.' },
    { id: 'sac', n: 'Sac à dos solide', ico: '🎒', cat: 'tool', price: 30, keep: true, d: 'Vos affaires ne disparaissent plus la nuit.' },

    /* --- Tenues --- */
    { id: 'fripes', n: 'Fripes correctes', ico: '👕', cat: 'tenue', price: 22, keep: true, style: 28, d: 'On ne vous fuit plus dans le métro.' },
    { id: 'propre', n: 'Tenue propre', ico: '👔', cat: 'tenue', price: 85, keep: true, style: 48, d: 'Le minimum pour un entretien.' },
    { id: 'pro', n: 'Tenue professionnelle', ico: '🥼', cat: 'tenue', price: 260, keep: true, style: 68, d: 'Crédible dans un bureau.' },
    { id: 'costume', n: 'Costume taillé', ico: '🤵', cat: 'tenue', price: 1100, keep: true, style: 86, d: 'On vous écoute avant même de parler.' },
    { id: 'hautecouture', n: 'Haute couture', ico: '🕶️', cat: 'tenue', price: 6500, keep: true, style: 100, d: 'Vous êtes la référence.' },

    /* --- Transport --- */
    { id: 'velo', n: 'Vélo', ico: '🚲', cat: 'transport', price: 110, keep: true, speed: 1, d: 'Débloque la livraison à vélo.' },
    { id: 'scooter', n: 'Scooter', ico: '🛵', cat: 'transport', price: 1400, keep: true, speed: 2, d: 'Trajets plus rapides : certains quarts coûtent 1h de moins.' },
    { id: 'voiture', n: 'Voiture', ico: '🚗', cat: 'transport', price: 9000, keep: true, speed: 3, d: 'Confort, image, mobilité.' },
    { id: 'berline', n: 'Berline de luxe', ico: '🏎️', cat: 'transport', price: 48000, keep: true, speed: 4, d: 'Un actif, et un message.' },

    /* --- Tech --- */
    { id: 'smartphone', n: 'Smartphone', ico: '📱', cat: 'tech', price: 160, keep: true, tech: 1, d: 'Indispensable pour les jobs modernes.' },
    { id: 'ordi', n: 'Ordinateur portable', ico: '💻', cat: 'tech', price: 700, keep: true, tech: 2, d: 'Débloque les formations en ligne et le e-commerce.' },

    /* --- Luxe (patrimoine) --- */
    { id: 'montre', n: 'Montre de luxe', ico: '⌚', cat: 'luxe', price: 4500, keep: true, style: 6, d: 'Un actif qui se porte au poignet.' },
    { id: 'art', n: 'Œuvre d’art', ico: '🖼️', cat: 'luxe', price: 25000, keep: true, d: 'Le patrimoine des gens arrivés.' }
  ];
  D.ITEM = {};
  D.ITEMS.forEach(function (i) { D.ITEM[i.id] = i; });

  /* ---------------------------------------------------------
     7. ACTIONS DE SURVIE
     --------------------------------------------------------- */
  D.ACTIONS = [
    {
      id: 'beg', ico: '🥺', n: 'Faire la manche', accent: 'var(--g-faim)',
      d: 'Tendre la main dans un lieu de passage. Rentable le midi et le soir.',
      hours: 2, energy: 10, req: {},
      run: function (G) {
        var per = { matin: 0.85, midi: 1.3, soir: 1.15, nuit: 0.5 }[G.period()];
        var base = (3 + G.lvl('charisme') * 2.6 + G.apparence() * 0.10) * per * G.rndF(0.6, 1.45);
        if (G.gauge('hygiene') < 25) base *= 0.55;
        if (G.gauge('moral') < 30) base *= 0.8;
        if (G.has('carton')) base *= 1.08;
        var gain = Math.max(0, Math.round(base));
        G.cash(gain, 'Manche');
        G.xp('charisme', 4);
        G.add('moral', -4);
        G.rep('rue', 0.5);

        if (G.chance(9)) {
          G.heat(3); G.add('moral', -5);
          return { t: 'bad', m: 'Un commerçant vous chasse de son trottoir. Vous récoltez ' + G.eur(gain) + ' et une humiliation.' };
        }
        if (G.chance(7)) {
          G.give('sandwich', 1);
          return { t: 'good', m: 'Une passante vous glisse ' + G.eur(gain) + ' et un sandwich, sans un mot.' };
        }
        if (gain === 0) return { t: 'bad', m: 'Deux heures. Des centaines de regards qui glissent. Rien.' };
        return { t: 'money', m: 'Deux heures assis. <b>' + G.eur(gain) + '</b> dans le gobelet.' };
      }
    },
    {
      id: 'recycle', ico: '🥫', n: 'Collecter les canettes', accent: 'var(--info)',
      d: 'Fastidieux, sale, mais sans aucun risque. Le revenu du désespoir tranquille.',
      hours: 3, energy: 16, req: {},
      run: function (G) {
        var gain = G.rnd(6, 13) + Math.round(G.lvl('force') * 1.6);
        G.cash(gain, 'Consigne');
        G.add('hygiene', -9); G.xp('force', 5); G.add('moral', -2);
        return { t: 'money', m: 'Trois heures à écumer les parcs. La consigne vous rend <b>' + G.eur(gain) + '</b>.' };
      }
    },
    {
      id: 'busk', ico: '🎸', n: 'Manche musicale', accent: 'var(--purple)',
      d: 'Jouer dans le métro. Plus digne, plus rentable, et le public vous forme.',
      hours: 3, energy: 15, req: { item: 'guitare' },
      run: function (G) {
        var per = { matin: 1.05, midi: 1.15, soir: 1.35, nuit: 0.6 }[G.period()];
        var gain = Math.round((6 + G.lvl('charisme') * 4.4) * per * G.rndF(0.7, 1.5));
        G.cash(gain, 'Musique');
        G.xp('charisme', 9); G.add('moral', 6); G.rep('rue', 1);
        if (G.chance(11)) {
          G.rep('legale', 2); G.add('moral', 6);
          return { t: 'good', m: 'Un attroupement se forme. <b>' + G.eur(gain) + '</b>, et quelqu’un vous filme en souriant.' };
        }
        return { t: 'money', m: 'Vos doigts sont gelés mais le chapeau contient <b>' + G.eur(gain) + '</b>.' };
      }
    },
    {
      id: 'scavenge', ico: '🗑️', n: 'Fouiller les poubelles', accent: '#8a7d5f',
      d: 'Derrière les supermarchés, à la fermeture. Nourriture, parfois mieux.',
      hours: 2, energy: 13, req: {},
      run: function (G) {
        G.add('hygiene', -14);
        var r = G.rnd(1, 100);
        if (r <= 34) { G.add('faim', 24); return { t: 'good', m: 'Invendus du jour, encore emballés. Vous mangez à votre faim.' }; }
        if (r <= 52) { G.give('sandwich', 1); G.add('faim', 8); return { t: 'good', m: 'Un carton entier de sandwichs périmés d’une heure. Vous en gardez un.' }; }
        if (r <= 66) { var g = G.rnd(4, 16); G.cash(g, 'Revente'); return { t: 'money', m: 'Un objet en bon état, revendu <b>' + G.eur(g) + '</b> au ferrailleur.' }; }
        if (r <= 78) { G.give('eau', 2); return { t: 'neutral', m: 'Deux bouteilles d’eau intactes. C’est déjà ça.' }; }
        if (r <= 88) { G.add('sante', -6); G.add('moral', -4); return { t: 'bad', m: 'Du verre. Vous vous entaillez la main et rentrez les poches vides.' }; }
        return { t: 'neutral', m: 'Rien. Le container avait déjà été vidé par d’autres.' };
      }
    },
    {
      id: 'soup', ico: '🍲', n: 'Soupe populaire', accent: 'var(--good)',
      d: 'Repas chaud gratuit distribué par l’association. Uniquement le midi et le soir.',
      hours: 1, energy: 3, req: { period: ['midi', 'soir'] },
      run: function (G) {
        G.add('faim', 38); G.add('moral', 6); G.add('sante', 2);
        G.aff('sofia', 3);
        if (G.chance(18)) { G.give('eau', 1); G.aff('marcel', 2); return { t: 'good', m: 'Repas chaud, et Marcel vous garde une place à sa table. On parle un peu.' }; }
        return { t: 'good', m: 'Soupe, pain, café. Vingt minutes où vous n’êtes pas invisible.' };
      }
    },
    {
      id: 'wash', ico: '🚰', n: 'Se laver à la fontaine', accent: 'var(--g-hygiene)',
      d: 'De l’eau froide dans un parc. Avec du savon, c’est bien plus efficace.',
      hours: 1, energy: 5, req: {},
      run: function (G) {
        var soap = G.has('savon');
        if (soap) {
          G.take('savon', 1);
          G.set('hygiene', Math.max(G.gauge('hygiene'), Math.min(88, G.gauge('hygiene') + 34)));
          G.add('moral', 5);
          return { t: 'good', m: 'Avec le savon, vous vous sentez presque neuf. Le regard des gens change.' };
        }
        G.set('hygiene', Math.max(G.gauge('hygiene'), Math.min(52, G.gauge('hygiene') + 20)));
        G.add('moral', 2); G.add('sante', -1);
        return { t: 'neutral', m: 'Eau glacée, pas de savon. Le plafond du propre est vite atteint.' };
      }
    },
    {
      id: 'shower', ico: '🛁', n: 'Prendre une douche', accent: 'var(--g-hygiene)',
      d: 'Chez vous, à l’eau chaude. Hygiène au maximum.',
      hours: 1, energy: 2, req: { shower: true },
      run: function (G) {
        G.set('hygiene', 100); G.add('moral', 6); G.add('energie', 4);
        return { t: 'good', m: 'Eau chaude. Vous restez dessous plus longtemps que nécessaire.' };
      }
    },
    {
      id: 'rest', ico: '☕', n: 'Se reposer', accent: 'var(--g-energie)',
      d: 'Une pause sur un banc ou chez soi. Récupère de l’énergie sans finir la journée.',
      hours: 2, energy: -20, req: {},
      run: function (G) {
        G.add('moral', 3);
        if (G.home().id === 'street' && G.chance(14)) {
          G.add('moral', -6);
          return { t: 'bad', m: 'On vous réveille en vous demandant de circuler. Repos écourté.' };
        }
        return { t: 'good', m: 'Deux heures immobiles. Le corps redémarre.' };
      }
    },
    {
      id: 'library', ico: '📚', n: 'Aller à la bibliothèque', accent: 'var(--info)',
      d: 'Chaud, gratuit, silencieux. Le meilleur investissement de la rue.',
      hours: 3, energy: 9, req: { hyg: 25 },
      run: function (G) {
        G.xp('intelligence', 12); G.add('moral', 4);
        if (G.has('ordi') || G.has('smartphone')) { G.xp('intelligence', 5); }
        if (G.chance(10)) { G.give('livre', 1); return { t: 'good', m: 'Vous lisez trois heures. Un bibliothécaire vous offre un livre du bac à dons.' }; }
        return { t: 'good', m: 'Trois heures au chaud, à lire. Personne ne vous demande rien.' };
      }
    },
    {
      id: 'workout', ico: '🏋️', n: 'Faire du sport', accent: '#f07a5a',
      d: 'Barres de parc, course, pompes. Le corps est votre premier outil de travail.',
      hours: 2, energy: 22, req: { sante: 25 },
      run: function (G) {
        G.xp('force', 13); G.add('hygiene', -12); G.add('moral', 5); G.add('sante', 3); G.add('faim', -6);
        return { t: 'good', m: 'Vous poussez jusqu’à trembler. Demain vous serez un peu plus solide.' };
      }
    },
    {
      id: 'leisure', ico: '🎬', n: 'Se faire plaisir en ville', accent: 'var(--purple)',
      d: 'Cinéma, bar, match. Coûteux, mais le moral décide de tout le reste.',
      hours: 3, energy: 8, req: { money: 20 },
      run: function (G) {
        var cost = 20 + Math.round(G.lvl('charisme') * 1.5);
        G.cash(-cost, 'Sortie');
        G.add('moral', 26); G.xp('charisme', 6);
        if (G.chance(12)) { G.rep('legale', 2); return { t: 'good', m: 'Vous rencontrez des gens normaux, qui vous parlent normalement. Ça fait un bien fou.' }; }
        return { t: 'good', m: 'Trois heures où vous n’êtes personne d’autre qu’un client. Moral en hausse.' };
      }
    },
    {
      id: 'steal', ico: '🥷', n: 'Voler à l’étalage', accent: 'var(--danger)',
      d: 'Rapide et illégal. Chaque coup augmente la pression policière.',
      hours: 1, energy: 8, risky: true, req: {},
      run: function (G) {
        var ok = 40 + G.lvl('charisme') * 3 + G.s.rep.rue * 0.22 - G.s.heat * 0.45;
        if (G.chance(ok)) {
          var g = G.rnd(12, 34) + G.lvl('charisme') * 4;
          G.cash(g, 'Vol'); G.rep('rue', 3); G.rep('legale', -2); G.heat(9); G.add('moral', -2);
          if (G.chance(25)) { G.give('sandwich', 2); }
          return { t: 'money', m: 'Personne n’a rien vu. <b>' + G.eur(g) + '</b> de marchandise revendue.' };
        }
        G.heat(20); G.rep('legale', -4); G.add('moral', -10);
        G.arrestCheck('vol à l’étalage');
        return { t: 'bad', m: 'Le vigile vous attrape par le col. Ça se termine mal.' };
      }
    },
    {
      id: 'pickpocket', ico: '🪙', n: 'Faire les poches', accent: 'var(--danger)',
      d: 'Beaucoup plus rentable, beaucoup plus dangereux. Réservé aux initiés de la rue.',
      hours: 2, energy: 12, risky: true, req: { repRue: 20 },
      run: function (G) {
        var ok = 30 + G.lvl('charisme') * 4 + G.s.rep.rue * 0.35 - G.s.heat * 0.6;
        if (G.chance(ok)) {
          var g = G.rnd(30, 95) + G.lvl('charisme') * 8;
          G.cash(g, 'Vol à la tire'); G.rep('rue', 5); G.rep('legale', -3); G.heat(15);
          G.xp('charisme', 6);
          if (G.chance(18)) { G.give('smartphone', 1); return { t: 'money', m: '<b>' + G.eur(g) + '</b> en liquide, et un smartphone au fond de la poche.' }; }
          return { t: 'money', m: 'La foule du métro fait le travail pour vous. <b>' + G.eur(g) + '</b>.' };
        }
        G.heat(28); G.rep('legale', -6); G.add('sante', -10); G.add('moral', -12);
        G.arrestCheck('vol à la tire');
        return { t: 'bad', m: 'La main se referme sur votre poignet. On crie. On frappe.' };
      }
    }
  ];

  /* ---------------------------------------------------------
     8. PETITS BOULOTS (informels, sans embauche)
     --------------------------------------------------------- */
  D.GIGS = [
    {
      id: 'squeegee', n: 'Laveur de pare-brise', ico: '🪣', hours: 3, energy: 22,
      d: 'Aux feux rouges. Un client sur dix accepte, mais il paie.',
      req: { item: 'seau' },
      pay: function (G) { return G.rnd(14, 26) + G.lvl('charisme') * 4; },
      xp: { charisme: 8, force: 3 }, rep: { rue: 1 }, hyg: -8
    },
    {
      id: 'flyers', n: 'Distribution de tracts', ico: '📄', hours: 3, energy: 16,
      d: 'Déclaré nulle part, payé en liquide le soir même.',
      req: { hyg: 35, app: 30 },
      pay: function (G) { return G.rnd(24, 34) + G.lvl('charisme') * 2; },
      xp: { charisme: 5 }, rep: { legale: 1 }, hyg: -5
    },
    {
      id: 'labor', n: 'Manutention / déménagement', ico: '📦', hours: 4, energy: 34,
      d: 'Dur, payé correctement, sans questions posées.',
      req: { force: 2, hyg: 30, sante: 35 },
      pay: function (G) { return G.rnd(45, 65) + G.lvl('force') * 7; },
      xp: { force: 14 }, rep: { rue: 1 }, hyg: -14
    },
    {
      id: 'courier', n: 'Livraison à vélo', ico: '🚴', hours: 4, energy: 30,
      d: 'Application, casque, chrono. Autonome et régulier.',
      req: { item: 'velo', item2: 'smartphone', hyg: 30 },
      pay: function (G) { return G.rnd(52, 74) + G.lvl('force') * 5 + G.lvl('charisme') * 2; },
      xp: { force: 9, charisme: 3 }, rep: { legale: 2 }, hyg: -10
    },
    {
      id: 'dish', n: 'Plonge en cuisine', ico: '🍽️', hours: 4, energy: 26,
      d: 'Au noir, dans l’arrière-cuisine. Repas du personnel inclus.',
      req: { hyg: 45 },
      pay: function (G) { return G.rnd(42, 58); },
      xp: { force: 6 }, rep: { legale: 1 }, hyg: -8, faim: 25
    },
    {
      id: 'market', n: 'Aide au marché', ico: '🥬', hours: 3, energy: 24,
      d: 'Monter et démonter les étals à l’aube. Invendus offerts.',
      req: { force: 1, period: ['matin'] },
      pay: function (G) { return G.rnd(28, 42) + G.lvl('force') * 4; },
      xp: { force: 8, charisme: 2 }, rep: { rue: 1 }, faim: 20, hyg: -7
    }
  ];

  /* ---------------------------------------------------------
     9. EMPLOIS DÉCLARÉS (nécessitent une candidature)
        req.addr = logement avec adresse administrative
     --------------------------------------------------------- */
  D.JOBS = [
    {
      id: 'cashier', n: 'Caissier·ère', ico: '🛒', hours: 6, energy: 30, pay: 92,
      d: 'Premier contrat. Premier bulletin de salaire. Premier vrai statut.',
      req: { app: 48, addr: true, hyg: 45 },
      xp: { charisme: 6, intelligence: 3 }, repLeg: 2.5
    },
    {
      id: 'waiter', n: 'Serveur·euse', ico: '🍷', hours: 6, energy: 34, pay: 118,
      d: 'Pourboires proportionnels à votre charisme.',
      req: { app: 55, addr: true, charisme: 3, hyg: 55 },
      xp: { charisme: 11, force: 4 }, repLeg: 3,
      bonus: function (G) { return G.rnd(4, 12) + G.lvl('charisme') * 4; }
    },
    {
      id: 'clerk', n: 'Agent administratif', ico: '🗂️', ico2: '', hours: 7, energy: 26, pay: 175,
      d: 'Bureau, horaires fixes, et un diplôme exigé.',
      req: { app: 62, addr: true, edu: 2, intelligence: 3, hyg: 60 },
      xp: { intelligence: 12, charisme: 4 }, repLeg: 4
    },
    {
      id: 'sales', n: 'Commercial·e', ico: '📈', hours: 7, energy: 32, pay: 250,
      d: 'Fixe modeste, variable indexé sur votre bagout.',
      req: { app: 70, addr: true, edu: 3, charisme: 5, item: 'propre' },
      xp: { charisme: 16, intelligence: 6 }, repLeg: 5,
      bonus: function (G) { return G.lvl('charisme') * 22 + G.rnd(0, 60); }
    },
    {
      id: 'manager', n: 'Chef de projet', ico: '📊', hours: 8, energy: 34, pay: 410,
      d: 'On vous confie une équipe et un budget.',
      req: { app: 74, addr: true, edu: 4, intelligence: 6, repLeg: 45 },
      xp: { intelligence: 18, charisme: 10 }, repLeg: 6
    },
    {
      id: 'exec', n: 'Directeur·rice', ico: '🏛️', hours: 8, energy: 30, pay: 780,
      d: 'Comité de direction, stock-options, chauffeur.',
      req: { app: 82, addr: true, edu: 5, intelligence: 8, charisme: 7, repLeg: 65, item: 'costume' },
      xp: { intelligence: 20, charisme: 16 }, repLeg: 8,
      bonus: function (G) { return G.lvl('intelligence') * 30; }
    }
  ];
  D.JOB = {};
  D.JOBS.forEach(function (j) { D.JOB[j.id] = j; });

  /* ---------------------------------------------------------
     10. FORMATION (5 niveaux)
     --------------------------------------------------------- */
  D.EDU = [
    { n: 'Aucune scolarité', short: '—' },
    { n: 'Remise à niveau', short: 'Base', sessions: 6, cost: 0, hours: 3, energy: 14, ico: '✏️', d: 'Lire, écrire, compter correctement. À la bibliothèque, gratuitement.', req: {} },
    { n: 'CAP / Bac pro', short: 'CAP', sessions: 9, cost: 22, hours: 3, energy: 16, ico: '🔧', d: 'Une qualification reconnue. Ouvre les emplois de bureau.', req: { addr: true } },
    { n: 'Baccalauréat', short: 'Bac', sessions: 12, cost: 40, hours: 4, energy: 18, ico: '🎓', d: 'Cours du soir. Long, mais décisif.', req: { addr: true } },
    { n: 'Licence', short: 'Licence', sessions: 15, cost: 90, hours: 4, energy: 20, ico: '📜', d: 'Université. Les portes du management s’entrouvrent.', req: { addr: true, intelligence: 4 } },
    { n: 'Master / MBA', short: 'MBA', sessions: 18, cost: 220, hours: 5, energy: 22, ico: '🏅', d: 'Le passeport des directions générales.', req: { addr: true, intelligence: 6 } }
  ];

  /* ---------------------------------------------------------
     11. ENTREPRISES (moteur du million)
     --------------------------------------------------------- */
  D.BIZ = [
    {
      id: 'resale', n: 'Revente en ligne', ico: '📦', cost: 500, rev: 42, maxLvl: 10,
      d: 'Acheter en brocante, revendre sur internet.',
      req: { intelligence: 2, item: 'smartphone' }
    },
    {
      id: 'truck', n: 'Food truck', ico: '🚚', cost: 4000, rev: 230, maxLvl: 10,
      d: 'Un camion, une carte courte, un emplacement.',
      req: { intelligence: 3, edu: 2 }
    },
    {
      id: 'agency', n: 'Agence de communication', ico: '🏢', cost: 26000, rev: 1250, maxLvl: 10,
      d: 'Vous vendez le talent des autres — et le vôtre.',
      req: { intelligence: 5, charisme: 5, edu: 3 }
    },
    {
      id: 'realestate', n: 'Société immobilière', ico: '🏗️', cost: 110000, rev: 4600, maxLvl: 10,
      d: 'Acheter des murs. Les louer. Recommencer.',
      req: { intelligence: 6, edu: 4, repLeg: 45 }
    },
    {
      id: 'startup', n: 'Startup technologique', ico: '🚀', cost: 300000, rev: 13500, maxLvl: 10,
      d: 'Lever, recruter, croître. Le dernier étage se rapproche.',
      req: { intelligence: 8, edu: 5, repLeg: 60 }
    }
  ];
  D.BIZI = {};
  D.BIZ.forEach(function (b) { D.BIZI[b.id] = b; });

  /* ---------------------------------------------------------
     12. PNJ
     --------------------------------------------------------- */
  D.NPCS = [
    {
      id: 'marcel', n: 'Marcel', ico: '🧔', role: 'Vétéran de la rue',
      d: 'Vingt ans dehors. Il sait où dormir, qui éviter, quand se taire.',
      talk: function (G) { return 'Marcel vous parle des bons coins et des mauvaises nuits.'; },
      favors: [
        { id: 'tip', n: 'Demander un tuyau', aff: 25, d: '+15 énergie, +10 moral, un repas partagé', run: function (G) { G.add('energie', 15); G.add('moral', 10); G.add('faim', 20); return 'Marcel partage sa gamelle et vous indique un porche chauffé.'; } },
        { id: 'spot', n: 'Obtenir son emplacement', aff: 50, d: 'La manche rapporte +25% définitivement', run: function (G) { G.flag('begBoost', true); return 'Marcel vous cède son emplacement devant la boulangerie. C’est un héritage.'; } },
        { id: 'squat', n: 'Entrer dans le squat', aff: 40, d: 'Débloque le squat sans réputation de rue', run: function (G) { G.flag('squatOk', true); return 'Il glisse un mot au gardien du squat. La porte s’ouvrira.'; } }
      ]
    },
    {
      id: 'sofia', n: 'Sofia', ico: '👩‍⚕️', role: 'Bénévole associative',
      d: 'Elle connaît votre prénom. Cela fait longtemps que personne ne l’utilisait.',
      favors: [
        { id: 'care', n: 'Demander des soins', aff: 20, d: 'Santé +35, gratuit', run: function (G) { G.add('sante', 35); return 'Elle nettoie vos plaies et vous force à finir un thé brûlant.' } },
        { id: 'clothes', n: 'Demander des vêtements', aff: 35, d: 'Reçoit une tenue propre gratuitement', run: function (G) { G.give('propre', 1); return 'Le vestiaire solidaire vous équipe. Vous ne vous reconnaissez pas.' } },
        { id: 'shelter', n: 'Obtenir une place au foyer', aff: 45, d: 'Foyer d’accueil gratuit pendant 10 nuits', run: function (G) { G.flag('freeShelter', 10); return 'Une place vous est réservée au foyer. Dix nuits sans payer.' } },
        { id: 'papers', n: 'Refaire ses papiers', aff: 60, d: 'Réputation légale +20', run: function (G) { G.rep('legale', 20); return 'Elle vous accompagne à la préfecture. Vous existez de nouveau administrativement.' } }
      ]
    },
    {
      id: 'karim', n: 'Karim', ico: '🧢', role: 'Contact du quartier',
      d: 'Il propose toujours quelque chose. Ce n’est jamais gratuit.',
      favors: [
        { id: 'job', n: 'Accepter une course', aff: 20, d: '150–400 € · pression policière +25', risky: true, run: function (G) { var g = G.rnd(150, 400); G.cash(g, 'Course pour Karim'); G.heat(25); G.rep('rue', 8); G.rep('legale', -6); return 'Un colis d’un point A à un point B. Vous ne demandez pas ce qu’il y a dedans. ' + G.eur(g) + '.' } },
        { id: 'clean', n: 'Faire nettoyer son dossier', aff: 45, d: 'Pression policière remise à 0 · 300 €', run: function (G) { if (G.s.money < 300) { return null; } G.cash(-300, 'Arrangement'); G.s.heat = 0; return 'Un dossier disparaît. On ne vous explique pas comment.' } },
        { id: 'cash', n: 'Emprunter du capital', aff: 60, d: 'Reçoit 3 000 € · dette à rembourser', run: function (G) { G.cash(3000, 'Prêt de Karim'); G.flag('debt', 4500); return 'Trois mille en liquide. « Tu me rends quatre mille cinq. Pas de retard. »' } }
      ]
    },
    {
      id: 'duval', n: 'Brigadier Duval', ico: '👮', role: 'Police municipale',
      d: 'Il vous a déjà fait circuler trois fois. Il commence à vous saluer.',
      favors: [
        { id: 'warn', n: 'Se faire oublier', aff: 30, d: 'Pression policière −40', run: function (G) { G.heat(-40); return 'Il déchire un rapport devant vous. « La prochaine fois, je ne peux plus. »' } },
        { id: 'ref', n: 'Obtenir une attestation', aff: 55, d: 'Réputation légale +25', run: function (G) { G.rep('legale', 25); return 'Une attestation de bonne conduite signée. Ça vaut de l’or dans un dossier.' } }
      ]
    },
    {
      id: 'renard', n: 'Mme Renard', ico: '👩‍🍳', role: 'Patronne du café',
      d: 'Elle vous sert un café quand la salle est vide. C’est une forme de respect.',
      favors: [
        { id: 'meal', n: 'Demander un repas', aff: 20, d: 'Faim +45, moral +8', run: function (G) { G.add('faim', 45); G.add('moral', 8); return 'Plat du jour, sur le coin du comptoir, sans facture.' } },
        { id: 'hire', n: 'Demander une embauche', aff: 50, d: 'Embauche directe comme serveur·euse', run: function (G) { G.hire('waiter', true); return 'Elle vous tend un tablier. « Tu commences demain. Sois propre. »' } }
      ]
    },
    {
      id: 'alex', n: 'Alex Vidal', ico: '🕴️', role: 'Investisseur',
      d: 'Il repère les gens avant qu’ils ne deviennent quelqu’un. Il vous observe.',
      lock: { repLeg: 30 },
      favors: [
        { id: 'seed', n: 'Lever des fonds', aff: 45, d: 'Reçoit 15 000 € de capital', run: function (G) { G.cash(15000, 'Levée de fonds'); G.rep('legale', 5); return 'Il signe un chèque sans cligner. « Ne me décevez pas. »' } },
        { id: 'net', n: 'Entrer dans son réseau', aff: 65, d: 'Revenus d’entreprise +30% définitivement', run: function (G) { G.flag('network', true); return 'Trois dîners, six cartes de visite. Vos affaires changent d’échelle.' } }
      ]
    }
  ];
  D.NPC = {};
  D.NPCS.forEach(function (n) { D.NPC[n.id] = n; });

  /* ---------------------------------------------------------
     13. ORIGINES (choix de départ)
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
      apply: function (s) { s.money = 8; s.gauges.energie = 100; s.gauges.hygiene = 40; s.rep.rue = 18; s.stats.charisme.xp = 40; s.inv.sac = 1; }
    },
    {
      id: 'ruine', n: 'Ruiné', ico: '📉',
      d: 'Vous aviez une entreprise. Il reste un costume et beaucoup de honte.',
      apply: function (s) { s.money = 0; s.gauges.moral = 25; s.gauges.hygiene = 50; s.inv.propre = 1; s.stats.intelligence.xp = 90; s.edu = 2; s.rep.legale = 20; }
    },
    {
      id: 'sortie', n: 'Sorti de prison', ico: '⛓️',
      d: 'Deux ans purgés. Des contacts solides, un casier qui vous suit.',
      apply: function (s) { s.money = 60; s.gauges.hygiene = 45; s.rep.rue = 35; s.rep.legale = 0; s.stats.force.xp = 110; s.flags.casier = true; }
    }
  ];

  NS.D = D;
})(window.LifeRPG);
