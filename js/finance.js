/* =============================================================
   finance.js — Banque, crédits, marchés, blanchiment.
   Étend l'API G et expose NS.FIN.dailyTick appelé chaque nuit.
   ============================================================= */
(function (NS) {
  'use strict';

  var D = NS.D, S = NS.S, G = NS.G;
  var FIN = {};
  var clamp = G.clamp;

  /* =========================================================
     1. Compte bancaire
     ========================================================= */
  G.openBank = function (free) {
    var s = this.s;
    if (s.bank.open) return;
    if (!free) {
      var r = this.checkReq(D.BANK.openReq);
      if (r) { NS.UI.toast(r, 'bad'); return; }
      if (s.money < D.BANK.openCost) { NS.UI.toast('Il faut ' + this.eur(D.BANK.openCost), 'bad'); return; }
      this.cash(-D.BANK.openCost, 'Ouverture de compte');
      this.spendTime(1);
    }
    s.bank.open = true;
    s.bank.score = Math.max(s.bank.score, 20 + Math.round(s.rep.legale * 0.3));
    this.rep('legale', 4);
    this.log('<b>Compte bancaire ouvert.</b> Votre argent cesse d’être un objet qu’on peut vous prendre.', 'good');
    this.milestone('bank', '🏦 Un compte en banque',
      'Un RIB, une carte, un relevé mensuel. À partir d’aujourd’hui, votre argent existe ailleurs que dans votre poche — et il peut travailler.');
    if (!this._q) { NS.UI.refresh(); S.save(s); }
  };

  G.bankScore = function (n) {
    this.s.bank.score = clamp(this.s.bank.score + n, 0, 100);
  };

  G.deposit = function (amount) {
    var s = this.s;
    amount = Math.min(amount, s.money);
    if (!s.bank.open || amount <= 0) return;
    s.money -= amount; s.bank.checking += amount;
    this.toast('🏦 ' + this.eur(amount) + ' déposés', 'money');
    NS.UI.refresh(); S.save(s);
  };

  G.withdraw = function (amount) {
    var s = this.s;
    amount = Math.min(amount, s.bank.checking);
    if (!s.bank.open || amount <= 0) return;
    s.bank.checking -= amount; s.money += amount;
    this.toast('💵 ' + this.eur(amount) + ' retirés', 'money');
    NS.UI.refresh(); S.save(s);
  };

  G.toSavings = function (amount) {
    var s = this.s;
    amount = Math.min(amount, s.bank.checking);
    if (amount <= 0) return;
    s.bank.checking -= amount; s.bank.savings += amount;
    this.toast('💰 ' + this.eur(amount) + ' placés', 'money');
    NS.UI.refresh(); S.save(s);
  };

  G.fromSavings = function (amount) {
    var s = this.s;
    amount = Math.min(amount, s.bank.savings);
    if (amount <= 0) return;
    s.bank.savings -= amount; s.bank.checking += amount;
    NS.UI.refresh(); S.save(s);
  };

  /* =========================================================
     2. Crédits
     ========================================================= */
  G.loanOffer = function (l) {
    var s = this.s;
    if (!s.bank.open) return 'Compte bancaire requis';
    if (s.bank.loan) return 'Un crédit est déjà en cours';
    if (s.bank.score < l.score) return 'Score bancaire ' + l.score + ' requis (vous : ' + Math.round(s.bank.score) + ')';
    var r = this.checkReq(l.req);
    if (r) return r;
    if (s.casier > 4) return 'Casier judiciaire rédhibitoire';
    return null;
  };

  G.takeLoan = function (id) {
    var l = D.LOANS.filter(function (x) { return x.id === id; })[0];
    if (!l) return;
    var lock = this.loanOffer(l);
    if (lock) { NS.UI.toast(lock, 'bad'); return; }

    var rate = this.s.flags.goodRate ? l.rate * 0.5 : l.rate;
    var total = Math.round(l.amount * Math.pow(1 + rate, l.days));
    this.s.bank.loan = {
      id: l.id, amount: total, principal: l.amount, rate: rate,
      daily: Math.ceil(total / l.days), due: this.s.day + l.days
    };
    this.s.bank.checking += l.amount;
    this.bankScore(-6);
    this.log('<b>' + l.n + ' accordé.</b> ' + this.eur(l.amount) + ' versés, ' + this.eur(total) +
      ' à rembourser en ' + l.days + ' jours (' + this.eur(this.s.bank.loan.daily) + '/jour).', 'money');
    NS.UI.refresh(); S.save(this.s);
  };

  G.repayLoan = function () {
    var s = this.s;
    if (!s.bank.loan) return;
    var due = s.bank.loan.amount;
    var from = Math.min(due, s.bank.checking + s.money);
    if (from < due) { NS.UI.toast('Il faut ' + this.eur(due) + ' au total', 'bad'); return; }
    var fromBank = Math.min(due, s.bank.checking);
    s.bank.checking -= fromBank;
    if (due - fromBank > 0) s.money -= (due - fromBank);
    s.bank.loan = null;
    this.bankScore(15);
    this.log('<b>Crédit soldé par anticipation.</b> Votre score bancaire progresse nettement.', 'good');
    NS.UI.refresh(); S.save(s);
  };

  /* =========================================================
     3. Blanchiment
     ========================================================= */
  G.launderRaw = function (amount, fee) {
    var s = this.s;
    amount = Math.min(amount, s.dirty);
    if (amount <= 0) return 0;
    var net = Math.round(amount * (1 - fee));
    s.dirty -= amount;
    if (s.bank.open) s.bank.checking += net; else s.money += net;
    s.totals.laundered += amount;
    return net;
  };

  G.launderCap = function (m) {
    if (m.id === 'biz') return S.washCap(this.s);
    return m.max;
  };

  G.launder = function (methodId, amount) {
    var m = D.LAUNDER.filter(function (x) { return x.id === methodId; })[0];
    if (!m) return;
    var lock = this.checkReq(m.req);
    if (lock) { NS.UI.toast(lock, 'bad'); return; }
    if (m.hours > S.hoursLeft(this.s)) { NS.UI.toast('Pas assez de temps', 'bad'); return; }

    var cap = this.launderCap(m);
    amount = Math.min(amount, this.s.dirty, cap);
    if (amount < 50) { NS.UI.toast('Montant trop faible', 'bad'); return; }

    this.spendTime(m.hours);
    this.spendEnergy(8);

    if (this.chance(m.risk * 100)) {
      var lost = Math.round(amount * this.rndF(0.5, 1));
      this.s.dirty -= lost;
      this.heat(12);
      this.log('<b>Blanchiment raté.</b> ' + this.eur(lost) + ' se sont volatilisés, et quelqu’un a posé des questions.', 'bad');
      NS.UI.toast('💸 Opération perdue', 'bad');
    } else {
      var net = this.launderRaw(amount, m.fee);
      this.hist('launder');
      this.log('<b>' + m.n + '</b> — ' + this.eur(amount) + ' blanchis, ' + this.eur(net) + ' récupérés (frais ' +
        Math.round(m.fee * 100) + ' %).', 'money');
      NS.UI.toast('🧼 ' + this.eur(net) + ' propres', 'money');
      this.milestone('launder', '🧼 Argent propre',
        'La somme est passée d’un monde à l’autre. Sur le papier, elle n’a jamais été sale.');
    }
    this.afterAction(m);
  };

  /* =========================================================
     4. Marché
     ========================================================= */
  G.px = function (id) { return this.s.market.px[id] || 0; };
  G.holding = function (id) { return this.s.market.hold[id] || 0; };

  G.marketOpen = function () {
    return this.s.bank.open && (this.has('smartphone') || this.has('ordi'));
  };

  G.buyAsset = function (id, amount) {
    var s = this.s;
    if (!this.marketOpen()) { NS.UI.toast('Compte bancaire et smartphone requis', 'bad'); return; }
    amount = Math.min(amount, s.bank.checking);
    if (amount < 10) { NS.UI.toast('Montant trop faible', 'bad'); return; }
    var px = this.px(id);
    var qty = (amount * (1 - D.MARKET_FEE)) / px;
    s.bank.checking -= amount;
    var prev = s.market.hold[id] || 0, prevCost = s.market.cost[id] || 0;
    s.market.hold[id] = prev + qty;
    s.market.cost[id] = prevCost + amount;
    s.market.started = true;
    this.log('Achat de <b>' + D.ASSET[id].n + '</b> pour ' + this.eur(amount) + '.', 'money');
    this.hist('trade');
    NS.UI.toast('📈 ' + D.ASSET[id].ico + ' acheté', 'money');
    NS.UI.refresh(); S.save(s);
  };

  G.sellAsset = function (id, ratio) {
    var s = this.s;
    var qty = (s.market.hold[id] || 0) * ratio;
    if (qty <= 0) return;
    var gross = qty * this.px(id);
    var net = Math.round(gross * (1 - D.MARKET_FEE));
    var costPart = (s.market.cost[id] || 0) * ratio;
    s.market.hold[id] -= qty;
    s.market.cost[id] = Math.max(0, (s.market.cost[id] || 0) - costPart);
    if (s.market.hold[id] < 0.0001) { delete s.market.hold[id]; delete s.market.cost[id]; }
    s.bank.checking += net;
    var pnl = net - costPart;
    this.log('Vente de <b>' + D.ASSET[id].n + '</b> : ' + this.eur(net) + ' (' + (pnl >= 0 ? '+' : '') + this.eur(pnl) + ').',
      pnl >= 0 ? 'good' : 'bad');
    this.hist('trade');
    NS.UI.toast((pnl >= 0 ? '📈 +' : '📉 ') + this.eur(pnl), pnl >= 0 ? 'money' : 'bad');
    NS.UI.refresh(); S.save(s);
  };

  /** Tuyau d'initié : un actif bougera fortement demain */
  G.marketTip = function () {
    var a = this.pick(D.ASSETS.filter(function (x) { return x.id !== 'oblig'; }));
    this.s.market.tip = { id: a.id, day: this.s.day + 1, up: this.chance(72) };
    return a.ico + ' ' + a.n;
  };

  /* --------- évolution quotidienne --------- */
  FIN.marketDay = function (g) {
    var s = g.s, m = s.market;

    m.regimeLeft--;
    if (m.regimeLeft <= 0) {
      var pool = [];
      D.REGIMES.forEach(function (r) {
        var w = { calme: 34, hausse: 26, baisse: 20, krach: 6, euphorie: 14 }[r.id];
        for (var i = 0; i < w; i++) pool.push(r.id);
      });
      m.regime = g.pick(pool);
      var r0 = D.REGIME[m.regime];
      m.regimeLeft = g.rnd(r0.days[0], r0.days[1]);
    }
    var reg = D.REGIME[m.regime];

    D.ASSETS.forEach(function (a) {
      var drift = a.drift + reg.drift;
      if (a.crisis && (m.regime === 'krach' || m.regime === 'baisse')) drift += 0.02;   // l'or monte quand tout tombe
      var move = drift + a.vol * reg.mult * g.gauss();

      if (m.tip && m.tip.id === a.id && m.tip.day === s.day) {
        move = m.tip.up ? g.rndF(0.20, 0.45) : -g.rndF(0.18, 0.38);
        m.tip = null;
      }
      var before = m.px[a.id];
      var after = Math.max(a.min, before * (1 + move));
      m.px[a.id] = Math.round(after * 100) / 100;
      m.lastMove[a.id] = (m.px[a.id] - before) / before;

      var h = m.hist[a.id] || [];
      h.push(m.px[a.id]);
      if (h.length > 40) h.shift();
      m.hist[a.id] = h;
    });
  };

  /* --------- passage quotidien complet --------- */
  /**
   * @param g       moteur
   * @param quiet   true pendant l'incarcération (pas de ligne de résumé)
   * @param lines   tableau de messages du réveil
   */
  FIN.dailyTick = function (g, quiet, lines) {
    var s = g.s;
    lines = lines || [];

    FIN.marketDay(g);

    if (!s.bank.open) return;

    /* intérêts du livret */
    if (s.bank.savings > 0) {
      var base = Math.min(s.bank.savings, D.BANK.savingsCap);
      var int_ = Math.round(base * D.BANK.savingsRate);
      if (int_ > 0) {
        s.bank.savings += int_;
        if (!quiet && int_ >= 1) lines.push('Intérêts du livret : +' + g.eur(int_) + '.');
      }
    }

    /* remboursement du crédit */
    if (s.bank.loan) {
      var l = s.bank.loan;
      var pay = Math.min(l.daily, l.amount);
      if (s.bank.checking >= pay) { s.bank.checking -= pay; l.amount -= pay; g.bankScore(0.4); }
      else if (s.money >= pay) { s.money -= pay; l.amount -= pay; g.bankScore(0.2); }
      else {
        s.bank.missed++;
        g.bankScore(-9);
        if (!quiet) lines.push('<b>Échéance de crédit impayée</b> (' + s.bank.missed + '). Votre score bancaire chute.');
        if (s.bank.missed >= 4) {
          var seized = Math.min(s.bank.savings, l.amount);
          s.bank.savings -= seized; l.amount -= seized;
          s.bank.missed = 0;
          if (!quiet) lines.push('<b>Saisie sur votre livret : ' + g.eur(seized) + '.</b>');
          if (l.amount > 0 && s.bank.savings <= 0) {
            /* on liquide le portefeuille */
            Object.keys(s.market.hold).forEach(function (id) {
              var v = Math.round(s.market.hold[id] * s.market.px[id]);
              delete s.market.hold[id]; delete s.market.cost[id];
              l.amount = Math.max(0, l.amount - v);
              if (!quiet) lines.push('Liquidation forcée de ' + D.ASSET[id].n + ' : ' + g.eur(v) + '.');
            });
          }
        }
      }
      if (l.amount <= 0) {
        s.bank.loan = null; g.bankScore(12);
        if (!quiet) lines.push('<b>Crédit intégralement remboursé.</b> Votre score bancaire progresse.');
      }
    }

    /* dérive naturelle du score */
    if (s.job) g.bankScore(0.25);
    if (s.biz.length) g.bankScore(0.15);
    if (s.casier > 3) g.bankScore(-0.1);
  };

  /* =========================================================
     5. Saisie du liquide en cas de forte pression policière
     ========================================================= */
  FIN.seizureRisk = function (s) {
    if (s.heat < D.BANK.seizeThreshold) return 0;
    return (s.heat - D.BANK.seizeThreshold) * 0.4;
  };

  NS.FIN = FIN;
})(window.LifeRPG);
