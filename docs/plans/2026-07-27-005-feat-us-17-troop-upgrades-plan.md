---
title: "feat: US 17 — Améliorer les troupes (paliers + améliorations en or)"
type: feat
status: completed
date: 2026-07-27
---

# US 17 — Les troupes s'améliorent, pas seulement s'accumulent

Jusqu'ici, la seule décision économique était « combien j'en achète ». Deux leviers s'ajoutent, tous
deux payés en **or** (donc remis à zéro par la Croisade, comme les troupes — l'Arbre de Gloire reste
le seul progrès permanent).

## 1. Paliers automatiques

Franchir un seuil d'unités d'un tier **double son dps**. Seuils : **25, 100, 400** (×8 au total).

Gratuit, automatique, et c'est ce qui donne enfin du sens au recrutement en masse : le 25ᵉ paysan vaut
bien plus que le 24ᵉ. La carte affiche le multiplicateur courant (`×9,5`) et le prochain palier
(« encore 6 pour ×2 ») — sans cette seconde ligne, le palier est invisible tant qu'il n'est pas atteint.

## 2. Quatre améliorations achetables par tier

Volontairement **trois effets différents**, pour que la question ne soit pas « laquelle est la
meilleure » mais « de quoi ai-je besoin maintenant » :

| | Ligne | Effet | Niveaux | Prix de base (Paysan) |
|---|---|---|---|---|
| 🎯 | Entraînement | ×1,3 dps **de ce tier** par niveau | 5 | 1 500 |
| 🛠️ | Équipement | ×1,4 dps **de ce tier** par niveau | 5 | 7 500 |
| 🚩 | Bannière | +10% dps de **toutes** les troupes | 3 | 36 000 |
| 💰 | Pillage | +15% **d'or** | 3 | 18 000 |

Le prix est **proportionnel au `baseCost` du tier** : améliorer un Champion coûte mille fois plus
qu'améliorer un Paysan, sans une seule valeur en dur. Il monte ×5 par niveau, ce qui pousse à répartir
entre tiers plutôt qu'à empiler un seul.

## Calibrage — la première version cassait le jeu

Premier jet : seuils `10/25/50/100/200` (×32) et multiplicateurs 1,6 / 1,8. Mesuré au simulateur
(`scripts/simulate.mjs`, dont la politique d'investissement a été étendue pour **mettre recruter et
améliorer en concurrence** à chaque tick, au meilleur dps par pièce) :

| Variante | 1ᵉʳ run | Cycles |
|---|---|---|
| Sans améliorations (US 16) | 31:10 | 31 → 20:34 → 18:49 → 13:44 → … |
| **Premier jet** | **15:50** | 15:50 → 9:48 → 7:55 → 3:14 → … → 2:02 |
| coûts ×3 | 17:38 | 17:38 → 11:22 → 9:47 → 4:48 |
| mults doux (1,3 / 1,4) | 17:40 | 17:40 → 11:33 → 9:38 → 4:39 |
| seuils espacés (25/100/400) | 23:22 | 23:22 → 14:50 → 13:09 → 7:54 |
| **doux + coûts ×3 + espacés** ← retenu | **28:21** | 28:21 → 18:03 → 17:00 → 11:43 → 10:30 → 8:54 → 4:15 |
| doux + coûts ×6 + espacés | 29:11 | quasi identique — le ×6 n'apporte rien |

Le premier jet **divisait la durée du premier run par deux** : les améliorations écrasaient tout le
reste du jeu. La version retenue garde le rythme d'avant (28:21 contre 31:10) tout en ajoutant un
second levier — c'est le but : enrichir la décision, pas raccourcir la partie.

Gain maximal par tier : paliers (×8) × Entraînement (1,3⁵) × Équipement (1,4⁵) ≈ **×160**. Un test
verrouille cette borne des deux côtés (assez spectaculaire, pas au point d'écraser le recrutement).

## Un bug d'affichage attrapé au navigateur

`formatNumber()` arrondit vers le bas : un multiplicateur de ×1,69 durement acheté s'affichait
**« ×1 »**. Ajout de `formatMult()` — une décimale sous 10, entier au-dessus (à ×160 la décimale
n'apprend plus rien). Au passage, `format.js` n'avait aucun test : il en a maintenant.

## Critères d'acceptation

- [x] **CA1** `src/lib/upgrades.js` pur et testé : paliers, prix, achat, agrégation, sanitize.
- [x] **CA2** Franchir un seuil double le dps du tier, visible immédiatement sur la carte.
- [x] **CA3** Les 4 lignes s'achètent en or, prix ×5 par niveau, proportionnels au tier.
- [x] **CA4** Bannière et Pillage sont bien **transverses** (dps global / or), pas propres au tier.
- [x] **CA5** Persistance ; une save sans `troopUpgrades` se charge ; niveaux absurdes écartés.
- [x] **CA6** La Croisade remet les améliorations à zéro (elles sont payées en or).
- [x] **CA7** Équilibre mesuré : premier run ≥ 25 min, aucun cycle qui rallonge.
- [x] **CA8** `npm test` vert, build OK, desktop + 375 px sans débordement.
