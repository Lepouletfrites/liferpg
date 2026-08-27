/* =============================================================
   data.gangs.js — Organisations criminelles.

   Trois structures, trois façons d'entrer et trois plafonds.
   On y monte en faisant des missions ; on en sort difficilement.
   ============================================================= */
(function (NS) {
  'use strict';
  var D = NS.D;

  D.GANGS = [
    {
      id: 'corbeaux', n: 'Les Corbeaux', ico: '🐦‍⬛', color: '#8a93a8',
      territory: 'la gare et les cités nord',
      d: 'Une bande de quartier, pas une organisation. On y entre jeune, on y reste par habitude. ' +
        'Peu d’argent, peu de règles, beaucoup de bêtises.',
      rival: 'reseau',
      joinReq: { repRue: 25 },
      /* Spécialité : les coups de rue réussissent mieux */
      bonus: { cats: ['petty'], success: 8 },
      cut: 0.15,               // part prélevée par le gang sur vos coups
      ranks: [
        { n: 'Guetteur', missions: 0, pegre: 0, pay: 1, perk: 'Vous êtes toléré. C’est déjà quelque chose.' },
        { n: 'Porteur', missions: 3, pegre: 12, pay: 1.4, perk: 'Réputation de rue +1 par mission.' },
        { n: 'Homme de main', missions: 8, pegre: 25, pay: 1.9, perk: 'Les coups de petite délinquance gagnent +8 % de réussite.' },
        { n: 'Lieutenant', missions: 16, pegre: 40, pay: 2.6, perk: 'Un appui en cas de bagarre : moins de blessures graves.' },
        { n: 'Chef de bande', missions: 28, pegre: 55, pay: 3.4, perk: 'Le gang vous protège : une arrestation mineure sur trois est étouffée.' }
      ]
    },
    {
      id: 'reseau', n: 'Le Réseau Sud', ico: '🌐', color: '#d08a3c',
      territory: 'les points de deal du sud et l’axe autoroutier',
      d: 'Une structure qui fonctionne : horaires, comptabilité, sanctions. ' +
        'On y gagne bien tant qu’on livre, et on n’y discute pas les consignes.',
      rival: 'corbeaux',
      joinReq: { repPegre: 25, repRue: 30 },
      bonus: { cats: ['mid'], success: 9 },
      cut: 0.2,
      ranks: [
        { n: 'Livreur', missions: 0, pegre: 25, pay: 1, perk: 'Accès aux livraisons régulières.' },
        { n: 'Gérant de point', missions: 4, pegre: 35, pay: 1.5, perk: 'Le trafic rapporte davantage.' },
        { n: 'Superviseur', missions: 10, pegre: 48, pay: 2.2, perk: 'Les coups sérieux gagnent +9 % de réussite.' },
        { n: 'Responsable de secteur', missions: 20, pegre: 62, pay: 3, perk: 'Blanchiment interne : frais réduits de moitié.' },
        { n: 'Bras droit', missions: 34, pegre: 75, pay: 4, perk: 'Le Réseau efface la moitié de votre pression policière chaque semaine.' }
      ]
    },
    {
      id: 'orsini', n: 'La Famille Orsini', ico: '🦂', color: '#b6485a',
      territory: 'le port, les chantiers et deux mairies',
      d: 'On ne postule pas : on est présenté. Ici l’argent ne se compte plus en liasses ' +
        'mais en sociétés. La sortie n’est pas prévue au contrat.',
      rival: 'reseau',
      joinReq: { repPegre: 55, flag: 'grecOk' },
      bonus: { cats: ['big'], success: 10 },
      cut: 0.25,
      ranks: [
        { n: 'Associé', missions: 0, pegre: 55, pay: 1, perk: 'On vous confie de vraies sommes.' },
        { n: 'Homme de confiance', missions: 5, pegre: 65, pay: 1.6, perk: 'Un avocat est toujours joignable.' },
        { n: 'Capo', missions: 12, pegre: 75, pay: 2.4, perk: 'La grande criminalité gagne +10 % de réussite.' },
        { n: 'Conseiller', missions: 24, pegre: 85, pay: 3.4, perk: 'Vos entreprises blanchissent deux fois plus.' },
        { n: 'Parrain adjoint', missions: 40, pegre: 95, pay: 4.6, perk: 'Les peines de prison sont réduites de moitié.' }
      ]
    }
  ];
  D.GANG = {};
  D.GANGS.forEach(function (g) { D.GANG[g.id] = g; });

  /** « de » + nom de gang, contracté correctement : des Corbeaux, du Réseau… */
  D.gangDe = function (g) {
    var n = g.n;
    if (n.indexOf('Les ') === 0) return 'des ' + n.slice(4);
    if (n.indexOf('Le ') === 0) return 'du ' + n.slice(3);
    if (n.indexOf('La ') === 0) return 'de la ' + n.slice(3);
    return 'de ' + n;
  };

  /** « chez » + nom de gang */
  D.gangChez = function (g) { return 'chez ' + g.n.replace(/^(Les|Le|La) /, function (m) { return m.toLowerCase(); }); };

  /* ---------------------------------------------------------
     MISSIONS — gabarits composés à la volée.
     tier : rang minimum requis (0 = accessible dès l'entrée)
     --------------------------------------------------------- */
  D.GANG_MISSIONS = [
    {
      id: 'gm_guet', n: 'Faire le guet', ico: '👀', tier: 0,
      hours: 3, energy: 14, pay: 90, sentence: 8, hurt: 0.05,
      stat: 'discretion', base: 66,
      d: 'Rester immobile trois heures et prévenir si quelque chose bouge.',
      texts: [
        'Un carrefour, un téléphone, et l’ordre de ne pas bouger.',
        'Vous surveillez une entrée pendant que d’autres travaillent à l’intérieur.',
        'On vous pose sur un toit avec des jumelles et un numéro à appeler.'
      ]
    },
    {
      id: 'gm_livraison', n: 'Livrer un colis', ico: '📦', tier: 0,
      hours: 3, energy: 18, pay: 140, sentence: 18, hurt: 0.08,
      stat: 'discretion', base: 60,
      d: 'D’un point à un autre, sans ouvrir, sans traîner.',
      texts: [
        'Un sac de sport, une adresse, et deux heures de métro.',
        'Le colis tient dans une poche. C’est ce qui inquiète.',
        'On vous prête un scooter et on vous donne quarante minutes.'
      ]
    },
    {
      id: 'gm_collecte', n: 'Faire la collecte', ico: '💰', tier: 1,
      hours: 4, energy: 20, pay: 210, sentence: 22, hurt: 0.12,
      stat: 'charisme', base: 58,
      d: 'Passer sur les points, compter, rapporter. Tout doit tomber juste.',
      texts: [
        'Six points, six enveloppes, et une addition qui doit être exacte.',
        'On vous confie la tournée du soir. Personne ne vérifie derrière vous — au début.',
        'Vous ramassez ce que d’autres ont vendu, et vous n’avez pas le droit de vous tromper.'
      ]
    },
    {
      id: 'gm_intimidation', n: 'Faire passer un message', ico: '💢', tier: 1,
      hours: 3, energy: 26, pay: 260, sentence: 30, hurt: 0.25,
      stat: 'force', base: 55,
      d: 'Quelqu’un doit comprendre. On ne précise pas jusqu’où aller.',
      texts: [
        'Un commerçant qui a oublié de payer depuis trois semaines.',
        'Un type qui parle trop fort dans les mauvais endroits.',
        'Une porte à enfoncer, et un nom à répéter jusqu’à ce qu’il soit retenu.'
      ]
    },
    {
      id: 'gm_recup', n: 'Récupérer un véhicule', ico: '🚗', tier: 1,
      hours: 4, energy: 24, pay: 300, sentence: 32, hurt: 0.14,
      stat: 'discretion', base: 52,
      d: 'Une voiture attend quelque part. Elle doit se retrouver ailleurs avant l’aube.',
      texts: [
        'Les clés sont sous le passage de roue. Le propriétaire n’est pas au courant.',
        'Un parking souterrain, un niveau −3, et une caméra à éviter.',
        'Le véhicule doit arriver au garage avec les plaques déjà changées.'
      ]
    },
    {
      id: 'gm_punition', n: 'Régler un différend', ico: '🩸', tier: 2,
      hours: 4, energy: 34, pay: 620, sentence: 70, hurt: 0.4,
      stat: 'force', base: 48,
      d: 'Quelqu’un a franchi une ligne. On vous demande de rétablir l’ordre.',
      texts: [
        'Un homme qui a détourné de l’argent, et qui le sait.',
        'Un rival qui s’installe sur un territoire qui n’est pas le sien.',
        'Une dette qui traîne depuis trop longtemps pour être encore une dette.'
      ]
    },
    {
      id: 'gm_transport', n: 'Convoyer la marchandise', ico: '🚛', tier: 2,
      hours: 5, energy: 30, pay: 780, sentence: 60, hurt: 0.16,
      stat: 'intelligence', base: 52,
      d: 'Trois cents kilomètres avec un chargement qui n’existe sur aucun registre.',
      texts: [
        'Départ à quatre heures, deux relais, aucune pause imprévue.',
        'Le camion est en règle. Le double fond, moins.',
        'On vous donne un itinéraire précis et l’interdiction d’en changer.'
      ]
    },
    {
      id: 'gm_infiltration', n: 'Placer quelqu’un', ico: '🎭', tier: 3,
      hours: 5, energy: 24, pay: 1100, sentence: 55, hurt: 0.1,
      stat: 'charisme', base: 50,
      d: 'Faire embaucher un homme à vous dans une entreprise qui ne doit rien soupçonner.',
      texts: [
        'Un CV à monter, un entretien à préparer, un recruteur à convaincre.',
        'La société transporte des fonds. Il faut y avoir quelqu’un avant l’été.',
        'On vous demande d’ouvrir une porte de l’intérieur, dans six mois.'
      ]
    },
    {
      id: 'gm_braquage', n: 'Monter un coup', ico: '🎯', tier: 3,
      hours: 6, energy: 42, pay: 2400, sentence: 110, hurt: 0.35,
      stat: 'discretion', base: 44,
      d: 'Cette fois vous ne suivez pas : vous décidez. Et vous répondez du résultat.',
      texts: [
        'Trois hommes, un véhicule, quatre-vingt-dix secondes d’exposition.',
        'Le plan est bon. Il ne tient que si tout le monde tient.',
        'On vous confie l’équipe. Ce qui rate sera de votre faute.'
      ]
    },
    {
      id: 'gm_nettoyage', n: 'Faire disparaître un problème', ico: '🕳️', tier: 4,
      hours: 6, energy: 38, pay: 3800, sentence: 160, hurt: 0.3,
      stat: 'discretion', base: 46,
      d: 'On ne vous explique pas. On vous donne une adresse et une heure.',
      texts: [
        'Une camionnette, deux bâches, et l’ordre de ne poser aucune question.',
        'Un appartement à vider avant que quelqu’un ne s’inquiète.',
        'Ce qu’on vous demande ce soir ne se raconte pas, même entre vous.'
      ]
    }
  ];
  D.GANG_MISSION = {};
  D.GANG_MISSIONS.forEach(function (m) { D.GANG_MISSION[m.id] = m; });

})(window.LifeRPG);
