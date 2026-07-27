---
title: "feat: US 22 — Combat vivant : types, affinités, armure, critiques"
type: feat
status: completed
date: 2026-07-27
---

# US 22 — Le combat devient une décision

Jusqu'ici un tick faisait `dps` dégâts, avec une variance décorative de ±4. Trois couches s'ajoutent,
chacune avec une décision de joueur derrière.

## 1. Types et affinités — recruter devient tactique

Cinq natures d'ennemis : 🐾 Bête · 💀 Mort-vivant · 😈 Démon · 🌑 Ombre · 🗿 Construct.

**Le type est porté par la ZONE**, pas par chaque créature : le joueur lit « ici, des morts-vivants »
et adapte sa caserne. Un type par mob rendrait la consigne illisible — c'est un contrat assumé,
verrouillé par un test.

| Tier | Fort contre (×1,5) | Faible contre (×0,7) |
|---|---|---|
| Paysan | 🐾 Bête | 🗿 Construct |
| Soldat | 💀 Mort-vivant | 🌑 Ombre |
| Chevalier | 😈 Démon · 🗿 Construct | 🐾 Bête |
| Champion | 🌑 Ombre · 😈 Démon | — |

Le Champion n'a pas de faiblesse : c'est la valeur du tier d'endgame, ne plus avoir à réfléchir.

**Impact mesuré, à dps nominal IDENTIQUE (12 000) :**

| Composition | 🐾 | 💀 | 😈 | 🌑 | 🗿 |
|---|---|---|---|---|---|
| 100% paysans | **20 880** | 13 920 | 13 920 | 13 920 | 9 744 |
| 100% soldats | 13 920 | **20 880** | 13 920 | 9 744 | 13 920 |
| 100% chevaliers | 9 744 | 13 920 | **20 880** | 13 920 | **20 880** |
| équilibrée | 14 848 | 16 240 | 16 240 | 12 528 | 14 848 |

L'écart entre la meilleure et la pire composition va de **×1,43 à ×2,14**. L'armée équilibrée n'est
jamais la meilleure ni la pire : il y a un vrai arbitrage entre spécialisation et polyvalence.

Et comme les biomes ont des peuplements différents (le Royaume des Ombres est presque tout en ombres,
le Néant en constructs), le choix du biome influence celui de la caserne.

## 2. Armure — le grignotage ne suffit plus

Chaque ennemi encaisse un pourcentage des dégâts. Les valeurs viennent du **barème commun** (c'est une
valeur, pas un thème) : mobs de 0 à 20%, boss de 15 à 55%, plafond absolu à 80% pour qu'aucun ennemi ne
devienne mathématiquement invincible. Un plancher de 1 dégât est garanti.

## 3. Critiques — le hasard rendu visible et satisfaisant

8% de chance de base, ×3 dégâts, **et l'armure est ignorée**. C'est l'interaction qui compte :

| Armure du boss | Sans critique | Avec 30% de critique | Gain |
|---|---|---|---|
| 0% | 12 000 | 19 200 | ×1,60 |
| 25% | 9 000 | 17 100 | ×1,90 |
| 45% | 6 600 | 15 420 | ×2,34 |
| 55% | 5 400 | 14 580 | **×2,70** |

Plus le boss est blindé, plus un critique est décisif — c'est le moment de jeu qu'on veut rendre
mémorable. Retour visuel dédié : pop doré « CRITIQUE ! » plus gros et plus haut que les autres, plus un
flash orangé court, distinct du flash légendaire.

**Trois nouvelles reliques** portent un effet `crit` (Dague du Traître, Œil du Faucon, Gantelet Brisé),
réparties sur trois slots différents pour qu'elles ne se concurrencent pas. Elles ajoutent des
**points** (+3 base, ×6 en légendaire = +18 sur une base de 8), pas un pourcentage relatif : c'est
lisible et borné par un test.

La variance décorative ±4 disparaît : le hasard du jeu, c'est le critique, et il se voit.

## Équilibre

Le dps **affiché** est désormais une moyenne (`averageHit`) et non le dernier tirage : un joueur veut
une valeur stable pour comparer ses achats. Un test vérifie que 20 000 tirages de `computeHit`
convergent vers `averageHit` à moins de 5%.

Le simulateur consomme la même fonction, donc l'équilibrage reste comparable : premier run **25:56**
contre 28:21 avant US 22. Les critiques compensent l'armure à 8% près — aucun réétalonnage nécessaire.

## Détail attrapé au navigateur

« Squelette Croulant » apparaissait typé 🐾 Bête dans la Forêt Sombre. Le contrat (un type par zone)
est assumé, mais un squelette au milieu des bêtes se voit : le mob est devenu « Sanglier Enragé ».

## Critères d'acceptation

- [x] **CA1** `src/lib/combat.js` pur, rng injectable, entièrement testé.
- [x] **CA2** Cinq types, quatre profils d'affinité distincts, tout tier sauf le Champion a une faiblesse.
- [x] **CA3** Les affinités s'appliquent tier par tier (pas sur un dps global).
- [x] **CA4** Armure plafonnée, plancher de 1 dégât, boss mieux protégés que leurs mobs.
- [x] **CA5** Un critique multiplie ET perce l'armure.
- [x] **CA6** `averageHit` est l'espérance de `computeHit` (test de convergence sur 20 000 tirages).
- [x] **CA7** UI : type et armure sur l'ennemi, force/faiblesse dans la caserne, chance de crit au HUD.
- [x] **CA8** Pop et flash de critique distincts du reste.
- [x] **CA9** `npm test` vert (178), build OK, tout vérifié au navigateur.
