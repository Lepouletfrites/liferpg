/* =============================================================
   data.people.js — Personnages non joueurs.
   faction : rue | legal | pegre  (les factions se surveillent)
   decay   : points d'affinité perdus par jour sans contact
   lock    : conditions pour que le personnage vous adresse la parole
   ============================================================= */
(function (NS) {
  'use strict';
  var D = NS.D;

  D.FACTIONS = [
    { id: 'rue', n: 'La rue', ico: '🏙️', d: 'Ceux qui dorment dehors. Solidaires, et sans illusions.' },
    { id: 'legal', n: 'Le monde propre', ico: '⚖️', d: 'Institutions, commerce, argent déclaré. Ils lisent les casiers.' },
    { id: 'pegre', n: 'Le milieu', ico: '🕶️', d: 'On y entre par recommandation. On en sort rarement.' }
  ];

  D.NPCS = [

    /* ══════════════ LA RUE ══════════════ */

    {
      id: 'marcel', n: 'Marcel', ico: '🧔', role: 'Vétéran de la rue', faction: 'rue', decay: 0.5,
      d: 'Vingt ans dehors. Il sait où dormir, qui éviter, quand se taire.',
      topics: [
        'Marcel vous explique quels porches sont chauffés en février.',
        'Marcel vous raconte l’hiver 2012, celui où ils étaient onze et où ils sont restés sept.',
        'Marcel ne dit rien pendant vingt minutes, puis : « Toi, t’as pas encore compris que personne viendra. »'
      ],
      favors: [
        { id: 'tip', n: 'Demander un tuyau', aff: 25, cd: 3, d: '+15 énergie, +10 moral, un repas partagé', run: function (G) { G.add('energie', 15); G.add('moral', 10); G.add('faim', 20); return 'Marcel partage sa gamelle et vous indique un porche chauffé.'; } },
        { id: 'squat', n: 'Entrer dans le squat', aff: 40, once: true, d: 'Débloque le squat sans réputation de rue', run: function (G) { G.flag('squatOk', true); return 'Il glisse un mot au gardien du squat. La porte s’ouvrira.'; } },
        { id: 'spot', n: 'Obtenir son emplacement', aff: 55, once: true, d: 'La manche rapporte +25 % définitivement', run: function (G) { G.flag('begBoost', true); return 'Marcel vous cède son emplacement devant la boulangerie. C’est un héritage.'; } },
        { id: 'net', n: 'Le réseau des anciens', aff: 75, once: true, d: 'Réputation de rue +25 et sommeil dehors amélioré', run: function (G) { G.rep('rue', 25); G.flag('streetNet', true); return 'Il vous présente à six personnes en une soirée. Vous ne dormirez plus jamais vraiment seul.'; } }
      ],
      quest: {
        id: 'marcel_winter', aff: 35, days: 8, ico: '🧣',
        n: 'L’hiver de Marcel', d: 'Marcel tousse depuis six jours. Apportez-lui des médicaments et un duvet.',
        goal: 'Posséder 💊 Médicaments et 🛌 Duvet grand froid',
        check: function (G) { return G.has('medoc') && G.has('duvet'); },
        onDone: function (G) { G.take('medoc', 1); G.aff('marcel', 30); G.rep('rue', 12); G.add('moral', 15); return 'Il prend les médicaments sans un mot et vous rend le duvet. « Garde-le. Moi j’ai fait mon temps. »'; },
        onFail: function (G) { G.aff('marcel', -20); G.add('moral', -18); G.rep('rue', -6); return 'Marcel a été hospitalisé cette nuit. Vous aviez huit jours.'; }
      }
    },

    {
      id: 'lucien', n: 'Lucien', ico: '🎩', role: 'Ancien gérant de fonds', faction: 'rue', decay: 0.6,
      d: 'Il a géré quatre cents millions. Il dort aujourd’hui derrière la gare, et il lit encore la presse économique.',
      lock: {},
      topics: [
        'Lucien vous explique la différence entre un actif et une promesse. Cela prend une heure.',
        'Lucien dessine une courbe sur un carton. « Tout le monde achète ici. Il faut acheter là. »',
        'Lucien parle de sa fille au présent, puis se corrige.'
      ],
      favors: [
        { id: 'basics', n: 'Apprendre les bases', aff: 20, cd: 4, d: '+120 XP Intelligence', run: function (G) { G.xp('intelligence', 120); return 'Trois heures de cours magistral sur un banc. Vous notez sur un prospectus.'; } },
        { id: 'bankintro', n: 'Une lettre de recommandation', aff: 40, cd: 5, d: 'Score bancaire +25', run: function (G) { G.bankScore(25); return 'Il écrit une lettre à un ancien collègue. Votre dossier bancaire n’est plus vide.'; } },
        { id: 'reader', n: 'Apprendre à lire le marché', aff: 60, once: true, d: 'Les tendances de la bourse deviennent visibles', run: function (G) { G.flag('marketRead', true); return 'Il vous apprend à lire ce que les autres ne regardent pas. Vous verrez désormais la tendance de chaque actif.'; } },
        { id: 'seedadvice', n: 'Le conseil de trop', aff: 80, once: true, d: 'Rendements boursiers durablement améliorés', run: function (G) { G.flag('lucienEdge', true); return '« Ne me remerciez pas. Faites juste mieux que moi. » Vos arbitrages seront désormais plus fins.'; } }
      ]
    },

    {
      id: 'yasmine', n: 'Yasmine', ico: '🧕', role: 'Dix-sept ans, dehors depuis mars', faction: 'rue', decay: 0.8,
      d: 'Elle vous a pris pour un flic les trois premières fois. Maintenant elle vous garde une place.',
      topics: [
        'Yasmine vous montre les cinq caméras de la rue et l’angle qu’elles ne couvrent pas.',
        'Yasmine parle vite, de tout, sauf d’avant.',
        'Yasmine vous demande si vous croyez que ça finit un jour. Vous mentez un peu.'
      ],
      favors: [
        { id: 'eyes', n: 'Se faire des yeux', aff: 25, once: true, d: '+10 discrétion en repérage : les coups réussissent mieux', run: function (G) { G.flag('lookout', true); G.xp('discretion', 40); return 'Elle et ses amis vous préviendront des patrouilles. Vos coups gagnent en marge.'; } },
        { id: 'net', n: 'Le réseau des jeunes', aff: 45, cd: 6, d: 'Réputation de rue +18', run: function (G) { G.rep('rue', 18); return 'En une semaine, tout le quartier sait qui vous êtes. En bien.'; } },
        { id: 'save', n: 'La sortir de la rue', aff: 70, once: true, d: 'Coûte 2 000 € · moral +40 définitif', run: function (G) { if (G.money() < 2000) return null; G.cash(-2000, 'Caution pour Yasmine'); G.add('moral', 40); G.flag('yasmineSaved', true); G.rep('legale', 10); return 'Vous payez la caution d’un studio et six mois d’avance. Elle pleure, puis elle vous engueule, puis elle part.'; } }
      ],
      quest: {
        id: 'yasmine_papers', aff: 40, days: 12, ico: '🪪',
        n: 'Les papiers de Yasmine', d: 'Elle a besoin d’une adresse pour reconstituer son dossier. Trouvez-vous un logement avec adresse administrative.',
        goal: 'Habiter un logement avec adresse administrative',
        check: function (G) { return !!G.home().addr; },
        onDone: function (G) { G.aff('yasmine', 25); G.rep('legale', 8); G.aff('sofia', 10); return 'Vous la domiciliez chez vous. Trois semaines plus tard, elle a une carte d’identité et un contrat d’apprentissage.'; },
        onFail: function (G) { G.aff('yasmine', -25); G.add('moral', -12); return 'Elle a arrêté de demander. Elle ne vous regarde plus pareil.'; }
      }
    },

    {
      id: 'dimitri', n: 'Dimitri', ico: '🔩', role: 'Ferrailleur', faction: 'rue', decay: 0.4,
      d: 'Une cour, une balance faussée, et aucune curiosité pour l’origine de ce qu’on lui apporte.',
      topics: [
        'Dimitri vous montre comment repérer le cuivre sous la peinture.',
        'Dimitri ne demande jamais d’où vient ce que vous apportez. Vous finissez par ne plus demander non plus.'
      ],
      favors: [
        { id: 'scale', n: 'Négocier la balance', aff: 20, once: true, d: 'Le vol de métal rapporte +30 %', run: function (G) { G.flag('scrapBoost', true); return 'La balance penche enfin de votre côté. Officiellement, elle a été réétalonnée.'; } },
        { id: 'tools', n: 'Récupérer des outils', aff: 35, once: true, d: 'Reçoit une caisse à outils', run: function (G) { G.give('outils', 1); return 'Il sort une caisse d’un container. « Elle a servi. Elle servira encore. »'; } },
        { id: 'fence', n: 'Devenir son intermédiaire', aff: 55, once: true, d: 'Débloque le recel · réputation pègre +15', run: function (G) { G.rep('pegre', 15); G.flag('fenceOk', true); return 'Il vous présente à ceux qui achètent. Vous n’êtes plus seulement celui qui apporte.'; } }
      ]
    },

    /* ══════════════ LE MONDE PROPRE ══════════════ */

    {
      id: 'sofia', n: 'Sofia', ico: '👩‍⚕️', role: 'Bénévole associative', faction: 'legal', decay: 0.5,
      d: 'Elle connaît votre prénom. Cela fait longtemps que personne ne l’utilisait.',
      topics: [
        'Sofia vous demande si vous mangez, et n’accepte pas la première réponse.',
        'Sofia vous parle des démarches à faire, et vous les note sur un papier que vous perdrez.',
        'Sofia vous raconte une victoire : quelqu’un qui s’en est sorti l’an dernier.'
      ],
      favors: [
        { id: 'care', n: 'Demander des soins', aff: 20, cd: 3, d: 'Santé +35, gratuit', run: function (G) { G.add('sante', 35); return 'Elle nettoie vos plaies et vous force à finir un thé brûlant.'; } },
        { id: 'clothes', n: 'Demander des vêtements', aff: 35, once: true, d: 'Reçoit une tenue propre gratuitement', run: function (G) { G.give('propre', 1); return 'Le vestiaire solidaire vous équipe. Vous ne vous reconnaissez pas.'; } },
        { id: 'shelter', n: 'Obtenir une place au foyer', aff: 45, cd: 10, d: 'Foyer d’accueil gratuit pendant 10 nuits', run: function (G) { G.flag('freeShelter', 10); return 'Une place vous est réservée au foyer. Dix nuits sans payer.'; } },
        { id: 'papers', n: 'Refaire ses papiers', aff: 60, once: true, d: 'Réputation légale +20', run: function (G) { G.rep('legale', 20); G.flag('nopapers', false); return 'Elle vous accompagne à la préfecture. Vous existez de nouveau administrativement.'; } },
        { id: 'job', n: 'Une insertion professionnelle', aff: 78, once: true, d: 'Embauche directe comme agent d’entretien', run: function (G) { G.hire('cleaner', true); G.rep('legale', 10); return 'Un contrat aidé, six mois, renouvelable. Elle a bataillé trois semaines pour ça.'; } }
      ],
      quest: {
        id: 'sofia_clean', aff: 30, days: 10, ico: '🚿',
        n: 'Se tenir droit', d: 'Sofia veut vous présenter à un employeur. Elle exige que vous soyez présentable.',
        goal: 'Atteindre 60 % d’apparence',
        check: function (G) { return G.apparence() >= 60; },
        onDone: function (G) { G.aff('sofia', 25); G.rep('legale', 15); G.give('propre', 1); return 'Elle vous regarde de haut en bas, hoche la tête, et décroche son téléphone. Le rendez-vous est pris.'; },
        onFail: function (G) { G.aff('sofia', -18); return 'Elle a annulé le rendez-vous. « Je ne peux pas t’envoyer là-bas comme ça. Tu le sais. »'; }
      }
    },

    {
      id: 'duval', n: 'Brigadier Duval', ico: '👮', role: 'Police municipale', faction: 'legal', decay: 0.7,
      d: 'Il vous a déjà fait circuler trois fois. Il commence à vous saluer.',
      topics: [
        'Duval vous demande où vous dormez, et note la réponse sans commenter.',
        'Duval vous parle de son fils, qui a votre âge.',
        'Duval vous prévient : « Il y a une opération jeudi. Ne sois pas là. »'
      ],
      favors: [
        { id: 'warn', n: 'Se faire oublier', aff: 30, cd: 6, d: 'Pression policière −40', run: function (G) { G.heat(-40); return 'Il déchire un rapport devant vous. « La prochaine fois, je ne peux plus. »'; } },
        { id: 'ref', n: 'Obtenir une attestation', aff: 55, cd: 8, d: 'Réputation légale +25', run: function (G) { G.rep('legale', 25); return 'Une attestation de bonne conduite signée. Ça vaut de l’or dans un dossier.' } },
        { id: 'record', n: 'Faire effacer une mention', aff: 75, cd: 18, d: 'Casier judiciaire allégé de 2 points', run: function (G) { G.clearCasier(2); return 'Une procédure d’effacement anticipé, appuyée par un rapport favorable. Deux lignes disparaissent.'; } }
      ]
    },

    {
      id: 'renard', n: 'Mme Renard', ico: '👩‍🍳', role: 'Patronne du café', faction: 'legal', decay: 0.5,
      d: 'Elle vous sert un café quand la salle est vide. C’est une forme de respect.',
      topics: [
        'Mme Renard vous sert sans que vous ayez commandé, et refuse votre argent.',
        'Mme Renard se plaint des charges, de la mairie, et des jeunes. Puis vous ressert.',
        'Mme Renard vous demande de surveiller la salle pendant qu’elle descend en cave.'
      ],
      favors: [
        { id: 'meal', n: 'Demander un repas', aff: 20, cd: 2, d: 'Faim +45, moral +8', run: function (G) { G.add('faim', 45); G.add('moral', 8); return 'Plat du jour, sur le coin du comptoir, sans facture.'; } },
        { id: 'hire', n: 'Demander une embauche', aff: 50, once: true, d: 'Embauche directe comme serveur·euse', run: function (G) { G.hire('waiter', true); return 'Elle vous tend un tablier. « Tu commences demain. Sois propre. »'; } },
        { id: 'loan', n: 'Emprunter sans intérêt', aff: 70, once: true, d: 'Reçoit 4 000 € à rendre sous 30 jours, sans intérêt', run: function (G) { G.cash(4000, 'Prêt de Mme Renard'); G.flag('renardDebt', 4000); G.flag('renardDue', G.day() + 30); return 'Elle ouvre la caisse et compte quatre mille euros. « Je ne demande pas ce que tu en fais. Je demande qu’ils reviennent. »'; } }
      ]
    },

    {
      id: 'clara', n: 'Clara Behn', ico: '🏦', role: 'Conseillère bancaire', faction: 'legal', decay: 0.6,
      d: 'Elle décide chaque jour qui mérite un crédit. Elle vous a d’abord dit non.',
      topics: [
        'Clara vous explique ce qu’un banquier regarde vraiment sur un relevé.',
        'Clara referme un dossier d’un coup sec. « Celui-là, je ne pouvais rien faire. Le vôtre, si. »'
      ],
      lock: { repLeg: 12 },
      favors: [
        { id: 'open', n: 'Faire ouvrir un compte', aff: 15, once: true, d: 'Ouvre un compte bancaire sans condition', run: function (G) { G.openBank(true); return 'Elle remplit le dossier elle-même et signe à votre place aux endroits sans importance.'; } },
        { id: 'score', n: 'Faire relever votre note', aff: 40, cd: 10, d: 'Score bancaire +30', run: function (G) { G.bankScore(30); return 'Elle reclasse votre dossier en catégorie « revenus irréguliers mais fiables ». C’est un monde de différence.'; } },
        { id: 'rate', n: 'Négocier le taux', aff: 60, once: true, d: 'Taux des crédits réduit de moitié, définitivement', run: function (G) { G.flag('goodRate', true); return 'Votre prochain crédit sera au taux réservé aux gens qui n’en ont pas besoin.'; } },
        { id: 'blind', n: 'Un virement sans traçabilité', aff: 85, cd: 7, d: 'Blanchit 20 000 € d’argent sale immédiatement', run: function (G) { var d = Math.min(20000, G.dirtyVal()); if (d < 500) return null; G.launderRaw(d, 0.05); return 'Elle regarde ailleurs pendant trois minutes. ' + G.eur(Math.round(d * 0.95)) + ' arrivent sur votre compte, propres.'; } }
      ]
    },

    {
      id: 'bell', n: 'Maître Bellanger', ico: '⚖️', role: 'Avocate pénaliste', faction: 'legal', decay: 0.4,
      d: 'Elle ne demande jamais si vous l’avez fait. Elle demande ce qu’on peut prouver.',
      topics: [
        'Maître Bellanger vous explique la différence entre coupable et condamné.',
        'Elle relit un dossier en fumant à la fenêtre. Elle dit qu’elle en a vu de pires, sans préciser lesquels.'
      ],
      lock: { money: 300 },
      favors: [
        { id: 'retain', n: 'La mettre sur dossier', aff: 20, once: true, d: '1 500 € · les peines de prison sont réduites de 40 %', run: function (G) { if (G.money() < 1500) return null; G.cash(-1500, 'Provision sur honoraires'); G.flag('lawyer', true); return 'Elle encaisse la provision et vous tend une carte. « À partir de maintenant, vous ne dites plus un mot sans moi. »'; } },
        { id: 'appeal', n: 'Faire annuler une condamnation', aff: 50, cd: 20, d: '5 000 € · casier allégé de 3 points', run: function (G) { if (G.money() < 5000) return null; G.cash(-5000, 'Honoraires'); G.clearCasier(3); return 'Vice de procédure sur trois dossiers. Ce n’est pas de la justice, c’est du droit.'; } },
        { id: 'shield', n: 'Blindage juridique complet', aff: 75, once: true, d: '20 000 € · une arrestation sur deux ne débouche sur rien', run: function (G) { if (G.money() < 20000) return null; G.cash(-20000, 'Convention d’honoraires'); G.flag('shield', true); return 'Un cabinet entier travaille désormais sur votre exposition pénale. Vous devenez difficile à condamner.'; } }
      ]
    },

    {
      id: 'paulette', n: 'Paulette', ico: '🔑', role: 'Bailleuse', faction: 'legal', decay: 0.5,
      d: 'Six immeubles, aucun intermédiaire, et un jugement instantané sur les gens.',
      topics: [
        'Paulette vous raconte l’immeuble qu’elle a racheté en 1994, « pour une bouchée de pain, et un genou en moins ».',
        'Elle vous jauge de haut en bas et dit ce qu’elle pense sans qu’on lui ait rien demandé.'
      ],
      lock: { repLeg: 18 },
      favors: [
        { id: 'nodeposit', n: 'Louer sans caution', aff: 30, once: true, d: 'Toutes les cautions de logement sont annulées', run: function (G) { G.flag('noDeposit', true); return '« Je te fais confiance. Ne m’oblige pas à regretter. » Plus aucune caution à avancer.'; } },
        { id: 'cheap', n: 'Obtenir un loyer d’ami', aff: 55, once: true, d: 'Loyers réduits de 30 % définitivement', run: function (G) { G.flag('rentCut', true); return 'Elle rature le bail et réécrit le montant à la main.'; } },
        { id: 'sell', n: 'Racheter un immeuble', aff: 80, once: true, d: '80 000 € · société immobilière offerte au niveau 3', run: function (G) { if (G.money() < 80000) return null; G.cash(-80000, 'Achat d’immeuble'); G.grantBiz('realestate', 3); return 'Elle vous vend le petit immeuble de la rue Basse, bien en dessous du marché. « Occupe-toi des locataires. »'; } }
      ]
    },

    {
      id: 'vidal', n: 'Alex Vidal', ico: '🕴️', role: 'Investisseur', faction: 'legal', decay: 0.7,
      d: 'Il repère les gens avant qu’ils ne deviennent quelqu’un. Il vous observe.',
      topics: [
        'Vidal vous parle de son premier échec comme d’une master class gratuite.',
        'Il regarde son téléphone pendant que vous parlez, puis répète votre dernière phrase mot pour mot.'
      ],
      lock: { repLeg: 30 },
      favors: [
        { id: 'seed', n: 'Lever des fonds', aff: 45, cd: 12, d: 'Reçoit 15 000 € de capital', run: function (G) { G.cash(15000, 'Levée de fonds'); G.rep('legale', 5); return 'Il signe un chèque sans cligner. « Ne me décevez pas. »'; } },
        { id: 'net', n: 'Entrer dans son réseau', aff: 65, once: true, d: 'Revenus d’entreprise +30 % définitivement', run: function (G) { G.flag('network', true); return 'Trois dîners, six cartes de visite. Vos affaires changent d’échelle.'; } },
        { id: 'seriesa', n: 'Tour de table majeur', aff: 85, once: true, d: 'Reçoit 150 000 € · réputation légale +15', run: function (G) { G.cash(150000, 'Tour de table'); G.rep('legale', 15); return 'Quatre investisseurs, une salle de réunion, quarante minutes. Cent cinquante mille.'; } }
      ],
      quest: {
        id: 'vidal_proof', aff: 45, days: 20, ico: '📈',
        n: 'Faire ses preuves', d: 'Vidal veut voir si vous savez faire croître quelque chose. Portez une entreprise au niveau 4.',
        goal: 'Posséder une entreprise de niveau 4 ou plus',
        check: function (G) { return G.maxBizLvl() >= 4; },
        onDone: function (G) { G.aff('vidal', 25); G.cash(25000, 'Prime de confiance'); G.rep('legale', 10); return 'Il regarde vos chiffres pendant trois minutes. Puis il vire vingt-cinq mille sans commentaire.'; },
        onFail: function (G) { G.aff('vidal', -25); return 'Il ne répond plus. Dans son monde, ne pas répondre est une réponse.'; }
      }
    },

    /* ══════════════ LE MILIEU ══════════════ */

    {
      id: 'karim', n: 'Karim', ico: '🧢', role: 'Contact du quartier', faction: 'pegre', decay: 0.6,
      d: 'Il propose toujours quelque chose. Ce n’est jamais gratuit.',
      topics: [
        'Karim vous propose « un truc simple », puis change de sujet quand vous demandez lequel.',
        'Karim vous explique qui tient quelle rue, et depuis quand.',
        'Karim compte des billets en vous parlant. Il ne se trompe jamais.'
      ],
      favors: [
        { id: 'job', n: 'Accepter une course', aff: 20, cd: 1, d: '150–400 € · pression policière +25', risky: true, run: function (G) { var g = G.rnd(150, 400); G.dirtyCash(g, 'Course pour Karim'); G.heat(25); G.rep('rue', 8); G.rep('pegre', 6); G.rep('legale', -6); return 'Un colis d’un point A à un point B. Vous ne demandez pas ce qu’il y a dedans. ' + G.eur(g) + ' d’argent sale.'; } },
        { id: 'stock', n: 'Obtenir du stock à crédit', aff: 35, cd: 10, d: 'Reçoit 2 lots de marchandise à écouler', run: function (G) { G.give('came', 2); G.flag('karimStock', G.day() + 10); return 'Deux lots, à écouler en dix jours. « Après, c’est plus moi qui viens te voir. »'; } },
        { id: 'clean', n: 'Faire nettoyer son dossier', aff: 45, cd: 6, d: 'Pression policière remise à 0 · 300 €', run: function (G) { if (G.money() < 300) return null; G.cash(-300, 'Arrangement'); G.setHeat(0); return 'Un dossier disparaît. On ne vous explique pas comment.'; } },
        { id: 'cash', n: 'Emprunter du capital', aff: 60, once: true, d: 'Reçoit 3 000 € · 4 500 € à rendre sous 12 jours', run: function (G) { G.cash(3000, 'Prêt de Karim'); G.flag('debt', 4500); return 'Trois mille en liquide. « Tu me rends quatre mille cinq. Pas de retard. »'; } },
        { id: 'intro', n: 'Être présenté au Grec', aff: 75, once: true, d: 'Débloque le parrain · réputation pègre +20', run: function (G) { G.rep('pegre', 20); G.flag('grecOk', true); G.aff('legrec', 10); return 'Il passe un appel de trente secondes. « Il te reçoit jeudi. Sois à l’heure et ne parle pas le premier. »'; } }
      ]
    },

    {
      id: 'bruno', n: 'Bruno', ico: '🦍', role: 'Homme de main', faction: 'pegre', decay: 0.5,
      d: 'Cent dix kilos, très peu de mots, et une fidélité qui ne s’achète pas — elle se mérite.',
      topics: [
        'Bruno vous montre une cicatrice sans raconter l’histoire qui va avec.',
        'Il compte les répétitions à voix basse. Vous n’avez jamais fait autant de tractions de votre vie.'
      ],
      lock: { repPegre: 15 },
      favors: [
        { id: 'spar', n: 'S’entraîner avec lui', aff: 20, cd: 4, d: '+150 XP Force', run: function (G) { G.xp('force', 150); G.add('sante', -6); return 'Deux heures dans une cave. Vous ne gagnez pas une seule fois. Vous progressez énormément.'; } },
        { id: 'gun', n: 'Obtenir une arme', aff: 45, once: true, d: 'Reçoit une arme de poing', run: function (G) { G.give('arme', 1); return 'Il la pose sur la table, chargeur retiré. « Si tu la sors, c’est que t’as déjà perdu. »'; } },
        { id: 'crew', n: 'L’avoir sur les coups', aff: 55, d: 'Améliore durablement les braquages', once: true, run: function (G) { G.flag('crewBruno', true); return 'Il sera là. C’est tout ce qu’il dit, et c’est suffisant.'; } },
        { id: 'debt', n: 'Faire annuler une dette', aff: 70, once: true, d: 'Efface toutes vos dettes de rue', run: function (G) { G.clearStreetDebt(); return 'Il rend visite à deux personnes. Le lendemain, plus personne ne vous réclame rien.'; } }
      ]
    },

    {
      id: 'nadia', n: 'Nadia', ico: '🧤', role: 'Monte-en-l’air', faction: 'pegre', decay: 0.6,
      d: 'Elle entre partout et ne laisse rien. Elle facture en conséquence.',
      topics: [
        'Nadia démonte une serrure sur la table de la cuisine, juste pour le plaisir de la remonter plus vite.',
        'Elle vous dit que la meilleure cambrioleuse n’est jamais celle qu’on remarque. Vous comprenez qu’elle parle d’elle.'
      ],
      lock: { repPegre: 20 },
      favors: [
        { id: 'lesson', n: 'Prendre une leçon', aff: 20, cd: 4, d: '+160 XP Discrétion', run: function (G) { G.xp('discretion', 160); return 'Elle vous fait crocheter la même serrure quarante fois. À la quarantième, vous mettez huit secondes.'; } },
        { id: 'kit', n: 'Obtenir son matériel', aff: 40, once: true, d: 'Reçoit crochets, gants et brouilleur', run: function (G) { G.give('crochets', 1); G.give('gants', 1); G.give('brouilleur', 1); return 'Un sac de sport entier. « C’est du vieux. Mais du vieux qui marche. »'; } },
        { id: 'crew', n: 'L’avoir sur les coups', aff: 55, d: 'Améliore durablement les cambriolages', once: true, run: function (G) { G.flag('crewNadia', true); return 'Elle accepte à une condition : elle choisit les cibles. Vous acceptez.'; } },
        { id: 'ghost', n: 'Apprendre à disparaître', aff: 80, once: true, d: 'La pression policière retombe deux fois plus vite', run: function (G) { G.flag('ghost', true); return 'Habitudes, itinéraires, téléphones, visage. Elle vous apprend à ne plus laisser de forme.'; } }
      ]
    },

    {
      id: 'legrec', n: 'Le Grec', ico: '🐺', role: 'Il ne porte pas de titre', faction: 'pegre', decay: 0.3,
      d: 'Il ne hausse jamais la voix. On lui obéit avant qu’il ne demande.',
      topics: [
        'Le Grec ne parle jamais de lui. Il parle des autres, et vous apprenez beaucoup sur vous en l’écoutant.',
        'Il vous sert un café qu’il ne sert à personne d’autre. Vous comprenez que c’est un message.'
      ],
      lock: { flag: 'grecOk' },
      favors: [
        { id: 'blessing', n: 'Obtenir sa bénédiction', aff: 30, once: true, d: 'Réputation pègre +30 · tous les coups réussissent mieux', run: function (G) { G.rep('pegre', 30); G.flag('blessed', true); return 'Il pose la main sur votre épaule devant six personnes. C’est une signature.'; } },
        { id: 'territory', n: 'Obtenir un territoire', aff: 55, once: true, d: 'Offre le réseau de distribution (niveau 2)', run: function (G) { G.grantBiz('cartel', 2); return 'Trois rues, quinze points, quarante guetteurs. « Ne me fais pas regretter ce jeudi. »'; } },
        { id: 'immunity', n: 'La protection totale', aff: 85, once: true, d: 'Les arrestations mineures n’ont plus lieu', run: function (G) { G.flag('protected', true); return 'Il ne dit rien. Trois semaines plus tard, un commissaire est muté. Vous comprenez seul.'; } }
      ],
      quest: {
        id: 'grec_test', aff: 40, days: 15, ico: '🐺',
        n: 'La mise à l’épreuve', d: 'Le Grec veut voir de quoi vous êtes capable. Rapportez 20 000 € d’argent sale.',
        goal: 'Accumuler 20 000 € d’argent sale',
        check: function (G) { return G.dirtyVal() >= 20000; },
        onDone: function (G) { G.aff('legrec', 30); G.rep('pegre', 20); return 'Il fait compter la somme devant vous, puis vous la rend entièrement. « Ce n’était pas l’argent que je voulais voir. »'; },
        onFail: function (G) { G.aff('legrec', -35); G.rep('pegre', -15); return 'Personne ne vous dit rien. C’est précisément le problème.'; }
      }
    },

    {
      id: 'salome', n: 'Salomé', ico: '🩹', role: 'Infirmière de rue', faction: 'rue', decay: 0.5,
      d: 'Elle fait sa tournée avec un sac à dos et aucune autorisation officielle. Ce qu’elle sait faire, elle le fait, un point c’est tout.',
      topics: [
        'Salomé recoud une plaie sous un lampadaire, à la lumière du téléphone.',
        'Elle vous demande depuis quand vous n’avez pas vu un vrai médecin. Vous ne répondez pas tout de suite.',
        'Elle parle des overdoses de l’hiver dernier avec une colère froide, jamais tout à fait éteinte.'
      ],
      favors: [
        { id: 'patch', n: 'Faire soigner une plaie', aff: 15, cd: 3, d: 'Santé +25, gratuit', run: function (G) { G.add('sante', 25); return 'Elle nettoie, désinfecte, recoud si besoin. « Reviens si ça chauffe. »'; } },
        { id: 'kit', n: 'Recevoir une trousse', aff: 30, cd: 8, d: 'Reçoit 2 médicaments', run: function (G) { G.give('medoc', 2); return 'Elle sort deux boîtes d’un sac qui semble ne jamais se vider.'; } },
        { id: 'clean', n: 'Se faire aider à décrocher', aff: 50, once: true, d: 'Réduit durablement la dépendance', run: function (G) { if (!G.flags('addict')) return null; G.flag('addict', Math.max(0, G.flags('addict') - 2)); G.flag('salomeSupport', true); return 'Elle vous inscrit à un suivi qu’elle finance elle-même en partie. « On y va doucement. Mais on y va. »'; } },
        { id: 'network', n: 'Le réseau des soignants', aff: 70, once: true, d: 'Réputation de rue +20 · soins gratuits mieux accueillis', run: function (G) { G.rep('rue', 20); G.flag('careNet', true); return 'Elle vous présente à deux collègues bénévoles. Vous ne serez plus jamais complètement seul face à une blessure.'; } }
      ]
    },

    {
      id: 'momo', n: 'Momo', ico: '🎒', role: 'Quatorze ans, coursier improvisé', faction: 'rue', decay: 0.7,
      d: 'Il connaît toutes les issues de secours et aucune des tables de multiplication. Personne ne s’occupe vraiment de lui.',
      topics: [
        'Momo vous montre un raccourci que même les livreurs ne connaissent pas.',
        'Il vous demande si vous êtes déjà allé au collège. Il pose la question comme s’il parlait d’un autre pays.',
        'Il compte l’argent qu’il vous doit deux fois, pour être sûr, puis vous le rend en entier.'
      ],
      favors: [
        { id: 'errand', n: 'Lui confier une course', aff: 15, cd: 2, d: '+10–25 €, il connaît du monde', run: function (G) { var g = G.rnd(10, 25); G.cash(g, 'Course de Momo'); return 'Il revient essoufflé, avec ' + G.eur(g) + ' négociés on ne sait comment.'; } },
        { id: 'eyes', n: 'Ses yeux dans la rue', aff: 35, once: true, d: '+10 discrétion en repérage : les coups réussissent mieux', run: function (G) { G.flag('lookout', true); G.xp('discretion', 30); return 'Il vous montre où se planquent les vigiles à chaque heure de la journée. C’est un métier qu’il n’a pas choisi.'; } },
        { id: 'school', n: 'L’aider à retourner à l’école', aff: 55, once: true, d: 'Coûte 600 € · moral +20 définitif', run: function (G) { if (G.money() < 600) return null; G.cash(-600, 'Inscription de Momo'); G.add('moral', 20); G.rep('legale', 8); G.flag('momoSaved', true); return 'Vous payez les fournitures et convainquez une assistante sociale de rouvrir le dossier. Il ne dit rien, mais il revient vous voir avec un cahier tout neuf.'; } }
      ],
      quest: {
        id: 'momo_papers', aff: 30, days: 10, ico: '🎒',
        n: 'Le dossier de Momo', d: 'Pour l’inscrire quelque part, il faut une adresse. La vôtre suffira, s’il en existe une.',
        goal: 'Habiter un logement avec adresse administrative',
        check: function (G) { return !!G.home().addr; },
        onDone: function (G) { G.aff('momo', 20); G.rep('legale', 6); G.add('moral', 10); return 'Le dossier passe. Momo dort mal la nuit qui précède son premier jour, et vous aussi, un peu.'; },
        onFail: function (G) { G.aff('momo', -20); return 'Il a cessé de poser la question. Il a treize ans de trop pour encore espérer que quelqu’un s’en charge.'; }
      }
    },

    {
      id: 'isaure', n: 'Isaure', ico: '🎙️', role: 'Journaliste indépendante', faction: 'legal', decay: 0.6,
      d: 'Elle enquête sur ceux que la ville préfère ne pas voir. Elle vous a d’abord pris pour un sujet, puis pour quelqu’un.',
      lock: { repLeg: 8 },
      topics: [
        'Isaure vous montre ses notes : trois cahiers remplis de gens que personne d’autre n’a interrogés.',
        'Elle vous demande la permission avant chaque question un peu personnelle. Vous n’y êtes pas habitué.',
        'Elle râle contre son rédacteur en chef, qui préfère les faits divers aux enquêtes de fond.'
      ],
      favors: [
        { id: 'interview', n: 'Témoigner pour son reportage', aff: 20, cd: 6, d: 'Réputation légale +10', run: function (G) { G.rep('legale', 10); G.add('moral', 4); return 'Votre témoignage, anonymisé, ouvre son article. Des lecteurs qui ne vous ont jamais croisé se sentent un peu concernés.'; } },
        { id: 'expose', n: 'Publier votre histoire', aff: 45, once: true, d: 'Réputation légale +25 · 1 500 € de dons reçus', run: function (G) { G.rep('legale', 25); G.cash(1500, 'Cagnotte de soutien'); G.add('moral', 15); return 'L’article sort en une du site. Une cagnotte se monte sans que vous l’ayez demandée. ' + G.eur(1500) + ' tombent en trois jours.'; } },
        { id: 'protect', n: 'Faire taire une rumeur', aff: 65, once: true, d: 'Pression policière −25 · réputation légale +10', run: function (G) { G.heat(-25); G.rep('legale', 10); return 'Un article qui vous aurait fait du tort ne sortira jamais. Elle ne vous dit pas ce qu’il lui en a coûté d’y renoncer.'; } }
      ]
    },

    {
      id: 'farid', n: 'Farid', ico: '🔧', role: 'Fournisseur discret', faction: 'pegre', decay: 0.5,
      d: 'Armes, outils, matériel qu’on ne trouve pas en magasin. Il ne pose jamais de questions, et il n’oublie jamais un prix.',
      lock: { repPegre: 20 },
      topics: [
        'Farid déballe une caisse sur la table, articles rangés comme un catalogue.',
        'Il vous explique pourquoi tel matériel coûte plus cher que tel autre, avec une précision presque pédagogique.',
        'Il refuse de vendre à quelqu’un qu’il ne sent pas. « Un mauvais client coûte plus cher qu’un bon prix. »'
      ],
      favors: [
        { id: 'deal', n: 'Négocier un tarif', aff: 20, cd: 7, d: 'Reçoit des gants gratuitement', run: function (G) { if (G.has('gants')) return null; G.give('gants', 1); return '« Cadeau de bienvenue. La suite, elle, se paiera. »'; } },
        { id: 'gear', n: 'Le kit complet', aff: 45, once: true, d: 'Reçoit crochets et brouilleur d’alarme', run: function (G) { G.give('crochets', 1); G.give('brouilleur', 1); return 'Il pose deux mallettes sur le comptoir. « Du matériel sérieux, pour du travail sérieux. »'; } },
        { id: 'contact', n: 'Présentation à un armurier', aff: 65, once: true, d: 'Débloque l’achat d’armes sans réputation minimale', run: function (G) { G.flag('faridArmes', true); return 'Un appel, une adresse griffonnée sur un ticket de caisse. « Dis que c’est moi qui envoie. »'; } }
      ]
    },

    {
      id: 'ines', n: 'Inès', ico: '💸', role: 'Blanchisseuse indépendante', faction: 'pegre', decay: 0.5,
      d: 'Elle fait circuler l’argent sale à travers trois pays avant qu’il ne ressorte propre. Plus cher que la banque, plus discrète aussi.',
      lock: { repPegre: 25 },
      topics: [
        'Inès vous explique le trajet d’un billet, de la rue à un compte à l’étranger, en moins de deux minutes.',
        'Elle ne travaille jamais avec plus de trois clients à la fois. « Au-delà, on devient un dossier. »',
        'Elle compte tout de tête, sans jamais se tromper, et sans jamais sortir de calculatrice.'
      ],
      favors: [
        { id: 'wash', n: 'Blanchir un lot', aff: 25, cd: 5, d: 'Blanchit jusqu’à 12 000 € à 12 % de frais (6 % avec le compte fantôme)', run: function (G) { var d = Math.min(12000, G.dirtyVal()); if (d < 300) return null; var fee = G.flags('inesRate') ? 0.06 : 0.12; var net = G.launderRaw(d, fee); return G.eur(net) + ' arrivent propres, moins vite que chez un banquier, mais sans aucune question.'; } },
        { id: 'stash', n: 'Agrandir votre planque', aff: 50, once: true, d: 'Capacité de planque +6 000 € définitivement', run: function (G) { G.flag('stashBonus', (G.flags('stashBonus') || 0) + 6000); return 'Elle vous montre comment doubler un mur creux. « Personne ne cherche là où il n’y a rien à voir. »'; } },
        { id: 'ghostmoney', n: 'Compte fantôme à l’étranger', aff: 75, once: true, d: 'Blanchiment permanent à frais réduits de moitié', run: function (G) { G.flag('inesRate', true); return 'Un compte qui n’existe sur aucun registre français. Désormais, ce qu’elle blanchit pour vous coûte deux fois moins cher.'; } }
      ]
    }
  ];

  D.NPC = {};
  D.NPCS.forEach(function (n) { D.NPC[n.id] = n; });

  /* Cadeaux disponibles dans la fiche d'un personnage */
  D.GIFTS = [
    { amount: 20, l: 'Offrir 20 €' },
    { amount: 100, l: 'Offrir 100 €' },
    { amount: 500, l: 'Offrir 500 €' },
    { amount: 2500, l: 'Offrir 2 500 €' }
  ];

})(window.LifeRPG);
