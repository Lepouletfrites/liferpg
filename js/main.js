/* =============================================================
   main.js — Amorçage : écran titre, création de partie, reprise.
   ============================================================= */
(function (NS) {
  'use strict';

  var D = NS.D, S = NS.S, G = NS.G, UI = NS.UI;
  var MAIN = {};
  var chosenOrigin = 'expulse';

  var $ = function (id) { return document.getElementById(id); };

  /* ---------------------------------------------------------
     Écran titre
     --------------------------------------------------------- */
  function paintOrigins() {
    $('origins').innerHTML = D.ORIGINS.map(function (o) {
      return '<button class="origin' + (o.id === chosenOrigin ? ' is-sel' : '') + '" data-o="' + o.id + '">' +
        '<div class="origin__n">' + o.ico + ' ' + o.n + '</div>' +
        '<div class="origin__d">' + o.d + '</div></button>';
    }).join('');
  }

  function bindSplash() {
    paintOrigins();

    $('origins').addEventListener('click', function (e) {
      var b = e.target.closest('.origin');
      if (!b) return;
      chosenOrigin = b.dataset.o;
      paintOrigins();
    });

    $('btnNew').addEventListener('click', function () {
      var name = ($('inputName').value || '').trim() || 'Sam';
      startNew(name, chosenOrigin);
    });

    $('btnContinue').addEventListener('click', function () {
      var st = S.load();
      if (!st) return;
      boot(st, false);
    });

    if (S.hasSave()) {
      var prev = S.load();
      if (prev) {
        $('btnContinue').hidden = false;
        $('btnContinue').textContent = 'Reprendre — ' + prev.name + ', jour ' + prev.day;
        $('btnNew').classList.remove('btn--gold');
        $('btnContinue').classList.add('btn--gold');
        $('btnNew').textContent = 'Nouvelle vie';
      }
    }
  }

  function hideSplash() {
    var sp = $('splash');
    sp.classList.add('hide');
    setTimeout(function () { sp.style.display = 'none'; }, 460);
  }

  /* ---------------------------------------------------------
     Démarrage
     --------------------------------------------------------- */
  var INTRO = [
    'Vous vous réveillez sur le béton, la joue contre un sac qui ne contient presque rien.',
    'Personne ne vous attend nulle part. C’est la mauvaise nouvelle.',
    'Personne ne décide plus à votre place. C’est la seule qui compte.'
  ];

  function startNew(name, origin) {
    var st = S.create(name, origin);
    G.attach(st);
    G.log('— JOUR 1 —', 'day');
    INTRO.slice().reverse().forEach(function (l) { G.log(l, 'event'); });
    var o = D.ORIGINS.filter(function (x) { return x.id === origin; })[0];
    G.log('<b>' + o.ico + ' ' + o.n + '</b> — ' + o.d, 'event');
    S.save(st);
    boot(st, true);
  }

  function boot(st, isNew) {
    G.attach(st);
    UI.init(G);
    UI.setTab('survie');
    hideSplash();

    if (st.over) { setTimeout(UI.gameOver, 600); return; }
    if (st.jail) { setTimeout(function () { UI.jailScreen(st.jail.days, st.jail.reason); }, 600); return; }

    if (isNew) {
      setTimeout(function () {
        UI.modal({
          ico: '🌅', title: 'Jour 1',
          body: '<p>Il est 6 heures. Vous disposez de <em>16 heures</em> avant la nuit, ' +
            'et chaque action en consomme une partie. Après 22 h, vous pourrez choisir de <em>veiller</em> : ' +
            'six heures de plus, plus rentables, plus dangereuses, et payées sur votre sommeil.</p>' +
            '<p>Trois choses vous tueront si vous les négligez : la <em>faim</em>, la <em>santé</em>, le <em>moral</em>. ' +
            'Trois choses vous sortiront d’ici : l’<em>hygiène</em>, une <em>adresse</em>, un <em>diplôme</em>. ' +
            'Une quatrième vous y ramènera si vous en abusez : la <em>pression policière</em>.</p>' +
            '<p><em>Appuyez longuement</em> sur n’importe quelle action pour ouvrir sa fiche détaillée : ' +
            'plage de gains réelle, taux de réussite, risque pénal et statistiques qui l’influencent.</p>',
          actions: [{ l: 'Commencer', h: 'Bonne chance.', fn: null }]
        });
      }, 700);
    }
  }

  var wiping = false;

  MAIN.reset = function () {
    wiping = true;
    S.wipe();
    location.reload();
  };

  /* ---------------------------------------------------------
     Go
     --------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    bindSplash();

    var last = 0;
    document.addEventListener('touchend', function (e) {
      var now = Date.now();
      if (now - last <= 300) e.preventDefault();
      last = now;
    }, { passive: false });

    window.addEventListener('beforeunload', function () {
      if (!wiping && G.s) S.save(G.s);
    });
  });

  NS.MAIN = MAIN;
})(window.LifeRPG);
