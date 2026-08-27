/* =============================================================
   data.crime.js — Le Milieu : coups, trafic, recel, blanchiment.
   cat      : petty | mid | big | cover
   sentence : jours de prison encourus en cas de condamnation
   crew     : PNJ dont l'affinité ≥ 40 améliore le coup
   ============================================================= */
(function (NS) {
  'use strict';
  var D = NS.D;

  D.CRIMES = [

    /* ─────────────── PETITE DÉLINQUANCE ─────────────── */

    {
      id: 'steal', ico: '🥷', n: 'Voler à l’étalage', cat: 'petty', when: 'day',
      d: 'Rapide, sans matériel. Le vigile est le seul obstacle.',
      hours: 1, energy: 8, sentence: 3, req: {},
      run: function (G) {
        var ok = G.crimeRoll(42, { discretion: 4, charisme: 1.5, rue: 0.2 });
        if (ok.win) {
          var g = G.rnd(12, 34) + G.lvl('discretion') * 5;
          G.cash(g, 'Vol'); G.rep('rue', 3); G.rep('legale', -2); G.heat(ok.heat);
          G.xp('discretion', 7); G.add('moral', -2); G.hist('crime');
          if (G.chance(25)) G.give('sandwich', 2);
          return { t: 'money', m: 'Personne n’a rien vu. <b>' + G.eur(g) + '</b> de marchandise revendue.' };
        }
        G.heat(20); G.rep('legale', -4); G.add('moral', -10);
        G.arrestCheck('vol à l’étalage', 3);
        return { t: 'bad', m: 'Le vigile vous attrape par le col. Ça se termine mal.' };
      }
    },

    {
      id: 'pickpocket', ico: '🪙', n: 'Faire les poches', cat: 'petty', when: 'any',
      d: 'La foule du métro fait le travail. Encore faut-il des doigts.',
      hours: 2, energy: 12, sentence: 6, req: { repRue: 15 },
      run: function (G) {
        var ok = G.crimeRoll(32, { discretion: 5.5, charisme: 2, rue: 0.3 });
        if (ok.win) {
          var g = G.rnd(30, 95) + G.lvl('discretion') * 9;
          G.cash(g, 'Vol à la tire'); G.rep('rue', 5); G.rep('legale', -3); G.heat(ok.heat);
          G.xp('discretion', 10); G.xp('charisme', 4); G.hist('crime');
          if (G.chance(18)) { G.give('smartphone', 1); return { t: 'money', m: '<b>' + G.eur(g) + '</b> en liquide, et un smartphone au fond de la poche.' }; }
          return { t: 'money', m: 'Trois secondes de contact. <b>' + G.eur(g) + '</b>.' };
        }
        G.heat(28); G.rep('legale', -6); G.add('sante', -10); G.add('moral', -12);
        G.arrestCheck('vol à la tire', 6);
        return { t: 'bad', m: 'La main se referme sur votre poignet. On crie. On frappe.' };
      }
    },

    {
      id: 'ticket', ico: '🎫', n: 'Trafic de titres de transport', cat: 'petty', when: 'day',
      d: 'Racheter, recoller, revendre à l’entrée du métro. Peu rentable, presque sans risque.',
      hours: 2, energy: 10, sentence: 2, req: {},
      run: function (G) {
        var ok = G.crimeRoll(66, { charisme: 3, discretion: 2 });
        if (ok.win) {
          var g = G.rnd(14, 28) + G.lvl('charisme') * 3;
          G.cash(g, 'Revente de titres'); G.heat(ok.heat * 0.5); G.rep('rue', 1);
          G.xp('charisme', 5); G.hist('crime');
          return { t: 'money', m: 'Deux heures à l’entrée du métro. <b>' + G.eur(g) + '</b>.' };
        }
        G.heat(8); G.cash(-Math.min(G.money(), 50), 'Amende');
        return { t: 'bad', m: 'Contrôle. Amende immédiate et confiscation du stock.' };
      }
    },

    {
      id: 'bikesteal', ico: '🚲', n: 'Voler un vélo', cat: 'petty', when: 'night',
      d: 'Une pince, trente secondes, un antivol de mauvaise qualité.',
      hours: 2, energy: 14, sentence: 5, req: { repRue: 10 },
      run: function (G) {
        var ok = G.crimeRoll(48, { discretion: 5, force: 2, rue: 0.2 });
        if (ok.win) {
          G.xp('discretion', 8); G.rep('rue', 2); G.heat(ok.heat); G.hist('crime');
          if (!G.has('velo') && G.chance(35)) { G.give('velo', 1); return { t: 'good', m: 'Un vélo en bon état, à vous. Vous ne prendrez plus le bus.' }; }
          var g = G.rnd(45, 120);
          G.dirtyCash(g, 'Revente de vélo');
          return { t: 'money', m: 'Revendu au receleur dans l’heure : <b>' + G.eur(g) + '</b> d’argent sale.' };
        }
        G.heat(18); G.add('sante', -6);
        G.arrestCheck('vol de vélo', 5);
        return { t: 'bad', m: 'Le propriétaire dormait dans la voiture d’à côté. Il ne dort plus.' };
      }
    },

    {
      id: 'copper', ico: '🔌', n: 'Voler du métal', cat: 'petty', when: 'night',
      d: 'Cuivre de chantier, plaques d’égout, câbles. Lourd, sale, payé au poids.',
      hours: 3, energy: 30, sentence: 8, req: { force: 3 },
      run: function (G) {
        var ok = G.crimeRoll(55, { force: 4, discretion: 3 });
        if (ok.win) {
          var g = G.rnd(70, 140) + G.lvl('force') * 8;
          G.dirtyCash(g, 'Ferraille'); G.heat(ok.heat); G.xp('force', 12); G.add('hygiene', -18); G.hist('crime');
          return { t: 'money', m: 'Deux cents kilos au poids. <b>' + G.eur(g) + '</b>, en liquide, sans facture.' };
        }
        G.heat(22); G.add('sante', -14);
        G.arrestCheck('vol sur chantier', 8);
        return { t: 'bad', m: 'Une alarme de chantier, un projecteur, des chiens. Vous partez sans rien et avec une entaille.' };
      }
    },

    {
      id: 'parcels', ico: '📦', n: 'Voler des colis', cat: 'petty', when: 'day',
      d: 'Les livreurs déposent devant les portes. Il suffit d’arriver avant le destinataire.',
      hours: 2, energy: 12, sentence: 4, req: {},
      run: function (G) {
        var ok = G.crimeRoll(52, { discretion: 4.5, rue: 0.15, gear: { velo: 5, sac: 4 } });
        if (ok.win) {
          var n = G.rnd(1, 3), g = 0;
          for (var i = 0; i < n; i++) g += G.rnd(15, 60);
          G.dirtyCash(g, 'Colis revendus'); G.heat(ok.heat); G.rep('rue', 2);
          G.xp('discretion', 8); G.hist('crime');
          if (G.chance(14)) { G.give('smartphone', 1); return { t: 'money', m: n + ' colis. L’un contenait un téléphone neuf. <b>' + G.eur(g) + '</b>.' }; }
          return { t: 'money', m: n + ' colis ouverts dans une cage d’escalier. <b>' + G.eur(g) + '</b> d’argent sale.' };
        }
        G.heat(16); G.rep('legale', -2);
        G.arrestCheck('vol de colis', 4);
        return { t: 'bad', m: 'Une caméra de sonnette connectée. Le propriétaire vous regarde en direct depuis son bureau.' };
      }
    },

    {
      id: 'begscam', ico: '🎻', n: 'Mendicité organisée', cat: 'petty', when: 'day',
      d: 'Faux plâtre, faux ticket de train, fausse histoire. Le charisme fait tout le travail.',
      hours: 3, energy: 14, sentence: 3, req: { charisme: 3 },
      run: function (G) {
        var ok = G.crimeRoll(64, { charisme: 5, rue: 0.2 });
        if (ok.win) {
          var g = G.rnd(35, 70) + G.lvl('charisme') * 9;
          G.cash(g, 'Aumône extorquée'); G.heat(ok.heat * 0.6); G.rep('rue', 2);
          G.xp('charisme', 11); G.add('moral', -5); G.hist('crime');
          return { t: 'money', m: 'Trois heures de comédie devant la gare. <b>' + G.eur(g) + '</b>, et un peu de dégoût.' };
        }
        G.heat(10); G.add('moral', -8); G.rep('rue', -2);
        G.arrestCheck('mendicité agressive', 3);
        return { t: 'bad', m: 'Quelqu’un vous a reconnu d’hier, avec l’autre jambe dans le plâtre. Ça crie.' };
      }
    },

    {
      id: 'atmscam', ico: '🏧', n: 'Piéger un distributeur', cat: 'petty', when: 'night',
      d: 'Un bout de film plastique dans la fente, et on récupère les billets coincés.',
      hours: 2, energy: 10, sentence: 10, req: { intelligence: 3, repRue: 12 },
      run: function (G) {
        var ok = G.crimeRoll(46, { intelligence: 4, discretion: 4 });
        if (ok.win) {
          var g = G.rnd(80, 260);
          G.dirtyCash(g, 'Distributeur'); G.heat(ok.heat); G.xp('intelligence', 9);
          G.xp('discretion', 6); G.hist('crime');
          return { t: 'money', m: 'Deux clients repartent en pestant contre leur banque. <b>' + G.eur(g) + '</b> restent dans la fente.' };
        }
        G.heat(20); G.rep('legale', -3);
        G.arrestCheck('fraude aux moyens de paiement', 10);
        return { t: 'bad', m: 'La caméra du distributeur filme vos mains en gros plan pendant quatre minutes.' };
      }
    },

    /* ─────────────── MOYENNE DÉLINQUANCE ─────────────── */

    {
      id: 'burglary', ico: '🏠', n: 'Cambriolage', cat: 'mid', when: 'night',
      d: 'Un appartement vide repéré la veille. Crochets obligatoires, alarme possible.',
      hours: 4, energy: 32, sentence: 24, req: { item: 'crochets', repRue: 25 },
      crew: ['nadia'],
      run: function (G) {
        var ok = G.crimeRoll(38, { discretion: 6, intelligence: 2, rue: 0.25, crew: ['nadia'], gear: { brouilleur: 12, gants: 6 } });
        if (ok.win) {
          var g = G.rnd(350, 900) + G.lvl('discretion') * 45;
          G.dirtyCash(g, 'Cambriolage'); G.rep('rue', 6); G.rep('pegre', 5); G.rep('legale', -5);
          G.heat(ok.heat); G.xp('discretion', 20); G.hist('crime'); G.hist('burglary');
          if (G.chance(20)) { G.give('bijou', 1); return { t: 'money', m: '<b>' + G.eur(g) + '</b> et une parure de joaillerie dans un tiroir de commode.' }; }
          return { t: 'money', m: 'Vingt minutes à l’intérieur, ressorti par la cour. <b>' + G.eur(g) + '</b> d’argent sale.' };
        }
        G.heat(34); G.rep('legale', -8); G.add('sante', -10);
        G.arrestCheck('cambriolage', 24);
        return { t: 'bad', m: 'L’alarme part au bout de neuf secondes. Vous connaissez le bruit par cœur maintenant.' };
      }
    },

    {
      id: 'carsteal', ico: '🚗', n: 'Voler une voiture', cat: 'mid', when: 'night',
      d: 'Repérer, ouvrir, démarrer, livrer au garage complice. Tout se joue en quatre minutes.',
      hours: 3, energy: 26, sentence: 30, req: { repPegre: 15, discretion: 4 },
      crew: ['bruno'],
      run: function (G) {
        var ok = G.crimeRoll(36, { discretion: 5, intelligence: 3.5, pegre: 0.3, crew: ['bruno'], gear: { gants: 6 } });
        if (ok.win) {
          var g = G.rnd(700, 1600) + G.lvl('discretion') * 60;
          G.dirtyCash(g, 'Voiture livrée'); G.rep('pegre', 7); G.rep('rue', 3); G.rep('legale', -6);
          G.heat(ok.heat); G.xp('discretion', 18); G.xp('intelligence', 8); G.hist('crime');
          return { t: 'money', m: 'Livrée au garage à 3h20, plaques changées à 3h40. <b>' + G.eur(g) + '</b>.' };
        }
        G.heat(38); G.rep('legale', -8);
        G.arrestCheck('vol de véhicule', 30);
        return { t: 'bad', m: 'Le traceur GPS était sous le passage de roue. Trois voitures de police au carrefour suivant.' };
      }
    },

    {
      id: 'deal', ico: '🧊', n: 'Écouler la marchandise', cat: 'mid', when: 'night',
      d: 'Un point fixe, deux heures, une file discrète. Il faut du stock.',
      hours: 3, energy: 20, sentence: 40, req: { item: 'came', repRue: 20 },
      run: function (G) {
        G.take('came', 1);
        var ok = G.crimeRoll(58, { charisme: 3, discretion: 3, rue: 0.3, pegre: 0.2 });
        if (ok.win) {
          var g = G.rnd(430, 620) + G.lvl('charisme') * 20;
          G.dirtyCash(g, 'Vente au détail'); G.rep('rue', 5); G.rep('pegre', 4); G.rep('legale', -4);
          G.heat(ok.heat); G.xp('charisme', 10); G.hist('crime'); G.hist('deal');
          G.aff('sofia', -3); G.aff('duval', -3);
          return { t: 'money', m: 'Le lot part en trois heures. <b>' + G.eur(g) + '</b> d’argent sale, marge nette.' };
        }
        G.heat(40); G.rep('legale', -10);
        G.arrestCheck('trafic de stupéfiants', 40);
        return { t: 'bad', m: 'La camionnette banalisée était garée depuis une heure. Vous n’avez rien vu venir.' };
      }
    },

    {
      id: 'extort', ico: '💢', n: 'Racket de commerçants', cat: 'mid', when: 'day',
      d: 'Passer chaque semaine, ne rien menacer explicitement, tout laisser comprendre.',
      hours: 3, energy: 22, sentence: 35, req: { repPegre: 20, force: 4 },
      run: function (G) {
        var ok = G.crimeRoll(50, { force: 4, charisme: 3, pegre: 0.4 });
        if (ok.win) {
          var g = G.rnd(250, 520) + G.repVal('pegre') * 4;
          G.dirtyCash(g, 'Protection'); G.rep('pegre', 6); G.rep('rue', 2); G.rep('legale', -6);
          G.heat(ok.heat); G.xp('force', 8); G.xp('charisme', 6); G.hist('crime');
          G.aff('renard', -8); G.aff('duval', -4);
          return { t: 'money', m: 'Quatre commerces, quatre enveloppes. <b>' + G.eur(g) + '</b>. Personne ne portera plainte.' };
        }
        G.heat(30); G.add('sante', -12);
        G.aff('renard', -12);
        G.arrestCheck('extorsion', 35);
        return { t: 'bad', m: 'Le patron du troisième commerce a un beau-frère policier. Et deux fils très costauds.' };
      }
    },

    {
      id: 'fraud', ico: '📞', n: 'Arnaque en ligne', cat: 'mid', when: 'any',
      d: 'Faux support technique, fausses annonces, faux virements. Tout se joue au téléphone.',
      hours: 4, energy: 18, sentence: 28, req: { item: 'ordi', intelligence: 4 },
      run: function (G) {
        var ok = G.crimeRoll(46, { intelligence: 5, charisme: 4 });
        if (ok.win) {
          var g = G.rnd(300, 850) + G.lvl('intelligence') * 55;
          G.dirtyCash(g, 'Escroquerie'); G.rep('legale', -4); G.rep('pegre', 3);
          G.heat(ok.heat * 0.7); G.xp('intelligence', 16); G.xp('charisme', 8); G.hist('crime'); G.hist('fraud');
          return { t: 'money', m: 'Onze appels, deux victimes. <b>' + G.eur(g) + '</b> virés sur un compte qui n’existera plus demain.' };
        }
        G.heat(22); G.rep('legale', -6);
        G.arrestCheck('escroquerie en bande organisée', 28);
        return { t: 'bad', m: 'La troisième personne au bout du fil était une enquêtrice. Vous avez parlé onze minutes.' };
      }
    },

    {
      id: 'cardfraud', ico: '💳', n: 'Fraude à la carte bancaire', cat: 'mid', when: 'night',
      d: 'Poser le copieur, revenir douze heures plus tard, vider les comptes.',
      hours: 3, energy: 16, sentence: 36, req: { item: 'skimmer', intelligence: 5, repPegre: 25 },
      run: function (G) {
        var ok = G.crimeRoll(44, { intelligence: 5, discretion: 4, pegre: 0.25 });
        if (ok.win) {
          var g = G.rnd(600, 1400) + G.lvl('intelligence') * 70;
          G.dirtyCash(g, 'Retraits frauduleux'); G.rep('pegre', 6); G.rep('legale', -6);
          G.heat(ok.heat); G.xp('intelligence', 18); G.xp('discretion', 10); G.hist('crime');
          return { t: 'money', m: 'Quatorze cartes copiées, six comptes vidés avant l’aube. <b>' + G.eur(g) + '</b>.' };
        }
        G.heat(36); G.rep('legale', -8);
        G.arrestCheck('fraude aux moyens de paiement', 36);
        return { t: 'bad', m: 'La banque avait remplacé le distributeur la veille. Le vôtre filmait dans le vide — et vous filmait, vous.' };
      }
    },

    {
      id: 'shopbreak', ico: '🏪', n: 'Braquer une supérette', cat: 'mid', when: 'night',
      d: 'Entrer à la fermeture, sortir en deux minutes. Le gérant est seul.',
      hours: 2, energy: 26, sentence: 55, req: { item: 'arme', repPegre: 30 },
      crew: ['bruno'],
      run: function (G) {
        var ok = G.crimeRoll(52, { force: 3, discretion: 3.5, pegre: 0.35, crew: ['bruno'], gear: { gants: 8 } });
        if (ok.win) {
          var g = G.rnd(800, 1900);
          G.dirtyCash(g, 'Braquage'); G.rep('pegre', 10); G.rep('rue', 5); G.rep('legale', -12);
          G.heat(ok.heat); G.xp('force', 10); G.hist('crime'); G.hist('armed');
          G.aff('duval', -12); G.aff('renard', -10); G.aff('sofia', -8);
          return { t: 'money', m: 'Cent dix secondes chrono. <b>' + G.eur(g) + '</b> dans un sac de sport.' };
        }
        G.heat(50); G.add('sante', -18); G.rep('legale', -14);
        G.arrestCheck('vol à main armée', 55);
        return { t: 'bad', m: 'Le gérant avait un bouton sous le comptoir. Les gyrophares arrivent avant vous à la porte.' };
      }
    },

    {
      id: 'blackmail', ico: '📸', n: 'Chantage', cat: 'mid', when: 'any',
      d: 'Une photo, une conversation enregistrée, et un versement qui ne s’arrête jamais.',
      hours: 4, energy: 16, sentence: 32, req: { intelligence: 4, charisme: 4, repPegre: 12 },
      run: function (G) {
        var ok = G.crimeRoll(48, { intelligence: 4, charisme: 4, discretion: 2 });
        if (ok.win) {
          var g = G.rnd(400, 1100) + G.lvl('charisme') * 40;
          G.dirtyCash(g, 'Chantage'); G.rep('pegre', 6); G.rep('legale', -5);
          G.heat(ok.heat); G.xp('charisme', 12); G.xp('intelligence', 10);
          G.add('moral', -8); G.hist('crime'); G.hist('dirty');
          if (G.chance(28)) G.sched('blackmail_back', G.rnd(8, 22));
          return { t: 'money', m: 'Il paie sans discuter, et il paiera encore. <b>' + G.eur(g) + '</b>.' };
        }
        G.heat(30); G.rep('legale', -8);
        G.arrestCheck('chantage', 32);
        return { t: 'bad', m: 'Il est allé voir la police le soir même. Il avait moins à perdre que vous ne pensiez.' };
      }
    },

    {
      id: 'freight', ico: '🚛', n: 'Détourner un chargement', cat: 'mid', when: 'night',
      d: 'Un chauffeur complice, une aire d’autoroute, quarante minutes de transbordement.',
      hours: 5, energy: 34, sentence: 45, req: { repPegre: 25, item: 'gants', force: 4 },
      crew: ['bruno'],
      run: function (G) {
        var ok = G.crimeRoll(42, { force: 3, discretion: 3.5, intelligence: 2, pegre: 0.3, crew: ['bruno'], gear: { voiture: 8 } });
        if (ok.win) {
          var g = G.rnd(1800, 4200) + G.repVal('pegre') * 25;
          G.dirtyCash(g, 'Chargement'); G.rep('pegre', 9); G.rep('legale', -7);
          G.heat(ok.heat); G.xp('force', 10); G.xp('discretion', 10); G.hist('crime');
          return { t: 'money', m: 'La remorque repart à vide vers un entrepôt qui n’existe pas. <b>' + G.eur(g) + '</b>.' };
        }
        G.heat(38); G.add('sante', -12); G.rep('legale', -9);
        G.arrestCheck('vol de fret en bande organisée', 45);
        return { t: 'bad', m: 'Le chauffeur avait un bouton d’alerte sous le volant. Il l’a utilisé à la troisième minute.' };
      }
    },

    {
      id: 'medtraffic', ico: '💊', n: 'Trafic de médicaments', cat: 'mid', when: 'day',
      d: 'Fausses ordonnances, pharmacies complaisantes, revente à ceux qui n’ont plus de droits.',
      hours: 4, energy: 18, sentence: 30, req: { intelligence: 5, repRue: 20 },
      run: function (G) {
        var ok = G.crimeRoll(52, { intelligence: 5, charisme: 3, rue: 0.2 });
        if (ok.win) {
          var g = G.rnd(350, 800) + G.lvl('intelligence') * 35;
          G.dirtyCash(g, 'Revente de médicaments'); G.rep('rue', 4); G.rep('pegre', 4); G.rep('legale', -4);
          G.heat(ok.heat); G.xp('intelligence', 12); G.aff('sofia', -4); G.hist('crime');
          if (G.chance(30)) G.give('medoc', 2);
          return { t: 'money', m: 'Trois officines, six ordonnances, aucun contrôle croisé. <b>' + G.eur(g) + '</b>.' };
        }
        G.heat(26); G.rep('legale', -7);
        G.arrestCheck('trafic de médicaments', 30);
        return { t: 'bad', m: 'La pharmacienne appelle le prescripteur devant vous. Il n’existe pas.' };
      }
    },

    {
      id: 'homejack', ico: '🚪', n: 'Home-jacking', cat: 'mid', when: 'night',
      d: 'Entrer quand les habitants sont là. Bien plus rentable qu’un cambriolage, et bien plus lourd au tribunal.',
      hours: 4, energy: 36, sentence: 70, req: { repPegre: 35, item: 'arme', force: 5 },
      crew: ['bruno', 'nadia'],
      run: function (G) {
        var ok = G.crimeRoll(46, { force: 4, discretion: 3, pegre: 0.3, crew: ['bruno', 'nadia'], gear: { gants: 8, brouilleur: 8 } });
        if (ok.win) {
          var g = G.rnd(2500, 6000);
          G.dirtyCash(g, 'Home-jacking'); G.rep('pegre', 12); G.rep('rue', 4); G.rep('legale', -14);
          G.heat(ok.heat); G.hist('crime'); G.hist('armed'); G.add('moral', -12);
          G.affFaction('legal', -6);
          if (G.chance(25)) G.give('bijou', 1);
          return { t: 'money', m: 'Le coffre s’ouvre en douze minutes parce que quelqu’un donne la combinaison. <b>' + G.eur(g) + '</b>.' };
        }
        G.heat(58); G.add('sante', -24); G.rep('legale', -18);
        G.arrestCheck('vol avec violence et séquestration', 70);
        return { t: 'bad', m: 'Le fils aîné dormait au premier. Il a hurlé, et tout le quartier a allumé sa lumière.' };
      }
    },

    /* ─────────────── GRANDE DÉLINQUANCE ─────────────── */

    {
      id: 'warehouse', ico: '📦', n: 'Braquage d’entrepôt', cat: 'big', when: 'night',
      d: 'Un camion, une équipe, une fenêtre de quarante minutes entre deux rondes.',
      hours: 5, energy: 40, sentence: 80, req: { repPegre: 45, item: 'gants', force: 5 },
      crew: ['bruno', 'nadia'],
      run: function (G) {
        var ok = G.crimeRoll(40, { discretion: 4, force: 3, intelligence: 3, pegre: 0.35, crew: ['bruno', 'nadia'], gear: { brouilleur: 14, voiture: 6 } });
        if (ok.win) {
          var g = G.rnd(4000, 9000) + G.repVal('pegre') * 60;
          G.dirtyCash(g, 'Entrepôt'); G.rep('pegre', 14); G.rep('legale', -12);
          G.heat(ok.heat); G.xp('force', 14); G.xp('discretion', 14); G.hist('crime'); G.hist('bigscore');
          return { t: 'money', m: 'Trois palettes chargées en trente-huit minutes. <b>' + G.eur(g) + '</b> à partager — votre part est déjà là.' };
        }
        G.heat(55); G.add('sante', -22); G.rep('legale', -16); G.aff('bruno', -10);
        G.arrestCheck('vol en bande organisée', 80);
        return { t: 'bad', m: 'Le vigile de nuit n’était pas dans le planning. Tout s’effondre en quinze secondes.' };
      }
    },

    {
      id: 'jewel', ico: '💎', n: 'Braquage de bijouterie', cat: 'big', when: 'day',
      d: 'En plein jour, à l’ouverture. Trois minutes, pas une de plus.',
      hours: 3, energy: 38, sentence: 120, req: { repPegre: 55, item: 'arme', item2: 'gants' },
      crew: ['bruno', 'nadia'],
      run: function (G) {
        var ok = G.crimeRoll(36, { discretion: 4, force: 4, charisme: 2, pegre: 0.4, crew: ['bruno', 'nadia'], gear: { scooter: 8, voiture: 10 } });
        if (ok.win) {
          var g = G.rnd(12000, 26000);
          G.dirtyCash(g, 'Bijouterie'); G.rep('pegre', 20); G.rep('rue', 8); G.rep('legale', -20);
          G.heat(ok.heat); G.hist('crime'); G.hist('bigscore'); G.hist('armed');
          G.affFaction('legal', -14);
          return { t: 'money', m: 'Deux minutes cinquante. <b>' + G.eur(g) + '</b> de pierres, revendues au tiers de leur valeur le soir même.' };
        }
        G.heat(70); G.add('sante', -28); G.rep('legale', -25);
        G.arrestCheck('vol à main armée avec séquestration', 120);
        return { t: 'bad', m: 'La vitrine était blindée. Le rideau tombe pendant que vous êtes encore dedans.' };
      }
    },

    {
      id: 'cyber', ico: '🖧', n: 'Détournement de virements', cat: 'big', when: 'any',
      d: 'Pas d’arme, pas de témoin, pas de sang. Juste beaucoup de patience et une station de travail.',
      hours: 5, energy: 26, sentence: 90, req: { item: 'serveur', intelligence: 8, repPegre: 40 },
      run: function (G) {
        var ok = G.crimeRoll(38, { intelligence: 7, discretion: 3 });
        if (ok.win) {
          var g = G.rnd(15000, 40000) + G.lvl('intelligence') * 1500;
          G.dirtyCash(g, 'Virements détournés'); G.rep('pegre', 16); G.rep('legale', -10);
          G.heat(ok.heat * 0.6); G.xp('intelligence', 30); G.hist('crime'); G.hist('bigscore');
          return { t: 'money', m: 'Onze virements fractionnés vers quatre juridictions. <b>' + G.eur(g) + '</b> arrivent en cascade.' };
        }
        G.heat(40); G.rep('legale', -12);
        G.arrestCheck('cybercriminalité en bande organisée', 90);
        return { t: 'bad', m: 'Une empreinte oubliée dans un journal système. La cellule cyber remonte jusqu’à votre adresse en trois jours.' };
      }
    },

    {
      id: 'insider', ico: '📈', n: 'Délit d’initié', cat: 'big', when: 'day',
      d: 'Une information avant tout le monde. Le lendemain, un titre s’envole.',
      hours: 2, energy: 12, sentence: 45, req: { repLeg: 30, intelligence: 6, bank: true },
      run: function (G) {
        var ok = G.crimeRoll(62, { intelligence: 4, charisme: 3, legale: 0.2 });
        if (ok.win) {
          var a = G.marketTip();
          G.heat(ok.heat * 0.5); G.rep('legale', -3); G.xp('intelligence', 14); G.hist('crime'); G.hist('insider');
          return { t: 'good', m: 'On vous glisse un nom et une date. <b>' + a + '</b> va bouger fortement demain. À vous d’en faire quelque chose.' };
        }
        G.heat(25); G.rep('legale', -10);
        G.arrestCheck('délit d’initié', 45);
        return { t: 'bad', m: 'Votre interlocuteur enregistrait la conversation. L’Autorité des marchés a déjà le fichier.' };
      }
    },

    {
      id: 'fourgon', ico: '🚚', n: 'Braquage de fourgon blindé', cat: 'big', when: 'day',
      d: 'Le sommet du métier. Une équipe complète, quatre-vingt-dix secondes, deux caissons.',
      hours: 5, energy: 45, sentence: 150, req: { repPegre: 65, item: 'arme', item2: 'gants', force: 6 },
      crew: ['bruno', 'nadia'],
      run: function (G) {
        var ok = G.crimeRoll(30, { force: 4, discretion: 4, intelligence: 3, pegre: 0.45, crew: ['bruno', 'nadia'], gear: { brouilleur: 12, voiture: 10 } });
        if (ok.win) {
          var g = G.rnd(35000, 90000);
          G.dirtyCash(g, 'Fourgon'); G.rep('pegre', 25); G.rep('rue', 10); G.rep('legale', -25);
          G.heat(ok.heat); G.hist('crime'); G.hist('bigscore'); G.hist('armed');
          G.affFaction('legal', -18);
          return { t: 'money', m: 'Quatre-vingt-dix secondes chrono, deux caissons découpés. <b>' + G.eur(g) + '</b> à partager.' };
        }
        G.heat(85); G.add('sante', -35); G.rep('legale', -30);
        G.arrestCheck('attaque de transport de fonds', 150);
        return { t: 'bad', m: 'Les convoyeurs étaient prévenus. La riposte commence avant que la disqueuse n’ait mordu.' };
      }
    },

    {
      id: 'safecrack', ico: '🔐', n: 'Percer un coffre', cat: 'big', when: 'night',
      d: 'Pas de violence, pas de témoin : une nuit entière seul face à une porte en acier.',
      hours: 6, energy: 34, sentence: 85, req: { repPegre: 50, item: 'brouilleur', discretion: 7 },
      crew: ['nadia'],
      run: function (G) {
        var ok = G.crimeRoll(34, { discretion: 7, intelligence: 4, pegre: 0.3, crew: ['nadia'], gear: { crochets: 8, gants: 6 } });
        if (ok.win) {
          var g = G.rnd(18000, 45000) + G.lvl('discretion') * 900;
          G.dirtyCash(g, 'Coffre'); G.rep('pegre', 18); G.rep('legale', -10);
          G.heat(ok.heat * 0.75); G.xp('discretion', 30); G.hist('crime'); G.hist('bigscore');
          return { t: 'money', m: 'Six heures, deux forets cassés, et un déclic à 4 h 10. <b>' + G.eur(g) + '</b>.' };
        }
        G.heat(50); G.rep('legale', -14); G.add('sante', -10);
        G.arrestCheck('vol avec effraction aggravée', 85);
        return { t: 'bad', m: 'Le coffre était sur détecteur sismique. La ronde arrive pendant que vous perforez.' };
      }
    },

    {
      id: 'guntraffic', ico: '🔫', n: 'Trafic d’armes', cat: 'big', when: 'night',
      d: 'On achète loin, on revend ici. Le risque n’est pas la police : ce sont les acheteurs.',
      hours: 5, energy: 28, sentence: 110, req: { repPegre: 55, money: 4000 },
      run: function (G) {
        if (!G.spend(4000, 'Achat du lot')) return { t: 'bad', m: 'Il faut avancer 4 000 € pour le lot.' };
        var ok = G.crimeRoll(48, { charisme: 3, discretion: 3, pegre: 0.4 });
        if (ok.win) {
          var g = G.rnd(12000, 26000);
          G.dirtyCash(g, 'Trafic d’armes'); G.rep('pegre', 20); G.rep('legale', -15);
          G.heat(ok.heat); G.hist('crime'); G.hist('bigscore'); G.hist('armed');
          if (!G.has('arme') && G.chance(45)) G.give('arme', 1);
          return { t: 'money', m: 'Le lot part en trois livraisons. <b>' + G.eur(g) + '</b>, et personne n’a demandé votre nom.' };
        }
        G.heat(60); G.add('sante', -20); G.rep('pegre', -8);
        if (G.chance(45)) {
          G.arrestCheck('trafic d’armes', 110);
          return { t: 'bad', m: 'La livraison était surveillée depuis trois semaines.' };
        }
        return { t: 'bad', m: 'Les acheteurs repartent avec le lot sans payer. Vous ne pouvez porter plainte nulle part.' };
      }
    },

    {
      id: 'corrupt', ico: '🏛️', n: 'Corrompre un élu', cat: 'big', when: 'day',
      d: 'Un marché public contre une enveloppe. La criminalité qui porte un costume.',
      hours: 4, energy: 20, sentence: 75, req: { repLeg: 45, charisme: 7, money: 15000, biz: 1 },
      run: function (G) {
        if (!G.spend(15000, 'Enveloppe')) return { t: 'bad', m: 'Il faut 15 000 € pour ouvrir la conversation.' };
        var ok = G.crimeRoll(52, { charisme: 5, intelligence: 4, legale: 0.25 });
        if (ok.win) {
          var g = G.rnd(60000, 140000);
          G.cash(g, 'Marché public'); G.rep('legale', -6); G.rep('pegre', 10);
          G.heat(ok.heat * 0.5); G.xp('charisme', 20); G.hist('crime'); G.hist('bigscore');
          return { t: 'money', m: 'Le marché vous est attribué « au mieux-disant ». <b>' + G.eur(g) + '</b>, virés proprement.' };
        }
        G.heat(35); G.rep('legale', -25);
        G.arrestCheck('corruption d’agent public', 75);
        return { t: 'bad', m: 'Il vous laisse parler huit minutes, puis sort son téléphone de sa poche : il enregistrait.' };
      }
    },

    /* ─────────────── COUVERTURE & ENTRETIEN ─────────────── */

    {
      id: 'case', ico: '🔭', n: 'Repérer une cible', cat: 'cover', when: 'any',
      d: 'Passer, revenir, noter les horaires et les caméras. Le prochain coup préparé réussit bien mieux.',
      hours: 3, energy: 14, sentence: 0, req: {},
      run: function (G) {
        var pool = D.CRIMES.filter(function (c) { return c.cat !== 'cover' && !G.checkReq(c.req); });
        if (!pool.length) return { t: 'bad', m: 'Rien de repérable à votre niveau pour l’instant.' };
        var target = G.pick(pool);
        G.flag('cased', target.id);
        G.xp('discretion', 12); G.xp('intelligence', 6);
        return { t: 'good', m: 'Trois heures d’observation. <b>' + target.ico + ' ' + target.n +
          '</b> est repéré : +14 % de réussite et moins de traces au prochain essai.' };
      }
    },

    {
      id: 'burnproof', ico: '🔥', n: 'Faire disparaître les preuves', cat: 'cover', when: 'night',
      d: 'Brûler les vêtements, changer de téléphone, nettoyer une voiture. Long et efficace.',
      hours: 4, energy: 20, sentence: 12, req: { repPegre: 12 },
      run: function (G) {
        var drop = 22 + G.lvl('discretion') * 2.5;
        G.heat(-drop);
        G.xp('discretion', 10);
        if (G.has('smartphone') && G.chance(50)) {
          G.take('smartphone', 1);
          return { t: 'good', m: 'Tout y passe, y compris votre téléphone. Pression policière −' + Math.round(drop) + '.' };
        }
        return { t: 'good', m: 'Un bidon, une benne, et deux heures à frotter. Pression policière −' + Math.round(drop) + '.' };
      }
    },

    {
      id: 'newid', ico: '🪪', n: 'Changer d’identité', cat: 'cover', when: 'day',
      d: 'Un nouveau nom, un nouveau dossier. On repart de zéro — vraiment de zéro.',
      hours: 5, energy: 22, sentence: 40, req: { repPegre: 40, money: 8000 },
      run: function (G) {
        if (!G.spend(8000, 'Identité neuve')) return { t: 'bad', m: 'Il faut 8 000 € pour un dossier crédible.' };
        var ok = G.crimeRoll(70, { intelligence: 3, pegre: 0.3 });
        if (ok.win) {
          G.setHeat(0);
          G.clearCasier(4);
          G.rep('legale', -8);
          G.give('faux', 2);
          G.xp('discretion', 15); G.hist('crime');
          return { t: 'good', m: 'Nouveau nom, nouveau numéro de sécurité sociale. <b>Pression policière effacée, casier allégé de 4 mentions.</b>' };
        }
        G.heat(25);
        G.arrestCheck('usurpation d’identité', 40);
        return { t: 'bad', m: 'Le dossier est refusé au guichet : la photo ne correspond à aucun état civil connu.' };
      }
    },

    {
      id: 'witness', ico: '🤐', n: 'Acheter un témoin', cat: 'cover', when: 'any',
      d: 'Un témoignage qui change, et une procédure qui s’effondre.',
      hours: 2, energy: 10, sentence: 25, req: { money: 2500, repPegre: 20 },
      run: function (G) {
        if (!G.spend(2500, 'Silence acheté')) return { t: 'bad', m: 'Il faut 2 500 € pour que quelqu’un oublie.' };
        var ok = G.crimeRoll(66, { charisme: 4, pegre: 0.3 });
        if (ok.win) {
          G.clearCasier(1); G.heat(-18); G.xp('charisme', 10); G.hist('crime');
          return { t: 'good', m: 'Le témoin ne se souvient plus de rien. Une mention disparaît de votre casier.' };
        }
        G.heat(22); G.rep('legale', -8);
        G.arrestCheck('subornation de témoin', 25);
        return { t: 'bad', m: 'Il empoche l’argent et va tout raconter au juge d’instruction.' };
      }
    },

    {
      id: 'laylow', ico: '🫥', n: 'Se faire oublier', cat: 'cover', when: 'any',
      d: 'Ne rien faire, ne voir personne, changer d’itinéraire. La pression policière retombe vite.',
      hours: 4, energy: 6, sentence: 0, req: {},
      run: function (G) {
        var drop = 14 + G.lvl('discretion') * 2 + (G.home().cool || 0) * 1.5;
        G.heat(-drop); G.add('moral', -6); G.xp('discretion', 6);
        return { t: 'good', m: 'Quatre heures sans exister. Pression policière −' + Math.round(drop) + '.' };
      }
    },

    {
      id: 'bribe', ico: '💶', n: 'Graisser une patte', cat: 'cover', when: 'day',
      d: 'Un fonctionnaire fatigué, une enveloppe, un dossier qui se perd.',
      hours: 2, energy: 8, sentence: 30, req: { money: 400 },
      run: function (G) {
        G.cash(-400, 'Enveloppe');
        var ok = G.crimeRoll(64, { charisme: 4, intelligence: 2, pegre: 0.2 });
        if (ok.win) {
          G.heat(-32); G.rep('legale', -2); G.xp('charisme', 8); G.hist('crime');
          return { t: 'good', m: 'L’enveloppe change de poche sans un regard. Pression policière −32.' };
        }
        G.heat(20); G.rep('legale', -10);
        G.arrestCheck('corruption', 30);
        return { t: 'bad', m: 'Il repousse l’enveloppe, se lève, et décroche son téléphone. Quatre cents euros et une plainte.' };
      }
    },

    {
      id: 'alibi', ico: '🎭', n: 'Construire un alibi', cat: 'cover', when: 'any',
      d: 'Tickets horodatés, témoins complaisants, présence sur les caméras. Protège du prochain coup dur.',
      hours: 3, energy: 12, sentence: 0, req: { repPegre: 10 },
      run: function (G) {
        G.flag('alibi', true); G.xp('charisme', 8); G.xp('intelligence', 6);
        return { t: 'good', m: 'Vous existiez ailleurs cet après-midi, et trois personnes le confirmeront. La prochaine arrestation sera annulée.' };
      }
    },

    {
      id: 'fence', ico: '🕳️', n: 'Faire le receleur', cat: 'cover', when: 'night',
      d: 'Racheter ce que les autres volent, revendre à ceux qui ne demandent rien.',
      hours: 3, energy: 14, sentence: 20, req: { repPegre: 15, money: 300 },
      run: function (G) {
        G.cash(-300, 'Achat de lot');
        var ok = G.crimeRoll(66, { charisme: 3, intelligence: 3, pegre: 0.35 });
        if (ok.win) {
          var g = G.rnd(480, 780) + G.repVal('pegre') * 5;
          G.dirtyCash(g, 'Recel'); G.rep('pegre', 5); G.heat(ok.heat * 0.6);
          G.xp('charisme', 8); G.hist('crime');
          return { t: 'money', m: 'Vous doublez la mise en une nuit : <b>' + G.eur(g) + '</b> d’argent sale.' };
        }
        G.heat(18);
        G.arrestCheck('recel', 20);
        return { t: 'bad', m: 'Le lot était pisté. Trois cents euros perdus et une visite domiciliaire à prévoir.' };
      }
    }
  ];

  D.CRIME = {};
  D.CRIMES.forEach(function (c) { D.CRIME[c.id] = c; });

  D.CRIME_CATS = [
    { id: 'petty', l: 'Petite délinquance', d: 'Peu rentable, peu risqué. La porte d’entrée.' },
    { id: 'mid', l: 'Coups sérieux', d: 'Là où l’argent commence. Là où la prison commence aussi.' },
    { id: 'big', l: 'Grande criminalité', d: 'Des sommes qui changent une vie, des peines qui en prennent une.' },
    { id: 'cover', l: 'Couverture', d: 'Effacer les traces coûte du temps, mais moins cher qu’un procès.' }
  ];

  /* ---------------------------------------------------------
     BLANCHIMENT — convertir l'argent sale en argent déclarable
     fee : part prélevée · risk : probabilité d'incident
     --------------------------------------------------------- */
  D.LAUNDER = [
    {
      id: 'street', n: 'Change au noir', ico: '🤝', fee: 0.35, risk: 0.06, max: 3000, hours: 2,
      d: 'Un intermédiaire du quartier prend un tiers et ne pose aucune question.',
      req: { repRue: 15 }
    },
    {
      id: 'casino', n: 'Passer par le casino', ico: '🎰', fee: 0.22, risk: 0.14, max: 8000, hours: 3,
      d: 'Acheter des jetons, jouer un peu, tout encaisser en chèque. Le fisc regarde parfois.',
      req: { app: 50, money: 100 }
    },
    {
      id: 'crypto', n: 'Mixeur de cryptomonnaie', ico: '🪙', fee: 0.12, risk: 0.18, max: 25000, hours: 2,
      d: 'Rapide, technique, et parfois un service disparaît avec votre dépôt.',
      req: { item: 'ordi', intelligence: 5 }
    },
    {
      id: 'biz', n: 'Faire tourner par vos sociétés', ico: '🏢', fee: 0.08, risk: 0.05, max: 0, hours: 2,
      d: 'Fausses factures, caisse gonflée, prestations fictives. Le plafond dépend de vos entreprises.',
      req: { biz: 1 }
    },
    {
      id: 'artwash', n: 'Vente d’art surévaluée', ico: '🖼️', fee: 0.06, risk: 0.09, max: 120000, hours: 3,
      d: 'Acheter une toile 5 000 €, la revendre 60 000 € à quelqu’un qui vous veut du bien.',
      req: { item: 'art', repLeg: 45 }
    }
  ];

})(window.LifeRPG);
