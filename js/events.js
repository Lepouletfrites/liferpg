/* =============================================================
   events.js — Callbacks différés déclenchés par G.sched() depuis
   une action, un délit ou un événement procédural (ex. : la victime
   d une extorsion qui réagit une semaine plus tard).

   Tout événement aléatoire ambiant est désormais généré à la volée
   par events.proc.js — voir NS.PROC.generate(). Cette liste ne
   contient plus que des paiements narratifs programmés, jamais
   tirés au hasard.
   ============================================================= */
(function (NS) {
  'use strict';

  var D = NS.D, S = NS.S;
  var EV = {};

  var LIST = [
    {
      id: 'wallet_return', manual: true, ico: '📨', title: 'Une lettre à votre nom',
      text: 'L’homme au portefeuille a retrouvé votre trace par l’association. Il vous propose un travail.',
      choices: [
        {
          l: 'Accepter le rendez-vous', h: 'Emploi possible',
          run: function (G) {
            var pool = D.JOBS.filter(function (j) { return !G.checkReq(j.req) && G.day() >= 0; });
            if (pool.length && G.chance(70)) { var j = pool[pool.length - 1]; G.hire(j.id); return 'Il dirige une PME de quarante personnes. Vous commencez lundi comme ' + j.n + '.'; }
            G.cash(300, 'Aide'); G.rep('legale', 8);
            return 'Il n’a rien à vous proposer aujourd’hui, mais il vous laisse 300 € et son numéro direct.';
          }
        },
        { l: 'Ne pas répondre', h: 'Vous n’y croyez plus', run: function (G) { G.add('moral', -5); return 'Vous rangez la lettre dans votre sac. Vous la relirez souvent sans jamais y donner suite.'; } }
      ]
    },

    {
      id: 'wallet_camera', manual: true, ico: '📹', title: 'La caméra a parlé',
      cond: function (G) { return true; },
      text: 'Deux enquêteurs vous attendent. Les images sont nettes. Le propriétaire a porté plainte.',
      choices: [
        {
          l: 'Nier en bloc', h: 'Très risqué', risky: true,
          run: function (G) {
            if (G.chance(30 + G.lvl('charisme') * 4)) { G.heat(-10); return 'Vous tenez trente minutes sans varier d’un mot. Faute de preuve formelle, ils vous relâchent.'; }
            G.arrestCheck('vol', 8); return 'Votre version s’effondre à la troisième question.';
          }
        },
        {
          l: 'Rembourser et s’excuser', h: 'Coûteux mais propre',
          run: function (G) {
            var c = Math.min(G.money(), 200);
            G.cash(-c, 'Remboursement'); G.heat(-20); G.rep('legale', 3);
            return 'Vous remboursez ' + G.eur(c) + '. La plainte est retirée. On vous regarde comme un cas social, mais vous êtes libre.';
          }
        }
      ]
    },

    {
      id: 'snitch_found', manual: true, ico: '🔪', title: 'On sait',
      text: 'Trois personnes vous attendent en bas. Elles ne sont pas venues discuter.',
      choices: [
        { l: 'Fuir la ville deux jours', h: 'Coûte 2 jours', run: function (G) { G.s.day += 2; G.setHeat(0); G.add('moral', -15); return 'Vous prenez le premier train. Quand vous revenez, la colère est retombée d’un cran.'; } },
        { l: 'Affronter', h: 'Force — très risqué', risky: true, run: function (G) { if (G.chance(20 + G.lvl('force') * 8)) { G.rep('rue', 10); G.rep('pegre', 5); G.add('sante', -20); return 'Vous en mettez deux au sol. Le troisième s’arrête. On ne vous croit plus indicateur, on vous croit fou.'; } G.add('sante', -45); G.add('moral', -25); return 'Vous vous réveillez trois heures plus tard dans une cage d’escalier.'; } },
        { l: 'Payer pour la paix', h: '5 000 €', req: function (G) { return G.money() >= 5000; }, run: function (G) { G.cash(-5000, 'Paix'); G.rep('pegre', -5); G.flag('snitch', false); return 'Cinq mille euros achètent un oubli. Pas un pardon.'; } }
      ]
    },

    {
      id: 'diploma_check', manual: true, ico: '🔎', title: 'Vérification des diplômes',
      cond: function (G) { return !!G.flags('fakeDiploma'); },
      text: 'Le service des ressources humaines a lancé un contrôle rétroactif. Votre dossier est sur la pile.',
      choices: [
        {
          l: 'Laisser faire', h: 'Le hasard décide',
          run: function (G) {
            var fake = G.flags('fakeDiploma');
            if (G.chance(45)) { G.flag('fakeDiploma', false); return 'Le contrôle porte sur trois dossiers pris au hasard. Pas le vôtre. Vous ne dormez pas de la semaine.'; }
            if (fake.kind === 'bac') { G.s.edu = fake.edu; G.s.eduProg = 0; }
            else { G.s.filiereLvl = fake.lvl; G.s.filiereProg = 0; }
            G.flag('fakeDiploma', false); G.rep('legale', -15);
            if (G.s.job) G.quitJob();
            return 'L’établissement n’a jamais entendu parler de vous. Le diplôme saute, et le poste avec.';
          }
        },
        { l: 'Soudoyer le service (1 500 €)', h: 'Efficace', req: function (G) { return G.money() >= 1500; }, run: function (G) { G.cash(-1500, 'Arrangement'); G.flag('fakeDiploma', false); return 'Le dossier ressort validé. Personne ne saura jamais.'; } },
        { l: 'Démissionner avant', h: 'Sauver la face', run: function (G) { if (G.s.job) G.quitJob(); G.flag('fakeDiploma', false); G.add('moral', -10); return 'Vous partez avant qu’on vous demande. On ne saura pas, mais vous, si.'; } }
      ]
    },

    {
      id: 'stash_back', manual: true, ico: '🎒', title: 'On vient récupérer le sac',
      text: 'Une semaine plus tard, on frappe. Le sac est toujours au fond du placard.',
      choices: [
        { l: 'Rendre le sac', h: 'Prime et confiance', run: function (G) { G.dirtyCash(600, 'Prime'); G.rep('pegre', 10); G.aff('legrec', 6); G.heat(-8); return 'Vous rendez le sac fermé. On vous glisse six cents euros de plus. « On se souviendra. »'; } },
        { l: 'Dire qu’il a été saisi', h: 'Garder le contenu — très risqué', risky: true, run: function (G) { if (G.chance(20 + G.lvl('charisme') * 5)) { G.dirtyCash(G.rnd(3000, 6000), 'Contenu du sac'); G.rep('pegre', -5); return 'On vous croit. Le contenu vaut plusieurs milliers d’euros. Vous ne dormirez plus très bien.'; } G.add('sante', -35); G.rep('pegre', -25); G.affFaction('pegre', -25); return 'Ils vérifient. Ils vérifient toujours.'; } }
      ]
    },

    {
      id: 'racket_revenge', manual: true, ico: '🧨', title: 'Représailles',
      text: 'On n’oublie pas ce genre de chose. Une voiture ralentit devant chez vous, une vitre explose.',
      choices: [
        {
          l: 'Encaisser et se taire', h: 'Dégâts matériels',
          run: function (G) {
            var l = Math.min(G.money(), G.rnd(200, 900));
            if (l) G.cash(-l, 'Réparations');
            G.add('moral', -15);
            return 'Vous payez les réparations sans porter plainte. Le message est reçu.';
          }
        },
        {
          l: 'Riposter', h: 'Force — escalade', risky: true,
          run: function (G) {
            if (G.chance(30 + G.lvl('force') * 7 + G.repVal('pegre') * 0.3)) {
              G.rep('pegre', 12); G.rep('rue', 8); G.heat(15);
              return 'Vous remontez jusqu’à eux en deux jours. Après ça, plus personne ne touche à vos vitres.';
            }
            G.add('sante', -30); G.add('moral', -18); G.heat(20);
            return 'Vous frappez le mauvais groupe. Vous vous en sortez avec trois côtes fêlées.';
          }
        },
        {
          l: 'Payer pour la paix', h: '3 000 €', req: function (G) { return G.canPay(3000); },
          run: function (G) { G.spend(3000, 'Paix achetée'); G.rep('pegre', -3); return 'Trois mille euros et un intermédiaire. L’affaire est close, salement.'; }
        }
      ]
    },

    {
      id: 'blackmail_back', manual: true, ico: '📸', title: 'La victime a réfléchi',
      text: 'Celui que vous faisiez chanter ne répond plus au téléphone. Il a pris un avocat — ou pire.',
      choices: [
        {
          l: 'Lâcher l’affaire', h: 'Sage', run: function (G) { G.heat(5); return 'Vous effacez tout et vous n’en reparlez jamais. C’était la bonne décision.'; }
        },
        {
          l: 'Publier ce que vous avez', h: 'Vengeance — et procédure', risky: true,
          run: function (G) {
            G.rep('pegre', 5); G.heat(28); G.rep('legale', -10);
            G.arrestCheck('diffusion d’images sans consentement', 30);
            return 'Sa vie s’effondre en quarante-huit heures. La vôtre est désormais dans un dossier.';
          }
        },
        {
          l: 'Doubler la demande', h: 'Charisme — tout ou rien', risky: true,
          run: function (G) {
            if (G.chance(30 + G.lvl('charisme') * 5)) {
              var g = G.rnd(1200, 3000);
              G.dirtyCash(g, 'Chantage'); return 'Il craque et paie ' + G.eur(g) + ' d’un coup pour en finir.';
            }
            G.heat(35); G.arrestCheck('chantage aggravé', 40);
            return 'Le rendez-vous était une souricière. Il n’était pas venu seul.';
          }
        }
      ]
    },

    {
      id: 'lockeddeposit', manual: true, ico: '🏦', title: 'Placement débloqué',
      text: 'Le placement bloqué arrive à échéance.',
      choices: [
        { l: 'Encaisser', h: 'Capital + intérêts', run: function (G) { var m = G.flags('lockedDeposit') || 0; G.s.bank.savings += m; G.flag('lockedDeposit', 0); return G.eur(m) + ' reviennent sur votre livret, intérêts compris.'; } }
      ]
    }
  ];

  EV.LIST = LIST;
  EV.BY_ID = {};
  LIST.forEach(function (e) { EV.BY_ID[e.id] = e; });

  /* ---------------------------------------------------------
     Déclencheurs — 100 % procédural : voir events.proc.js
     --------------------------------------------------------- */
  var ACTION_CHANCE = 15;
  var NIGHT_CHANCE = 45;

  EV.maybeTrigger = function () {
    var G = NS.G;
    if (G.s.over || G.s.jail || G.s.hospital || G._q) return;
    var chance = ACTION_CHANCE + (G.s.heat > 50 ? 4 : 0);
    if (!G.chance(chance)) return;
    var e = NS.PROC ? NS.PROC.generate(G, G.isNight() ? 'night' : 'day') : null;
    if (e) EV.fire(e);
  };

  EV.nightEvent = function () {
    var G = NS.G;
    if (G.s.over || G.s.jail || G.s.hospital || G._q) return;
    if (!G.chance(NIGHT_CHANCE)) return;
    var e = NS.PROC ? NS.PROC.generate(G, 'night') : null;
    if (e) EV.fire(e);
  };

  /** Événements différés arrivés à échéance */
  EV.firePending = function () {
    var G = NS.G;
    if (G.s.over || G._q) return;
    var due = [], rest = [];
    G.s.pending.forEach(function (p) { (p.day <= G.s.day ? due : rest).push(p); });
    G.s.pending = rest;

    /* placement bloqué */
    if (G.s.flags.lockedDeposit && G.s.flags.lockedDue <= G.s.day) {
      G.s.flags.lockedDue = 0;
      due.push({ id: 'lockeddeposit' });
    }

    due.forEach(function (p) {
      var e = EV.BY_ID[p.id];
      if (!e) return;
      if (e.cond && !e.cond(G)) return;
      EV.fire(e);
    });
  };

  EV.fire = function (e) {
    var G = NS.G;
    if (!e.proc) G.s.seen[e.id] = true;   // les situations composées peuvent revenir, autrement
    NS.UI.event(e);
  };

  EV.resolve = function (e, index) {
    var G = NS.G;
    var c = e.choices[index];
    var out = c.run(G) || '';
    G.log('<b>' + e.ico + ' ' + e.title + '</b> — ' + out, 'event');
    G.checkEnd();
    NS.S.save(G.s);
    return out;
  };

  NS.EV = EV;
})(window.LifeRPG);
