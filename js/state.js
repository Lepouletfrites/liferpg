/* =============================================================
   state.js — État de la partie, persistance, valeurs dérivées.
   ============================================================= */
(function (NS) {
  'use strict';

  var D = NS.D;
  var KEY = 'liferpg.save.v3';
  var VERSION = 3;
  var S = {};

  /* --------------------- création --------------------- */
  S.create = function (name, originId) {
    var st = {
      v: VERSION,
      name: name || 'Inconnu',
      origin: originId || 'expulse',
      day: 1,
      hour: D.DAY_START,
      awakeSince: null,     // heure à laquelle la nuit blanche a commencé
      money: 0,
      dirty: 0,             // argent sale (non déclarable)
      heat: 0,
      casier: 0,            // mentions au casier judiciaire
      jail: null,           // { days, reason } pendant une incarcération
      home: 'street',
      job: null,            // { id, shifts }
      edu: 0,
      eduProg: 0,
      filiere: null,        // id de la filière post-bac choisie (définitif)
      filiereLvl: 0,        // 0-3 : niveaux validés dans cette filière
      filiereProg: 0,       // séances accumulées vers le niveau suivant
      examStreak: {},       // { clé: échecs consécutifs } — booste la chance à chaque échec
      shopHeat: {},         // vigilance accumulée par commerce après un vol
      crimeLast: {},        // dernier jour où chaque coup a été tenté (récidive)
      biz: [],              // [{ id, lvl }]
      bank: {
        open: false, checking: 0, savings: 0, score: 20,
        loan: null,         // { id, amount, rate, daily, due }
        missed: 0
      },
      market: {
        started: false, regime: 'calme', regimeLeft: 6,
        px: {}, hist: {}, hold: {}, cost: {}, tip: null, lastMove: {}
      },
      gauges: { faim: 55, energie: 80, moral: 50, hygiene: 45, sante: 80 },
      stats: {
        charisme: { lvl: 1, xp: 0 },
        intelligence: { lvl: 1, xp: 0 },
        force: { lvl: 1, xp: 0 },
        discretion: { lvl: 1, xp: 0 }
      },
      rep: { rue: 5, legale: 5, pegre: 0 },
      inv: {},
      npc: {},
      npcMet: {},           // dernier jour de contact
      quests: [],           // [{ npc, id, due }]
      flags: {},
      log: [],
      seen: {},             // événements uniques déjà vus
      pending: [],          // [{ id, day }] événements différés
      hist: {},             // compteurs de comportement
      milestones: {},
      totals: { earned: 0, spent: 0, actions: 0, nights: 0, arrests: 0, jailDays: 0, crimes: 0, laundered: 0 },
      over: null
    };

    D.NPCS.forEach(function (n) { st.npc[n.id] = 0; });
    D.ASSETS.forEach(function (a) { st.market.px[a.id] = a.start; st.market.hist[a.id] = [a.start]; });

    var org = D.ORIGINS.filter(function (o) { return o.id === originId; })[0] || D.ORIGINS[0];
    org.apply(st);
    S.syncLevels(st);
    return st;
  };

  S.syncLevels = function (st) {
    Object.keys(st.stats).forEach(function (k) {
      var s = st.stats[k];
      while (s.lvl < D.MAX_LVL && s.xp >= D.xpNeeded(s.lvl)) {
        s.xp -= D.xpNeeded(s.lvl);
        s.lvl++;
      }
    });
  };

  /* --------------------- persistance --------------------- */
  S.save = function (st) {
    try { localStorage.setItem(KEY, JSON.stringify(st)); return true; }
    catch (e) { console.warn('Sauvegarde impossible', e); return false; }
  };

  S.load = function () {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var st = JSON.parse(raw);
      if (!st || st.v !== VERSION) return null;
      return S.repair(st);
    } catch (e) { return null; }
  };

  /** Complète une sauvegarde partielle (contenu ajouté entre deux versions) */
  S.repair = function (st) {
    var fresh = S.create(st.name, st.origin);
    Object.keys(fresh).forEach(function (k) {
      if (st[k] === undefined || st[k] === null && fresh[k] !== null) st[k] = fresh[k];
    });
    D.NPCS.forEach(function (n) { if (typeof st.npc[n.id] !== 'number') st.npc[n.id] = 0; });
    D.STAT_IDS.forEach(function (id) { if (!st.stats[id]) st.stats[id] = { lvl: 1, xp: 0 }; });
    ['rue', 'legale', 'pegre'].forEach(function (r) { if (typeof st.rep[r] !== 'number') st.rep[r] = 0; });
    D.ASSETS.forEach(function (a) {
      if (typeof st.market.px[a.id] !== 'number') { st.market.px[a.id] = a.start; st.market.hist[a.id] = [a.start]; }
    });
    if (!st.hist) st.hist = {};
    if (!st.pending) st.pending = [];
    if (!st.quests) st.quests = [];
    if (!st.npcMet) st.npcMet = {};
    if (!st.shopHeat) st.shopHeat = {};
    if (!st.crimeLast) st.crimeLast = {};
    return st;
  };

  S.hasSave = function () { return !!localStorage.getItem(KEY); };
  S.wipe = function () { try { localStorage.removeItem(KEY); } catch (e) {} };

  /* --------------------- temps --------------------- */
  S.period = function (st) {
    var h = st.hour;
    var p = D.PERIODS[0];
    for (var i = 0; i < D.PERIODS.length; i++) if (h >= D.PERIODS[i].from) p = D.PERIODS[i];
    return p;
  };
  S.isNight = function (st) { return st.hour >= D.DAY_END; };
  /** Heures encore utilisables (jusqu'à 22h, ou jusqu'à 04h une fois la nuit entamée) */
  S.hoursLeft = function (st) {
    var end = S.isNight(st) ? D.NIGHT_END : D.DAY_END;
    return Math.max(0, end - st.hour);
  };
  /** Heures de nuit blanche déjà consommées */
  S.nightHours = function (st) { return Math.max(0, st.hour - D.DAY_END); };

  /* --------------------- dérivés --------------------- */
  S.home = function (st) { return D.HOME[st.home] || D.HOMES[0]; };

  S.homeIdx = function (st) {
    for (var i = 0; i < D.HOMES.length; i++) if (D.HOMES[i].id === st.home) return i;
    return 0;
  };

  S.rent = function (st) {
    var r = S.home(st).rent;
    if (st.flags.rentCut) r = Math.round(r * 0.7);
    return r;
  };

  S.bestOf = function (st, cat, key) {
    var best = null;
    Object.keys(st.inv).forEach(function (id) {
      if (!st.inv[id]) return;
      var it = D.ITEM[id];
      if (!it || it.cat !== cat) return;
      if (!best || (it[key] || 0) > (best[key] || 0)) best = it;
    });
    return best;
  };

  /** Apparence (0-100) : hygiène + tenue + soin + accessoires */
  S.apparence = function (st) {
    var tenue = S.bestOf(st, 'tenue', 'style');
    var style = tenue ? tenue.style : 0;
    var lux = 0;
    if (st.inv.montre) lux += 6;
    if (st.inv.bijou) lux += 4;
    if (st.inv.art) lux += 2;
    if (st.inv.rasoir) lux += 3;
    if (st.flags.groomed > st.day) lux += 8;
    var v = st.gauges.hygiene * 0.55 + style * 0.45 + lux;
    if (st.gauges.sante < 30) v -= 8;
    return Math.max(0, Math.min(100, Math.round(v)));
  };

  S.invValue = function (st) {
    var v = 0;
    Object.keys(st.inv).forEach(function (id) {
      var it = D.ITEM[id];
      if (it && st.inv[id] > 0) v += it.price * st.inv[id] * (it.cat === 'luxe' ? 0.9 : 0.5);
    });
    return Math.round(v);
  };

  S.bizValue = function (st) {
    var v = 0;
    st.biz.forEach(function (b) {
      var d = D.BIZI[b.id];
      if (d) v += d.cost * b.lvl * 0.85;
    });
    return Math.round(v);
  };

  /** Valeur du portefeuille boursier */
  S.portfolio = function (st) {
    var v = 0;
    Object.keys(st.market.hold || {}).forEach(function (id) {
      var q = st.market.hold[id] || 0;
      if (q > 0) v += q * (st.market.px[id] || 0);
    });
    return Math.round(v);
  };

  /** Argent réellement mobilisable pour un achat : liquide + compte courant */
  S.spendable = function (st) {
    return st.money + (st.bank && st.bank.open ? st.bank.checking : 0);
  };

  S.debtTotal = function (st) {
    var d = 0;
    if (st.flags.debt) d += st.flags.debt;
    if (st.flags.renardDebt) d += st.flags.renardDebt;
    if (st.flags.cardDebt) d += st.flags.cardDebt;
    if (st.bank && st.bank.loan) d += st.bank.loan.amount;
    return Math.round(d);
  };

  /** Patrimoine net — l'argent sale ne compte qu'à moitié (invendable au grand jour) */
  S.netWorth = function (st) {
    return Math.round(
      st.money + st.dirty * 0.5 +
      (st.bank ? st.bank.checking + st.bank.savings : 0) +
      S.portfolio(st) + S.invValue(st) + S.bizValue(st) - S.debtTotal(st)
    );
  };

  S.tier = function (st) {
    var nw = S.netWorth(st);
    var t = D.TIERS[0];
    for (var i = 0; i < D.TIERS.length; i++) if (nw >= D.TIERS[i].min) t = D.TIERS[i];
    return t;
  };

  /** Multiplicateur de rendement des entreprises */
  S.bizMult = function (st) {
    var m = 1 + st.stats.intelligence.lvl * 0.055 + st.stats.charisme.lvl * 0.035 + st.rep.legale * 0.0035;
    if (st.flags.network) m *= 1.3;
    return m;
  };

  S.bizIncome = function (st) {
    var total = 0, mult = S.bizMult(st);
    st.biz.forEach(function (b) {
      var d = D.BIZI[b.id];
      if (d && d.legal !== false) total += d.rev * b.lvl * mult;
    });
    return Math.round(total);
  };

  /** Revenu sale quotidien (activités de couverture) */
  S.bizDirtyIncome = function (st) {
    var total = 0, mult = S.bizMult(st);
    st.biz.forEach(function (b) {
      var d = D.BIZI[b.id];
      if (d && d.legal === false) total += d.rev * b.lvl * mult;
    });
    return Math.round(total);
  };

  /** Capacité quotidienne de blanchiment offerte par les entreprises */
  S.washCap = function (st) {
    var c = 0;
    st.biz.forEach(function (b) {
      var d = D.BIZI[b.id];
      if (d && d.wash) c += d.wash * b.lvl;
    });
    return c;
  };

  S.maxBizLvl = function (st) {
    var m = 0;
    st.biz.forEach(function (b) { if (b.lvl > m) m = b.lvl; });
    return m;
  };

  NS.S = S;
})(window.LifeRPG);
