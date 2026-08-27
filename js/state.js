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
      job: null,            // { id, shifts, pending, absences, weekShifts, weekAnchor, promoDue }
      hospital: null,       // { days, reason } pendant une hospitalisation
      rentDue: 0,           // jour de la prochaine échéance de loyer
      rentLate: 0,          // relances impayées en cours
      rentGrace: 0,         // délai obtenu à l'amiable
      stash: 0,             // argent sale planqué au logement
      washedWeek: 0,        // montant blanchi sur la semaine en cours
      washWeekAnchor: 1,    // début de la semaine de blanchiment
      edu: 0,
      eduProg: 0,
      filiere: null,        // id de la filière post-bac choisie (définitif)
      filiereLvl: 0,        // 0-3 : niveaux validés dans cette filière
      filiereProg: 0,       // séances accumulées vers le niveau suivant
      examStreak: {},       // { clé: échecs consécutifs } — booste la chance à chaque échec
      shopHeat: {},         // vigilance accumulée par commerce après un vol
      crimeLast: {},        // dernier jour où chaque coup a été tenté (récidive)
      gang: null,           // { id, rank, missions, loyalty, since, failed }
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
      procSeen: {},         // dernier jour d'apparition de chaque gabarit procédural
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
    if (!st.procSeen) st.procSeen = {};
    if (!st.crimeLast) st.crimeLast = {};
    if (typeof st.rentDue !== 'number') st.rentDue = 0;
    if (typeof st.stash !== 'number') st.stash = 0;
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

  /** Montant d'une échéance de loyer (pour la période du logement) */
  S.rent = function (st) {
    var r = S.home(st).rent;
    if (st.flags.rentCut) r = Math.round(r * 0.7);
    return Math.round(r);
  };

  /** Périodicité du loyer courant */
  S.rentPer = function (st) { return S.home(st).rentPer || 'day'; };

  /** Loyer ramené au jour, pour comparer des logements entre eux */
  S.rentPerDay = function (st) {
    var per = D.PERIODS_PAY[S.rentPer(st)] || D.PERIODS_PAY.day;
    return S.rent(st) / per.days;
  };

  /** Argent sale total : sur soi + planqué au logement */
  S.dirtyTotal = function (st) { return st.dirty + (st.stash || 0); };

  /** Capacité de planque, selon la sûreté du logement */
  S.stashCap = function (st) {
    var h = S.home(st);
    return (h.safe || 0) * 2500;
  };

  /** Plafond hebdomadaire de blanchiment */
  S.washWeekCap = function (st) {
    return 4000 + st.rep.pegre * 250 + S.washCap(st) * 0.5;
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
      st.money + (st.dirty + (st.stash || 0)) * 0.5 +
      (st.bank ? st.bank.checking + st.bank.savings : 0) +
      S.portfolio(st) + S.invValue(st) + S.bizValue(st) - S.debtTotal(st)
    );
  };

  /**
   * Voie suivie, de −1 (criminelle) à +1 (légale).
   * Sert à éclaircir progressivement l'interface : on commence dans le noir,
   * et le monde s'ouvre — ou ne s'ouvre pas.
   */
  S.path = function (st) {
    var crimes = (st.hist && st.hist.crime) || 0;
    var honest = ((st.hist && st.hist.helped) || 0) + ((st.hist && st.hist.honest) || 0);
    var legal = st.rep.legale + honest * 3 + (st.job ? 25 : 0) + st.edu * 8 +
      (st.filiereLvl || 0) * 10 + (st.bank.open ? 10 : 0);
    var dark = st.rep.pegre * 1.2 + crimes * 2.5 + st.casier * 12 + st.heat * 0.4;
    var v = (legal - dark) / 120;
    return Math.max(-1, Math.min(1, v));
  };

  /** Aisance matérielle 0→1 : la misère assombrit aussi l'écran */
  S.comfort = function (st) {
    var nw = S.netWorth(st);
    if (nw <= 0) return 0;
    return Math.max(0, Math.min(1, Math.log10(nw + 1) / 6));
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
