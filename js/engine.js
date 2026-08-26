/* =============================================================
   engine.js — Règles du jeu.
   Toutes les méthodes utilisent `this` : l'API peut donc être
   clonée dans un bac à sable pour simuler une action sans
   toucher à la partie en cours (voir probe.js).
   ============================================================= */
(function (NS) {
  'use strict';

  var D = NS.D, S = NS.S;
  var G = {};
  G.s = null;
  G._q = false;          // mode silencieux (simulation)

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  G.clamp = clamp;

  /* =========================================================
     0. Aléatoire & formatage
     ========================================================= */
  G.rnd = function (a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; };
  G.rndF = function (a, b) { return Math.random() * (b - a) + a; };
  G.chance = function (p) { return Math.random() * 100 < p; };
  G.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  G.gauss = function () {
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  G.eur = function (n) { return Math.round(n).toLocaleString('fr-FR') + ' €'; };

  /* =========================================================
     1. Lecture d'état
     ========================================================= */
  G.gauge = function (k) { return this.s.gauges[k]; };
  G.lvl = function (k) { return this.s.stats[k] ? this.s.stats[k].lvl : 1; };
  G.apparence = function () { return S.apparence(this.s); };
  G.home = function () { return S.home(this.s); };
  G.period = function () { return S.period(this.s).id; };
  G.isNight = function () { return S.isNight(this.s); };
  G.day = function () { return this.s.day; };
  G.hoursLeft = function () { return S.hoursLeft(this.s); };
  G.has = function (id, n) { return (this.s.inv[id] || 0) >= (n || 1); };
  G.money = function () { return this.s.money; };
  G.dirtyVal = function () { return this.s.dirty; };
  G.heatVal = function () { return this.s.heat; };
  G.repVal = function (k) { return this.s.rep[k] || 0; };
  G.flags = function (k) { return this.s.flags[k]; };
  G.affVal = function (id) { return this.s.npc[id] || 0; };
  G.maxBizLvl = function () { return S.maxBizLvl(this.s); };

  /** Compteur de comportement : hist('crime') incrémente, hist('crime',0) lit */
  G.hist = function (k, n) {
    if (n === 0) return this.s.hist[k] || 0;
    this.s.hist[k] = (this.s.hist[k] || 0) + (n === undefined ? 1 : n);
    return this.s.hist[k];
  };

  /* =========================================================
     2. Mutations
     ========================================================= */
  G.toast = function (m, t) { if (!this._q) NS.UI.toast(m, t); };

  G.add = function (k, n) {
    if (!n) return;
    var before = this.s.gauges[k];
    this.s.gauges[k] = clamp(before + n, 0, 100);
    var delta = Math.round(this.s.gauges[k] - before);
    if (delta && !this._q) NS.UI.toast((delta > 0 ? '+' : '') + delta + ' ' + gaugeLabel(k), delta > 0 ? 'good' : 'bad');
  };
  G.set = function (k, v) { this.s.gauges[k] = clamp(v, 0, 100); };

  function gaugeLabel(k) {
    var g = D.GAUGES.filter(function (x) { return x.id === k; })[0];
    return g ? g.ico + ' ' + g.label : k;
  }

  G.cash = function (n, label) {
    if (!n) return;
    this.s.money = Math.max(0, this.s.money + n);
    if (n > 0) this.s.totals.earned += n; else this.s.totals.spent += -n;
    if (!this._q) {
      NS.UI.money(n);
      NS.UI.toast((n > 0 ? '+' : '') + this.eur(n) + (label ? ' · ' + label : ''), 'money');
      this.checkMilestones();
    }
  };

  G.dirtyCash = function (n, label) {
    if (!n) return;
    this.s.dirty = Math.max(0, this.s.dirty + n);
    if (n > 0) this.s.totals.earned += n;
    if (!this._q) NS.UI.toast((n > 0 ? '+' : '') + this.eur(n) + ' sale' + (label ? ' · ' + label : ''), 'dirty');
  };

  G.xp = function (stat, n) {
    var st = this.s.stats[stat];
    if (!st || st.lvl >= D.MAX_LVL) return;
    st.xp += n;
    var up = 0;
    while (st.lvl < D.MAX_LVL && st.xp >= D.xpNeeded(st.lvl)) { st.xp -= D.xpNeeded(st.lvl); st.lvl++; up++; }
    if (up && !this._q) {
      var meta = D.STATS.filter(function (x) { return x.id === stat; })[0];
      NS.UI.toast(meta.ico + ' ' + meta.label + ' niveau ' + st.lvl + ' !', 'xp');
      this.log('<b>Niveau supérieur.</b> ' + meta.label + ' atteint le niveau ' + st.lvl + '.', 'good');
    }
  };

  G.rep = function (kind, n) {
    var k = (kind === 'rue' || kind === 'legale' || kind === 'pegre') ? kind : 'legale';
    this.s.rep[k] = clamp(this.s.rep[k] + n, 0, 100);
  };

  G.heat = function (n) {
    if (n > 0 && this.s.flags.ghost) n *= 0.75;
    if (n > 0 && this.has('gants')) n *= 0.88;
    this.s.heat = clamp(this.s.heat + n, 0, 100);
  };
  G.setHeat = function (v) { this.s.heat = clamp(v, 0, 100); };

  G.give = function (id, n) {
    n = n || 1;
    var it = D.ITEM[id];
    if (!it) return;
    if (it.keep && this.s.inv[id]) return;
    this.s.inv[id] = (this.s.inv[id] || 0) + n;
    if (!this._q) NS.UI.toast(it.ico + ' ' + it.n + (n > 1 ? ' ×' + n : ''), 'good');
  };
  G.take = function (id, n) {
    n = n || 1;
    this.s.inv[id] = Math.max(0, (this.s.inv[id] || 0) - n);
    if (!this.s.inv[id]) delete this.s.inv[id];
  };

  /* --------- affinité : −100 … +100 --------- */
  G.aff = function (npcId, n) {
    if (typeof this.s.npc[npcId] !== 'number') this.s.npc[npcId] = 0;
    var before = this.s.npc[npcId];
    this.s.npc[npcId] = clamp(before + n, -100, 100);
    var d = Math.round(this.s.npc[npcId] - before);
    if (d && !this._q) {
      var np = D.NPC[npcId];
      if (np) NS.UI.toast(np.ico + ' ' + np.n + ' ' + (d > 0 ? '+' : '') + d, d > 0 ? 'good' : 'bad');
    }
  };

  /** Fait varier l'affinité de toute une faction */
  G.affFaction = function (faction, n) {
    var self = this;
    D.NPCS.forEach(function (np) { if (np.faction === faction) self.aff(np.id, n); });
  };

  G.flag = function (k, v) {
    this.s.flags[k] = v;
    if (k === 'debt' && v) this.s.flags.debtDue = this.s.day + 12;
  };

  G.log = function (text, type) {
    if (this._q) return;
    this.s.log.unshift({ d: this.s.day, h: this.s.hour, t: type || 'neutral', m: text });
    if (this.s.log.length > 260) this.s.log.length = 260;
  };

  /** Programme un événement pour dans N jours */
  G.sched = function (eventId, days) {
    this.s.pending.push({ id: eventId, day: this.s.day + days });
  };

  /* =========================================================
     3. Prérequis
     ========================================================= */
  var REQ_LABEL = { charisme: 'Charisme', intelligence: 'Intelligence', force: 'Force', discretion: 'Discrétion' };

  G.checkReq = function (req) {
    if (!req) return null;
    var s = this.s;

    if (req.money && s.money < req.money) return 'Il vous faut ' + this.eur(req.money);
    if (req.dirty && s.dirty < req.dirty) return 'Il vous faut ' + this.eur(req.dirty) + ' d’argent sale';
    if (req.hyg && s.gauges.hygiene < req.hyg) return 'Hygiène ' + req.hyg + ' % requise';
    if (req.sante && s.gauges.sante < req.sante) return 'Santé ' + req.sante + ' % requise';
    if (req.app && S.apparence(s) < req.app) return 'Apparence ' + req.app + ' % requise';
    if (req.repRue && s.rep.rue < req.repRue) return 'Réputation de rue ' + req.repRue + ' requise';
    if (req.repLeg && s.rep.legale < req.repLeg) return 'Réputation légale ' + req.repLeg + ' requise';
    if (req.repPegre && s.rep.pegre < req.repPegre) return 'Réputation dans le milieu ' + req.repPegre + ' requise';
    if (req.edu && s.edu < req.edu) return 'Diplôme requis : ' + D.EDU[req.edu].n;
    if (req.filiere && s.filiere !== req.filiere) return 'Filière requise : ' + D.FILIERE[req.filiere].n;
    if (req.filiereLvl && s.filiereLvl < req.filiereLvl) {
      var flabel = s.filiere ? D.FILIERE[s.filiere].n : (req.filiere ? D.FILIERE[req.filiere].n : 'Une filière');
      return flabel + ' — ' + (D.FILIERE_TIER[req.filiereLvl - 1] || 'niveau ' + req.filiereLvl) + ' requis';
    }
    if (req.addr && !S.home(s).addr) return 'Une adresse fixe est exigée';
    if (req.shower && !S.home(s).shower) return 'Nécessite un logement avec douche';
    if (req.bank && !s.bank.open) return 'Un compte bancaire est nécessaire';
    if (req.biz && s.biz.length < req.biz) return req.biz + ' entreprise(s) requise(s)';
    if (req.casier !== undefined && s.casier > req.casier) return 'Casier judiciaire trop chargé';

    for (var i = 0; i < D.STAT_IDS.length; i++) {
      var k = D.STAT_IDS[i];
      if (req[k] && s.stats[k].lvl < req[k]) return REQ_LABEL[k] + ' niveau ' + req[k] + ' requis';
    }

    if (req.item && !this.has(req.item)) return 'Nécessite : ' + D.ITEM[req.item].n;
    if (req.item2 && !this.has(req.item2)) return 'Nécessite : ' + D.ITEM[req.item2].n;
    if (req.flag && !s.flags[req.flag]) return 'Indisponible pour l’instant';
    if (req.period && req.period.indexOf(S.period(s).id) === -1) {
      return 'Uniquement : ' + req.period.map(function (p) { return D.PERIOD_LABEL[p]; }).join(' / ');
    }
    return null;
  };

  /* =========================================================
     4. Temps, énergie, condition
     ========================================================= */
  G.spendTime = function (hours) {
    var s = this.s;
    for (var h = 0; h < hours; h++) {
      s.hour++;
      var night = s.hour > D.DAY_END;

      s.gauges.faim = clamp(s.gauges.faim - D.DECAY.faim - (s.flags.dog ? 0.4 : 0), 0, 100);
      s.gauges.hygiene = clamp(s.gauges.hygiene - D.DECAY.hygiene, 0, 100);
      s.gauges.moral = clamp(s.gauges.moral - D.DECAY.moral, 0, 100);

      if (night) {
        s.gauges.energie = clamp(s.gauges.energie - D.NIGHT_DECAY.energie, 0, 100);
        s.gauges.moral = clamp(s.gauges.moral - D.NIGHT_DECAY.moral, 0, 100);
        s.gauges.sante = clamp(s.gauges.sante - D.NIGHT_DECAY.sante, 0, 100);
      }
      if (s.gauges.faim <= 0) s.gauges.sante = clamp(s.gauges.sante - 4.5, 0, 100);
      if (s.gauges.hygiene < 15) s.gauges.moral = clamp(s.gauges.moral - 0.6, 0, 100);
      if (s.gauges.moral <= 0) s.gauges.sante = clamp(s.gauges.sante - 1.5, 0, 100);
      if (s.flags.addict) s.gauges.moral = clamp(s.gauges.moral - 0.35 * s.flags.addict, 0, 100);
    }
  };

  G.spendEnergy = function (n) {
    var s = this.s;
    if (n <= 0) { s.gauges.energie = clamp(s.gauges.energie - n, 0, 100); return; }
    var after = s.gauges.energie - n;
    if (after < 0) {
      s.gauges.sante = clamp(s.gauges.sante + after * 0.55, 0, 100);
      this.toast('Surmenage : votre corps encaisse', 'bad');
    }
    s.gauges.energie = clamp(after, 0, 100);
  };

  G.condition = function () {
    var s = this.s, m = 1;
    if (s.gauges.energie < 20) m -= 0.20;
    if (s.gauges.faim < 20) m -= 0.15;
    if (s.gauges.moral < 25) m -= 0.15;
    if (s.gauges.moral > 75) m += 0.10;
    if (s.gauges.sante < 30) m -= 0.15;
    if (s.hour > D.DAY_END + 3) m -= 0.08;
    return clamp(m, 0.4, 1.3);
  };

  /* =========================================================
     5. Disponibilité d'une action
     ========================================================= */
  G.whenLock = function (a) {
    var w = a.when || 'day';
    if (w === 'night' && !S.isNight(this.s)) return 'Uniquement la nuit (après 22 h)';
    if (w === 'day' && S.isNight(this.s)) return 'Impossible la nuit';
    return null;
  };

  G.canDo = function (a) {
    if (this.s.over) return 'Partie terminée';
    if (this.s.jail) return 'Vous êtes incarcéré';
    var w = this.whenLock(a);
    if (w) return w;
    var r = this.checkReq(a.req);
    if (r) return r;
    if ((a.hours || 0) > S.hoursLeft(this.s)) return S.isNight(this.s) ? 'Le jour se lève bientôt' : 'Pas assez de temps aujourd’hui';
    if ((a.energy || 0) > 0 && this.s.gauges.energie < (a.energy || 0) * 0.5) return 'Vous êtes trop épuisé';
    return null;
  };

  /* =========================================================
     6. Actions de survie
     ========================================================= */
  G.doAction = function (id) {
    var a = D.ACTION[id];
    if (!a || this.canDo(a)) return;

    this.spendTime(a.hours || 0);
    this.spendEnergy(a.energy || 0);
    this.s.totals.actions++;

    var res = a.run(this) || {};
    if (res.m) this.log(res.m, res.t);

    this.afterAction(a);
  };

  G.afterAction = function (a) {
    NS.EV.maybeTrigger(a);
    this.checkMilestones();
    this.endOfDayGuard();
    this.checkEnd();
    if (!this._q) { NS.UI.refresh(); S.save(this.s); }
  };

  G.endOfDayGuard = function () {
    if (this.s.over || this.s.jail) return;
    if (this.s.hour >= D.NIGHT_END) { NS.UI.forceNight(); return; }
    if (this.s.hour >= D.DAY_END && !this.s.flags.nightPrompted) {
      this.s.flags.nightPrompted = true;
      NS.UI.nightFall();
    }
  };

  /* =========================================================
     7. Crime
     ========================================================= */
  /**
   * Résolution d'un coup.
   * opts : { charisme, intelligence, force, discretion, rue, legale, pegre,
   *          crew:[npcId], gear:{itemId:bonus} }
   */
  G.crimeRoll = function (base, opts) {
    opts = opts || {};
    var s = this.s, p = base, self = this;

    D.STAT_IDS.forEach(function (k) { if (opts[k]) p += self.lvl(k) * opts[k]; });
    ['rue', 'legale', 'pegre'].forEach(function (k) { if (opts[k]) p += s.rep[k] * opts[k]; });

    (opts.crew || []).forEach(function (id) {
      var a = s.npc[id] || 0;
      if (a >= 40) p += 8;
      if (a >= 70) p += 5;
      if (s.flags['crew' + id.charAt(0).toUpperCase() + id.slice(1)]) p += 7;
      if (a <= -20) p -= 10;
    });

    if (opts.gear) Object.keys(opts.gear).forEach(function (it) { if (self.has(it)) p += opts.gear[it]; });

    if (s.flags.lookout) p += 6;
    if (s.flags.blessed) p += 7;
    if (s.flags.addict) p -= 4 * s.flags.addict;
    p += (s.gauges.moral - 50) * 0.08;
    p -= s.heat * 0.32;
    p *= this.condition();
    p = clamp(p, 4, 94);

    var crime = this._crime;
    var heat = crime ? Math.round(crime.sentence * 0.45 + 5) : 8;
    if (s.flags.ghost) heat = Math.round(heat * 0.75);
    if (this.has('gants')) heat = Math.round(heat * 0.85);

    return { win: this.chance(p), p: p, heat: heat };
  };

  G.doCrime = function (id) {
    var c = D.CRIME[id];
    if (!c || this.canDo(c)) return;

    this.spendTime(c.hours || 0);
    this.spendEnergy(c.energy || 0);
    this.s.totals.actions++;
    if (c.cat !== 'cover') { this.s.totals.crimes++; this.hist('crime'); }

    this._crime = c;
    var res = c.run(this) || {};
    this._crime = null;

    /* Réaction des factions : le milieu apprécie, le monde propre s'inquiète */
    if (c.cat === 'mid' || c.cat === 'big') {
      this.affFaction('pegre', 1.5);
      if (this.chance(45)) this.affFaction('legal', -1.5);
    }

    if (res.m) this.log(res.m, res.t);
    this.afterAction(c);
  };

  /* --------- police --------- */
  /**
   * @param reason  motif retenu
   * @param sentence peine encourue en jours
   * @returns true si l'arrestation a eu lieu
   */
  G.arrestCheck = function (reason, sentence) {
    var s = this.s;
    sentence = sentence || 0;

    if (this._q) { this._arrest = true; return true; }   // simulation : on note et on sort

    if (s.flags.alibi) {
      s.flags.alibi = false;
      this.log('Votre alibi tient. On vous relâche après vérification.', 'good');
      return false;
    }
    if (s.flags.protected && sentence <= 30) {
      this.log('Un appel est passé. La procédure s’arrête avant d’avoir commencé.', 'good');
      return false;
    }

    var p = 20 + s.heat * 0.55 - this.lvl('discretion') * 1.5;
    if (s.flags.ghost) p -= 8;
    if (!this.chance(p)) {
      this.log('Vous filez avant l’arrivée de la police. De justesse.', 'bad');
      return false;
    }

    if (this.has('faux')) {
      this.take('faux', 1);
      this.heat(-15);
      this.log('<b>Contrôle passé avec de faux papiers.</b> Ils vous relâchent sous un autre nom.', 'good');
      NS.UI.toast('🪪 Faux papiers utilisés', 'good');
      return false;
    }
    if (s.flags.shield && this.chance(50)) {
      this.log('Maître Bellanger obtient la nullité de la garde à vue. Vous sortez libre le soir même.', 'good');
      return false;
    }

    s.totals.arrests++;

    /* Saisie de l'argent liquide et de l'argent sale */
    var seized = s.dirty;
    if (seized > 0) { s.dirty = 0; this.log('<b>' + this.eur(seized) + ' d’argent liquide saisi</b> lors de la perquisition.', 'bad'); }

    /* Calcul de la peine */
    var days = Math.round(sentence * (1 + s.casier * 0.14));
    if (s.flags.lawyer) days = Math.round(days * 0.6);
    if (s.flags.protected) days = Math.round(days * 0.5);

    s.casier += sentence >= 40 ? 2 : 1;
    this.rep('legale', -Math.min(20, 4 + sentence * 0.12));
    this.rep('rue', 3);
    this.rep('pegre', sentence >= 30 ? 4 : 1);

    if (days < 2) {
      var fine = Math.min(s.money, 40 + Math.round(s.heat));
      if (fine) this.cash(-fine, 'Amende');
      s.hour = D.DAY_END;
      this.add('moral', -22);
      this.heat(-25);
      this.log('<b>Garde à vue.</b> Vous perdez la journée' + (fine ? ' et ' + this.eur(fine) + ' d’amende' : '') + '.', 'bad');
      NS.UI.toast('🚔 Garde à vue', 'bad');
      return true;
    }

    this.jail(days, reason);
    return true;
  };

  G.clearCasier = function (n) { this.s.casier = Math.max(0, this.s.casier - n); };

  /* --------- incarcération --------- */
  G.jail = function (days, reason) {
    var s = this.s;

    if (days >= 200 || s.totals.arrests >= 8 || s.casier >= 14) {
      this.over('prison', '⛓️', 'La porte se referme',
        'Le juge énumère les faits : ' + reason + ', récidive, ' + s.casier + ' mentions au casier. ' +
        'La peine est prononcée en quarante secondes. Vous aviez amassé ' + this.eur(S.netWorth(s)) + ', ' +
        'et vous n’en verrez rien.');
      return;
    }

    s.jail = { days: days, reason: reason };
    if (s.job) { this.log('Vous perdez votre poste de ' + D.JOB[s.job.id].n + '.', 'bad'); s.job = null; }
    NS.UI.jailScreen(days, reason);
  };

  /** Purge la peine, jour par jour */
  G.serveJail = function () {
    var s = this.s;
    if (!s.jail) return;
    var days = s.jail.days, reason = s.jail.reason;
    var earned = 0, lostHome = false;

    for (var i = 0; i < days; i++) {
      s.day++;
      s.totals.jailDays++;
      s.heat = clamp(s.heat - 9, 0, 100);
      s.gauges.moral = clamp(s.gauges.moral - 1.1, 0, 100);
      s.gauges.sante = clamp(s.gauges.sante - 0.5, 0, 100);
      s.rep.rue = clamp(s.rep.rue + 0.35, 0, 100);
      s.rep.pegre = clamp(s.rep.pegre + 0.5, 0, 100);
      s.rep.legale = clamp(s.rep.legale - 0.25, 0, 100);
      if (i % 4 === 0) { s.stats.force.xp += 12; s.stats.discretion.xp += 6; }

      /* les entreprises tournent au ralenti, sans vous */
      var inc = Math.round(S.bizIncome(s) * 0.45);
      if (inc) { earned += inc; if (s.bank.open) s.bank.checking += inc; else s.money += inc; }

      /* loyer : payé depuis la banque, sinon expulsion */
      var rent = S.rent(s);
      if (rent) {
        if (s.bank.open && s.bank.checking >= rent) s.bank.checking -= rent;
        else if (s.money >= rent) s.money -= rent;
        else if (!lostHome) { s.home = 'street'; lostHome = true; }
      }
      NS.FIN.dailyTick(this, true);
      if (s.gauges.sante <= 0) break;
    }

    S.syncLevels(s);
    s.jail = null;
    s.hour = D.DAY_START;
    s.gauges.energie = 70;
    s.gauges.faim = 45;
    s.gauges.hygiene = 40;
    s.flags.nightPrompted = false;

    this.log('— SORTIE DE DÉTENTION —', 'day');
    this.log('<b>' + days + ' jours purgés</b> pour ' + reason + '. Vous ressortez avec un casier plus lourd et une réputation différente.', 'event');
    if (lostHome) this.log('Votre logement a été repris pendant votre absence. Retour au trottoir.', 'bad');
    if (earned) this.log('Vos affaires ont continué sans vous : ' + this.eur(earned) + ' encaissés.', 'money');

    this.checkEnd();
    if (!this._q) { NS.UI.refresh(); S.save(s); }
  };

  /* =========================================================
     8. Petits boulots
     ========================================================= */
  G.gigHours = function (g) {
    var t = g.hours;
    var tr = S.bestOf(this.s, 'transport', 'speed');
    if (tr && tr.speed >= 2 && t >= 4) t -= 1;
    return t;
  };

  G.doGig = function (id) {
    var g = D.GIG[id];
    if (!g) return;
    var hours = this.gigHours(g);
    if (this.canDo({ req: g.req, hours: hours, energy: g.energy, when: g.when })) return;

    this.spendTime(hours);
    this.spendEnergy(g.energy);

    var pay = Math.round(g.pay(this) * this.condition());
    this.cash(pay, g.n);
    if (g.xp) Object.keys(g.xp).forEach(function (k) { this.xp(k, g.xp[k]); }, this);
    if (g.rep) Object.keys(g.rep).forEach(function (k) { this.rep(k, g.rep[k]); }, this);
    if (g.hyg) this.add('hygiene', g.hyg);
    if (g.faim) this.add('faim', g.faim);
    this.add('moral', g.moral !== undefined ? g.moral : -2);

    this.log('<b>' + g.n + '</b> — ' + hours + ' h de travail, <b>' + this.eur(pay) + '</b> en poche.', 'money');
    this.s.totals.actions++;
    this.afterAction(g);
  };

  /* =========================================================
     9. Emploi déclaré
     ========================================================= */
  G.applyJob = function (id) {
    var j = D.JOB[id];
    if (!j || this.checkReq(j.req)) return;
    if (this.s.casier > (j.casierMax === undefined ? 99 : j.casierMax)) {
      NS.UI.toast('Votre casier judiciaire ferme cette porte', 'bad'); return;
    }
    if (S.hoursLeft(this.s) < 2) { NS.UI.toast('Trop tard pour un entretien', 'bad'); return; }

    this.spendTime(2);
    this.spendEnergy(8);

    var p = 30 + S.apparence(this.s) * 0.35 + this.lvl('charisme') * 5 + this.lvl('intelligence') * 3
      + this.s.rep.legale * 0.28 - this.s.casier * 7 - this.s.rep.rue * 0.10;
    if (this.s.flags.coached > this.s.day) p += 18;
    if (this.s.flags.nopapers) p -= 25;
    p = clamp(p * this.condition(), 5, 95);

    if (this.chance(p)) {
      this.hire(id);
      this.log('<b>Vous êtes embauché·e</b> comme ' + j.n + '. Le contrat est signé.', 'good');
      this.hist('hired');
    } else {
      this.add('moral', -8);
      this.hist('rejected');
      this.log('Entretien pour le poste de ' + j.n + '. « Nous vous rappellerons. » On ne vous rappellera pas.', 'bad');
    }
    this.afterAction(j);
  };

  G.hire = function (id, silent) {
    this.s.job = { id: id, shifts: 0 };
    this.rep('legale', 5);
    if (!silent) this.toast('🎉 Embauché·e : ' + D.JOB[id].n, 'good');
    this.milestone('firstJob', '💼 Premier emploi déclaré',
      'Vous avez un employeur, une fiche de paie, une existence administrative. La rue s’éloigne d’un pas.');
  };

  G.quitJob = function () {
    if (!this.s.job) return;
    this.log('Vous quittez votre poste de ' + D.JOB[this.s.job.id].n + '.', 'neutral');
    this.s.job = null;
    this.rep('legale', -3);
    NS.UI.refresh(); S.save(this.s);
  };

  G.doShift = function () {
    if (!this.s.job) return;
    var j = D.JOB[this.s.job.id];
    var hours = this.gigHours(j);
    if (this.canDo({ hours: hours, energy: j.energy, when: j.when })) return;
    if (this.s.gauges.hygiene < 30) { NS.UI.toast('Trop sale pour vous présenter', 'bad'); return; }

    this.spendTime(hours);
    this.spendEnergy(j.energy);
    this.s.job.shifts++;

    var seniority = 1 + Math.floor(this.s.job.shifts / 10) * 0.08;
    var pay = Math.round(j.pay * seniority * this.condition());
    var bonus = j.bonus ? Math.round(j.bonus(this) * this.condition()) : 0;

    this.cash(pay + bonus, j.n);
    Object.keys(j.xp).forEach(function (k) { this.xp(k, j.xp[k]); }, this);
    this.rep('legale', j.repLeg);
    this.add('moral', j.moral !== undefined ? j.moral : -3);
    this.add('hygiene', -6);
    this.hist('shift');

    var msg = '<b>' + j.n + '</b> — ' + hours + ' h. Salaire <b>' + this.eur(pay) + '</b>';
    msg += bonus > 0 ? ' + ' + this.eur(bonus) + ' de variable.' : (bonus < 0 ? ' ' + this.eur(bonus) + ' de malus.' : '.');
    this.log(msg, 'money');

    if (this.s.job.shifts % 10 === 0) {
      this.log('<b>Ancienneté reconnue.</b> Votre rémunération augmente de 8 %.', 'good');
      this.toast('📈 Augmentation !', 'good');
    }
    this.s.totals.actions++;
    this.afterAction(j);
  };

  /* =========================================================
     10. Formation — tronc commun puis filière post-bac.
     Le Bac et chaque niveau de filière se terminent par un examen
     (probabiliste) plutôt qu'une simple accumulation de séances :
     voir G.sitEduExam / G.sitFiliereExam.
     ========================================================= */
  var OVERSTUDY_CAP = 10;     // séances "en trop" maximum prises en compte
  var OVERSTUDY_BONUS = 2;    // % de chance gagné par séance en trop
  G.OVERSTUDY_CAP = OVERSTUDY_CAP;

  G.eduLeft = function () { return this.s.edu + 1 < D.EDU.length; };

  /**
   * Ajoute n séances au tronc commun (utilisé par les cours nocturnes et
   * les événements). Fait progresser automatiquement les niveaux SANS
   * examen (Remise à niveau, CAP) ; pour le Bac, se contente d'accumuler
   * les séances — l'examen reste un choix explicite du joueur.
   */
  G.addEduProgress = function (n) {
    var s = this.s;
    while (n > 0 && this.eduLeft()) {
      var e = D.EDU[s.edu + 1];
      if (e.exam) { s.eduProg = Math.min(s.eduProg + n, e.sessions + OVERSTUDY_CAP); n = 0; break; }
      var need = e.sessions - s.eduProg;
      if (n >= need) {
        n -= need; s.edu++; s.eduProg = 0;
        this.rep('legale', 8); this.xp('intelligence', 40);
        this.toast('🎓 Diplôme obtenu : ' + e.short, 'xp');
        this.log('<b>' + e.n + ' obtenu.</b> Une ligne de plus sur un CV qui n’existait pas.', 'good');
      } else { s.eduProg += n; n = 0; }
    }
  };

  G.study = function () {
    if (!this.eduLeft()) return;
    var s = this.s, e = D.EDU[s.edu + 1];
    var r = this.checkReq(e.req);
    if (r) { NS.UI.toast(r, 'bad'); return; }
    if (e.exam && s.eduProg >= e.sessions + OVERSTUDY_CAP) {
      NS.UI.toast('Vous maîtrisez déjà largement le programme : tentez l’examen.', 'bad'); return;
    }
    if (s.money < e.cost) { NS.UI.toast('Il faut ' + this.eur(e.cost) + ' par session', 'bad'); return; }
    if (e.hours > S.hoursLeft(s)) { NS.UI.toast('Pas assez de temps', 'bad'); return; }

    this.spendTime(e.hours);
    this.spendEnergy(e.energy);
    if (e.cost) this.cash(-e.cost, 'Formation');

    this.xp('intelligence', 14);
    this.add('moral', -2);

    if (!e.exam) {
      var before = s.edu;
      this.addEduProgress(1);
      if (s.edu === before) this.log('Session de ' + e.n + ' (' + s.eduProg + '/' + e.sessions + ').', 'neutral');
    } else {
      s.eduProg++;
      if (s.eduProg >= e.sessions) {
        this.log('Session de ' + e.n + ' (' + s.eduProg + '/' + e.sessions + '). <b>Vous pouvez tenter l’examen.</b>', 'good');
      } else {
        this.log('Session de ' + e.n + ' (' + s.eduProg + '/' + e.sessions + ').', 'neutral');
      }
    }

    s.totals.actions++;
    this.afterAction(e);
  };

  /** Chance de réussite (0-100) à l'examen d'un niveau (tronc commun ou filière) */
  G.examChance = function (level, prog, streakKey) {
    var s = this.s;
    var over = Math.min(OVERSTUDY_CAP, Math.max(0, prog - level.sessions));
    var streak = s.examStreak[streakKey] || 0;
    var p = level.examBase + this.lvl(level.stat || 'intelligence') * level.statW +
      (s.gauges.moral - 50) * 0.3 + over * OVERSTUDY_BONUS + streak * 6;
    return this.clamp(p, 6, 96);
  };

  G.canSitEduExam = function () {
    if (!this.eduLeft()) return false;
    var e = D.EDU[this.s.edu + 1];
    return !!e.exam && this.s.eduProg >= e.sessions;
  };

  G.eduExamChance = function () {
    if (!this.canSitEduExam()) return 0;
    return this.examChance(D.EDU[this.s.edu + 1], this.s.eduProg, 'bac');
  };

  G.sitEduExam = function () {
    if (!this.canSitEduExam()) return;
    var s = this.s, e = D.EDU[s.edu + 1];
    if (S.hoursLeft(s) < e.examHours) { NS.UI.toast('Pas assez de temps', 'bad'); return; }

    this.spendTime(e.examHours);
    this.spendEnergy(e.examEnergy);

    var p = this.eduExamChance();
    if (this.chance(p)) {
      s.examStreak.bac = 0;
      s.edu++; s.eduProg = 0;
      this.rep('legale', 10); this.xp('intelligence', 50); this.add('moral', 10);
      this.toast('🎓 Baccalauréat obtenu !', 'xp');
      this.log('<b>Baccalauréat obtenu.</b> Le premier vrai mur vient de tomber.', 'good');
      this.milestone('firstDiploma', '🎓 Le Baccalauréat',
        'Vous avez réussi l’examen. Une filière entière s’ouvre désormais devant vous.');
    } else {
      s.examStreak.bac = (s.examStreak.bac || 0) + 1;
      s.eduProg = Math.round(s.eduProg * 0.6);
      this.add('moral', -12); this.add('sante', -3);
      this.log('<b>Échec au baccalauréat.</b> Il faudra réviser encore avant de retenter votre chance.', 'bad');
    }
    s.totals.actions++;
    this.afterAction(e);
  };

  /** Choisit une filière post-bac — choix définitif */
  G.chooseFiliere = function (id) {
    var s = this.s, f = D.FILIERE[id];
    if (!f || s.filiere) return;
    var r = this.checkReq(f.req);
    if (r) { NS.UI.toast(r, 'bad'); return; }

    s.filiere = id; s.filiereLvl = 0; s.filiereProg = 0;
    this.rep('legale', 3);
    this.log('<b>Filière choisie : ' + f.ico + ' ' + f.n + '.</b> ' + f.d, 'good');
    this.milestone('firstFiliere', '🎓 Une voie choisie',
      'Vous vous engagez dans ' + f.n + '. C’est un choix qu’on ne refait pas.');
    if (!this._q) { NS.UI.refresh(); S.save(s); }
  };

  /** Le niveau de filière en cours d'étude, ou null si aucune filière / déjà achevée */
  G.filiereLevel = function () {
    var s = this.s;
    if (!s.filiere) return null;
    var f = D.FILIERE[s.filiere];
    if (s.filiereLvl >= f.levels.length) return null;
    return f.levels[s.filiereLvl];
  };

  G.studyFiliere = function () {
    var lvl = this.filiereLevel();
    if (!lvl) return;
    var s = this.s;
    var r = this.checkReq(lvl.req);
    if (r) { NS.UI.toast(r, 'bad'); return; }
    if (s.filiereProg >= lvl.sessions + OVERSTUDY_CAP) {
      NS.UI.toast('Vous maîtrisez déjà largement le programme : tentez l’examen.', 'bad'); return;
    }
    if (s.money < lvl.cost) { NS.UI.toast('Il faut ' + this.eur(lvl.cost) + ' par session', 'bad'); return; }
    if (lvl.hours > S.hoursLeft(s)) { NS.UI.toast('Pas assez de temps', 'bad'); return; }

    this.spendTime(lvl.hours);
    this.spendEnergy(lvl.energy);
    if (lvl.cost) this.cash(-lvl.cost, 'Frais de scolarité');

    s.filiereProg++;
    this.xp('intelligence', 16);
    this.add('moral', -2);

    if (s.filiereProg >= lvl.sessions) {
      this.log('Session de ' + lvl.n + ' (' + s.filiereProg + '/' + lvl.sessions + '). <b>Vous pouvez tenter l’examen.</b>', 'good');
    } else {
      this.log('Session de ' + lvl.n + ' (' + s.filiereProg + '/' + lvl.sessions + ').', 'neutral');
    }
    s.totals.actions++;
    this.afterAction(lvl);
  };

  G.canSitFiliereExam = function () {
    var lvl = this.filiereLevel();
    return !!lvl && this.s.filiereProg >= lvl.sessions;
  };

  G.filiereExamChance = function () {
    var lvl = this.filiereLevel();
    if (!lvl || !this.canSitFiliereExam()) return 0;
    return this.examChance(lvl, this.s.filiereProg, this.s.filiere + this.s.filiereLvl);
  };

  G.sitFiliereExam = function () {
    if (!this.canSitFiliereExam()) return;
    var s = this.s, f = D.FILIERE[s.filiere], lvl = this.filiereLevel();
    if (S.hoursLeft(s) < lvl.examHours) { NS.UI.toast('Pas assez de temps', 'bad'); return; }

    this.spendTime(lvl.examHours);
    this.spendEnergy(lvl.examEnergy);

    var key = s.filiere + s.filiereLvl;
    var p = this.filiereExamChance();
    if (this.chance(p)) {
      s.examStreak[key] = 0;
      s.filiereLvl++; s.filiereProg = 0;
      this.rep('legale', 6 + s.filiereLvl * 2); this.xp('intelligence', 30 + s.filiereLvl * 15); this.add('moral', 14);
      this.toast('🎓 ' + lvl.n + ' obtenu !', 'xp');
      this.log('<b>' + lvl.n + ' obtenu.</b> De nouveaux postes viennent de s’ouvrir.', 'good');
      this.milestone('filiere_' + s.filiere + '_' + s.filiereLvl, '🎓 ' + lvl.n,
        s.filiereLvl >= f.levels.length
          ? 'Vous achevez le parcours complet en ' + f.n + '. Le sommet de cette voie est désormais atteignable.'
          : 'Un niveau de plus en ' + f.n + '. La suite sera encore plus exigeante.');
    } else {
      s.examStreak[key] = (s.examStreak[key] || 0) + 1;
      s.filiereProg = Math.round(s.filiereProg * 0.55);
      this.add('moral', -14); this.add('sante', -4);
      this.log('<b>Échec à l’examen — ' + lvl.n + '.</b> Il faut recommencer une partie du programme.', 'bad');
    }
    s.totals.actions++;
    this.afterAction(lvl);
  };

  /* =========================================================
     11. Entreprises
     ========================================================= */
  G.ownBiz = function (id) { return this.s.biz.filter(function (b) { return b.id === id; })[0]; };

  G.buyBiz = function (id) {
    var d = D.BIZI[id];
    if (!d || this.ownBiz(id)) return;
    var r = this.checkReq(d.req);
    if (r) { NS.UI.toast(r, 'bad'); return; }
    if (this.s.money < d.cost) { NS.UI.toast('Capital insuffisant', 'bad'); return; }
    if (S.hoursLeft(this.s) < 3) { NS.UI.toast('Pas assez de temps', 'bad'); return; }

    this.spendTime(3); this.spendEnergy(12);
    this.cash(-d.cost, 'Création : ' + d.n);
    this.s.biz.push({ id: id, lvl: 1 });
    this.rep(d.legal === false ? 'pegre' : 'legale', 6);
    this.xp('intelligence', 25);
    this.log('<b>' + d.n + ' créée.</b> Vous n’êtes plus salarié de votre propre vie.', 'good');
    this.milestone('firstBiz', '🚀 Premier entrepreneur',
      'Vous possédez une entreprise. À partir d’ici, votre argent travaille aussi la nuit.');
    this.afterAction(d);
  };

  G.grantBiz = function (id, lvl) {
    var b = this.ownBiz(id);
    if (b) { b.lvl = Math.max(b.lvl, lvl); return; }
    this.s.biz.push({ id: id, lvl: lvl });
  };

  G.bizUpCost = function (b) {
    var d = D.BIZI[b.id];
    return Math.round(d.cost * 0.65 * Math.pow(1.55, b.lvl));
  };

  G.upgradeBiz = function (id) {
    var b = this.ownBiz(id); if (!b) return;
    var d = D.BIZI[id];
    if (b.lvl >= d.maxLvl) { NS.UI.toast('Niveau maximum atteint', 'bad'); return; }
    var cost = this.bizUpCost(b);
    if (this.s.money < cost) { NS.UI.toast('Il faut ' + this.eur(cost), 'bad'); return; }
    if (S.hoursLeft(this.s) < 2) { NS.UI.toast('Pas assez de temps', 'bad'); return; }

    this.spendTime(2); this.spendEnergy(10);
    this.cash(-cost, 'Développement');
    b.lvl++;
    this.xp('intelligence', 12); this.xp('charisme', 6);
    this.log('<b>' + d.n + '</b> passe au niveau ' + b.lvl + '. Revenus quotidiens en hausse.', 'good');
    this.afterAction(d);
  };

  G.sellBiz = function (id) {
    var b = this.ownBiz(id); if (!b) return;
    var d = D.BIZI[id];
    var price = Math.round(d.cost * b.lvl * 0.7);
    this.s.biz = this.s.biz.filter(function (x) { return x.id !== id; });
    this.cash(price, 'Cession : ' + d.n);
    this.log('Vous cédez <b>' + d.n + '</b> pour ' + this.eur(price) + '.', 'money');
    NS.UI.refresh(); S.save(this.s);
  };

  /* =========================================================
     12. Boutique & inventaire
     ========================================================= */
  G.buyItem = function (id, useDirty) {
    var it = D.ITEM[id]; if (!it) return;
    if (it.keep && this.has(id)) { NS.UI.toast('Vous le possédez déjà', 'bad'); return; }
    var r = this.checkReq(it.req);
    if (r) { NS.UI.toast(r, 'bad'); return; }

    if (useDirty) {
      if (this.s.dirty < it.price) { NS.UI.toast('Argent sale insuffisant', 'bad'); return; }
      this.dirtyCash(-it.price, it.n);
    } else {
      if (this.s.money < it.price) { NS.UI.toast('Argent insuffisant', 'bad'); return; }
      this.cash(-it.price, it.n);
    }
    this.s.inv[id] = (this.s.inv[id] || 0) + 1;
    this.log('Achat : ' + it.ico + ' <b>' + it.n + '</b> — ' + this.eur(it.price) + '.', 'money');
    NS.UI.refresh(); S.save(this.s);
  };

  G.sellItem = function (id) {
    var it = D.ITEM[id]; if (!it || !this.has(id)) return;
    var price = Math.round(it.price * (it.cat === 'luxe' ? 0.9 : 0.5));
    this.take(id, 1);
    this.cash(price, 'Revente');
    this.log('Vous revendez ' + it.n + ' pour ' + this.eur(price) + '.', 'money');
    NS.UI.refresh(); S.save(this.s);
  };

  G.useItem = function (id) {
    var it = D.ITEM[id];
    if (!it || !it.use || !this.has(id)) return;
    Object.keys(it.use).forEach(function (k) {
      if (k === 'xp') { this.xp(it.use.xp[0], it.use.xp[1]); return; }
      this.add(k, it.use[k]);
    }, this);
    if (id === 'alcool' && this.chance(20)) this.flag('addict', (this.s.flags.addict || 0) + 1);
    this.take(id, 1);
    this.log('Vous utilisez ' + it.ico + ' <b>' + it.n + '</b>.', 'good');
    this.checkEnd();
    NS.UI.refresh(); S.save(this.s);
  };

  /* =========================================================
     13. Logement
     ========================================================= */
  G.moveHome = function (id) {
    var h = D.HOME[id];
    if (!h || this.s.home === id) return;
    var req = h.req;
    if (id === 'squat' && this.s.flags.squatOk) req = {};
    var r = this.checkReq(req);
    if (r) { NS.UI.toast(r, 'bad'); return; }
    var dep = this.s.flags.noDeposit ? 0 : h.deposit;
    if (this.s.money < dep) { NS.UI.toast('Caution de ' + this.eur(dep) + ' exigée', 'bad'); return; }

    if (dep) this.cash(-dep, 'Caution');
    var was = this.s.home;
    this.s.home = id;
    this.log('Vous emménagez : ' + h.ico + ' <b>' + h.name + '</b>.', 'good');
    if (was === 'street' && id !== 'street') {
      this.milestone('firstRoof', '🔑 Un toit',
        'Pour la première fois, vous fermez une porte derrière vous. Le sommeil ne sera plus jamais le même.');
    }
    NS.UI.refresh(); S.save(this.s);
  };

  /* =========================================================
     14. Relations
     ========================================================= */
  G.npcLock = function (n) {
    if (!n.lock) return null;
    return this.checkReq(n.lock);
  };

  G.talk = function (npcId) {
    if (S.hoursLeft(this.s) < 1) { NS.UI.toast('Plus de temps disponible', 'bad'); return; }
    var n = D.NPC[npcId];
    this.spendTime(1); this.spendEnergy(4);
    this.s.npcMet[npcId] = this.s.day;

    var aff = this.affVal(npcId);
    var gain = 3 + this.lvl('charisme') * 1.2 + (S.apparence(this.s) > 50 ? 2 : 0);
    if (this.s.gauges.hygiene < 25) gain *= 0.5;
    if (aff < -25) gain *= 0.4;               // difficile de rattraper quelqu'un qui vous en veut
    if (aff > 70) gain *= 0.6;                // et de progresser quand on est déjà très proche
    gain = Math.round(gain);

    this.aff(npcId, gain);
    this.xp('charisme', 4);
    this.add('moral', aff < -25 ? -2 : 4);

    var topic = n.topics ? this.pick(n.topics) : ('Vous discutez avec ' + n.n + '.');
    this.log(topic + ' <b>Affinité +' + gain + '</b>.', 'good');
    this.checkQuestOffer(npcId);
    this.afterAction(n);
  };

  G.gift = function (npcId, amount) {
    if (this.s.money < amount) { NS.UI.toast('Argent insuffisant', 'bad'); return; }
    var n = D.NPC[npcId];
    this.cash(-amount, 'Cadeau à ' + n.n);
    this.s.npcMet[npcId] = this.s.day;
    var gain = Math.round(4 + Math.pow(amount, 0.45) * 1.6 + this.lvl('charisme') * 0.6);
    this.aff(npcId, gain);
    this.add('moral', 2);
    this.log('Vous offrez ' + this.eur(amount) + ' à <b>' + n.n + '</b>. Affinité +' + gain + '.', 'good');
    this.checkQuestOffer(npcId);
    NS.UI.refresh(); S.save(this.s);
  };

  G.helpNpc = function (npcId) {
    if (S.hoursLeft(this.s) < 3) { NS.UI.toast('Plus assez de temps', 'bad'); return; }
    var n = D.NPC[npcId];
    this.spendTime(3); this.spendEnergy(18);
    this.s.npcMet[npcId] = this.s.day;
    var gain = 12 + this.lvl('charisme');
    this.aff(npcId, gain);
    this.xp('charisme', 6); this.xp('force', 4);
    this.add('moral', 5);
    this.log('Vous rendez service à <b>' + n.n + '</b> pendant trois heures. Affinité +' + gain + '.', 'good');
    this.checkQuestOffer(npcId);
    this.afterAction(n);
  };

  /** Trahir un personnage : gain immédiat, relation détruite */
  G.betray = function (npcId) {
    var n = D.NPC[npcId];
    var aff = this.affVal(npcId);
    if (aff < 30) { NS.UI.toast('Il n’y a rien à trahir', 'bad'); return; }
    var gain = Math.round(aff * 40 + this.rnd(200, 800));
    this.dirtyCash(gain, 'Trahison');
    this.aff(npcId, -100);
    this.affFaction(n.faction, -12);
    this.hist('betray');
    this.add('moral', -20);
    this.log('<b>Vous vendez ' + n.n + '.</b> ' + this.eur(gain) + ' d’argent sale, et un pont brûlé pour toujours.', 'bad');
    NS.UI.refresh(); S.save(this.s);
  };

  G.favor = function (npcId, favId) {
    var n = D.NPC[npcId];
    var f = n.favors.filter(function (x) { return x.id === favId; })[0];
    if (!f) return;
    if (this.affVal(npcId) < f.aff) { NS.UI.toast('Affinité insuffisante', 'bad'); return; }
    if (this.s.flags['fav_' + npcId + '_' + favId]) { NS.UI.toast('Déjà obtenu', 'bad'); return; }

    var msg = f.run(this);
    if (msg === null) { NS.UI.toast('Conditions non réunies', 'bad'); return; }
    this.s.flags['fav_' + npcId + '_' + favId] = true;
    this.aff(npcId, -10);
    this.s.npcMet[npcId] = this.s.day;
    this.log('<b>' + n.n + '</b> : ' + msg, 'event');
    this.checkEnd();
    NS.UI.refresh(); S.save(this.s);
  };

  /* --------- quêtes --------- */
  G.hasQuest = function (npcId) {
    return this.s.quests.filter(function (q) { return q.npc === npcId; })[0];
  };

  G.checkQuestOffer = function (npcId) {
    var n = D.NPC[npcId];
    if (!n.quest || this._q) return;
    var q = n.quest;
    if (this.s.flags['quest_' + q.id]) return;
    if (this.affVal(npcId) < q.aff) return;
    if (this.hasQuest(npcId)) return;

    this.s.flags['quest_' + q.id] = 'active';
    this.s.quests.push({ npc: npcId, id: q.id, due: this.s.day + q.days });
    NS.UI.questOffer(n, q, this.s.day + q.days);
  };

  G.resolveQuests = function () {
    var s = this.s, self = this;
    s.quests = s.quests.filter(function (aq) {
      var n = D.NPC[aq.npc], q = n.quest;
      if (q.check(self)) {
        s.flags['quest_' + q.id] = 'done';
        var m = q.onDone(self);
        self.log('<b>' + q.ico + ' ' + q.n + ' — accompli.</b> ' + m, 'good');
        if (!self._q) NS.UI.toast('✅ ' + q.n, 'good');
        return false;
      }
      if (s.day > aq.due) {
        s.flags['quest_' + q.id] = 'failed';
        var f = q.onFail(self);
        self.log('<b>' + q.ico + ' ' + q.n + ' — échoué.</b> ' + f, 'bad');
        if (!self._q) NS.UI.toast('❌ ' + q.n, 'bad');
        return false;
      }
      return true;
    });
  };

  /** Érosion des relations laissées sans nouvelles */
  G.decayRelations = function () {
    var s = this.s, self = this;
    D.NPCS.forEach(function (n) {
      var last = s.npcMet[n.id] || 0;
      var idle = s.day - last;
      if (idle > 4 && s.npc[n.id] > 0) {
        s.npc[n.id] = clamp(s.npc[n.id] - (n.decay || 0.5), 0, 100);
      }
      /* les rancunes s'apaisent très lentement */
      if (s.npc[n.id] < 0) s.npc[n.id] = clamp(s.npc[n.id] + 0.15, -100, 100);
    });
    /* la pègre n'aime pas les honnêtes gens, et réciproquement */
    if (s.rep.pegre > 55) self.affFaction('legal', -0.3);
    if (s.rep.legale > 65 && s.rep.pegre > 0) self.affFaction('pegre', -0.3);
  };

  G.clearStreetDebt = function () {
    delete this.s.flags.debt; delete this.s.flags.debtDue;
    delete this.s.flags.cardDebt;
  };

  /* =========================================================
     15. Nuit
     ========================================================= */
  G.sleep = function () {
    var s = this.s;
    if (s.over || s.jail) return;
    var h = S.home(s);
    var lines = [];

    s.totals.nights++;
    var nightHours = S.nightHours(s);

    /* --- loyer --- */
    var rent = S.rent(s);
    if (s.flags.freeShelter > 0 && h.id === 'shelter') {
      s.flags.freeShelter--; rent = 0;
      lines.push('Place gratuite au foyer (' + s.flags.freeShelter + ' nuit(s) restante(s)).');
    }
    if (rent > 0) {
      if (s.money >= rent) { this.cash(-rent, 'Loyer'); lines.push('Loyer réglé : ' + this.eur(rent) + '.'); }
      else if (s.bank.open && s.bank.checking >= rent) { s.bank.checking -= rent; lines.push('Loyer prélevé sur le compte : ' + this.eur(rent) + '.'); }
      else {
        s.home = 'street'; this.add('moral', -20);
        lines.push('<b>Expulsion.</b> Impossible de payer ' + this.eur(rent) + '. Retour au trottoir.');
        h = S.home(s);
      }
    }

    /* --- revenus --- */
    var inc = S.bizIncome(s);
    if (inc > 0) { this.cash(inc, 'Entreprises'); lines.push('Vos entreprises rapportent ' + this.eur(inc) + '.'); }
    var dinc = S.bizDirtyIncome(s);
    if (dinc > 0) {
      this.dirtyCash(dinc, 'Réseau');
      var extraHeat = 0;
      s.biz.forEach(function (b) { var d = D.BIZI[b.id]; if (d && d.heat) extraHeat += d.heat; });
      this.heat(extraHeat);
      lines.push('Votre réseau rapporte ' + this.eur(dinc) + ' d’argent sale. Pression policière +' + extraHeat + '.');
    }

    /* --- banque, crédits, marché --- */
    NS.FIN.dailyTick(this, false, lines);

    /* --- dettes de rue --- */
    this.tickStreetDebts(lines);

    /* --- qualité du sommeil --- */
    var q = h.sleep;
    if (h.id === 'street' || h.id === 'squat' || h.id === 'tent') {
      if (this.has('duvet')) q += 20; else if (this.has('carton')) q += 9;
      if (s.flags.streetNet) q += 6;
    }
    if (s.flags.shelteredNight) { q += 14; s.flags.shelteredNight = false; }
    if (s.gauges.faim < 20) q -= 12;
    if (s.gauges.sante < 30) q -= 8;
    q -= nightHours * 6;                        // la nuit blanche se paie
    q = clamp(q, 5, 100);

    if (nightHours > 0) lines.push('Vous avez veillé ' + nightHours + ' h. Le sommeil sera court.');

    s.gauges.energie = clamp(s.gauges.energie + q, 0, 100);
    this.set('faim', s.gauges.faim - 16);
    this.set('hygiene', s.gauges.hygiene - 5);
    s.gauges.moral = clamp(s.gauges.moral + h.moral + (q > 80 ? 5 : 0), 0, 100);

    if (s.gauges.faim > 25) s.gauges.sante = clamp(s.gauges.sante + q / 16, 0, 100);
    else { s.gauges.sante = clamp(s.gauges.sante - 6, 0, 100); lines.push('Vous vous endormez le ventre vide.'); }

    /* --- aléas nocturnes --- */
    var risk = h.risk * (s.flags.shelteredNight ? 0.4 : 1);
    if (nightHours > 0) risk += 0.06;
    if (risk && this.chance(risk * 100)) lines.push(this.nightHazard(h));

    /* --- compagnons & dépendances --- */
    if (s.flags.dog) { s.gauges.moral = clamp(s.gauges.moral + 5, 0, 100); }
    if (s.flags.addict) {
      s.gauges.sante = clamp(s.gauges.sante - 2 * s.flags.addict, 0, 100);
      s.gauges.moral = clamp(s.gauges.moral - 3, 0, 100);
      if (this.chance(12)) { s.flags.addict = Math.max(0, s.flags.addict - 1); if (!s.flags.addict) lines.push('Vous n’avez plus rien pris depuis longtemps. Le manque a lâché prise.'); }
    }

    /* --- passage au jour suivant --- */
    s.day++;
    s.hour = D.DAY_START;
    s.flags.nightPrompted = false;
    var cool = 7 + (h.cool || 0) + (s.flags.ghost ? 5 : 0);
    s.heat = clamp(s.heat - cool, 0, 100);

    this.decayRelations();
    this.resolveQuests();

    this.log('— JOUR ' + s.day + ' —', 'day');
    lines.filter(Boolean).reverse().forEach(function (l) { this.log(l, 'event'); }, this);

    NS.EV.firePending();
    NS.EV.nightEvent();
    this.checkMilestones();
    this.checkEnd();
    if (!this._q) { NS.UI.refresh(); S.save(s); }
  };

  G.nightHazard = function (h) {
    var s = this.s;
    var e = this.rnd(1, 100);
    if (e <= 32 && !this.has('sac')) {
      var loss = Math.min(s.money, this.rnd(10, 60) + Math.round(s.money * 0.05));
      if (loss > 0) { this.cash(-loss, 'Vol'); return '<b>On vous a fait les poches pendant votre sommeil</b> : −' + this.eur(loss) + '.'; }
      return 'On a fouillé vos affaires. Il n’y avait rien à prendre.';
    }
    if (e <= 58) { this.add('sante', -9); this.add('moral', -6); return 'Nuit glaciale. Vous vous réveillez fiévreux.'; }
    if (e <= 76) { this.heat(6); this.add('energie', -18); return 'Contrôle de police à 4 h du matin. On vous demande de circuler.'; }
    if (e <= 88) { this.add('sante', -16); this.add('moral', -12); return '<b>Vous vous faites agresser dans la nuit.</b>'; }
    if (e <= 95 && s.dirty > 200) {
      var d = Math.round(s.dirty * this.rndF(0.2, 0.5));
      s.dirty -= d;
      return '<b>On savait que vous aviez du liquide.</b> ' + this.eur(d) + ' d’argent sale disparaît.';
    }
    this.add('moral', -8);
    return 'Des cris toute la nuit dans la rue d’à côté. Vous ne fermez pas l’œil.';
  };

  G.tickStreetDebts = function (lines) {
    var s = this.s;
    if (s.flags.debt && s.day >= s.flags.debtDue) {
      if (s.money >= s.flags.debt) {
        this.cash(-s.flags.debt, 'Remboursement');
        lines.push('Vous remboursez Karim. On vous serre la main.');
        delete s.flags.debt; delete s.flags.debtDue;
      } else {
        this.add('sante', -30); this.add('moral', -25);
        this.aff('karim', -20);
        s.flags.debtDue = s.day + 6;
        s.flags.debt = Math.round(s.flags.debt * 1.25);
        lines.push('<b>Vous ne pouviez pas payer.</b> On vous l’a fait comprendre. Dette portée à ' + this.eur(s.flags.debt) + '.');
      }
    }
    if (s.flags.renardDebt && s.day >= s.flags.renardDue) {
      if (s.money >= s.flags.renardDebt) {
        this.cash(-s.flags.renardDebt, 'Remboursement');
        this.aff('renard', 20);
        lines.push('Vous rendez son argent à Mme Renard. Elle ne compte même pas.');
        delete s.flags.renardDebt; delete s.flags.renardDue;
      } else {
        this.aff('renard', -35);
        s.flags.renardDue = s.day + 10;
        lines.push('Mme Renard n’a rien dit. C’est bien pire.');
      }
    }
    if (s.flags.cardDebt && this.chance(20)) {
      if (s.money >= s.flags.cardDebt) {
        this.cash(-s.flags.cardDebt, 'Dette de jeu');
        lines.push('On est passé encaisser votre dette de jeu.');
        delete s.flags.cardDebt;
      } else {
        this.add('sante', -18);
        s.flags.cardDebt = Math.round(s.flags.cardDebt * 1.3);
        lines.push('<b>On est venu réclamer la dette de jeu.</b> Vous ne pouviez pas payer.');
      }
    }
    if (s.flags.karimStock && s.day > s.flags.karimStock && this.has('came')) {
      this.aff('karim', -18); s.flags.karimStock = 0;
      lines.push('Karim voulait son argent aujourd’hui. Vous avez encore le stock.');
    }
  };

  /* =========================================================
     16. Jalons & fins
     ========================================================= */
  G.milestone = function (id, title, text) {
    if (this._q || this.s.milestones[id]) return;
    this.s.milestones[id] = true;
    NS.UI.milestone(title, text);
    this.log('<b>' + title + '</b> — ' + text, 'event');
  };

  G.checkMilestones = function () {
    if (this._q || this.s.over) return;
    var nw = S.netWorth(this.s), self = this;
    D.MILES.forEach(function (m) { if (nw >= m.at) self.milestone(m.id, m.t, m.x); });
  };

  G.over = function (type, ico, title, text) {
    if (this._q || this.s.over) return;
    this.s.over = { type: type, ico: ico, title: title, text: text };
    this.log('<b>' + title + '</b>', type === 'win' ? 'good' : 'bad');
    S.save(this.s);
    NS.UI.gameOver();
  };

  G.checkEnd = function () {
    var s = this.s;
    if (this._q || s.over) return;

    if (s.gauges.sante <= 0) {
      this.over('death', '🕯️', 'Fin de parcours',
        'Le ' + s.day + 'e jour, votre corps a cessé de suivre. On vous retrouve au petit matin. ' +
        'Le journal ne mentionnera rien. Vous aviez amassé ' + this.eur(S.netWorth(s)) + '.');
      return;
    }
    if (S.netWorth(s) >= D.WIN_NET) {
      var honest = this.hist('crime', 0) === 0;
      this.over('win', '👑', 'Au sommet',
        'Le million est atteint en ' + s.day + ' jours' + (honest ? ', sans un seul délit' : '') + '. ' +
        'Depuis la baie vitrée, vous distinguez le trottoir où tout a commencé. ' +
        'Quelqu’un y dort ce soir. Vous savez exactement ce qu’il lui faudrait.');
    }
  };

  /* =========================================================
     17. Amorçage
     ========================================================= */
  G.attach = function (state) { G.s = state; return G; };

  NS.G = G;
})(window.LifeRPG);
