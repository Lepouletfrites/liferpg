/* =============================================================
   audio.js — Bande son optionnelle.
   Les fichiers vivent dans /audio (voir audio/README.md). Aucun
   n'est obligatoire : un fichier absent est simplement ignoré.
   ============================================================= */
(function (NS) {
  'use strict';

  var A = {};
  var KEY = 'liferpg.audio';
  var EXT = ['mp3', 'ogg', 'm4a', 'wav'];

  var TRACKS = {
    theme: { loop: true, vol: 0.5 },
    day: { loop: true, vol: 0.35 },
    night: { loop: true, vol: 0.35 },
    tension: { loop: true, vol: 0.4 },
    success: { loop: false, vol: 0.7 },
    fail: { loop: false, vol: 0.7 },
    cash: { loop: false, vol: 0.5 }
  };

  var pool = {};        // id -> HTMLAudioElement | null (null = absent)
  var current = null;   // ambiance en cours
  var unlocked = false;

  A.prefs = { on: false, vol: 0.6 };

  try {
    var raw = localStorage.getItem(KEY);
    if (raw) A.prefs = JSON.parse(raw);
  } catch (e) {}

  function save() { try { localStorage.setItem(KEY, JSON.stringify(A.prefs)); } catch (e) {} }

  /** Cherche le fichier dans les extensions acceptées, sans jamais lever d'erreur */
  function load(id) {
    if (pool[id] !== undefined) return pool[id];
    pool[id] = null;
    var i = 0;
    (function tryNext() {
      if (i >= EXT.length) return;
      var el = new Audio('audio/' + id + '.' + EXT[i++]);
      el.preload = 'auto';
      el.addEventListener('canplaythrough', function () {
        if (pool[id]) return;
        el.loop = !!TRACKS[id].loop;
        pool[id] = el;
        if (current === id) A.ambience(id);   // l'ambiance attendue vient d'arriver
      }, { once: true });
      el.addEventListener('error', tryNext, { once: true });
    })();
    return null;
  }

  A.available = function (id) { return !!pool[id]; };

  A.setOn = function (on) {
    A.prefs.on = !!on;
    save();
    if (!on) A.stopAll();
    else if (current) A.ambience(current, true);
  };

  A.setVolume = function (v) {
    A.prefs.vol = Math.max(0, Math.min(1, v));
    save();
    Object.keys(pool).forEach(function (id) {
      if (pool[id]) pool[id].volume = TRACKS[id].vol * A.prefs.vol;
    });
  };

  A.stopAll = function () {
    Object.keys(pool).forEach(function (id) {
      var el = pool[id];
      if (el && TRACKS[id].loop) { try { el.pause(); el.currentTime = 0; } catch (e) {} }
    });
  };

  /** Ambiance de fond : une seule à la fois */
  A.ambience = function (id, force) {
    if (!TRACKS[id]) return;
    if (current === id && !force) return;
    if (current && pool[current]) { try { pool[current].pause(); } catch (e) {} }
    current = id;
    if (!A.prefs.on || !unlocked) { load(id); return; }
    var el = pool[id] || load(id);
    if (!el) return;
    el.volume = TRACKS[id].vol * A.prefs.vol;
    var p = el.play();
    if (p && p.catch) p.catch(function () {});
  };

  /** Effet ponctuel */
  A.sfx = function (id) {
    if (!A.prefs.on || !unlocked || !TRACKS[id]) return;
    var el = pool[id] || load(id);
    if (!el) return;
    try {
      el.currentTime = 0;
      el.volume = TRACKS[id].vol * A.prefs.vol;
      var p = el.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  };

  /** Choisit l'ambiance qui correspond à la situation */
  A.sync = function (st) {
    if (!st) return;
    var want = 'day';
    if (st.heat >= 60) want = 'tension';
    else if (st.hour >= NS.D.DAY_END) want = 'night';
    A.ambience(want);
  };

  /* Les navigateurs exigent un geste avant de jouer du son */
  A.unlock = function () {
    if (unlocked) return;
    unlocked = true;
    if (current) A.ambience(current, true);
  };

  document.addEventListener('pointerdown', function () { A.unlock(); }, { once: true });

  /* Précharge en tâche de fond ; les absents restent simplement à null */
  Object.keys(TRACKS).forEach(load);

  NS.AUDIO = A;
})(window.LifeRPG);
