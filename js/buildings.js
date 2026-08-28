/* =============================================================
   buildings.js — La ville : commerces, vol à l'étalage, casino.
   Étend l'API G.
   ============================================================= */
(function (NS) {
  'use strict';

  var D = NS.D, S = NS.S, G = NS.G;
  var clamp = G.clamp;

  /* =========================================================
     1. Commerces
     ========================================================= */
  G.shopPrice = function (shop, it) {
    return Math.max(1, Math.round(it.price * (shop.markup || 1)));
  };

  /** Catalogue d'un commerce */
  G.shopStock = function (shop) {
    return D.ITEMS.filter(function (it) {
      if (it.shop !== 'city') return false;
      if (shop.cats.indexOf(it.cat) === -1) return false;
      if (shop.maxPrice && it.price > shop.maxPrice) return false;
      return true;
    });
  };

  /** Vigilance courante : sécurité de base + mémoire des vols récents */
  G.shopVigilance = function (shop) {
    var s = this.s;
    var v = shop.sec;
    var mem = (s.shopHeat && s.shopHeat[shop.id]) || 0;
    return clamp(v + mem, 0, 14);
  };

  G.shopBanned = function (shop) {
    var until = this.s.flags['ban_' + shop.id] || 0;
    return until > this.s.day ? until - this.s.day : 0;
  };

  /** Motif de fermeture d'un commerce, ou null */
  G.shopLock = function (shop) {
    if (this.s.jail) return 'Vous êtes incarcéré';
    var w = this.whenLock({ when: shop.when || 'any' });
    if (w) return w;
    var r = this.checkReq(shop.req);
    if (r) return r;
    var ban = this.shopBanned(shop);
    if (ban) return 'Interdit d’entrée encore ' + ban + ' jour(s)';
    return null;
  };

  G.buyFrom = function (shopId, itemId) {
    var shop = D.SHOP[shopId], it = D.ITEM[itemId];
    if (!shop || !it) return;
    var lock = this.shopLock(shop);
    if (lock) { NS.UI.toast(lock, 'bad'); return; }
    if (it.keep && this.has(itemId)) { NS.UI.toast('Vous le possédez déjà', 'bad'); return; }
    var r = this.checkReq(it.req);
    if (r) { NS.UI.toast(r, 'bad'); return; }

    var price = this.shopPrice(shop, it);
    if (!this.spend(price, it.n)) { NS.UI.toast('Argent insuffisant', 'bad'); return; }

    this.s.inv[itemId] = (this.s.inv[itemId] || 0) + 1;
    this.log('Achat chez ' + shop.ico + ' ' + shop.n + ' : ' + it.ico + ' <b>' + it.n + '</b> — ' + this.eur(price) + '.', 'money');
    this.hist('bought');
    if (!this._q) { NS.UI.refresh(); S.save(this.s); }
  };

  /* --------- vol à l'étalage --------- */
  /**
   * Chance de réussite : la discrétion contre la vigilance du magasin,
   * pondérée par la valeur de l'objet (un téléviseur ne se glisse pas
   * sous un manteau comme une plaquette de beurre).
   */
  G.liftChance = function (shop, it) {
    var s = this.s;
    var p = 62;
    p -= this.shopVigilance(shop) * 4.5;
    p -= Math.pow(this.shopPrice(shop, it), 0.42) * 2.2;
    p += this.lvl('discretion') * 5;
    p += s.rep.rue * 0.12;
    if (this.has('gants')) p += 5;
    if (this.has('sac')) p += 4;
    if (s.flags.lookout) p += 5;
    if (s.flags.addict) p -= 4 * s.flags.addict;
    if (s.gauges.hygiene < 30) p -= 8;          // on vous suit dans les rayons
    if (this.apparence() > 65) p += 6;          // personne ne soupçonne un client bien mis
    p -= s.heat * 0.22;
    p += (s.gauges.moral - 50) * 0.05;
    p *= this.condition();
    return clamp(p, 3, 93);
  };

  /** Peine encourue, proportionnelle à la valeur volée */
  G.liftSentence = function (shop, it) {
    return Math.max(2, Math.round(shop.sentence * (1 + Math.pow(this.shopPrice(shop, it), 0.32) / 8)));
  };

  G.shoplift = function (shopId, itemId) {
    var shop = D.SHOP[shopId], it = D.ITEM[itemId];
    if (!shop || !it) return;
    var lock = this.shopLock(shop);
    if (lock) { NS.UI.toast(lock, 'bad'); return; }
    if (it.keep && this.has(itemId)) { NS.UI.toast('Vous le possédez déjà', 'bad'); return; }
    if (S.hoursLeft(this.s) < 1) { NS.UI.toast('Plus de temps aujourd’hui', 'bad'); return; }

    var s = this.s;
    this.spendTime(1);
    this.spendEnergy(6);
    s.totals.actions++;
    s.totals.crimes++;
    this.hist('crime'); this.hist('shoplift');

    var price = this.shopPrice(shop, it);
    var p = this.liftChance(shop, it);
    var sentence = this.liftSentence(shop, it);

    if (!s.shopHeat) s.shopHeat = {};

    if (this.chance(p)) {
      s.inv[itemId] = (s.inv[itemId] || 0) + 1;
      this.rep('rue', 1 + Math.min(4, price / 300));
      this.rep('legale', -0.5);
      this.heat(2 + shop.sec * 0.8);
      this.xp('discretion', 5 + Math.round(shop.sec * 1.2));
      s.shopHeat[shop.id] = (s.shopHeat[shop.id] || 0) + 1.2;
      this.add('moral', -1);
      this.log('Vol à l’étalage chez ' + shop.ico + ' <b>' + shop.n + '</b> : ' + it.ico + ' ' + it.n +
        ' (' + this.eur(price) + ') sorti sans payer.', 'money');
      if (!this._q) NS.UI.toast('🥷 ' + it.ico + ' ' + it.n + ' — volé', 'good');
    } else {
      this.heat(8 + shop.sec * 2);
      this.rep('legale', -3);
      this.add('moral', -10);
      s.shopHeat[shop.id] = (s.shopHeat[shop.id] || 0) + 3;
      s.flags['ban_' + shop.id] = s.day + this.rnd(4, 12);
      this.log('<b>Pris la main dans le sac</b> chez ' + shop.n + '. Vous êtes désormais interdit d’entrée.', 'bad');
      if (!this._q) NS.UI.toast('🚨 Repéré chez ' + shop.n, 'bad');
      this.arrestCheck('vol à l’étalage — ' + shop.n, sentence);
    }
    this.afterAction({ hours: 1, energy: 6 });
  };

  /* =========================================================
     2. Casino
     ========================================================= */
  G.casinoLock = function () {
    if (this.s.jail) return 'Vous êtes incarcéré';
    var r = this.checkReq(D.CASINO_REQ);
    if (r) return r;
    var ban = this.s.flags.casinoBan || 0;
    if (ban > this.s.day) return 'Interdit de casino encore ' + (ban - this.s.day) + ' jour(s)';
    return null;
  };

  G.gameLock = function (game) {
    var lock = this.casinoLock();
    if (lock) return lock;
    if (!this.canPay(game.min)) return 'Mise minimale de ' + this.eur(game.min);
    if (S.hoursLeft(this.s) < 1) return 'Plus de temps aujourd’hui';
    return null;
  };

  /** Mise maximale réellement jouable */
  G.maxBet = function (game) {
    return Math.max(0, Math.min(game.max, Math.floor(S.spendable(this.s))));
  };

  G.casinoPlay = function (gameId, bet, choice) {
    var game = D.CASINO_GAME[gameId];
    if (!game) return;
    var lock = this.gameLock(game);
    if (lock) { NS.UI.toast(lock, 'bad'); return; }

    bet = Math.round(Math.max(game.min, Math.min(bet, this.maxBet(game))));
    if (!this.spend(bet, 'Mise — ' + game.n)) { NS.UI.toast('Mise impossible', 'bad'); return; }

    var s = this.s;
    this.spendTime(1);
    this.spendEnergy(5);
    s.totals.actions++;
    this.hist('gamble');

    var res = game.play(this, bet, choice) || { win: -bet, t: 'bad', m: '' };
    var net = Math.round(res.win);

    /* la mise est déjà déboursée : on rend la mise + le gain quand il y a gain */
    if (net > 0) {
      this.cash(bet + net, 'Gain — ' + game.n);
      this.hist('gambleWin');
      s.flags.casinoWatch = (s.flags.casinoWatch || 0) + net / 400;
      this.add('moral', net > bet * 5 ? 14 : 6);
    } else if (net === 0) {
      this.cash(bet, 'Mise rendue');
    } else {
      this.hist('gambleLoss');
      s.flags.casinoWatch = Math.max(0, (s.flags.casinoWatch || 0) - 0.4);
      this.add('moral', -8);
      if (this.chance(9)) this.flag('gambler', (s.flags.gambler || 0) + 1);
    }

    var label = net > 0 ? '+' + this.eur(net) : (net === 0 ? 'mise rendue' : '−' + this.eur(-net));
    this.log('<b>' + game.ico + ' ' + game.n + '</b> — mise ' + this.eur(bet) + ' · <b>' + label + '</b>. ' + res.m,
      net > 0 ? 'money' : (net === 0 ? 'neutral' : 'bad'));
    if (!this._q) NS.UI.toast(game.ico + ' ' + label, net > 0 ? 'money' : (net === 0 ? 'neutral' : 'bad'));

    /* On finit toujours par remarquer celui qui gagne trop */
    if ((s.flags.casinoWatch || 0) > 12 && this.chance(35)) {
      s.flags.casinoBan = s.day + this.rnd(5, 15);
      s.flags.casinoWatch = 0;
      this.log('<b>La sécurité vous raccompagne à la porte.</b> « Vous gagnez trop bien, monsieur. »', 'bad');
      if (!this._q) NS.UI.toast('🚫 Interdit de casino', 'bad');
    }

    this.checkEnd();
    this.afterAction({ hours: 1, energy: 5 });
  };

  /* =========================================================
     2bis. Lieux (salle de sport, etc.)
     ========================================================= */
  G.venueLock = function (v) {
    if (this.s.jail || this.s.hospital) return 'Indisponible';
    var w = this.whenLock({ when: v.when || 'any' });
    if (w) return w;
    return this.checkReq(v.req);
  };

  G.sessionLock = function (v, sess) {
    var lock = this.venueLock(v);
    if (lock) return lock;
    var r = this.checkReq(sess.req);
    if (r) return r;
    if (sess.hours > S.hoursLeft(this.s)) return 'Pas assez de temps';
    if (sess.energy > 0 && this.s.gauges.energie < sess.energy * 0.5) return 'Vous êtes trop épuisé';
    if (sess.price && !this.canPay(sess.price)) return 'Il faut ' + this.eur(sess.price);
    return null;
  };

  G.doSession = function (venueId, sessId) {
    var v = D.VENUE[venueId];
    if (!v) return;
    var sess = v.sessions.filter(function (x) { return x.id === sessId; })[0];
    if (!sess) return;
    var lock = this.sessionLock(v, sess);
    if (lock) { NS.UI.toast(lock, 'bad'); return; }

    if (sess.price && !this.spend(sess.price, v.n + ' — ' + sess.n)) {
      NS.UI.toast('Argent insuffisant', 'bad'); return;
    }
    this.spendTime(sess.hours);
    this.spendEnergy(sess.energy);
    this.s.totals.actions++;

    var res = sess.run(this) || {};
    if (res.m) this.log('<b>' + v.ico + ' ' + sess.n + '</b> — ' + res.m, res.t || 'good');
    if (!this._q) NS.UI.toast(v.ico + ' ' + sess.n, res.t || 'good');
    this.afterAction(sess);
  };

  /* =========================================================
     2bis-b. La Cave — combats, paris, missions (nuit uniquement)
     ========================================================= */
  G.fightLock = function (f) {
    if (this.s.jail || this.s.hospital) return 'Indisponible';
    if (f.forceReq && this.lvl('force') < f.forceReq) return 'Force ' + f.forceReq + ' requise';
    if (!this.canPay(f.stake)) return 'Mise de ' + this.eur(f.stake) + ' requise';
    if (S.hoursLeft(this.s) < 2) return 'Pas assez de temps';
    return null;
  };

  G.doFight = function (id) {
    var f = D.FIGHT[id];
    if (!f) return;
    var lock = this.fightLock(f);
    if (lock) { NS.UI.toast(lock, 'bad'); return; }
    if (!this.spend(f.stake, 'Mise — ' + f.n)) { NS.UI.toast('Mise impossible', 'bad'); return; }

    this.spendTime(2); this.spendEnergy(22);
    this.s.totals.actions++;

    var p = clamp(38 + this.lvl('force') * 7 - f.forceReq * 5 + (this.s.gauges.sante - 50) * 0.15, 8, 88);
    if (this.chance(p)) {
      var gain = Math.round(f.stake * f.mult);
      this.cash(gain, 'Combat gagné — ' + f.n);
      this.add('sante', -this.rnd(4, 10));
      this.rep('rue', 3);
      this.xp('force', 14);
      this.log('<b>' + f.n + '</b> — victoire. ' + this.eur(gain) + ' empochés.', 'money');
      if (!this._q) NS.UI.toast('🥊 Victoire — +' + this.eur(gain), 'money');
    } else {
      this.add('sante', -this.rnd(14, 28));
      this.add('moral', -8);
      this.rep('rue', 1);
      this.log('<b>' + f.n + '</b> — défaite. La mise est perdue, et vous encaissez.', 'bad');
      if (!this._q) NS.UI.toast('🥊 Défaite', 'bad');
      if (this.chance(12)) this.arrestCheck('coups et blessures volontaires', f.sentence);
    }
    this.checkEnd();
    this.afterAction(f);
  };

  G.betLock = function (m) {
    if (!this.canPay(m.min)) return 'Mise minimale de ' + this.eur(m.min);
    if (S.hoursLeft(this.s) < 1) return 'Plus de temps aujourd’hui';
    return null;
  };

  G.maxParisBet = function (m) { return Math.max(0, Math.min(m.max, Math.floor(S.spendable(this.s)))); };

  G.placeBet = function (id, bet, choice) {
    var m = D.PARI[id];
    if (!m) return;
    var lock = this.betLock(m);
    if (lock) { NS.UI.toast(lock, 'bad'); return; }

    bet = Math.round(Math.max(m.min, Math.min(bet, this.maxParisBet(m))));
    if (!this.spend(bet, 'Mise — ' + m.n)) { NS.UI.toast('Mise impossible', 'bad'); return; }

    this.spendTime(1); this.spendEnergy(4);
    this.s.totals.actions++;
    this.hist('gamble');

    var res = m.play(this, bet, choice) || { win: -bet, m: '' };
    var net = Math.round(res.win);
    if (net > 0) { this.cash(bet + net, 'Gain — ' + m.n); this.hist('gambleWin'); }
    else if (net === 0) this.cash(bet, 'Mise rendue');
    else this.hist('gambleLoss');

    var label = net > 0 ? '+' + this.eur(net) : (net === 0 ? 'mise rendue' : '−' + this.eur(-net));
    this.log('<b>' + m.ico + ' ' + m.n + '</b> — mise ' + this.eur(bet) + ' · <b>' + label + '</b>. ' + res.m,
      net > 0 ? 'money' : (net === 0 ? 'neutral' : 'bad'));
    if (!this._q) NS.UI.toast(m.ico + ' ' + label, net > 0 ? 'money' : (net === 0 ? 'neutral' : 'bad'));
    this.rep('pegre', 0.4);
    this.checkEnd();
    this.afterAction(m);
  };

  G.refreshMissions = function () {
    var s = this.s;
    var pool = D.MISSION_POOL.slice();
    var picks = [];
    for (var i = 0; i < 3 && pool.length; i++) {
      var idx = Math.floor(Math.random() * pool.length);
      picks.push(pool.splice(idx, 1)[0].id);
    }
    s.missions = picks;
    s.missionsDay = s.day;
  };

  G.missionLock = function (m) {
    var r = this.checkReq(m.req);
    if (r) return r;
    if (m.hours > S.hoursLeft(this.s)) return 'Pas assez de temps';
    return null;
  };

  G.doMission = function (id) {
    var m = D.MISSIONI[id];
    if (!m) return;
    var lock = this.missionLock(m);
    if (lock) { NS.UI.toast(lock, 'bad'); return; }

    this.spendTime(m.hours); this.spendEnergy(m.energy);
    this.s.totals.actions++; this.s.totals.crimes++; this.hist('crime');

    this._crime = { id: 'mission_' + m.id, sentence: m.sentence };
    var roll = this.crimeRoll(58, { discretion: 2, force: m.id === 'dette' || m.id === 'intimidation' ? 2 : 0 });
    this._crime = null;

    if (roll.win) {
      var pay = this.rnd(m.pay[0], m.pay[1]);
      this.dirtyCash(pay, m.n);
      this.heat(roll.heat * 0.6);
      this.rep('pegre', 3);
      this.log('<b>' + m.n + '</b> — mission réussie. ' + this.eur(pay) + ' d’argent sale.', 'money');
      if (!this._q) NS.UI.toast('✅ ' + m.n + ' — ' + this.eur(pay), 'good');
    } else {
      this.heat(roll.heat);
      this.log('<b>' + m.n + '</b> — ça tourne mal.', 'bad');
      if (!this._q) NS.UI.toast('❌ ' + m.n + ' ratée', 'bad');
      this.arrestCheck(m.n.toLowerCase(), m.sentence);
    }

    var idx = this.s.missions.indexOf(id);
    if (idx !== -1) this.s.missions.splice(idx, 1);
    this.checkEnd();
    this.afterAction(m);
  };

  /* =========================================================
     2ter. Planque à domicile
     ========================================================= */
  G.stashIn = function (amount) {
    var s = this.s;
    amount = Math.min(Math.round(amount), s.dirty, S.stashCap(s) - (s.stash || 0));
    if (amount < 1) { NS.UI.toast('Impossible de planquer ça ici', 'bad'); return; }
    s.dirty -= amount;
    s.stash = (s.stash || 0) + amount;
    this.log('Vous planquez ' + this.eur(amount) + ' d’argent sale chez vous.', 'money');
    NS.UI.toast('📦 ' + this.eur(amount) + ' planqués', 'dirty');
    NS.UI.refresh(); S.save(s);
  };

  G.stashOut = function (amount) {
    var s = this.s;
    amount = Math.min(Math.round(amount), s.stash || 0);
    if (amount < 1) return;
    s.stash -= amount;
    s.dirty += amount;
    this.log('Vous reprenez ' + this.eur(amount) + ' dans la planque.', 'money');
    NS.UI.toast('🩸 ' + this.eur(amount) + ' repris', 'dirty');
    NS.UI.refresh(); S.save(s);
  };

  /* =========================================================
     3. Décroissance quotidienne de la vigilance des commerces
     ========================================================= */
  G.tickShops = function () {
    var s = this.s;
    if (!s.shopHeat) { s.shopHeat = {}; return; }
    Object.keys(s.shopHeat).forEach(function (k) {
      s.shopHeat[k] = Math.max(0, s.shopHeat[k] - 0.5);
      if (s.shopHeat[k] <= 0) delete s.shopHeat[k];
    });
    if (s.flags.casinoWatch) s.flags.casinoWatch = Math.max(0, s.flags.casinoWatch - 0.6);
  };

})(window.LifeRPG);
