/* =============================================================
   state.js — État de la partie, persistance localStorage,
              valeurs dérivées (apparence, patrimoine, palier…)
   ============================================================= */
(function (NS) {
  'use strict';

  var D = NS.D;
  var KEY = 'liferpg.save.v1';
  var S = {};

  /* --------------------- création --------------------- */
  S.create = function (name, originId) {
    var st = {
      v: 1,
      name: name || 'Inconnu',
      origin: originId || 'expulse',
      day: 1,
      hour: D.DAY_START,
      money: 0,
      heat: 0,
      home: 'street',
      job: null,          // { id, shifts }
      edu: 0,
      eduProg: 0,
      biz: [],            // [{ id, lvl }]
      gauges: { faim: 55, energie: 80, moral: 50, hygiene: 45, sante: 80 },
      stats: {
        charisme: { lvl: 1, xp: 0 },
        intelligence: { lvl: 1, xp: 0 },
        force: { lvl: 1, xp: 0 }
      },
      rep: { rue: 5, legale: 5 },
      inv: {},
      npc: {},
      flags: {},
      log: [],
      seen: {},           // événements déjà vus (uniques)
      milestones: {},
      totals: { earned: 0, spent: 0, actions: 0, nights: 0, arrests: 0 },
      over: null          // { type, title, text }
    };
    D.NPCS.forEach(function (n) { st.npc[n.id] = 0; });

    var org = D.ORIGINS.filter(function (o) { return o.id === originId; })[0] || D.ORIGINS[0];
    org.apply(st);
    S.syncLevels(st);
    return st;
  };

  /* Recalcule les niveaux après attribution d'XP de départ */
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
    try {
      localStorage.setItem(KEY, JSON.stringify(st));
      return true;
    } catch (e) {
      console.warn('Sauvegarde impossible', e);
      return false;
    }
  };

  S.load = function () {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var st = JSON.parse(raw);
      if (!st || st.v !== 1) return null;
      // garde-fous sur les saves partielles
      D.NPCS.forEach(function (n) { if (typeof st.npc[n.id] !== 'number') st.npc[n.id] = 0; });
      if (!st.totals) st.totals = { earned: 0, spent: 0, actions: 0, nights: 0, arrests: 0 };
      if (!st.milestones) st.milestones = {};
      if (!st.seen) st.seen = {};
      return st;
    } catch (e) {
      return null;
    }
  };

  S.hasSave = function () { return !!localStorage.getItem(KEY); };
  S.wipe = function () { try { localStorage.removeItem(KEY); } catch (e) {} };

  /* --------------------- dérivés --------------------- */

  /** Logement courant (objet D.HOMES) */
  S.home = function (st) {
    return D.HOMES.filter(function (h) { return h.id === st.home; })[0] || D.HOMES[0];
  };

  /** Index de confort du logement */
  S.homeIdx = function (st) {
    for (var i = 0; i < D.HOMES.length; i++) if (D.HOMES[i].id === st.home) return i;
    return 0;
  };

  /** Meilleure tenue possédée */
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

  /**
   * Apparence (0-100) — jauge dérivée :
   * 55% hygiène + 45% qualité de la tenue, bonus léger des accessoires de luxe.
   */
  S.apparence = function (st) {
    var tenue = S.bestOf(st, 'tenue', 'style');
    var style = tenue ? tenue.style : 0;
    var lux = 0;
    if (st.inv.montre) lux += 6;
    if (st.inv.art) lux += 2;
    var v = st.gauges.hygiene * 0.55 + style * 0.45 + lux;
    return Math.max(0, Math.min(100, Math.round(v)));
  };

  /** Valeur de revente de l'inventaire (50% du prix) */
  S.invValue = function (st) {
    var v = 0;
    Object.keys(st.inv).forEach(function (id) {
      var it = D.ITEM[id];
      if (it && st.inv[id] > 0) v += it.price * st.inv[id] * (it.cat === 'luxe' ? 0.9 : 0.5);
    });
    return Math.round(v);
  };

  /** Valeur des entreprises (coût cumulé investi) */
  S.bizValue = function (st) {
    var v = 0;
    st.biz.forEach(function (b) {
      var d = D.BIZI[b.id];
      if (d) v += d.cost * b.lvl * 0.85;
    });
    return Math.round(v);
  };

  /** Patrimoine net */
  S.netWorth = function (st) {
    var debt = st.flags.debt || 0;
    return Math.round(st.money + S.invValue(st) + S.bizValue(st) - debt);
  };

  /** Palier social courant */
  S.tier = function (st) {
    var nw = S.netWorth(st);
    var t = D.TIERS[0];
    for (var i = 0; i < D.TIERS.length; i++) if (nw >= D.TIERS[i].min) t = D.TIERS[i];
    return t;
  };

  /** Revenus quotidiens des entreprises */
  S.bizIncome = function (st) {
    var total = 0;
    var mult = 1 + st.stats.intelligence.lvl * 0.055 + st.stats.charisme.lvl * 0.035 + st.rep.legale * 0.0035;
    if (st.flags.network) mult *= 1.3;
    st.biz.forEach(function (b) {
      var d = D.BIZI[b.id];
      if (d) total += d.rev * b.lvl * mult;
    });
    return Math.round(total);
  };

  /** Période courante */
  S.period = function (st) {
    var p = D.PERIODS[0];
    for (var i = 0; i < D.PERIODS.length; i++) if (st.hour >= D.PERIODS[i].from) p = D.PERIODS[i];
    return p;
  };

  /** Heures restantes avant le coucher forcé */
  S.hoursLeft = function (st) { return Math.max(0, D.DAY_END - st.hour); };

  NS.S = S;
})(window.LifeRPG);
