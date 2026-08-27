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

  /* Conditions d'entrée du casino */
  D.CASINO_REQ = { app: 35 };

  /* Paliers de mise proposés à la table */
  D.BET_STEPS = [0.05, 0.15, 0.4, 1];

})(window.LifeRPG);
