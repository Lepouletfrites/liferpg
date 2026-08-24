/* =============================================================
   data.finance.js — Banque, crédits, marchés financiers.
   ============================================================= */
(function (NS) {
  'use strict';
  var D = NS.D;

  /* ---------------------------------------------------------
     BANQUE
     --------------------------------------------------------- */
  D.BANK = {
    openCost: 20,
    openReq: { addr: true, repLeg: 8 },
    savingsRate: 0.0016,        // intérêt quotidien du livret (~0,16 %/jour)
    savingsCap: 400000,         // au-delà, le livret ne rémunère plus
    depositFeeFree: true,
    /* Un compte protège l'argent : seul le liquide se vole ou se saisit */
    seizeThreshold: 55          // pression policière à partir de laquelle une saisie devient possible
  };

  /* Offres de crédit — score requis, montant, taux journalier, durée */
  D.LOANS = [
    { id: 'micro', n: 'Microcrédit solidaire', ico: '🤲', amount: 800, rate: 0.0022, days: 40, score: 15, d: 'Accordé sur dossier social, sans garantie.' },
    { id: 'conso', n: 'Crédit à la consommation', ico: '🧾', amount: 4000, rate: 0.0030, days: 60, score: 35, d: 'Rapide, cher, et il faut un revenu déclaré.' },
    { id: 'pro', n: 'Prêt professionnel', ico: '🏢', amount: 25000, rate: 0.0021, days: 90, score: 55, d: 'Il faut un projet, des comptes, et une entreprise existante.', req: { biz: 1 } },
    { id: 'invest', n: 'Ligne de financement', ico: '🏦', amount: 120000, rate: 0.0017, days: 120, score: 72, d: 'Réservée à ceux dont la banque n’a plus peur.', req: { biz: 2, repLeg: 45 } },
    { id: 'lbo', n: 'Financement à effet de levier', ico: '📐', amount: 600000, rate: 0.0015, days: 150, score: 88, d: 'On vous prête l’argent des autres pour acheter avec.', req: { biz: 3, repLeg: 60 } }
  ];

  /* ---------------------------------------------------------
     MARCHÉ
     drift : dérive quotidienne moyenne · vol : volatilité
     --------------------------------------------------------- */
  D.ASSETS = [
    {
      id: 'oblig', n: 'Obligations d’État', ico: '🏛️', ticker: 'OAT', start: 100,
      drift: 0.0016, vol: 0.005, min: 60,
      d: 'Rendement faible, quasiment jamais de secousse. Le contraire d’une aventure.'
    },
    {
      id: 'etf', n: 'Indice mondial', ico: '🌍', ticker: 'WLD', start: 100,
      drift: 0.0026, vol: 0.016, min: 30,
      d: 'Tout le marché en une ligne. Monte lentement, presque toujours.'
    },
    {
      id: 'immo', n: 'Foncière cotée', ico: '🏢', ticker: 'REIT', start: 100,
      drift: 0.0022, vol: 0.021, min: 20,
      d: 'Des murs, des loyers, des taux d’intérêt qui décident de tout.'
    },
    {
      id: 'or', n: 'Or', ico: '🥇', ticker: 'AU', start: 100,
      drift: 0.0014, vol: 0.014, min: 40, crisis: 1,
      d: 'Ne produit rien. Protège quand tout le reste s’effondre.'
    },
    {
      id: 'energie', n: 'Énergie', ico: '🛢️', ticker: 'NRG', start: 100,
      drift: 0.0021, vol: 0.030, min: 15,
      d: 'Cyclique, brutale, dépendante d’événements que vous ne contrôlez pas.'
    },
    {
      id: 'tech', n: 'Technologie', ico: '💡', ticker: 'TEC', start: 100,
      drift: 0.0038, vol: 0.041, min: 10,
      d: 'La meilleure performance sur dix ans, et six krachs au passage.'
    },
    {
      id: 'crypto', n: 'Cryptomonnaie', ico: '🪙', ticker: 'CRP', start: 100,
      drift: 0.0050, vol: 0.095, min: 3,
      d: 'Peut tripler en deux semaines. Peut aussi ne jamais revenir.'
    },
    {
      id: 'penny', n: 'Petite capitalisation', ico: '🎲', ticker: 'SML', start: 100,
      drift: 0.0032, vol: 0.075, min: 2,
      d: 'Illiquide, manipulable, invérifiable. Exactement pour ça qu’on en parle.'
    }
  ];
  D.ASSET = {};
  D.ASSETS.forEach(function (a) { D.ASSET[a.id] = a; });

  D.MARKET_FEE = 0.006;   // 0,6 % de frais à l'achat comme à la vente

  /* Régimes de marché — appliqués à tous les actifs */
  D.REGIMES = [
    { id: 'calme', n: 'Marché calme', ico: '😐', mult: 1, drift: 0, days: [4, 9] },
    { id: 'hausse', n: 'Marché haussier', ico: '🐂', mult: 0.9, drift: 0.004, days: [5, 12] },
    { id: 'baisse', n: 'Marché baissier', ico: '🐻', mult: 1.2, drift: -0.005, days: [4, 10] },
    { id: 'krach', n: 'Krach', ico: '💥', mult: 2.6, drift: -0.035, days: [2, 4] },
    { id: 'euphorie', n: 'Euphorie', ico: '🚀', mult: 1.6, drift: 0.013, days: [3, 6] }
  ];
  D.REGIME = {};
  D.REGIMES.forEach(function (r) { D.REGIME[r.id] = r; });

})(window.LifeRPG);
