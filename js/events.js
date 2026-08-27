/* =============================================================
   events.js — Événements à choix multiples.
   when   : 'any' | 'day' | 'night'
   cond   : condition d'apparition (souvent liée à votre passé)
   manual : ne se déclenche jamais au hasard, seulement via G.sched()
   ============================================================= */
(function (NS) {
  'use strict';

  var D = NS.D, S = NS.S;
  var EV = {};

  var ACTION_CHANCE = 15;
  var NIGHT_CHANCE = 45;

  var LIST = [

    /* ══════════════════ RUE & SURVIE ══════════════════ */

    {
      id: 'wallet', w: 10, ico: '👛', title: 'Un portefeuille',
      text: 'Un homme pressé sort son téléphone ; le portefeuille glisse de sa poche et tombe sur le bitume. ' +
        'Il continue son chemin sans rien remarquer. Vous voyez la liasse dépasser.',
      choices: [
        {
          l: 'Le rendre', h: 'Honnêteté — réputation légale',
          run: function (G) {
            G.rep('legale', 8); G.add('moral', 12); G.hist('honest');
            if (G.chance(55)) { var r = G.rnd(15, 55); G.cash(r, 'Récompense'); G.sched('wallet_return', G.rnd(6, 14)); return 'Il vous rattrape, incrédule, puis vous tend ' + G.eur(r) + '. « Il y a encore des gens bien. » Il note votre nom.'; }
            return 'Il reprend son bien, marmonne un merci et s’en va. Vous restez avec quelque chose que l’argent n’achète pas.';
          }
        },
        {
          l: 'Le garder', h: 'Argent immédiat — risque', risky: true,
          run: function (G) {
            var m = G.rnd(45, 150);
            G.cash(m, 'Portefeuille'); G.rep('rue', 4); G.rep('legale', -5); G.heat(10); G.add('moral', -6); G.hist('crime');
            if (G.chance(18)) { G.heat(20); G.sched('wallet_camera', G.rnd(3, 7)); return G.eur(m) + ' en liquide. Mais une caméra vous filmait, et vous le savez.'; }
            return 'Vous glissez ' + G.eur(m) + ' dans votre poche. La carte finit dans une bouche d’égout.';
          }
        },
        {
          l: 'Prendre l’argent, rendre le reste', h: 'Compromis', risky: true,
          run: function (G) {
            var m = G.rnd(30, 95);
            G.cash(m, 'Liquide'); G.rep('legale', 2); G.heat(4); G.add('moral', -2);
            return 'Vous déposez le portefeuille vide à la mairie. ' + G.eur(m) + ' dans votre poche, et une conscience à géométrie variable.';
          }
        }
      ]
    },

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
      id: 'spot', w: 8, ico: '😠', title: 'Une place déjà prise',
      cond: function (G) { return S.homeIdx(G.s) <= 2; },
      text: 'Un type massif est installé à l’endroit exact où vous comptiez passer la nuit. ' +
        'Il ne bouge pas. Il attend de voir ce que vous allez faire.',
      choices: [
        { l: 'Lui céder la place', h: 'Aucun risque, moral en baisse', run: function (G) { G.add('moral', -9); G.spendTime(1); return 'Vous marchez encore une heure pour trouver un porche moins abrité.'; } },
        {
          l: 'Vous battre', h: 'Force — réputation de rue', risky: true,
          run: function (G) {
            if (G.chance(35 + G.lvl('force') * 8 + G.gauge('energie') * 0.15)) { G.rep('rue', 9); G.add('sante', -6); G.xp('force', 12); G.add('moral', 5); return 'Deux minutes, pas plus. Il ramasse ses affaires. Le quartier saura qui vous êtes.'; }
            G.add('sante', -22); G.add('moral', -12); G.rep('rue', -2);
            var l = Math.min(G.money(), G.rnd(5, 40)); if (l) G.cash(-l, 'Volé');
            return 'Vous vous réveillez plus tard, seul, avec un goût de sang et les poches vides.';
          }
        },
        {
          l: 'Négocier', h: 'Charisme niveau 3', req: function (G) { return G.lvl('charisme') >= 3; },
          run: function (G) { G.xp('charisme', 10); G.rep('rue', 4); G.aff('marcel', 3); return 'Vous parlez cinq minutes. Il finit par se décaler d’un mètre. « T’as de la tchatche, toi. »'; }
        },
        {
          l: 'Appeler du monde', h: 'Réputation de rue ≥ 40', req: function (G) { return G.repVal('rue') >= 40; },
          run: function (G) { G.rep('rue', 3); G.aff('yasmine', 4); return 'Vous passez deux appels. Six personnes arrivent en dix minutes. Il part sans un mot.'; }
        }
      ]
    },

    {
      id: 'oldfriend', w: 6, ico: '😶', title: 'Quelqu’un vous reconnaît',
      cond: function (G) { return S.homeIdx(G.s) <= 3 && G.day() > 4; },
      text: 'Une silhouette s’arrête net au milieu du trottoir. C’est quelqu’un de votre ancienne vie. ' +
        'Le visage passe par la surprise, puis par une gêne que vous connaissez trop bien.',
      choices: [
        {
          l: 'Lui parler franchement', h: 'Moral, peut-être davantage',
          run: function (G) {
            G.add('moral', 14); G.xp('charisme', 8);
            if (G.chance(45)) { var m = G.rnd(30, 120); G.cash(m, 'Un ancien ami'); return 'Vous parlez vingt minutes. Il vous glisse ' + G.eur(m) + ' et son numéro.'; }
            return 'Vous parlez. Il promet de revenir. Vous savez qu’il ne reviendra pas, mais la conversation faisait du bien.';
          }
        },
        { l: 'Baisser les yeux', h: 'Éviter l’humiliation', run: function (G) { G.add('moral', -11); return 'Vous fixez le sol jusqu’à ce que les pas s’éloignent. C’est plus simple. C’est plus lourd aussi.'; } },
        {
          l: 'Lui demander de l’aide', h: 'Charisme — dignité en jeu',
          run: function (G) {
            if (G.chance(35 + G.lvl('charisme') * 6)) { var m = G.rnd(150, 400); G.cash(m, 'Coup de main'); G.add('moral', -4); return 'Il hésite, puis retire ' + G.eur(m) + ' au distributeur. Vous ne le recroiserez plus jamais.'; }
            G.add('moral', -16); return 'Il s’excuse, invoque un rendez-vous, et part trop vite. Vous restez avec la question posée.';
          }
        }
      ]
    },

    {
      id: 'dog', w: 5, ico: '🐕', once: true, title: 'Un chien vous suit',
      cond: function (G) { return S.homeIdx(G.s) <= 4 && !G.flags('dog'); },
      text: 'Il vous suit depuis trois rues. Maigre, sans collier, il s’assoit dès que vous vous arrêtez.',
      choices: [
        { l: 'Le garder', h: 'Moral chaque nuit, mais il mange', run: function (G) { G.flag('dog', true); G.add('moral', 18); return 'Vous l’appelez comme ça vous vient. Il ne vous quittera plus. Vous non plus.'; } },
        { l: 'Le chasser', h: 'Une bouche de moins', run: function (G) { G.add('moral', -7); return 'Vous criez, il recule, puis il s’assoit plus loin. Il finira par comprendre.'; } }
      ]
    },

    {
      id: 'beggar', w: 6, ico: '🧓', title: 'Plus démuni que vous',
      cond: function (G) { return G.money() >= 20; },
      text: 'Une femme âgée grelotte à l’entrée du parking. Elle ne demande rien. ' +
        'Elle est arrivée dans la rue bien plus tard que vous, et bien moins préparée.',
      choices: [
        { l: 'Lui donner 20 €', h: 'Moral, réputation de rue', req: function (G) { return G.money() >= 20; }, run: function (G) { G.cash(-20, 'Don'); G.add('moral', 16); G.rep('rue', 6); G.aff('marcel', 4); G.hist('helped'); return 'Elle vous regarde comme si vous veniez de la sauver. Peut-être que oui.'; } },
        { l: 'Lui apprendre les combines', h: 'Coûte 2 h, moral & réputation', run: function (G) { G.spendTime(2); G.add('moral', 12); G.rep('rue', 8); G.xp('charisme', 8); G.hist('helped'); return 'Vous lui montrez les bons horaires, les bons trottoirs, l’association. Elle tiendra plus longtemps grâce à vous.'; } },
        { l: 'Passer votre chemin', h: 'Vous n’avez rien à donner', run: function (G) { G.add('moral', -6); return 'Vous continuez. Vous vous répétez que vous n’aviez pas le choix.'; } }
      ]
    },

    {
      id: 'sick', w: 8, ico: '🤒', title: 'Le corps lâche',
      cond: function (G) { return G.gauge('sante') < 45; },
      text: 'La fièvre est montée d’un coup. Vous tenez à peine debout, et le trottoir tangue.',
      choices: [
        { l: 'Aller aux urgences', h: 'Coûte 4 h, soigne beaucoup', run: function (G) { G.spendTime(4); G.add('sante', 32); G.rep('legale', 2); return 'Quatre heures d’attente, une ordonnance, un lit une heure. Vous ressortez debout.'; } },
        { l: 'Prendre des médicaments', h: 'Nécessite des médicaments', req: function (G) { return G.has('medoc'); }, run: function (G) { G.take('medoc', 1); G.add('sante', 30); return 'Vous avalez les comprimés à sec. Deux heures plus tard, la fièvre reflue.'; } },
        { l: 'Appeler Sofia', h: 'Affinité Sofia ≥ 20', req: function (G) { return G.affVal('sofia') >= 20; }, run: function (G) { G.add('sante', 36); G.aff('sofia', 4); return 'Elle arrive en vingt minutes avec une trousse et une engueulade.'; } },
        { l: 'Serrer les dents', h: 'Santé en chute', risky: true, run: function (G) { G.add('sante', -14); G.add('moral', -8); return 'Vous continuez comme si de rien n’était. Le corps note tout, et il présentera la facture.'; } }
      ]
    },

    {
      id: 'drugs', w: 5, ico: '💉', title: 'Une proposition',
      cond: function (G) { return G.repVal('rue') >= 15 && G.gauge('moral') < 45; },
      text: 'On vous propose de quoi ne plus rien sentir pendant quelques heures. Le prix est dérisoire.',
      choices: [
        { l: 'Accepter', h: 'Moral immédiat — dépendance', risky: true, run: function (G) { G.add('moral', 28); G.add('sante', -14); G.flag('addict', (G.flags('addict') || 0) + 1); G.rep('rue', 3); return 'Quelques heures d’absence bienvenue. Et une porte que vous venez d’entrouvrir.'; } },
        { l: 'Refuser', h: 'Vous tenez', run: function (G) { G.add('moral', -4); G.rep('rue', -1); return 'Vous refusez. Ce soir sera long, mais il sera à vous.'; } },
        { l: 'En acheter pour revendre', h: 'Réputation de rue ≥ 25', risky: true, req: function (G) { return G.repVal('rue') >= 25 && G.money() >= 150; }, run: function (G) { G.cash(-150, 'Achat'); G.give('came', 1); G.rep('pegre', 4); return 'Vous repartez avec un lot au lieu d’une dose. C’est un autre métier qui commence.'; } }
      ]
    },

    {
      id: 'journalist', w: 5, ico: '🎤', title: 'Un micro tendu',
      cond: function (G) { return S.homeIdx(G.s) <= 3 && G.day() > 6; },
      text: 'Une équipe de télévision prépare un reportage sur le sans-abrisme. ' +
        'On vous demande votre témoignage, visage flouté ou non.',
      choices: [
        { l: 'Témoigner à visage découvert', h: 'Réputation, dons — et exposition', run: function (G) { var m = G.rnd(40, 140); G.cash(m, 'Dons'); G.rep('legale', 8); G.add('moral', 10); G.xp('charisme', 14); G.flag('exposed', true); return 'Vous parlez sans détour pendant huit minutes. Des inconnus envoient ' + G.eur(m) + ' à l’association pour vous.'; } },
        { l: 'Témoigner anonymement', h: 'Prudent', run: function (G) { G.add('moral', 5); G.xp('charisme', 6); return 'Voix modifiée, visage flouté. Vous dites l’essentiel sans vous exposer.'; } },
        { l: 'Refuser', h: 'Votre dignité vous appartient', run: function (G) { G.add('moral', 3); return 'Il vous reste peu de choses ; le choix de vous taire en fait partie.'; } }
      ]
    },

    {
      id: 'lottery', w: 4, ico: '🎟️', title: 'Un ticket au sol',
      text: 'Un ticket à gratter, à moitié entamé, traîne près de la poubelle du tabac.',
      choices: [
        {
          l: 'Gratter le reste', h: 'Pur hasard',
          run: function (G) {
            var r = G.rnd(1, 100);
            if (r <= 3) { G.cash(300, 'Gain'); return 'Trois cents euros. Vous restez immobile trente secondes, incapable de bouger.'; }
            if (r <= 18) { G.cash(45, 'Gain'); return 'Quarante-cinq euros. La journée change complètement de couleur.'; }
            if (r <= 40) { G.cash(6, 'Gain'); return 'Six euros. C’est déjà deux repas.'; }
            G.add('moral', -2); return 'Perdu, évidemment. Vous le saviez en le ramassant.';
          }
        },
        { l: 'Le laisser', h: 'Rien', run: function (G) { return 'Vous n’avez plus l’énergie d’espérer pour rien.'; } }
      ]
    },

    {
      id: 'winter', w: 7, ico: '❄️', when: 'night', title: 'Vague de froid',
      cond: function (G) { return S.homeIdx(G.s) <= 2; },
      text: 'Moins six annoncés cette nuit. Le plan grand froid est déclenché ; les places partiront vite.',
      choices: [
        { l: 'Foncer au gymnase d’urgence', h: 'Gratuit, il faut arriver tôt', run: function (G) { G.spendTime(2); if (G.chance(60 + G.repVal('rue') * 0.4)) { G.add('sante', 8); G.add('moral', 6); G.flag('shelteredNight', true); return 'Il restait quatre lits de camp. Vous en avez un.'; } G.add('sante', -10); return 'Complet depuis une heure. Vous repartez dans le froid, deux heures perdues.'; } },
        { l: 'Dormir dans le métro', h: 'Risque de contrôle', risky: true, run: function (G) { if (G.chance(45)) { G.heat(8); G.add('energie', -20); return 'La sécurité vous sort à 1 h. Vous finissez la nuit dans un abribus.'; } G.flag('shelteredNight', true); return 'Un couloir technique, une bouche de chaleur. Vous n’êtes pas le seul à le connaître.'; } },
        { l: 'Boire pour tenir', h: 'Nécessite de l’alcool', req: function (G) { return G.has('alcool'); }, run: function (G) { G.take('alcool', 1); G.add('moral', 12); G.add('sante', -18); return 'Vous ne sentez plus le froid. C’est exactement le problème.'; } }
      ]
    },

    /* ══════════════════ POLICE & JUSTICE ══════════════════ */

    {
      id: 'police', w: 9, ico: '🚔', title: 'Contrôle d’identité',
      cond: function (G) { return G.repVal('legale') < 60 || G.heatVal() > 10; },
      text: 'Deux agents descendent de voiture et se dirigent droit vers vous. « Papiers. » Le ton n’est pas une question.',
      choices: [
        {
          l: 'Coopérer poliment', h: 'Sûr, mais coûte du temps',
          run: function (G) {
            G.spendTime(1);
            if (G.heatVal() > 40 && G.chance(35)) { G.arrestCheck('contrôle d’identité', 4); return 'Votre nom sort dans le fichier. Ils vous emmènent.'; }
            if (G.dirtyVal() > 500 && G.chance(30)) { var d = Math.round(G.dirtyVal() * 0.6); G.dirtyCash(-d, 'Saisie'); return 'La palpation trouve la liasse. ' + G.eur(d) + ' saisis, procès-verbal, et beaucoup de questions.'; }
            G.heat(-8); G.aff('duval', 3);
            return 'Vingt minutes debout contre le mur, puis on vous rend vos papiers. Rien de plus.';
          }
        },
        {
          l: 'Partir en courant', h: 'Force & discrétion — très risqué', risky: true,
          run: function (G) {
            var p = 28 + G.lvl('force') * 5 + G.lvl('discretion') * 5 + (G.has('velo') ? 12 : 0) - G.heatVal() * 0.2;
            G.spendEnergy(20);
            if (G.chance(p)) { G.rep('rue', 6); G.heat(12); G.xp('discretion', 10); return 'Trois rues, deux cours d’immeuble, un mur. Vous les semez. Le quartier a vu.'; }
            G.heat(25); G.add('sante', -12);
            G.arrestCheck('refus d’obtempérer', 10);
            return 'Vous ne courez pas assez vite. Le trottoir arrive très vite contre votre visage.';
          }
        },
        {
          l: 'Faire jouer votre réseau', h: 'Affinité Duval ≥ 30', req: function (G) { return G.affVal('duval') >= 30; },
          run: function (G) { G.heat(-20); G.aff('duval', 4); return 'Duval reconnaît son collègue, s’avance. « Laisse, je le connais. » Le contrôle s’arrête là.'; }
        },
        {
          l: 'Présenter de faux papiers', h: 'Consomme les faux papiers', req: function (G) { return G.has('faux'); },
          run: function (G) { G.take('faux', 1); G.heat(-25); return 'Le nom qu’ils saisissent n’est pas le vôtre. Le fichier est vierge. Ils s’excusent presque.'; }
        }
      ]
    },

    {
      id: 'informer', w: 6, ico: '🕵️', title: 'On vous propose un marché',
      cond: function (G) { return G.heatVal() > 30 && G.repVal('pegre') > 15; },
      text: 'Un homme en civil vous attend au café. Il connaît votre nom, vos horaires, et deux ou trois choses ' +
        'que vous pensiez discrètes. « On peut travailler ensemble. »',
      choices: [
        {
          l: 'Devenir indicateur', h: 'Pression effacée — le milieu vous lâche', risky: true,
          run: function (G) {
            G.setHeat(0); G.flag('snitch', true); G.rep('pegre', -25);
            G.affFaction('pegre', -30); G.aff('duval', 15);
            G.sched('snitch_found', G.rnd(8, 20));
            return 'Votre dossier disparaît intégralement. En échange, vous parlerez une fois par mois. Personne ne doit le savoir.';
          }
        },
        { l: 'Refuser sèchement', h: 'Le milieu apprécie', run: function (G) { G.rep('pegre', 8); G.affFaction('pegre', 5); G.heat(8); return 'Vous vous levez sans finir votre café. La nouvelle circule avant le soir : vous n’avez pas parlé.'; } },
        { l: 'Faire mine d’accepter', h: 'Charisme niveau 6 — double jeu', req: function (G) { return G.lvl('charisme') >= 6; }, run: function (G) { if (G.chance(45 + G.lvl('charisme') * 4)) { G.heat(-30); G.rep('pegre', 5); return 'Vous donnez trois noms sans importance. Les deux camps vous croient. Pour l’instant.'; } G.rep('pegre', -20); G.affFaction('pegre', -20); return 'Quelqu’un vous a vu entrer. L’explication ne convaincra personne.'; } }
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
      id: 'trial', w: 5, ico: '👨‍⚖️', title: 'Convocation au tribunal',
      cond: function (G) { return G.s.casier >= 2 && G.heatVal() > 25; },
      text: 'Une audience est fixée dans trois semaines pour des faits anciens. Votre présence est obligatoire.',
      choices: [
        { l: 'Prendre un avocat commis d’office', h: 'Gratuit, aléatoire', run: function (G) { if (G.chance(45)) { G.clearCasier(1); G.heat(-15); return 'Relaxe sur deux des trois chefs. L’avocat n’avait lu le dossier que le matin même, et il a été bon.'; } G.arrestCheck('récidive', 12); return 'Le procureur requiert, le tribunal suit.'; } },
        { l: 'Payer Maître Bellanger', h: '2 000 € — très efficace', req: function (G) { return G.money() >= 2000; }, run: function (G) { G.cash(-2000, 'Honoraires'); G.clearCasier(2); G.heat(-30); G.aff('bell', 8); return 'Elle démonte la procédure en quarante minutes. Relaxe intégrale.'; } },
        { l: 'Ne pas s’y rendre', h: 'Mandat d’arrêt', risky: true, run: function (G) { G.heat(35); G.s.casier++; return 'Un mandat est délivré. Vous vivrez avec, jusqu’à ce que quelqu’un vous contrôle.'; } }
      ]
    },

    {
      id: 'raid', w: 6, when: 'night', ico: '🚨', title: 'Évacuation du squat',
      cond: function (G) { return G.s.home === 'squat'; },
      text: 'Coups sur la porte à 6 h du matin. Un huissier, deux camionnettes, et pas de discussion.',
      choices: [
        { l: 'Partir sans faire d’histoires', h: 'Retour à la rue', run: function (G) { G.s.home = 'street'; G.add('moral', -12); return 'Vous récupérez vos affaires en quatre minutes. Le trottoir vous attendait.'; } },
        { l: 'Résister avec les autres', h: 'Réputation de rue — risqué', risky: true, run: function (G) { G.rep('rue', 10); G.heat(15); G.add('sante', -10); if (G.chance(40)) return 'Le collectif tient bon, la presse arrive, l’évacuation est reportée. Vous restez.'; G.s.home = 'street'; G.arrestCheck('occupation illégale', 6); return 'Trois heures de face-à-face, puis les boucliers avancent.'; } }
      ]
    },

    {
      id: 'searchhome', w: 5, ico: '🚪', title: 'Perquisition',
      cond: function (G) { return G.heatVal() > 45 && (G.dirtyVal() > 300 || G.has('arme')); },
      text: 'Six heures du matin. On ne frappe pas, on annonce. Ils ont un mandat et ils savent où chercher.',
      choices: [
        {
          l: 'Ouvrir et coopérer', h: 'Saisie probable',
          run: function (G) {
            var d = G.dirtyVal(); if (d) G.dirtyCash(-d, 'Saisie');
            if (G.has('arme')) { G.take('arme', 1); G.arrestCheck('détention d’arme', 25); return G.eur(d) + ' saisis et l’arme retrouvée sous le plancher.'; }
            G.heat(-15);
            return d ? G.eur(d) + ' saisis. Rien d’autre à leur donner.' : 'Ils ne trouvent rien. Deux heures perdues, et un message reçu.';
          }
        },
        {
          l: 'Tout faire disparaître d’abord', h: 'Discrétion — quelques secondes', risky: true,
          run: function (G) {
            if (G.chance(25 + G.lvl('discretion') * 7)) { G.heat(-25); return 'Conduit de ventilation, sac lesté, chasse d’eau. Ils repartent bredouilles et furieux.'; }
            var d2 = G.dirtyVal(); if (d2) G.dirtyCash(-d2, 'Saisie');
            G.arrestCheck('entrave à la justice', 20);
            return 'Ils entrent pendant que vous êtes encore accroupi devant le placard.';
          }
        },
        { l: 'Sortir par les toits', h: 'Discrétion élevée requise', req: function (G) { return G.lvl('discretion') >= 6; }, run: function (G) { G.heat(20); G.rep('pegre', 6); G.add('energie', -25); return 'Vous êtes trois immeubles plus loin quand ils enfoncent la porte. Ils saisissent le logement, pas vous.'; } }
      ]
    },

    /* ══════════════════ TRAVAIL & CARRIÈRE ══════════════════ */

    {
      id: 'recruiter', w: 7, ico: '💼', title: 'Un regard qui s’attarde',
      cond: function (G) { return G.apparence() >= 55 && G.s.edu >= 2 && !G.s.job; },
      text: 'Une femme vous observe depuis le comptoir depuis un moment. Elle finit par s’approcher, carte de visite entre deux doigts.',
      choices: [
        {
          l: 'Vous vendre', h: 'Charisme — embauche possible',
          run: function (G) {
            if (G.chance(35 + G.lvl('charisme') * 7 + G.apparence() * 0.2)) {
              var pool = D.JOBS.filter(function (j) { return !G.checkReq(j.req) && G.s.casier <= (j.casierMax === undefined ? 99 : j.casierMax); });
              if (pool.length) { var j = pool[pool.length - 1]; G.hire(j.id); G.xp('charisme', 15); return 'Vous parlez dix minutes sans jamais mentionner la rue. Elle vous embauche comme ' + j.n + '.'; }
            }
            G.xp('charisme', 8);
            return 'Elle écoute, hoche la tête, prend votre nom. « Rappelez-moi quand vous aurez le dossier complet. »';
          }
        },
        { l: 'Prendre la carte, sans plus', h: 'Réputation légale +', run: function (G) { G.rep('legale', 4); return 'Vous glissez la carte dans votre poche. Un jour, peut-être.'; } }
      ]
    },

    {
      id: 'boss', w: 6, ico: '😤', title: 'Une remarque de trop',
      cond: function (G) { return !!G.s.job && G.hist('shift', 0) > 5; },
      text: 'Devant l’équipe, votre responsable vous reprend sur un ton qui ne se discute pas. ' +
        'Il ajoute une phrase sur « les gens comme vous ».',
      choices: [
        { l: 'Encaisser', h: 'Moral en baisse, poste conservé', run: function (G) { G.add('moral', -14); G.rep('legale', 1); return 'Vous ne dites rien. Vous finissez le service. Vous encaissez, comme toujours.'; } },
        { l: 'Répondre calmement', h: 'Charisme — respect ou porte', run: function (G) { if (G.chance(35 + G.lvl('charisme') * 7)) { G.add('moral', 12); G.rep('legale', 4); G.xp('charisme', 12); return 'Vous répondez en six mots, sans hausser la voix. Il s’excuse le lendemain devant tout le monde.'; } G.quitJob(); G.add('moral', -8); return 'Le ton monte. On vous demande de rendre votre badge le soir même.'; } },
        { l: 'Le frapper', h: 'Fin du contrat, réputation de rue', risky: true, run: function (G) { G.quitJob(); G.rep('rue', 8); G.rep('legale', -12); G.heat(15); G.add('moral', 8); G.arrestCheck('violences', 6); return 'Un seul coup. Le silence dans l’atelier dure trois secondes, et vous vous sentez incroyablement bien pendant deux.'; } }
      ]
    },

    {
      id: 'promo', w: 6, ico: '📋', title: 'Une promotion se libère',
      cond: function (G) { return !!G.s.job && G.hist('shift', 0) > 12; },
      text: 'Un poste s’ouvre au-dessus du vôtre. Vous n’êtes pas le seul candidat, et l’autre candidat est le neveu de quelqu’un.',
      choices: [
        { l: 'Monter un dossier solide', h: 'Intelligence', run: function (G) { G.spendTime(2); if (G.chance(30 + G.lvl('intelligence') * 7)) { G.s.job.shifts += 15; G.rep('legale', 6); return 'Chiffres, comparatifs, plan sur six mois. Le poste est pour vous — et votre ancienneté fait un bond.'; } G.add('moral', -10); return 'Votre dossier était meilleur. Le neveu a le poste.'; } },
        { l: 'Discréditer l’autre candidat', h: 'Efficace et sale', risky: true, run: function (G) { if (G.chance(45 + G.lvl('charisme') * 5)) { G.s.job.shifts += 15; G.rep('legale', 2); G.add('moral', -6); G.hist('dirty'); return 'Deux phrases bien placées à la bonne personne. Il retire sa candidature de lui-même.'; } G.rep('legale', -8); G.quitJob(); return 'La manœuvre remonte jusqu’à la direction. C’est vous qui partez.'; } },
        { l: 'Ne pas postuler', h: 'Rien ne change', run: function (G) { G.add('moral', -4); return 'Vous laissez passer. Vous vous en voudrez la semaine prochaine.'; } }
      ]
    },

    {
      id: 'diploma_fraud', w: 5, ico: '📜', title: 'Un diplôme à vendre',
      cond: function (G) { return G.repVal('pegre') >= 10 && G.money() >= 900 && (G.s.edu < 3 || (G.s.filiere && G.s.filiereLvl < 3)); },
      text: 'Quelqu’un propose des diplômes qui passent toutes les vérifications sauf une : celle qu’on ne fait jamais.',
      choices: [
        {
          l: 'Acheter le diplôme (900 €)', h: 'Un niveau immédiat — risque durable', risky: true,
          req: function (G) { return G.money() >= 900; },
          run: function (G) {
            G.cash(-900, 'Faux diplôme');
            var label;
            if (G.s.edu < 3) {
              G.s.edu++; G.s.eduProg = 0;
              label = D.EDU[G.s.edu].n;
              G.flag('fakeDiploma', { kind: 'bac', edu: G.s.edu - 1 });
            } else {
              var f = D.FILIERE[G.s.filiere];
              G.s.filiereLvl++; G.s.filiereProg = 0;
              label = f.levels[G.s.filiereLvl - 1].n;
              G.flag('fakeDiploma', { kind: 'filiere', lvl: G.s.filiereLvl - 1 });
            }
            G.sched('diploma_check', G.rnd(15, 40));
            return 'Papier filigrané, relevé de notes, numéro d’enregistrement. Vous êtes désormais titulaire de ' + label + '.';
          }
        },
        { l: 'Refuser', h: 'Le vôtre aura de la valeur', run: function (G) { G.xp('intelligence', 12); return 'Vous refusez. Ce que vous apprendrez vraiment ne pourra pas être annulé par une vérification.'; } }
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

    /* ══════════════════ ARGENT & FINANCE ══════════════════ */

    {
      id: 'scam', w: 6, ico: '🤝', title: 'Une opportunité',
      cond: function (G) { return G.money() >= 150; },
      text: 'Un homme très bien habillé vous parle d’un placement. Rendement garanti, en quarante-huit heures.',
      choices: [
        { l: 'Investir 150 €', h: 'Le double… ou rien', risky: true, req: function (G) { return G.money() >= 150; }, run: function (G) { G.cash(-150, 'Placement'); if (G.chance(30 + G.lvl('intelligence') * 4)) { G.cash(380, 'Rendement'); G.xp('intelligence', 12); return 'Contre toute attente, il revient deux jours plus tard avec ' + G.eur(380) + '.'; } G.add('moral', -14); G.xp('intelligence', 18); return 'Il ne revient jamais. Cent cinquante euros de leçon, payée comptant.'; } },
        { l: 'Poser des questions précises', h: 'Intelligence niveau 4', req: function (G) { return G.lvl('intelligence') >= 4; }, run: function (G) { G.xp('intelligence', 15); G.xp('charisme', 8); return 'Trois questions suffisent. Il change de trottoir. Savoir lire une arnaque, c’est déjà du capital.'; } },
        { l: 'Lui piquer son fichier clients', h: 'Discrétion — matière première', risky: true, req: function (G) { return G.lvl('discretion') >= 4; }, run: function (G) { if (G.chance(40 + G.lvl('discretion') * 6)) { G.dirtyCash(G.rnd(300, 900), 'Fichier revendu'); G.rep('pegre', 5); return 'Son carnet est resté sur la table pendant qu’il commandait. Il vaut plus cher que son placement.'; } G.add('sante', -10); return 'Il vous voit faire. Il n’appelle pas la police — il appelle deux amis.'; } },
        { l: 'Refuser poliment', h: 'Rien ne change', run: function (G) { return 'Vous déclinez. Il hausse les épaules et cherche déjà quelqu’un d’autre.'; } }
      ]
    },

    {
      id: 'crash', w: 6, ico: '💥', when: 'night', title: 'Le marché décroche',
      cond: function (G) { return S.portfolio(G.s) > 500; },
      text: 'Les places asiatiques ont ouvert en chute libre. Votre portefeuille perd de la valeur pendant que vous lisez.',
      choices: [
        { l: 'Tout vendre immédiatement', h: 'Limiter les pertes', run: function (G) { Object.keys(G.s.market.hold).forEach(function (id) { G.sellAsset(id, 1); }); G.add('moral', -8); return 'Vous sortez de tout à l’ouverture. Vous ne saurez jamais si c’était la bonne décision.'; } },
        { l: 'Ne rien faire', h: 'Tenir la position', run: function (G) { G.xp('intelligence', 12); G.add('moral', -5); return 'Vous fermez l’application. Ce sera la partie la plus difficile de la semaine.'; } },
        { l: 'Renforcer', h: 'Acheter quand tout baisse', req: function (G) { return G.s.bank.checking >= 500; }, run: function (G) { var a = G.pick(D.ASSETS.filter(function (x) { return x.id !== 'oblig'; })); G.buyAsset(a.id, Math.round(G.s.bank.checking * 0.4)); G.xp('intelligence', 20); return 'Vous achetez pendant que tout le monde vend. C’est soit du courage, soit de l’inconscience.'; } }
      ]
    },

    {
      id: 'audit', w: 6, ico: '🧾', title: 'Contrôle fiscal',
      cond: function (G) { return S.netWorth(G.s) > 60000; },
      text: 'Un courrier recommandé. L’administration s’intéresse à la progression rapide de votre patrimoine.',
      choices: [
        { l: 'Coopérer pleinement', h: 'Coûteux mais propre', run: function (G) { var f = Math.round(G.money() * 0.08); G.cash(-f, 'Régularisation'); G.rep('legale', 8); return 'Vous ouvrez tous les livres. ' + G.eur(f) + ' de régularisation, et un dossier désormais irréprochable.'; } },
        { l: 'Optimiser agressivement', h: 'Intelligence niveau 6', risky: true, req: function (G) { return G.lvl('intelligence') >= 6; }, run: function (G) { if (G.chance(55 + G.lvl('intelligence') * 3)) { G.xp('intelligence', 25); return 'Montages, provisions, reports. Le contrôle se solde par un redressement nul.'; } var f = Math.round(G.money() * 0.22); G.cash(-f, 'Redressement'); G.rep('legale', -12); G.heat(15); return 'L’inspecteur n’est pas dupe. ' + G.eur(f) + ' de redressement.'; } },
        { l: 'Faire disparaître l’argent sale', h: 'Nécessite 2 000 € sales', req: function (G) { return G.dirtyVal() >= 2000; }, run: function (G) { var d = G.dirtyVal(); G.dirtyCash(-Math.round(d * 0.5), 'Mise à l’abri'); G.heat(-10); return 'La moitié part à l’étranger le temps du contrôle. Vous ne la reverrez pas entièrement.'; } }
      ]
    },

    {
      id: 'investor', w: 6, ico: '📈', title: 'Un investisseur intéressé',
      cond: function (G) { return G.s.biz.length > 0; },
      text: 'Un fonds vous contacte : il veut entrer au capital de votre société. L’argent est immédiat, la liberté un peu moins.',
      choices: [
        { l: 'Accepter la levée', h: 'Cash immédiat, revenus réduits', run: function (G) { var b = G.s.biz[0], d = D.BIZI[b.id]; var m = Math.round(d.cost * b.lvl * 0.9); G.cash(m, 'Levée de fonds'); if (b.lvl > 1) b.lvl--; G.aff('vidal', 8); G.rep('legale', 5); return G.eur(m) + ' sur le compte. En échange, vous cédez une part de votre outil.'; } },
        { l: 'Refuser et garder le contrôle', h: 'Réputation légale +', run: function (G) { G.rep('legale', 6); G.xp('intelligence', 12); G.aff('vidal', 4); return '« Je préfère cent pour cent de ce que je construis. » Alex sourit.'; } }
      ]
    },

    {
      id: 'bankcall', w: 6, ico: '☎️', title: 'Votre conseillère vous appelle',
      cond: function (G) { return G.s.bank.open && G.s.bank.savings > 2000; },
      text: 'Clara Behn vous propose un placement maison : rendement supérieur au livret, capital bloqué trente jours.',
      choices: [
        { l: 'Placer 30 % du livret', h: 'Rendement supérieur', run: function (G) { var m = Math.round(G.s.bank.savings * 0.3); G.s.bank.savings -= m; G.flag('lockedDeposit', (G.flags('lockedDeposit') || 0) + Math.round(m * 1.22)); G.flag('lockedDue', G.day() + 30); G.aff('clara', 6); return G.eur(m) + ' bloqués trente jours. Vous récupérerez ' + G.eur(Math.round(m * 1.22)) + '.'; } },
        { l: 'Refuser poliment', h: 'Liquidité conservée', run: function (G) { G.aff('clara', -2); return 'Vous déclinez. Elle note quelque chose dans votre dossier.'; } },
        { l: 'Lui demander conseil pour la bourse', h: 'Intelligence + affinité', run: function (G) { G.xp('intelligence', 18); G.aff('clara', 5); if (G.marketOpen()) { G.marketTip(); return 'Elle ne dit rien d’illégal. Elle parle de « rotation sectorielle » avec insistance. Vous comprenez.'; } return 'Elle vous explique comment tout cela fonctionne. Il vous manque encore un compte et un téléphone.'; } }
      ]
    },

    {
      id: 'tipster', w: 5, ico: '📊', title: 'Une rumeur de marché',
      cond: function (G) { return G.marketOpen(); },
      text: 'Sur un forum, quelqu’un affirme savoir. Les captures d’écran sont convaincantes, ce qui est mauvais signe.',
      choices: [
        { l: 'Suivre la rumeur', h: 'Un actif bougera demain — dans un sens ou l’autre', risky: true, run: function (G) { var a = G.marketTip(); return 'Vous notez le nom : <b>' + a + '</b>. Demain, ce titre bougera fortement. Personne ne vous a dit dans quel sens.'; } },
        { l: 'Vérifier les sources', h: 'Intelligence niveau 5', req: function (G) { return G.lvl('intelligence') >= 5; }, run: function (G) { G.xp('intelligence', 20); if (G.chance(60)) { var a = G.marketTip(); G.s.market.tip.up = true; return 'Trois recoupements plus tard, l’information tient. <b>' + a + '</b> montera demain.'; } return 'Le compte a été créé il y a six jours. Vous n’y touchez pas — et vous avez appris à vérifier.'; } },
        { l: 'Ignorer', h: 'Rien', run: function (G) { return 'Vous fermez l’onglet. C’est probablement la meilleure décision financière de la semaine.'; } }
      ]
    },

    {
      id: 'debtcollect', w: 6, ico: '📮', title: 'Recouvrement',
      cond: function (G) { return S.debtTotal(G.s) > 1000; },
      text: 'Une société de recouvrement a racheté votre dette. Leur méthode est simple : appeler tous les jours.',
      choices: [
        { l: 'Négocier un échéancier', h: 'Charisme — allège la dette', run: function (G) { if (G.chance(40 + G.lvl('charisme') * 6)) { if (G.s.bank.loan) { G.s.bank.loan.amount = Math.round(G.s.bank.loan.amount * 0.85); G.s.bank.loan.daily = Math.round(G.s.bank.loan.daily * 0.7); } G.bankScore(3); return 'Vous obtenez un abattement de 15 % et des mensualités allégées.'; } G.add('moral', -8); return 'Le conseiller récite un script. Aucune marge de manœuvre.'; } },
        { l: 'Changer de numéro', h: 'Gagner du temps', run: function (G) { G.bankScore(-6); G.add('moral', 4); return 'Le téléphone se tait. La dette, elle, continue de courir.'; } },
        { l: 'Tout rembourser maintenant', h: 'Solder la dette bancaire', req: function (G) { return G.s.bank.loan && (G.money() + G.s.bank.checking) >= G.s.bank.loan.amount; }, run: function (G) { G.repayLoan(); return 'Vous soldez tout d’un coup. Le silence qui suit vaut chaque euro.'; } }
      ]
    },

    /* ══════════════════ MILIEU ══════════════════ */

    {
      id: 'karimjob', w: 7, ico: '📦', title: 'Un colis à déplacer',
      cond: function (G) { return G.affVal('karim') >= 10; },
      text: 'Karim vous appelle : « Rien de compliqué. Tu prends, tu déposes, tu ne regardes pas. »',
      choices: [
        { l: 'Accepter', h: '200–500 € sales · pression policière', risky: true, run: function (G) { var m = G.rnd(200, 500); G.dirtyCash(m, 'Course'); G.heat(20); G.rep('pegre', 5); G.aff('karim', 8); G.hist('crime'); return 'Quarante minutes de métro avec un sac que vous n’ouvrez pas. ' + G.eur(m) + '.'; } },
        { l: 'Regarder dans le sac', h: 'Savoir a un prix', risky: true, run: function (G) { G.aff('karim', -12); if (G.chance(50)) { G.rep('pegre', -5); return 'Vous savez maintenant ce que vous transportiez. Karim l’apprendra, parce que le scellé est cassé.'; } G.dirtyCash(G.rnd(400, 900), 'Prélèvement'); G.rep('pegre', -8); return 'Vous en prélevez une partie. Vous venez de vous faire un ennemi patient.'; } },
        { l: 'Refuser', h: 'Affinité en baisse', run: function (G) { G.aff('karim', -6); return '« Comme tu veux. » Il ne rappellera pas de sitôt.'; } }
      ]
    },

    {
      id: 'turf', w: 6, when: 'night', ico: '⚔️', title: 'Un territoire contesté',
      cond: function (G) { return G.repVal('pegre') >= 30; },
      text: 'Une équipe d’un autre quartier s’installe sur vos points. Ils sont six. Ils savent que vous savez.',
      choices: [
        { l: 'Négocier un partage', h: 'Charisme — moins de revenus', run: function (G) { if (G.chance(40 + G.lvl('charisme') * 6)) { G.rep('pegre', 4); return 'Vous coupez la poire : trois points chacun. Personne n’est content, personne ne saigne.'; } G.rep('pegre', -8); return 'Ils écoutent, puis prennent tout. Vous avez montré que vous préfériez parler.'; } },
        { l: 'Répondre par la force', h: 'Bruno aide s’il vous apprécie', risky: true, run: function (G) { var p = 30 + G.lvl('force') * 7 + (G.affVal('bruno') >= 40 ? 20 : 0); if (G.chance(p)) { G.rep('pegre', 14); G.rep('rue', 8); G.heat(18); G.add('sante', -12); return 'Une nuit, deux voitures brûlées, aucun blessé grave. Le quartier reste à vous.'; } G.add('sante', -30); G.rep('pegre', -10); G.heat(22); return 'Vous êtes en infériorité dès la première minute. On vous laisse par terre en guise de message.'; } },
        { l: 'Les dénoncer anonymement', h: 'Efficace et déshonorant', risky: true, run: function (G) { G.heat(-5); G.rep('pegre', -12); G.hist('dirty'); if (G.chance(35)) { G.affFaction('pegre', -20); return 'La descente a lieu jeudi. Trois jours plus tard, on sait qui a appelé.'; } return 'La descente a lieu jeudi. Personne ne remonte jusqu’à vous. Le territoire est libre.'; } }
      ]
    },

    {
      id: 'stash', w: 5, when: 'night', ico: '🎒', title: 'Une planque à garder',
      cond: function (G) { return G.repVal('pegre') >= 20 && S.home(G.s).safe >= 2; },
      text: 'On vous demande de garder un sac chez vous pendant une semaine. On ne précise pas le contenu, ' +
        'seulement le prix : mille euros.',
      choices: [
        { l: 'Accepter', h: '1 000 € sales · risque de perquisition', risky: true, run: function (G) { G.dirtyCash(1000, 'Garde'); G.heat(12); G.rep('pegre', 8); G.sched('stash_back', 7); return 'Le sac est lourd et vous le posez au fond d’un placard sans le rouvrir.'; } },
        { l: 'Refuser', h: 'Prudent', run: function (G) { G.rep('pegre', -4); return '« Pas de souci. » Le ton dit autre chose.'; } }
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
      id: 'crewoffer', w: 6, when: 'night', ico: '🎯', title: 'Une place dans l’équipe',
      cond: function (G) { return G.repVal('pegre') >= 35 && G.hist('crime', 0) >= 8; },
      text: 'Bruno vous propose une place sur un coup préparé depuis trois mois. La part est de dix mille.',
      choices: [
        { l: 'Y aller', h: 'Gros gain — grosse peine', risky: true, run: function (G) { G._crime = { sentence: 70 }; var ok = G.crimeRoll(45, { force: 3, discretion: 4, pegre: 0.3, crew: ['bruno', 'nadia'] }); G._crime = null; if (ok.win) { G.dirtyCash(G.rnd(8000, 13000), 'Part du coup'); G.rep('pegre', 15); G.aff('bruno', 15); G.heat(30); G.hist('bigscore'); return 'Tout se passe exactement comme sur le plan dessiné à la craie. Votre part est comptée dans une camionnette.'; } G.heat(50); G.add('sante', -25); G.aff('bruno', -8); G.arrestCheck('vol en bande organisée', 70); return 'Le troisième homme n’était pas fiable. On l’a su trop tard.'; } },
        { l: 'Refuser', h: 'Bruno comprend, à moitié', run: function (G) { G.aff('bruno', -10); G.rep('pegre', -3); return '« Pas de problème. » Il ne repropose jamais deux fois.'; } },
        { l: 'Demander à voir le plan d’abord', h: 'Intelligence — réduit le risque', req: function (G) { return G.lvl('intelligence') >= 5; }, run: function (G) { G.aff('bruno', 5); G.flag('planSeen', true); G.xp('intelligence', 15); return 'Vous relevez deux failles. Bruno vous écoute et décale le coup d’une semaine. Vous êtes devenu utile autrement.'; } }
      ]
    },

    {
      id: 'rival', w: 5, ico: '👤', title: 'Quelqu’un vous en veut',
      cond: function (G) { return G.hist('betray', 0) > 0 || G.hist('dirty', 0) > 1; },
      text: 'Vous sentez une présence derrière vous depuis deux rues. Ce n’est pas la police.',
      choices: [
        { l: 'Faire face', h: 'Force', risky: true, run: function (G) { if (G.chance(35 + G.lvl('force') * 8)) { G.rep('rue', 6); G.add('sante', -8); return 'Vous vous retournez d’un coup. L’autre hésite, puis recule. La réputation se construit comme ça.'; } G.add('sante', -25); var l = Math.min(G.money(), G.rnd(50, 300)); if (l) G.cash(-l, 'Volé'); return 'Deux contre un. Vous perdez ' + G.eur(l) + ' et beaucoup de certitudes.'; } },
        { l: 'Semer par les ruelles', h: 'Discrétion', run: function (G) { if (G.chance(40 + G.lvl('discretion') * 8)) { G.xp('discretion', 12); return 'Trois virages, une cour, un passage sous un porche. Plus personne.'; } G.add('energie', -25); G.add('moral', -10); return 'Vous courez vingt minutes pour rien : ils connaissent le quartier mieux que vous.'; } },
        { l: 'Payer pour régler ça', h: '800 €', req: function (G) { return G.money() >= 800; }, run: function (G) { G.cash(-800, 'Règlement'); G.add('moral', -5); return 'Huit cents euros et l’affaire est close. Vous détestez que ça marche aussi bien.'; } }
      ]
    },

    /* ══════════════════ RELATIONS ══════════════════ */

    {
      id: 'assoc', w: 7, ico: '📋', title: 'Une place en formation',
      cond: function (G) { return G.affVal('sofia') >= 15 && G.eduLeft(); },
      text: 'Sofia vous attend avec un dossier. « Il reste une place sur un module financé. ' +
        'Il faut être là tous les jours, et il faut être à l’heure. »',
      choices: [
        { l: 'Accepter', h: 'Progression de formation offerte', run: function (G) { G.addEduProgress(3); G.xp('intelligence', 30); G.rep('legale', 5); G.aff('sofia', 6); return 'Trois séances d’avance, gratuitement. Sofia note votre nom dans son carnet, comme une promesse.'; } },
        { l: 'Refuser — pas le temps', h: 'Affinité en baisse', run: function (G) { G.aff('sofia', -8); G.add('moral', -3); return 'Elle referme le dossier sans commentaire. C’est le pire commentaire possible.'; } }
      ]
    },

    {
      id: 'marcelill', w: 5, ico: '🧔', title: 'Marcel ne va pas bien',
      cond: function (G) { return G.affVal('marcel') >= 25; },
      text: 'Marcel tousse depuis trois jours et refuse de bouger. Il dit que ça passera.',
      choices: [
        { l: 'L’emmener de force aux urgences', h: 'Coûte 4 h', run: function (G) { G.spendTime(4); G.aff('marcel', 18); G.rep('rue', 6); G.add('moral', 8); G.hist('helped'); return 'Il râle pendant quatre heures, puis il se tait quand le médecin parle de pneumonie.'; } },
        { l: 'Lui donner vos médicaments', h: 'Nécessite des médicaments', req: function (G) { return G.has('medoc'); }, run: function (G) { G.take('medoc', 1); G.aff('marcel', 22); G.add('moral', 10); G.hist('helped'); return 'Il prend la boîte et la range dans sa veste. « Je te les rendrai. » Vous savez que non.'; } },
        { l: 'Ne rien faire', h: 'Chacun sa survie', run: function (G) { G.aff('marcel', -15); G.add('moral', -10); return 'Vous passez votre chemin. C’est la règle, ici. Ça ne la rend pas plus légère.'; } }
      ]
    },

    {
      id: 'yasminetrouble', w: 6, ico: '🧕', title: 'Yasmine a des ennuis',
      cond: function (G) { return G.affVal('yasmine') >= 20; },
      text: 'Elle vous appelle à 23 h. Elle doit 400 € à quelqu’un et elle a peur.',
      choices: [
        { l: 'Payer pour elle', h: '400 €', req: function (G) { return G.money() >= 400; }, run: function (G) { G.cash(-400, 'Dette de Yasmine'); G.aff('yasmine', 30); G.add('moral', 12); G.hist('helped'); return 'Vous réglez sans poser de question. Elle ne dit pas merci ; elle vous serre le bras trop fort.'; } },
        { l: 'Aller parler au créancier', h: 'Réputation & force', risky: true, run: function (G) { if (G.chance(35 + G.lvl('force') * 6 + G.repVal('rue') * 0.4)) { G.aff('yasmine', 25); G.rep('rue', 8); return 'Vous expliquez calmement que la dette est annulée. On vous croit, parce qu’on vous connaît.'; } G.add('sante', -18); G.aff('yasmine', 8); return 'La discussion tourne mal. La dette reste, et vous boitez.'; } },
        { l: 'Lui dire de se débrouiller', h: 'Relation abîmée', run: function (G) { G.aff('yasmine', -30); G.add('moral', -12); return 'Vous raccrochez. Le silence à l’autre bout dure trois secondes avant la tonalité.'; } }
      ]
    },

    {
      id: 'sofiaangry', w: 5, ico: '😔', title: 'Sofia a appris',
      cond: function (G) { return G.hist('crime', 0) >= 6 && G.affVal('sofia') >= 15; },
      text: 'Elle sait ce que vous faites la nuit. Elle ne crie pas. Elle demande simplement pourquoi.',
      choices: [
        { l: 'Dire la vérité', h: 'Affinité préservée en partie', run: function (G) { G.aff('sofia', -8); G.add('moral', 6); return 'Vous expliquez sans vous justifier. Elle écoute jusqu’au bout. « Je continue à t’aider. Mais je ne cautionne pas. »'; } },
        { l: 'Mentir', h: 'Charisme — tout ou rien', risky: true, run: function (G) { if (G.chance(30 + G.lvl('charisme') * 6)) { G.aff('sofia', 3); return 'Elle veut vous croire. Vous en profitez. Ce n’est pas votre plus beau moment.'; } G.aff('sofia', -30); return 'Elle attendait autre chose. Elle range son carnet et s’en va.'; } },
        { l: 'Promettre d’arrêter', h: 'Engagement contraignant', run: function (G) { G.aff('sofia', 12); G.flag('promiseSofia', G.day() + 20); return 'Vous promettez. Elle note la date. Si vous replongez avant vingt jours, elle le saura.'; } }
      ]
    },

    {
      id: 'duvalwarn', w: 5, ico: '👮', title: 'Duval vous prend à part',
      cond: function (G) { return G.affVal('duval') >= 20 && G.heatVal() > 30; },
      text: '« Je vais te dire un truc une seule fois. Ton nom est sorti en réunion ce matin. »',
      choices: [
        { l: 'Écouter et lever le pied', h: 'Pression policière −25', run: function (G) { G.heat(-25); G.aff('duval', 6); return 'Vous ne sortez pas de la semaine. Le nom retombe au fond de la pile.'; } },
        { l: 'Lui demander qui a parlé', h: 'Information sensible', run: function (G) { G.aff('duval', -8); if (G.chance(50)) { G.rep('pegre', 6); return 'Il vous donne une initiale. C’est peu, et c’est énorme.'; } return '« Ne me demande jamais ça. » Il se lève et part.'; } },
        { l: 'Faire le malin', h: 'Rompre le lien', run: function (G) { G.aff('duval', -25); G.heat(10); return 'Vous répondez du tac au tac. Il hoche la tête, très lentement, et vous laisse là.'; } }
      ]
    },

    {
      id: 'lucienpast', w: 4, ico: '🎩', once: true, title: 'Ce que Lucien a perdu',
      cond: function (G) { return G.affVal('lucien') >= 35; },
      text: 'Il vous montre une photo pliée en quatre : une maison, deux enfants, un chien. « Trois signatures. C’est tout ce qu’il a fallu. »',
      choices: [
        { l: 'Écouter jusqu’au bout', h: 'Affinité et savoir', run: function (G) { G.spendTime(2); G.aff('lucien', 20); G.xp('intelligence', 60); G.add('moral', -4); return 'Deux heures. Il vous explique exactement comment il a tout perdu. C’est le meilleur cours de finance que vous aurez jamais.'; } },
        { l: 'Lui proposer de repartir', h: 'Coûteux, généreux', req: function (G) { return G.money() >= 3000; }, run: function (G) { G.cash(-3000, 'Pour Lucien'); G.aff('lucien', 35); G.add('moral', 25); G.rep('rue', 10); G.hist('helped'); return 'Vous lui payez un logement et un costume. Il refuse deux fois, accepte la troisième, et pleure une seule fois.'; } },
        { l: 'Changer de sujet', h: 'Vous n’êtes pas prêt', run: function (G) { G.aff('lucien', -6); return 'Il replie la photo sans commentaire et parle des taux directeurs.'; } }
      ]
    },

    /* ══════════════════ NUIT ══════════════════ */

    {
      id: 'storm', w: 6, when: 'night', ico: '🌧️', title: 'Tempête',
      cond: function (G) { return S.homeIdx(G.s) <= 2; },
      text: 'La pluie tombe à l’horizontale depuis deux heures. Votre carton n’existe déjà plus.',
      choices: [
        { l: 'Dormir dans un hall d’immeuble', h: 'Risque de police', risky: true, run: function (G) { if (G.chance(35)) { G.heat(8); G.add('energie', -20); G.add('moral', -8); return 'Un résident appelle la police. On vous met dehors à 3 h du matin.'; } G.add('sante', 4); G.flag('shelteredNight', true); return 'Personne ne descend. Vous dormez au sec, contre les boîtes aux lettres.'; } },
        { l: 'Payer une nuit au foyer', h: '8 €', req: function (G) { return G.money() >= 8; }, run: function (G) { G.cash(-8, 'Foyer'); G.add('sante', 6); G.add('moral', 8); G.add('hygiene', 15); return 'Une douche chaude, un lit, un radiateur. Huit euros n’ont jamais autant valu.'; } },
        { l: 'Rester dehors', h: 'Santé en chute', risky: true, run: function (G) { G.add('sante', -18); G.add('moral', -10); G.add('hygiene', -12); return 'Vous passez la nuit trempé jusqu’aux os. Le froid entre et ne repart pas.'; } }
      ]
    },

    {
      id: 'theft', w: 6, when: 'night', ico: '🎒', title: 'Vos affaires ont disparu',
      cond: function (G) { return S.homeIdx(G.s) <= 2 && !G.has('sac') && Object.keys(G.s.inv).length > 1; },
      text: 'Vous vous réveillez. Le sac où vous rangiez tout n’est plus là.',
      choices: [
        {
          l: 'Faire le tour du quartier', h: 'Coûte 2 h, récupération possible',
          run: function (G) {
            G.spendTime(2);
            if (G.chance(35 + G.repVal('rue') * 0.3)) { G.rep('rue', 3); return 'Vous retrouvez vos affaires éparpillées derrière un container. L’essentiel est là.'; }
            var keys = Object.keys(G.s.inv).filter(function (k) { return !D.ITEM[k].keep; });
            if (keys.length) { var k = G.pick(keys); G.take(k, 99); G.add('moral', -10); return 'Rien. Vous avez perdu vos ' + D.ITEM[k].n.toLowerCase() + ' pour de bon.'; }
            return 'Rien. Il n’y avait pas grand-chose, mais c’était tout ce que vous aviez.';
          }
        },
        { l: 'Laisser tomber', h: 'Perte définitive', run: function (G) { var keys = Object.keys(G.s.inv).filter(function (k) { return !D.ITEM[k].keep; }); if (keys.length) { var k = G.pick(keys); G.take(k, 99); } G.add('moral', -8); return 'Vous ne cherchez même pas. Dans la rue, ce qui est posé n’est déjà plus à vous.'; } }
      ]
    },

    {
      id: 'nightoffer', w: 6, when: 'night', ico: '🌙', title: 'Une voiture ralentit',
      cond: function (G) { return S.homeIdx(G.s) <= 3; },
      text: 'La vitre descend. « Tu veux gagner cent euros ? Une heure, rien de compliqué. »',
      choices: [
        { l: 'Monter', h: '100 € — vous ne savez pas quoi', risky: true, run: function (G) { var r = G.rnd(1, 100); if (r <= 55) { G.cash(120, 'Coup de main'); G.spendTime(1); return 'Il fallait décharger un camion. Cent vingt euros pour une heure. Vous respirez enfin.'; } if (r <= 80) { G.dirtyCash(200, 'Course'); G.heat(15); return 'Il fallait livrer une enveloppe. Deux cents euros et une question que vous ne posez pas.'; } G.add('sante', -20); G.add('moral', -20); return 'C’était un piège. Vous rentrez à pied, sans rien, à 4 h du matin.'; } },
        { l: 'Refuser', h: 'Sécurité', run: function (G) { return 'Vous secouez la tête. La vitre remonte, la voiture repart au ralenti vers quelqu’un d’autre.'; } },
        { l: 'Noter la plaque', h: 'Peut servir plus tard', run: function (G) { G.xp('discretion', 8); G.aff('duval', 5); return 'Vous notez la plaque sur votre main. Duval vous en remerciera.'; } }
      ]
    },

    {
      id: 'nightfire', w: 5, when: 'night', ico: '🔥', title: 'Un feu dans un immeuble',
      text: 'Des flammes au deuxième étage. Les pompiers sont à sept minutes. Quelqu’un crie à une fenêtre.',
      choices: [
        { l: 'Monter', h: 'Héroïque et dangereux', risky: true, run: function (G) { if (G.chance(35 + G.lvl('force') * 7)) { G.rep('legale', 20); G.add('moral', 30); G.add('sante', -15); G.cash(G.rnd(200, 800), 'Collecte du quartier'); G.hist('helped'); G.flag('hero', true); return 'Vous ressortez avec un enfant de six ans. Le quartier fait une collecte. Le journal local publie votre photo.'; } G.add('sante', -35); G.add('moral', 10); return 'La fumée vous arrête au premier palier. On vous sort de force. Les pompiers arrivent trop tard pour le chat.'; } },
        { l: 'Appeler les secours et guider', h: 'Utile et raisonnable', run: function (G) { G.rep('legale', 8); G.add('moral', 12); G.aff('duval', 6); G.hist('helped'); return 'Vous coordonnez l’évacuation par la cour. Deux familles sortent avant les secours.'; } },
        { l: 'Profiter de la confusion', h: 'Discrétion — infâme', risky: true, run: function (G) { if (G.chance(45 + G.lvl('discretion') * 6)) { G.dirtyCash(G.rnd(400, 1200), 'Pillage'); G.rep('rue', -5); G.add('moral', -18); G.hist('dirty'); return 'Trois appartements ouverts, personne pour regarder. Vous vous dégoûtez, et vous continuez.'; } G.arrestCheck('vol aggravé', 30); return 'Un pompier vous voit sortir avec un sac.'; } }
      ]
    },

    {
      id: 'nightparty', w: 5, when: 'night', ico: '🎉', title: 'Une fête au dernier étage',
      cond: function (G) { return G.apparence() >= 55; },
      text: 'Portes ouvertes, musique, gens qui comptent. Personne ne vérifie les invitations.',
      choices: [
        { l: 'Entrer et se fondre', h: 'Charisme — contacts', run: function (G) { if (G.chance(40 + G.lvl('charisme') * 6 + G.apparence() * 0.2)) { G.aff('vidal', 8); G.rep('legale', 6); G.add('moral', 15); G.xp('charisme', 18); return 'Vous parlez quarante minutes avec quelqu’un d’important qui vous prend pour quelqu’un d’important.'; } G.add('moral', -10); return 'On vous demande qui vous êtes, trois fois, de plus en plus sèchement.'; } },
        { l: 'Repérer les objets de valeur', h: 'Prépare un cambriolage', risky: true, req: function (G) { return G.lvl('discretion') >= 4; }, run: function (G) { G.flag('caseCased', true); G.xp('discretion', 15); return 'Vous notez l’étage, l’alarme, la boîte à clés. Votre prochain cambriolage aura une cible de choix.'; } },
        { l: 'Passer votre chemin', h: 'Rien', run: function (G) { return 'Vous continuez. La musique s’entend encore trois rues plus loin.'; } }
      ]
    },

    {
      id: 'nightmetro', w: 5, when: 'night', ico: '🚇', title: 'Dernier métro',
      text: 'Un homme ivre s’est endormi sur la banquette. Son sac est ouvert, son téléphone dépasse. ' +
        'Vous êtes seuls dans la rame.',
      choices: [
        { l: 'Le réveiller à son arrêt', h: 'Karma', run: function (G) { G.add('moral', 8); G.hist('honest'); if (G.chance(30)) { G.cash(G.rnd(20, 60), 'Merci'); return 'Il sursaute, comprend, et vous glisse un billet en descendant.'; } return 'Il descend en titubant sans comprendre ce qui vient de se passer.'; } },
        { l: 'Prendre le téléphone', h: 'Facile — et filmé', risky: true, run: function (G) { if (G.chance(60 + G.lvl('discretion') * 5)) { G.give('smartphone', 1); G.dirtyCash(G.rnd(60, 180), 'Revente'); G.heat(10); G.hist('crime'); return 'Vous descendez à la station suivante. Personne n’a rien vu — sauf huit caméras.'; } G.heat(25); G.arrestCheck('vol', 8); return 'Un agent monte dans la rame au moment exact où votre main est dans le sac.'; } },
        { l: 'Descendre', h: 'Rien', run: function (G) { return 'Vous descendez une station trop tôt pour ne pas avoir à décider.'; } }
      ]
    },

    /* ══════════════════ CHAÎNES & CONSÉQUENCES ══════════════════ */

    {
      id: 'reputation_past', w: 5, ico: '🗣️', title: 'On parle de vous',
      cond: function (G) { return G.hist('crime', 0) >= 12 && G.repVal('legale') >= 30; },
      text: 'Votre passé circule. Un voisin a « entendu dire ». La rumeur est fausse à moitié, ce qui est le pire des cas.',
      choices: [
        { l: 'Assumer publiquement', h: 'Réputation légale en baisse, rue en hausse', run: function (G) { G.rep('legale', -8); G.rep('rue', 12); G.add('moral', 10); return 'Vous ne niez rien. Certains s’éloignent, d’autres vous respectent enfin pour ce que vous êtes.'; } },
        { l: 'Tout nier', h: 'Charisme', run: function (G) { if (G.chance(40 + G.lvl('charisme') * 6)) { G.rep('legale', 4); return 'Vous démontez la rumeur point par point. À la fin, on plaint celui qui l’a lancée.'; } G.rep('legale', -12); return 'Vous en faites trop. Nier avec cette énergie, c’est confirmer.'; } },
        { l: 'Faire taire la source', h: 'Efficace, définitif', risky: true, run: function (G) { G.heat(15); G.rep('rue', 5); G.hist('dirty'); if (G.chance(60)) return 'Une conversation dans une cage d’escalier. Plus personne ne parle de vous.'; G.arrestCheck('menaces', 12); return 'Le voisin porte plainte le lendemain matin.'; } }
      ]
    },

    {
      id: 'redemption', w: 5, ico: '🕊️', once: true, title: 'Une seconde chance',
      cond: function (G) { return G.s.casier >= 3 && G.repVal('legale') >= 40 && G.hist('helped', 0) >= 3; },
      text: 'Une association d’insertion vous propose d’intervenir devant des jeunes. Payé, exposé, et sincère.',
      choices: [
        { l: 'Accepter et témoigner', h: 'Casier allégé, réputation', run: function (G) { G.spendTime(3); G.clearCasier(2); G.rep('legale', 15); G.add('moral', 25); G.cash(300, 'Intervention'); G.aff('sofia', 15); return 'Vous parlez une heure devant trente adolescents. Le juge d’application des peines lit le compte rendu.'; } },
        { l: 'Refuser', h: 'Ce n’est pas votre rôle', run: function (G) { G.add('moral', -4); return 'Vous déclinez. Vous n’êtes pas certain d’avoir quelque chose à transmettre.'; } }
      ]
    },

    {
      id: 'fullcircle', w: 4, ico: '🔄', once: true, title: 'Quelqu’un dort à votre ancienne place',
      cond: function (G) { return S.netWorth(G.s) >= 120000; },
      text: 'Vous repassez par hasard devant le porche. Quelqu’un y a installé un carton, exactement comme vous.',
      choices: [
        { l: 'Lui donner 1 000 €', h: 'Ce que personne ne vous a donné', req: function (G) { return G.money() >= 1000; }, run: function (G) { G.cash(-1000, 'Don'); G.add('moral', 35); G.rep('rue', 15); G.rep('legale', 5); G.hist('helped'); G.flag('gaveBack', true); return 'Vous posez l’enveloppe et vous partez sans un mot, exactement comme vous auriez voulu qu’on le fasse.'; } },
        { l: 'Lui offrir un emploi', h: 'Nécessite une entreprise', req: function (G) { return G.s.biz.length > 0; }, run: function (G) { G.add('moral', 30); G.rep('legale', 10); G.rep('rue', 12); G.hist('helped'); G.flag('gaveBack', true); return 'Vous l’embauchez le lendemain. Six mois plus tard, il tient une équipe.'; } },
        { l: 'Passer sans regarder', h: 'Vous avez déjà donné', run: function (G) { G.add('moral', -12); return 'Vous accélérez le pas. Vous vous demanderez souvent pourquoi.'; } }
      ]
    },

    /* ══════════════════ RACKET & EXTORSION ══════════════════ */

    {
      id: 'racket_street', w: 8, ico: '💢', title: 'On vient encaisser',
      cond: function (G) { return G.money() >= 60 && G.repVal('rue') < 55 && S.homeIdx(G.s) <= 6; },
      text: 'Trois types vous barrent le passage à l’angle de la rue. Le plus grand parle sans hausser la voix : ' +
        '« Tu travailles sur notre secteur. Ça se paie. »',
      choices: [
        {
          l: 'Payer ce qu’ils demandent', h: 'Environ 25 % de votre liquide',
          run: function (G) {
            var t = Math.max(20, Math.round(G.money() * 0.25));
            G.cash(-t, 'Racket'); G.add('moral', -10); G.rep('rue', -2);
            G.flag('racketed', G.day() + G.rnd(6, 14));
            return 'Vous tendez ' + G.eur(t) + '. Ils comptent devant vous, lentement, puis s’écartent.';
          }
        },
        {
          l: 'Refuser et tenir tête', h: 'Force — ils sont trois', risky: true,
          run: function (G) {
            var p = 22 + G.lvl('force') * 8 + G.repVal('rue') * 0.3 + (G.affVal('bruno') >= 40 ? 18 : 0);
            if (G.chance(p)) {
              G.rep('rue', 10); G.rep('pegre', 4); G.add('sante', -12); G.xp('force', 14);
              return 'Vous en mettez un au sol avant que les autres ne comprennent. Ils reculent. On en parlera.';
            }
            var l = Math.min(G.money(), G.rnd(60, 400));
            G.cash(-l, 'Volé'); G.add('sante', -28); G.add('moral', -15); G.rep('rue', -4);
            return 'Ils prennent tout : ' + G.eur(l) + '. Vous vous relevez dix minutes plus tard.';
          }
        },
        {
          l: 'Négocier un arrangement', h: 'Charisme — payer moins, plus longtemps',
          run: function (G) {
            if (G.chance(35 + G.lvl('charisme') * 6)) {
              var t = Math.max(10, Math.round(G.money() * 0.1));
              G.cash(-t, 'Arrangement'); G.rep('rue', 3); G.xp('charisme', 10);
              return 'Vous parlez cinq minutes et descendez à ' + G.eur(t) + '. « T’es réglo. On repassera. »';
            }
            var t2 = Math.max(30, Math.round(G.money() * 0.35));
            G.cash(-t2, 'Racket'); G.add('moral', -12);
            return 'Votre numéro ne prend pas. Ils montent le prix à ' + G.eur(t2) + ' pour vous apprendre.';
          }
        },
        {
          l: 'Les envoyer voir le Grec', h: 'Réputation pègre ≥ 35',
          req: function (G) { return G.repVal('pegre') >= 35; },
          run: function (G) { G.rep('pegre', 3); return 'Vous lâchez un nom. Le grand blêmit, s’excuse presque, et vous laisse passer.'; }
        }
      ]
    },

    {
      id: 'racket_biz', w: 7, ico: '🏪', title: 'Protection obligatoire',
      cond: function (G) { return G.s.biz.length > 0; },
      text: 'Deux hommes entrent dans votre établissement à l’heure de la fermeture. ' +
        'Ils regardent les vitres, la caisse, la sortie de secours. « Ce serait dommage qu’il arrive quelque chose. »',
      choices: [
        {
          l: 'Payer la protection', h: 'Coût mensuel, tranquillité',
          run: function (G) {
            var t = 400 + G.s.biz.length * 300;
            if (!G.spend(t, 'Protection')) { G.add('sante', -20); return 'Vous ne pouvez même pas payer. Ils cassent deux vitrines en partant.'; }
            G.flag('protectionPaid', G.day() + 25); G.rep('pegre', 3); G.add('moral', -8);
            return G.eur(t) + ' par mois, en liquide, sans reçu. Vos affaires ne seront plus dérangées.';
          }
        },
        {
          l: 'Prévenir la police', h: 'Légal — et risqué', risky: true,
          run: function (G) {
            G.rep('legale', 6); G.aff('duval', 8); G.rep('pegre', -12);
            if (G.chance(45)) { G.affFaction('pegre', -10); G.sched('racket_revenge', G.rnd(4, 10)); return 'La plainte est enregistrée. Le milieu apprendra qui a parlé.'; }
            return 'Une patrouille passe désormais tous les soirs devant chez vous. Ils ne sont pas revenus.';
          }
        },
        {
          l: 'Refuser sèchement', h: 'Force & réputation', risky: true,
          run: function (G) {
            var p = 25 + G.lvl('force') * 6 + G.repVal('pegre') * 0.4;
            if (G.chance(p)) { G.rep('pegre', 10); G.rep('rue', 6); return 'Vous les mettez dehors vous-même. Le message circule : chez vous, ça ne marche pas.'; }
            var b = G.s.biz[0];
            if (b && b.lvl > 1) b.lvl--;
            G.add('sante', -15); G.add('moral', -14);
            return 'Ils reviennent à trois heures du matin. Votre établissement met des semaines à s’en remettre.';
          }
        }
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
      id: 'racket_cop', w: 6, ico: '👮', title: 'Un contrôle très intéressé',
      cond: function (G) { return G.dirtyVal() >= 400 || (G.heatVal() > 25 && G.money() > 300); },
      text: 'L’agent regarde votre liasse un long moment sans rien dire. ' +
        '« Tout ça sur vous, à cette heure-ci. On va devoir tout saisir, et ça va prendre des mois. À moins que… »',
      choices: [
        {
          l: 'Glisser la moitié', h: 'Le liquide part, vous restez libre',
          run: function (G) {
            var d = Math.round(G.dirtyVal() * 0.5), c = Math.round(G.money() * 0.3);
            if (d) G.dirtyCash(-d, 'Ripou');
            if (c) G.cash(-c, 'Ripou');
            G.heat(-15); G.aff('duval', -5);
            return 'Il empoche sans compter et vous souhaite une bonne soirée. ' + G.eur(d + c) + ' de moins.';
          }
        },
        {
          l: 'Refuser et exiger un procès-verbal', h: 'Intègre — et coûteux', risky: true,
          run: function (G) {
            if (G.chance(45 + G.lvl('charisme') * 4)) {
              G.rep('legale', 5); G.aff('duval', 6);
              return 'Vous demandez son matricule. Il se ravise, rend la liasse, et s’en va sans un mot.';
            }
            var d2 = G.dirtyVal();
            if (d2) G.dirtyCash(-d2, 'Saisie');
            G.heat(12);
            return 'Tout est saisi et placé sous scellés : ' + G.eur(d2) + '. Vous reverrez cet argent dans deux ans, peut-être.';
          }
        },
        {
          l: 'Faire jouer Duval', h: 'Affinité Duval ≥ 40', req: function (G) { return G.affVal('duval') >= 40; },
          run: function (G) { G.heat(-20); G.aff('duval', -3); return 'Un appel, trente secondes. Son collègue vous rend la liasse en serrant les dents.'; }
        }
      ]
    },

    {
      id: 'racket_debt', w: 6, ico: '🔨', title: 'Des visiteurs pour la dette',
      cond: function (G) { return (G.flags('debt') || 0) > 0 || (G.flags('cardDebt') || 0) > 0; },
      text: 'Ils ne frappent pas : ils attendent en bas, adossés à une voiture, et ils ont tout leur temps.',
      choices: [
        {
          l: 'Rembourser une partie maintenant', h: 'Réduit la dette',
          req: function (G) { return G.canPay(500); },
          run: function (G) {
            G.spend(500, 'Acompte');
            if (G.flags('debt')) G.flag('debt', Math.max(0, G.flags('debt') - 500));
            else G.flag('cardDebt', Math.max(0, (G.flags('cardDebt') || 0) - 500));
            G.aff('karim', 5);
            return 'Cinq cents euros d’acompte. On vous accorde un délai, sans sourire.';
          }
        },
        {
          l: 'Promettre pour la semaine prochaine', h: 'Gagner du temps, la dette enfle',
          run: function (G) {
            if (G.flags('debt')) { G.flag('debt', Math.round(G.flags('debt') * 1.2)); G.s.flags.debtDue = G.day() + 7; }
            G.add('moral', -10);
            return 'On vous laisse sept jours. Les intérêts, eux, ne prennent pas de repos.';
          }
        },
        {
          l: 'Prendre la fuite', h: 'Discrétion — sinon ça fait mal', risky: true,
          run: function (G) {
            if (G.chance(30 + G.lvl('discretion') * 7)) { G.xp('discretion', 12); return 'Vous sortez par la cave et le local à vélos. Ils attendent encore à minuit.'; }
            G.add('sante', -32); G.add('moral', -18);
            return 'Ils vous rattrapent dans la cour. Ça dure moins d’une minute.';
          }
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
     Sélection
     --------------------------------------------------------- */
  function eligible(G, when) {
    return LIST.filter(function (e) {
      if (e.manual) return false;
      var w = e.when || 'any';
      if (w !== 'any' && w !== when) return false;
      if (when === 'night' && w === 'any' && Math.random() < 0.5) return false;
      if (when === 'day' && w === 'any' && Math.random() < 0.15) return false;
      if (e.once && G.s.seen[e.id]) return false;
      if (G.s.seen[e.id] && Math.random() < 0.45) return false;   // on préfère la nouveauté
      if (e.cond && !e.cond(G)) return false;
      return true;
    });
  }

  function weightedPick(pool) {
    var total = 0, i;
    for (i = 0; i < pool.length; i++) total += (pool[i].w || 5);
    var r = Math.random() * total;
    for (i = 0; i < pool.length; i++) { r -= (pool[i].w || 5); if (r <= 0) return pool[i]; }
    return pool[0];
  }

  /* ---------------------------------------------------------
     Déclencheurs
     --------------------------------------------------------- */
  EV.maybeTrigger = function () {
    var G = NS.G;
    if (G.s.over || G.s.jail || G._q) return;
    var chance = ACTION_CHANCE + (G.s.heat > 50 ? 4 : 0);
    if (!G.chance(chance)) return;
    var pool = eligible(G, G.isNight() ? 'night' : 'day');
    if (!pool.length) return;
    EV.fire(weightedPick(pool));
  };

  EV.nightEvent = function () {
    var G = NS.G;
    if (G.s.over || G.s.jail || G._q) return;
    if (!G.chance(NIGHT_CHANCE)) return;
    var pool = eligible(G, 'night');
    if (!pool.length) return;
    EV.fire(weightedPick(pool));
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
    G.s.seen[e.id] = true;
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
