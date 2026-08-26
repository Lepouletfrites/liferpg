/* =============================================================
   ui.js — Rendu de l'interface : onglets, fiches, modales, toasts.
   ============================================================= */
(function (NS) {
  'use strict';

  var D = NS.D, S = NS.S;
  var UI = {};
  var G;
  var tab = 'survie';
  var sub = {
    survie: 'now', travail: 'gigs', milieu: 'coups',
    finance: 'banque', sac: 'shop', profil: 'stats'
  };
  var modalQueue = [], modalOpen = false, sellMode = false;

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); };
  var eur = function (n) { return Math.round(n).toLocaleString('fr-FR') + ' €'; };
  var pm = function (n, unit) {
    var v = Math.round(n * 10) / 10;
    if (Math.abs(v) < 0.05) return '—';
    return (v > 0 ? '+' : '−') + Math.abs(v) + (unit || '');
  };

  /* =========================================================
     Fragments
     ========================================================= */
  function cost(txt, cls) { return '<span class="cost ' + (cls || '') + '">' + txt + '</span>'; }
  function costs(list) { return '<div class="card__costs">' + list.filter(Boolean).join('') + '</div>'; }
  function sectionTitle(t) { return '<h2 class="secTitle">' + t + '</h2>'; }
  function hint(t) { return '<p class="hint">' + t + '</p>'; }
  function empty(ico, t) { return '<div class="empty"><span>' + ico + '</span>' + t + '</div>'; }
  function kv(k, v, cls) { return '<div class="kv"><span>' + k + '</span><b class="' + (cls || '') + '">' + v + '</b></div>'; }
  function bar(pct, cls) { return '<div class="stat__bar"><div class="stat__fill ' + (cls || '') + '" style="width:' + Math.max(0, Math.min(100, pct)) + '%"></div></div>'; }

  /**
   * o = { ico, title, desc, costs[], lock, accent, act, arg, badge, detail }
   */
  function card(o) {
    var locked = !!o.lock;
    return '' +
      '<button class="card' + (locked ? ' is-locked' : '') + '" data-act="' + o.act + '"' +
      (o.arg !== undefined ? ' data-arg="' + esc(o.arg) + '"' : '') +
      (o.detail ? ' data-detail="' + esc(o.detail) + '"' : '') +
      (o.lock ? ' data-lock="' + esc(o.lock) + '"' : '') +
      ' style="--accent:' + (o.accent || 'transparent') + '">' +
      '<span class="card__ico">' + o.ico + '</span>' +
      '<span class="card__main">' +
      '<span class="card__title">' + o.title + (o.badge || '') + '</span>' +
      (o.desc ? '<span class="card__desc">' + o.desc + '</span>' : '') +
      (o.costs && o.costs.length ? costs(o.costs) : '') +
      (locked ? '<span class="card__lock">🔒 ' + esc(o.lock) + '</span>' : '') +
      '</span>' +
      '<span class="card__go">' + (o.detail ? '<i class="card__info">i</i>' : '') + '›</span>' +
      '</button>';
  }

  function subtabs(group, items) {
    return '<div class="subtabs' + (items.length > 4 ? ' subtabs--scroll' : '') + '">' + items.map(function (i) {
      return '<button class="subtab' + (sub[group] === i.id ? ' is-active' : '') +
        '" data-act="sub" data-arg="' + group + ':' + i.id + '">' + i.l + '</button>';
    }).join('') + '</div>';
  }

  /**
   * Rend une liste de cartes en séparant ce qui est utilisable maintenant
   * de ce qui est verrouillé — le verrouillé part dans un tiroir replié,
   * pour que l'écran ne montre en priorité que ce qui est vraiment jouable.
   * mapFn(item) doit renvoyer les options de card(), ou null pour l'omettre.
   */
  function cardsWithLocked(list, mapFn, lockedLabel) {
    var open = [], locked = [];
    list.forEach(function (item) {
      var o = mapFn(item);
      if (!o) return;
      (o.lock ? locked : open).push(card(o));
    });
    var out = open.length ? '<div class="cards">' + open.join('') + '</div>' : '';
    if (locked.length) {
      out += '<details class="lockedGroup">' +
        '<summary><span class="lockedGroup__l">🔒 ' + (lockedLabel || 'Indisponible pour l’instant') + '</span>' +
        '<span class="lockedGroup__n">' + locked.length + '</span></summary>' +
        '<div class="cards mt">' + locked.join('') + '</div></details>';
    }
    if (!open.length && !locked.length) out = empty('—', 'Rien ici pour l’instant.');
    return out;
  }

  /* =========================================================
     En-tête
     ========================================================= */
  function renderTop() {
    var s = G.s;
    var t = S.tier(s);
    var per = S.period(s);
    var night = S.isNight(s);

    document.documentElement.style.setProperty('--tier', t.c);
    $('app').classList.toggle('is-night', night);

    $('avatar').textContent = s.jail ? '⛓️' : t.av;
    $('playerName').textContent = s.name;
    $('playerTier').textContent = t.n;
    $('wallet').textContent = eur(s.money);
    $('walletSub').innerHTML = (s.dirty > 0 ? '<span class="dirty">🩸 ' + eur(s.dirty) + '</span>' : '') +
      (s.bank.open ? '<span class="bankv">🏦 ' + eur(s.bank.checking + s.bank.savings) + '</span>' : '');

    $('clock').textContent = 'Jour ' + s.day + ' · ' + per.ico + ' ' + per.label + ' · ' +
      D.hh(s.hour) + ' · ' + S.hoursLeft(s) + ' h restantes';

    $('gauges').innerHTML = D.GAUGES.map(function (g) {
      var v = Math.round(s.gauges[g.id]);
      return '<div class="gauge' + (v <= 20 ? ' is-low' : '') + '" data-act="gaugeinfo" data-arg="' + g.id + '">' +
        '<div class="gauge__top"><span class="gauge__ico">' + g.ico + '</span><span>' + v + '</span></div>' +
        '<div class="gauge__bar"><div class="gauge__fill" style="width:' + v + '%;background:' + g.color + '"></div></div>' +
        '</div>';
    }).join('');

    var h = S.home(s);
    var chips = [];
    chips.push('<span class="chip">🏙️ ' + Math.round(s.rep.rue) + ' · ⚖️ ' + Math.round(s.rep.legale) +
      (s.rep.pegre > 0 ? ' · 🕶️ ' + Math.round(s.rep.pegre) : '') + '</span>');
    chips.push('<span class="chip chip--heat' + (s.heat >= 45 ? ' hot' : '') + '">🚨 ' + Math.round(s.heat) + ' %</span>');
    if (s.casier) chips.push('<span class="chip chip--casier">📕 Casier ' + s.casier + '</span>');
    chips.push('<span class="chip">' + h.ico + ' ' + h.name + '</span>');
    if (s.job) chips.push('<span class="chip">' + D.JOB[s.job.id].ico + ' ' + D.JOB[s.job.id].n + '</span>');
    if (s.quests.length) chips.push('<span class="chip chip--quest">🎯 ' + s.quests.length + ' en cours</span>');
    $('topMeta').innerHTML = chips.join('');

    var fab = $('sleepFab');
    var urgent = S.hoursLeft(s) <= 2 || s.gauges.energie < 15;
    fab.className = 'sleepfab' + (urgent ? ' urgent' : '') + (night ? ' night' : '');
    fab.querySelector('.sleepfab__lbl').textContent = night ? 'Dormir' : 'Terminer';
  }

  /* =========================================================
     Onglet SURVIE
     ========================================================= */
  function actionCardOpts(a) {
    var lock = G.canDo(a);
    return {
      ico: a.ico, title: a.n, desc: a.d, accent: a.accent,
      costs: [
        cost('⏱ ' + a.hours + ' h', 'cost--time'),
        a.energy > 0 ? cost('⚡ −' + a.energy, 'cost--nrj') : (a.energy < 0 ? cost('⚡ +' + (-a.energy), 'cost--pay') : null),
        a.risky ? cost('⚠ Illégal', 'cost--risk') : null,
        a.when === 'night' ? cost('🌙 Nuit', 'cost--night') : null
      ],
      lock: lock, act: 'action', arg: a.id, detail: 'action:' + a.id
    };
  }
  function actionCard(a) { return card(actionCardOpts(a)); }

  /** Une ou deux actions qui répondent le mieux à l'état actuel du joueur. */
  function recommendedBlock() {
    var s = G.s;
    var weight = { sante: 1.35, faim: 1.15, hygiene: 0.8, energie: 0.9, moral: 0.85 };
    var needs = [
      { g: 'sante', ids: ['medic'] },
      { g: 'faim', ids: ['soup', 'scavenge'] },
      { g: 'hygiene', ids: ['shower', 'wash'] },
      { g: 'energie', ids: ['rest', 'nap'] },
      { g: 'moral', ids: ['therapy', 'leisure'] }
    ];
    needs.sort(function (a, b) { return s.gauges[a.g] * weight[a.g] - s.gauges[b.g] * weight[b.g]; });

    var picks = [];
    needs.forEach(function (n) {
      if (picks.length >= 3 || s.gauges[n.g] >= 55) return;
      n.ids.forEach(function (id) {
        if (picks.length >= 3) return;
        var a = D.ACTION[id];
        if (a && !G.canDo(a) && picks.indexOf(a) === -1) picks.push(a);
      });
    });
    if (!picks.length) {
      ['beg', 'recycle', 'busk'].forEach(function (id) {
        if (picks.length) return;
        var a = D.ACTION[id];
        if (a && !G.canDo(a)) picks.push(a);
      });
    }
    if (!picks.length) return '';
    return sectionTitle('👉 Suggéré maintenant') +
      '<div class="cards cards--reco">' + picks.map(actionCard).join('') + '</div>';
  }

  function renderSurvie() {
    var s = G.s, h = [];
    var night = S.isNight(s);

    if (night) {
      h.push('<div class="banner banner--night"><b>🌙 Il est ' + D.hh(s.hour) + '.</b> ' +
        'Vous avez choisi de veiller. Les activités nocturnes rapportent davantage, ' +
        'mais chaque heure entame votre santé et le sommeil qui suivra sera court. ' +
        'Il vous reste <b>' + S.hoursLeft(s) + ' h</b> avant que le jour ne se lève.</div>');
    } else {
      h.push(hint('Chaque action coûte du <b>temps</b> et de l’<b>énergie</b>. <b>Appui long</b> sur une carte pour voir son détail complet.'));
    }

    h.push(recommendedBlock());

    var now = [], later = [], risky = [];
    D.ACTIONS.forEach(function (a) {
      var w = a.when || 'day';
      var fits = (w === 'any') || (w === 'night') === night;
      if (a.risky && fits) risky.push(a);
      else if (fits) now.push(a);
      else later.push(a);
    });

    h.push(sectionTitle(night ? 'Activités nocturnes' : 'Survivre aujourd’hui'));
    h.push(cardsWithLocked(now, actionCardOpts, 'Pas encore accessibles'));

    if (risky.length) {
      h.push(sectionTitle('⚠ Zone grise'));
      h.push(hint('Rapporte davantage, immédiatement, au prix de la <b>pression policière</b> (' + Math.round(s.heat) + ' %).'));
      h.push(cardsWithLocked(risky, actionCardOpts, 'Pas encore accessibles'));
    }

    if (later.length) {
      h.push('<details class="lockedGroup lockedGroup--period">' +
        '<summary><span class="lockedGroup__l">' + (night ? '☀️ Réservé au jour' : '🌙 Réservé à la nuit') + '</span>' +
        '<span class="lockedGroup__n">' + later.length + '</span></summary>' +
        hint(night
          ? 'Ces activités ne reprendront qu’après votre nuit de sommeil.'
          : 'Après 22 h, vous pouvez choisir de veiller plutôt que de dormir. La nuit paie mieux — et coûte plus cher.') +
        '<div class="cards">' + later.map(actionCard).join('') + '</div></details>');
    }
    return h.join('');
  }

  /* =========================================================
     Formation — tronc commun, examens, filières post-bac
     ========================================================= */
  function filiereJobs(fid) {
    return D.JOBS.filter(function (j) { return j.req && j.req.filiere === fid; })
      .sort(function (a, b) { return (a.req.filiereLvl || 0) - (b.req.filiereLvl || 0); });
  }

  function sessionCard(level, actId, lockReason, ready) {
    return card({
      ico: '📖', title: ready ? 'Réviser encore' : 'Suivre une session',
      desc: ready
        ? 'Optionnel : chaque séance de plus (jusqu’à ' + G.OVERSTUDY_CAP + ') augmente vos chances à l’examen.'
        : 'Une séance de plus vers l’examen.',
      accent: 'var(--info)',
      costs: [
        cost('⏱ ' + level.hours + ' h', 'cost--time'), cost('⚡ −' + level.energy, 'cost--nrj'),
        level.cost ? cost(eur(level.cost), 'cost--price') : cost('Gratuit', 'cost--pay')
      ],
      lock: lockReason, act: actId
    });
  }

  function examCard(level, chance, actId, streak) {
    var favorable = chance >= 50;
    return card({
      ico: '📝', title: 'Passer l’examen', desc: level.n +
        ' — en cas d’échec, une partie des séances est perdue, mais la tentative suivante sera plus favorable.',
      accent: favorable ? 'var(--good)' : 'var(--danger)',
      costs: [
        cost('⏱ ' + level.examHours + ' h', 'cost--time'), cost('⚡ −' + level.examEnergy, 'cost--nrj'),
        cost('🎯 ' + Math.round(chance) + ' % de réussite', favorable ? 'cost--pay' : 'cost--risk'),
        streak ? cost('+' + (streak * 6) + ' % (' + streak + ' échec' + (streak > 1 ? 's' : '') + ')') : null
      ],
      act: actId
    });
  }

  function renderEducation(s) {
    var h = [];

    /* --- tronc commun --- */
    h.push(sectionTitle('Formation'));
    h.push('<div class="panel"><div class="panel__t">🎓 Niveau actuel : ' + D.EDU[s.edu].n + '</div></div>');

    if (G.eduLeft()) {
      var nx = D.EDU[s.edu + 1];
      var pct = Math.round(s.eduProg / nx.sessions * 100);
      h.push('<div class="panel mt"><div class="panel__hd"><div class="panel__t">' + nx.ico + ' ' + nx.n + '</div>' +
        '<span class="tag">' + s.eduProg + '/' + nx.sessions + '</span></div>' + bar(pct) +
        '<p class="hint mt">' + nx.d + '</p></div>');

      var lockE = G.checkReq(nx.req) || (s.money < nx.cost ? 'Il faut ' + eur(nx.cost) + ' par session' : null);
      var readyE = !!nx.exam && s.eduProg >= nx.sessions;
      var cards = [];
      if (!readyE || !nx.exam) cards.push(sessionCard(nx, 'study', lockE || (nx.hours > S.hoursLeft(s) ? 'Pas assez de temps' : null), readyE));
      else if (s.eduProg < nx.sessions + G.OVERSTUDY_CAP) cards.push(sessionCard(nx, 'study', lockE || (nx.hours > S.hoursLeft(s) ? 'Pas assez de temps' : null), true));
      if (readyE) cards.push(examCard(nx, G.eduExamChance(), 'sitedu', s.examStreak.bac));
      h.push('<div class="cards mt">' + cards.join('') + '</div>');
      h.push(hint('La nuit, l’activité <b>Réviser jusqu’à l’aube</b> valide aussi une séance.' +
        (nx.exam ? ' Le <b>Baccalauréat</b> exige de réussir un examen : le moral et l’intelligence pèsent sur vos chances.' : '')));
    } else if (!s.filiere) {
      h.push(empty('🎓', 'Baccalauréat en poche. Il est temps de choisir une filière.'));
    }

    /* --- filière post-bac --- */
    if (!G.eduLeft()) {
      if (!s.filiere) {
        h.push(sectionTitle('Choisir une filière'));
        h.push(hint('Un choix <b>définitif</b>. Chaque filière mène à trois niveaux (Licence, Master, diplôme terminal) ' +
          'et débloque ses propres postes — bien mieux payés que la voie générale, mais bien plus exigeants.'));
        h.push(cardsWithLocked(D.FILIERES, function (f) {
          var lock = G.checkReq(f.req);
          var jobs = filiereJobs(f.id);
          var payRange = jobs.length ? eur(jobs[0].pay) + ' → ' + eur(jobs[jobs.length - 1].pay) + ' / quart' : '';
          return {
            ico: f.ico, title: f.n, desc: f.d + (payRange ? ' Débouchés : ' + payRange + '.' : ''),
            accent: 'var(--purple)',
            costs: [cost(f.levels.length + ' niveaux', 'cost--time'), payRange ? cost(payRange, 'cost--pay') : null],
            lock: lock, act: 'pickfiliere', arg: f.id
          };
        }, 'Hors de portée pour l’instant'));
      } else {
        var f = D.FILIERE[s.filiere];
        var lvl = G.filiereLevel();
        h.push(sectionTitle(f.ico + ' ' + f.n));
        h.push('<div class="panel">' +
          kv('Niveau obtenu', s.filiereLvl > 0 ? D.FILIERE_TIER[s.filiereLvl - 1] : 'Aucun encore') +
          kv('Progression', s.filiereLvl + ' / ' + f.levels.length) + '</div>');

        if (lvl) {
          var pctF = Math.round(s.filiereProg / lvl.sessions * 100);
          h.push('<div class="panel mt"><div class="panel__hd"><div class="panel__t">' + f.ico + ' ' + lvl.n + '</div>' +
            '<span class="tag">' + s.filiereProg + '/' + lvl.sessions + '</span></div>' + bar(pctF) + '</div>');

          var lockF = G.checkReq(lvl.req) || (s.money < lvl.cost ? 'Il faut ' + eur(lvl.cost) + ' par session' : null);
          var readyF = s.filiereProg >= lvl.sessions;
          var streakF = s.examStreak[s.filiere + s.filiereLvl];
          var cardsF = [];
          if (!readyF || s.filiereProg < lvl.sessions + G.OVERSTUDY_CAP) {
            cardsF.push(sessionCard(lvl, 'studyfil', lockF || (lvl.hours > S.hoursLeft(s) ? 'Pas assez de temps' : null), readyF));
          }
          if (readyF) cardsF.push(examCard(lvl, G.filiereExamChance(), 'sitfil', streakF));
          h.push('<div class="cards mt">' + cardsF.join('') + '</div>');
        } else {
          h.push(empty('🏅', 'Parcours achevé en ' + f.n + '. Les postes les plus élevés de cette filière vous sont ouverts.'));
        }

        h.push(sectionTitle('Débouchés de la filière'));
        h.push('<div class="panel">' + filiereJobs(f.id).map(function (j) {
          var reached = s.filiereLvl >= (j.req.filiereLvl || 0);
          return kv(j.ico + ' ' + j.n + ' <span class="tag">' + D.FILIERE_TIER[(j.req.filiereLvl || 1) - 1] + '</span>',
            (reached ? 'Accessible · ' : '') + eur(j.pay) + '/quart', reached ? 'v-good' : '');
        }).join('') + '</div>');
      }
    }

    /* --- parcours complet --- */
    h.push(sectionTitle('Parcours'));
    h.push('<div class="panel">' + D.EDU.map(function (e, i) {
      if (!i) return '';
      return kv(e.ico + ' ' + e.n, s.edu >= i ? 'Obtenu' : e.sessions + ' séances', s.edu >= i ? 'v-good' : '');
    }).join('') + '</div>');
    if (s.filiere) {
      var ff = D.FILIERE[s.filiere];
      h.push('<div class="panel">' + ff.levels.map(function (l, i) {
        return kv(ff.ico + ' ' + l.n, s.filiereLvl > i ? 'Obtenu' : l.sessions + ' séances', s.filiereLvl > i ? 'v-good' : '');
      }).join('') + '</div>');
    }
    return h;
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
      h.push(cardsWithLocked(D.GIGS, function (g) {
        var hours = G.gigHours(g);
        var lock = G.canDo({ req: g.req, hours: hours, energy: g.energy, when: g.when });
        return {
          ico: g.ico, title: g.n, desc: g.d, accent: 'var(--good)',
          costs: [
            cost('⏱ ' + hours + ' h', 'cost--time'),
            cost('⚡ −' + g.energy, 'cost--nrj'),
            g.when === 'night' ? cost('🌙 Nuit', 'cost--night') : null
          ],
          lock: lock, act: 'gig', arg: g.id, detail: 'gig:' + g.id
        };
      }, 'Pas encore accessibles'));
    }

    if (sub.travail === 'job') {
      if (s.job) {
        var j = D.JOB[s.job.id];
        var hours = G.gigHours(j);
        var sen = 1 + Math.floor(s.job.shifts / 10) * 0.08;
        h.push(sectionTitle('Votre poste'));
        h.push('<div class="panel"><div class="panel__hd"><div class="panel__t">' + j.ico + ' ' + j.n + '</div>' +
          '<span class="tag">' + s.job.shifts + ' quarts</span></div>' +
          kv('Salaire par quart', eur(j.pay * sen)) +
          kv('Ancienneté', '+' + Math.round((sen - 1) * 100) + ' %') +
          kv('Prochaine augmentation', 'dans ' + (10 - (s.job.shifts % 10)) + ' quarts') +
          '</div>');
        h.push('<div class="cards mt">' + card({
          ico: '▶️', title: 'Prendre son service', desc: 'Effectuer un quart de travail complet.',
          accent: 'var(--good)',
          costs: [cost('⏱ ' + hours + ' h', 'cost--time'), cost('⚡ −' + j.energy, 'cost--nrj'),
          j.when === 'night' ? cost('🌙 Nuit', 'cost--night') : null],
          lock: G.canDo({ hours: hours, energy: j.energy, when: j.when }), act: 'shift', detail: 'shift:' + j.id
        }) + '</div>');
        h.push('<div class="btnRow"><button class="btn btn--ghost" data-act="quit">Démissionner</button></div>');
        h.push(sectionTitle('Évoluer'));
      } else {
        h.push(sectionTitle('Trouver un emploi'));
        h.push(hint('Un emploi déclaré exige une <b>adresse</b>, une <b>apparence correcte</b>, parfois un <b>diplôme</b>, ' +
          'et un <b>casier</b> compatible. En échange : un revenu stable et de la réputation légale.'));
      }

      h.push(cardsWithLocked(D.JOBS, function (jb) {
        if (s.job && s.job.id === jb.id) return null;
        var max = jb.casierMax === undefined ? 99 : jb.casierMax;
        var lock = G.checkReq(jb.req) || (s.casier > max ? 'Casier trop chargé (max ' + max + ')' : null);
        return {
          ico: jb.ico, title: jb.n, desc: jb.d, accent: 'var(--info)',
          costs: [cost('⏱ ' + jb.hours + ' h/quart', 'cost--time'), cost(eur(jb.pay) + ' / quart', 'cost--pay'),
          jb.req.filiere ? cost('🎓 ' + D.FILIERE[jb.req.filiere].ico + ' ' + D.FILIERE_TIER[(jb.req.filiereLvl || 1) - 1]) :
          (jb.req.edu ? cost('🎓 ' + D.EDU[jb.req.edu].short) : null),
          jb.when === 'night' ? cost('🌙 Nuit', 'cost--night') : null],
          lock: lock, act: 'apply', arg: jb.id, detail: 'job:' + jb.id,
          badge: lock ? '' : '<span class="badge badge--new">Éligible</span>'
        };
      }, 'Hors de portée pour l’instant'));
      h.push(hint('Postuler coûte 2 heures. Appui long sur un poste pour voir vos chances réelles d’embauche.'));
    }

    if (sub.travail === 'edu') {
      h.push.apply(h, renderEducation(s));
    }

    if (sub.travail === 'biz') {
      h.push(sectionTitle('Vos entreprises'));
      if (!s.biz.length) {
        h.push(empty('📉', 'Vous ne possédez aucune entreprise.<br>Tant que vous vendez vos heures, votre revenu a un plafond.'));
      } else {
        h.push('<div class="panel">' +
          kv('Revenu quotidien légal', eur(S.bizIncome(s)), 'v-good') +
          (S.bizDirtyIncome(s) ? kv('Revenu quotidien sale', eur(S.bizDirtyIncome(s)), 'v-dirty') : '') +
          (S.washCap(s) ? kv('Capacité de blanchiment / jour', eur(S.washCap(s))) : '') +
          (s.flags.network ? kv('Réseau d’Alex Vidal', '+30 %', 'v-good') : '') + '</div>');
        h.push('<div class="cards mt">' + s.biz.map(function (b) {
          var d = D.BIZI[b.id];
          var up = G.bizUpCost(b);
          var maxed = b.lvl >= d.maxLvl;
          return card({
            ico: d.ico, title: d.n + ' <span class="tag">Niv. ' + b.lvl + '</span>',
            desc: 'Rapporte ' + eur(d.rev * b.lvl * S.bizMult(s)) + ' par jour' + (d.legal === false ? ' en argent sale' : '') + '.',
            accent: d.legal === false ? 'var(--danger)' : 'var(--purple)',
            costs: maxed ? [cost('Niveau maximum', 'cost--pay')] :
              [cost('⏱ 2 h', 'cost--time'), cost('Développer : ' + eur(up), 'cost--price')],
            lock: maxed ? 'Niveau maximum atteint' : (s.money < up ? 'Il faut ' + eur(up) : null),
            act: 'bizup', arg: b.id
          });
        }).join('') + '</div>');
        h.push('<div class="btnRow"><button class="btn btn--ghost btn--sm" data-act="bizsell">💱 Céder une entreprise</button></div>');
      }

      h.push(sectionTitle('Créer une entreprise'));
      h.push(hint('C’est le seul moteur capable de vous mener au million : vos entreprises produisent <b>chaque nuit</b>, même quand vous dormez.'));
      h.push(cardsWithLocked(D.BIZ, function (d) {
        if (G.ownBiz(d.id)) return null;
        var lock = G.checkReq(d.req) || (s.money < d.cost ? 'Capital de ' + eur(d.cost) + ' requis' : null);
        return {
          ico: d.ico, title: d.n, desc: d.d, accent: d.legal === false ? 'var(--danger)' : 'var(--gold)',
          costs: [cost('⏱ 3 h', 'cost--time'), cost(eur(d.cost), 'cost--price'),
          cost('≈ ' + eur(d.rev) + '/jour', d.legal === false ? 'cost--risk' : 'cost--pay'),
          d.wash ? cost('🧼 Blanchiment') : null],
          lock: lock, act: 'bizbuy', arg: d.id
        };
      }, 'Hors de portée pour l’instant'));
    }

    return h.join('');
  }

  /* =========================================================
     Onglet MILIEU
     ========================================================= */
  function renderMilieu() {
    var s = G.s, h = [];
    h.push(subtabs('milieu', [
      { id: 'coups', l: 'Coups' }, { id: 'marche', l: 'Marché' },
      { id: 'blanchiment', l: 'Blanchiment' }, { id: 'statut', l: 'Exposition' }
    ]));

    if (sub.milieu === 'coups') {
      h.push('<div class="banner banner--crime">' +
        '<b>🕶️ Réputation dans le milieu : ' + Math.round(s.rep.pegre) + '/100</b> · ' +
        'Pression policière <b>' + Math.round(s.heat) + ' %</b> · Casier <b>' + s.casier + '</b><br>' +
        'Chaque coup rapporte de l’<b>argent sale</b>, inutilisable tel quel : il faut le blanchir. ' +
        'Une arrestation entraîne une <b>peine de prison</b> réellement purgée, proportionnelle au délit et à votre casier.' +
        '</div>');

      D.CRIME_CATS.forEach(function (cat) {
        var list = D.CRIMES.filter(function (c) { return c.cat === cat.id; });
        if (!list.length) return;
        h.push(sectionTitle(cat.l));
        h.push(hint(cat.d));
        h.push(cardsWithLocked(list, function (c) {
          var lock = G.canDo(c);
          return {
            ico: c.ico, title: c.n, desc: c.d,
            accent: cat.id === 'cover' ? 'var(--info)' : (cat.id === 'big' ? 'var(--danger)' : 'var(--gold-2)'),
            costs: [
              cost('⏱ ' + c.hours + ' h', 'cost--time'),
              cost('⚡ −' + c.energy, 'cost--nrj'),
              c.sentence ? cost('⚖️ ' + c.sentence + ' j encourus', 'cost--risk') : cost('Sans risque pénal', 'cost--pay'),
              c.when === 'night' ? cost('🌙 Nuit', 'cost--night') : (c.when === 'day' ? cost('☀️ Jour') : null)
            ],
            lock: lock, act: 'crime', arg: c.id, detail: 'crime:' + c.id
          };
        }, 'Hors de portée pour l’instant'));
      });
    }

    if (sub.milieu === 'marche') {
      h.push(sectionTitle('Marché parallèle'));
      h.push(hint('Payable en argent propre ou en <b>argent sale</b>. Personne ne demande de facture.'));
      h.push(cardsWithLocked(D.ITEMS.filter(function (i) { return i.shop === 'street'; }), function (it) {
        var own = s.inv[it.id] || 0;
        var lock = G.checkReq(it.req) || (it.keep && own ? 'Déjà possédé' : null) ||
          (s.money < it.price && s.dirty < it.price ? 'Il faut ' + eur(it.price) : null);
        return {
          ico: it.ico, title: it.n, desc: it.d, accent: 'var(--danger)',
          costs: [cost(eur(it.price), 'cost--price'),
          s.dirty >= it.price ? cost('🩸 Payable en sale', 'cost--risk') : null],
          badge: own ? '<span class="badge badge--own">×' + own + '</span>' : '',
          lock: lock, act: 'buystreet', arg: it.id
        };
      }, 'Hors de portée pour l’instant'));
      h.push(hint('Un appui long n’est pas nécessaire ici : le prix est le seul risque. Ce que vous en ferez, en revanche…'));
    }

    if (sub.milieu === 'blanchiment') {
      h.push(sectionTitle('Argent sale'));
      h.push('<div class="panel">' +
        kv('Liquide non déclarable', eur(s.dirty), s.dirty ? 'v-dirty' : '') +
        kv('Total blanchi à ce jour', eur(s.totals.laundered)) +
        kv('Risque de saisie', s.heat >= D.BANK.seizeThreshold ? Math.round(NS.FIN.seizureRisk(s)) + ' % par contrôle' : 'faible') +
        '</div>');
      h.push(hint('L’argent sale ne compte qu’à <b>moitié</b> dans votre patrimoine, ne peut pas être déposé en banque ' +
        'ni investi en bourse, et il est <b>intégralement saisi</b> en cas d’arrestation.'));

      h.push(sectionTitle('Circuits disponibles'));
      h.push('<div class="cards">' + D.LAUNDER.map(function (m) {
        var cap = G.launderCap(m);
        var lock = G.checkReq(m.req) || (s.dirty < 50 ? 'Pas d’argent à blanchir' : null) ||
          (cap < 50 ? 'Aucune capacité disponible' : null);
        var amount = Math.min(s.dirty, cap);
        return card({
          ico: m.ico, title: m.n, desc: m.d, accent: 'var(--good)',
          costs: [cost('⏱ ' + m.hours + ' h', 'cost--time'),
          cost('Frais ' + Math.round(m.fee * 100) + ' %', 'cost--price'),
          cost('Risque ' + Math.round(m.risk * 100) + ' %', 'cost--risk'),
          cost('Max ' + eur(cap), 'cost--pay'),
          amount >= 50 ? cost('≈ ' + eur(amount * (1 - m.fee)) + ' nets', 'cost--pay') : null],
          lock: lock, act: 'launder', arg: m.id
        });
      }).join('') + '</div>');
    }

    if (sub.milieu === 'statut') {
      h.push(sectionTitle('Votre exposition pénale'));
      h.push('<div class="panel">' +
        kv('🚨 Pression policière', Math.round(s.heat) + ' / 100', s.heat > 45 ? 'v-bad' : '') +
        kv('📕 Mentions au casier', s.casier, s.casier > 3 ? 'v-bad' : '') +
        kv('Arrestations', s.totals.arrests + ' / 8', s.totals.arrests >= 5 ? 'v-bad' : '') +
        kv('Jours purgés', s.totals.jailDays) +
        kv('Délits commis', s.totals.crimes) +
        kv('Probabilité d’arrestation en cas d’échec', Math.round(Math.max(0, 20 + s.heat * 0.55 - G.lvl('discretion') * 1.5)) + ' %') +
        kv('Multiplicateur de peine (casier)', '×' + (1 + s.casier * 0.14).toFixed(2)) +
        '</div>');
      h.push(hint('À <b>8 arrestations</b> ou <b>14 mentions</b> au casier, la peine devient définitive et la partie s’arrête.'));

      h.push(sectionTitle('Protections actives'));
      h.push('<div class="panel">' +
        kv('🎭 Alibi préparé', s.flags.alibi ? 'Oui — annule la prochaine arrestation' : 'Non', s.flags.alibi ? 'v-good' : '') +
        kv('🪪 Faux papiers', G.has('faux') ? '×' + s.inv.faux : 'Aucun', G.has('faux') ? 'v-good' : '') +
        kv('⚖️ Avocate sur dossier', s.flags.lawyer ? 'Oui — peines −40 %' : 'Non', s.flags.lawyer ? 'v-good' : '') +
        kv('🛡️ Blindage juridique', s.flags.shield ? 'Oui' : 'Non', s.flags.shield ? 'v-good' : '') +
        kv('🐺 Protection du Grec', s.flags.protected ? 'Oui' : 'Non', s.flags.protected ? 'v-good' : '') +
        kv('🧤 Effacement des traces', s.flags.ghost ? 'Oui — pression −25 %' : 'Non', s.flags.ghost ? 'v-good' : '') +
        '</div>');
    }
    return h.join('');
  }

  /* =========================================================
     Onglet FINANCE
     ========================================================= */
  function sparkline(id) {
    var hist = G.s.market.hist[id] || [];
    if (hist.length < 2) return '';
    var min = Math.min.apply(null, hist), max = Math.max.apply(null, hist);
    var rng = (max - min) || 1;
    var pts = hist.map(function (v, i) {
      return (i / (hist.length - 1) * 100).toFixed(1) + ',' + (26 - (v - min) / rng * 24).toFixed(1);
    }).join(' ');
    var up = hist[hist.length - 1] >= hist[0];
    return '<svg class="spark" viewBox="0 0 100 28" preserveAspectRatio="none">' +
      '<polyline points="' + pts + '" fill="none" stroke="' + (up ? 'var(--good)' : 'var(--danger)') + '" stroke-width="1.6"/></svg>';
  }

  function renderFinance() {
    var s = G.s, h = [];
    h.push(subtabs('finance', [
      { id: 'banque', l: 'Banque' }, { id: 'bourse', l: 'Bourse' }, { id: 'credit', l: 'Crédits' }
    ]));

    if (!s.bank.open) {
      var lock = G.checkReq(D.BANK.openReq) || (s.money < D.BANK.openCost ? 'Il faut ' + eur(D.BANK.openCost) : null);
      h.push(sectionTitle('Ouvrir un compte'));
      h.push(hint('Sans compte, tout votre argent est du liquide : il se vole la nuit, il se saisit lors d’un contrôle, ' +
        'et il ne produit rien. Le compte est la première marche de tout ce qui suit.'));
      h.push('<div class="cards">' + card({
        ico: '🏦', title: 'Ouvrir un compte bancaire',
        desc: 'Adresse administrative et réputation légale 8 exigées.',
        accent: 'var(--gold)',
        costs: [cost(eur(D.BANK.openCost), 'cost--price'), cost('⏱ 1 h', 'cost--time')],
        lock: lock, act: 'openbank'
      }) + '</div>');
      return h.join('');
    }

    if (sub.finance === 'banque') {
      h.push(sectionTitle('Comptes'));
      h.push('<div class="panel">' +
        kv('💵 Liquide sur vous', eur(s.money), s.heat >= D.BANK.seizeThreshold ? 'v-bad' : '') +
        kv('🏦 Compte courant', eur(s.bank.checking)) +
        kv('💰 Livret d’épargne', eur(s.bank.savings), 'v-good') +
        kv('Intérêts quotidiens', '+' + eur(Math.min(s.bank.savings, D.BANK.savingsCap) * D.BANK.savingsRate)) +
        kv('Score bancaire', Math.round(s.bank.score) + ' / 100') +
        '</div>');
      h.push(bar(s.bank.score));

      h.push(sectionTitle('Opérations'));
      h.push('<div class="grid2">' +
        '<button class="btn btn--sm btn--ghost" data-act="deposit" data-arg="all">⬆️ Tout déposer</button>' +
        '<button class="btn btn--sm btn--ghost" data-act="withdraw" data-arg="200">⬇️ Retirer 200 €</button>' +
        '<button class="btn btn--sm btn--ghost" data-act="tosave" data-arg="all">💰 Tout placer</button>' +
        '<button class="btn btn--sm btn--ghost" data-act="fromsave" data-arg="all">↩️ Tout déplacer</button>' +
        '</div>');
      h.push(hint('L’argent placé sur le <b>livret</b> produit des intérêts chaque nuit et sert de garantie ' +
        'aux crédits. Le <b>compte courant</b> paie les loyers et les ordres de bourse. Le <b>liquide</b> ne sert qu’à la rue.'));

      if (s.heat >= D.BANK.seizeThreshold) {
        h.push('<div class="banner banner--warn">⚠️ Votre pression policière dépasse ' + D.BANK.seizeThreshold +
          ' %. Le liquide que vous transportez peut être saisi lors d’un contrôle. Déposez-le.</div>');
      }
    }

    if (sub.finance === 'bourse') {
      if (!G.marketOpen()) {
        h.push(empty('📵', 'Il vous faut un <b>smartphone</b> ou un <b>ordinateur</b> pour passer des ordres.'));
        return h.join('');
      }
      var reg = D.REGIME[s.market.regime];
      h.push('<div class="banner banner--market"><b>' + reg.ico + ' ' + reg.n + '</b> — ' +
        'régime en cours depuis peu, encore ' + s.market.regimeLeft + ' jour(s) estimés. ' +
        'Les cours évoluent chaque nuit.</div>');

      var pf = S.portfolio(s);
      var invested = 0;
      Object.keys(s.market.cost).forEach(function (k) { invested += s.market.cost[k]; });
      h.push('<div class="panel">' +
        kv('Valeur du portefeuille', eur(pf), 'v-good') +
        kv('Capital investi', eur(invested)) +
        kv('Plus/moins-value latente', (pf - invested >= 0 ? '+' : '') + eur(pf - invested), pf - invested >= 0 ? 'v-good' : 'v-bad') +
        kv('Liquidités disponibles', eur(s.bank.checking)) +
        '</div>');

      if (s.market.tip) {
        h.push('<div class="banner banner--tip">🤫 <b>Information privilégiée</b> : ' +
          D.ASSET[s.market.tip.id].ico + ' <b>' + D.ASSET[s.market.tip.id].n + '</b> bougera fortement cette nuit.</div>');
      }

      h.push(sectionTitle('Actifs'));
      h.push('<div class="cards">' + D.ASSETS.map(function (a) {
        var px = s.market.px[a.id];
        var mv = s.market.lastMove[a.id] || 0;
        var qty = s.market.hold[a.id] || 0;
        var val = qty * px;
        var cost0 = s.market.cost[a.id] || 0;
        var trend = s.flags.marketRead
          ? ' · tendance ' + (a.drift + D.REGIME[s.market.regime].drift > 0.002 ? '↗' : (a.drift + D.REGIME[s.market.regime].drift < 0 ? '↘' : '→'))
          : '';
        return '<button class="asset" data-act="asset" data-arg="' + a.id + '">' +
          '<span class="asset__ico">' + a.ico + '</span>' +
          '<span class="asset__b">' +
          '<span class="asset__n">' + a.n + ' <span class="tag">' + a.ticker + '</span></span>' +
          '<span class="asset__d">' + eur(px) + ' <em class="' + (mv >= 0 ? 'v-good' : 'v-bad') + '">' +
          (mv >= 0 ? '+' : '') + (mv * 100).toFixed(1) + ' %</em>' + trend + '</span>' +
          (qty > 0 ? '<span class="asset__pos">Position ' + eur(val) + ' · ' +
            '<em class="' + (val - cost0 >= 0 ? 'v-good' : 'v-bad') + '">' + (val - cost0 >= 0 ? '+' : '') + eur(val - cost0) + '</em></span>' : '') +
          '</span>' + sparkline(a.id) + '</button>';
      }).join('') + '</div>');
      h.push(hint('Frais de ' + (D.MARKET_FEE * 100).toFixed(1) + ' % à l’achat comme à la vente. ' +
        'Touchez un actif pour passer un ordre.'));
    }

    if (sub.finance === 'credit') {
      if (s.bank.loan) {
        var l = s.bank.loan;
        h.push(sectionTitle('Crédit en cours'));
        h.push('<div class="panel">' +
          kv('Capital restant dû', eur(l.amount), 'v-bad') +
          kv('Prélèvement quotidien', eur(l.daily)) +
          kv('Échéances manquées', s.bank.missed, s.bank.missed ? 'v-bad' : '') +
          kv('Solde prévu le', 'jour ' + l.due) +
          '</div>');
        h.push('<div class="btnRow"><button class="btn btn--ghost" data-act="repay">Solder par anticipation (' + eur(l.amount) + ')</button></div>');
        h.push(hint('Quatre échéances manquées et la banque se sert sur votre livret, puis liquide votre portefeuille.'));
      } else {
        h.push(sectionTitle('Offres de crédit'));
        h.push(hint('Votre <b>score bancaire</b> (' + Math.round(s.bank.score) + ') monte quand vous travaillez, ' +
          'que vous remboursez et que vous détenez des entreprises. Il chute à chaque impayé.'));
        h.push('<div class="cards">' + D.LOANS.map(function (lo) {
          var lock = G.loanOffer(lo);
          var total = Math.round(lo.amount * Math.pow(1 + (s.flags.goodRate ? lo.rate * 0.5 : lo.rate), lo.days));
          return card({
            ico: lo.ico, title: lo.n, desc: lo.d, accent: 'var(--gold)',
            costs: [cost('+' + eur(lo.amount), 'cost--pay'),
            cost('à rendre ' + eur(total), 'cost--price'),
            cost(lo.days + ' jours', 'cost--time'),
            cost('Score ' + lo.score, 'cost--risk')],
            lock: lock, act: 'loan', arg: lo.id
          });
        }).join('') + '</div>');
      }

      if (S.debtTotal(s)) {
        h.push(sectionTitle('Vos dettes'));
        h.push('<div class="panel">' +
          (s.bank.loan ? kv('🏦 Crédit bancaire', eur(s.bank.loan.amount), 'v-bad') : '') +
          (s.flags.debt ? kv('🧢 Karim (jour ' + s.flags.debtDue + ')', eur(s.flags.debt), 'v-bad') : '') +
          (s.flags.renardDebt ? kv('👩‍🍳 Mme Renard (jour ' + s.flags.renardDue + ')', eur(s.flags.renardDebt), 'v-bad') : '') +
          (s.flags.cardDebt ? kv('🎲 Dette de jeu', eur(s.flags.cardDebt), 'v-bad') : '') +
          '</div>');
      }
    }
    return h.join('');
  }

  /* =========================================================
     Onglet SOCIAL
     ========================================================= */
  function renderSocial() {
    var s = G.s, h = [];
    h.push(hint('Les gens que vous croisez valent plus que l’argent : ils ouvrent des portes qu’aucune somme ne débloque. ' +
      'Une relation <b>se dégrade</b> si vous la négligez, et les factions se surveillent.'));

    if (s.quests.length) {
      h.push(sectionTitle('🎯 Engagements en cours'));
      h.push('<div class="cards">' + s.quests.map(function (aq) {
        var n = D.NPC[aq.npc], q = n.quest;
        var left = aq.due - s.day;
        return '<div class="quest' + (left <= 2 ? ' urgent' : '') + '">' +
          '<div class="quest__hd">' + q.ico + ' <b>' + q.n + '</b><span class="tag">' + left + ' j</span></div>' +
          '<div class="quest__d">' + q.d + '</div>' +
          '<div class="quest__g">Objectif : ' + q.goal + '</div></div>';
      }).join('') + '</div>');
    }

    D.FACTIONS.forEach(function (f) {
      var list = D.NPCS.filter(function (n) { return n.faction === f.id; });
      h.push(sectionTitle(f.ico + ' ' + f.n));
      h.push(hint(f.d));
      h.push('<div class="cards">' + list.map(function (n) {
        var lock = G.npcLock(n);
        if (lock) {
          return '<div class="npc is-locked"><span class="npc__av">❔</span><span class="npc__b">' +
            '<span class="npc__n">Inconnu</span><span class="npc__r">' + esc(lock) + '</span></span></div>';
        }
        var a = Math.round(s.npc[n.id] || 0);
        var rel = D.relation(a);
        var pos = (a + 100) / 2;
        var hasQ = G.hasQuest(n.id);
        return '<button class="npc" data-act="npc" data-arg="' + n.id + '">' +
          '<span class="npc__av">' + n.ico + '</span>' +
          '<span class="npc__b">' +
          '<span class="npc__n">' + n.n + (hasQ ? ' <span class="badge badge--quest">🎯</span>' : '') +
          '<span class="tag" style="color:' + rel.c + '">' + rel.ico + ' ' + a + '</span></span>' +
          '<span class="npc__r">' + n.role + ' · <em style="color:' + rel.c + '">' + rel.n + '</em></span>' +
          '<span class="npc__aff"><span class="npc__zero"></span>' +
          '<span class="npc__affF" style="width:' + pos + '%;background:' + (a < 0 ? 'var(--danger)' : 'linear-gradient(90deg,#f0559b,#f7a1c4)') + '"></span></span>' +
          '</span><span class="card__go">›</span></button>';
      }).join('') + '</div>');
    });
    return h.join('');
  }

  function npcSheet(id) {
    var n = D.NPC[id], s = G.s;
    var aff = Math.round(s.npc[id] || 0);
    var rel = D.relation(aff);
    var idle = s.day - (s.npcMet[id] || 0);

    var body = '<p>' + n.d + '</p>' +
      '<div class="panel mt">' +
      kv('Relation', '<span style="color:' + rel.c + '">' + rel.ico + ' ' + rel.n + '</span>') +
      kv('Affinité', aff + ' / 100') +
      kv('Érosion sans contact', '−' + (n.decay || 0.5) + ' / jour au-delà de 4 jours') +
      kv('Dernier contact', idle > 900 ? 'jamais' : 'il y a ' + idle + ' jour(s)') +
      '</div>';

    var acts = [
      { l: '💬 Discuter', h: '1 h · affinité +' + Math.round(3 + G.lvl('charisme') * 1.2), fn: function () { G.talk(id); } }
    ];
    D.GIFTS.forEach(function (g) {
      acts.push({
        l: '🎁 ' + g.l, h: 'Affinité +' + Math.round(4 + Math.pow(g.amount, 0.45) * 1.6 + G.lvl('charisme') * 0.6),
        locked: s.money < g.amount ? 'Argent insuffisant' : null,
        fn: function () { G.gift(id, g.amount); }
      });
    });
    acts.push({
      l: '🤝 Rendre service', h: '3 h · affinité +' + (12 + G.lvl('charisme')),
      locked: S.hoursLeft(s) < 3 ? 'Pas assez de temps' : null, fn: function () { G.helpNpc(id); }
    });

    n.favors.forEach(function (f) {
      var done = s.flags['fav_' + id + '_' + f.id];
      acts.push({
        l: (f.risky ? '⚠ ' : '⭐ ') + f.n,
        h: done ? 'Déjà obtenu' : f.d + ' · affinité ' + f.aff + ' requise',
        locked: done ? 'Déjà obtenu' : (aff < f.aff ? 'Affinité ' + f.aff + ' requise (vous : ' + aff + ')' : null),
        fn: function () { G.favor(id, f.id); }
      });
    });

    if (aff >= 30) {
      acts.push({
        l: '🔪 Le/la vendre', h: 'Argent immédiat · relation détruite définitivement', risky: true,
        fn: function () {
          UI.modal({
            ico: '🔪', title: 'Trahir ' + n.n + ' ?',
            body: '<p>Vous obtiendrez environ <b>' + eur(aff * 40 + 500) + '</b> d’argent sale. ' +
              'L’affinité tombera à −100, et toute sa faction vous en voudra. C’est irréversible.</p>',
            actions: [
              { l: 'Oui, le/la vendre', h: 'Irréversible', risky: true, fn: function () { G.betray(id); } },
              { l: 'Annuler', h: '', fn: null }
            ]
          });
        }
      });
    }

    acts.push({ l: 'Fermer', h: '', fn: null });
    UI.modal({ ico: n.ico, title: n.n, body: body, actions: acts });
  }

  /* =========================================================
     Onglet SAC
     ========================================================= */
  var CATS = [
    { id: 'food', l: '🍽️ Nourriture' }, { id: 'care', l: '💊 Soins & hygiène' },
    { id: 'tool', l: '🧰 Équipement' }, { id: 'tenue', l: '👔 Tenues' },
    { id: 'transport', l: '🚲 Transport' }, { id: 'tech', l: '📱 Technologie' },
    { id: 'luxe', l: '💎 Patrimoine' }
  ];

  function renderSac() {
    var s = G.s, h = [];
    h.push(subtabs('sac', [{ id: 'shop', l: 'Boutique' }, { id: 'inv', l: 'Inventaire' }, { id: 'home', l: 'Logement' }]));

    if (sub.sac === 'shop') {
      h.push(hint('Votre <b>apparence</b> (' + S.apparence(s) + ' %) combine hygiène, tenue et soin. C’est elle qui ouvre les emplois déclarés.'));
      CATS.forEach(function (c) {
        var items = D.ITEMS.filter(function (i) { return i.cat === c.id && i.shop === 'city'; });
        if (!items.length) return;
        h.push(sectionTitle(c.l));
        h.push(cardsWithLocked(items, function (it) {
          var own = (s.inv[it.id] || 0);
          var lock = G.checkReq(it.req) || (it.keep && own ? 'Déjà possédé' : null) ||
            (s.money < it.price ? 'Il faut ' + eur(it.price) : null);
          return {
            ico: it.ico, title: it.n, desc: it.d, accent: 'var(--gold)',
            costs: [cost(eur(it.price), 'cost--price'),
            it.style ? cost('👔 Style ' + it.style) : null,
            it.use ? cost('Consommable') : cost('Durable')],
            badge: own ? '<span class="badge badge--own">×' + own + '</span>' : '',
            lock: lock, act: 'buy', arg: it.id
          };
        }, 'Hors de prix pour l’instant'));
      });
    }

    if (sub.sac === 'inv') {
      var tenue = S.bestOf(s, 'tenue', 'style'), tr = S.bestOf(s, 'transport', 'speed'), te = S.bestOf(s, 'tech', 'tech');
      h.push(sectionTitle('Équipement porté'));
      h.push('<div class="panel">' +
        kv('👔 Tenue', tenue ? tenue.ico + ' ' + tenue.n : '— guenilles') +
        kv('🚲 Transport', tr ? tr.ico + ' ' + tr.n : '— à pied') +
        kv('📱 Technologie', te ? te.ico + ' ' + te.n : '— aucune') +
        kv('✨ Apparence', S.apparence(s) + ' / 100') +
        (s.flags.groomed > s.day ? kv('💈 Fraîchement coiffé', 'encore ' + (s.flags.groomed - s.day) + ' j', 'v-good') : '') +
        '</div>');
      h.push(hint('Le meilleur objet de chaque catégorie est utilisé automatiquement.'));

      h.push(sectionTitle('Sac'));
      var ids = Object.keys(s.inv).filter(function (k) { return s.inv[k] > 0; });
      if (!ids.length) h.push(empty('🎒', 'Votre sac est vide.'));
      else h.push('<div class="cards">' + ids.map(function (id) {
        var it = D.ITEM[id];
        if (!it) return '';
        return card({
          ico: it.ico, title: it.n + ' <span class="tag">×' + s.inv[id] + '</span>',
          desc: it.use ? 'Utiliser : ' + Object.keys(it.use).map(function (k) {
            return k === 'xp' ? '+' + it.use.xp[1] + ' XP ' + it.use.xp[0] : (it.use[k] > 0 ? '+' : '') + it.use[k] + ' ' + k;
          }).join(', ') : it.d,
          accent: sellMode ? 'var(--gold)' : (it.use ? 'var(--good)' : 'var(--line)'),
          costs: [cost(sellMode ? 'Appuyer pour revendre' : (it.use ? 'Appuyer pour utiliser' : 'Objet durable')),
          cost('Revente : ' + eur(it.price * (it.cat === 'luxe' ? 0.9 : 0.5)), 'cost--price')],
          act: it.use ? 'use' : 'sell', arg: id
        });
      }).join('') + '</div>');
      if (ids.length) h.push('<div class="btnRow"><button class="btn ' + (sellMode ? 'btn--gold' : 'btn--ghost') +
        '" data-act="sellmode">💱 ' + (sellMode ? 'Quitter le mode revente' : 'Mode revente') + '</button></div>');
    }

    if (sub.sac === 'home') {
      var cur = S.home(s);
      h.push(sectionTitle('Logement'));
      h.push('<div class="panel"><div class="panel__hd"><div class="panel__t">' + cur.ico + ' ' + cur.name + '</div>' +
        '<span class="tag">' + (S.rent(s) ? eur(S.rent(s)) + '/nuit' : 'Gratuit') + '</span></div>' +
        kv('Qualité du sommeil', '+' + cur.sleep + ' énergie') +
        kv('Douche', cur.shower ? 'Oui' : 'Non', cur.shower ? 'v-good' : 'v-bad') +
        kv('Adresse administrative', cur.addr ? 'Oui' : 'Non', cur.addr ? 'v-good' : 'v-bad') +
        kv('Risque nocturne', Math.round(cur.risk * 100) + ' %', cur.risk > 0.1 ? 'v-bad' : '') +
        kv('Sécurité des affaires', (cur.safe || 0) + ' / 10') +
        kv('Pression policière retirée / nuit', '−' + (7 + (cur.cool || 0))) +
        '</div>');
      h.push(hint('Sans <b>adresse administrative</b>, aucun employeur ne vous déclarera et aucune banque ne vous ouvrira de compte.'));

      h.push(sectionTitle('Déménager'));
      h.push(cardsWithLocked(D.HOMES, function (hm) {
        if (hm.id === s.home) return null;
        var req = (hm.id === 'squat' && s.flags.squatOk) ? {} : hm.req;
        var dep = s.flags.noDeposit ? 0 : hm.deposit;
        var lock = G.checkReq(req) || (s.money < dep ? 'Caution de ' + eur(dep) : null);
        return {
          ico: hm.ico, title: hm.name, desc: hm.desc, accent: 'var(--info)',
          costs: [cost(hm.rent ? eur(hm.rent) + '/nuit' : 'Sans loyer', 'cost--price'),
          dep ? cost('Caution ' + eur(dep), 'cost--price') : null,
          cost('😴 +' + hm.sleep), hm.addr ? cost('📮 Adresse', 'cost--pay') : null,
          hm.cool ? cost('🫥 Discret +' + hm.cool, 'cost--risk') : null],
          lock: lock, act: 'move', arg: hm.id
        };
      }, 'Hors de portée pour l’instant'));
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
      var t = S.tier(s), nw = S.netWorth(s);
      var next = null;
      for (var i = 0; i < D.TIERS.length; i++) if (D.TIERS[i].min > nw) { next = D.TIERS[i]; break; }

      h.push(sectionTitle('Patrimoine'));
      h.push('<div class="panel">' +
        kv('Palier social', '<span style="color:' + t.c + '">' + t.av + ' ' + t.n + '</span>') +
        kv('Patrimoine net', eur(nw)) +
        kv('💵 Liquide', eur(s.money)) +
        (s.dirty ? kv('🩸 Argent sale (compté à 50 %)', eur(s.dirty), 'v-dirty') : '') +
        (s.bank.open ? kv('🏦 Banque', eur(s.bank.checking + s.bank.savings)) : '') +
        (S.portfolio(s) ? kv('📈 Portefeuille', eur(S.portfolio(s))) : '') +
        kv('🎒 Inventaire', eur(S.invValue(s))) +
        (S.bizValue(s) ? kv('🏢 Entreprises', eur(S.bizValue(s))) : '') +
        (S.debtTotal(s) ? kv('💀 Dettes', '−' + eur(S.debtTotal(s)), 'v-bad') : '') +
        (next ? kv('Palier suivant : ' + next.n, eur(next.min)) : '') +
        '</div>');
      var pctWin = Math.min(100, nw / D.WIN_NET * 100);
      h.push('<div class="panel"><div class="stat__hd"><span>Route vers le million</span><span class="stat__lvl">' +
        pctWin.toFixed(1) + ' %</span></div>' + bar(Math.max(0.5, pctWin)) + '</div>');

      h.push(sectionTitle('Statistiques'));
      h.push('<div class="panel">' + D.STATS.map(function (st) {
        var v = s.stats[st.id];
        var need = D.xpNeeded(v.lvl);
        var pct = v.lvl >= D.MAX_LVL ? 100 : Math.round(v.xp / need * 100);
        return '<div class="stat">' +
          '<div class="stat__hd"><span>' + st.ico + ' ' + st.label + '</span><span class="stat__lvl">NIV ' + v.lvl + '</span></div>' +
          bar(pct) +
          '<div class="stat__xp">' + (v.lvl >= D.MAX_LVL ? 'Maîtrise complète' : v.xp + ' / ' + need + ' XP') + '</div>' +
          '<div class="stat__d">' + st.desc + '</div></div>';
      }).join('') + '</div>');

      h.push(sectionTitle('Réputations'));
      h.push('<div class="panel">' + D.REPS.map(function (r) {
        return '<div class="stat"><div class="stat__hd"><span>' + r.ico + ' ' + r.label + '</span>' +
          '<span class="stat__lvl">' + Math.round(s.rep[r.id]) + '</span></div>' + bar(s.rep[r.id]) +
          '<div class="stat__d">' + r.d + '</div></div>';
      }).join('') + '</div>');

      h.push(sectionTitle('État'));
      h.push('<div class="panel">' +
        kv('🚨 Pression policière', Math.round(s.heat) + ' / 100', s.heat > 45 ? 'v-bad' : '') +
        kv('📕 Casier judiciaire', s.casier + ' mention(s)', s.casier > 3 ? 'v-bad' : '') +
        kv('✨ Apparence', S.apparence(s) + ' / 100') +
        kv('🎓 Formation', D.EDU[s.edu].n +
          (s.filiere ? ' · ' + D.FILIERE[s.filiere].n + (s.filiereLvl ? ' (' + D.FILIERE_TIER[s.filiereLvl - 1] + ')' : '') : '')) +
        (s.flags.addict ? kv('💉 Dépendance', 'niveau ' + s.flags.addict, 'v-bad') : '') +
        (s.flags.dog ? kv('🐕 Compagnon', 'Oui') : '') +
        (s.flags.nopapers ? kv('🪪 Papiers', 'Aucun', 'v-bad') : '') +
        '</div>');

      h.push(sectionTitle('Parcours'));
      h.push('<div class="panel">' +
        kv('Jours vécus', s.day) +
        kv('Nuits passées', s.totals.nights) +
        kv('Actions menées', s.totals.actions) +
        kv('Total gagné', eur(s.totals.earned), 'v-good') +
        kv('Total dépensé', eur(s.totals.spent)) +
        kv('Délits commis', s.totals.crimes) +
        kv('Arrestations', s.totals.arrests, s.totals.arrests ? 'v-bad' : '') +
        kv('Jours de détention', s.totals.jailDays) +
        kv('Argent blanchi', eur(s.totals.laundered)) +
        kv('Origine', (D.ORIGINS.filter(function (o) { return o.id === s.origin; })[0] || {}).n) +
        '</div>');

      h.push(sectionTitle('Partie'));
      h.push('<div class="btnRow"><button class="btn btn--ghost" data-act="save">💾 Sauvegarder</button>' +
        '<button class="btn btn--danger" data-act="reset">🗑️ Nouvelle partie</button></div>');
      h.push(hint('La partie est sauvegardée automatiquement après chaque action, dans votre navigateur.'));
    }

    if (sub.profil === 'log') {
      h.push(sectionTitle('Journal'));
      if (!s.log.length) h.push(empty('📓', 'Rien à raconter pour l’instant.'));
      else h.push('<div class="log">' + s.log.slice(0, 140).map(function (l) {
        if (l.t === 'day') return '<div class="logItem logItem--day">' + l.m + '</div>';
        return '<div class="logItem logItem--' + l.t + '">' +
          '<span class="logItem__t">J' + l.d + ' ' + D.hh(l.h) + '</span>' + l.m + '</div>';
      }).join('') + '</div>');
    }
    return h.join('');
  }

  /* =========================================================
     Rendu global
     ========================================================= */
  var RENDER = {
    survie: renderSurvie, travail: renderTravail, milieu: renderMilieu,
    finance: renderFinance, social: renderSocial, sac: renderSac, profil: renderProfil
  };

  UI.refresh = function () {
    if (!G || !G.s) return;
    renderTop();
    $('screen').innerHTML = RENDER[tab]();
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
      b.classList.toggle('is-active', b.dataset.tab === tab);
    });
  };

  UI.setTab = function (t) { tab = t; sellMode = false; $('screen').scrollTop = 0; UI.refresh(); };

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
  UI.modal = function (o) {
    if (modalOpen) { modalQueue.push(o); return; }
    modalOpen = true;
    $('modalIco').textContent = o.ico || '❓';
    $('modalTitle').textContent = o.title || '';
    $('modalBody').innerHTML = o.body || '';

    var box = $('modalActions');
    box.innerHTML = '';
    (o.actions || []).forEach(function (a) {
      var b = document.createElement('button');
      b.className = 'choice' + (a.locked ? ' is-locked' : '');
      b.innerHTML = '<span class="choice__l">' + a.l + '</span>' +
        (a.h || a.locked ? '<span class="choice__h' + (a.risky ? ' risky' : '') + '">' + (a.locked || a.h) + '</span>' : '');
      b.addEventListener('click', function () {
        if (a.locked) return;
        if (!a.keep) UI.closeModal();
        if (a.fn) a.fn();
      });
      box.appendChild(b);
    });

    $('modal').dataset.dismissible = o.dismissible === false ? '0' : '1';
    $('modal').hidden = false;
    $('modalBox').scrollTop = 0;
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

  /* --- Tombée de la nuit --- */
  UI.nightFall = function () {
    var s = G.s;
    UI.modal({
      ico: '🌙', title: 'Il est 22 heures', dismissible: false,
      body: '<p>La journée est terminée. Vous pouvez aller dormir — ou <em>veiller</em>.</p>' +
        '<p>Veiller ouvre <em>6 heures</em> d’activités nocturnes, souvent bien plus rémunératrices, ' +
        'et pour beaucoup d’entre elles franchement illégales. En contrepartie : ' +
        '<em>−4 énergie</em> et un peu de santé par heure, et un sommeil amputé de <em>6 points de récupération par heure veillée</em>.</p>',
      actions: [
        { l: '😴 Aller dormir', h: 'Récupération maximale', fn: function () { sleepPrompt(false); } },
        { l: '🌃 Veiller', h: 'Débloque la nuit jusqu’à 04 h', risky: true, fn: function () { UI.setTab('survie'); UI.toast('🌙 La nuit commence', 'xp'); } }
      ]
    });
  };

  UI.forceNight = function () { sleepPrompt(true); };

  function sleepPrompt(forced) {
    if (G.s.over) return;
    var s = G.s, h = S.home(s);
    var rent = (s.flags.freeShelter > 0 && h.id === 'shelter') ? 0 : S.rent(s);
    var inc = S.bizIncome(s);
    var nh = S.nightHours(s);
    var q = Math.max(5, h.sleep - nh * 6);
    var acts = [{ l: '😴 Dormir', h: 'Passer au jour ' + (s.day + 1), fn: function () { G.sleep(); } }];
    if (!forced) acts.push({ l: 'Rester éveillé', h: '', fn: null });

    UI.modal({
      ico: '🌙', title: forced ? 'Le jour se lève' : 'Terminer la journée',
      dismissible: !forced,
      body: (forced ? '<p>Il est 4 heures du matin. Vous ne tenez plus debout.</p>' : '') +
        '<p>Vous vous installez pour la nuit : <em>' + h.ico + ' ' + h.name + '</em>.</p>' +
        '<div class="panel mt">' +
        kv('Loyer à payer', rent ? eur(rent) : 'Aucun', rent > s.money + s.bank.checking ? 'v-bad' : '') +
        (rent > s.money + s.bank.checking ? kv('⚠️ Conséquence', 'Expulsion vers la rue', 'v-bad') : '') +
        (inc ? kv('Revenus d’entreprise', '+' + eur(inc), 'v-good') : '') +
        (S.bizDirtyIncome(s) ? kv('Revenus du réseau', '+' + eur(S.bizDirtyIncome(s)) + ' sale', 'v-dirty') : '') +
        (s.bank.savings ? kv('Intérêts du livret', '+' + eur(s.bank.savings * D.BANK.savingsRate), 'v-good') : '') +
        (s.bank.loan ? kv('Échéance de crédit', '−' + eur(s.bank.loan.daily), 'v-bad') : '') +
        kv('Énergie récupérée', '≈ +' + q + (nh ? ' (−' + nh * 6 + ' pour la nuit blanche)' : '')) +
        kv('Risque nocturne', Math.round(h.risk * 100) + ' %', h.risk > 0.1 ? 'v-bad' : '') +
        kv('Pression policière retirée', '−' + (7 + (h.cool || 0) + (s.flags.ghost ? 5 : 0))) +
        '</div>' +
        (!forced && S.hoursLeft(s) > 3 ? '<p class="hint mt">Il vous reste encore <b>' + S.hoursLeft(s) + ' heures</b> utilisables.</p>' : ''),
      actions: acts
    });
  }

  /* --- Prison --- */
  UI.jailScreen = function (days, reason) {
    UI.modal({
      ico: '⛓️', title: 'Condamné', dismissible: false,
      body: '<p>Le tribunal retient : <em>' + reason + '</em>.</p>' +
        '<p>La peine est de <em>' + days + ' jours</em> fermes. Vous perdez votre emploi, ' +
        'votre argent liquide non déclaré a été saisi, et vos affaires continueront sans vous — au ralenti.</p>' +
        '<p>Vous ressortirez plus respecté dans le milieu, et beaucoup moins ailleurs.</p>',
      actions: [{ l: 'Purger la peine', h: days + ' jours passent', fn: function () { G.serveJail(); } }]
    });
  };

  /* --- Quête --- */
  UI.questOffer = function (n, q, due) {
    UI.modal({
      ico: q.ico, title: q.n,
      body: '<p><b>' + n.ico + ' ' + n.n + '</b> vous demande quelque chose.</p><p>' + q.d + '</p>' +
        '<div class="panel mt">' + kv('Objectif', q.goal) + kv('Échéance', 'jour ' + due) + '</div>',
      actions: [{ l: 'Compris', h: 'L’engagement est pris', fn: function () { UI.refresh(); } }]
    });
  };

  /* --- Jalon --- */
  UI.milestone = function (title, text) {
    UI.modal({ ico: '🏆', title: title, body: '<p>' + text + '</p>', actions: [{ l: 'Continuer', h: '', fn: null }] });
  };

  /* --- Fin de partie --- */
  UI.gameOver = function () {
    var o = G.s.over, s = G.s;
    UI.modal({
      ico: o.ico, title: o.title, dismissible: false,
      body: '<p>' + o.text + '</p><div class="panel mt">' +
        kv('Jours vécus', s.day) +
        kv('Patrimoine final', eur(S.netWorth(s))) +
        kv('Palier atteint', S.tier(s).n) +
        kv('Total gagné', eur(s.totals.earned)) +
        kv('Délits commis', s.totals.crimes) +
        kv('Jours de détention', s.totals.jailDays) +
        kv('Formation', D.EDU[s.edu].n + (s.filiere ? ' · ' + D.FILIERE[s.filiere].n : '')) +
        '</div>',
      actions: [{ l: '🔄 Recommencer une vie', h: 'Repartir de zéro', fn: function () { NS.MAIN.reset(); } }]
    });
  };

  /* =========================================================
     Fiche détaillée d'une action (appui long)
     ========================================================= */
  function rangeLine(st) {
    if (Math.abs(st.min) < 1 && Math.abs(st.max) < 1) return '—';
    if (Math.round(st.min) === Math.round(st.max)) return eur(st.avg);
    return eur(st.min) + ' → ' + eur(st.max) + ' <em>(moy. ' + eur(st.avg) + ')</em>';
  }

  function detailBody(meta, r) {
    var h = [];
    h.push('<p>' + meta.d + '</p>');

    h.push('<div class="panel mt"><div class="panel__t">💰 Résultat financier</div>' +
      (r.money.max !== 0 || r.money.min !== 0 ? kv('Argent propre', rangeLine(r.money), r.money.avg >= 0 ? 'v-good' : 'v-bad') : '') +
      (r.dirty.max !== 0 || r.dirty.min !== 0 ? kv('Argent sale', rangeLine(r.dirty), 'v-dirty') : '') +
      kv('Espérance de gain', eur(r.gain.avg), r.gain.avg >= 0 ? 'v-good' : 'v-bad') +
      (r.hours ? kv('Rendement horaire', eur(r.gain.avg / r.hours) + ' / h') : '') +
      kv('Taux de réussite', Math.round(r.success) + ' %', r.success > 60 ? 'v-good' : 'v-bad') +
      '</div>');

    var gl = D.GAUGES.filter(function (g) { return Math.abs(r.gauges[g.id]) >= 0.4; });
    if (gl.length || r.heat) {
      h.push('<div class="panel"><div class="panel__t">⚖️ Effets moyens</div>' +
        (r.hours ? kv('⏱ Durée', r.hours + ' h') : '') +
        gl.map(function (g) {
          return kv(g.ico + ' ' + g.label, pm(r.gauges[g.id]), r.gauges[g.id] >= 0 ? 'v-good' : 'v-bad');
        }).join('') +
        (Math.abs(r.heat) >= 0.4 ? kv('🚨 Pression policière', pm(r.heat), r.heat > 0 ? 'v-bad' : 'v-good') : '') +
        '</div>');
    }

    var xps = D.STATS.filter(function (s) { return r.xp[s.id] >= 0.5; });
    var reps = D.REPS.filter(function (rp) { return Math.abs(r.rep[rp.id]) >= 0.2; });
    if (xps.length || reps.length) {
      h.push('<div class="panel"><div class="panel__t">📚 Progression</div>' +
        xps.map(function (s) { return kv(s.ico + ' XP ' + s.label, '+' + Math.round(r.xp[s.id])); }).join('') +
        reps.map(function (rp) { return kv(rp.ico + ' Réputation ' + rp.label, pm(r.rep[rp.id]), r.rep[rp.id] >= 0 ? 'v-good' : 'v-bad'); }).join('') +
        '</div>');
    }

    if (r.arrest > 0.5) {
      h.push('<div class="panel panel--danger"><div class="panel__t">🚔 Exposition pénale</div>' +
        kv('Risque de contrôle policier', Math.round(r.arrest) + ' % par tentative', 'v-bad') +
        (r.sentence ? kv('Peine encourue', r.sentence + ' jours × ' + (1 + G.s.casier * 0.14).toFixed(2) + ' (casier) = ' +
          Math.round(r.sentence * (1 + G.s.casier * 0.14) * (G.s.flags.lawyer ? 0.6 : 1)) + ' j', 'v-bad') : '') +
        kv('Probabilité d’incarcération', Math.round(r.jail) + ' %', 'v-bad') +
        '</div>');
    }

    if (r.items && r.items.length) {
      h.push('<div class="panel"><div class="panel__t">🎒 Objets</div>' +
        r.items.slice(0, 6).map(function (it) {
          var d = D.ITEM[it.id];
          return kv((it.neg ? '− ' : '+ ') + d.ico + ' ' + d.n, Math.round(it.pct) + ' % des tentatives', it.neg ? 'v-bad' : 'v-good');
        }).join('') + '</div>');
    }

    if (r.sens) {
      var lines = D.STATS.filter(function (s) { return r.sens[s.id]; }).map(function (s) {
        var v = r.sens[s.id];
        var strong = Math.abs(v.money) >= Math.max(3, Math.abs(r.gain.avg) * 0.04);
        return kv(s.ico + ' ' + s.label + ' niveau +1',
          (v.money >= 0 ? '+' : '') + eur(v.money) + (strong ? '' : ' <em>(négligeable)</em>'),
          strong && v.money > 0 ? 'v-good' : '');
      });
      if (lines.length) {
        h.push('<div class="panel"><div class="panel__t">🔍 Statistiques cachées</div>' +
          '<p class="hint" style="margin:0 0 6px">Ce que rapporterait un niveau supplémentaire, toutes choses égales par ailleurs.</p>' +
          lines.join('') + '</div>');
      }
    }

    if (r.periods && Object.keys(r.periods).length > 1) {
      var vals = Object.keys(r.periods).map(function (k) { return r.periods[k]; });
      var spread = Math.max.apply(null, vals) - Math.min.apply(null, vals);
      if (spread > Math.max(2, Math.abs(r.gain.avg) * 0.08)) {
        h.push('<div class="panel"><div class="panel__t">🕐 Meilleur moment</div>' +
          Object.keys(r.periods).map(function (k) {
            var best = r.periods[k] >= Math.max.apply(null, vals) - 0.01;
            return kv(D.PERIOD_LABEL[k], eur(r.periods[k]), best ? 'v-good' : '');
          }).join('') + '</div>');
      }
    }

    h.push('<p class="hint mt">Estimations obtenues en rejouant l’action ' + r.n +
      ' fois sur une copie de votre situation actuelle. Elles évoluent avec vos statistiques, votre état et votre équipement.</p>');
    return h.join('');
  }

  function openDetail(spec) {
    var p = spec.split(':'), kind = p[0], id = p[1];
    var meta, r, title, ico;
    try {
      if (kind === 'action') { meta = D.ACTION[id]; r = NS.PROBE.action(meta); title = meta.n; ico = meta.ico; }
      else if (kind === 'crime') { meta = D.CRIME[id]; r = NS.PROBE.crime(meta); title = meta.n; ico = meta.ico; }
      else if (kind === 'gig') { meta = D.GIG[id]; r = NS.PROBE.gig(meta); title = meta.n; ico = meta.ico; }
      else if (kind === 'shift') { meta = D.JOB[id]; r = NS.PROBE.shift(meta, G.s.job ? G.s.job.shifts : 0); title = meta.n + ' — un quart'; ico = meta.ico; }
      else if (kind === 'job') { return openJobDetail(D.JOB[id]); }
      else return;
    } catch (e) {
      UI.toast('Détail indisponible', 'bad');
      return;
    }
    var lock = G.canDo(meta);
    UI.modal({
      ico: ico, title: title,
      body: detailBody(meta, r) + (lock ? '<p class="hint" style="color:var(--danger)">🔒 ' + esc(lock) + '</p>' : ''),
      actions: [{ l: 'Fermer', h: '', fn: null }]
    });
  }

  function openJobDetail(j) {
    var p = NS.PROBE.apply(j);
    var max = j.casierMax === undefined ? 99 : j.casierMax;
    var r = NS.PROBE.shift(j, 0);
    UI.modal({
      ico: j.ico, title: j.n,
      body: '<p>' + j.d + '</p>' +
        '<div class="panel mt"><div class="panel__t">🤝 Candidature</div>' +
        kv('Chances d’embauche', Math.round(p) + ' %', p > 55 ? 'v-good' : 'v-bad') +
        kv('Coût de l’entretien', '2 h · ⚡ −8') +
        kv('Casier toléré', max >= 99 ? 'aucune limite' : max + ' mention(s)', G.s.casier > max ? 'v-bad' : '') +
        kv('Apparence exigée', (j.req.app || 0) + ' % (vous : ' + S.apparence(G.s) + ' %)') +
        (G.s.flags.coached > G.s.day ? kv('Accompagnement en cours', '+18 %', 'v-good') : '') +
        '</div>' + detailBody(j, r),
      actions: [{ l: 'Fermer', h: '', fn: null }]
    });
  }

  /* =========================================================
     Ordres de bourse
     ========================================================= */
  function assetSheet(id) {
    var a = D.ASSET[id], s = G.s;
    var px = s.market.px[id], qty = s.market.hold[id] || 0;
    var val = qty * px, cost0 = s.market.cost[id] || 0;
    var hist = s.market.hist[id] || [];
    var d7 = hist.length > 7 ? (px / hist[hist.length - 8] - 1) * 100 : 0;

    var body = '<p>' + a.d + '</p>' +
      '<div class="panel mt">' +
      kv('Cours', eur(px)) +
      kv('Variation de la nuit', ((s.market.lastMove[id] || 0) * 100).toFixed(1) + ' %', (s.market.lastMove[id] || 0) >= 0 ? 'v-good' : 'v-bad') +
      kv('Sur 7 jours', d7.toFixed(1) + ' %', d7 >= 0 ? 'v-good' : 'v-bad') +
      kv('Volatilité', a.vol >= 0.06 ? 'Très élevée' : (a.vol >= 0.03 ? 'Élevée' : (a.vol >= 0.015 ? 'Modérée' : 'Faible'))) +
      (s.flags.marketRead ? kv('Dérive annoncée', (a.drift * 100).toFixed(2) + ' % / jour') : '') +
      (qty ? kv('Votre position', eur(val) + ' (' + (val - cost0 >= 0 ? '+' : '') + eur(val - cost0) + ')', val - cost0 >= 0 ? 'v-good' : 'v-bad') : '') +
      kv('Liquidités disponibles', eur(s.bank.checking)) +
      '</div>';

    var acts = [];
    [0.25, 0.5, 1].forEach(function (r) {
      var amt = Math.floor(s.bank.checking * r);
      acts.push({
        l: '📈 Acheter ' + (r === 1 ? 'tout' : Math.round(r * 100) + ' %') + ' (' + eur(amt) + ')',
        h: '≈ ' + (amt / px).toFixed(2) + ' parts',
        locked: amt < 10 ? 'Liquidités insuffisantes' : null,
        fn: function () { G.buyAsset(id, amt); }
      });
    });
    if (qty > 0) {
      acts.push({ l: '📉 Vendre la moitié', h: '≈ ' + eur(val * 0.5 * (1 - D.MARKET_FEE)), fn: function () { G.sellAsset(id, 0.5); } });
      acts.push({ l: '📉 Tout vendre', h: '≈ ' + eur(val * (1 - D.MARKET_FEE)), fn: function () { G.sellAsset(id, 1); } });
    }
    acts.push({ l: 'Fermer', h: '', fn: null });
    UI.modal({ ico: a.ico, title: a.n, body: body, actions: acts });
  }

  /* =========================================================
     Interactions
     ========================================================= */
  function amountPrompt(title, max, fn) {
    var acts = [0.25, 0.5, 1].map(function (r) {
      var v = Math.floor(max * r);
      return { l: eur(v), h: r === 1 ? 'Tout' : Math.round(r * 100) + ' %', locked: v < 1 ? 'Rien à transférer' : null, fn: function () { fn(v); } };
    });
    acts.push({ l: 'Annuler', h: '', fn: null });
    UI.modal({ ico: '🏦', title: title, body: '<p>Disponible : <b>' + eur(max) + '</b></p>', actions: acts });
  }

  var HANDLERS = {
    action: function (arg) { G.doAction(arg); },
    crime: function (arg) { G.doCrime(arg); },
    gig: function (arg) { G.doGig(arg); },
    shift: function () { G.doShift(); },
    apply: function (arg) { G.applyJob(arg); },
    quit: function () { G.quitJob(); },
    study: function () { G.study(); },
    sitedu: function () { G.sitEduExam(); },
    studyfil: function () { G.studyFiliere(); },
    sitfil: function () { G.sitFiliereExam(); },
    pickfiliere: function (arg) {
      var f = D.FILIERE[arg];
      UI.modal({
        ico: f.ico, title: 'Choisir ' + f.n + ' ?',
        body: '<p>' + f.d + '</p><p>Ce choix est <b>définitif</b> : impossible de changer de filière ensuite.</p>',
        actions: [
          { l: 'Oui, m’engager', h: 'Irréversible', risky: true, fn: function () { G.chooseFiliere(arg); } },
          { l: 'Annuler', h: '', fn: null }
        ]
      });
    },
    bizbuy: function (arg) { G.buyBiz(arg); },
    bizup: function (arg) { G.upgradeBiz(arg); },
    bizsell: function () {
      var acts = G.s.biz.map(function (b) {
        var d = D.BIZI[b.id];
        return { l: d.ico + ' ' + d.n, h: 'Céder pour ' + eur(d.cost * b.lvl * 0.7), fn: function () { G.sellBiz(b.id); } };
      });
      acts.push({ l: 'Annuler', h: '', fn: null });
      UI.modal({ ico: '💱', title: 'Céder une entreprise', body: '<p>La cession rapporte 70 % du coût cumulé.</p>', actions: acts });
    },
    buy: function (arg) { G.buyItem(arg, false); },
    buystreet: function (arg) {
      var it = D.ITEM[arg];
      if (G.s.dirty >= it.price && G.s.money >= it.price) {
        UI.modal({
          ico: it.ico, title: it.n,
          body: '<p>Avec quel argent voulez-vous payer ' + eur(it.price) + ' ?</p>',
          actions: [
            { l: '🩸 Argent sale', h: 'Vous en avez ' + eur(G.s.dirty), fn: function () { G.buyItem(arg, true); } },
            { l: '💵 Argent propre', h: 'Vous en avez ' + eur(G.s.money), fn: function () { G.buyItem(arg, false); } },
            { l: 'Annuler', h: '', fn: null }
          ]
        });
      } else G.buyItem(arg, G.s.dirty >= it.price);
    },
    use: function (arg) { sellMode ? G.sellItem(arg) : G.useItem(arg); },
    sell: function (arg) { G.sellItem(arg); },
    sellmode: function () { sellMode = !sellMode; UI.refresh(); },
    move: function (arg) { G.moveHome(arg); },
    npc: function (arg) { npcSheet(arg); },
    asset: function (arg) { assetSheet(arg); },
    openbank: function () { G.openBank(false); },
    deposit: function () { G.deposit(G.s.money); },
    withdraw: function (arg) { G.withdraw(Math.min(parseInt(arg, 10) || 0, G.s.bank.checking)); },
    tosave: function () { G.toSavings(G.s.bank.checking); },
    fromsave: function () { G.fromSavings(G.s.bank.savings); },
    loan: function (arg) { G.takeLoan(arg); },
    repay: function () { G.repayLoan(); },
    launder: function (arg) {
      var m = D.LAUNDER.filter(function (x) { return x.id === arg; })[0];
      var max = Math.min(G.s.dirty, G.launderCap(m));
      amountPrompt('Blanchir via ' + m.n, max, function (v) { G.launder(arg, v); });
    },
    gaugeinfo: function (arg) {
      var g = D.GAUGES.filter(function (x) { return x.id === arg; })[0];
      UI.modal({ ico: g.ico, title: g.label, body: '<p>' + g.d + '</p><div class="panel mt">' + kv('Niveau actuel', Math.round(G.s.gauges[arg]) + ' / 100') + '</div>', actions: [{ l: 'Fermer', h: '', fn: null }] });
    },
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

  /* --------- appui long --------- */
  var pressTimer = null, pressed = null, suppressClick = false, startXY = null;

  function clearPress() {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    if (pressed) { pressed.classList.remove('is-pressing'); pressed = null; }
  }

  UI.init = function (engine) {
    G = engine;
    var screen = $('screen');

    screen.addEventListener('pointerdown', function (ev) {
      var el = ev.target.closest('[data-detail]');
      if (!el) return;
      startXY = [ev.clientX, ev.clientY];
      pressed = el;
      el.classList.add('is-pressing');
      pressTimer = setTimeout(function () {
        var spec = el.dataset.detail;
        clearPress();
        suppressClick = true;
        if (navigator.vibrate) navigator.vibrate(12);
        openDetail(spec);
      }, 480);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) {
      screen.addEventListener(t, clearPress);
    });
    screen.addEventListener('pointermove', function (ev) {
      if (!startXY || !pressed) return;
      if (Math.abs(ev.clientX - startXY[0]) > 10 || Math.abs(ev.clientY - startXY[1]) > 10) clearPress();
    });
    screen.addEventListener('contextmenu', function (ev) {
      var el = ev.target.closest('[data-detail]');
      if (!el) return;
      ev.preventDefault();
      clearPress();
      openDetail(el.dataset.detail);
    });

    screen.addEventListener('click', function (ev) {
      if (suppressClick) { suppressClick = false; return; }
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
