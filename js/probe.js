/* =============================================================
   probe.js — Simulation d'une action dans un bac à sable.
   Rejoue l'action des centaines de fois sur une copie de l'état
   pour en extraire les plages réelles de gains, de coûts,
   de risques et la sensibilité aux statistiques.
   ============================================================= */
(function (NS) {
  'use strict';

  var D = NS.D, S = NS.S;
  var P = {};

  var RUNS = 180;
  var SENS_RUNS = 90;

  /* Copie légère : on retire les gros tableaux inutiles à la simulation */
  function snapshot(s) {
    var log = s.log, hist = s.market.hist;
    s.log = []; s.market.hist = {};
    var copy = JSON.parse(JSON.stringify(s));
    s.log = log; s.market.hist = hist;
    copy.market.hist = {};
    return copy;
  }

  function sandbox(state) {
    var g = Object.create(NS.G);
    g.s = state;
    g._q = true;
    g._arrest = false;
    return g;
  }

  function totalXp(st) {
    var t = {};
    D.STAT_IDS.forEach(function (k) {
      var v = st.stats[k], sum = v.xp;
      for (var i = 1; i < v.lvl; i++) sum += D.xpNeeded(i);
      t[k] = sum;
    });
    return t;
  }

  function newAcc() {
    return {
      n: 0, money: [], dirty: [], gain: [],
      gauges: {}, xp: {}, rep: { rue: 0, legale: 0, pegre: 0 },
      heat: 0, arrest: 0, ok: 0, ko: 0, items: {}, jail: 0
    };
  }

  function accumulate(acc, base, after, g, res) {
    acc.n++;
    var dm = after.money - base.money;
    var dd = after.dirty - base.dirty;
    acc.money.push(dm);
    acc.dirty.push(dd);
    acc.gain.push(dm + dd);

    D.GAUGES.forEach(function (gg) {
      acc.gauges[gg.id] = (acc.gauges[gg.id] || 0) + (after.gauges[gg.id] - base.gauges[gg.id]);
    });

    var bx = totalXp(base), ax = totalXp(after);
    D.STAT_IDS.forEach(function (k) { acc.xp[k] = (acc.xp[k] || 0) + (ax[k] - bx[k]); });

    ['rue', 'legale', 'pegre'].forEach(function (k) { acc.rep[k] += after.rep[k] - base.rep[k]; });
    acc.heat += after.heat - base.heat;
    if (g._arrest) acc.arrest++;
    if (after.jail) acc.jail++;

    if (res && res.t) { if (res.t === 'bad') acc.ko++; else acc.ok++; }
    else if (dm + dd > 0) acc.ok++; else acc.ko++;

    Object.keys(after.inv).forEach(function (id) {
      var d = (after.inv[id] || 0) - (base.inv[id] || 0);
      if (d > 0) { acc.items[id] = acc.items[id] || { n: 0, q: 0 }; acc.items[id].n++; acc.items[id].q += d; }
    });
    Object.keys(base.inv).forEach(function (id) {
      var d = (after.inv[id] || 0) - (base.inv[id] || 0);
      if (d < 0) { acc.items['-' + id] = acc.items['-' + id] || { n: 0, q: 0 }; acc.items['-' + id].n++; acc.items['-' + id].q += -d; }
    });
  }

  function stats(arr) {
    if (!arr.length) return { min: 0, max: 0, avg: 0 };
    var min = Infinity, max = -Infinity, sum = 0;
    for (var i = 0; i < arr.length; i++) { if (arr[i] < min) min = arr[i]; if (arr[i] > max) max = arr[i]; sum += arr[i]; }
    return { min: min, max: max, avg: sum / arr.length };
  }

  /**
   * @param spec { hours, energy, exec(g), tweak(state) }
   * @param runs nombre de répétitions
   */
  P.simulate = function (spec, runs) {
    runs = runs || RUNS;
    var base0 = snapshot(NS.G.s);
    var acc = newAcc();

    for (var i = 0; i < runs; i++) {
      var st = JSON.parse(JSON.stringify(base0));
      if (spec.tweak) spec.tweak(st);
      var before = JSON.parse(JSON.stringify(st));
      var g = sandbox(st);
      var res = null;
      try {
        if (spec.hours) g.spendTime(spec.hours);
        if (spec.energy) g.spendEnergy(spec.energy);
        res = spec.exec(g);
      } catch (e) { /* une action mal formée ne doit pas casser la fiche */ }
      accumulate(acc, before, st, g, res);
    }
    return acc;
  };

  function summarize(acc, spec) {
    var n = acc.n || 1;
    var out = {
      n: n,
      money: stats(acc.money),
      dirty: stats(acc.dirty),
      gain: stats(acc.gain),
      gauges: {}, xp: {}, rep: {},
      heat: acc.heat / n,
      arrest: acc.arrest / n * 100,
      jail: acc.jail / n * 100,
      success: acc.ok / n * 100,
      items: []
    };
    D.GAUGES.forEach(function (g) { out.gauges[g.id] = acc.gauges[g.id] / n; });
    D.STAT_IDS.forEach(function (k) { out.xp[k] = acc.xp[k] / n; });
    ['rue', 'legale', 'pegre'].forEach(function (k) { out.rep[k] = acc.rep[k] / n; });
    Object.keys(acc.items).forEach(function (id) {
      var neg = id.charAt(0) === '-';
      var real = neg ? id.slice(1) : id;
      if (!D.ITEM[real]) return;
      out.items.push({ id: real, neg: neg, pct: acc.items[id].n / n * 100, qty: acc.items[id].q / acc.items[id].n });
    });
    out.items.sort(function (a, b) { return b.pct - a.pct; });
    return out;
  }

  /* ---------------------------------------------------------
     Sensibilité : ce que rapporterait un niveau de plus
     --------------------------------------------------------- */
  function sensitivity(spec, baseAvg) {
    var sens = {};
    D.STAT_IDS.forEach(function (k) {
      if (NS.G.s.stats[k].lvl >= D.MAX_LVL) return;
      var acc = P.simulate({
        hours: spec.hours, energy: spec.energy, exec: spec.exec,
        tweak: function (st) { st.stats[k].lvl++; if (spec.tweak) spec.tweak(st); }
      }, SENS_RUNS);
      var d = stats(acc.gain).avg - baseAvg;
      var succ = acc.ok / (acc.n || 1) * 100;
      sens[k] = { money: d, success: succ };
    });
    return sens;
  }

  /* ---------------------------------------------------------
     Sensibilité horaire (pour les actions praticables de jour)
     --------------------------------------------------------- */
  function periodScan(spec, when) {
    var out = {};
    var list = when === 'night' ? [] : ['matin', 'midi', 'soir'];
    if (when === 'any') list = ['matin', 'midi', 'soir', 'nuit'];
    list.forEach(function (pid) {
      var from = D.PERIODS.filter(function (p) { return p.id === pid; })[0].from;
      var acc = P.simulate({
        hours: spec.hours, energy: spec.energy, exec: spec.exec,
        tweak: function (st) { st.hour = from; }
      }, 60);
      out[pid] = stats(acc.gain).avg;
    });
    return out;
  }

  /* ---------------------------------------------------------
     Points d'entrée
     --------------------------------------------------------- */
  P.action = function (a) {
    var spec = {
      hours: a.hours || 0, energy: a.energy || 0,
      exec: function (g) { return a.run(g); }
    };
    var res = summarize(P.simulate(spec), spec);
    res.sens = sensitivity(spec, res.gain.avg);
    res.periods = periodScan(spec, a.when || 'day');
    res.hours = a.hours || 0;
    res.energy = a.energy || 0;
    return res;
  };

  P.crime = function (c) {
    var spec = {
      hours: c.hours || 0, energy: c.energy || 0,
      exec: function (g) { g._crime = c; var r = c.run(g); g._crime = null; return r; }
    };
    var res = summarize(P.simulate(spec), spec);
    res.sens = sensitivity(spec, res.gain.avg);
    res.hours = c.hours || 0;
    res.energy = c.energy || 0;
    res.sentence = c.sentence;
    return res;
  };

  P.gig = function (gg) {
    var hours = NS.G.gigHours(gg);
    var spec = {
      hours: hours, energy: gg.energy || 0,
      exec: function (g) {
        var pay = Math.round(gg.pay(g) * g.condition());
        g.cash(pay, gg.n);
        if (gg.xp) Object.keys(gg.xp).forEach(function (k) { g.xp(k, gg.xp[k]); });
        if (gg.rep) Object.keys(gg.rep).forEach(function (k) { g.rep(k, gg.rep[k]); });
        if (gg.hyg) g.add('hygiene', gg.hyg);
        if (gg.faim) g.add('faim', gg.faim);
        g.add('moral', gg.moral !== undefined ? gg.moral : -2);
        return { t: 'money' };
      }
    };
    var res = summarize(P.simulate(spec), spec);
    res.sens = sensitivity(spec, res.gain.avg);
    res.hours = hours;
    res.energy = gg.energy || 0;
    return res;
  };

  P.shift = function (j, shifts) {
    var hours = NS.G.gigHours(j);
    var spec = {
      hours: hours, energy: j.energy || 0,
      exec: function (g) {
        var sen = 1 + Math.floor((shifts || 0) / 10) * 0.08;
        var pay = Math.round(j.pay * sen * g.condition());
        var bonus = j.bonus ? Math.round(j.bonus(g) * g.condition()) : 0;
        g.cash(pay + bonus, j.n);
        Object.keys(j.xp).forEach(function (k) { g.xp(k, j.xp[k]); });
        g.rep('legale', j.repLeg);
        g.add('moral', j.moral !== undefined ? j.moral : -3);
        g.add('hygiene', -6);
        return { t: 'money' };
      }
    };
    var res = summarize(P.simulate(spec), spec);
    res.sens = sensitivity(spec, res.gain.avg);
    res.hours = hours;
    res.energy = j.energy || 0;
    return res;
  };

  /** Probabilité d'être embauché sur une candidature */
  P.apply = function (j) {
    var s = NS.G.s, G = NS.G;
    var p = 30 + S.apparence(s) * 0.35 + G.lvl('charisme') * 5 + G.lvl('intelligence') * 3
      + s.rep.legale * 0.28 - s.casier * 7 - s.rep.rue * 0.10;
    if (s.flags.coached > s.day) p += 18;
    if (s.flags.nopapers) p -= 25;
    return Math.max(5, Math.min(95, p * G.condition()));
  };

  /* ---------------------------------------------------------
     Aperçu express affiché directement sur les cartes.
     Peu de tirages, mis en cache : il ne s'agit pas d'être exact
     mais de montrer d'un coup d'œil ce que l'action rapporte.
     --------------------------------------------------------- */
  var PREVIEW_RUNS = 12;
  var pvCache = {};

  function cacheKey(kind, id) {
    var s = NS.G.s;
    return kind + ':' + id + ':' + s.day + ':' + s.hour + ':' +
      D.STAT_IDS.map(function (k) { return s.stats[k].lvl; }).join('') + ':' +
      D.GAUGES.map(function (g) { return Math.round(s.gauges[g.id] / 8); }).join('') + ':' +
      Math.round(s.heat / 8) + ':' + Object.keys(s.inv).length + ':' +
      Math.round(s.rep.rue) + ':' + Math.round(s.rep.pegre) + ':' + (s.flags.cased || '');
  }

  P.clearPreviews = function () { pvCache = {}; };

  /**
   * @returns { money, dirty, gauges:{}, success } — moyennes sur quelques tirages
   */
  P.preview = function (kind, id, spec) {
    var key = cacheKey(kind, id);
    if (pvCache[key]) return pvCache[key];
    var out;
    try {
      var acc = P.simulate(spec, PREVIEW_RUNS);
      var n = acc.n || 1;
      out = {
        money: stats(acc.money).avg,
        dirty: stats(acc.dirty).avg,
        gauges: {},
        success: acc.ok / n * 100
      };
      D.GAUGES.forEach(function (g) { out.gauges[g.id] = acc.gauges[g.id] / n; });
    } catch (e) {
      out = { money: 0, dirty: 0, gauges: {}, success: 0 };
    }
    pvCache[key] = out;
    return out;
  };

  P.previewAction = function (a) {
    return P.preview('a', a.id, {
      hours: a.hours || 0, energy: a.energy || 0,
      exec: function (g) { return a.run(g); }
    });
  };

  P.previewCrime = function (c) {
    return P.preview('c', c.id, {
      hours: c.hours || 0, energy: c.energy || 0,
      exec: function (g) { g._crime = c; var r = c.run(g); g._crime = null; return r; }
    });
  };

  P.previewGig = function (gg) {
    return P.preview('g', gg.id, {
      hours: NS.G.gigHours(gg), energy: gg.energy || 0,
      exec: function (g) {
        var pay = Math.round(gg.pay(g) * g.condition());
        g.cash(pay, gg.n);
        if (gg.hyg) g.add('hygiene', gg.hyg);
        if (gg.faim) g.add('faim', gg.faim);
        g.add('moral', gg.moral !== undefined ? gg.moral : -2);
        return { t: 'money' };
      }
    });
  };

  P.previewShift = function (j, shifts) {
    return P.preview('s', j.id + (shifts || 0), {
      hours: NS.G.gigHours(j), energy: j.energy || 0,
      exec: function (g) {
        var sen = 1 + Math.floor((shifts || 0) / 10) * 0.08;
        var pay = Math.round(j.pay * sen * g.condition());
        var bonus = j.bonus ? Math.round(j.bonus(g) * g.condition()) : 0;
        if (j.payBank) g.bankIn(pay + bonus, j.n); else g.cash(pay + bonus, j.n);
        g.add('moral', j.moral !== undefined ? j.moral : -3);
        g.add('hygiene', -6);
        return { t: 'money' };
      }
    });
  };

  /** Un salaire viré n'apparaît pas dans `money` : on le lit sur le compte */
  P.previewJobPay = function (j, shifts) {
    var sen = 1 + Math.floor((shifts || 0) / 10) * 0.08;
    return Math.round(j.pay * sen * NS.G.condition());
  };

  NS.PROBE = P;
})(window.LifeRPG);
