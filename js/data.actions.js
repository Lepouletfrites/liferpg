/* =============================================================
   data.actions.js — Activités de survie, de jour et de nuit.
   when : 'day' (06h-22h) | 'night' (22h-04h) | 'any'
   ============================================================= */
(function (NS) {
  'use strict';
  var D = NS.D;

  D.ACTIONS = [

    /* ═══════════════════ JOUR — SURVIVRE ═══════════════════ */

    {
      id: 'beg', ico: '🥺', n: 'Faire la manche', accent: 'var(--g-faim)', when: 'day',
      d: 'Tendre la main dans un lieu de passage. Rentable le midi et le soir.',
      hours: 2, energy: 10, req: {},
      run: function (G) {
        var per = { matin: 0.85, midi: 1.3, soir: 1.15, nuit: 0.5 }[G.period()] || 1;
        var base = (3 + G.lvl('charisme') * 2.6 + G.apparence() * 0.10) * per * G.rndF(0.6, 1.45);
        if (G.gauge('hygiene') < 25) base *= 0.55;
        if (G.gauge('moral') < 30) base *= 0.8;
        if (G.has('carton')) base *= 1.08;
        if (G.flags('begBoost')) base *= 1.25;
        if (G.flags('dog')) base *= 1.18;
        var gain = Math.max(0, Math.round(base));
        G.cash(gain, 'Manche');
        G.xp('charisme', 4);
        G.add('moral', -4);
        G.rep('rue', 0.5);
        G.hist('beg');

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
      id: 'recycle', ico: '🥫', n: 'Collecter les canettes', accent: 'var(--info)', when: 'day',
      d: 'Fastidieux, sale, sans aucun risque. Le revenu du désespoir tranquille.',
      hours: 3, energy: 16, req: {},
      run: function (G) {
        var gain = G.rnd(6, 13) + Math.round(G.lvl('force') * 1.6);
        G.cash(gain, 'Consigne');
        G.add('hygiene', -9); G.xp('force', 5); G.add('moral', -2);
        if (G.chance(8)) { G.give('conserve', 1); return { t: 'good', m: 'Un carton oublié derrière une supérette. <b>' + G.eur(gain) + '</b> et des conserves.' }; }
        return { t: 'money', m: 'Trois heures à écumer les parcs. La consigne vous rend <b>' + G.eur(gain) + '</b>.' };
      }
    },

    {
      id: 'scavenge', ico: '🗑️', n: 'Fouiller les poubelles', accent: '#8a7d5f', when: 'any',
      d: 'Derrière les supermarchés, à la fermeture. Nourriture, parfois mieux.',
      hours: 2, energy: 13, req: {},
      run: function (G) {
        G.add('hygiene', -14);
        var bonus = G.isNight() ? 12 : 0;   // les bennes sont sorties le soir
        var r = G.rnd(1, 100) + bonus;
        if (r <= 34) { G.add('faim', 24); return { t: 'good', m: 'Invendus du jour, encore emballés. Vous mangez à votre faim.' }; }
        if (r <= 52) { G.give('sandwich', 1); G.add('faim', 8); return { t: 'good', m: 'Un carton entier de sandwichs périmés d’une heure. Vous en gardez un.' }; }
        if (r <= 66) { var g = G.rnd(4, 16); G.cash(g, 'Revente'); return { t: 'money', m: 'Un objet en bon état, revendu <b>' + G.eur(g) + '</b> au ferrailleur.' }; }
        if (r <= 78) { G.give('eau', 2); return { t: 'neutral', m: 'Deux bouteilles d’eau intactes. C’est déjà ça.' }; }
        if (r <= 88) { G.add('sante', -6); G.add('moral', -4); return { t: 'bad', m: 'Du verre. Vous vous entaillez la main et rentrez les poches vides.' }; }
        return { t: 'neutral', m: 'Rien. Le container avait déjà été vidé par d’autres.' };
      }
    },

    {
      id: 'soup', ico: '🍲', n: 'Soupe populaire', accent: 'var(--good)', when: 'day',
      d: 'Repas chaud gratuit distribué par l’association. Midi et soir uniquement.',
      hours: 1, energy: 3, req: { period: ['midi', 'soir'] },
      run: function (G) {
        G.add('faim', 38); G.add('moral', 6); G.add('sante', 2);
        G.aff('sofia', 3); G.hist('soup');
        if (G.chance(18)) { G.give('eau', 1); G.aff('marcel', 2); return { t: 'good', m: 'Repas chaud, et Marcel vous garde une place à sa table. On parle un peu.' }; }
        if (G.chance(10)) { G.aff('lucien', 3); return { t: 'good', m: 'Vous partagez la table de Lucien, qui vous explique en détail le marché obligataire. C’est étrangement passionnant.' }; }
        return { t: 'good', m: 'Soupe, pain, café. Vingt minutes où vous n’êtes pas invisible.' };
      }
    },

    {
      id: 'wash', ico: '🚰', n: 'Se laver à la fontaine', accent: 'var(--g-hygiene)', when: 'any',
      d: 'De l’eau froide dans un parc. Avec du savon, c’est bien plus efficace.',
      hours: 1, energy: 5, req: {},
      run: function (G) {
        if (G.has('savon')) {
          G.take('savon', 1);
          G.set('hygiene', Math.min(88, G.gauge('hygiene') + 34));
          G.add('moral', 5);
          return { t: 'good', m: 'Avec le savon, vous vous sentez presque neuf. Le regard des gens change.' };
        }
        G.set('hygiene', Math.max(G.gauge('hygiene'), Math.min(52, G.gauge('hygiene') + 20)));
        G.add('moral', 2); G.add('sante', -1);
        return { t: 'neutral', m: 'Eau glacée, pas de savon. Le plafond du propre est vite atteint.' };
      }
    },

    {
      id: 'shower', ico: '🛁', n: 'Prendre une douche', accent: 'var(--g-hygiene)', when: 'any',
      d: 'Chez vous, à l’eau chaude. Hygiène au maximum.',
      hours: 1, energy: 2, req: { shower: true },
      run: function (G) {
        G.set('hygiene', 100); G.add('moral', 6); G.add('energie', 4);
        return { t: 'good', m: 'Eau chaude. Vous restez dessous plus longtemps que nécessaire.' };
      }
    },

    {
      id: 'barber', ico: '💈', n: 'Coiffeur & rasage', accent: 'var(--g-hygiene)', when: 'day',
      d: 'Douze euros qui valent plus qu’une chemise neuve pour un entretien.',
      hours: 1, energy: 3, req: { money: 12 },
      run: function (G) {
        G.cash(-12, 'Coiffeur');
        G.flag('groomed', G.day() + 12);
        G.add('moral', 8); G.add('hygiene', 10);
        return { t: 'good', m: 'Coupe nette, nuque rasée. Pendant douze jours, votre apparence gagne 8 points.' };
      }
    },

    {
      id: 'rest', ico: '☕', n: 'Se reposer', accent: 'var(--g-energie)', when: 'any',
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
      id: 'nap', ico: '😴', n: 'Somme rapide', accent: 'var(--g-energie)', when: 'any',
      d: 'Une heure les yeux fermés. Moins efficace, mais moins cher en temps.',
      hours: 1, energy: -11, req: {},
      run: function (G) { return { t: 'neutral', m: 'Soixante minutes de sommeil volé. Ça suffira pour tenir.' }; }
    },

    {
      id: 'library', ico: '📚', n: 'Aller à la bibliothèque', accent: 'var(--info)', when: 'day',
      d: 'Chaud, gratuit, silencieux. Le meilleur investissement de la rue.',
      hours: 3, energy: 9, req: { hyg: 25 },
      run: function (G) {
        G.xp('intelligence', 12); G.add('moral', 4);
        if (G.has('ordi') || G.has('smartphone')) G.xp('intelligence', 5);
        if (G.chance(10)) { G.give('livre', 1); return { t: 'good', m: 'Vous lisez trois heures. Un bibliothécaire vous offre un livre du bac à dons.' }; }
        return { t: 'good', m: 'Trois heures au chaud, à lire. Personne ne vous demande rien.' };
      }
    },

    {
      id: 'workout', ico: '🏋️', n: 'Faire du sport', accent: '#f07a5a', when: 'any',
      d: 'Barres de parc, course, pompes. Le corps est votre premier outil de travail.',
      hours: 2, energy: 22, req: { sante: 25 },
      run: function (G) {
        G.xp('force', 13); G.add('hygiene', -12); G.add('moral', 5); G.add('sante', 3); G.add('faim', -6);
        return { t: 'good', m: 'Vous poussez jusqu’à trembler. Demain vous serez un peu plus solide.' };
      }
    },

    {
      id: 'parkour', ico: '🤸', n: 'Grimper, courir, sauter', accent: '#f07a5a', when: 'any',
      d: 'Les toits, les grilles, les échafaudages. Entraîne à la fois le corps et la discrétion.',
      hours: 2, energy: 26, req: { sante: 35, force: 2 },
      run: function (G) {
        G.xp('force', 8); G.xp('discretion', 11); G.add('hygiene', -10); G.add('moral', 6);
        if (G.chance(12)) { G.add('sante', -12); return { t: 'bad', m: 'Une réception ratée sur du gravier. Vous boitez le reste de la journée.' }; }
        return { t: 'good', m: 'Vous apprenez la ville par ses arrières : gouttières, murets, toits plats.' };
      }
    },

    {
      id: 'leisure', ico: '🎬', n: 'Se faire plaisir en ville', accent: 'var(--purple)', when: 'day',
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
      id: 'admin', ico: '🗃️', n: 'Démarches administratives', accent: 'var(--info)', when: 'day',
      d: 'Guichets, files d’attente, formulaires. Ingrat, lent, et pourtant décisif.',
      hours: 4, energy: 14, req: { hyg: 20 },
      run: function (G) {
        var g = G.rnd(3, 7) + (G.has('smartphone') ? 2 : 0);
        G.rep('legale', g); G.add('moral', -7); G.xp('intelligence', 6);
        G.hist('admin');
        if (G.flags('nopapers') && G.hist('admin', 0) >= 5) {
          G.flag('nopapers', false); G.rep('legale', 12);
          return { t: 'good', m: '<b>Titre de séjour obtenu.</b> Cinq passages au guichet, et vous existez enfin sur le papier.' };
        }
        if (G.chance(18)) { G.rep('legale', 4); G.cash(G.rnd(60, 220), 'Aide d’urgence'); return { t: 'money', m: 'Une aide d’urgence vous est accordée. Le dossier avance : réputation légale +' + (g + 4) + '.' }; }
        return { t: 'neutral', m: 'Quatre heures de file. Un tampon. Réputation légale +' + g + '.' };
      }
    },

    {
      id: 'jobcenter', ico: '🏛️', n: 'Agence pour l’emploi', accent: 'var(--info)', when: 'day',
      d: 'Un conseiller, un CV, des offres. Facilite les entretiens pendant plusieurs jours.',
      hours: 3, energy: 12, req: { addr: true, hyg: 35 },
      run: function (G) {
        G.flag('coached', G.day() + 8);
        G.rep('legale', 3); G.xp('charisme', 6); G.add('moral', -3);
        if (G.chance(22)) { G.cash(G.rnd(80, 260), 'Allocation'); return { t: 'money', m: 'Vos droits sont ouverts. Une allocation tombe, et vos entretiens seront plus faciles 8 jours.' }; }
        return { t: 'good', m: 'CV relu, lettre corrigée, simulation d’entretien. +18 % de réussite aux entretiens pendant 8 jours.' };
      }
    },

    {
      id: 'medic', ico: '⚕️', n: 'Consultation gratuite', accent: 'var(--good)', when: 'day',
      d: 'Permanence médicale de l’association. Longue attente, vrais soins.',
      hours: 3, energy: 6, req: {},
      run: function (G) {
        var heal = G.rnd(18, 30);
        G.add('sante', heal); G.aff('sofia', 2);
        if (G.flags('addict') && G.chance(45)) {
          G.flag('addict', Math.max(0, G.flags('addict') - 1));
          return { t: 'good', m: 'On vous met sous traitement de substitution. Santé +' + heal + ', et votre dépendance recule d’un cran.' };
        }
        return { t: 'good', m: 'Trois heures d’attente, un vrai examen. Santé +' + heal + '.' };
      }
    },

    {
      id: 'plasma', ico: '🩸', n: 'Don de plasma indemnisé', accent: 'var(--danger)', when: 'day',
      d: 'Légal, encadré, épuisant. Deux fois par semaine maximum.',
      hours: 3, energy: 24, req: { sante: 55, hyg: 40 },
      run: function (G) {
        if (G.flags('plasmaUntil') > G.day()) return { t: 'bad', m: 'Le centre refuse : votre dernier don est trop récent.' };
        G.flag('plasmaUntil', G.day() + 3);
        var gain = G.rnd(32, 48);
        G.cash(gain, 'Don de plasma');
        G.add('sante', -9); G.add('energie', -8);
        return { t: 'money', m: 'Trois heures allongé, une aiguille dans le bras. <b>' + G.eur(gain) + '</b>.' };
      }
    },

    {
      id: 'survey', ico: '📋', n: 'Micro-tâches en ligne', accent: 'var(--info)', when: 'any',
      d: 'Sondages, étiquetage de données, transcriptions. Peu payé, mais faisable partout.',
      hours: 2, energy: 9, req: { item: 'smartphone' },
      run: function (G) {
        var gain = G.rnd(7, 14) + G.lvl('intelligence') * 2 + (G.has('ordi') ? 9 : 0);
        G.cash(gain, 'Micro-tâches');
        G.xp('intelligence', 5); G.add('moral', -3);
        return { t: 'money', m: 'Deux heures d’écran, l’esprit ailleurs. <b>' + G.eur(gain) + '</b>.' };
      }
    },

    {
      id: 'tutor', ico: '✏️', n: 'Cours particuliers', accent: 'var(--good)', when: 'day',
      d: 'Vous savez enfin quelque chose que d’autres paient pour apprendre.',
      hours: 3, energy: 14, req: { edu: 3, app: 45, hyg: 45 },
      run: function (G) {
        var gain = G.rnd(30, 45) + G.lvl('intelligence') * 9;
        G.cash(gain, 'Cours particuliers');
        G.xp('intelligence', 9); G.xp('charisme', 6); G.rep('legale', 2);
        return { t: 'money', m: 'Deux élèves, une table de cuisine, <b>' + G.eur(gain) + '</b>. Et le respect qui va avec.' };
      }
    },

    {
      id: 'therapy', ico: '🫂', n: 'Groupe de parole', accent: 'var(--purple)', when: 'day',
      d: 'Une salle, des chaises en cercle, des gens qui ont vécu la même chose.',
      hours: 2, energy: 5, req: {},
      run: function (G) {
        G.add('moral', 18); G.aff('sofia', 4); G.xp('charisme', 5);
        if (G.flags('addict') && G.chance(35)) {
          G.flag('addict', Math.max(0, G.flags('addict') - 1));
          return { t: 'good', m: 'Vous parlez pour la première fois. À la fin, quelqu’un vous serre l’épaule. Votre dépendance recule.' };
        }
        return { t: 'good', m: 'Deux heures à écouter et à être écouté. Le moral remonte franchement.' };
      }
    },

    {
      id: 'busk', ico: '🎸', n: 'Manche musicale', accent: 'var(--purple)', when: 'any',
      d: 'Jouer dans le métro. Plus digne, plus rentable, et le public vous forme.',
      hours: 3, energy: 15, req: { item: 'guitare' },
      run: function (G) {
        var per = { matin: 1.05, midi: 1.15, soir: 1.35, nuit: 0.85 }[G.period()] || 1;
        var gain = Math.round((6 + G.lvl('charisme') * 4.4) * per * G.rndF(0.7, 1.5) * (G.has('sono') ? 1.7 : 1));
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
      id: 'hawk', ico: '👜', n: 'Vendre à la sauvette', accent: '#c08a4e', when: 'any', risky: true,
      d: 'Étaler une bâche, vendre des contrefaçons, replier en trente secondes.',
      hours: 3, energy: 18, req: { item: 'contrefacon' },
      run: function (G) {
        G.take('contrefacon', 1);
        var ok = 62 + G.lvl('charisme') * 3 + G.lvl('discretion') * 2 - G.heatVal() * 0.25;
        if (G.chance(ok)) {
          var gain = G.rnd(180, 300) + G.lvl('charisme') * 14;
          G.cash(gain, 'Vente à la sauvette');
          G.xp('charisme', 8); G.rep('rue', 2); G.heat(5);
          return { t: 'money', m: 'La bâche se vide en trois heures. <b>' + G.eur(gain) + '</b>, et personne n’a rien vu.' };
        }
        G.heat(14); G.rep('legale', -3);
        G.arrestCheck('vente de contrefaçons', 1);
        return { t: 'bad', m: 'La brigade arrive par les deux bouts de la rue. Tout le stock est saisi.' };
      }
    },

    /* ═══════════════════ NUIT — LÉGAL / GRIS ═══════════════════ */

    {
      id: 'nightwatch', ico: '🔦', n: 'Gardiennage de nuit', accent: 'var(--good)', when: 'night',
      d: 'Surveiller un chantier ou un parking jusqu’à l’aube. Payé, légal, mortellement ennuyeux.',
      hours: 4, energy: 20, req: { hyg: 35, sante: 30 },
      run: function (G) {
        var gain = G.rnd(55, 80) + G.lvl('force') * 5;
        G.cash(gain, 'Gardiennage');
        G.xp('force', 6); G.rep('legale', 2); G.add('moral', -4);
        if (G.chance(14)) {
          G.cash(40, 'Prime');
          G.xp('discretion', 8); G.rep('rue', 2);
          return { t: 'good', m: 'Deux silhouettes tentent d’entrer. Vous braquez la lampe, elles partent. Total <b>' + G.eur(gain + 40) + '</b>.' };
        }
        return { t: 'money', m: 'Quatre heures de rondes et de café froid. <b>' + G.eur(gain) + '</b>.' };
      }
    },

    {
      id: 'nightclean', ico: '🧹', n: 'Nettoyage de bureaux', accent: 'var(--good)', when: 'night',
      d: 'Les plateaux se vident à 21h, on entre à 22h. Payé au noir, sans un mot.',
      hours: 4, energy: 26, req: { hyg: 40 },
      run: function (G) {
        var gain = G.rnd(48, 68) + G.lvl('force') * 3;
        G.cash(gain, 'Nettoyage de nuit');
        G.add('hygiene', -10); G.xp('force', 6); G.rep('legale', 1);
        if (G.chance(9)) { G.give('smartphone', 1); return { t: 'good', m: 'Un téléphone oublié sur un bureau. Personne ne le réclamera. <b>' + G.eur(gain) + '</b> et un smartphone.' }; }
        return { t: 'money', m: 'Vingt étages, deux aspirateurs, aucune conversation. <b>' + G.eur(gain) + '</b>.' };
      }
    },

    {
      id: 'nightbar', ico: '🍸', n: 'Faire la fermeture d’un bar', accent: 'var(--purple)', when: 'night',
      d: 'Aider derrière le comptoir jusqu’à la fermeture. Pourboires, contacts, et beaucoup de bruit.',
      hours: 4, energy: 24, req: { app: 45, charisme: 2 },
      run: function (G) {
        var gain = G.rnd(35, 55) + G.lvl('charisme') * 11;
        G.cash(gain, 'Pourboires');
        G.xp('charisme', 14); G.add('moral', 4); G.add('hygiene', -8);
        G.aff('renard', 2);
        if (G.chance(20)) { G.aff('karim', 4); G.rep('rue', 3); return { t: 'money', m: '<b>' + G.eur(gain) + '</b>. Et un habitué du fond de salle vous glisse un numéro « au cas où ».' }; }
        return { t: 'money', m: 'Quatre heures de service, <b>' + G.eur(gain) + '</b> de pourboires, les oreilles qui sifflent.' };
      }
    },

    {
      id: 'nightclub', ico: '🪩', n: 'Sortir en boîte', accent: 'var(--purple)', when: 'night',
      d: 'Coûteux et épuisant. Mais c’est la nuit qu’on rencontre ceux qui décident.',
      hours: 4, energy: 28, req: { money: 40, app: 50 },
      run: function (G) {
        G.cash(-(40 + G.lvl('charisme') * 4), 'Soirée');
        G.add('moral', 24); G.xp('charisme', 12); G.add('hygiene', -12);
        var r = G.rnd(1, 100);
        if (r <= 18) { G.aff('vidal', 5); G.rep('legale', 3); return { t: 'good', m: 'Vous passez la soirée à la table d’un carré VIP. Des gens qui comptent retiennent votre visage.' }; }
        if (r <= 34) { G.aff('karim', 5); G.rep('rue', 4); return { t: 'good', m: 'Le fumoir est plus intéressant que la piste. Vous en ressortez avec deux contacts du milieu.' }; }
        if (r <= 44) { var l = G.rnd(20, 90); G.cash(-l, 'Poches vidées'); return { t: 'bad', m: 'Quelqu’un vous a fait les poches dans la foule. −' + G.eur(l) + '.' }; }
        return { t: 'good', m: 'Trop de monde, trop fort, trop cher. Et pourtant vous vous sentez vivant.' };
      }
    },

    {
      id: 'nightstudy', ico: '🕯️', n: 'Réviser jusqu’à l’aube', accent: 'var(--info)', when: 'night',
      d: 'Personne ne vous dérange à 2h du matin. Le cerveau, lui, proteste.',
      hours: 3, energy: 22, req: { sante: 30 },
      run: function (G) {
        G.xp('intelligence', 22 + (G.has('ordi') ? 8 : 0));
        G.add('moral', -6); G.add('sante', -3);
        if (G.eduLeft()) { G.addEduProgress(1); return { t: 'good', m: 'Trois heures de nuit blanche studieuse. Une séance de formation validée en plus.' }; }
        if (G.filiereLevel()) { G.s.filiereProg++; return { t: 'good', m: 'Trois heures de nuit blanche studieuse. Une séance de plus dans votre filière.' }; }
        return { t: 'good', m: 'Trois heures de nuit blanche studieuse. Beaucoup d’XP, un dos en morceaux.' };
      }
    },

    {
      id: 'nightwalk', ico: '🌃', n: 'Errer dans la ville', accent: 'var(--text-3)', when: 'night',
      d: 'Marcher sans but pour ne pas dormir dehors immobile. C’est plus sûr, c’est plus long.',
      hours: 2, energy: 12, req: {},
      run: function (G) {
        G.xp('discretion', 6); G.add('moral', -2);
        var r = G.rnd(1, 100);
        if (r <= 14) { var g = G.rnd(3, 25); G.cash(g, 'Trouvaille'); return { t: 'money', m: 'Un billet froissé au pied d’un distributeur. <b>' + G.eur(g) + '</b>.' }; }
        if (r <= 24) { G.aff('marcel', 4); return { t: 'good', m: 'Vous croisez Marcel, insomniaque comme vous. Vous marchez ensemble une heure.' }; }
        if (r <= 32) { G.heat(4); return { t: 'bad', m: 'Une patrouille vous suit sur trois cents mètres avant de renoncer.' }; }
        if (r <= 40) { G.rep('rue', 2); G.xp('discretion', 6); return { t: 'neutral', m: 'Vous apprenez les horaires des rondes, les portes qui restent ouvertes, les caméras mortes.' }; }
        return { t: 'neutral', m: 'Deux heures de bitume et de vitrines éteintes. La ville n’appartient à personne, la nuit.' };
      }
    },

    {
      id: 'nightqueue', ico: '🎟️', n: 'Faire la queue pour d’autres', accent: 'var(--good)', when: 'night',
      d: 'Préfecture, billetterie, sneakers en édition limitée. On paie votre place dans la file.',
      hours: 4, energy: 16, req: {},
      run: function (G) {
        var gain = G.rnd(38, 62);
        G.cash(gain, 'Place dans la file');
        G.add('moral', -5); G.add('sante', -3);
        if (G.chance(15)) { G.rep('legale', 2); G.cash(25, 'Pourboire'); return { t: 'money', m: 'Le client arrive à 7h, ravi. <b>' + G.eur(gain + 25) + '</b> au total, et il reprendra votre numéro.' }; }
        return { t: 'money', m: 'Sept heures debout dans le froid, quatre facturées. <b>' + G.eur(gain) + '</b>.' };
      }
    },

    {
      id: 'nightpray', ico: '⛪', n: 'Veillée d’accueil de nuit', accent: 'var(--good)', when: 'night',
      d: 'Une paroisse ouvre sa salle jusqu’à 3h. Café, chaises, un peu de chaleur humaine.',
      hours: 3, energy: 4, req: {},
      run: function (G) {
        G.add('moral', 14); G.add('faim', 18); G.add('sante', 3); G.aff('sofia', 3);
        if (G.chance(20)) { G.give('conserve', 2); return { t: 'good', m: 'On vous fait un colis avant de partir. Trois heures au chaud et de quoi manger demain.' }; }
        return { t: 'good', m: 'Trois heures assis au chaud, à parler ou à ne rien dire. La nuit passe plus vite.' };
      }
    },

    {
      id: 'nightgamble', ico: '🎲', n: 'Partie de cartes en arrière-salle', accent: 'var(--gold)', when: 'night', risky: true,
      d: 'Mise de 50 €. Le charisme sert à bluffer, l’intelligence à compter.',
      hours: 3, energy: 16, req: { money: 50, repRue: 10 },
      run: function (G) {
        G.cash(-50, 'Mise');
        var skill = 34 + G.lvl('charisme') * 3.5 + G.lvl('intelligence') * 3.5;
        G.xp('charisme', 6); G.xp('intelligence', 6);
        if (G.chance(skill)) {
          var win = G.rnd(90, 260) + G.lvl('intelligence') * 12;
          G.cash(win, 'Gains au jeu');
          G.rep('rue', 3); G.add('moral', 10); G.hist('gambleWin');
          return { t: 'money', m: 'Vous ramassez le pot. <b>' + G.eur(win) + '</b>. On vous regarde autrement.' };
        }
        G.add('moral', -12); G.rep('rue', -1); G.hist('gambleLoss');
        if (G.chance(20)) { G.flag('cardDebt', (G.flags('cardDebt') || 0) + 250); return { t: 'bad', m: 'Vous jouez sur parole pour vous refaire. Vous devez maintenant 250 € à des gens patients — un temps.' }; }
        return { t: 'bad', m: 'Cinquante euros et trois heures. Le type en face comptait mieux que vous.' };
      }
    },

    {
      id: 'nightsleeprough', ico: '🌡️', n: 'Chercher un abri de nuit', accent: 'var(--info)', when: 'night',
      d: 'Parking souterrain, hall d’immeuble, laverie ouverte. Réduit fortement les risques de la nuit.',
      hours: 2, energy: 8, req: {},
      run: function (G) {
        var p = 45 + G.lvl('discretion') * 6 + G.repVal('rue') * 0.3;
        if (G.chance(p)) {
          G.flag('shelteredNight', true);
          G.add('moral', 5);
          return { t: 'good', m: 'Une laverie automatique ouverte toute la nuit, une chaise, un radiateur. Vous dormirez au sec.' };
        }
        G.add('moral', -5);
        return { t: 'bad', m: 'Deux heures à essayer des portes. Toutes fermées. Vous dormirez là où vous pourrez.' };
      }
    }
  ];

  D.ACTION = {};
  D.ACTIONS.forEach(function (a) { D.ACTION[a.id] = a; });

})(window.LifeRPG);
