# Bande son

Déposez ici vos fichiers audio. Le jeu les détecte au chargement s'ils portent
l'un de ces noms (formats acceptés : `.mp3`, `.ogg`, `.m4a`, `.wav`) :

| Fichier            | Rôle                                              |
|--------------------|---------------------------------------------------|
| `theme.mp3`        | Thème de l'écran titre                            |
| `day.mp3`          | Ambiance de jour (boucle)                         |
| `night.mp3`        | Ambiance de nuit (boucle)                         |
| `tension.mp3`      | Ambiance quand la pression policière est élevée   |
| `success.mp3`      | Réussite marquante (promotion, diplôme, gros coup)|
| `fail.mp3`         | Échec marquant (arrestation, expulsion)           |
| `cash.mp3`         | Encaissement                                      |

Les fichiers absents sont simplement ignorés — aucune erreur, aucun 404 bloquant.

Le volume et l'activation se règlent dans l'onglet **Profil**, et le choix est
mémorisé dans le navigateur. La musique ne démarre qu'après une première
interaction (contrainte des navigateurs).

Pour qu'un morceau soit disponible hors-ligne, ajoutez son chemin à la liste
`SHELL` dans `sw.js` et incrémentez `VERSION`.
