/* =============================================================
   gangs.js — Appartenance, missions, échelons, sortie.

   Entrer est facile ; monter demande des missions réussies ;
   sortir se paie. Le gang prélève sa part sur vos coups, vous
   couvre un peu, et vous expose à ses rivaux.
   ============================================================= */
(function (NS) {
  'use strict';

  var D = NS.D, S = NS.S, G = NS.G;
  var clamp = G.clamp;

  /* =========================================================
     1. Lecture de l'appartenance
     ========================================================= */
  G.gang = function () {
    var g = this.s.gang;
    return g ? D.GANG[g.id] : null;
  };

  G.gangRank = function () {
    var gang = this.gang();
    if (!gang) return null;
    return gang.ranks[this.s.gang.rank] || gang.ranks[0];
  };

  G.gangNextRank = function () {
    var gang = this.gang();
    if (!gang) return null;
    return gang.ranks[this.s.gang.rank + 1] || null;
  };

  G.gangLock = function (gang) {
    var s = this.s;
    if (s.jail) return 'Vous êtes incarcéré';
    if (s.hospital) return 'Vous êtes hospitalisé';
    if (s.gang && s.gang.id === gang.id) return 'Vous en faites déjà partie';
    if (s.gang) return 'Vous appartenez déjà ' + D.gangDe(D.GANG[s.gang.id]) + '.';
    if (s.flags.gangBan && s.flags.gangBan[gang.id] > s.day) {
      return 'Ils ne veulent plus de vous (' + (s.flags.gangBan[gang.id] - s.day) + ' j)';
    }
    return this.checkReq(gang.joinReq);
  };

  /* =========================================================
     2. Entrer et sortir
     ========================================================= */
  G.joinGang = function (id) {
    var gang = D.GANG[id];
    if (!gang) return;
    var lock = this.gangLock(gang);
    if (lock) { NS.UI.toast(lock, 'bad'); return; }

    var s = this.s;
    s.gang = { id: id, rank: 0, missions: 0, loyalty: 50, since: s.day, failed: 0 };
    this.rep('pegre', 6);
    this.rep('legale', -5);
    this.affFaction('pegre', 6);
    this.affFaction('legal', -4);

    /* le gang rival vous met immédiatement sur sa liste */
    if (gang.rival) {
      if (!s.flags.gangEnemy) s.flags.gangEnemy = {};
      s.flags.gangEnemy[gang.rival] = true;
    }

    this.log('<b>Vous entrez chez ' + gang.ico + ' ' + gang.n + '.</b> ' +
      'On vous explique deux règles et on vous donne un surnom.', 'event');
    if (!this._q) NS.UI.flash('🤝 Vous rejoignez ' + gang.n, 'good');
    this.milestone('gang', '🕶️ Une famille de substitution',
      'Vous n’êtes plus seul, et vous n’êtes plus libre. C’est le même contrat.');
    NS.UI.refresh(); S.save(s);
  };

  /** Quitter : ça se négocie, ça se paie, ou ça se paie autrement */
  G.leaveGang = function (mode) {
    var s = this.s;
    var gang = this.gang();
    if (!gang) return;
    var rank = this.s.gang.rank;
    var price = Math.round(2000 * (1 + rank * 0.9) * (1 + this.s.gang.missions * 0.03));

    if (mode === 'pay') {
      if (!this.spend(price, 'Rachat de sortie')) { NS.UI.toast('Il faut ' + this.eur(price), 'bad'); return; }
      this.rep('pegre', -10);
      this.log('<b>Vous rachetez votre sortie</b> pour ' + this.eur(price) + '. On vous serre la main sans chaleur.', 'event');
      if (!this._q) NS.UI.flash('🚪 Vous quittez ' + gang.n, 'good');
      s.gang = null;
      NS.UI.refresh(); S.save(s); return;
    }

    if (mode === 'talk') {
      var p = clamp(20 + this.lvl('charisme') * 5 + this.s.gang.loyalty * 0.3 - rank * 8, 5, 85);
      if (this.chance(p)) {
        this.rep('pegre', -6);
        this.log('<b>On vous laisse partir.</b> Vous avez servi correctement, et vous le dites bien.', 'event');
        if (!this._q) NS.UI.flash('🚪 Sortie négociée', 'good');
        s.gang = null;
      } else {
        this.add('sante', -18); this.rep('pegre', -12);
        this.s.gang.loyalty = Math.max(0, this.s.gang.loyalty - 25);
        this.log('« On ne démissionne pas. » La discussion se termine mal.', 'bad');
        if (!this._q) NS.UI.flash('❌ Sortie refusée', 'bad');
      }
      NS.UI.refresh(); S.save(s); return;
    }

    /* partir en claquant la porte */
    this.rep('pegre', -25);
    this.affFaction('pegre', -20);
    if (!s.flags.gangBan) s.flags.gangBan = {};
    s.flags.gangBan[gang.id] = s.day + 200;
    s.flags.hunted = s.day + this.rnd(20, 45);
    this.add('sante', -25);
    this.log('<b>Vous partez sans prévenir.</b> Ils vous retrouveront, et ils prendront leur temps.', 'bad');
    if (!this._q) NS.UI.flash('🩸 Recherché par ' + gang.n, 'bad');
    s.gang = null;
    NS.UI.refresh(); S.save(s);
  };

  /* =========================================================
     3. Missions
     ========================================================= */
  /** Missions ouvertes à votre échelon */
  G.gangMissions = function () {
    var s = this.s;
    if (!s.gang) return [];
    return D.GANG_MISSIONS.filter(function (m) { return m.tier <= s.gang.rank; });
  };

  G.missionLock = function (m) {
    var s = this.s;
    if (!s.gang) return 'Vous n’appartenez à aucun gang';
    if (s.jail) return 'Vous êtes incarcéré';
    if (s.hospital) return 'Vous êtes hospitalisé';
    if (m.tier > s.gang.rank) return 'Réservé au grade ' + (D.GANG[s.gang.id].ranks[m.tier] || {}).n;
    if (m.hours > S.hoursLeft(s)) return 'Pas assez de temps';
    if (s.gauges.energie < m.energy * 0.5) return 'Vous êtes trop épuisé';
    if (s.flags.missionDone === s.day) return 'Vous avez déjà fait votre part aujourd’hui';
    return null;
  };

  /** Chance de réussir une mission */
  G.missionChance = function (m) {
    var s = this.s;
    var p = m.base + this.lvl(m.stat) * 3.4 + s.rep.pegre * 0.12 + s.gang.rank * 3;
    p += (s.gauges.moral - 50) * 0.06;
    p -= s.heat * 0.18;
    if (s.flags.blessed) p += 5;
    if (s.flags.addict) p -= 4 * s.flags.addict;
    p *= this.condition();
    return clamp(p, 6, 94);
  };

  /** Gain d'une mission, échelonné par le grade */
  G.missionPay = function (m) {
    var rank = this.gangRank();
    return Math.round(m.pay * (rank ? rank.pay : 1) * this.rndF(0.9, 1.25));
  };

  G.doMission = function (id) {
    var m = D.GANG_MISSION[id];
    if (!m) return;
    var lock = this.missionLock(m);
    if (lock) { NS.UI.toast(lock, 'bad'); return; }

    var s = this.s, gang = this.gang();
    this.spendTime(m.hours);
    this.spendEnergy(m.energy);
    s.totals.actions++;
    s.totals.crimes++;
    this.hist('crime'); this.hist('gangMission');
    s.flags.missionDone = s.day;

    var p = this.missionChance(m);
    var pay = this.missionPay(m);

    if (this.chance(p)) {
      s.gang.missions++;
      s.gang.loyalty = Math.min(100, s.gang.loyalty + 6);
      this._noCut = true;
      this.dirtyCash(pay, gang.n + ' — ' + m.n);
      this._noCut = false;
      this.rep('pegre', 2 + m.tier);
      this.rep('rue', 1);
      this.rep('legale', -1.5);
      this.heat(4 + m.tier * 3);
      this.xp(m.stat, 10 + m.tier * 4);
      this.log('<b>' + m.ico + ' ' + m.n + '</b> — mission accomplie pour ' + gang.n +
        '. <b>' + this.eur(pay) + '</b> d’argent sale.', 'money');
      if (!this._q) NS.UI.flash('✅ Mission réussie — ' + this.eur(pay), 'good');
      this.checkPromotion();
    } else {
      s.gang.failed++;
      s.gang.loyalty = Math.max(0, s.gang.loyalty - 12);
      this.heat(10 + m.tier * 5);
      this.add('moral', -10);
      this.log('<b>' + m.ico + ' ' + m.n + '</b> — la mission échoue. ' + gang.n + ' le saura.', 'bad');
      if (!this._q) NS.UI.flash('❌ Mission ratée', 'bad');

      /* on se blesse en travaillant pour eux */
      if (this.chance(m.hurt * 100)) {
        var sev = m.hurt > 0.3 ? 2 : 1;
        this.add('sante', -20 - m.tier * 6);
        if (this.gauge('sante') < 25 && this.chance(60)) {
          this.hospitalize(sev, 'blessures reçues en mission');
        }
      }
      /* et la police n'est jamais loin d'un travail bâclé */
      if (this.chance(45)) this.arrestCheck(m.n.toLowerCase() + ' — pour le compte d’un tiers', m.sentence);

      /* trop d'échecs et on vous met dehors */
      if (s.gang && s.gang.failed >= 4) {
        this.log('<b>' + gang.n + ' vous écarte.</b> On ne garde pas ceux qui ratent.', 'bad');
        if (!this._q) NS.UI.flash('🚪 Exclu ' + D.gangDe(gang), 'bad');
        if (!s.flags.gangBan) s.flags.gangBan = {};
        s.flags.gangBan[gang.id] = s.day + 60;
        this.rep('pegre', -8);
        s.gang = null;
      }
    }
    this.afterAction(m);
  };

  /** Promotion : missions faites + réputation suffisante */
  G.checkPromotion = function () {
    var s = this.s;
    var gang = this.gang();
    if (!gang) return;
    var next = this.gangNextRank();
    if (!next) return;
    if (s.gang.missions < next.missions) return;
    if (s.rep.pegre < next.pegre) return;

    s.gang.rank++;
    s.gang.loyalty = Math.min(100, s.gang.loyalty + 10);
    this.rep('pegre', 4);
    this.add('moral', 14);
    this.log('<b>Promotion chez ' + gang.n + ' : ' + next.n + '.</b> ' + next.perk, 'good');
    if (!this._q) NS.UI.flash('⭐ ' + next.n + ' — ' + gang.n, 'good');
    this.milestone('gangrank' + s.gang.rank, '⭐ ' + next.n,
      'Vous montez chez ' + gang.n + '. ' + next.perk);
  };

  /* =========================================================
     4. Effets permanents de l'appartenance
     ========================================================= */
  /** Bonus de réussite appliqué aux coups de la spécialité du gang */
  G.gangCrimeBonus = function (crime) {
    var gang = this.gang();
    if (!gang || !crime || !gang.bonus) return 0;
    if (gang.bonus.cats.indexOf(crime.cat) === -1) return 0;
    /* le bonus n'est acquis qu'à partir du grade qui le mentionne */
    return this.s.gang.rank >= 2 ? gang.bonus.success : Math.round(gang.bonus.success * 0.4);
  };

  /** Part que le gang prélève sur vos gains illégaux personnels */
  G.gangCut = function (amount) {
    var gang = this.gang();
    if (!gang || amount <= 0) return 0;
    return Math.round(amount * gang.cut);
  };

  /** Passage quotidien : loyauté, protection, rivalités */
  G.tickGang = function (lines) {
    var s = this.s;
    if (!s.gang) {
      /* si vous êtes parti par la porte de derrière, on vous cherche */
      if (s.flags.hunted && s.flags.hunted > s.day && this.chance(12)) {
        this.add('sante', -this.rnd(10, 25));
        lines.push('<b>On vous a retrouvé.</b> Ils ne cherchaient pas à discuter.');
        if (this.gauge('sante') < 20 && this.chance(50)) this.hospitalize(2, 'représailles');
      }
      return;
    }

    var gang = this.gang();
    var rank = this.gangRank();

    /* la loyauté s'érode si on ne fait rien pour eux */
    var idle = s.day - (s.flags.missionDone || s.gang.since);
    if (idle > 6) {
      s.gang.loyalty = Math.max(0, s.gang.loyalty - 2);
      if (s.gang.loyalty <= 10 && this.chance(25)) {
        lines.push('<b>' + gang.n + ' s’impatiente.</b> On vous rappelle que l’appartenance se mérite.');
        this.rep('pegre', -2);
      }
      if (s.gang.loyalty <= 0) {
        lines.push('<b>' + gang.n + ' vous raye de ses listes.</b> Vous ne serviez plus à rien.');
        if (!s.flags.gangBan) s.flags.gangBan = {};
        s.flags.gangBan[gang.id] = s.day + 45;
        this.rep('pegre', -6);
        s.gang = null;
        return;
      }
    }

    /* protection selon le grade */
    if (s.gang.rank >= 4 && gang.id === 'reseau' && s.day % 7 === 0) {
      var drop = Math.round(s.heat * 0.5);
      if (drop > 0) { this.heat(-drop); lines.push('Le Réseau fait retomber la pression : −' + drop + '.'); }
    }

    /* le gang rival vous cherche */
    if (gang.rival && this.chance(4 + s.gang.rank * 1.5)) {
      var hurtP = 45 - this.lvl('force') * 3 - s.gang.rank * 3;
      if (this.chance(clamp(hurtP, 8, 70))) {
        this.add('sante', -this.rnd(8, 20));
        lines.push('<b>Accrochage avec ' + D.GANG[gang.rival].n + '.</b> Vous en sortez marqué.');
      } else {
        this.rep('pegre', 2); this.rep('rue', 2);
        lines.push('Une bande rivale vous cherche. Ils repartent avec plus de dégâts que vous.');
      }
    }
  };

  NS.GANGS = true;
})(window.LifeRPG);
