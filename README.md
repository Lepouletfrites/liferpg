# 🎩 De la Rue au Sommet

RPG de simulation de vie textuel, mobile-first, jouable dans le navigateur.
Vous commencez sans rien sur un trottoir. L'objectif : atteindre **1 000 000 €** de patrimoine net avant que la faim, la maladie ou la police ne vous arrêtent.

Inspiré de *Prison Life RPG*, *BitLife* et *Torn*.

---

## ▶️ Lancer le jeu

**Le plus simple :** ouvrez `index.html` dans un navigateur (double-clic). Aucun serveur, aucune installation.

**Via un serveur local :**

```bash
python -m http.server 5544
```

Puis ouvrez `http://localhost:5544`.

**Sur GitHub Pages :** poussez le dépôt, puis *Settings → Pages → Source: Deploy from a branch → `main` / `(root)`*. Le jeu est en ligne en une minute — il n'y a aucune étape de build.

---

## 🎮 Boucle de jeu

Une journée dure **16 heures** (06h → 22h), découpée en quatre périodes : Matin, Midi, Soir, Nuit.
Chaque action consomme des **heures** et de l'**énergie**. À 22h, la nuit s'impose.

La tension centrale du jeu : *survivre coûte les heures que vous devriez investir dans votre sortie.*
Mendier rapporte peu mais est gratuit. Étudier ne rapporte rien aujourd'hui, mais débloque tout le reste.

### Les quatre verrous de la progression

| Verrou | Débloque | Comment le franchir |
|---|---|---|
| **Apparence** (hygiène + tenue) | Petits boulots, entretiens | Savon, fontaine, fripes puis tenue propre |
| **Adresse administrative** | Emplois déclarés | Foyer d'accueil (8 €/nuit) |
| **Diplôme** (5 niveaux) | Postes qualifiés, entreprises | Bibliothèque, cours du soir |
| **Capital** | Entrepreneuriat | Le seul moteur capable de mener au million |

### Jauges

`🍞 Faim` · `⚡ Énergie` · `🙂 Moral` · `🚿 Hygiène` · `❤️ Santé`

La faim à 0 ronge la santé. La santé à 0 met fin à la partie.
Le moral module la réussite de toutes les actions (±30 %).

### Statistiques

`🎭 Charisme` · `🧠 Intelligence` · `💪 Force` — 10 niveaux chacune, XP gagnée par l'usage.

### Réputations

- **🏙️ Rue** — squat, contacts, actions illégales
- **⚖️ Légale** — emplois, diplômes, logement, entreprises
- **🚨 Pression policière** — monte à chaque délit, retombe de 7 points par nuit. Une arrestation à forte pression = prison = fin de partie.

### Fins de partie

| Fin | Condition |
|---|---|
| 🕯️ Mort | Santé à 0 |
| ⛓️ Prison | Arrestation à forte pression, ou 4 arrestations |
| 👑 Victoire | 1 000 000 € de patrimoine net |

Une partie complète représente environ **250 jours** de jeu, soit ~600 actions.

---

## 📁 Architecture

```
index.html          Structure de l'application (en-tête, écran, navigation, modale)
css/style.css       Thème sombre, tokens CSS, composants, responsive
js/
  data.js           CONTENU : actions, objets, boulots, emplois, PNJ, logements, origines
  state.js          État de la partie, localStorage, valeurs dérivées
  engine.js         RÈGLES : temps, jauges, économie, arrestations, nuit, fins
  events.js         Événements aléatoires à choix multiples
  ui.js             Rendu des onglets, modales, toasts
  main.js           Écran titre, création de partie, amorçage
```

Scripts classiques chargés dans l'ordre, sans modules ES ni build — le jeu fonctionne donc aussi bien en `file://` que sur GitHub Pages.
Tout est attaché au namespace global `window.LifeRPG` (`D` données, `S` état, `G` moteur, `EV` événements, `UI` interface).

**Séparation stricte :** `data.js` ne contient que du contenu et des fonctions `run(G)` ; toute la logique vit dans `engine.js`. Ajouter du contenu ne demande donc jamais de toucher au moteur.

---

## 🔧 Ajouter du contenu

**Une action de survie** — ajoutez une entrée à `D.ACTIONS` (`js/data.js`) :

```js
{
  id: 'plasma', ico: '🩸', n: 'Don de plasma', accent: 'var(--danger)',
  d: 'Indemnisé, légal, épuisant.',
  hours: 3, energy: 25, req: { sante: 50, hyg: 40 },
  run: function (G) {
    var gain = G.rnd(30, 45);
    G.cash(gain, 'Don de plasma');
    G.add('sante', -8);
    return { t: 'money', m: 'Trois heures allongé. <b>' + G.eur(gain) + '</b>.' };
  }
}
```

**Un objet** → `D.ITEMS` · **un boulot** → `D.GIGS` · **un emploi** → `D.JOBS` · **un logement** → `D.HOMES` · **un PNJ** → `D.NPCS` · **un événement** → la table `LIST` de `js/events.js`.

### Prérequis disponibles (`req`)

`money` · `hyg` · `sante` · `app` (apparence) · `repRue` · `repLeg` · `edu` · `addr` · `shower` · `charisme` / `intelligence` / `force` (niveau) · `item` / `item2` · `flag` · `period`

L'API `G` fournie aux fonctions `run` : `G.cash`, `G.add`, `G.set`, `G.xp`, `G.rep`, `G.heat`, `G.give`, `G.take`, `G.aff`, `G.flag`, `G.rnd`, `G.rndF`, `G.chance`, `G.pick`, `G.has`, `G.lvl`, `G.gauge`, `G.apparence`, `G.period`, `G.home`, `G.eur`, `G.spendTime`, `G.arrestCheck`.

---

## 💾 Sauvegarde

Sauvegarde automatique dans le `localStorage` après chaque action, sous la clé `liferpg.save.v1`.
Boutons **Sauvegarder** et **Nouvelle partie** dans l'onglet *Profil*.

---

## ⚖️ Repères d'équilibrage

Mesurés sur une partie automatisée suivant le parcours optimal :

| Étape | Jour |
|---|---|
| Premier toit | 3 – 9 |
| Premier emploi déclaré | 8 – 12 |
| 1 000 € | ~47 |
| Première entreprise | ~50 |
| 10 000 € | ~90 |
| 100 000 € | ~185 |
| 1 000 000 € | ~250 |

Les constantes principales se règlent en haut de `data.js` (`D.DAY_START`, `D.DAY_END`, `D.xpNeeded`, `D.TIERS`, `D.WIN_NET`) et dans `engine.js` (`G.spendTime` pour l'usure horaire).
La fréquence des événements se règle via `ACTION_CHANCE` et `NIGHT_CHANCE` en haut de `events.js`.
