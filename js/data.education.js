/* =============================================================
   data.education.js — Filières post-bac.
   Une fois le Baccalauréat en poche, le joueur choisit UNE filière
   (choix définitif) et la gravit sur trois niveaux : Licence, Master,
   puis un diplôme terminal. Chaque niveau se termine par un examen
   (G.sitFiliereExam) dont la réussite dépend d'une statistique
   (stat/statW), du moral, et du nombre de séances faites en plus
   du minimum (le "bachotage" — capé).
   Un échec ne fait pas tout perdre : la progression recule, mais
   la chance augmente à chaque nouvel échec (streak) pour garantir
   qu'on finit toujours par réussir.
   ============================================================= */
(function (NS) {
  'use strict';
  var D = NS.D;

  D.FILIERES = [
    {
      id: 'info', n: 'Informatique', ico: '💻',
      d: 'Développement, systèmes, données. Le secteur qui recrute le plus vite — à condition de suivre.',
      req: { edu: 3, intelligence: 3, item: 'ordi' },
      levels: [
        {
          n: 'Licence Informatique', short: 'Licence Info', sessions: 14, cost: 140, hours: 4, energy: 18,
          examHours: 4, examEnergy: 20, examBase: 42, stat: 'intelligence', statW: 5.5, req: {}
        },
        {
          n: 'Master Informatique', short: 'Master Info', sessions: 18, cost: 300, hours: 5, energy: 20,
          examHours: 5, examEnergy: 24, examBase: 33, stat: 'intelligence', statW: 6.5, req: { intelligence: 5 }
        },
        {
          n: 'Doctorat en Informatique', short: 'Doctorat Info', sessions: 24, cost: 550, hours: 5, energy: 22,
          examHours: 6, examEnergy: 26, examBase: 23, stat: 'intelligence', statW: 8, req: { intelligence: 7 }
        }
      ]
    },
    {
      id: 'commerce', n: 'Commerce & Gestion', ico: '💼',
      d: 'Vendre, négocier, diriger. Le bagout compte autant que les livres.',
      req: { edu: 3, charisme: 3 },
      levels: [
        {
          n: 'Licence Commerce', short: 'Licence Co.', sessions: 12, cost: 110, hours: 4, energy: 16,
          examHours: 4, examEnergy: 18, examBase: 46, stat: 'charisme', statW: 5, req: {}
        },
        {
          n: 'Master Commerce', short: 'Master Co.', sessions: 16, cost: 240, hours: 5, energy: 18,
          examHours: 5, examEnergy: 22, examBase: 36, stat: 'charisme', statW: 6, req: { charisme: 5 }
        },
        {
          n: 'Executive MBA', short: 'EMBA', sessions: 20, cost: 450, hours: 5, energy: 20,
          examHours: 6, examEnergy: 24, examBase: 26, stat: 'charisme', statW: 7, req: { charisme: 7 }
        }
      ]
    },
    {
      id: 'droit', n: 'Droit', ico: '⚖️',
      d: 'Codes, jurisprudence, plaidoiries. Long, aride, et redoutablement payant au bout.',
      req: { edu: 3, intelligence: 5 },
      levels: [
        {
          n: 'Licence en Droit', short: 'Licence Droit', sessions: 16, cost: 160, hours: 4, energy: 18,
          examHours: 4, examEnergy: 20, examBase: 38, stat: 'intelligence', statW: 5.5, req: {}
        },
        {
          n: 'Master en Droit', short: 'Master Droit', sessions: 20, cost: 340, hours: 5, energy: 20,
          examHours: 5, examEnergy: 24, examBase: 28, stat: 'intelligence', statW: 6.5, req: { intelligence: 6 }
        },
        {
          n: 'Doctorat en Droit', short: 'Doctorat Droit', sessions: 26, cost: 620, hours: 6, energy: 24,
          examHours: 6, examEnergy: 28, examBase: 18, stat: 'intelligence', statW: 8, req: { intelligence: 8 }
        }
      ]
    },
    {
      id: 'sante', n: 'Santé', ico: '🏥',
      d: 'La filière la plus longue et la plus chère. Aussi celle qui paie le plus, au sommet.',
      req: { edu: 3, intelligence: 5, sante: 55 },
      levels: [
        {
          n: 'Licence en Soins Infirmiers', short: 'Licence Santé', sessions: 18, cost: 200, hours: 5, energy: 24,
          examHours: 4, examEnergy: 22, examBase: 36, stat: 'intelligence', statW: 5.5, req: { sante: 50 }
        },
        {
          n: 'Master en Santé Publique', short: 'Master Santé', sessions: 22, cost: 420, hours: 5, energy: 26,
          examHours: 5, examEnergy: 26, examBase: 26, stat: 'intelligence', statW: 6.5, req: { intelligence: 6 }
        },
        {
          n: 'Doctorat en Médecine', short: 'Doctorat Médecine', sessions: 30, cost: 800, hours: 6, energy: 28,
          examHours: 7, examEnergy: 30, examBase: 16, stat: 'intelligence', statW: 8.5, req: { intelligence: 8, sante: 60 }
        }
      ]
    },
    {
      id: 'ingenierie', n: 'Ingénierie', ico: '🔧',
      d: 'Calcul, structure, méthode. Le monde matériel obéit à qui le comprend vraiment.',
      req: { edu: 3, intelligence: 6, force: 2 },
      levels: [
        {
          n: 'Licence en Ingénierie', short: 'Licence Ingé', sessions: 15, cost: 170, hours: 4, energy: 20,
          examHours: 4, examEnergy: 22, examBase: 38, stat: 'intelligence', statW: 5.5, req: {}
        },
        {
          n: 'Master en Ingénierie', short: 'Master Ingé', sessions: 19, cost: 360, hours: 5, energy: 22,
          examHours: 5, examEnergy: 24, examBase: 28, stat: 'intelligence', statW: 6.5, req: { intelligence: 6 }
        },
        {
          n: 'Doctorat en Ingénierie', short: 'Doctorat Ingé', sessions: 25, cost: 600, hours: 5, energy: 24,
          examHours: 6, examEnergy: 26, examBase: 18, stat: 'intelligence', statW: 8, req: { intelligence: 8 }
        }
      ]
    }
  ];

  D.FILIERE = {};
  D.FILIERES.forEach(function (f) { D.FILIERE[f.id] = f; });

  /** Libellés des trois niveaux, pour l'affichage générique */
  D.FILIERE_TIER = ['Licence', 'Master', 'Diplôme terminal'];

})(window.LifeRPG);
