---
title: "feat: US 23 — Quatre actifs, et la Potion de Soin tranchée"
type: feat
status: completed
date: 2026-07-27
---

# US 23 — La barre d'actifs devient un vrai choix

Un seul actif fonctionnait (le Cri de Guerre), câblé en dur avec ses propres variables. La Potion de
Soin était un bouton inerte depuis V2.

## La Potion de Soin est retirée

Elle promettait de restaurer des PV **que l'armée n'a pas** — SPEC dit « l'armée n'a pas de PV (on
simplifie) ». Lui en donner aurait introduit la mort, donc le risque de soft-lock, dans un jeu conçu
sans. Décision : la remplacer par un actif qui exploite une mécanique réelle.

## Quatre actifs, quatre mécaniques différentes

| | Actif | Effet | Durée | Cooldown | Ouvert à |
|---|---|---|---|---|---|
| 📯 | **Cri de Guerre** | ×2 dégâts | 10 s | 25 s | zone 1 |
| 🧪 | **Potion de Rage** | +40 points de critique | 8 s | 40 s | zone 2 |
| 🗡️ | **Percée** | ignore l'armure | 12 s | 50 s | zone 3 |
| 💰 | **Ferveur** | ×3 or | 15 s | 60 s | zone 4 |

Chacun exploite un levier **différent** (dégâts, critique, armure, économie) — un test vérifie qu'aucun
n'en double un autre. Le moment du clic compte : le Cri sur un gros paquet de PV, la Rage et la Percée
contre un boss blindé, la Ferveur pour financer un palier de troupe.

Deux garde-fous testés : la **durée est toujours inférieure au cooldown** (un actif reste un acte, pas
un état), et les paliers de déblocage sont **tous distincts** (on ne noie pas le joueur sous quatre
boutons d'un coup).

## Ce qui modifie quoi, et pourquoi

- Les nœuds « cooldown des actifs » de l'Arbre s'appliquent à **tous** les actifs — c'est ce que leur
  libellé promet.
- Les bonus de durée du Cri (nœud « Cor de Guerre », règle de biome « Bain de Sang ») ne touchent **que
  le Cri**, également par fidélité à leurs libellés.

Un test vérifie chacune de ces deux portées, dans les deux sens.

## Détails d'implémentation

- **Un `invocationId` par actif** : deux actifs différents ne doivent pas annuler les timers l'un de
  l'autre. Vérifié au navigateur en cumulant Cri et Rage.
- **Réassignation et non mutation** de `activeState` : Svelte ne suit pas les objets imbriqués.
- **Les actifs ne sont jamais persistés en cours d'effet.** `freshActiveState()` reconstruit tout prêt
  et rien d'actif au chargement — sinon un rechargement au mauvais moment figerait un buff pour
  toujours.
- **Le prestige invalide les timers en vol** avant de réinitialiser : un buff du run précédent n'a plus
  d'objet.

## Équilibre

Les actifs supposent un joueur présent, donc le simulateur les ignore (comme depuis US 15). L'équilibre
passif est inchangé : premier run **25:56**, identique à US 22.

Mesuré au navigateur : la Potion de Rage fait passer le critique de **8% à 48%**, le Cri double le dps
(1 993 → 3 986), et la Percée gagne **38%** sur un boss à 35% d'armure.

## Critères d'acceptation

- [x] **CA1** La Potion de Soin ne figure plus au catalogue (test).
- [x] **CA2** Quatre actifs, quatre mécaniques distinctes, tous présentables.
- [x] **CA3** Durée < cooldown pour chacun ; plancher de cooldown à 1 s.
- [x] **CA4** Déblocage progressif à paliers distincts.
- [x] **CA5** Le cooldown de l'Arbre porte sur tous, les bonus du Cri sur lui seul.
- [x] **CA6** Deux actifs simultanés n'interfèrent pas.
- [x] **CA7** Aucun buff persisté ; le prestige remet tout à plat.
- [x] **CA8** `npm test` vert (193), build OK, chaque effet vérifié au navigateur.
