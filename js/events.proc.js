/* =============================================================
   events.proc.js — Générateur d'événements procéduraux.

   Plutôt que d'écrire trois cents situations à la main, on écrit
   des GABARITS. Chaque gabarit connaît :
     - weight(ctx) : à quel point il est plausible ici et maintenant
                     (0 = impossible) — c'est lui qui lie l'événement
                     à la sûreté du logement, à l'heure, à la fortune…
     - build(ctx)  : compose une situation concrète en tirant des
                     acteurs, des lieux, des tournures et des enjeux
                     mis à l'échelle du personnage.

   Résultat : peu d'événements, mais presque jamais deux fois le même.
   ============================================================= */
(function (NS) {
  'use strict';

  var D = NS.D, S = NS.S;
  var P = {};

  /* =========================================================
     1. Réservoirs de vocabulaire
     ========================================================= */
  var PRENOMS = ['Sofiane', 'Malik', 'Élodie', 'Jonas', 'Rachid', 'Nina', 'Gaspard', 'Leïla',
    'Bruno', 'Maya', 'Théo', 'Farid', 'Camille', 'Ousmane', 'Iris', 'Viktor', 'Assia', 'Rémi'];

  var SILHOUETTES = [
    'un type en survêtement propre', 'une femme d’une cinquantaine d’années',
    'un gamin qui n’a pas vingt ans', 'un homme au regard fuyant',
    'une fille avec un sac de sport', 'un vieux monsieur très bien mis',
    'quelqu’un que vous avez déjà croisé sans savoir où', 'un livreur qui a fini sa tournée',
    'une femme pressée qui s’arrête net', 'un homme avec un chien tenu court'
  ];

  var LIEUX_JOUR = ['devant la boulangerie', 'à l’arrêt de bus', 'sur le parvis de la gare',
    'dans la galerie marchande', 'au feu rouge du boulevard', 'près du square',
    'à la sortie du métro', 'sur le marché', 'devant la mairie', 'au bout de votre rue'];

  var LIEUX_NUIT = ['sous le pont', 'dans le parking souterrain', 'au pied de la tour',
    'derrière la station-service', 'sur le quai désert', 'dans une rue sans lampadaire',
    'devant un rideau de fer baissé', 'près des bennes du supermarché',
    'sur le parvis vide de la gare', 'dans le couloir du parking'];

  var METEO = ['sous une pluie fine qui ne s’arrête pas', 'dans un froid qui pince',
    'par une chaleur lourde', 'dans un vent qui fait claquer les bâches',
    'sous un ciel bas et gris', 'dans une nuit étonnamment douce'];

  /* =========================================================
     2. Outils
     ========================================================= */
  function pick(G, arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /** Un même tirage ne doit pas revenir deux fois dans la même phrase */
  function pickN(G, arr, n) {
    var copy = arr.slice(), out = [];
    while (out.length < n && copy.length) out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
    return out;
  }

  /**
   * Met un montant à l'échelle du personnage : 30 € comptent au jour 3,
   * plus au jour 200. On borne pour que ça reste crédible.
   */
  function scaled(G, base, opts) {
    opts = opts || {};
    var nw = Math.max(0, S.netWorth(G.s));
    var mult = 1 + Math.pow(nw / 2500, 0.52);
    mult = Math.min(mult, opts.maxMult || 26);
    return Math.max(opts.min || 1, Math.round(base * mult * G.rndF(0.82, 1.22)));
  }

  function who(G) { return pick(G, SILHOUETTES); }

  /** Majuscule initiale : une silhouette qui ouvre une phrase doit la porter */
  function cap(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }
  function nom(G) { return pick(G, PRENOMS); }
  function ou(G, ctx) { return pick(G, ctx.night ? LIEUX_NUIT : LIEUX_JOUR); }

  /** Un PNJ déjà rencontré, si l'histoire s'y prête */
  function knownNpc(G, minAff) {
    var pool = D.NPCS.filter(function (n) {
      return !G.npcLock(n) && (G.affVal(n.id) >= (minAff === undefined ? 15 : minAff));
    });
    return pool.length ? pick(G, pool) : null;
  }

  /** Objet consommable au hasard dans le sac */
  function invItem(G, filterFn) {
    var ids = Object.keys(G.s.inv).filter(function (k) {
      if (!G.s.inv[k] || !D.ITEM[k]) return false;
      return filterFn ? filterFn(D.ITEM[k]) : true;
    });
    return ids.length ? D.ITEM[pick(G, ids)] : null;
  }

  /* =========================================================
     3. Contexte : la lecture de votre situation
     ========================================================= */
  P.context = function (G) {
    var s = G.s, h = S.home(s);
    return {
      night: G.isNight(),
      period: G.period(),
      home: h,
      homeIdx: S.homeIdx(s),
      safe: h.safe || 0,
      risk: h.risk || 0,
      outdoor: (h.safe || 0) <= 1,
      wealth: S.netWorth(s),
      cash: s.money,
      dirty: s.dirty,
      stash: s.stash || 0,
      heat: s.heat,
      rue: s.rep.rue,
      legale: s.rep.legale,
      pegre: s.rep.pegre,
      casier: s.casier,
      job: s.job ? D.JOB[s.job.id] : null,
      biz: s.biz.length,
      crimes: (s.hist && s.hist.crime) || 0,
      helped: (s.hist && s.hist.helped) || 0,
      app: G.apparence(),
      sante: s.gauges.sante,
      moral: s.gauges.moral,
      faim: s.gauges.faim,
      day: s.day
    };
  };

  /* =========================================================
     4. Gabarits
     ========================================================= */
  P.TEMPLATES = [

    /* ─────────── LOGEMENT & NUIT ─────────── */
    {
      id: 'p_theft_home', when: 'night',
      /* Directement indexé sur la sûreté du logement : dehors on se fait
         dépouiller, en penthouse personne n'entre. */
      weight: function (c) {
        if (c.safe >= 6) return 0;
        return 14 - c.safe * 2.2 + (c.outdoor ? 6 : 0);
      },
      build: function (G, c) {
        var target = invItem(G, function (it) { return !it.keep; });
        var lootCash = Math.min(c.cash, scaled(G, 25, { min: 5 }));
        var lieu = c.outdoor ? pick(G, LIEUX_NUIT) : 'dans ' + (c.home.name.toLowerCase());
        return {
          ico: '🕳️', title: 'On a fouillé vos affaires',
          text: 'Vous vous réveillez ' + lieu + ' avec la sensation que quelque chose a bougé. ' +
            pick(G, [
              'Votre sac n’est pas dans la position où vous l’avez laissé.',
              'La fermeture éclair est ouverte jusqu’au bout.',
              'Il manque un poids que vous connaissiez par cœur.',
              'Quelqu’un a retourné vos poches pendant que vous dormiez.'
            ]),
          choices: [
            {
              l: 'Faire l’inventaire', h: 'Constater les dégâts',
              run: function (G) {
                var lost = [];
                if (lootCash > 0 && G.chance(70)) { G.cash(-lootCash, 'Volé'); lost.push(G.eur(lootCash)); }
                if (target && G.chance(50)) { G.take(target.id, 1); lost.push(target.ico + ' ' + target.n); }
                G.add('moral', -8);
                if (!lost.length) return 'Rien ne manque. Soit vous n’aviez rien, soit ils ont eu pitié.';
                return 'Il manque : ' + lost.join(', ') + '. Vous ne saurez jamais qui.';
              }
            },
            {
              l: 'Chercher le voleur', h: 'Discrétion — récupérer, ou pire', risky: true,
              run: function (G) {
                G.spendTime(1);
                if (G.chance(28 + G.lvl('discretion') * 6 + c.rue * 0.25)) {
                  G.rep('rue', 4); G.xp('discretion', 10);
                  return 'Vous le retrouvez deux rues plus loin en train de trier. Il rend tout sans discuter.';
                }
                G.add('sante', -9); G.add('moral', -10);
                if (lootCash > 0) G.cash(-lootCash, 'Volé');
                return 'Vous tombez sur trois personnes au lieu d’une. Vous rentrez avec un œil fermé.';
              }
            },
            (c.safe > 0 ? {
              l: 'Renforcer la planque', h: 'Investir dans la sécurité',
              run: function (G) {
                var cost = scaled(G, 40, { min: 20 });
                if (!G.spend(cost, 'Cadenas et serrure')) return 'Vous n’avez pas de quoi payer un cadenas correct.';
                G.flag('reinforced', G.day() + 20);
                return 'Un cadenas, une barre, deux vis. ' + G.eur(cost) + ' pour vingt nuits plus tranquilles.';
              }
            } : null)
          ].filter(Boolean)
        };
      }
    },

    {
      id: 'p_intrusion', when: 'night',
      weight: function (c) { return c.safe >= 5 ? 0 : (c.outdoor ? 7 : 9 - c.safe); },
      build: function (G, c) {
        return {
          ico: '🚪', title: 'Quelqu’un essaie d’entrer',
          text: pick(G, [
            'Une poignée qu’on tourne doucement, deux fois. Puis le silence.',
            'Des pas qui s’arrêtent juste devant, et une respiration qu’on entend.',
            'Un raclement métallique contre la serrure, patient, méthodique.',
            'Une lampe de téléphone balaie l’intérieur depuis l’extérieur.'
          ]) + ' Il est ' + D.hh(G.s.hour) + '.',
          choices: [
            {
              l: 'Faire du bruit', h: 'Les faire fuir',
              run: function (G) {
                if (G.chance(62 + G.lvl('force') * 3)) { G.add('moral', -4); return 'Vous cognez contre la porte en criant. Les pas s’éloignent vite.'; }
                G.add('moral', -12); G.add('energie', -15);
                return 'Ils ne partent pas tout de suite. Vous passez le reste de la nuit assis, dos au mur.';
              }
            },
            {
              l: 'Ouvrir d’un coup', h: 'Force — confrontation', risky: true,
              run: function (G) {
                if (G.chance(35 + G.lvl('force') * 8)) {
                  G.rep('rue', 5); G.xp('force', 12);
                  return 'Vous ouvrez avant lui. Il recule si vite qu’il tombe. On ne reviendra pas ici.';
                }
                G.add('sante', -16); G.add('moral', -10);
                return 'Il n’était pas seul, et il n’avait pas les mains vides.';
              }
            },
            {
              l: 'Rester immobile', h: 'Attendre que ça passe',
              run: function (G) {
                G.add('energie', -18); G.add('moral', -6);
                if (G.chance(75)) return 'Vous ne bougez pas pendant vingt minutes. Ils finissent par renoncer.';
                var l = Math.min(G.money(), scaled(G, 30, { min: 5 }));
                if (l) G.cash(-l, 'Volé');
                return 'Ils entrent, prennent ce qui traîne, et repartent sans vous voir. ' + (l ? '−' + G.eur(l) + '.' : '');
              }
            }
          ]
        };
      }
    },

    {
      id: 'p_weather', when: 'night',
      weight: function (c) { return c.outdoor ? 12 : (c.safe < 3 ? 4 : 0); },
      build: function (G, c) {
        var m = pick(G, METEO);
        return {
          ico: '🌧️', title: 'La nuit est mauvaise',
          text: 'Vous vous installez ' + m + '. ' + pick(G, [
            'Ça ne va pas s’arranger avant l’aube.',
            'Le sol est déjà trempé sous vous.',
            'Vous sentez que vous ne dormirez pas beaucoup.',
            'Le carton commence à ramollir aux coins.'
          ]),
          choices: [
            {
              l: 'Tenir jusqu’au matin', h: 'Gratuit, coûteux autrement',
              run: function (G) {
                G.add('sante', -12); G.add('moral', -8); G.add('hygiene', -8);
                return 'Vous ne dormez pas vraiment. Vous attendez, ce qui n’est pas la même chose.';
              }
            },
            {
              l: 'Payer un abri pour la nuit', h: scaled(G, 10, { min: 5 }) + ' €',
              run: function (G) {
                var cost = scaled(G, 10, { min: 5 });
                if (!G.spend(cost, 'Abri de nuit')) return 'Vous comptez trois fois. Vous n’avez pas de quoi.';
                G.flag('shelteredNight', true);
                G.add('moral', 8); G.add('sante', 4);
                return G.eur(cost) + ' pour un lit et un radiateur. Ça n’a jamais paru aussi cher ni aussi juste.';
              }
            },
            {
              l: 'Trouver un abri de fortune', h: 'Discrétion',
              run: function (G) {
                if (G.chance(45 + G.lvl('discretion') * 6)) {
                  G.flag('shelteredNight', true); G.xp('discretion', 8);
                  return pick(G, [
                    'Un local à vélos dont la porte ne ferme plus. Sec, chaud, silencieux.',
                    'Le sas d’une banque, ouvert toute la nuit pour les distributeurs.',
                    'Une laverie automatique où personne ne vient avant sept heures.'
                  ]);
                }
                G.add('sante', -8); G.add('energie', -12);
                return 'Deux heures à essayer des portes. Toutes fermées, et le froid a gagné.';
              }
            }
          ]
        };
      }
    },

    {
      id: 'p_neighbour', when: 'any',
      weight: function (c) { return c.homeIdx >= 3 && c.homeIdx <= 10 ? 7 : 0; },
      build: function (G, c) {
        var n = nom(G);
        var friendly = G.chance(55 + c.legale * 0.2 - c.pegre * 0.2);
        if (friendly) {
          return {
            ico: '🧑‍🤝‍🧑', title: 'Un voisin frappe',
            text: n + ' habite à côté. ' + pick(G, [
              'Il a fait trop à manger et ne sait pas quoi en faire.',
              'Elle cherche quelqu’un pour l’aider à monter un meuble.',
              'Il vient se présenter, tout simplement, ce qui vous déstabilise.',
              'Elle a récupéré un colis à votre nom.'
            ]),
            choices: [
              {
                l: 'Accepter et discuter', h: 'Moral, contacts',
                run: function (G) {
                  G.spendTime(1); G.add('moral', 12); G.add('faim', 15); G.xp('charisme', 6); G.rep('legale', 2);
                  return 'Une heure autour d’une table. Vous aviez oublié à quoi ça ressemblait.';
                }
              },
              {
                l: 'Rendre service', h: '2 h · réputation',
                run: function (G) {
                  G.spendTime(2); G.spendEnergy(12); G.rep('legale', 4); G.add('moral', 8); G.xp('force', 6);
                  G.hist('helped');
                  return 'Deux heures de bricolage. ' + n + ' parlera de vous en bien dans l’immeuble.';
                }
              },
              { l: 'Décliner poliment', h: 'Rien', run: function (G) { return 'Vous refermez la porte. Le silence revient, un peu plus lourd.'; } }
            ]
          };
        }
        return {
          ico: '😠', title: 'Un voisin mécontent',
          text: n + ' tambourine à votre porte. ' + pick(G, [
            'Il se plaint du bruit — un bruit que vous n’avez pas fait.',
            'Elle vous accuse d’avoir laissé les poubelles dans le couloir.',
            'Il a vu « des allées et venues » et il veut que ça cesse.',
            'Elle parle de prévenir le propriétaire.'
          ]),
          choices: [
            {
              l: 'Calmer le jeu', h: 'Charisme',
              run: function (G) {
                if (G.chance(45 + G.lvl('charisme') * 6)) { G.xp('charisme', 10); G.rep('legale', 2); return 'Vous écoutez jusqu’au bout sans l’interrompre. Il repart presque gêné.'; }
                G.add('moral', -6); G.rep('legale', -2);
                return 'Rien de ce que vous dites ne passe. La porte claque.';
              }
            },
            {
              l: 'Répondre sèchement', h: 'Le conflit s’installe',
              run: function (G) {
                G.rep('legale', -4); G.add('moral', 4); G.heat(4);
                return 'Vous ne vous laissez pas faire. Ça se saura, et pas en votre faveur.';
              }
            },
            (c.cash > 0 ? {
              l: 'Acheter la paix', h: scaled(G, 30, { min: 15 }) + ' €',
              run: function (G) {
                var cost = scaled(G, 30, { min: 15 });
                if (!G.spend(cost, 'Paix des voisins')) return 'Vous n’avez pas de quoi acheter son silence.';
                G.rep('legale', 3);
                return 'Une bouteille et des excuses. ' + G.eur(cost) + ' pour ne plus l’entendre.';
              }
            } : null)
          ].filter(Boolean)
        };
      }
    },

    /* ─────────── RUE : TROUVAILLES & RENCONTRES ─────────── */
    {
      id: 'p_find', when: 'any',
      weight: function (c) { return 8; },
      build: function (G, c) {
        var kind = G.rnd(1, 100);
        var lieu = ou(G, c);
        if (kind <= 45) {
          var amount = scaled(G, 18, { min: 3 });
          return {
            ico: '💶', title: 'Quelque chose par terre',
            text: 'Un billet plié en quatre, ' + lieu + '. ' + pick(G, [
              'Personne autour ne semble le chercher.',
              'Il a dû tomber d’une poche il y a un moment.',
              'Le vent le pousse vers vous, ce qui ressemble à un signe.'
            ]),
            choices: [
              { l: 'Le ramasser', h: '+' + G.eur(amount), run: function (G) { G.cash(amount, 'Trouvaille'); G.add('moral', 6); return 'Vous le glissez dans votre poche sans ralentir. ' + G.eur(amount) + '.'; } },
              { l: 'Chercher le propriétaire', h: 'Honnêteté', run: function (G) {
                G.spendTime(1); G.hist('honest');
                if (G.chance(40)) { var r = Math.round(amount * 0.6); G.cash(r, 'Récompense'); G.rep('legale', 5); G.add('moral', 12); return 'Une femme revient sur ses pas, soulagée. Elle vous laisse ' + G.eur(r) + '.'; }
                G.cash(amount, 'Trouvaille'); G.rep('legale', 2); G.add('moral', 5);
                return 'Personne ne réclame. Au bout d’une heure, vous le gardez — avec la conscience tranquille.';
              } }
            ]
          };
        }
        if (kind <= 75) {
          var pool = D.ITEMS.filter(function (i) { return i.shop === 'city' && i.price <= Math.max(30, c.wealth / 40) && !(i.keep && G.has(i.id)); });
          var found = pool.length ? pick(G, pool) : D.ITEM.eau;
          return {
            ico: found.ico, title: 'Un objet abandonné',
            text: found.ico + ' ' + found.n + ', ' + lieu + '. ' + pick(G, [
              'En bon état, visiblement oublié là.',
              'Posé sur un muret, comme si on allait revenir le chercher.',
              'À moitié dans un carton, avec d’autres choses inutilisables.'
            ]),
            choices: [
              { l: 'Le prendre', h: '+ ' + found.n, run: function (G) { G.give(found.id, 1); return 'Vous l’embarquez. Ça servira.'; } },
              { l: 'Laisser', h: 'Ce n’est pas à vous', run: function (G) { G.add('moral', 2); return 'Vous continuez votre route. Quelqu’un en aura plus besoin que vous.'; } }
            ]
          };
        }
        return {
          ico: '🎫', title: 'Un papier plié',
          text: 'Un ticket, ' + lieu + '. ' + pick(G, [
            'Un bon d’achat non utilisé, encore valable trois jours.',
            'Un ticket de consigne pour un casier de gare.',
            'Un reçu avec un numéro griffonné au dos.'
          ]),
          choices: [
            { l: 'Aller voir', h: '1 h · incertain', run: function (G) {
              G.spendTime(1);
              var r = G.rnd(1, 100);
              if (r <= 35) { var m = scaled(G, 45, { min: 10 }); G.cash(m, 'Bon d’achat'); return 'Le bon vaut ' + G.eur(m) + '. Vous les prenez en liquide chez un commerçant arrangeant.'; }
              if (r <= 60) { G.give('sandwich', 2); G.give('eau', 2); return 'Le casier contenait un sac : de quoi manger deux jours.'; }
              if (r <= 75) { G.rep('rue', 4); return 'Le numéro était celui d’un contact utile. Il note le vôtre.'; }
              return 'Périmé, vide, inutile. Une heure de perdue.';
            } },
            { l: 'Jeter', h: 'Rien', run: function (G) { return 'Vous le laissez tomber. Il repart avec le vent.'; } }
          ]
        };
      }
    },

    {
      id: 'p_shady_offer', when: 'any',
      /* Plus vous êtes connu de la rue, plus on vient vous proposer des choses */
      weight: function (c) { return 5 + c.rue * 0.12 + c.pegre * 0.10 + (c.night ? 4 : 0); },
      build: function (G, c) {
        var s = who(G), lieu = ou(G, c);
        var variant = G.rnd(1, 100);

        if (variant <= 30) {
          /* on vous vend quelque chose de douteux */
          var pool = D.ITEMS.filter(function (i) { return !(i.keep && G.has(i.id)) && i.price >= 30; });
          var goods = pool.length ? pick(G, pool) : D.ITEM.smartphone;
          var price = Math.max(10, Math.round(goods.price * G.rndF(0.2, 0.4)));
          return {
            ico: '📦', title: 'Une affaire trop belle',
            text: cap(s) + ' vous aborde ' + lieu + ' et sort ' + goods.ico + ' <b>' + goods.n + '</b> de son sac. ' +
              '« ' + pick(G, ['Neuf. Jamais servi.', 'Cadeau, je m’en débarrasse.', 'Je le brade, j’ai besoin de liquide.', 'Pose pas de question, prends-le.']) + ' » ' +
              G.eur(price) + ', tout de suite.',
            choices: [
              {
                l: 'Acheter ' + G.eur(price), h: 'Bonne affaire — ou pas', risky: true,
                run: function (G) {
                  if (!G.spend(price, 'Achat au noir')) return 'Vous n’avez pas la somme sur vous.';
                  var r = G.rnd(1, 100);
                  if (r <= 62) { G.give(goods.id, 1); G.rep('rue', 2); return 'La marchandise est bonne. ' + goods.n + ' pour ' + G.eur(price) + ', c’est du vol — dans le bon sens.'; }
                  if (r <= 85) { G.give(goods.id, 1); G.heat(10); return 'Vous repartez avec. Elle est aussi fichée volée, et ça peut vous revenir dessus.'; }
                  G.add('moral', -8);
                  return 'Le sac contenait une brique enveloppée dans un chiffon. Il est déjà loin.';
                }
              },
              { l: 'Négocier le prix', h: 'Charisme', run: function (G) {
                if (G.chance(35 + G.lvl('charisme') * 6)) {
                  var p2 = Math.round(price * 0.6);
                  if (!G.spend(p2, 'Achat au noir')) return 'Vous obtenez ' + G.eur(p2) + '… que vous n’avez pas.';
                  G.give(goods.id, 1); G.xp('charisme', 8);
                  return 'Vous le faites descendre à ' + G.eur(p2) + '. Il grogne mais il accepte.';
                }
                return 'Il remballe sans discuter. « Tant pis pour toi. »';
              } },
              { l: 'Refuser', h: 'Prudent', run: function (G) { return 'Vous secouez la tête. Il cherche déjà quelqu’un d’autre du regard.'; } }
            ]
          };
        }

        if (variant <= 60) {
          /* on vous propose un « service » */
          var pay = scaled(G, 90, { min: 30 });
          var heat = 12 + Math.round(c.pegre * 0.1);
          return {
            ico: '🤫', title: 'Un service à rendre',
            text: cap(s) + ' vous prend à part ' + lieu + '. « J’ai besoin de quelqu’un de discret pour ' +
              pick(G, ['porter un sac d’un point à un autre', 'attendre dans une voiture vingt minutes',
                'récupérer une enveloppe chez quelqu’un', 'faire le guet une demi-heure',
                'signer un papier à la place d’un autre']) + '. ' + G.eur(pay) + ', cash. »',
            choices: [
              {
                l: 'Accepter', h: '+' + G.eur(pay) + ' sale · pression +' + heat, risky: true,
                run: function (G) {
                  G.spendTime(2);
                  if (G.chance(76)) {
                    G.dirtyCash(pay, 'Service rendu'); G.heat(heat); G.rep('rue', 3); G.rep('pegre', 2); G.hist('crime');
                    return 'Deux heures, aucune question posée. ' + G.eur(pay) + ' d’argent sale.';
                  }
                  G.heat(heat * 2); G.rep('legale', -4);
                  G.arrestCheck('complicité', 15);
                  return 'Il y avait une raison pour qu’il cherche quelqu’un d’autre que lui.';
                }
              },
              { l: 'Demander ce qu’il y a dedans', h: 'Savoir avant de dire oui', run: function (G) {
                if (G.chance(40 + G.lvl('charisme') * 4)) {
                  G.dirtyCash(Math.round(pay * 0.7), 'Service rendu'); G.heat(Math.round(heat * 0.6)); G.hist('crime');
                  return 'Il vous explique. Ce n’est pas si grave, et vous acceptez en connaissance de cause.';
                }
                G.rep('rue', -2);
                return '« Si tu poses la question, t’es pas la bonne personne. » Il s’en va.';
              } },
              { l: 'Refuser net', h: 'Rien à perdre', run: function (G) { G.rep('rue', -1); return 'Vous déclinez. Il hausse les épaules — il trouvera.'; } }
            ]
          };
        }

        if (variant <= 80) {
          /* on veut vous racheter quelque chose */
          var mine = invItem(G, function (it) { return it.price >= 20; });
          if (!mine) return null;
          var offer = Math.round(mine.price * G.rndF(0.55, 0.95));
          return {
            ico: '💰', title: 'On veut vous racheter ça',
            text: cap(s) + ' a repéré votre ' + mine.ico + ' <b>' + mine.n + '</b>. ' +
              '« Je te le prends ' + G.eur(offer) + ', tout de suite, en liquide. »',
            choices: [
              { l: 'Vendre ' + G.eur(offer), h: 'Mieux que la revente normale', run: function (G) {
                if (!G.has(mine.id)) return 'Vous ne l’avez plus.';
                G.take(mine.id, 1); G.cash(offer, 'Vente de gré à gré');
                return 'L’affaire se fait en trente secondes. ' + G.eur(offer) + '.';
              } },
              { l: 'Faire monter', h: 'Charisme', run: function (G) {
                if (!G.has(mine.id)) return 'Vous ne l’avez plus.';
                if (G.chance(35 + G.lvl('charisme') * 6)) {
                  var up = Math.round(offer * 1.5);
                  G.take(mine.id, 1); G.cash(up, 'Vente négociée'); G.xp('charisme', 8);
                  return 'Vous tenez bon. Il monte à ' + G.eur(up) + ' en soupirant.';
                }
                return 'Il retire son offre et s’en va. Vous avez été trop gourmand.';
              } },
              { l: 'Garder', h: 'Vous en aurez besoin', run: function (G) { return 'Vous refusez. Certaines choses ne se vendent pas au premier venu.'; } }
            ]
          };
        }

        /* arnaque pure, calibrée sur votre fortune */
        var ask = scaled(G, 120, { min: 40 });
        return {
          ico: '🎭', title: 'Une histoire compliquée',
          text: cap(s) + ' vous raconte, ' + lieu + ', ' + pick(G, [
            'qu’il s’est fait voler son portefeuille et qu’il doit rentrer ce soir',
            'qu’une caution le sépare d’un travail déjà signé',
            'qu’un virement arrive demain mais que la pharmacie n’attendra pas',
            'qu’il connaît un placement qui double en une semaine'
          ]) + '. Il lui manque ' + G.eur(ask) + '.',
          choices: [
            {
              l: 'Donner ' + G.eur(ask), h: 'Générosité — ou naïveté', risky: true,
              run: function (G) {
                if (!G.spend(ask, 'Coup de main')) return 'Vous n’avez pas cette somme.';
                if (G.chance(30 + G.lvl('intelligence') * 2)) {
                  G.cash(Math.round(ask * 1.8), 'Remboursé'); G.rep('legale', 4); G.add('moral', 14); G.hist('helped');
                  return 'Trois jours plus tard, il revient avec ' + G.eur(Math.round(ask * 1.8)) + ' et une poignée de main.';
                }
                G.add('moral', -10);
                return 'Vous ne le reverrez jamais. ' + G.eur(ask) + ' de leçon.';
              }
            },
            { l: 'Poser trois questions', h: 'Intelligence — démonter l’histoire', run: function (G) {
              if (G.chance(45 + G.lvl('intelligence') * 6)) { G.xp('intelligence', 12); return 'À la deuxième question, l’histoire ne tient plus. Il part sans insister.'; }
              G.add('moral', -3);
              return 'Il répond à tout, trop bien. Vous ne savez toujours pas.';
            } },
            { l: 'S’éloigner', h: 'Rien', run: function (G) { return 'Vous continuez sans vous retourner.'; } }
          ]
        };
      }
    },

    {
      id: 'p_kindness', when: 'day',
      weight: function (c) { return 6 + c.helped * 0.6; },
      build: function (G, c) {
        var s = who(G), lieu = ou(G, c);
        var need = G.rnd(1, 3);
        return {
          ico: '🤲', title: 'Quelqu’un a besoin d’un coup de main',
          text: cap(s) + ', ' + lieu + '. ' + [
            'Un sac s’est déchiré et tout est par terre.',
            'Elle cherche une adresse depuis vingt minutes et n’ose plus demander.',
            'Il n’arrive pas à monter sa valise dans l’escalier.'
          ][need - 1],
          choices: [
            {
              l: 'Aider', h: 'Moral, réputation',
              run: function (G) {
                G.spendTime(1); G.add('moral', 10); G.rep('legale', 3); G.hist('helped');
                if (G.chance(30)) { var tip = scaled(G, 15, { min: 5 }); G.cash(tip, 'Merci'); return 'Cinq minutes de votre temps. On vous glisse ' + G.eur(tip) + ' que vous n’aviez pas demandé.'; }
                if (G.chance(20)) { G.rep('rue', 3); return 'Vous aidez sans rien attendre. Quelqu’un a vu, et s’en souviendra.'; }
                return 'Un merci sincère. Ça ne se mange pas, et pourtant ça tient au corps.';
              }
            },
            { l: 'Passer', h: 'Vous avez vos problèmes', run: function (G) { G.add('moral', -3); return 'Vous détournez le regard. C’était peut-être rien, ou peut-être pas.'; } }
          ]
        };
      }
    },

    {
      id: 'p_conflict', when: 'any',
      weight: function (c) { return 4 + (c.night ? 4 : 0) + c.rue * 0.06 + (c.app < 35 ? 3 : 0); },
      build: function (G, c) {
        var s = who(G), lieu = ou(G, c);
        return {
          ico: '😤', title: 'Ça monte vite',
          text: cap(s) + ' vous cherche ' + lieu + '. ' + pick(G, [
            'Une histoire de place, de regard, de rien.',
            'Il vous accuse d’avoir pris quelque chose qui ne lui appartenait pas non plus.',
            'Elle hurle avant même que vous ayez ouvert la bouche.',
            'Deux mots de trop, et le ton a changé.'
          ]),
          choices: [
            {
              l: 'Désamorcer', h: 'Charisme',
              run: function (G) {
                if (G.chance(40 + G.lvl('charisme') * 6)) { G.xp('charisme', 10); G.add('moral', 4); return 'Vous parlez calmement, sans reculer. La tension retombe d’un coup.'; }
                G.add('moral', -8); G.add('sante', -5);
                return 'Rien ne passe. Vous prenez un coup d’épaule en partant.';
              }
            },
            {
              l: 'Répondre', h: 'Force — réputation de rue', risky: true,
              run: function (G) {
                if (G.chance(35 + G.lvl('force') * 8 + (G.flags('boxer') || 0) * 4)) {
                  G.rep('rue', 6); G.xp('force', 12); G.add('sante', -6); G.add('moral', 6);
                  return 'Court et net. On vous regarde différemment dans le quartier.';
                }
                G.add('sante', -22); G.add('moral', -12);
                if (G.gauge('sante') < 20 && G.chance(45)) { G.hospitalize(1, 'rixe sur la voie publique'); return 'Vous vous réveillez aux urgences.'; }
                return 'Vous perdez. Franchement, et devant témoins.';
              }
            },
            { l: 'Partir', h: 'Sans gloire, sans dégât', run: function (G) { G.add('moral', -5); G.rep('rue', -1); return 'Vous tournez les talons. C’est la bonne décision, et elle a un goût amer.'; } }
          ]
        };
      }
    },

    /* ─────────── ARGENT & PATRIMOINE ─────────── */
    {
      id: 'p_windfall', when: 'day',
      weight: function (c) { return c.legale > 20 ? 5 : 2; },
      build: function (G, c) {
        var amount = scaled(G, 60, { min: 20 });
        return {
          ico: '📬', title: 'Un courrier inattendu',
          text: pick(G, [
            'Un trop-perçu vous est remboursé, avec dix-huit mois de retard.',
            'Une caution que vous aviez oubliée vous revient.',
            'Une aide à laquelle vous aviez droit sans le savoir vient d’être débloquée.',
            'Un ancien employeur régularise un solde de tout compte.'
          ]) + ' ' + G.eur(amount) + '.',
          choices: [
            { l: 'Encaisser', h: '+' + G.eur(amount), run: function (G) {
              if (G.s.bank.open) { G.bankIn(amount, 'Régularisation'); return G.eur(amount) + ' virés sur votre compte.'; }
              G.cash(amount, 'Régularisation'); G.add('moral', 8);
              return G.eur(amount) + ' en liquide au guichet. Une bonne journée.';
            } }
          ]
        };
      }
    },

    {
      id: 'p_scam_target', when: 'day',
      /* Plus vous êtes riche, plus on vient vous chercher */
      weight: function (c) { return c.wealth > 4000 ? 4 + Math.min(6, c.wealth / 20000) : 0; },
      build: function (G, c) {
        var amount = scaled(G, 400, { min: 200 });
        return {
          ico: '📞', title: 'Un appel très professionnel',
          text: pick(G, [
            'Votre « conseiller sécurité bancaire » vous demande de confirmer un virement suspect.',
            'Un service des impôts vous annonce un redressement à régler immédiatement.',
            'Un opérateur vous propose de bloquer une fraude en cours, contre une avance.',
            'Un notaire vous informe d’un héritage, moyennant des frais de dossier.'
          ]) + ' Il faut ' + G.eur(amount) + ', tout de suite.',
          choices: [
            {
              l: 'Payer pour régler ça', h: 'Rapide — et probablement une arnaque', risky: true,
              run: function (G) {
                if (!G.spend(amount, 'Virement urgent')) return 'Le virement est refusé faute de provision. Vous l’avez échappé belle.';
                if (G.chance(12)) { G.rep('legale', 2); return 'C’était authentique. Le dossier est régularisé.'; }
                G.add('moral', -12); G.bankScore(-4);
                return 'Le numéro n’existe plus. ' + G.eur(amount) + ' partis vers un compte fermé dans l’heure.';
              }
            },
            {
              l: 'Vérifier par vous-même', h: 'Intelligence',
              run: function (G) {
                G.spendTime(1);
                if (G.chance(55 + G.lvl('intelligence') * 5)) { G.xp('intelligence', 14); return 'Un appel à votre vraie banque suffit. C’était une arnaque, bien montée.'; }
                return 'Vous n’arrivez pas à démêler. Dans le doute, vous ne payez rien — ce qui est déjà ça.';
              }
            },
            { l: 'Raccrocher', h: 'Rien', run: function (G) { return 'Vous raccrochez au milieu d’une phrase. Ils rappelleront quelqu’un d’autre.'; } }
          ]
        };
      }
    },

    /* ─────────── TRAVAIL ─────────── */
    {
      id: 'p_work', when: 'day',
      weight: function (c) { return c.job ? 7 : 0; },
      build: function (G, c) {
        var j = c.job;
        var variant = G.rnd(1, 100);
        if (variant <= 35) {
          var extra = Math.round(j.pay * G.rndF(0.5, 1.1));
          return {
            ico: j.ico, title: 'Un remplacement au pied levé',
            text: 'Un collègue se décommande. On vous demande de rester ' + pick(G, ['deux heures de plus', 'faire la fermeture', 'venir plus tôt demain', 'couvrir son poste']) +
              '. Payé ' + G.eur(extra) + ' en plus.',
            choices: [
              { l: 'Accepter', h: '2 h · +' + G.eur(extra), run: function (G) {
                G.spendTime(2); G.spendEnergy(18);
                if (G.s.job) G.s.job.pending = Math.round((G.s.job.pending || 0) + extra);
                G.rep('legale', 2); G.add('moral', -4);
                return 'Deux heures de plus, ajoutées à votre paie. On note que vous dites oui.';
              } },
              { l: 'Refuser', h: 'Votre temps vous appartient', run: function (G) { G.rep('legale', -1); return 'Vous déclinez. Le responsable ne dit rien, et retient.'; } }
            ]
          };
        }
        if (variant <= 65) {
          return {
            ico: '🧾', title: 'Une erreur sur la fiche de paie',
            text: 'En vérifiant, vous trouvez ' + pick(G, ['des heures non comptées', 'une prime oubliée', 'une retenue injustifiée', 'un taux mal appliqué']) + '.',
            choices: [
              { l: 'Réclamer', h: 'Charisme — récupérer votre dû', run: function (G) {
                if (G.chance(45 + G.lvl('charisme') * 5)) {
                  var due = Math.round(j.pay * G.rndF(0.8, 2));
                  if (G.s.job) G.s.job.pending = Math.round((G.s.job.pending || 0) + due);
                  G.xp('charisme', 8);
                  return 'Vous avez raison et vous le prouvez. ' + G.eur(due) + ' ajoutés à votre prochaine paie.';
                }
                G.add('moral', -6);
                return '« C’est le logiciel. » Le dossier se perd entre deux services.';
              } },
              { l: 'Laisser courir', h: 'Ne pas faire de vagues', run: function (G) { G.add('moral', -4); return 'Vous ne dites rien. Ce n’était pas énorme, et vous tenez à ce poste.'; } }
            ]
          };
        }
        return {
          ico: '☕', title: 'Une proposition entre collègues',
          text: pick(G, [
            'On vous invite à un pot après le service.',
            'Un collègue vous propose de covoiturer tous les matins.',
            'L’équipe organise quelque chose et pense à vous.'
          ]),
          choices: [
            { l: 'Y aller', h: '2 h · moral, réseau', run: function (G) {
              G.spendTime(2); G.add('moral', 14); G.xp('charisme', 8); G.rep('legale', 3);
              if (G.chance(25)) { G.flag('coached', G.day() + 6); return 'Bonne soirée, et quelqu’un vous glisse comment obtenir mieux ailleurs.'; }
              return 'Deux heures où vous êtes juste un collègue parmi d’autres. C’est reposant.';
            } },
            { l: 'Décliner', h: 'Rien', run: function (G) { G.add('moral', -2); return 'Vous rentrez. Ils y sont allés sans vous.'; } }
          ]
        };
      }
    },

    /* ─────────── POLICE & MILIEU ─────────── */
    {
      id: 'p_patrol', when: 'any',
      weight: function (c) { return c.heat * 0.16 + (c.night ? 3 : 1) + (c.casier ? 2 : 0); },
      build: function (G, c) {
        var carrying = c.dirty > 0 || G.has('arme') || G.has('came') || G.has('crochets');
        return {
          ico: '🚓', title: 'Une patrouille ralentit',
          text: pick(G, [
            'La voiture roule au pas à votre hauteur pendant cinquante mètres.',
            'Deux agents descendent et se répartissent le trottoir.',
            'Un gyrophare sans sirène, et un projecteur qui vous cherche.',
            'On vous fait signe de vous arrêter, sans se presser.'
          ]) + (carrying ? ' Vous avez sur vous ce qu’il ne faut pas avoir.' : ''),
          choices: [
            {
              l: 'Rester naturel', h: 'Le plus souvent, ça passe',
              run: function (G) {
                if (G.chance(60 + G.lvl('discretion') * 3 - c.heat * 0.4)) { G.heat(-4); return 'Ils passent leur chemin. Vous n’aviez pas la tête de celui qu’ils cherchaient.'; }
                return G.policeStop ? G.policeStop('contrôle de routine') : 'Contrôle. Papiers, palpation, questions.';
              }
            },
            {
              l: 'Changer de trottoir', h: 'Discrétion', risky: true,
              run: function (G) {
                if (G.chance(45 + G.lvl('discretion') * 6 - c.heat * 0.3)) { G.xp('discretion', 8); return 'Vous tournez avant qu’ils n’aient décidé. Personne ne vous suit.'; }
                G.heat(8);
                return G.policeStop ? G.policeStop('comportement suspect') : 'Mauvaise idée : ils accélèrent et vous rattrapent.';
              }
            },
            (carrying ? {
              l: 'Se débarrasser de tout', h: 'Perdre pour ne pas être pris',
              run: function (G) {
                var d = G.dirtyVal();
                if (d) G.dirtyCash(-Math.round(d * 0.6), 'Jeté');
                ['came', 'crochets'].forEach(function (i) { if (G.has(i)) G.take(i, 1); });
                G.heat(-10);
                return 'Une grille d’égout, trois secondes. Vous perdez de quoi vivre un moment, mais vous restez libre.';
              }
            } : null)
          ].filter(Boolean)
        };
      }
    },

    {
      id: 'p_underworld', when: 'night',
      weight: function (c) { return c.pegre > 12 ? 4 + c.pegre * 0.10 : 0; },
      build: function (G, c) {
        var n = knownNpc(G, -100);
        var speaker = n && n.faction === 'pegre' ? n.ico + ' ' + n.n : who(G);
        var pay = scaled(G, 300, { min: 120 });
        return {
          ico: '🕶️', title: 'On vous fait une proposition',
          text: cap(speaker) + ' vous attend là où vous passez toujours. ' +
            '« ' + pick(G, [
              'Il y a un truc à faire cette semaine. On pense à toi.',
              'On monte une équipe. Trois personnes, pas plus.',
              'J’ai besoin d’un nom sûr pour une nuit.',
              'Y a de la place si tu veux monter d’un cran.'
            ]) + ' »',
          choices: [
            {
              l: 'Écouter jusqu’au bout', h: 'S’engager · +' + G.eur(pay) + ' sale', risky: true,
              run: function (G) {
                G.spendTime(2);
                var p = 58 + G.lvl('discretion') * 3 + c.pegre * 0.2 - c.heat * 0.3;
                if (G.chance(p)) {
                  G.dirtyCash(pay, 'Coup monté'); G.rep('pegre', 6); G.heat(16); G.hist('crime');
                  if (n) G.aff(n.id, 6);
                  return 'Une nuit, un rôle précis, aucune improvisation. ' + G.eur(pay) + ' au petit matin.';
                }
                G.heat(30); G.add('sante', -12);
                G.arrestCheck('association de malfaiteurs', 25);
                return 'Le plan était mauvais dès le départ. Vous le comprenez trop tard.';
              }
            },
            { l: 'Décliner poliment', h: 'Réputation pègre en baisse', run: function (G) {
              G.rep('pegre', -3); if (n) G.aff(n.id, -4);
              return 'Vous refusez sans vous justifier. C’est la meilleure façon de refuser.';
            } },
            (c.legale > 30 ? {
              l: 'Prévenir la police', h: 'Rompre définitivement', risky: true,
              run: function (G) {
                G.rep('legale', 8); G.rep('pegre', -18); G.affFaction('pegre', -14); G.aff('duval', 8);
                G.heat(-12);
                if (G.chance(40)) G.sched('snitch_found', G.rnd(5, 14));
                return 'Un appel anonyme, une cabine, trois phrases. Vous venez de choisir un camp.';
              }
            } : null)
          ].filter(Boolean)
        };
      }
    },

    {
      id: 'p_witness', when: 'any',
      weight: function (c) { return 5 + (c.night ? 3 : 0); },
      build: function (G, c) {
        var lieu = ou(G, c);
        var what = pick(G, [
          'deux hommes forcer une portière',
          'quelqu’un arracher un sac et partir en courant',
          'une vitrine céder sous un coup de barre',
          'un règlement de comptes qui tourne mal',
          'un livreur se faire dépouiller de son scooter'
        ]);
        return {
          ico: '👁️', title: 'Vous êtes au mauvais endroit',
          text: 'Vous voyez ' + what + ', ' + lieu + '. ' +
            'Personne d’autre ne regarde. Eux, si — ils vous ont vu.',
          choices: [
            {
              l: 'Ne rien voir', h: 'La règle de la rue',
              run: function (G) { G.rep('rue', 2); G.add('moral', -5); return 'Vous continuez sans changer de rythme. C’est ce qui se fait ici.'; }
            },
            {
              l: 'Prévenir la police', h: 'Réputation légale — et rancune', risky: true,
              run: function (G) {
                G.rep('legale', 6); G.aff('duval', 6); G.add('moral', 6); G.hist('helped');
                if (G.chance(35)) { G.rep('pegre', -8); G.sched('racket_revenge', G.rnd(4, 12)); return 'Vous témoignez. Ils sauront d’où c’est venu.'; }
                return 'Vous appelez d’une cabine, sans donner votre nom. Personne ne remontera jusqu’à vous.';
              }
            },
            {
              l: 'Intervenir', h: 'Force — dangereux', risky: true,
              run: function (G) {
                if (G.chance(28 + G.lvl('force') * 8)) {
                  G.rep('rue', 8); G.rep('legale', 5); G.add('moral', 16); G.add('sante', -10); G.hist('helped');
                  return 'Vous criez et vous avancez. Ils partent. La victime tremble et vous serre le bras.';
                }
                G.add('sante', -26); G.add('moral', -8);
                if (G.gauge('sante') < 18 && G.chance(50)) { G.hospitalize(2, 'agression'); return 'Vous vous réveillez sous perfusion.'; }
                return 'Ils étaient trois. Vous encaissez à la place de quelqu’un d’autre.';
              }
            },
            (c.pegre > 20 ? {
              l: 'Demander votre part', h: 'Réputation pègre', risky: true,
              run: function (G) {
                if (G.chance(40 + c.pegre * 0.4)) {
                  var cut = scaled(G, 120, { min: 40 });
                  G.dirtyCash(cut, 'Part du silence'); G.rep('pegre', 5); G.hist('crime');
                  return 'Vous vous approchez et vous tendez la main. Ils rient, puis ils paient : ' + G.eur(cut) + '.';
                }
                G.add('sante', -14); G.rep('pegre', -4);
                return 'Mauvais calcul. Ils n’aiment pas qu’on leur parle sur ce ton.';
              }
            } : null)
          ].filter(Boolean)
        };
      }
    },

    /* ─────────── CORPS ─────────── */
    {
      id: 'p_health', when: 'any',
      weight: function (c) { return c.sante < 60 ? (60 - c.sante) * 0.22 : 1; },
      build: function (G, c) {
        var bad = c.sante < 45;
        return {
          ico: '🤒', title: bad ? 'Le corps lâche' : 'Un coup de moins bien',
          text: pick(G, [
            'La fièvre monte d’un coup, sans prévenir.',
            'Une douleur au côté que vous ignoriez depuis trois jours se réveille.',
            'Vous toussez depuis ce matin, et ça ne ressemble pas à un rhume.',
            'Vous vous levez trop vite et le trottoir bascule.'
          ]),
          choices: [
            {
              l: 'Consulter', h: '3 h · vrais soins',
              run: function (G) {
                G.spendTime(3); G.add('sante', G.rnd(20, 34));
                var cost = scaled(G, 25, { min: 0 });
                if (G.s.bank.open || G.money() > cost) G.spend(cost, 'Consultation');
                return 'Trois heures d’attente, un diagnostic, une ordonnance. Vous ressortez debout.';
              }
            },
            (G.has('medoc') ? {
              l: 'Prendre des médicaments', h: 'Immédiat',
              run: function (G) { G.take('medoc', 1); G.add('sante', 30); return 'Vous avalez les comprimés à sec. Deux heures plus tard, ça reflue.'; }
            } : null),
            {
              l: 'Serrer les dents', h: 'Ça peut mal finir', risky: true,
              run: function (G) {
                G.add('sante', bad ? -16 : -8); G.add('moral', -6);
                if (G.gauge('sante') < 12 && G.chance(55)) { G.hospitalize(2, 'infection non soignée'); return 'Vous vous effondrez deux jours plus tard.'; }
                return 'Vous continuez comme si de rien n’était. Le corps note tout.';
              }
            }
          ].filter(Boolean)
        };
      }
    },

    /* ─────────── SOCIAL ─────────── */
    {
      id: 'p_npc_meet', when: 'any',
      weight: function (c) { return 6; },
      build: function (G, c) {
        var n = knownNpc(G, -100);
        if (!n) return null;
        var aff = G.affVal(n.id);
        if (aff < -20) {
          return {
            ico: n.ico, title: n.n + ' vous attend',
            text: n.n + ' vous barre le passage. Ce n’est pas une visite de courtoisie.',
            choices: [
              { l: 'Tenter d’arranger les choses', h: 'Charisme', run: function (G) {
                G.spendTime(1);
                if (G.chance(30 + G.lvl('charisme') * 6)) { G.aff(n.id, 18); G.xp('charisme', 10); return 'Vous parlez longtemps. Ce n’est pas réglé, mais ce n’est plus la guerre.'; }
                G.aff(n.id, -6); G.add('moral', -8);
                return 'Rien ne passe. Vous aggravez même les choses.';
              } },
              { l: 'Payer pour solder', h: scaled(G, 200, { min: 80 }) + ' €', run: function (G) {
                var cost = scaled(G, 200, { min: 80 });
                if (!G.spend(cost, 'Réparation')) return 'Vous n’avez pas de quoi.';
                G.aff(n.id, 30);
                return G.eur(cost) + ' et des excuses. L’ardoise est effacée, la mémoire non.';
              } },
              { l: 'Assumer', h: 'Rien ne change', run: function (G) { G.aff(n.id, -4); return 'Vous soutenez le regard sans un mot. Chacun repart de son côté.'; } }
            ]
          };
        }
        return {
          ico: n.ico, title: 'Une rencontre',
          text: 'Vous tombez sur ' + n.n + ', ' + ou(G, c) + '. ' +
            (n.topics ? pick(G, n.topics) : 'On échange quelques mots.'),
          choices: [
            { l: 'Prendre le temps', h: '1 h · affinité', run: function (G) {
              G.spendTime(1); G.aff(n.id, G.rnd(5, 11)); G.add('moral', 8); G.xp('charisme', 5);
              G.s.npcMet[n.id] = G.day();
              return 'Une heure qui ne rapporte rien et qui change la journée.';
            } },
            { l: 'Demander un service', h: 'Affinité en jeu', run: function (G) {
              if (aff >= 30 && G.chance(50 + aff * 0.4)) {
                var help = scaled(G, 70, { min: 20 });
                G.cash(help, 'Coup de main de ' + n.n); G.aff(n.id, -6);
                return n.n + ' vous dépanne de ' + G.eur(help) + ', sans commentaire.';
              }
              G.aff(n.id, -8);
              return 'Vous demandez trop tôt. Le refus est poli, et il coûte.';
            } },
            { l: 'Saluer et continuer', h: 'Rien', run: function (G) { G.aff(n.id, 2); return 'Un signe de tête, et chacun sa route.'; } }
          ]
        };
      }
    },

    /* ─────────── ENTREPRISE ─────────── */
    {
      id: 'p_biz', when: 'day',
      weight: function (c) { return c.biz ? 6 : 0; },
      build: function (G, c) {
        var b = G.pick(G.s.biz);
        var d = D.BIZI[b.id];
        if (!d) return null;
        var name = G.bizName(b);
        var variant = G.rnd(1, 100);
        if (variant <= 40) {
          var loss = scaled(G, 150, { min: 60 });
          return {
            ico: d.ico, title: 'Un incident chez ' + name,
            text: pick(G, [
              'Une panne immobilise l’activité une demi-journée.',
              'Un dégât des eaux a touché le stock.',
              'Un salarié se blesse et il faut le remplacer dans l’heure.',
              'Un contrôle sanitaire arrive sans prévenir.'
            ]),
            choices: [
              { l: 'Régler tout de suite', h: '−' + G.eur(loss), run: function (G) {
                if (!G.spend(loss, 'Réparation ' + name)) { b.health = Math.max(0, b.health - 25); return 'Vous ne pouvez pas payer. La santé de l’activité en pâtit.'; }
                return 'Réglé dans la journée. ' + G.eur(loss) + ', et personne n’a rien remarqué.';
              } },
              { l: 'Laisser traîner', h: 'Risque pour l’activité', risky: true, run: function (G) {
                if (G.chance(45)) { return 'Ça se tasse tout seul. Vous avez eu de la chance.'; }
                b.health = Math.max(0, b.health - 20);
                G.rep('legale', -3);
                return 'Le problème s’aggrave. ' + name + ' en ressort affaiblie.';
              } }
            ]
          };
        }
        if (variant <= 70) {
          var gain = scaled(G, 300, { min: 100 });
          return {
            ico: d.ico, title: 'Une opportunité pour ' + name,
            text: pick(G, [
              'Un client important veut un contrat cadre.',
              'Un concurrent ferme et vous propose sa clientèle.',
              'Une commande exceptionnelle tombe, mais il faut livrer vite.',
              'Un fournisseur vous propose l’exclusivité.'
            ]),
            choices: [
              { l: 'Saisir', h: '3 h · +' + G.eur(gain), run: function (G) {
                G.spendTime(3); G.spendEnergy(14);
                if (G.chance(55 + G.lvl('intelligence') * 4 + G.lvl('charisme') * 3)) {
                  G.cash(gain, 'Contrat'); G.rep('legale', 4); G.xp('intelligence', 12);
                  return 'Vous tenez le délai. ' + G.eur(gain) + ' et un client qui reviendra.';
                }
                G.add('moral', -6);
                return 'Vous n’arrivez pas à suivre. Le client va voir ailleurs.';
              } },
              { l: 'Passer', h: 'Trop gros pour vous', run: function (G) { return 'Vous refusez. On ne grandit pas en se cassant.'; } }
            ]
          };
        }
        return {
          ico: '🧾', title: 'Un contrôle chez ' + name,
          text: 'Un inspecteur passe les comptes en revue' + (G.dirtyVal() > 500 ? ', et vos comptes ont des zones d’ombre.' : '.'),
          choices: [
            { l: 'Coopérer', h: 'Propre mais coûteux', run: function (G) {
              var f = scaled(G, 120, { min: 40 });
              G.spend(f, 'Régularisation'); G.rep('legale', 4);
              return G.eur(f) + ' de régularisation, et un dossier au clair.';
            } },
            { l: 'Arranger les écritures', h: 'Intelligence', risky: true, run: function (G) {
              if (G.chance(50 + G.lvl('intelligence') * 5)) { G.xp('intelligence', 14); return 'Tout est en ordre, du moins sur le papier qu’il a regardé.'; }
              G.heat(14); G.rep('legale', -8);
              var f2 = scaled(G, 300, { min: 100 });
              G.spend(f2, 'Redressement');
              return 'Il trouve. Redressement de ' + G.eur(f2) + ', et votre nom dans un fichier.';
            } }
          ]
        };
      }
    },

    /* ─────────── NUITS DE LA VIE INSTALLÉE ─────────── */
    {
      id: 'p_night_home', when: 'night',
      weight: function (c) { return c.safe >= 2 ? 6 + c.safe * 0.5 : 0; },
      build: function (G, c) {
        var v = G.rnd(1, 100);
        if (v <= 35) {
          return {
            ico: '🌙', title: 'Une nuit sans sommeil',
            text: pick(G, [
              'Vous vous réveillez à trois heures sans savoir pourquoi, et vous ne vous rendormez pas.',
              'La journée repasse en boucle, dans le désordre, avec tout ce que vous auriez dû dire.',
              'Le plafond est parfaitement immobile et vous le regardez depuis deux heures.',
              'Un bruit de tuyauterie, et ensuite plus moyen de fermer l’œil.'
            ]),
            choices: [
              { l: 'Se lever et travailler', h: 'Transformer l’insomnie', run: function (G) {
                G.spendTime(2); G.xp('intelligence', 16); G.add('moral', -4);
                return 'Deux heures de lucidité étrange. Vous avancez sur des choses en retard.';
              } },
              { l: 'Rester couché', h: 'Attendre', run: function (G) {
                G.add('moral', -6); G.add('energie', -10);
                return 'Vous ne dormez pas et vous ne faites rien. Le pire des deux mondes.';
              } },
              (G.has('alcool') ? { l: 'Boire pour dormir', h: 'Efficace, et pas anodin', risky: true, run: function (G) {
                G.take('alcool', 1); G.add('moral', 8); G.add('sante', -6);
                if (G.chance(18)) G.flag('addict', (G.flags('addict') || 0) + 1);
                return 'Ça marche. C’est bien le problème.';
              } } : null)
            ].filter(Boolean)
          };
        }
        if (v <= 60) {
          return {
            ico: '🔔', title: 'On sonne, tard',
            text: pick(G, [
              'Un livreur s’est trompé d’étage et insiste.',
              'Un voisin a claqué sa porte et n’a personne d’autre à qui demander.',
              'Quelqu’un cherche l’ancien locataire, avec un dossier sous le bras.',
              'Une voix demande si « c’est bien ici », sans préciser quoi.'
            ]),
            choices: [
              { l: 'Ouvrir', h: 'Curiosité', run: function (G) {
                var r = G.rnd(1, 100);
                if (r <= 45) { G.rep('legale', 2); G.add('moral', 5); return 'Un quiproquo, réglé en deux minutes, et un voisin qui vous doit un service.'; }
                if (r <= 70) { var it = D.ITEMS.filter(function (x) { return x.cat === 'food'; }); G.give(pick(G, it).id, 2); return 'Le colis n’était pas pour vous, mais personne ne le réclamera.'; }
                if (r <= 88) { G.add('moral', -4); return 'Quelqu’un qui parle longtemps sans rien vouloir de précis. Vous perdez vingt minutes.'; }
                G.heat(6); return 'Deux hommes cherchaient l’ancien locataire. Ils repartent en notant votre visage.';
              } },
              { l: 'Ne pas ouvrir', h: 'Prudent', run: function (G) { return 'Vous retenez votre souffle. Au bout d’un moment, l’escalier redevient silencieux.'; } }
            ]
          };
        }
        return {
          ico: '🪟', title: 'La ville depuis chez vous',
          text: pick(G, [
            'Vous regardez la rue par la fenêtre. Quelqu’un dort en bas, sur un carton.',
            'De la lumière dans tous les immeubles d’en face, et personne à qui parler.',
            'Le silence de votre logement vous frappe d’un coup.',
            'Vous entendez une dispute deux étages plus bas, puis plus rien.'
          ]),
          choices: [
            { l: 'Descendre voir', h: 'Un geste', run: function (G) {
              G.spendTime(1); G.add('moral', 12); G.rep('rue', 3); G.hist('helped');
              if (G.canPay(20)) { G.spend(20, 'Un repas offert'); return 'Vous descendez avec de quoi manger. Vous ne dites pas que vous avez dormi là.'; }
              return 'Vous descendez juste pour parler. Ça suffit, ce soir-là.';
            } },
            { l: 'Fermer le rideau', h: 'Rien', run: function (G) { G.add('moral', -5); return 'Vous tirez le rideau. Ça ne l’empêche pas d’être là.'; } }
          ]
        };
      }
    },

    /* ─────────── PLANQUE ─────────── */
    {
      id: 'p_stash', when: 'any',
      weight: function (c) { return c.stash > 500 ? 4 + c.heat * 0.08 : 0; },
      build: function (G, c) {
        return {
          ico: '📦', title: 'Votre planque n’est plus sûre',
          text: pick(G, [
            'Quelqu’un a parlé de vous là où il ne fallait pas.',
            'Vous croisez deux fois la même voiture devant chez vous.',
            'Un voisin vous demande, l’air de rien, si vous gardez « des choses ».',
            'La serrure porte des marques qui n’y étaient pas hier.'
          ]),
          choices: [
            {
              l: 'Déplacer le magot', h: '2 h · mise à l’abri',
              run: function (G) {
                G.spendTime(2);
                if (G.chance(72 + G.lvl('discretion') * 4)) { G.heat(-6); return 'Vous répartissez en trois endroits différents. Plus personne ne trouvera tout.'; }
                var l = Math.round((G.s.stash || 0) * 0.25);
                G.s.stash = Math.max(0, (G.s.stash || 0) - l);
                return 'Un des points de chute était mauvais. ' + G.eur(l) + ' perdus dans l’opération.';
              }
            },
            {
              l: 'Ne rien changer', h: 'Parier sur la paranoïa', risky: true,
              run: function (G) {
                if (G.chance(60)) return 'Rien ne se passe. Vous vous êtes fait des idées.';
                var l = Math.round((G.s.stash || 0) * G.rndF(0.4, 0.9));
                G.s.stash = Math.max(0, (G.s.stash || 0) - l);
                G.add('moral', -14);
                return 'On est entré pendant votre absence. ' + G.eur(l) + ' envolés.';
              }
            },
            (G.s.bank && G.s.bank.open ? {
              l: 'Tout blanchir en urgence', h: 'Frais élevés, mais sûr',
              run: function (G) {
                var amt = G.s.stash || 0;
                if (amt < 50) return 'Il n’y a presque rien à sauver.';
                G.s.stash = 0; G.s.dirty += amt;
                var net = G.launderRaw(amt, 0.4);
                return 'Vous bradez tout dans l’urgence : ' + G.eur(net) + ' récupérés sur ' + G.eur(amt) + '.';
              }
            } : null)
          ].filter(Boolean)
        };
      }
    }
  ];

  P.BY_ID = {};
  P.TEMPLATES.forEach(function (t) { P.BY_ID[t.id] = t; });

  /* =========================================================
     5. Sélection
     ========================================================= */
  /** Un gabarit ne doit pas revenir tout de suite : mémoire courte */
  function tooRecent(G, id) {
    var last = (G.s.procSeen || {})[id];
    if (last === undefined) return false;
    var gap = G.s.day - last;
    return gap >= 0 && gap < 4;
  }

  /**
   * Compose un événement adapté au moment.
   * @returns objet événement prêt pour UI.event, ou null
   */
  P.generate = function (G, when) {
    var ctx = P.context(G);
    var pool = [];
    P.TEMPLATES.forEach(function (t) {
      var w = (t.when || 'any');
      if (w !== 'any' && w !== when) return;
      if (tooRecent(G, t.id)) return;
      var weight = 0;
      try { weight = t.weight(ctx) || 0; } catch (e) { weight = 0; }
      if (weight <= 0) return;
      for (var i = 0; i < Math.round(weight); i++) pool.push(t);
    });
    if (!pool.length) return null;

    /* on tente quelques gabarits : certains renoncent (build renvoie null) */
    for (var tries = 0; tries < 5; tries++) {
      var t = pool[Math.floor(Math.random() * pool.length)];
      var ev = null;
      try { ev = t.build(G, ctx); } catch (e) { ev = null; }
      if (ev && ev.choices && ev.choices.length) {
        if (!G.s.procSeen) G.s.procSeen = {};
        G.s.procSeen[t.id] = G.s.day;
        ev.id = t.id;
        ev.proc = true;
        return ev;
      }
    }
    return null;
  };

  NS.PROC = P;
})(window.LifeRPG);
