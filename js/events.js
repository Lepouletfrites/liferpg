/* =============================================================
   events.js — Événements aléatoires à choix multiples
   Chaque choix renvoie un texte de résolution affiché au joueur.
   ============================================================= */
(function (NS) {
  'use strict';

  var D = NS.D, S = NS.S;
  var EV = {};

  /* Probabilité qu'un événement se déclenche après une action */
  var ACTION_CHANCE = 13;
  var NIGHT_CHANCE = 42;

  /* ---------------------------------------------------------
     Table des événements
     cond(G) : condition d'apparition · w : poids · once : unique
     --------------------------------------------------------- */
  var LIST = [

    {
      id: 'wallet', w: 10, ico: '👛', title: 'Un portefeuille',
      text: 'Un homme pressé sort son téléphone ; le portefeuille glisse de sa poche et tombe sur le bitume. ' +
        'Il continue son chemin sans rien remarquer. Vous voyez la liasse dépasser.',
      choices: [
        {
          l: 'Le rendre', h: 'Honnêteté — réputation légale',
          run: function (G) {
            G.rep('legale', 8); G.add('moral', 12);
            if (G.chance(55)) { var r = G.rnd(15, 55); G.cash(r, 'Récompense'); return 'Il vous rattrape, incrédule, puis vous tend ' + G.eur(r) + '. « Il y a encore des gens bien. » Vous ne savez pas quoi répondre.'; }
            return 'Il reprend son bien, marmonne un merci et s’en va. Vous restez avec quelque chose que l’argent n’achète pas.';
          }
        },
        {
          l: 'Le garder', h: 'Argent immédiat — risque', risky: true,
          run: function (G) {
            var m = G.rnd(45, 150);
            G.cash(m, 'Portefeuille'); G.rep('rue', 4); G.rep('legale', -5); G.heat(10); G.add('moral', -6);
            if (G.chance(18)) { G.heat(20); return G.eur(m) + ' en liquide. Mais une caméra vous filmait, et vous le savez.'; }
            return 'Vous glissez ' + G.eur(m) + ' dans votre poche. La carte finit dans une bouche d’égout. Vous ne dormirez pas très bien.';
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
      id: 'police', w: 9, ico: '🚔', title: 'Contrôle d’identité',
      cond: function (G) { return G.s.rep.legale < 60 || G.s.heat > 10; },
      text: 'Deux agents descendent de voiture et se dirigent droit vers vous. « Papiers. » ' +
        'Le ton n’est pas une question.',
      choices: [
        {
          l: 'Coopérer poliment', h: 'Sûr, mais coûte du temps',
          run: function (G) {
            G.spendTime(1);
            if (G.s.heat > 40 && G.chance(35)) { G.arrestCheck('contrôle'); return 'Votre nom sort dans le fichier. Ils vous emmènent.'; }
            G.heat(-8); G.aff('duval', 3);
            return 'Vingt minutes debout contre le mur, puis on vous rend vos papiers. Rien de plus.';
          }
        },
        {
          l: 'Partir en courant', h: 'Force requise — très risqué', risky: true,
          run: function (G) {
            var p = 30 + G.lvl('force') * 7 + (G.has('velo') ? 12 : 0) - G.s.heat * 0.2;
            G.spendEnergy(20);
            if (G.chance(p)) { G.rep('rue', 6); G.heat(12); return 'Trois rues, deux cours d’immeuble, un mur. Vous les semez. Le quartier a vu.'; }
            G.heat(25); G.add('sante', -12);
            G.arrestCheck('refus d’obtempérer');
            return 'Vous ne courez pas assez vite. Le trottoir arrive très vite contre votre visage.';
          }
        },
        {
          l: 'Faire jouer votre réseau', h: 'Affinité avec Duval ≥ 30',
          req: function (G) { return G.s.npc.duval >= 30; },
          run: function (G) {
            G.heat(-20); G.aff('duval', 4);
            return 'Duval reconnaît son collègue, s’avance. « Laisse, je le connais. » Le contrôle s’arrête là.';
          }
        }
      ]
    },

    {
      id: 'spot', w: 8, ico: '😠', title: 'Une place déjà prise',
      cond: function (G) { return S.homeIdx(G.s) <= 1; },
      text: 'Un type massif est installé à l’endroit exact où vous comptiez passer la nuit. ' +
        'Il ne bouge pas. Il attend de voir ce que vous allez faire.',
      choices: [
        {
          l: 'Lui céder la place', h: 'Aucun risque, moral en baisse',
          run: function (G) { G.add('moral', -9); G.spendTime(1); return 'Vous marchez encore une heure pour trouver un porche moins abrité. Vous connaissez la chanson.'; }
        },
        {
          l: 'Vous battre', h: 'Force — réputation de rue', risky: true,
          run: function (G) {
            var p = 35 + G.lvl('force') * 8 + G.s.gauges.energie * 0.15;
            if (G.chance(p)) { G.rep('rue', 9); G.add('sante', -6); G.xp('force', 12); G.add('moral', 5); return 'Deux minutes, pas plus. Il ramasse ses affaires. Le quartier saura qui vous êtes.'; }
            G.add('sante', -22); G.add('moral', -12); G.rep('rue', -2);
            var l = Math.min(G.s.money, G.rnd(5, 40)); if (l) G.cash(-l, 'Volé');
            return 'Vous vous réveillez plus tard, seul, avec un goût de sang et les poches vides.';
          }
        },
        {
          l: 'Négocier', h: 'Charisme niveau 3',
          req: function (G) { return G.lvl('charisme') >= 3; },
          run: function (G) {
            G.xp('charisme', 10); G.rep('rue', 4); G.aff('marcel', 3);
            return 'Vous parlez cinq minutes. Il finit par se décaler d’un mètre. « T’as de la tchatche, toi. »';
          }
        }
      ]
    },

    {
      id: 'oldfriend', w: 6, ico: '😶', title: 'Quelqu’un vous reconnaît',
      cond: function (G) { return S.homeIdx(G.s) <= 2 && G.s.day > 4; },
      text: 'Une silhouette s’arrête net au milieu du trottoir. C’est quelqu’un de votre ancienne vie. ' +
        'Le visage passe par la surprise, puis par une gêne que vous connaissez trop bien.',
      choices: [
        {
          l: 'Lui parler franchement', h: 'Moral, peut-être davantage',
          run: function (G) {
            G.add('moral', 14); G.xp('charisme', 8);
            if (G.chance(45)) { var m = G.rnd(30, 120); G.cash(m, 'Un ancien ami'); return 'Vous parlez vingt minutes. Il vous glisse ' + G.eur(m) + ' et son numéro. Il rappellera peut-être.'; }
            return 'Vous parlez. Il promet de revenir. Vous savez qu’il ne reviendra pas, mais la conversation faisait du bien.';
          }
        },
        {
          l: 'Baisser les yeux', h: 'Éviter l’humiliation',
          run: function (G) { G.add('moral', -11); return 'Vous fixez le sol jusqu’à ce que les pas s’éloignent. C’est plus simple. C’est plus lourd aussi.'; }
        }
      ]
    },

    {
      id: 'dog', w: 5, ico: '🐕', once: true, ico2: '',
      title: 'Un chien vous suit',
      cond: function (G) { return S.homeIdx(G.s) <= 3; },
      text: 'Il vous suit depuis trois rues. Maigre, sans collier, il s’assoit dès que vous vous arrêtez. ' +
        'Il attend une décision.',
      choices: [
        {
          l: 'Le garder', h: 'Moral chaque nuit, mais il mange',
          run: function (G) { G.flag('dog', true); G.add('moral', 18); return 'Vous l’appelez comme ça vous vient. Il ne vous quittera plus. Vous non plus.'; }
        },
        {
          l: 'Le chasser', h: 'Une bouche de moins',
          run: function (G) { G.add('moral', -7); return 'Vous criez, il recule, puis il s’assoit plus loin. Il finira par comprendre.'; }
        }
      ]
    },

    {
      id: 'assoc', w: 7, ico: '📋', title: 'Une place en formation',
      cond: function (G) { return G.s.npc.sofia >= 15 && G.s.edu < 5; },
      text: 'Sofia vous attend avec un dossier. « Il reste une place sur un module financé. ' +
        'Il faut être là tous les jours, et il faut être à l’heure. »',
      choices: [
        {
          l: 'Accepter', h: 'Progression de formation offerte',
          run: function (G) {
            G.s.eduProg += 3; G.xp('intelligence', 30); G.rep('legale', 5); G.aff('sofia', 6);
            return 'Trois séances d’avance, gratuitement. Sofia note votre nom dans son carnet, comme une promesse.';
          }
        },
        {
          l: 'Refuser — pas le temps', h: 'Rien ne change',
          run: function (G) { G.aff('sofia', -6); G.add('moral', -3); return 'Elle referme le dossier sans commentaire. C’est le pire commentaire possible.'; }
        }
      ]
    },

    {
      id: 'scam', w: 6, ico: '🤝', title: 'Une opportunité',
      cond: function (G) { return G.s.money >= 150; },
      text: 'Un homme très bien habillé vous parle d’un placement. Rendement garanti, en quarante-huit heures. ' +
        'Il montre des captures d’écran sur son téléphone.',
      choices: [
        {
          l: 'Investir 150 €', h: 'Le double… ou rien', risky: true,
          req: function (G) { return G.s.money >= 150; },
          run: function (G) {
            G.cash(-150, 'Placement');
            if (G.chance(30 + G.lvl('intelligence') * 4)) { G.cash(380, 'Rendement'); G.xp('intelligence', 12); return 'Contre toute attente, il revient deux jours plus tard avec ' + G.eur(380) + '. Vous ne recommencerez pas.'; }
            G.add('moral', -14); G.xp('intelligence', 18);
            return 'Il ne revient jamais. Cent cinquante euros de leçon, payée comptant.';
          }
        },
        {
          l: 'Poser des questions précises', h: 'Intelligence niveau 4',
          req: function (G) { return G.lvl('intelligence') >= 4; },
          run: function (G) { G.xp('intelligence', 15); G.xp('charisme', 8); return 'Trois questions suffisent. Il change de trottoir. Savoir lire une arnaque, c’est déjà du capital.'; }
        },
        { l: 'Refuser poliment', h: 'Rien ne change', run: function (G) { return 'Vous déclinez. Il hausse les épaules et cherche déjà quelqu’un d’autre.'; } }
      ]
    },

    {
      id: 'recruiter', w: 7, ico: '💼', title: 'Un regard qui s’attarde',
      cond: function (G) { return S.apparence(G.s) >= 55 && G.s.edu >= 2 && !G.s.job; },
      text: 'Une femme vous observe depuis le comptoir depuis un moment. Elle finit par s’approcher, ' +
        'carte de visite entre deux doigts. « Vous cherchez quelque chose ? »',
      choices: [
        {
          l: 'Vous vendre', h: 'Charisme — embauche possible',
          run: function (G) {
            var p = 35 + G.lvl('charisme') * 7 + S.apparence(G.s) * 0.2;
            if (G.chance(p)) {
              var pool = D.JOBS.filter(function (j) { return !G.checkReq(j.req); });
              if (pool.length) {
                var j = pool[pool.length - 1];
                G.hire(j.id); G.xp('charisme', 15);
                return 'Vous parlez dix minutes sans jamais mentionner la rue. Elle vous embauche comme ' + j.n + '.';
              }
            }
            G.xp('charisme', 8);
            return 'Elle écoute, hoche la tête, prend votre nom. « Rappelez-moi quand vous aurez le dossier complet. »';
          }
        },
        { l: 'Prendre la carte, sans plus', h: 'Réputation légale +', run: function (G) { G.rep('legale', 4); return 'Vous glissez la carte dans votre poche. Un jour, peut-être.'; } }
      ]
    },

    {
      id: 'beggar', w: 6, ico: '🧓', title: 'Plus démuni que vous',
      cond: function (G) { return G.s.money >= 20; },
      text: 'Une femme âgée grelotte à l’entrée du parking. Elle ne demande rien. ' +
        'Elle est arrivée dans la rue bien plus tard que vous, et bien moins préparée.',
      choices: [
        {
          l: 'Lui donner 20 €', h: 'Moral, réputation de rue',
          req: function (G) { return G.s.money >= 20; },
          run: function (G) { G.cash(-20, 'Don'); G.add('moral', 16); G.rep('rue', 6); G.aff('marcel', 4); return 'Elle vous regarde comme si vous veniez de la sauver. Peut-être que oui.'; }
        },
        {
          l: 'Lui apprendre les combines', h: 'Coûte 2h, moral & réputation',
          run: function (G) { G.spendTime(2); G.add('moral', 12); G.rep('rue', 8); G.xp('charisme', 8); return 'Vous lui montrez les bons horaires, les bons trottoirs, l’association. Elle tiendra plus longtemps grâce à vous.'; }
        },
        { l: 'Passer votre chemin', h: 'Vous n’avez rien à donner', run: function (G) { G.add('moral', -6); return 'Vous continuez. Vous vous répétez que vous n’aviez pas le choix.'; } }
      ]
    },

    {
      id: 'sick', w: 8, ico: '🤒', title: 'Le corps lâche',
      cond: function (G) { return G.s.gauges.sante < 45; },
      text: 'La fièvre est montée d’un coup. Vous tenez à peine debout, et le trottoir tangue.',
      choices: [
        {
          l: 'Aller aux urgences', h: 'Coûte la demi-journée, soigne',
          run: function (G) { G.spendTime(4); G.add('sante', 32); G.rep('legale', 2); return 'Quatre heures d’attente, une ordonnance, un lit une heure. Vous ressortez debout.'; }
        },
        {
          l: 'Prendre des médicaments', h: 'Nécessite des médicaments',
          req: function (G) { return G.has('medoc'); },
          run: function (G) { G.take('medoc', 1); G.add('sante', 30); return 'Vous avalez les comprimés à sec. Deux heures plus tard, la fièvre reflue.'; }
        },
        {
          l: 'Serrer les dents', h: 'Santé en chute', risky: true,
          run: function (G) { G.add('sante', -14); G.add('moral', -8); return 'Vous continuez comme si de rien n’était. Le corps note tout, et il présentera la facture.'; }
        }
      ]
    },

    {
      id: 'drugs', w: 5, ico: '💉', title: 'Une proposition',
      cond: function (G) { return G.s.rep.rue >= 15 && G.s.gauges.moral < 45; },
      text: 'On vous propose de quoi ne plus rien sentir pendant quelques heures. ' +
        'Le prix est dérisoire. C’est bien ce qui est inquiétant.',
      choices: [
        {
          l: 'Accepter', h: 'Moral immédiat — dépendance', risky: true,
          run: function (G) {
            G.add('moral', 28); G.add('sante', -14); G.flag('addict', (G.s.flags.addict || 0) + 1); G.rep('rue', 3);
            return 'Quelques heures d’absence bienvenue. Et une porte que vous venez d’entrouvrir.';
          }
        },
        { l: 'Refuser', h: 'Vous tenez', run: function (G) { G.add('moral', -4); G.rep('rue', -1); return 'Vous refusez. Ce soir sera long, mais il sera à vous.'; } }
      ]
    },

    {
      id: 'journalist', w: 5, ico: '🎤', title: 'Un micro tendu',
      cond: function (G) { return S.homeIdx(G.s) <= 2 && G.s.day > 6; },
      text: 'Une équipe de télévision prépare un reportage sur le sans-abrisme. ' +
        'On vous demande votre témoignage, visage flouté ou non, à votre convenance.',
      choices: [
        {
          l: 'Témoigner à visage découvert', h: 'Réputation, dons',
          run: function (G) {
            var m = G.rnd(40, 140); G.cash(m, 'Dons de téléspectateurs');
            G.rep('legale', 8); G.add('moral', 10); G.xp('charisme', 14);
            return 'Vous parlez sans détour pendant huit minutes. Des inconnus envoient ' + G.eur(m) + ' à l’association pour vous.';
          }
        },
        {
          l: 'Témoigner anonymement', h: 'Prudent',
          run: function (G) { G.add('moral', 5); G.xp('charisme', 6); return 'Voix modifiée, visage flouté. Vous dites l’essentiel sans vous exposer.'; }
        },
        { l: 'Refuser', h: 'Votre dignité vous appartient', run: function (G) { G.add('moral', 3); return 'Vous refusez. Il vous reste peu de choses ; le choix de vous taire en fait partie.'; } }
      ]
    },

    {
      id: 'audit', w: 6, ico: '🧾', title: 'Contrôle fiscal',
      cond: function (G) { return S.netWorth(G.s) > 60000; },
      text: 'Un courrier recommandé. L’administration s’intéresse à la progression rapide de votre patrimoine.',
      choices: [
        {
          l: 'Coopérer pleinement', h: 'Coûteux mais propre',
          run: function (G) {
            var f = Math.round(G.s.money * 0.08);
            G.cash(-f, 'Régularisation'); G.rep('legale', 8);
            return 'Vous ouvrez tous les livres. ' + G.eur(f) + ' de régularisation, et un dossier désormais irréprochable.';
          }
        },
        {
          l: 'Optimiser agressivement', h: 'Intelligence niveau 6', risky: true,
          req: function (G) { return G.lvl('intelligence') >= 6; },
          run: function (G) {
            if (G.chance(55 + G.lvl('intelligence') * 3)) { G.xp('intelligence', 25); return 'Montages, provisions, reports. Le contrôle se solde par un redressement nul.'; }
            var f = Math.round(G.s.money * 0.22); G.cash(-f, 'Redressement'); G.rep('legale', -12); G.heat(15);
            return 'L’inspecteur n’est pas dupe. ' + G.eur(f) + ' de redressement et une réputation entamée.';
          }
        }
      ]
    },

    {
      id: 'investor', w: 6, ico: '📈', title: 'Un investisseur intéressé',
      cond: function (G) { return G.s.biz.length > 0; },
      text: 'Un fonds vous contacte : il veut entrer au capital de votre société. ' +
        'L’argent est immédiat, la liberté un peu moins.',
      choices: [
        {
          l: 'Accepter la levée', h: 'Cash immédiat, revenus réduits',
          run: function (G) {
            var b = G.s.biz[0], d = D.BIZI[b.id];
            var m = Math.round(d.cost * b.lvl * 0.9);
            G.cash(m, 'Levée de fonds');
            if (b.lvl > 1) b.lvl--;
            G.aff('alex', 8); G.rep('legale', 5);
            return G.eur(m) + ' sur le compte. En échange, vous cédez une part de votre outil.';
          }
        },
        {
          l: 'Refuser et garder le contrôle', h: 'Réputation légale +',
          run: function (G) { G.rep('legale', 6); G.xp('intelligence', 12); G.aff('alex', 4); return 'Vous refusez. « Je préfère cent pour cent de ce que je construis. » Alex sourit.'; }
        }
      ]
    },

    {
      id: 'storm', w: 6, ico: '🌧️', when: 'night',
      title: 'Tempête',
      cond: function (G) { return S.homeIdx(G.s) <= 1; },
      text: 'La pluie tombe à l’horizontale depuis deux heures. Votre carton n’existe déjà plus.',
      choices: [
        {
          l: 'Dormir dans un hall d’immeuble', h: 'Risque de police', risky: true,
          run: function (G) {
            if (G.chance(35)) { G.heat(8); G.add('energie', -20); G.add('moral', -8); return 'Un résident appelle la police. On vous met dehors à 3h du matin.'; }
            G.add('sante', 4); return 'Personne ne descend. Vous dormez au sec, contre les boîtes aux lettres.';
          }
        },
        {
          l: 'Payer une nuit au foyer', h: '8 €',
          req: function (G) { return G.s.money >= 8; },
          run: function (G) { G.cash(-8, 'Foyer'); G.add('sante', 6); G.add('moral', 8); G.add('hygiene', 15); return 'Une douche chaude, un lit, un radiateur. Huit euros n’ont jamais autant valu.'; }
        },
        {
          l: 'Rester dehors', h: 'Santé en chute', risky: true,
          run: function (G) { G.add('sante', -18); G.add('moral', -10); G.add('hygiene', -12); return 'Vous passez la nuit trempé jusqu’aux os. Le froid entre et ne repart pas.'; }
        }
      ]
    },

    {
      id: 'raid', w: 6, when: 'night', ico: '🚨', title: 'Évacuation du squat',
      cond: function (G) { return G.s.home === 'squat'; },
      text: 'Coups sur la porte à 6h du matin. Un huissier, deux camionnettes, et pas de discussion.',
      choices: [
        {
          l: 'Partir sans faire d’histoires', h: 'Retour à la rue',
          run: function (G) { G.s.home = 'street'; G.add('moral', -12); return 'Vous récupérez vos affaires en quatre minutes. Le trottoir vous attendait.'; }
        },
        {
          l: 'Résister avec les autres', h: 'Réputation de rue — risqué', risky: true,
          run: function (G) {
            G.rep('rue', 10); G.heat(15); G.add('sante', -10);
            if (G.chance(40)) { return 'Le collectif tient bon, la presse arrive, l’évacuation est reportée. Vous restez.'; }
            G.s.home = 'street'; G.arrestCheck('occupation illégale');
            return 'Trois heures de face-à-face, puis les boucliers avancent. Vous êtes dehors.';
          }
        }
      ]
    },

    {
      id: 'lottery', w: 4, ico: '🎟️', title: 'Un ticket au sol',
      text: 'Un ticket à gratter, à moitié entamé, traîne près de la poubelle du tabac. ' +
        'Deux cases seulement ont été grattées.',
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
      id: 'theft', w: 6, when: 'night', ico: '🎒', title: 'Vos affaires ont disparu',
      cond: function (G) { return S.homeIdx(G.s) <= 1 && !G.has('sac') && Object.keys(G.s.inv).length > 1; },
      text: 'Vous vous réveillez. Le sac où vous rangiez tout n’est plus là.',
      choices: [
        {
          l: 'Faire le tour du quartier', h: 'Coûte 2h, récupération possible',
          run: function (G) {
            G.spendTime(2);
            if (G.chance(35)) { G.rep('rue', 3); return 'Vous retrouvez vos affaires éparpillées derrière un container. L’essentiel est là.'; }
            var keys = Object.keys(G.s.inv).filter(function (k) { return !D.ITEM[k].keep; });
            if (keys.length) { var k = G.pick(keys); G.take(k, 99); G.add('moral', -10); return 'Rien. Vous avez perdu vos ' + D.ITEM[k].n.toLowerCase() + ' pour de bon.'; }
            return 'Rien. Il n’y avait pas grand-chose, mais c’était tout ce que vous aviez.';
          }
        },
        {
          l: 'Laisser tomber', h: 'Perte définitive',
          run: function (G) {
            var keys = Object.keys(G.s.inv).filter(function (k) { return !D.ITEM[k].keep; });
            if (keys.length) { var k = G.pick(keys); G.take(k, 99); }
            G.add('moral', -8);
            return 'Vous ne cherchez même pas. Dans la rue, ce qui est posé n’est déjà plus à vous.';
          }
        }
      ]
    }
  ];

  EV.LIST = LIST;

  /* ---------------------------------------------------------
     Sélection pondérée
     --------------------------------------------------------- */
  function eligible(G, when) {
    return LIST.filter(function (e) {
      if ((e.when || 'any') !== 'any' && e.when !== when) return false;
      if (when === 'night' && (e.when || 'any') === 'any' && Math.random() < 0.5) return false;
      if (e.once && G.s.seen[e.id]) return false;
      if (e.cond && !e.cond(G)) return false;
      return true;
    });
  }

  function weightedPick(pool) {
    var total = 0, i;
    for (i = 0; i < pool.length; i++) total += (pool[i].w || 5);
    var r = Math.random() * total;
    for (i = 0; i < pool.length; i++) {
      r -= (pool[i].w || 5);
      if (r <= 0) return pool[i];
    }
    return pool[0];
  }

  /* ---------------------------------------------------------
     Déclencheurs
     --------------------------------------------------------- */
  EV.maybeTrigger = function () {
    var G = NS.G;
    if (G.s.over) return;
    if (!G.chance(ACTION_CHANCE)) return;
    var pool = eligible(G, 'any');
    if (!pool.length) return;
    EV.fire(weightedPick(pool));
  };

  EV.nightEvent = function () {
    var G = NS.G;
    if (G.s.over) return;

    /* le chien mange, et réconforte */
    if (G.s.flags.dog) {
      G.s.gauges.faim = Math.max(0, G.s.gauges.faim - 6);
      G.s.gauges.moral = Math.min(100, G.s.gauges.moral + 5);
    }
    /* la dépendance pèse */
    if (G.s.flags.addict) {
      G.s.gauges.sante = Math.max(0, G.s.gauges.sante - 2 * G.s.flags.addict);
      G.s.gauges.moral = Math.max(0, G.s.gauges.moral - 3);
    }

    if (!G.chance(NIGHT_CHANCE)) return;
    var pool = eligible(G, 'night');
    if (!pool.length) return;
    EV.fire(weightedPick(pool));
  };

  /** Affiche l'événement dans la modale */
  EV.fire = function (e) {
    var G = NS.G;
    G.s.seen[e.id] = true;
    NS.UI.event(e);
  };

  /** Applique le choix retenu et renvoie le texte de résolution */
  EV.resolve = function (e, index) {
    var G = NS.G;
    var c = e.choices[index];
    var out = c.run(G) || '';
    G.log('<b>' + e.title + '</b> — ' + out, 'event');
    G.checkEnd();
    NS.S.save(G.s);
    return out;
  };

  NS.EV = EV;
})(window.LifeRPG);
