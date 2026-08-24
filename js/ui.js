/* =============================================================
   ui.js — Rendu de l'interface, onglets, modales, toasts.
   ============================================================= */
(function (NS) {
  'use strict';

  var D = NS.D, S = NS.S;
  var UI = {};
  var G;                       // renseigné dans UI.init
  var tab = 'survie';
  var sub = { travail: 'gigs', sac: 'shop', profil: 'stats' };
  var modalQueue = [];
  var modalOpen = false;

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); };

  /* =========================================================
     Estimation de gains (remplace le hasard par sa moyenne)
     ========================================================= */
  function estimate(fn) {
    var stub = Object.create(G);
    stub.rnd = function (a, b) { return Math.round((a + b) / 2); };
    stub.rndF = function (a, b) { return (a + b) / 2; };
    stub.chance = function () { return false; };
    try { return Math.round(fn(stub)); } catch (e) { return 0; }
  }

  /* =========================================================
     Fragments réutilisables
     ========================================================= */
  function costs(list) {
    return '<div class="card__costs">' + list.filter(Boolean).join('') + '</div>';
  }
  function cost(txt, cls) { return '<span class="cost ' + (cls || '') + '">' + txt + '</span>'; }

  /**
   * Carte d'action générique.
   * o = { ico, title, desc, costs[], lock, accent, act, badge, go }
   */
  function card(o) {
    var locked = !!o.lock;
    return '' +
      '<button class="card' + (locked ? ' is-locked' : '') + '" data-act="' + o.act + '"' +
      (o.arg !== undefined ? ' data-arg="' + esc(o.arg) + '"' : '') +
      (o.lock ? ' data-lock="' + esc(o.lock) + '"' : '') +
      ' style="--accent:' + (o.accent || 'transparent') + '">' +
      '<span class="card__ico">' + o.ico + '</span>' +
      '<span class="card__main">' +
      '<span class="card__title">' + o.title + (o.badge || '') + '</span>' +
      (o.desc ? '<span class="card__desc">' + o.desc + '</span>' : '') +
      (o.costs && o.costs.length ? costs(o.costs) : '') +
      (locked ? '<span class="card__lock">🔒 ' + esc(o.lock) + '</span>' : '') +
      '</span>' +
      (o.go === false ? '' : '<span class="card__go">›</span>') +
      '</button>';
  }

  function sectionTitle(t) { return '<h2 class="secTitle">' + t + '</h2>'; }
  function hint(t) { return '<p class="hint">' + t + '</p>'; }
  function empty(ico, t) { return '<div class="empty"><span>' + ico + '</span>' + t + '</div>'; }

  function subtabs(group, items) {
    return '<div class="subtabs">' + items.map(function (i) {
      return '<button class="subtab' + (sub[group] === i.id ? ' is-active' : '') +
        '" data-act="sub" data-arg="' + group + ':' + i.id + '">' + i.l + '</button>';
    }).join('') + '</div>';
  }

  /* =========================================================
     En-tête
     ========================================================= */
  function renderTop() {
    var s = G.s;
    var t = S.tier(s);
    var per = S.period(s);

    document.documentElement.style.setProperty('--tier', t.c);
    $('avatar').textContent = t.av;
    $('playerName').textContent = s.name;
    $('playerTier').textContent = t.n;
    $('wallet').textContent = G.eur(s.money);
    $('clock').textContent = 'Jour ' + s.day + ' · ' + per.ico + ' ' + per.label + ' · ' +
      String(Math.min(s.hour, D.DAY_END)).padStart(2, '0') + 'h · ' + S.hoursLeft(s) + 'h restantes';

    $('gauges').innerHTML = D.GAUGES.map(function (g) {
      var v = Math.round(s.gauges[g.id]);
      var low = v <= 20;
      return '<div class="gauge' + (low ? ' is-low' : '') + '">' +
        '<div class="gauge__top"><span class="gauge__ico">' + g.ico + '</span>' + v + '</div>' +
        '<div class="gauge__bar"><div class="gauge__fill" style="width:' + v + '%;background:' + g.color + '"></div></div>' +
        '</div>';
    }).join('');

    var h = S.home(s);
    $('chipRep').textContent = '🏙️ Rue ' + Math.round(s.rep.rue) + ' · ⚖️ Légal ' + Math.round(s.rep.legale);
    $('chipHeat').textContent = '🚨 Pression ' + Math.round(s.heat) + '%';
    $('chipHeat').className = 'chip chip--heat' + (s.heat >= 45 ? ' hot' : '');
    $('chipHome').textContent = h.ico + ' ' + h.name;

    var fab = $('sleepFab');
    var urgent = S.hoursLeft(s) <= 2 || s.gauges.energie < 15;
    fab.className = 'sleepfab' + (urgent ? ' urgent' : '');
    fab.querySelector('.sleepfab__lbl').textContent = S.hoursLeft(s) <= 0 ? 'Nuit' : 'Dormir';
  }

  /* =========================================================
     Onglet SURVIE
     ========================================================= */
  function renderSurvie() {
    var s = G.s;
    var h = [];
    h.push(sectionTitle('Survivre aujourd’hui'));
    h.push(hint('Chaque action coûte du <b>temps</b> et de l’<b>énergie</b>. Il vous reste <b>' + S.hoursLeft(s) + ' heures</b> avant la nuit.'));

    var legit = [], risky = [];
    D.ACTIONS.forEach(function (a) {
      var lock = G.canDo(a);
      var c = [
        cost('⏱ ' + a.hours + 'h', 'cost--time'),
        a.energy > 0 ? cost('⚡ −' + a.energy, 'cost--nrj') : (a.energy < 0 ? cost('⚡ +' + (-a.energy), 'cost--pay') : null),
        a.risky ? cost('⚠ Illégal', 'cost--risk') : null
      ];
      var o = { ico: a.ico, title: a.n, desc: a.d, costs: c, lock: lock, accent: a.accent, act: 'action', arg: a.id };
      (a.risky ? risky : legit).push(card(o));
    });

    h.push('<div class="cards">' + legit.join('') + '</div>');
    h.push(sectionTitle('⚠ Solutions rapides'));
    h.push(hint('Rapporte davantage, immédiatement. Augmente la <b>pression policière</b> (' + Math.round(s.heat) + '%). À 100%, l’arrestation est quasi certaine.'));
    h.push('<div class="cards">' + risky.join('') + '</div>');
    return h.join('');
  }

  /* =========================================================
     Onglet TRAVAIL
     ========================================================= */
  function renderTravail() {
    var s = G.s, h = [];
    h.push(subtabs('travail', [
      { id: 'gigs', l: 'Boulots' }, { id: 'job', l: 'Emploi' },
      { id: 'edu', l: 'Études' }, { id: 'biz', l: 'Business' }
    ]));

    if (sub.travail === 'gigs') {
      h.push(sectionTitle('Petits boulots'));
      h.push(hint('Payés en liquide, sans contrat. Accessibles vite, mais votre revenu reste plafonné par vos heures.'));
      h.push('<div class="cards">' + D.GIGS.map(function (g) {
        var hours = G.gigHours(g);
        var lock = G.canDo({ req: g.req, hours: hours, energy: g.energy });
        return card({
          ico: g.ico, title: g.n, desc: g.d, accent: 'var(--good)',
          costs: [
            cost('⏱ ' + hours + 'h', 'cost--time'),
            cost('⚡ −' + g.energy, 'cost--nrj'),
            cost('≈ ' + G.eur(estimate(g.pay)), 'cost--pay')
          ],
          lock: lock, act: 'gig', arg: g.id
        });
      }).join('') + '</div>');
    }

    if (sub.travail === 'job') {
      if (s.job) {
        var j = D.JOB[s.job.id];
        var hours = G.gigHours(j);
        var sen = 1 + Math.floor(s.job.shifts / 10) * 0.08;
        h.push(sectionTitle('Votre poste'));
        h.push('<div class="panel"><div class="panel__hd"><div class="panel__t">' + j.ico + ' ' + j.n + '</div>' +
          '<span class="tag">' + s.job.shifts + ' quarts</span></div>' +
          '<div class="kv"><span>Salaire par quart</span><b>' + G.eur(j.pay * sen) + '</b></div>' +
          '<div class="kv"><span>Ancienneté</span><b>+' + Math.round((sen - 1) * 100) + '%</b></div>' +
          '<div class="kv"><span>Prochaine augmentation</span><b>dans ' + (10 - (s.job.shifts % 10)) + ' quarts</b></div>' +
          '</div>');
        h.push('<div class="cards mt">' + card({
          ico: '▶️', title: 'Prendre son service', desc: 'Effectuer un quart de travail complet.',
          accent: 'var(--good)',
          costs: [cost('⏱ ' + hours + 'h', 'cost--time'), cost('⚡ −' + j.energy, 'cost--nrj'),
          cost('+ ' + G.eur(j.pay * sen + (j.bonus ? estimate(j.bonus) : 0)), 'cost--pay')],
          lock: G.canDo({ hours: hours, energy: j.energy }), act: 'shift'
        }) + '</div>');
        h.push('<div class="btnRow"><button class="btn btn--ghost" data-act="quit">Démissionner</button></div>');
        h.push(sectionTitle('Évoluer'));
      } else {
        h.push(sectionTitle('Trouver un emploi'));
        h.push(hint('Un emploi déclaré exige une <b>adresse</b>, une <b>apparence correcte</b> et parfois un <b>diplôme</b>. En échange : un revenu stable et de la réputation légale.'));
      }

      h.push('<div class="cards">' + D.JOBS.map(function (jb) {
        if (s.job && s.job.id === jb.id) return '';
        var lock = G.checkReq(jb.req);
        return card({
          ico: jb.ico, title: jb.n, desc: jb.d, accent: 'var(--info)',
          costs: [cost('⏱ ' + jb.hours + 'h/quart', 'cost--time'), cost(G.eur(jb.pay) + ' / quart', 'cost--pay'),
          jb.req.edu ? cost('🎓 ' + D.EDU[jb.req.edu].short) : null],
          lock: lock, act: 'apply', arg: jb.id,
          badge: lock ? '' : '<span class="badge badge--new">Éligible</span>'
        });
      }).join('') + '</div>');
      h.push(hint('Postuler coûte 2 heures. Le succès dépend de votre apparence, votre charisme, votre réputation légale et vos diplômes.'));
    }

    if (sub.travail === 'edu') {
      h.push(sectionTitle('Formation'));
      var cur = D.EDU[s.edu];
      h.push('<div class="panel"><div class="panel__t">🎓 Niveau actuel : ' + cur.n + '</div></div>');

      if (s.edu + 1 < D.EDU.length) {
        var nx = D.EDU[s.edu + 1];
        var pct = Math.round(s.eduProg / nx.sessions * 100);
        h.push('<div class="panel mt">' +
          '<div class="panel__hd"><div class="panel__t">' + nx.ico + ' ' + nx.n + '</div><span class="tag">' + s.eduProg + '/' + nx.sessions + '</span></div>' +
          '<div class="stat__bar"><div class="stat__fill" style="width:' + pct + '%"></div></div>' +
          '<p class="hint mt">' + nx.d + '</p>' +
          '</div>');
        var lockE = G.checkReq(nx.req) || (s.money < nx.cost ? 'Il faut ' + G.eur(nx.cost) + ' par session' : null) ||
          (nx.hours > S.hoursLeft(s) ? 'Pas assez de temps aujourd’hui' : null);
        h.push('<div class="cards mt">' + card({
          ico: '📖', title: 'Suivre une session', desc: 'Une séance de plus vers le diplôme.',
          accent: 'var(--info)',
          costs: [cost('⏱ ' + nx.hours + 'h', 'cost--time'), cost('⚡ −' + nx.energy, 'cost--nrj'),
          nx.cost ? cost(G.eur(nx.cost), 'cost--price') : cost('Gratuit', 'cost--pay')],
          lock: lockE, act: 'study'
        }) + '</div>');
      } else {
        h.push(empty('🏅', 'Vous avez atteint le plus haut niveau de formation.'));
      }

      h.push(sectionTitle('Parcours'));
      h.push('<div class="panel">' + D.EDU.map(function (e, i) {
        if (!i) return '';
        return '<div class="kv"><span>' + e.ico + ' ' + e.n + '</span><b class="' + (s.edu >= i ? 'v-good' : '') + '">' +
          (s.edu >= i ? 'Obtenu' : e.sessions + ' séances') + '</b></div>';
      }).join('') + '</div>');
    }

    if (sub.travail === 'biz') {
      h.push(sectionTitle('Vos entreprises'));
      if (!s.biz.length) {
        h.push(empty('📉', 'Vous ne possédez aucune entreprise.<br>Tant que vous vendez vos heures, votre revenu a un plafond.'));
      } else {
        h.push('<div class="panel"><div class="kv"><span>Revenu quotidien total</span><b class="v-good">' + G.eur(S.bizIncome(s)) + '</b></div>' +
          (s.flags.network ? '<div class="kv"><span>Réseau d’Alex Vidal</span><b class="v-good">+30%</b></div>' : '') + '</div>');
        h.push('<div class="cards mt">' + s.biz.map(function (b) {
          var d = D.BIZI[b.id];
          var up = G.bizUpCost(b);
          var maxed = b.lvl >= d.maxLvl;
          return card({
            ico: d.ico, title: d.n + ' <span class="tag">Niv. ' + b.lvl + '</span>',
            desc: 'Rapporte ' + G.eur(d.rev * b.lvl * (1 + s.stats.intelligence.lvl * 0.055 + s.stats.charisme.lvl * 0.035 + s.rep.legale * 0.0035) * (s.flags.network ? 1.3 : 1)) + ' par jour.',
            accent: 'var(--purple)',
            costs: maxed ? [cost('Niveau maximum', 'cost--pay')] :
              [cost('⏱ 2h', 'cost--time'), cost('Développer : ' + G.eur(up), 'cost--price')],
            lock: maxed ? 'Niveau maximum atteint' : (s.money < up ? 'Il faut ' + G.eur(up) : null),
            act: 'bizup', arg: b.id
          });
        }).join('') + '</div>');
      }

      h.push(sectionTitle('Créer une entreprise'));
      h.push(hint('C’est le seul moteur capable de vous mener au million : vos entreprises produisent <b>chaque nuit</b>, même quand vous dormez.'));
      h.push('<div class="cards">' + D.BIZ.map(function (d) {
        if (G.ownBiz(d.id)) return '';
        var lock = G.checkReq(d.req) || (s.money < d.cost ? 'Capital de ' + G.eur(d.cost) + ' requis' : null);
        return card({
          ico: d.ico, title: d.n, desc: d.d, accent: 'var(--gold)',
          costs: [cost('⏱ 3h', 'cost--time'), cost(G.eur(d.cost), 'cost--price'),
          cost('≈ ' + G.eur(d.rev) + '/jour', 'cost--pay')],
          lock: lock, act: 'bizbuy', arg: d.id
        });
      }).join('') + '</div>');
    }

    return h.join('');
  }

  /* =========================================================
     Onglet SOCIAL
     ========================================================= */
  function renderSocial() {
    var s = G.s, h = [];
    h.push(sectionTitle('Relations'));
    h.push(hint('Les gens que vous croisez valent plus que l’argent : ils ouvrent des portes qu’aucune somme ne débloque.'));

    h.push('<div class="cards">' + D.NPCS.map(function (n) {
      if (n.lock && G.checkReq(n.lock)) {
        return '<div class="npc" style="opacity:.4"><span class="npc__av">❔</span><span class="npc__b">' +
          '<span class="npc__n">Inconnu</span><span class="npc__r">' + G.checkReq(n.lock) + '</span></span></div>';
      }
      var a = Math.round(s.npc[n.id] || 0);
      return '<button class="npc" data-act="npc" data-arg="' + n.id + '">' +
        '<span class="npc__av">' + n.ico + '</span>' +
        '<span class="npc__b">' +
        '<span class="npc__n">' + n.n + ' <span class="tag">' + a + '</span></span>' +
        '<span class="npc__r">' + n.role + '</span>' +
        '<span class="npc__aff"><span class="npc__affF" style="width:' + a + '%"></span></span>' +
        '</span><span class="card__go">›</span></button>';
    }).join('') + '</div>');
    return h.join('');
  }

  /** Fiche PNJ (modale) */
  function npcSheet(id) {
    var n = D.NPC[id], s = G.s;
    var aff = Math.round(s.npc[id] || 0);
    var body = '<p>' + n.d + '</p><p><em>Affinité : ' + aff + ' / 100</em></p>';

    var acts = [
      { l: '💬 Discuter', h: '1h · affinité +' + Math.round(3 + G.lvl('charisme') * 1.2), fn: function () { G.talk(id); } },
      { l: '🎁 Offrir 20 €', h: 'Affinité +' + Math.round(6 + Math.sqrt(20) * 1.9 + G.lvl('charisme')), locked: s.money < 20 ? 'Argent insuffisant' : null, fn: function () { G.gift(id, 20); } },
      { l: '🎁 Offrir 100 €', h: 'Affinité +' + Math.round(6 + Math.sqrt(100) * 1.9 + G.lvl('charisme')), locked: s.money < 100 ? 'Argent insuffisant' : null, fn: function () { G.gift(id, 100); } },
      { l: '🤝 Rendre service', h: '3h · affinité +' + (12 + G.lvl('charisme')), locked: S.hoursLeft(s) < 3 ? 'Pas assez de temps' : null, fn: function () { G.helpNpc(id); } }
    ];

    n.favors.forEach(function (f) {
      var done = s.flags['fav_' + id + '_' + f.id];
      acts.push({
        l: (f.risky ? '⚠ ' : '⭐ ') + f.n,
        h: done ? 'Déjà obtenu' : f.d + ' · affinité ' + f.aff + ' requise',
        locked: done ? 'Déjà obtenu' : (aff < f.aff ? 'Affinité ' + f.aff + ' requise' : null),
        fn: function () { G.favor(id, f.id); }
      });
    });

    acts.push({ l: 'Fermer', h: '', cls: 'ghost', fn: null });
    UI.modal({ ico: n.ico, title: n.n, body: body, actions: acts });
  }

  /* =========================================================
     Onglet SAC
     ========================================================= */
  var CATS = [
    { id: 'food', l: '🍽️ Nourriture' }, { id: 'care', l: '💊 Soins & hygiène' },
    { id: 'tool', l: '🧰 Équipement de rue' }, { id: 'tenue', l: '👔 Tenues' },
    { id: 'transport', l: '🚲 Transport' }, { id: 'tech', l: '📱 Technologie' },
    { id: 'luxe', l: '💎 Patrimoine' }
  ];

  function renderSac() {
    var s = G.s, h = [];
    h.push(subtabs('sac', [{ id: 'shop', l: 'Boutique' }, { id: 'inv', l: 'Inventaire' }, { id: 'home', l: 'Logement' }]));

    if (sub.sac === 'shop') {
      h.push(hint('Votre <b>apparence</b> (' + S.apparence(s) + '%) combine hygiène et qualité de la tenue. C’est elle qui ouvre les emplois déclarés.'));
      CATS.forEach(function (c) {
        var items = D.ITEMS.filter(function (i) { return i.cat === c.id; });
        if (!items.length) return;
        h.push(sectionTitle(c.l));
        h.push('<div class="cards">' + items.map(function (it) {
          var own = (s.inv[it.id] || 0);
          var lock = G.checkReq(it.req) || (it.keep && own ? 'Déjà possédé' : null) ||
            (s.money < it.price ? 'Il faut ' + G.eur(it.price) : null);
          return card({
            ico: it.ico, title: it.n, desc: it.d, accent: 'var(--gold)',
            costs: [cost(G.eur(it.price), 'cost--price'), it.style ? cost('👔 Style ' + it.style) : null],
            badge: own ? '<span class="badge badge--own">×' + own + '</span>' : '',
            lock: lock, act: 'buy', arg: it.id
          });
        }).join('') + '</div>');
      });
    }

    if (sub.sac === 'inv') {
      var tenue = S.bestOf(s, 'tenue', 'style'), tr = S.bestOf(s, 'transport', 'speed'), te = S.bestOf(s, 'tech', 'tech');
      h.push(sectionTitle('Équipement porté'));
      h.push('<div class="panel">' +
        '<div class="kv"><span>👔 Tenue</span><b>' + (tenue ? tenue.ico + ' ' + tenue.n : '— guenilles') + '</b></div>' +
        '<div class="kv"><span>🚲 Transport</span><b>' + (tr ? tr.ico + ' ' + tr.n : '— à pied') + '</b></div>' +
        '<div class="kv"><span>📱 Technologie</span><b>' + (te ? te.ico + ' ' + te.n : '— aucune') + '</b></div>' +
        '<div class="kv"><span>✨ Apparence</span><b>' + S.apparence(s) + ' / 100</b></div>' +
        '</div>');
      h.push(hint('Le meilleur objet de chaque catégorie est utilisé automatiquement.'));

      h.push(sectionTitle('Sac'));
      var ids = Object.keys(s.inv).filter(function (k) { return s.inv[k] > 0; });
      if (!ids.length) h.push(empty('🎒', 'Votre sac est vide.'));
      else h.push('<div class="cards">' + ids.map(function (id) {
        var it = D.ITEM[id];
        return card({
          ico: it.ico, title: it.n + ' <span class="tag">×' + s.inv[id] + '</span>',
          desc: it.use ? 'Utiliser : ' + Object.keys(it.use).map(function (k) {
            return k === 'xp' ? '+' + it.use.xp[1] + ' XP ' + it.use.xp[0] : (it.use[k] > 0 ? '+' : '') + it.use[k] + ' ' + k;
          }).join(', ') : it.d,
          accent: it.use ? 'var(--good)' : 'var(--line)',
          costs: [cost(it.use ? 'Appuyer pour utiliser' : 'Objet durable'),
          cost('Revendre : ' + G.eur(it.price * (it.cat === 'luxe' ? 0.9 : 0.5)), 'cost--price')],
          act: it.use ? 'use' : 'sell', arg: id
        });
      }).join('') + '</div>');
      if (ids.length) h.push(hint('Appui long impossible sur mobile : pour revendre un objet <b>utilisable</b>, passez par le bouton ci-dessous.'));
      if (ids.length) h.push('<div class="btnRow"><button class="btn btn--ghost" data-act="sellmode">💱 Mode revente</button></div>');
    }

    if (sub.sac === 'home') {
      h.push(sectionTitle('Logement'));
      var cur = S.home(s);
      h.push('<div class="panel"><div class="panel__hd"><div class="panel__t">' + cur.ico + ' ' + cur.name + '</div>' +
        '<span class="tag">' + (cur.rent ? G.eur(cur.rent) + '/nuit' : 'Gratuit') + '</span></div>' +
        '<div class="kv"><span>Qualité du sommeil</span><b>+' + cur.sleep + ' énergie</b></div>' +
        '<div class="kv"><span>Douche</span><b class="' + (cur.shower ? 'v-good' : 'v-bad') + '">' + (cur.shower ? 'Oui' : 'Non') + '</b></div>' +
        '<div class="kv"><span>Adresse administrative</span><b class="' + (cur.addr ? 'v-good' : 'v-bad') + '">' + (cur.addr ? 'Oui' : 'Non') + '</b></div>' +
        '<div class="kv"><span>Risque nocturne</span><b>' + Math.round(cur.risk * 100) + '%</b></div>' +
        '</div>');
      h.push(hint('Sans <b>adresse administrative</b>, aucun employeur ne vous déclarera. Le foyer d’accueil est la première marche.'));

      h.push(sectionTitle('Déménager'));
      h.push('<div class="cards">' + D.HOMES.map(function (hm) {
        if (hm.id === s.home) return '';
        var req = (hm.id === 'squat' && s.flags.squatOk) ? {} : hm.req;
        var lock = G.checkReq(req) || (s.money < hm.deposit ? 'Caution de ' + G.eur(hm.deposit) : null);
        return card({
          ico: hm.ico, title: hm.name, desc: hm.desc, accent: 'var(--info)',
          costs: [cost(hm.rent ? G.eur(hm.rent) + '/nuit' : 'Sans loyer', 'cost--price'),
          hm.deposit ? cost('Caution ' + G.eur(hm.deposit), 'cost--price') : null,
          cost('😴 +' + hm.sleep), hm.addr ? cost('📮 Adresse', 'cost--pay') : null],
          lock: lock, act: 'move', arg: hm.id
        });
      }).join('') + '</div>');
    }
    return h.join('');
  }

  /* =========================================================
     Onglet PROFIL
     ========================================================= */
  function renderProfil() {
    var s = G.s, h = [];
    h.push(subtabs('profil', [{ id: 'stats', l: 'Profil' }, { id: 'log', l: 'Journal' }]));

    if (sub.profil === 'stats') {
      var t = S.tier(s);
      var next = null;
      for (var i = 0; i < D.TIERS.length; i++) if (D.TIERS[i].min > S.netWorth(s)) { next = D.TIERS[i]; break; }

      h.push(sectionTitle('Statut'));
      h.push('<div class="panel">' +
        '<div class="kv"><span>Palier social</span><b style="color:' + t.c + '">' + t.av + ' ' + t.n + '</b></div>' +
        '<div class="kv"><span>Patrimoine net</span><b>' + G.eur(S.netWorth(s)) + '</b></div>' +
        (next ? '<div class="kv"><span>Palier suivant : ' + next.n + '</span><b>' + G.eur(next.min) + '</b></div>' : '') +
        '<div class="kv"><span>Objectif final</span><b>' + G.eur(D.WIN_NET) + '</b></div>' +
        '</div>');
      var pctWin = Math.min(100, S.netWorth(s) / D.WIN_NET * 100);
      h.push('<div class="panel"><div class="stat__hd"><span>Route vers le sommet</span><span class="stat__lvl">' + pctWin.toFixed(1) + '%</span></div>' +
        '<div class="stat__bar"><div class="stat__fill" style="width:' + Math.max(0.5, pctWin) + '%"></div></div></div>');

      h.push(sectionTitle('Statistiques'));
      h.push('<div class="panel">' + D.STATS.map(function (st) {
        var v = s.stats[st.id];
        var need = D.xpNeeded(v.lvl);
        var pct = v.lvl >= D.MAX_LVL ? 100 : Math.round(v.xp / need * 100);
        return '<div class="stat">' +
          '<div class="stat__hd"><span>' + st.ico + ' ' + st.label + '</span><span class="stat__lvl">NIV ' + v.lvl + '</span></div>' +
          '<div class="stat__bar"><div class="stat__fill" style="width:' + pct + '%"></div></div>' +
          '<div class="stat__xp">' + (v.lvl >= D.MAX_LVL ? 'Maîtrise complète' : v.xp + ' / ' + need + ' XP') + '</div>' +
          '</div>';
      }).join('') + '</div>');

      h.push(sectionTitle('Réputation'));
      h.push('<div class="panel">' +
        '<div class="kv"><span>🏙️ Rue</span><b>' + Math.round(s.rep.rue) + ' / 100</b></div>' +
        '<div class="kv"><span>⚖️ Légale</span><b>' + Math.round(s.rep.legale) + ' / 100</b></div>' +
        '<div class="kv"><span>🚨 Pression policière</span><b class="' + (s.heat > 45 ? 'v-bad' : '') + '">' + Math.round(s.heat) + ' / 100</b></div>' +
        '<div class="kv"><span>✨ Apparence</span><b>' + S.apparence(s) + ' / 100</b></div>' +
        '<div class="kv"><span>🎓 Formation</span><b>' + D.EDU[s.edu].n + '</b></div>' +
        (s.flags.debt ? '<div class="kv"><span>💀 Dette envers Karim</span><b class="v-bad">' + G.eur(s.flags.debt) + '</b></div>' : '') +
        (s.flags.dog ? '<div class="kv"><span>🐕 Compagnon</span><b>Oui</b></div>' : '') +
        '</div>');

      h.push(sectionTitle('Parcours'));
      h.push('<div class="panel">' +
        '<div class="kv"><span>Jours vécus</span><b>' + s.day + '</b></div>' +
        '<div class="kv"><span>Nuits passées</span><b>' + s.totals.nights + '</b></div>' +
        '<div class="kv"><span>Actions menées</span><b>' + s.totals.actions + '</b></div>' +
        '<div class="kv"><span>Total gagné</span><b class="v-good">' + G.eur(s.totals.earned) + '</b></div>' +
        '<div class="kv"><span>Total dépensé</span><b>' + G.eur(s.totals.spent) + '</b></div>' +
        '<div class="kv"><span>Arrestations</span><b class="' + (s.totals.arrests ? 'v-bad' : '') + '">' + s.totals.arrests + '</b></div>' +
        '<div class="kv"><span>Origine</span><b>' + (D.ORIGINS.filter(function (o) { return o.id === s.origin; })[0] || {}).n + '</b></div>' +
        '</div>');

      h.push(sectionTitle('Partie'));
      h.push('<div class="btnRow"><button class="btn btn--ghost" data-act="save">💾 Sauvegarder</button>' +
        '<button class="btn btn--danger" data-act="reset">🗑️ Nouvelle partie</button></div>');
      h.push(hint('La partie est sauvegardée automatiquement après chaque action, dans votre navigateur.'));
    }

    if (sub.profil === 'log') {
      h.push(sectionTitle('Journal'));
      if (!s.log.length) h.push(empty('📓', 'Rien à raconter pour l’instant.'));
      else h.push('<div class="log">' + s.log.slice(0, 120).map(function (l) {
        if (l.t === 'day') return '<div class="logItem logItem--day">' + l.m + '</div>';
        return '<div class="logItem logItem--' + l.t + '">' +
          '<span class="logItem__t">J' + l.d + ' ' + String(l.h).padStart(2, '0') + 'h</span>' + l.m + '</div>';
      }).join('') + '</div>');
    }
    return h.join('');
  }

  /* =========================================================
     Rendu global
     ========================================================= */
  var RENDER = { survie: renderSurvie, travail: renderTravail, social: renderSocial, sac: renderSac, profil: renderProfil };
  var sellMode = false;

  UI.refresh = function () {
    if (!G || !G.s) return;
    renderTop();
    $('screen').innerHTML = RENDER[tab]();
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
      b.classList.toggle('is-active', b.dataset.tab === tab);
    });
  };

  UI.setTab = function (t) {
    tab = t;
    sellMode = false;
    $('screen').scrollTop = 0;
    UI.refresh();
  };

  /* =========================================================
     Toasts
     ========================================================= */
  var toastCount = 0;
  UI.toast = function (msg, type) {
    if (toastCount > 4) return;
    var el = document.createElement('div');
    el.className = 'toast toast--' + (type || 'neutral');
    el.innerHTML = msg;
    $('toasts').appendChild(el);
    toastCount++;
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { el.remove(); toastCount--; }, 300);
    }, 1900);
  };

  UI.money = function (delta) {
    var w = $('wallet');
    w.classList.remove('flash-up', 'flash-down');
    void w.offsetWidth;
    w.classList.add(delta > 0 ? 'flash-up' : 'flash-down');
  };

  /* =========================================================
     Modales
     ========================================================= */
  /**
   * @param o { ico, title, body, actions:[{l,h,cls,locked,fn,keep}], dismissible }
   */
  UI.modal = function (o) {
    if (modalOpen) { modalQueue.push(o); return; }
    modalOpen = true;
    $('modalIco').textContent = o.ico || '❓';
    $('modalTitle').textContent = o.title || '';
    $('modalBody').innerHTML = o.body || '';

    var box = $('modalActions');
    box.innerHTML = '';
    (o.actions || []).forEach(function (a, i) {
      var b = document.createElement('button');
      b.className = 'choice' + (a.locked ? ' is-locked' : '') + (a.cls === 'ghost' ? ' ' : '');
      b.innerHTML = '<span class="choice__l">' + a.l + '</span>' +
        (a.h ? '<span class="choice__h' + (a.risky ? ' risky' : '') + '">' + (a.locked || a.h) + '</span>' : '');
      b.addEventListener('click', function () {
        if (a.locked) return;
        if (!a.keep) UI.closeModal();
        if (a.fn) a.fn();
      });
      box.appendChild(b);
    });

    $('modal').dataset.dismissible = o.dismissible === false ? '0' : '1';
    $('modal').hidden = false;
  };

  UI.closeModal = function () {
    $('modal').hidden = true;
    modalOpen = false;
    if (modalQueue.length) {
      var next = modalQueue.shift();
      setTimeout(function () { UI.modal(next); }, 180);
    }
  };

  /* --- Événement aléatoire --- */
  UI.event = function (e) {
    UI.modal({
      ico: e.ico, title: e.title, body: '<p>' + e.text + '</p>',
      dismissible: false,
      actions: e.choices.map(function (c, i) {
        var locked = c.req && !c.req(G) ? 'Conditions non réunies' : null;
        return {
          l: c.l, h: c.h, risky: c.risky, locked: locked, keep: true,
          fn: function () {
            var out = NS.EV.resolve(e, i);
            modalOpen = false;
            UI.modal({
              ico: e.ico, title: e.title, body: '<p>' + out + '</p>',
              actions: [{ l: 'Continuer', h: '', fn: function () { UI.refresh(); } }]
            });
          }
        };
      })
    });
  };

  /* --- Coucher --- */
  /**
   * @param forced true lorsqu'il est 22h : la nuit ne peut plus être refusée.
   */
  function sleepPrompt(forced) {
    if (G.s.over) return;
    var s = G.s, h = S.home(s);
    var rent = (s.flags.freeShelter > 0 && h.id === 'shelter') ? 0 : h.rent;
    var inc = S.bizIncome(s);
    var acts = [{ l: '😴 Dormir', h: 'Passer au jour ' + (s.day + 1), fn: function () { G.sleep(); } }];
    if (!forced) acts.push({ l: 'Rester éveillé', h: '', fn: null });

    UI.modal({
      ico: '🌙', title: forced ? 'Il est 22 heures' : 'Terminer la journée',
      dismissible: !forced,
      body: (forced ? '<p>La journée est finie. Vous ne tenez plus debout.</p>' : '') +
        '<p>Vous vous installez pour la nuit : <em>' + h.ico + ' ' + h.name + '</em>.</p>' +
        '<div class="panel mt">' +
        '<div class="kv"><span>Loyer à payer</span><b class="' + (rent > s.money ? 'v-bad' : '') + '">' + (rent ? G.eur(rent) : 'Aucun') + '</b></div>' +
        (rent > s.money ? '<div class="kv"><span>⚠️ Conséquence</span><b class="v-bad">Expulsion vers la rue</b></div>' : '') +
        (inc ? '<div class="kv"><span>Revenus d’entreprise</span><b class="v-good">+' + G.eur(inc) + '</b></div>' : '') +
        '<div class="kv"><span>Énergie récupérée</span><b>≈ +' + h.sleep + '</b></div>' +
        '<div class="kv"><span>Risque nocturne</span><b class="' + (h.risk > 0.1 ? 'v-bad' : '') + '">' + Math.round(h.risk * 100) + '%</b></div>' +
        '</div>' +
        (!forced && S.hoursLeft(s) > 3 ? '<p class="hint mt">Il vous reste encore <b>' + S.hoursLeft(s) + ' heures</b> utilisables aujourd’hui.</p>' : ''),
      actions: acts
    });
  }

  UI.forceNight = function () { sleepPrompt(true); };

  /* --- Jalon --- */
  UI.milestone = function (title, text) {
    UI.modal({
      ico: '🏆', title: title, body: '<p>' + text + '</p>',
      actions: [{ l: 'Continuer', h: '', fn: null }]
    });
  };

  /* --- Fin de partie --- */
  UI.gameOver = function () {
    var o = G.s.over, s = G.s;
    UI.modal({
      ico: o.ico, title: o.title, dismissible: false,
      body: '<p>' + o.text + '</p>' +
        '<div class="panel mt">' +
        '<div class="kv"><span>Jours vécus</span><b>' + s.day + '</b></div>' +
        '<div class="kv"><span>Patrimoine final</span><b>' + G.eur(S.netWorth(s)) + '</b></div>' +
        '<div class="kv"><span>Palier atteint</span><b>' + S.tier(s).n + '</b></div>' +
        '<div class="kv"><span>Total gagné</span><b>' + G.eur(s.totals.earned) + '</b></div>' +
        '<div class="kv"><span>Formation</span><b>' + D.EDU[s.edu].n + '</b></div>' +
        '</div>',
      actions: [{ l: '🔄 Recommencer une vie', h: 'Repartir de zéro', fn: function () { NS.MAIN.reset(); } }]
    });
  };

  /* =========================================================
     Écoute des interactions
     ========================================================= */
  var HANDLERS = {
    action: function (arg) { G.doAction(arg); },
    gig: function (arg) { G.doGig(arg); },
    shift: function () { G.doShift(); },
    apply: function (arg) { G.applyJob(arg); },
    quit: function () { G.quitJob(); },
    study: function () { G.study(); },
    bizbuy: function (arg) { G.buyBiz(arg); },
    bizup: function (arg) { G.upgradeBiz(arg); },
    buy: function (arg) { G.buyItem(arg); },
    use: function (arg) { sellMode ? G.sellItem(arg) : G.useItem(arg); },
    sell: function (arg) { G.sellItem(arg); },
    sellmode: function () { sellMode = !sellMode; UI.toast(sellMode ? '💱 Mode revente activé' : 'Mode revente désactivé', 'money'); },
    move: function (arg) { G.moveHome(arg); },
    npc: function (arg) { npcSheet(arg); },
    sub: function (arg) { var p = arg.split(':'); sub[p[0]] = p[1]; $('screen').scrollTop = 0; UI.refresh(); },
    save: function () { NS.S.save(G.s); UI.toast('💾 Partie sauvegardée', 'good'); },
    reset: function () {
      UI.modal({
        ico: '⚠️', title: 'Tout effacer ?',
        body: '<p>Votre progression actuelle sera définitivement perdue.</p>',
        actions: [
          { l: 'Oui, recommencer', h: 'Action irréversible', risky: true, fn: function () { NS.MAIN.reset(); } },
          { l: 'Annuler', h: '', fn: null }
        ]
      });
    }
  };

  UI.init = function (engine) {
    G = engine;

    $('screen').addEventListener('click', function (ev) {
      var el = ev.target.closest('[data-act]');
      if (!el) return;
      var act = el.dataset.act;
      if (el.classList.contains('is-locked')) {
        if (el.dataset.lock) UI.toast('🔒 ' + el.dataset.lock, 'bad');
        return;
      }
      if (HANDLERS[act]) HANDLERS[act](el.dataset.arg);
    });

    $('tabbar').addEventListener('click', function (ev) {
      var b = ev.target.closest('.tab');
      if (b) UI.setTab(b.dataset.tab);
    });

    $('sleepFab').addEventListener('click', function () { sleepPrompt(false); });

    $('modal').addEventListener('click', function (ev) {
      if (ev.target.hasAttribute('data-close') && $('modal').dataset.dismissible === '1') UI.closeModal();
    });
  };

  NS.UI = UI;
})(window.LifeRPG);
