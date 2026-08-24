/* =============================================================
   engine.js — Règles, résolution d'actions, temps, économie.
   Expose NS.G : l'API utilisée par data.js, events.js et ui.js.
   ============================================================= */
(function (NS) {
  'use strict';

  var D = NS.D, S = NS.S;
  var G = {};
  G.s = null;

  /* =========================================================
     0. Utilitaires
     ========================================================= */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  G.rnd = function (a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; };
  G.rndF = function (a, b) { return Math.random() * (b - a) + a; };
  G.chance = function (p) { return Math.random() * 100 < p; };
  G.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  G.eur = function (n) {
    var v = Math.round(n);
    return v.toLocaleString('fr-FR') + ' €';
  };

  G.gauge = function (k) { return G.s.gauges[k]; };
  G.lvl = function (k) { return G.s.stats[k].lvl; };
  G.apparence = function () { return S.apparence(G.s); };
  G.home = function () { return S.home(G.s); };
  G.period = function () { return S.period(G.s).id; };
  G.has = function (id, n) { return (G.s.inv[id] || 0) >= (n || 1); };

  /* =========================================================
     1. Mutations élémentaires (avec retour visuel)
     ========================================================= */
  G.add = function (k, n) {
    if (!n) return;
    var before = G.s.gauges[k];
    G.s.gauges[k] = clamp(before + n, 0, 100);
    var delta = Math.round(G.s.gauges[k] - before);
    if (delta) NS.UI.toast((delta > 0 ? '+' : '') + delta + ' ' + gaugeLabel(k), delta > 0 ? 'good' : 'bad');
  };
  G.set = function (k, v) { G.s.gauges[k] = clamp(v, 0, 100); };

  function gaugeLabel(k) {
    var g = D.GAUGES.filter(function (x) { return x.id === k; })[0];
    return g ? g.ico + ' ' + g.label : k;
  }

  G.cash = function (n, label) {
    if (!n) return;
    G.s.money = Math.max(0, G.s.money + n);
    if (n > 0) G.s.totals.earned += n; else G.s.totals.spent += -n;
    NS.UI.money(n);
    NS.UI.toast((n > 0 ? '+' : '') + G.eur(n) + (label ? ' · ' + label : ''), 'money');
    checkMilestones();
  };

  G.xp = function (stat, n) {
    var st = G.s.stats[stat];
    if (!st || st.lvl >= D.MAX_LVL) return;
    st.xp += n;
    var up = 0;
    while (st.lvl < D.MAX_LVL && st.xp >= D.xpNeeded(st.lvl)) {
      st.xp -= D.xpNeeded(st.lvl);
      st.lvl++; up++;
    }
    if (up) {
      var meta = D.STATS.filter(function (x) { return x.id === stat; })[0];
      NS.UI.toast(meta.ico + ' ' + meta.label + ' niveau ' + st.lvl + ' !', 'xp');
      G.log('<b>Niveau supérieur.</b> ' + meta.label + ' atteint le niveau ' + st.lvl + '.', 'good');
    }
  };

  G.rep = function (kind, n) {
    var k = (kind === 'rue') ? 'rue' : 'legale';
    G.s.rep[k] = clamp(G.s.rep[k] + n, 0, 100);
  };

  G.heat = function (n) { G.s.heat = clamp(G.s.heat + n, 0, 100); };

  G.give = function (id, n) {
    n = n || 1;
    var it = D.ITEM[id];
    if (!it) return;
    if (it.keep && G.s.inv[id]) return;              // durable : un seul exemplaire
    G.s.inv[id] = (G.s.inv[id] || 0) + n;
    NS.UI.toast(it.ico + ' ' + it.n + (n > 1 ? ' ×' + n : ''), 'good');
  };
  G.take = function (id, n) {
    n = n || 1;
    G.s.inv[id] = Math.max(0, (G.s.inv[id] || 0) - n);
    if (!G.s.inv[id]) delete G.s.inv[id];
  };

  G.aff = function (npcId, n) {
    if (typeof G.s.npc[npcId] !== 'number') G.s.npc[npcId] = 0;
    G.s.npc[npcId] = clamp(G.s.npc[npcId] + n, 0, 100);
  };

  G.flag = function (k, v) {
    G.s.flags[k] = v;
    if (k === 'debt' && v) G.s.flags.debtDue = G.s.day + 12;
  };

  G.log = function (text, type) {
    G.s.log.unshift({ d: G.s.day, h: G.s.hour, t: type || 'neutral', m: text });
    if (G.s.log.length > 240) G.s.log.length = 240;
  };

  /* =========================================================
     2. Vérification des prérequis
     ========================================================= */
  var REQ_LABEL = {
    charisme: 'Charisme', intelligence: 'Intelligence', force: 'Force'
  };

  /** @returns {string|null} raison du blocage, ou null si tout est bon */
  G.checkReq = function (req) {
    if (!req) return null;
    var s = G.s;

    if (req.money && s.money < req.money) return 'Il vous faut ' + G.eur(req.money);
    if (req.hyg && s.gauges.hygiene < req.hyg) return 'Hygiène ' + req.hyg + '% requise';
    if (req.sante && s.gauges.sante < req.sante) return 'Santé ' + req.sante + '% requise';
    if (req.app && S.apparence(s) < req.app) return 'Apparence ' + req.app + '% requise';
    if (req.repRue && s.rep.rue < req.repRue) return 'Réputation de rue ' + req.repRue + ' requise';
    if (req.repLeg && s.rep.legale < req.repLeg) return 'Réputation légale ' + req.repLeg + ' requise';
    if (req.edu && s.edu < req.edu) return 'Diplôme requis : ' + D.EDU[req.edu].n;
    if (req.addr && !S.home(s).addr) return 'Une adresse fixe est exigée';
    if (req.shower && !S.home(s).shower) return 'Nécessite un logement avec douche';

    var stats = ['charisme', 'intelligence', 'force'];
    for (var i = 0; i < stats.length; i++) {
      var k = stats[i];
      if (req[k] && s.stats[k].lvl < req[k]) return REQ_LABEL[k] + ' niveau ' + req[k] + ' requis';
    }

    if (req.item && !G.has(req.item)) return 'Nécessite : ' + D.ITEM[req.item].n;
    if (req.item2 && !G.has(req.item2)) return 'Nécessite : ' + D.ITEM[req.item2].n;
    if (req.flag && !s.flags[req.flag]) return 'Indisponible pour l’instant';
    if (req.period && req.period.indexOf(S.period(s).id) === -1) {
      var names = req.period.map(function (p) {
        return D.PERIODS.filter(function (x) { return x.id === p; })[0].label;
      });
      return 'Uniquement : ' + names.join(' / ');
    }
    return null;
  };

  /* =========================================================
     3. Temps & usure
     ========================================================= */
  /** Consomme des heures : applique l'usure horaire des jauges */
  G.spendTime = function (hours) {
    for (var h = 0; h < hours; h++) {
      G.s.hour++;
      G.s.gauges.faim = clamp(G.s.gauges.faim - 2.4, 0, 100);
      G.s.gauges.hygiene = clamp(G.s.gauges.hygiene - 1.1, 0, 100);
      G.s.gauges.moral = clamp(G.s.gauges.moral - 0.45, 0, 100);

      if (G.s.gauges.faim <= 0) G.s.gauges.sante = clamp(G.s.gauges.sante - 4.5, 0, 100);
      if (G.s.gauges.hygiene < 15) G.s.gauges.moral = clamp(G.s.gauges.moral - 0.6, 0, 100);
      if (G.s.gauges.moral <= 0) G.s.gauges.sante = clamp(G.s.gauges.sante - 1.5, 0, 100);
    }
  };

  G.spendEnergy = function (n) {
    if (n <= 0) { G.s.gauges.energie = clamp(G.s.gauges.energie - n, 0, 100); return; }
    var after = G.s.gauges.energie - n;
    if (after < 0) {
      // surmenage : on puise dans la santé
      G.s.gauges.sante = clamp(G.s.gauges.sante + after * 0.55, 0, 100);
      NS.UI.toast('Surmenage : votre corps encaisse', 'bad');
    }
    G.s.gauges.energie = clamp(after, 0, 100);
  };

  /** Malus/bonus global de réussite lié à l'état du personnage */
  G.condition = function () {
    var s = G.s;
    var m = 1;
    if (s.gauges.energie < 20) m -= 0.20;
    if (s.gauges.faim < 20) m -= 0.15;
    if (s.gauges.moral < 25) m -= 0.15;
    if (s.gauges.moral > 75) m += 0.10;
    if (s.gauges.sante < 30) m -= 0.15;
    return clamp(m, 0.4, 1.3);
  };

  /* =========================================================
     4. Exécution d'une action de survie
     ========================================================= */
  G.canDo = function (a) {
    if (G.s.over) return 'Partie terminée';
    var r = G.checkReq(a.req);
    if (r) return r;
    if ((a.hours || 0) > S.hoursLeft(G.s)) return 'Pas assez de temps aujourd’hui';
    if ((a.energy || 0) > 0 && G.s.gauges.energie < (a.energy || 0) * 0.5) return 'Vous êtes trop épuisé';
    return null;
  };

  G.doAction = function (id) {
    var a = D.ACTIONS.filter(function (x) { return x.id === id; })[0];
    if (!a || G.canDo(a)) return;

    G.spendTime(a.hours || 0);
    G.spendEnergy(a.energy || 0);
    G.s.totals.actions++;

    var res = a.run(G) || {};
    if (res.m) G.log(res.m, res.t);

    afterAction(a);
  };

  function afterAction(a) {
    NS.EV.maybeTrigger(a);
    checkMilestones();
    endOfDayGuard();
    G.checkEnd();
    NS.UI.refresh();
    S.save(G.s);
  }
  G.afterAction = afterAction;

  /** Si l'heure de coucher est atteinte, on impose la nuit */
  function endOfDayGuard() {
    if (G.s.over) return;
    if (G.s.hour >= D.DAY_END) NS.UI.forceNight();
  }

  /* =========================================================
     5. Petits boulots
     ========================================================= */
  G.doGig = function (id) {
    var g = D.GIGS.filter(function (x) { return x.id === id; })[0];
    if (!g) return;
    var hours = gigHours(g);
    if (G.canDo({ req: g.req, hours: hours, energy: g.energy })) return;

    G.spendTime(hours);
    G.spendEnergy(g.energy);

    var pay = Math.round(g.pay(G) * G.condition());
    G.cash(pay, g.n);
    if (g.xp) Object.keys(g.xp).forEach(function (k) { G.xp(k, g.xp[k]); });
    if (g.rep) Object.keys(g.rep).forEach(function (k) { G.rep(k, g.rep[k]); });
    if (g.hyg) G.add('hygiene', g.hyg);
    if (g.faim) G.add('faim', g.faim);
    G.add('moral', -2);

    G.log('<b>' + g.n + '</b> — ' + hours + 'h de travail, <b>' + G.eur(pay) + '</b> en poche.', 'money');
    G.s.totals.actions++;
    afterAction(g);
  };

  /** Le scooter/la voiture font gagner 1h sur les quarts longs */
  function gigHours(g) {
    var t = g.hours;
    var tr = S.bestOf(G.s, 'transport', 'speed');
    if (tr && tr.speed >= 2 && t >= 4) t -= 1;
    return t;
  }
  G.gigHours = gigHours;

  /* =========================================================
     6. Emploi déclaré
     ========================================================= */
  G.applyJob = function (id) {
    var j = D.JOB[id];
    if (!j || G.checkReq(j.req)) return;
    if (S.hoursLeft(G.s) < 2) { NS.UI.toast('Trop tard pour un entretien', 'bad'); return; }

    G.spendTime(2);
    G.spendEnergy(8);

    var p = 32 + S.apparence(G.s) * 0.35 + G.lvl('charisme') * 5 + G.lvl('intelligence') * 3
      + G.s.rep.legale * 0.28 - (G.s.flags.casier ? 12 : 0) - G.s.rep.rue * 0.12;
    p = clamp(p * G.condition(), 5, 95);

    if (G.chance(p)) {
      G.hire(id);
      G.log('<b>Vous êtes embauché·e</b> comme ' + j.n + '. Le contrat est signé.', 'good');
    } else {
      G.add('moral', -8);
      G.log('Entretien pour le poste de ' + j.n + '. « Nous vous rappellerons. » On ne vous rappellera pas.', 'bad');
    }
    afterAction(j);
  };

  G.hire = function (id, silent) {
    G.s.job = { id: id, shifts: 0 };
    G.rep('legale', 5);
    if (!silent) NS.UI.toast('🎉 Embauché·e : ' + D.JOB[id].n, 'good');
    milestone('firstJob', '💼 Premier emploi déclaré', 'Vous avez un employeur, une fiche de paie, une existence administrative. La rue s’éloigne d’un pas.');
  };

  G.quitJob = function () {
    if (!G.s.job) return;
    G.log('Vous quittez votre poste de ' + D.JOB[G.s.job.id].n + '.', 'neutral');
    G.s.job = null;
    G.rep('legale', -3);
    NS.UI.refresh(); S.save(G.s);
  };

  G.doShift = function () {
    if (!G.s.job) return;
    var j = D.JOB[G.s.job.id];
    var hours = gigHours(j);
    if (G.canDo({ hours: hours, energy: j.energy })) return;
    if (G.s.gauges.hygiene < 30) { NS.UI.toast('Trop sale pour vous présenter', 'bad'); return; }

    G.spendTime(hours);
    G.spendEnergy(j.energy);
    G.s.job.shifts++;

    var seniority = 1 + Math.floor(G.s.job.shifts / 10) * 0.08;
    var pay = Math.round(j.pay * seniority * G.condition());
    var bonus = j.bonus ? Math.round(j.bonus(G) * G.condition()) : 0;

    G.cash(pay + bonus, j.n);
    Object.keys(j.xp).forEach(function (k) { G.xp(k, j.xp[k]); });
    G.rep('legale', j.repLeg);
    G.add('moral', -3);
    G.add('hygiene', -6);

    var msg = '<b>' + j.n + '</b> — ' + hours + 'h. Salaire <b>' + G.eur(pay) + '</b>';
    msg += bonus ? ' + ' + G.eur(bonus) + ' de variable.' : '.';
    G.log(msg, 'money');

    if (G.s.job.shifts % 10 === 0) {
      G.log('<b>Ancienneté reconnue.</b> Votre rémunération augmente de 8%.', 'good');
      NS.UI.toast('📈 Augmentation !', 'good');
    }
    G.s.totals.actions++;
    afterAction(j);
  };

  /* =========================================================
     7. Formation
     ========================================================= */
  G.study = function () {
    var next = G.s.edu + 1;
    if (next >= D.EDU.length) return;
    var e = D.EDU[next];
    var r = G.checkReq(e.req);
    if (r) { NS.UI.toast(r, 'bad'); return; }
    if (G.s.money < e.cost) { NS.UI.toast('Il faut ' + G.eur(e.cost) + ' par session', 'bad'); return; }
    if (e.hours > S.hoursLeft(G.s)) { NS.UI.toast('Pas assez de temps aujourd’hui', 'bad'); return; }

    G.spendTime(e.hours);
    G.spendEnergy(e.energy);
    if (e.cost) G.cash(-e.cost, 'Formation');

    G.s.eduProg++;
    G.xp('intelligence', 14);
    G.add('moral', -2);

    if (G.s.eduProg >= e.sessions) {
      G.s.edu = next;
      G.s.eduProg = 0;
      G.rep('legale', 8);
      G.xp('intelligence', 40);
      NS.UI.toast('🎓 Diplôme obtenu : ' + e.short, 'xp');
      G.log('<b>' + e.n + ' obtenu.</b> Une ligne de plus sur un CV qui n’existait pas.', 'good');
      milestone('firstDiploma', '🎓 Premier diplôme', 'Vous avez terminé ' + e.n + '. Personne ne pourra vous le reprendre.');
    } else {
      G.log('Session de ' + e.n + ' (' + G.s.eduProg + '/' + e.sessions + ').', 'neutral');
    }
    G.s.totals.actions++;
    afterAction(e);
  };

  /* =========================================================
     8. Entreprises
     ========================================================= */
  G.ownBiz = function (id) {
    return G.s.biz.filter(function (b) { return b.id === id; })[0];
  };

  G.buyBiz = function (id) {
    var d = D.BIZI[id];
    if (!d || G.ownBiz(id)) return;
    var r = G.checkReq(d.req);
    if (r) { NS.UI.toast(r, 'bad'); return; }
    if (G.s.money < d.cost) { NS.UI.toast('Capital insuffisant', 'bad'); return; }
    if (S.hoursLeft(G.s) < 3) { NS.UI.toast('Pas assez de temps aujourd’hui', 'bad'); return; }

    G.spendTime(3); G.spendEnergy(12);
    G.cash(-d.cost, 'Création : ' + d.n);
    G.s.biz.push({ id: id, lvl: 1 });
    G.rep('legale', 6);
    G.xp('intelligence', 25);
    G.log('<b>' + d.n + ' créée.</b> Vous n’êtes plus salarié de votre propre vie.', 'good');
    milestone('firstBiz', '🚀 Premier entrepreneur', 'Vous possédez une entreprise. À partir d’ici, votre argent travaille aussi la nuit.');
    afterAction(d);
  };

  G.bizUpCost = function (b) {
    var d = D.BIZI[b.id];
    return Math.round(d.cost * 0.65 * Math.pow(1.55, b.lvl));
  };

  G.upgradeBiz = function (id) {
    var b = G.ownBiz(id); if (!b) return;
    var d = D.BIZI[id];
    if (b.lvl >= d.maxLvl) { NS.UI.toast('Niveau maximum atteint', 'bad'); return; }
    var cost = G.bizUpCost(b);
    if (G.s.money < cost) { NS.UI.toast('Il faut ' + G.eur(cost), 'bad'); return; }
    if (S.hoursLeft(G.s) < 2) { NS.UI.toast('Pas assez de temps aujourd’hui', 'bad'); return; }

    G.spendTime(2); G.spendEnergy(10);
    G.cash(-cost, 'Développement');
    b.lvl++;
    G.xp('intelligence', 12); G.xp('charisme', 6);
    G.log('<b>' + d.n + '</b> passe au niveau ' + b.lvl + '. Revenus quotidiens en hausse.', 'good');
    afterAction(d);
  };

  G.sellBiz = function (id) {
    var b = G.ownBiz(id); if (!b) return;
    var d = D.BIZI[id];
    var price = Math.round(d.cost * b.lvl * 0.7);
    G.s.biz = G.s.biz.filter(function (x) { return x.id !== id; });
    G.cash(price, 'Cession : ' + d.n);
    G.log('Vous cédez <b>' + d.n + '</b> pour ' + G.eur(price) + '.', 'money');
    NS.UI.refresh(); S.save(G.s);
  };

  /* =========================================================
     9. Boutique & inventaire
     ========================================================= */
  G.buyItem = function (id) {
    var it = D.ITEM[id]; if (!it) return;
    if (it.keep && G.has(id)) { NS.UI.toast('Vous le possédez déjà', 'bad'); return; }
    var r = G.checkReq(it.req);
    if (r) { NS.UI.toast(r, 'bad'); return; }
    if (G.s.money < it.price) { NS.UI.toast('Argent insuffisant', 'bad'); return; }

    G.cash(-it.price, it.n);
    G.s.inv[id] = (G.s.inv[id] || 0) + 1;
    G.log('Achat : ' + it.ico + ' <b>' + it.n + '</b> — ' + G.eur(it.price) + '.', 'money');
    NS.UI.refresh(); S.save(G.s);
  };

  G.sellItem = function (id) {
    var it = D.ITEM[id]; if (!it || !G.has(id)) return;
    var price = Math.round(it.price * (it.cat === 'luxe' ? 0.9 : 0.5));
    G.take(id, 1);
    G.cash(price, 'Revente');
    G.log('Vous revendez ' + it.n + ' pour ' + G.eur(price) + '.', 'money');
    NS.UI.refresh(); S.save(G.s);
  };

  G.useItem = function (id) {
    var it = D.ITEM[id];
    if (!it || !it.use || !G.has(id)) return;
    Object.keys(it.use).forEach(function (k) {
      if (k === 'xp') { G.xp(it.use.xp[0], it.use.xp[1]); return; }
      G.add(k, it.use[k]);
    });
    G.take(id, 1);
    G.log('Vous utilisez ' + it.ico + ' <b>' + it.n + '</b>.', 'good');
    G.checkEnd();
    NS.UI.refresh(); S.save(G.s);
  };

  /* =========================================================
     10. Logement
     ========================================================= */
  G.moveHome = function (id) {
    var h = D.HOMES.filter(function (x) { return x.id === id; })[0];
    if (!h || G.s.home === id) return;
    var req = h.req;
    if (id === 'squat' && G.s.flags.squatOk) req = {};
    var r = G.checkReq(req);
    if (r) { NS.UI.toast(r, 'bad'); return; }
    if (G.s.money < h.deposit) { NS.UI.toast('Caution de ' + G.eur(h.deposit) + ' exigée', 'bad'); return; }

    if (h.deposit) G.cash(-h.deposit, 'Caution');
    var was = G.s.home;
    G.s.home = id;
    G.log('Vous emménagez : ' + h.ico + ' <b>' + h.name + '</b>.', 'good');
    if (was === 'street' && id !== 'street') {
      milestone('firstRoof', '🔑 Un toit', 'Pour la première fois, vous fermez une porte derrière vous. Le sommeil ne sera plus jamais le même.');
    }
    NS.UI.refresh(); S.save(G.s);
  };

  /* =========================================================
     11. Relations
     ========================================================= */
  G.talk = function (npcId) {
    if (S.hoursLeft(G.s) < 1) { NS.UI.toast('Plus de temps aujourd’hui', 'bad'); return; }
    var n = D.NPC[npcId];
    G.spendTime(1); G.spendEnergy(4);
    var gain = 3 + G.lvl('charisme') * 1.2 + (S.apparence(G.s) > 50 ? 2 : 0);
    if (G.s.gauges.hygiene < 25) gain *= 0.5;
    gain = Math.round(gain);
    G.aff(npcId, gain);
    G.xp('charisme', 4);
    G.add('moral', 4);
    G.log('Vous discutez avec <b>' + n.n + '</b>. Affinité +' + gain + '.', 'good');
    afterAction(n);
  };

  G.gift = function (npcId, amount) {
    if (G.s.money < amount) { NS.UI.toast('Argent insuffisant', 'bad'); return; }
    var n = D.NPC[npcId];
    G.cash(-amount, 'Cadeau à ' + n.n);
    var gain = Math.round(6 + Math.sqrt(amount) * 1.9 + G.lvl('charisme'));
    G.aff(npcId, gain);
    G.add('moral', 3);
    G.log('Vous offrez ' + G.eur(amount) + ' à <b>' + n.n + '</b>. Affinité +' + gain + '.', 'good');
    NS.UI.refresh(); S.save(G.s);
  };

  G.helpNpc = function (npcId) {
    if (S.hoursLeft(G.s) < 3) { NS.UI.toast('Plus assez de temps', 'bad'); return; }
    var n = D.NPC[npcId];
    G.spendTime(3); G.spendEnergy(18);
    var gain = 12 + G.lvl('charisme');
    G.aff(npcId, gain);
    G.xp('charisme', 6); G.xp('force', 4);
    G.add('moral', 5);
    G.log('Vous rendez service à <b>' + n.n + '</b> pendant trois heures. Affinité +' + gain + '.', 'good');
    afterAction(n);
  };

  G.favor = function (npcId, favId) {
    var n = D.NPC[npcId];
    var f = n.favors.filter(function (x) { return x.id === favId; })[0];
    if (!f) return;
    if (G.s.npc[npcId] < f.aff) { NS.UI.toast('Affinité insuffisante', 'bad'); return; }
    if (G.s.flags['fav_' + npcId + '_' + favId]) { NS.UI.toast('Déjà obtenu', 'bad'); return; }

    var msg = f.run(G);
    if (msg === null) { NS.UI.toast('Conditions non réunies', 'bad'); return; }
    G.s.flags['fav_' + npcId + '_' + favId] = true;
    G.aff(npcId, -12);
    G.log('<b>' + n.n + '</b> : ' + msg, 'event');
    G.checkEnd();
    NS.UI.refresh(); S.save(G.s);
  };

  /* =========================================================
     12. Police, arrestation
     ========================================================= */
  G.arrestCheck = function (reason) {
    var s = G.s;
    var p = 22 + s.heat * 0.55;
    if (!G.chance(p)) {
      G.log('Vous filez avant l’arrivée de la police. De justesse.', 'bad');
      return false;
    }
    s.totals.arrests++;

    if (s.heat >= 70 || s.totals.arrests >= 4) {
      G.over('prison', '⛓️', 'Trois ans ferme',
        'Le juge énumère les faits : ' + reason + ', récidive, aucune adresse stable. ' +
        'La porte se referme sur ' + s.totals.arrests + ' arrestations et une vie qui n’aura pas eu le temps de commencer.');
      return true;
    }

    var fine = Math.min(s.money, 40 + Math.round(s.heat));
    if (fine) G.cash(-fine, 'Amende');
    s.hour = D.DAY_END;
    G.add('moral', -22);
    G.rep('legale', -10);
    G.rep('rue', 4);
    G.heat(-25);
    G.log('<b>Garde à vue.</b> Vous perdez la journée' + (fine ? ' et ' + G.eur(fine) + ' d’amende' : '') + '.', 'bad');
    NS.UI.toast('🚔 Garde à vue', 'bad');
    return true;
  };

  /* =========================================================
     13. Nuit / fin de journée
     ========================================================= */
  G.sleep = function () {
    var s = G.s;
    if (s.over) return;
    var h = S.home(s);
    var lines = [];

    s.totals.nights++;

    /* --- loyer --- */
    var rent = h.rent;
    if (s.flags.freeShelter > 0 && h.id === 'shelter') {
      s.flags.freeShelter--;
      rent = 0;
      lines.push('Place gratuite au foyer (' + s.flags.freeShelter + ' nuit(s) restante(s)).');
    }
    if (rent > 0) {
      if (s.money >= rent) {
        G.cash(-rent, 'Loyer');
        lines.push('Loyer réglé : ' + G.eur(rent) + '.');
      } else {
        s.home = 'street';
        G.add('moral', -20);
        lines.push('<b>Expulsion.</b> Impossible de payer ' + G.eur(rent) + '. Retour au trottoir.');
        h = S.home(s);
      }
    }

    /* --- revenus d'entreprise --- */
    var inc = S.bizIncome(s);
    if (inc > 0) { G.cash(inc, 'Entreprises'); lines.push('Vos entreprises rapportent ' + G.eur(inc) + '.'); }

    /* --- dette --- */
    if (s.flags.debt) {
      if (s.day >= s.flags.debtDue) {
        if (s.money >= s.flags.debt) {
          G.cash(-s.flags.debt, 'Remboursement');
          lines.push('Vous remboursez Karim. On vous serre la main.');
          delete s.flags.debt; delete s.flags.debtDue;
        } else {
          G.add('sante', -30); G.add('moral', -25);
          s.flags.debtDue = s.day + 6;
          s.flags.debt = Math.round(s.flags.debt * 1.25);
          lines.push('<b>Vous ne pouviez pas payer.</b> On vous l’a fait comprendre. Dette portée à ' + G.eur(s.flags.debt) + '.');
        }
      }
    }

    /* --- qualité du sommeil --- */
    var q = h.sleep;
    if (h.id === 'street' || h.id === 'squat') {
      if (G.has('duvet')) q += 20; else if (G.has('carton')) q += 9;
    }
    if (s.gauges.faim < 20) q -= 12;
    if (s.gauges.sante < 30) q -= 8;
    q = clamp(q, 10, 100);

    s.gauges.energie = clamp(s.gauges.energie + q, 0, 100);
    G.set('faim', s.gauges.faim - 16);
    G.set('hygiene', s.gauges.hygiene - 5);
    s.gauges.moral = clamp(s.gauges.moral + h.moral + (q > 80 ? 5 : 0), 0, 100);

    /* récupération de santé si bien nourri */
    if (s.gauges.faim > 25) s.gauges.sante = clamp(s.gauges.sante + q / 16, 0, 100);
    else { s.gauges.sante = clamp(s.gauges.sante - 6, 0, 100); lines.push('Vous vous endormez le ventre vide.'); }

    /* --- aléas nocturnes --- */
    if (h.risk && G.chance(h.risk * 100)) {
      var e = G.rnd(1, 100);
      if (e <= 40 && !G.has('sac')) {
        var loss = Math.min(s.money, G.rnd(10, 60));
        if (loss > 0) { G.cash(-loss, 'Vol'); lines.push('<b>On vous a fait les poches pendant votre sommeil</b> : −' + G.eur(loss) + '.'); }
        else lines.push('On a fouillé vos affaires. Il n’y avait rien à prendre.');
      } else if (e <= 70) {
        G.add('sante', -9); G.add('moral', -6);
        lines.push('Nuit glaciale. Vous vous réveillez fiévreux.');
      } else if (e <= 88) {
        G.heat(6); G.add('energie', -18);
        lines.push('Contrôle de police à 4h du matin. On vous demande de circuler.');
      } else {
        G.add('sante', -16); G.add('moral', -12);
        lines.push('<b>Vous vous faites agresser dans la nuit.</b>');
      }
    }

    /* --- passage au jour suivant --- */
    s.day++;
    s.hour = D.DAY_START;
    s.heat = clamp(s.heat - 7, 0, 100);

    G.log('— JOUR ' + s.day + ' —', 'day');
    lines.reverse().forEach(function (l) { G.log(l, 'event'); });

    NS.EV.nightEvent();
    checkMilestones();
    G.checkEnd();
    NS.UI.refresh();
    S.save(s);
  };

  /* =========================================================
     14. Jalons & fins de partie
     ========================================================= */
  var MILES = [
    { id: 'm100', at: 100, t: '💶 Cent euros', x: 'La première somme que vous n’avez pas dépensée le jour même. C’est là que commence tout le reste.' },
    { id: 'm1k', at: 1000, t: '💰 Mille euros', x: 'Vous avez de quoi voir venir. Vous pouvez enfin décider, au lieu de subir.' },
    { id: 'm10k', at: 10000, t: '🏦 Dix mille euros', x: 'Un capital. Un vrai. De quoi transformer votre temps en machine.' },
    { id: 'm100k', at: 100000, t: '💎 Cent mille euros', x: 'On ne vous demande plus d’où vous venez. On vous demande ce que vous faites.' },
    { id: 'm500k', at: 500000, t: '🎩 Un demi-million', x: 'Le sommet est visible. Vous savez exactement ce qu’il a coûté.' }
  ];

  function milestone(id, title, text) {
    if (G.s.milestones[id]) return;
    G.s.milestones[id] = true;
    NS.UI.milestone(title, text);
    G.log('<b>' + title + '</b> — ' + text, 'event');
  }
  G.milestone = milestone;

  function checkMilestones() {
    if (G.s.over) return;
    var nw = S.netWorth(G.s);
    MILES.forEach(function (m) {
      if (nw >= m.at) milestone(m.id, m.t, m.x);
    });
  }

  G.over = function (type, ico, title, text) {
    if (G.s.over) return;
    G.s.over = { type: type, ico: ico, title: title, text: text };
    G.log('<b>' + title + '</b>', type === 'win' ? 'good' : 'bad');
    S.save(G.s);
    NS.UI.gameOver();
  };

  G.checkEnd = function () {
    var s = G.s;
    if (s.over) return;

    if (s.gauges.sante <= 0) {
      G.over('death', '🕯️', 'Fin de parcours',
        'Le ' + (s.day) + 'e jour, votre corps a cessé de suivre. ' +
        'On vous retrouve au petit matin. Le journal ne mentionnera rien. ' +
        'Vous aviez amassé ' + G.eur(S.netWorth(s)) + '.');
      return;
    }
    if (S.netWorth(s) >= D.WIN_NET) {
      G.over('win', '👑', 'Au sommet',
        'Le million est atteint en ' + s.day + ' jours. ' +
        'Depuis la baie vitrée, vous distinguez le trottoir où tout a commencé. ' +
        'Quelqu’un y dort ce soir. Vous savez exactement ce qu’il lui faudrait.');
    }
  };

  /* =========================================================
     15. Amorçage
     ========================================================= */
  G.attach = function (state) {
    G.s = state;
    return G;
  };

  NS.G = G;
})(window.LifeRPG);
