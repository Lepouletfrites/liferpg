/* =============================================================
   data.buildings.js — La ville : commerces et casino.
   Chaque commerce vend certaines catégories d'objets et possède
   une sécurité (0-10) qui conditionne le vol à l'étalage.
   ============================================================= */
(function (NS) {
  'use strict';
  var D = NS.D;

  /* ---------------------------------------------------------
     COMMERCES
     cats     : catégories de D.ITEMS vendues ici
     sec      : niveau de sécurité (vigiles, portiques, caméras)
     markup   : coefficient appliqué au prix de base
     sentence : peine encourue en cas de vol à l'étalage
     --------------------------------------------------------- */
  D.SHOPS = [
    {
      id: 'superette', n: 'Supérette du coin', ico: '🏪', sec: 2, markup: 1,
      cats: ['food', 'care'], when: 'any', sentence: 3,
      d: 'Ouverte tard, mal surveillée, un vigile qui regarde son téléphone.'
    },
    {
      id: 'supermarche', n: 'Supermarché', ico: '🛒', sec: 4, markup: 0.9,
      cats: ['food', 'care', 'tool'], when: 'day', sentence: 5,
      d: 'Moins cher au volume, mais portiques à la sortie et vigiles en civil.'
    },
    {
      id: 'pharmacie', n: 'Pharmacie', ico: '💊', sec: 5, markup: 1.15,
      cats: ['care'], when: 'day', sentence: 8,
      d: 'Comptoir haut, tout derrière la caisse. On vous regarde entrer.'
    },
    {
      id: 'friperie', n: 'Friperie solidaire', ico: '👕', sec: 1, markup: 0.75,
      cats: ['tenue'], when: 'day', sentence: 2, maxPrice: 300,
      d: 'Deux bénévoles, aucun portique. Les prix sont déjà cassés.'
    },
    {
      id: 'boutique', n: 'Boutique de prêt-à-porter', ico: '🧥', sec: 5, markup: 1.1,
      cats: ['tenue'], when: 'day', sentence: 6,
      d: 'Antivols sur chaque cintre, vendeuse qui ne vous lâche pas des yeux.'
    },
    {
      id: 'quincaillerie', n: 'Quincaillerie', ico: '🧰', sec: 3, markup: 1,
      cats: ['tool'], when: 'day', sentence: 4,
      d: 'Rayons profonds, angles morts, personnel débordé.'
    },
    {
      id: 'electro', n: 'Magasin d’électronique', ico: '📱', sec: 7, markup: 1.05,
      cats: ['tech'], when: 'day', sentence: 12,
      d: 'Tout est câblé, filmé, et le stock est en réserve fermée.'
    },
    {
      id: 'concession', n: 'Concession automobile', ico: '🚗', sec: 6, markup: 1,
      cats: ['transport'], when: 'day', sentence: 25,
      d: 'On vous propose un café avant de regarder votre solvabilité.'
    },
    {
      id: 'joaillerie', n: 'Joaillerie', ico: '💎', sec: 9, markup: 1.2,
      cats: ['luxe'], when: 'day', sentence: 40, req: { app: 55 },
      d: 'Sas d’entrée, vitrines blindées, bouton sous le comptoir.'
    }
  ];
  D.SHOP = {};
  D.SHOPS.forEach(function (s) { D.SHOP[s.id] = s; });

  /* ---------------------------------------------------------
     CASINO — jeux d'argent.
     edge  : espérance de gain du joueur (négative = la maison gagne)
     Chaque jeu définit play(G, bet) qui renvoie
     { win: gain net (peut être négatif), m: texte, t: type }
     --------------------------------------------------------- */
  D.CASINO_MIN = 20;

  D.CASINO = [
    {
      id: 'slots', n: 'Machines à sous', ico: '🎰', min: 5, max: 200,
      d: 'Aucune compétence, aucune décision. Le pire rendement de la salle, et le plus hypnotique.',
      stat: null,
      play: function (G, bet) {
        var r = G.rnd(1, 1000);
        if (r <= 3) return { win: bet * 80, t: 'jackpot', m: 'Trois jackpots alignés. La machine hurle, la salle se retourne.' };
        if (r <= 20) return { win: bet * 15, t: 'good', m: 'Trois symboles identiques. La sébile crache pendant dix secondes.' };
        if (r <= 90) return { win: bet * 3, t: 'good', m: 'Une combinaison payante. De quoi relancer.' };
        if (r <= 260) return { win: 0, t: 'neutral', m: 'Mise remboursée. Vous n’avez ni gagné ni perdu — vous avez juste passé du temps.' };
        return { win: -bet, t: 'bad', m: 'Rien. Le rouleau s’arrête un cran trop loin, comme toujours.' };
      }
    },
    {
      id: 'roulette', n: 'Roulette', ico: '🔴', min: 10, max: 1500,
      d: 'Rouge ou noir : presque une chance sur deux. Le zéro est la marge de la maison.',
      stat: null,
      bets: [
        { id: 'color', l: 'Rouge / Noir', mult: 2, p: 48.6, h: 'Paie double' },
        { id: 'dozen', l: 'Une douzaine', mult: 3, p: 32.4, h: 'Paie triple' },
        { id: 'number', l: 'Un numéro plein', mult: 36, p: 2.7, h: 'Paie 36×' }
      ],
      play: function (G, bet, choice) {
        var b = this.bets.filter(function (x) { return x.id === choice; })[0] || this.bets[0];
        var n = G.rnd(0, 36);
        var won = G.chance(b.p);
        if (won) return { win: bet * (b.mult - 1), t: b.mult >= 36 ? 'jackpot' : 'good', m: 'La bille tombe sur le ' + n + '. Vous aviez vu juste.' };
        return { win: -bet, t: 'bad', m: 'La bille tombe sur le ' + n + '. Le croupier ramasse sans vous regarder.' };
      }
    },
    {
      id: 'blackjack', n: 'Blackjack', ico: '🃏', min: 20, max: 3000,
      d: 'Le seul jeu où votre tête compte vraiment : compter les cartes se joue à l’Intelligence.',
      stat: 'intelligence',
      play: function (G, bet) {
        /* Le point d'équilibre est à 48,9 % de mains gagnées : même joué
           parfaitement, le blackjack reste légèrement perdant. */
        var p = 40 + G.lvl('intelligence') * 0.85;
        var r = G.rnd(1, 100);
        if (r <= 8) return { win: 0, t: 'neutral', m: 'Égalité. Vous récupérez votre mise.' };
        if (G.chance(p)) {
          G.xp('intelligence', 3);
          if (G.chance(9)) return { win: Math.round(bet * 1.5), t: 'good', m: 'Blackjack servi. Payé une fois et demie.' };
          return { win: bet, t: 'good', m: 'Vous tirez à 16 contre un 10 du croupier — et vous avez raison.' };
        }
        return { win: -bet, t: 'bad', m: 'Le croupier retourne un valet. Vous êtes à 22.' };
      }
    },
    {
      id: 'poker', n: 'Poker — table basse', ico: '♠️', min: 50, max: 5000,
      d: 'On ne joue pas contre la maison mais contre cinq inconnus. Le bluff se paie au Charisme.',
      stat: 'charisme',
      play: function (G, bet) {
        /* Contre cinq joueurs, un débutant se fait plumer (~ −27 %) ;
           au sommet du charisme on approche l'équilibre sans le franchir. */
        var p = 25 + G.lvl('charisme') * 1.2 + G.lvl('intelligence') * 0.7 + (G.gauge('moral') - 50) * 0.08;
        if (G.apparence() < 40) p -= 6;     // on ne vous prend pas au sérieux
        if (G.chance(p)) {
          var big = G.chance(18);
          G.xp('charisme', 5);
          return {
            win: Math.round(bet * (big ? 2.6 : 1.15)),
            t: big ? 'jackpot' : 'good',
            m: big ? 'Vous encaissez un très gros pot après un bluff tenu jusqu’au bout.'
                   : 'Vous remportez le coup sans jamais montrer vos cartes.'
          };
        }
        return { win: -bet, t: 'bad', m: 'Vous payez pour voir. Il avait la couleur.' };
      }
    },
    {
      id: 'des', n: 'Craps — table de dés', ico: '🎲', min: 10, max: 800,
      d: 'Rapide, bruyant, presque équitable. On y perd lentement et joyeusement.',
      stat: null,
      play: function (G, bet) {
        var a = G.rnd(1, 6), b = G.rnd(1, 6), t = a + b;
        if (t === 7 || t === 11) return { win: bet, t: 'good', m: 'Un ' + a + ' et un ' + b + ' : ' + t + '. La table applaudit.' };
        if (t === 2 || t === 3 || t === 12) return { win: -bet, t: 'bad', m: 'Un ' + a + ' et un ' + b + ' : ' + t + '. Craps. Perdu d’entrée.' };
        /* point à établir : on rejoue jusqu'au 7 */
        var point = t, guard = 0;
        while (guard++ < 40) {
          var x = G.rnd(1, 6) + G.rnd(1, 6);
          if (x === point) return { win: bet, t: 'good', m: 'Point de ' + point + ' réussi avant le 7.' };
          if (x === 7) return { win: -bet, t: 'bad', m: 'Le 7 sort avant votre point de ' + point + '.' };
        }
        return { win: 0, t: 'neutral', m: 'La partie s’éternise, vous reprenez votre mise.' };
      }
    },
    {
      id: 'paris', n: 'Paris sportifs', ico: '⚽', min: 10, max: 2000,
      d: 'Il faut suivre les équipes. L’Intelligence remplace la chance, un peu.',
      stat: 'intelligence',
      play: function (G, bet) {
        /* La marge du bookmaker ne se referme jamais complètement. */
        var p = 37 + G.lvl('intelligence') * 0.9;
        if (G.chance(p)) {
          var combo = G.chance(15);
          return {
            win: Math.round(bet * (combo ? 2.8 : 0.85)),
            t: combo ? 'jackpot' : 'good',
            m: combo ? 'Votre combiné passe en entier. Personne n’y croyait.' : 'Le pari passe dans les arrêts de jeu.'
          };
        }
        return { win: -bet, t: 'bad', m: 'Égalisation à la 89e. Le ticket ne vaut plus rien.' };
      }
    }
  ];
  D.CASINO_GAME = {};
  D.CASINO.forEach(function (g) { D.CASINO_GAME[g.id] = g; });

  /* ---------------------------------------------------------
     AUTRES LIEUX — salle de sport, et de quoi en ajouter d'autres
     --------------------------------------------------------- */
  D.VENUES = [
    {
      id: 'gym', n: 'Salle de sport', ico: '🏋️', when: 'any',
      d: 'Machines, tapis, poids libres. Le corps est un capital qui se déprécie sans entretien.',
      req: {},
      sessions: [
        {
          id: 'free', n: 'Barres du parc', ico: '🤸', hours: 2, energy: 22, price: 0,
          d: 'Gratuit, dehors, sans matériel. Ça marche quand même.',
          run: function (G) {
            G.xp('force', 13); G.add('hygiene', -12); G.add('moral', 5);
            G.add('sante', 3); G.add('faim', -6);
            return { t: 'good', m: 'Vous poussez jusqu’à trembler. Demain vous serez un peu plus solide.' };
          }
        },
        {
          id: 'session', n: 'Séance en salle', ico: '🏋️', hours: 2, energy: 26, price: 12,
          d: 'Machines guidées, douches comprises. Bien plus efficace que le parc.',
          run: function (G) {
            G.xp('force', 26); G.add('moral', 8); G.add('sante', 5); G.add('faim', -8);
            G.set('hygiene', Math.min(100, G.gauge('hygiene') + 20));
            return { t: 'good', m: 'Deux heures de fonte, puis une douche chaude. Le corps répond.' };
          }
        },
        {
          id: 'coach', n: 'Séance avec coach', ico: '🧑‍🏫', hours: 3, energy: 32, price: 55,
          d: 'Programme personnalisé. Cher, mais on progresse deux fois plus vite.',
          req: { charisme: 2 },
          run: function (G) {
            G.xp('force', 52); G.add('moral', 12); G.add('sante', 8); G.add('faim', -10);
            G.set('hygiene', Math.min(100, G.gauge('hygiene') + 20));
            G.xp('charisme', 4);
            return { t: 'good', m: 'Le coach corrige chaque mouvement. Vous découvrez des muscles que vous ignoriez.' };
          }
        },
        {
          id: 'boxe', n: 'Cours de boxe', ico: '🥊', hours: 3, energy: 34, price: 30,
          d: 'Apprendre à encaisser et à rendre. Utile bien au-delà du ring.',
          req: { sante: 45 },
          run: function (G) {
            G.xp('force', 38); G.xp('discretion', 10); G.add('sante', -4); G.add('moral', 10);
            G.flag('boxer', (G.flags('boxer') || 0) + 1);
            return { t: 'good', m: 'Trois rounds, deux gnons pris, un rendu. Vous saurez vous défendre dehors.' };
          }
        },
        {
          id: 'sauna', n: 'Sauna & récupération', ico: '🧖', hours: 2, energy: -18, price: 20,
          d: 'Ne muscle rien, mais récupère beaucoup. Le luxe du repos organisé.',
          run: function (G) {
            G.add('moral', 14); G.add('sante', 6);
            G.set('hygiene', 100);
            return { t: 'good', m: 'Chaleur sèche, eau froide, silence. Vous ressortez neuf.' };
          }
        }
      ]
    },

    {
      id: 'beaute', n: 'Institut de beauté', ico: '💅', when: 'day',
      d: 'Ongles, peau, coupe. Ici, on ne soigne pas le corps — on soigne l’image qu’il renvoie.',
      req: { hyg: 25 },
      sessions: [
        {
          id: 'retouche', n: 'Retouche rapide', ico: '💇', hours: 1, energy: 0, price: 20,
          d: 'Un coup de peigne, du fond de teint, cinq minutes de sourire forcé.',
          run: function (G) {
            G.flag('styled', G.day() + 5); G.add('moral', 4);
            return { t: 'good', m: 'Rien de spectaculaire, mais ça se voit. Apparence en hausse pendant cinq jours.' };
          }
        },
        {
          id: 'soin', n: 'Soin complet', ico: '🧖‍♀️', hours: 2, energy: -8, price: 55,
          d: 'Visage, mains, posture. Une heure à se laisser faire, pour une fois.',
          run: function (G) {
            G.flag('styled', G.day() + 12); G.add('moral', 10); G.add('sante', 3);
            G.set('hygiene', 100);
            return { t: 'good', m: 'On s’occupe enfin de vous. Apparence en hausse pendant douze jours.' };
          }
        },
        {
          id: 'relook', n: 'Relooking complet', ico: '✨', hours: 3, energy: -4, price: 160,
          d: 'Coupe, soins, conseil en image. Ce que voient les gens qui décident.',
          run: function (G) {
            G.flag('styled', G.day() + 21); G.add('moral', 18); G.xp('charisme', 16);
            G.set('hygiene', 100);
            return { t: 'good', m: 'Vous ressortez méconnaissable. Apparence en hausse pendant trois semaines — et ça change la façon dont on vous parle.' };
          }
        }
      ]
    },

    {
      id: 'clinique', n: 'Clinique privée', ico: '⚕️', when: 'day',
      d: 'Ce que l’argent achète que la médecine gratuite ne peut pas toujours offrir : du temps, et de la discrétion.',
      req: { money: 40 },
      sessions: [
        {
          id: 'consult', n: 'Consultation standard', ico: '🩺', hours: 1, energy: -2, price: 40,
          d: 'Un vrai médecin, un vrai diagnostic, pas de salle d’attente.',
          run: function (G) {
            G.add('sante', 30);
            return { t: 'good', m: 'Ordonnance en main, diagnostic clair. Santé +30.' };
          }
        },
        {
          id: 'urgence', n: 'Prise en charge complète', ico: '🏥', hours: 3, energy: -10, price: 180,
          d: 'Examens, soins, suivi. Pour un corps qui a vraiment besoin de souffler.',
          run: function (G) {
            G.add('sante', 55); G.add('moral', 10);
            return { t: 'good', m: 'Bilan complet, traitement immédiat. Santé +55.' };
          }
        },
        {
          id: 'psy', n: 'Suivi psychologique', ico: '🛋️', hours: 2, energy: -4, price: 90,
          d: 'Une heure à parler à quelqu’un dont c’est le métier, pas l’amitié.',
          run: function (G) {
            G.add('moral', 26); G.xp('charisme', 5);
            if (G.flags('addict') && G.chance(30)) {
              G.flag('addict', Math.max(0, G.flags('addict') - 1));
              return { t: 'good', m: 'Vous parlez de choses que vous ne dites à personne. Moral +26 — et un peu de terrain regagné sur la dépendance.' };
            }
            return { t: 'good', m: 'Vous parlez de choses que vous ne dites à personne. Moral +26.' };
          }
        },
        {
          id: 'sevrage', n: 'Cure de sevrage encadrée', ico: '💉', hours: 4, energy: -18, price: 320,
          d: 'Suivi médical, protocole complet. La méthode la plus sûre pour décrocher.',
          req: { flag: 'addict' },
          run: function (G) {
            G.flag('addict', Math.max(0, G.flags('addict') - 3));
            G.add('sante', -6); G.add('moral', -8);
            return { t: 'good', m: 'Quatre jours difficiles condensés en une prise en charge. Votre dépendance recule nettement.' };
          }
        }
      ]
    },

    {
      id: 'affaires', n: 'Centre d’affaires', ico: '🏢', when: 'day',
      d: 'Bureaux loués à l’heure, salles de réunion, et des gens qui se croisent exprès.',
      req: { app: 40 },
      sessions: [
        {
          id: 'atelier', n: 'Atelier collectif', ico: '📋', hours: 2, energy: -6, price: 30,
          d: 'Une dizaine de personnes, un animateur, des cartes de visite qui changent de main.',
          run: function (G) {
            G.xp('intelligence', 10); G.xp('charisme', 10); G.rep('legale', 3);
            return { t: 'good', m: 'Deux heures d’atelier, et un carnet d’adresses un peu plus épais.' };
          }
        },
        {
          id: 'conference', n: 'Conférence sectorielle', ico: '🎤', hours: 3, energy: -8, price: 90,
          d: 'Intervenants, cocktail, badges nominatifs. On y vient pour la salle, pas pour la scène.',
          req: { edu: 2 },
          run: function (G) {
            G.rep('legale', 8); G.flag('coached', G.day() + 6); G.xp('charisme', 12);
            return { t: 'good', m: 'Une conversation de dix minutes au buffet vaut plus que la conférence elle-même. Vos prochains entretiens seront plus faciles six jours durant.' };
          }
        },
        {
          id: 'networking', n: 'Soirée de networking privée', ico: '🥂', hours: 4, energy: -10, price: 250,
          d: 'Sur invitation. Ce qui se décide ici ne se décide nulle part ailleurs.',
          req: { repLeg: 25, app: 55 },
          run: function (G) {
            var r = G.rnd(1, 100);
            G.rep('legale', 10);
            if (r <= 30) {
              var gain = G.rnd(2000, 6000);
              G.cash(gain, 'Contact d’affaires');
              return { t: 'money', m: 'Un contact investit sur un coup de tête. ' + G.eur(gain) + ' virés le lendemain matin.' };
            }
            if (r <= 55 && G.s.biz.length) {
              G.flag('network', true);
              return { t: 'good', m: 'On vous présente à quelqu’un qui compte. Vos entreprises rapporteront davantage à partir de maintenant.' };
            }
            G.xp('charisme', 18);
            return { t: 'neutral', m: 'Beaucoup de mains serrées, aucune promesse tenue. La soirée aura au moins été utile pour votre aisance.' };
          }
        }
      ]
    },
    {
      id: 'bourse', n: 'Bourse du commerce', ico: '🏛️', when: 'day', market: true,
      d: 'Fonder une affaire, en racheter une déjà lancée, céder la vôtre. Les prix suivent le marché — ils ne le suivent jamais longtemps dans le même sens.',
      req: {},
      sessions: []
    },
    {
      id: 'souscave', n: 'La Cave', ico: '🕶️', when: 'night', underground: true,
      d: 'On y entre par une porte sans enseigne. Combats à mains nues, paris tenus à la voix, et des types qui cherchent quelqu’un pour un travail.',
      req: { repRue: 12, flag: 'knowsCave' },
      sessions: []
    }
  ];
  D.VENUE = {};
  D.VENUES.forEach(function (v) { D.VENUE[v.id] = v; });

  /* ---------------------------------------------------------
     LA CAVE — combats, paris, missions. Uniquement la nuit.
     --------------------------------------------------------- */
  D.FIGHTS = [
    { id: 'bagarreur', n: 'Bagarreur du coin', ico: '🥊', stake: 40, mult: 2.2, forceReq: 0, sentence: 4,
      d: 'Un habitué, plus lent qu’il n’en a l’air.' },
    { id: 'videur', n: 'Videur de boîte', ico: '🥋', stake: 120, mult: 2.6, forceReq: 3, sentence: 8,
      d: 'Costaud, méthodique. Il a déjà cassé des nez ici.' },
    { id: 'champion', n: 'Champion du sous-sol', ico: '🏆', stake: 400, mult: 3.2, forceReq: 6, sentence: 14,
      d: 'Invaincu depuis six mois. Le battre rapporte gros — le perdre aussi, mais dans l’autre sens.' }
  ];
  D.FIGHT = {};
  D.FIGHTS.forEach(function (f) { D.FIGHT[f.id] = f; });

  D.PARIS = [
    {
      id: 'des', n: 'Dés', ico: '🎲', min: 10, max: 2000,
      d: 'Pair ou impair sur deux dés. La maison garde un léger avantage.',
      choices: [{ id: 'pair', l: 'Pair' }, { id: 'impair', l: 'Impair' }],
      play: function (G, bet, choice) {
        var roll = G.rnd(1, 6) + G.rnd(1, 6);
        var isPair = roll % 2 === 0;
        var win = (choice === 'pair') === isPair;
        return { win: win ? Math.round(bet * 0.91) : -bet, m: 'Le total tombe sur ' + roll + '.' };
      }
    },
    {
      id: 'combat', n: 'Parier sur un combat', ico: '👊', min: 10, max: 3000,
      d: 'Vous ne montez pas sur le ring, vous misez sur celui qui y est. L’outsider paie beaucoup plus.',
      choices: [{ id: 'favori', l: 'Le favori' }, { id: 'outsider', l: 'L’outsider' }],
      play: function (G, bet, choice) {
        var favoriWins = G.chance(62);
        var win = (choice === 'favori') === favoriWins;
        var mult = choice === 'favori' ? 0.55 : 1.45;
        return {
          win: win ? Math.round(bet * mult) : -bet,
          m: favoriWins ? 'Le favori l’emporte, sans surprise.' : 'L’outsider renverse la salle.'
        };
      }
    }
  ];
  D.PARI = {};
  D.PARIS.forEach(function (p) { D.PARI[p.id] = p; });

  /* Missions : petits travaux du milieu, résolus comme un délit (crimeRoll + arrestCheck) */
  D.MISSION_POOL = [
    { id: 'guet', n: 'Faire le guet', ico: '👀', hours: 3, energy: 14, pay: [80, 150], sentence: 6, heat: 6, req: { repRue: 10 } },
    { id: 'colis', n: 'Récupérer un colis', ico: '📦', hours: 2, energy: 10, pay: [120, 220], sentence: 10, heat: 8, req: { repRue: 15 } },
    { id: 'dette', n: 'Rappeler une dette', ico: '💢', hours: 3, energy: 20, pay: [150, 280], sentence: 14, heat: 10, req: { force: 3, repPegre: 10 } },
    { id: 'transfert', n: 'Convoyer un sac fermé', ico: '🎒', hours: 4, energy: 16, pay: [200, 380], sentence: 18, heat: 12, req: { repPegre: 15 } },
    { id: 'filature', n: 'Filature discrète', ico: '🕵️', hours: 3, energy: 12, pay: [100, 190], sentence: 5, heat: 5, req: { discretion: 3 } },
    { id: 'intimidation', n: 'Faire passer un message', ico: '🗯️', hours: 2, energy: 18, pay: [110, 200], sentence: 12, heat: 9, req: { force: 2, repRue: 18 } }
  ];
  D.MISSIONI = {};
  D.MISSION_POOL.forEach(function (m) { D.MISSIONI[m.id] = m; });

  /* Conditions d'entrée du casino */
  D.CASINO_REQ = { app: 35 };

  /* Paliers de mise proposés à la table */
  D.BET_STEPS = [0.05, 0.15, 0.4, 1];

})(window.LifeRPG);
