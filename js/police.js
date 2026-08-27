/* =============================================================
   police.js — Contrôles, fouilles, perquisitions, amendes, tribunal.

   Une arrestation n'est plus binaire. Selon la gravité, la pression
   policière et votre dossier, ça peut aller du simple rappel à la loi
   à la comparution immédiate, en passant par l'amende, la saisie,
   la garde à vue et la caution.
   ============================================================= */
(function (NS) {
  'use strict';

  var D = NS.D, S = NS.S, G = NS.G;
  var clamp = G.clamp;

  /* =========================================================
     1. Probabilités
     ========================================================= */
  /** Chance d'être contrôlé lors d'un déplacement ordinaire */
  G.stopRisk = function () {
    var s = this.s;
    var p = 2 + s.heat * 0.32 + s.casier * 1.4;
    if (this.isNight()) p += 4;
    if (this.apparence() < 35) p += 5;
    if (this.apparence() > 70) p -= 4;
    if (s.flags.nopapers) p += 6;
    if (s.flags.ghost) p -= 5;
    p -= this.lvl('discretion') * 0.8;
    return clamp(p, 0, 85);
  };

  /** Chance d'une perquisition à domicile (évaluée chaque nuit) */
  G.raidRisk = function () {
    var s = this.s;
    if (s.heat < 45) return 0;
    var p = (s.heat - 45) * 0.55 + s.casier * 0.8;
    p -= (S.home(s).cool || 0) * 1.2;
    if (s.flags.ghost) p -= 4;
    if (s.flags.protected) p -= 8;
    return clamp(p, 0, 40);
  };

  /** Ce que la police trouverait sur vous en fouillant */
  G.contraband = function () {
    var s = this.s;
    var items = [];
    ['arme', 'came', 'crochets', 'brouilleur', 'skimmer', 'contrefacon', 'faux'].forEach(function (id) {
      if (s.inv[id]) items.push(D.ITEM[id]);
    });
    return { dirty: s.dirty, items: items };
  };

  /* =========================================================
     2. Contrôle d'identité
     ========================================================= */
  /**
   * Un contrôle interactif : le joueur décide comment il se comporte.
   * Appelable depuis un événement, une action ou une patrouille.
   */
  G.policeStop = function (reason) {
    var s = this.s;
    if (this._q) return 'Contrôle.';
    reason = reason || 'contrôle d’identité';

    var band = this.contraband();
    var risky = band.dirty > 0 || band.items.length > 0;
    var self = this;

    var ev = {
      id: 'stop_' + s.day,
      proc: true,
      ico: '🚔', title: 'Contrôle de police',
      text: 'Motif annoncé : ' + reason + '. ' +
        (risky
          ? 'Vous avez sur vous ' +
            [band.dirty ? this.eur(band.dirty) + ' en liquide non justifiable' : null,
             band.items.length ? band.items.map(function (i) { return i.ico + ' ' + i.n; }).join(', ') : null]
              .filter(Boolean).join(' et ') + '.'
          : 'Vous n’avez rien à vous reprocher dans les poches — ce qui aide.'),
      choices: []
    };

    ev.choices.push({
      l: 'Coopérer', h: 'Le plus sûr si vous êtes propre',
      run: function (G) { return G.resolveStop(reason, 'coop'); }
    });

    ev.choices.push({
      l: 'Discuter, gagner du temps', h: 'Charisme — éviter la fouille',
      run: function (G) { return G.resolveStop(reason, 'talk'); }
    });

    if (this.canPay(40)) {
      ev.choices.push({
        l: '💶 Proposer un arrangement', h: 'Corrompre — le montant compte', risky: true,
        run: function (G) { return G.bribeStop(reason); }
      });
    }

    ev.choices.push({
      l: 'Prendre la fuite', h: 'Discrétion & force — très risqué', risky: true,
      run: function (G) { return G.resolveStop(reason, 'run'); }
    });

    NS.UI.event(ev);
    return 'Deux agents vous demandent vos papiers.';
  };

  /** Suite d'un contrôle selon l'attitude choisie */
  G.resolveStop = function (reason, mode) {
    var s = this.s;
    var band = this.contraband();
    var searched = false;
    var out = [];

    if (mode === 'run') {
      var pf = 24 + this.lvl('discretion') * 6 + this.lvl('force') * 3 - s.heat * 0.25;
      if (this.has('velo')) pf += 8;
      if (this.gauge('energie') < 30) pf -= 12;
      this.spendEnergy(22);
      if (this.chance(pf)) {
        this.heat(10); this.rep('rue', 5); this.xp('discretion', 12);
        return 'Vous partez sans prévenir. Trois rues, une cour, un porche : ils abandonnent. La pression monte quand même.';
      }
      this.heat(22); this.add('sante', -12);
      out.push('Vous ne courez pas assez vite.');
      searched = true;
    } else if (mode === 'talk') {
      var pt = 34 + this.lvl('charisme') * 6 + s.rep.legale * 0.2 - s.heat * 0.3 + this.affVal('duval') * 0.2;
      if (this.chance(clamp(pt, 5, 90))) {
        this.heat(-6); this.xp('charisme', 8);
        return 'Vous parlez posément, sans en faire trop. Ils rendent les papiers sans ouvrir le sac.';
      }
      out.push('Votre assurance les intrigue plus qu’elle ne les rassure.');
      searched = true;
    } else {
      /* coopération : fouille si quelque chose motive le contrôle */
      searched = this.chance(35 + s.heat * 0.45 + s.casier * 3);
      if (!searched) { this.heat(-5); return 'Papiers, quelques questions, et on vous rend la main. Rien de plus.'; }
      out.push('On vous demande d’ouvrir votre sac.');
    }

    if (!searched) return out.join(' ');

    /* --- la fouille --- */
    var seizedCash = 0, seizedItems = [];
    if (band.dirty > 0) { seizedCash = band.dirty; s.dirty = 0; }
    band.items.forEach(function (it) { this.take(it.id, 99); seizedItems.push(it.ico + ' ' + it.n); }, this);

    if (!seizedCash && !seizedItems.length) {
      this.heat(-4);
      out.push('La fouille ne donne rien. On vous laisse repartir, un peu vexés.');
      return out.join(' ');
    }

    out.push('<b>Saisie</b> : ' +
      [seizedCash ? this.eur(seizedCash) : null, seizedItems.join(', ') || null].filter(Boolean).join(' et ') + '.');
    if (!this._q) NS.UI.flash('🚔 Saisie : ' + this.eur(seizedCash), 'bad');

    /* la gravité dépend de ce qu'on a trouvé */
    var gravity = 0;
    if (seizedCash > 0) gravity += Math.min(30, seizedCash / 400);
    seizedItems.forEach(function (n) { gravity += n.indexOf('Arme') >= 0 ? 40 : 12; });
    gravity = Math.round(gravity);

    this.heat(8);
    this.rep('legale', -3);

    if (gravity <= 4) { out.push('Simple rappel à la loi.'); return out.join(' '); }
    if (gravity <= 14) { out.push(this.fine(Math.round(60 + gravity * 25), 'détention de biens suspects')); return out.join(' '); }

    out.push(this.arrestCheck(reason + ' — fouille positive', Math.round(gravity * 0.9)) ? '' : 'Vous vous en sortez de justesse.');
    return out.join(' ');
  };

  /** Tentative de corruption : le montant proposé fait tout */
  G.bribeStop = function (reason) {
    var s = this.s;
    var self = this;
    var pool = Math.floor(S.spendable(s));
    var steps = [0.1, 0.25, 0.5].map(function (r) { return Math.max(40, Math.round(pool * r)); });

    /* Montant « attendu » par l'agent : il grandit avec ce que vous avez à cacher */
    var band = this.contraband();
    var expected = Math.max(80, Math.round(band.dirty * 0.35 + band.items.length * 250 + s.heat * 12));

    var acts = steps.map(function (amount) {
      var odds = self.bribeOdds(amount, expected);
      return {
        l: 'Glisser ' + self.eur(amount),
        h: Math.round(odds) + ' % de chances · attendu ≈ ' + self.eur(expected),
        locked: amount > pool ? 'Au-dessus de vos moyens' : null,
        fn: function () { self.doBribe(amount, expected, reason); }
      };
    });
    acts.push({ l: 'Finalement, coopérer', h: 'Renoncer à corrompre', fn: function () { NS.UI.resultModal('🚔', 'Contrôle', self.resolveStop(reason, 'coop')); } });

    NS.UI.modal({
      ico: '💶', title: 'Un arrangement ?',
      body: '<p>Il regarde ailleurs pendant deux secondes de trop. C’est une invitation, ou un piège.</p>' +
        '<div class="panel mt">' +
        '<div class="kv"><span>Disponible</span><b>' + this.eur(pool) + '</b></div>' +
        '<div class="kv"><span>Montant qui le convaincrait</span><b>≈ ' + this.eur(expected) + '</b></div>' +
        '<div class="kv"><span>Votre charisme</span><b>niveau ' + this.lvl('charisme') + '</b></div>' +
        '</div>',
      actions: acts
    });
    return 'Vous tentez votre chance.';
  };

  /**
   * C'est le montant qui décide, pas le baratin : le charisme ne fait
   * qu'ajuster à la marge. Proposer une misère reste une mauvaise idée.
   */
  G.bribeOdds = function (amount, expected) {
    var ratio = amount / Math.max(1, expected);
    var p = 6 + Math.min(62, ratio * 55) + this.lvl('charisme') * 2.4 - this.s.casier * 3;
    if (this.affVal('duval') > 30) p += 8;
    if (this.s.rep.legale > 60) p += 5;
    if (this.s.heat > 70) p -= 10;          // trop chaud pour prendre le risque
    return clamp(p, 3, 92);
  };

  G.doBribe = function (amount, expected, reason) {
    var s = this.s;
    if (!this.spend(amount, 'Arrangement')) { NS.UI.toast('Vous ne pouvez pas réunir la somme', 'bad'); return; }
    var odds = this.bribeOdds(amount, expected);
    var msg;
    if (this.chance(odds)) {
      this.heat(-12);
      this.xp('charisme', 10);
      this.hist('crime');
      msg = 'Les billets disparaissent dans une poche de gilet. « Circulez. » ' +
        'Vous ne saurez jamais s’il l’aurait fait pour moins.';
      this.log('<b>Contrôle acheté.</b> ' + this.eur(amount) + ' pour ne pas être fouillé.', 'money');
      if (!this._q) NS.UI.flash('💶 Arrangement accepté', 'good');
    } else {
      this.heat(18);
      this.rep('legale', -8);
      msg = 'Il regarde l’argent, puis vous, puis son collègue. ' +
        '« Vous venez d’ajouter une infraction à la liste. »';
      this.log('<b>Tentative de corruption rejetée.</b>', 'bad');
      if (!this._q) NS.UI.flash('🚨 Corruption refusée', 'bad');
      msg += ' ' + this.resolveStop(reason, 'coop');
      msg += ' ' + (this.arrestCheck('corruption d’agent', 20) ? '' : '');
    }
    NS.UI.resultModal('🚔', 'Contrôle de police', msg);
    NS.UI.refresh(); S.save(s);
  };

  /* =========================================================
     3. Amende
     ========================================================= */
  G.fine = function (amount, reason) {
    var s = this.s;
    amount = Math.max(20, Math.round(amount));
    if (this.spend(amount, 'Amende')) {
      this.log('<b>Amende</b> de ' + this.eur(amount) + ' — ' + reason + '.', 'bad');
      if (!this._q) NS.UI.flash('🧾 Amende : ' + this.eur(amount), 'bad');
      return 'Amende de ' + this.eur(amount) + ', réglée sur place.';
    }
    /* insolvable : la dette s'ajoute et le dossier s'alourdit */
    s.flags.fines = (s.flags.fines || 0) + amount;
    this.bankScore(-5);
    this.log('<b>Amende impayée</b> de ' + this.eur(amount) + ' — ' + reason + '.', 'bad');
    if (!this._q) NS.UI.flash('🧾 Amende impayée : ' + this.eur(amount), 'bad');
    return 'Amende de ' + this.eur(amount) + ' que vous ne pouvez pas payer. Elle vous suivra.';
  };

  /* =========================================================
     4. Perquisition
     ========================================================= */
  G.raid = function (lines) {
    var s = this.s;
    var stash = s.stash || 0;
    var band = this.contraband();

    var found = 0, items = [];
    /* la planque résiste selon la sûreté du logement et votre discrétion */
    var hide = (S.home(s).safe || 0) * 6 + this.lvl('discretion') * 3;
    if (this.chance(clamp(100 - hide, 15, 95))) {
      found = stash;
      s.stash = 0;
    } else if (stash > 0) {
      found = Math.round(stash * 0.35);
      s.stash -= found;
    }
    if (band.dirty) { found += band.dirty; s.dirty = 0; }
    band.items.forEach(function (it) { this.take(it.id, 99); items.push(it.ico + ' ' + it.n); }, this);

    s.totals.raids = (s.totals.raids || 0) + 1;
    this.heat(-20);
    this.rep('legale', -5);

    var msg = '<b>Perquisition à votre domicile.</b> ';
    if (!found && !items.length) {
      msg += 'Ils retournent tout et ne trouvent rien. Vous aviez bien caché.';
    } else {
      msg += 'Saisie de ' + [found ? this.eur(found) : null, items.join(', ') || null].filter(Boolean).join(' et ') + '.';
    }
    lines.push(msg);
    if (!this._q) NS.UI.flash('🚨 Perquisition — ' + (found ? this.eur(found) + ' saisis' : 'rien trouvé'), found ? 'bad' : 'good');

    /* une arme retrouvée chez soi, c'est une procédure */
    if (items.some(function (n) { return n.indexOf('Arme') >= 0; })) {
      this.arrestCheck('détention d’arme à domicile', 25);
    } else if (found > 8000) {
      this.arrestCheck('blanchiment présumé', 30);
    }
  };

  /* =========================================================
     5. Tribunal
     ========================================================= */
  /**
   * Comparution : on peut plaider, contester, ou payer une caution
   * pour rester libre en attendant.
   */
  G.trial = function (reason, sentence) {
    var s = this.s;
    var self = this;
    var bail = Math.round(sentence * 90 * (1 + s.casier * 0.15));
    var pContest = clamp(18 + this.lvl('charisme') * 3 + this.lvl('intelligence') * 3 +
      (s.flags.lawyer ? 22 : 0) + (s.flags.shield ? 18 : 0) - s.casier * 4, 5, 92);

    NS.UI.modal({
      ico: '👨‍⚖️', title: 'Comparution immédiate',
      dismissible: false,
      body: '<p>Vous comparaissez pour <em>' + reason + '</em>. ' +
        'La peine encourue est de <em>' + sentence + ' jours</em>.</p>' +
        '<div class="panel mt">' +
        '<div class="kv"><span>Mentions au casier</span><b>' + s.casier + '</b></div>' +
        '<div class="kv"><span>Avocate au dossier</span><b class="' + (s.flags.lawyer ? 'v-good' : '') + '">' +
        (s.flags.lawyer ? 'Oui — peine réduite' : 'Non') + '</b></div>' +
        '<div class="kv"><span>Chances de relaxe si vous contestez</span><b>' + Math.round(pContest) + ' %</b></div>' +
        '<div class="kv"><span>Caution pour rester libre</span><b>' + this.eur(bail) + '</b></div>' +
        '</div>',
      actions: [
        {
          l: '🙇 Plaider coupable', h: 'Peine réduite d’un tiers, sans risque',
          fn: function () {
            var days = Math.max(1, Math.round(sentence * 0.66 * (s.flags.lawyer ? 0.7 : 1)));
            self.log('Vous reconnaissez les faits. Le tribunal retient ' + days + ' jours.', 'bad');
            self.applySentence(days, reason);
          }
        },
        {
          l: '⚖️ Contester', h: Math.round(pContest) + ' % de relaxe — sinon peine alourdie', risky: true,
          fn: function () {
            if (self.chance(pContest)) {
              self.clearCasier(1);
              self.rep('legale', 4);
              self.log('<b>Relaxe.</b> Le dossier ne tenait pas. Vous sortez libre.', 'good');
              NS.UI.flash('⚖️ Relaxé', 'good');
              NS.UI.refresh(); S.save(s);
            } else {
              var days = Math.round(sentence * 1.25);
              self.log('<b>Condamnation.</b> Contester n’a pas plu : ' + days + ' jours.', 'bad');
              self.applySentence(days, reason);
            }
          }
        },
        {
          l: '💰 Payer la caution (' + this.eur(bail) + ')', h: 'Rester libre, procès plus tard',
          locked: this.canPay(bail) ? null : 'Vous n’avez pas ' + this.eur(bail),
          fn: function () {
            if (!self.spend(bail, 'Caution')) { NS.UI.toast('Caution impossible', 'bad'); return; }
            s.flags.bail = { amount: bail, due: s.day + self.rnd(20, 45), reason: reason, sentence: sentence };
            self.log('<b>Libéré sous caution</b> de ' + self.eur(bail) + '. Le procès aura lieu plus tard.', 'neutral');
            NS.UI.flash('💰 Libre sous caution', 'good');
            NS.UI.refresh(); S.save(s);
          }
        }
      ]
    });
  };

  /** Applique une peine ferme (ou du sursis si elle est courte) */
  G.applySentence = function (days, reason) {
    var s = this.s;
    if (days < 3) {
      this.add('moral', -10);
      this.log('Peine avec sursis. Vous ressortez libre, avec une mention de plus.', 'bad');
      NS.UI.flash('⚖️ Sursis', 'bad');
      NS.UI.refresh(); S.save(s);
      return;
    }
    this.jail(days, reason);
  };

  /** Le procès reporté finit par arriver */
  G.tickBail = function (lines) {
    var s = this.s;
    if (!s.flags.bail) return;
    if (s.day < s.flags.bail.due) return;
    var b = s.flags.bail;
    s.flags.bail = null;
    lines.push('<b>Votre procès a lieu aujourd’hui.</b>');
    this.trial(b.reason + ' (procès reporté)', b.sentence);
  };

  NS.POLICE = true;
})(window.LifeRPG);
