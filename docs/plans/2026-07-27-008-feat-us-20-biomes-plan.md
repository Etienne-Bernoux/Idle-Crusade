---
title: "feat: US 20 — Biomes choisissables (plus durs, plus rémunérateurs)"
type: feat
status: completed
date: 2026-07-27
---

# US 20 — Choisir sa difficulté

Réponse à la question laissée ouverte en US 18 : les biomes **se choisissent**. Avant chaque Croisade,
le joueur décide dans quel biome il repart. Plus dur = plus rémunérateur.

## Une dimension orthogonale aux zones

Un biome multiplie les **PV de tous les ennemis** du run et, en retour, l'**or et la Gloire** gagnés.
Les zones (Forêt, Ruines… puis leurs cycles de profondeur) restent la progression *à l'intérieur* d'un
run ; le biome règle la dureté de ce run.

| | Biome | Ennemis | Butin et Gloire | S'ouvre en atteignant |
|---|---|---|---|---|
| 🌿 | Terres de Croisade | ×1 | ×1 | — |
| 🥀 | Terres Maudites | ×5 | ×2,2 | zone 5 |
| 🌑 | Royaume des Ombres | ×25 | ×4,8 | zone 7 |
| 🩸 | Abîme Écarlate | ×125 | ×10,5 | zone 9 |
| 🕳️ | Néant | ×625 | ×23 | zone 11 |

**Pourquoi un multiplicateur global et pas un « départ en zone avancée »** : mesuré en US 16, démarrer
plus loin *rallonge* le run — on affronte des ennemis coriaces sans les revenus des zones sautées. Un
multiplicateur décale la courbe entière, revenus compris.

Le déblocage repose sur `deepestEver`, un **record permanent** distinct de `zonesCleared` (propre au
run) : un biome resté ouvert le reste.

## Calibrage : la mesure a corrigé ma métrique avant mes chiffres

Premier réflexe : comparer le **rendement instantané** (Gloire par minute) d'un run selon le biome, à
niveau d'arbre fixe. Résultat incohérent — l'optimum sautait de B1 à B2 à B1 selon le palier, et le
basculement n'arrivait qu'avec l'arbre complet. Le rendement d'un run isolé n'est pas ce qu'un joueur
ressent.

Bonne métrique : **la progression cumulée sur une série de cycles**. Sur 12 Croisades :

| Stratégie | Temps de jeu | Arbre atteint | Gloire cumulée |
|---|---|---|---|
| Rester dans le premier biome | 160 min | **28/50** | 1 520 |
| Monter dès qu'un biome s'ouvre | 275 min | **41/50** | 3 868 |

Deux enseignements :

1. **Monter coûte du temps (+72%) et rapporte de la progression (+154%)** : c'est un arbitrage réel,
   pas un passage obligé. Le joueur pressé reste, le joueur patient monte.
2. **Rester dans le premier biome plafonne l'Arbre à 28/50.** On ne peut pas le terminer sans monter en
   difficulté — le biome devient la raison structurelle de progresser, et pas un simple habillage.

Facteurs testés : ×2,2 / ×2,5 / ×2,8 de récompense par palier. À ×2,8 monter devient évident (+35% de
temps pour +258% de gain), donc le choix disparaît. **×2,2 retenu.**

Invariant verrouillé par un test : `rewardMult < hpMult` pour chaque biome. Si la récompense montait
aussi vite que la difficulté, monter serait toujours gagnant et le choix n'existerait plus. Le gain
vient de ce qu'un joueur fort traverse la difficulté plus vite qu'elle ne monte.

## Un bug de timing Svelte, invisible aux tests unitaires

Le multiplicateur de PV ne s'appliquait pas : 75 PV dans les deux biomes, mesuré au navigateur.

`scaledEnemy()` lisait le **dérivé** `$: biomeFx`. Or `doPrestige()` et `hydrate()` changent `biome`
puis appellent `spawnNextEnemy()` **dans le même tour synchrone**, où un `$:` n'est pas encore
recalculé : le premier ennemi sortait avec les PV du biome précédent.

Corrigé en lisant toujours depuis le **primitif** (`biomeEffects(biome)` appelé à la demande), ce qui
est déjà la règle du repo pour `costOf` et les multiplicateurs de reliques. Le dérivé ne sert plus qu'à
l'affichage, qui n'a pas cette contrainte. Aucun test unitaire ne pouvait attraper ça — c'est le
pilotage navigateur qui l'a montré.

## UI

Le choix se fait dans l'écran de Croisade (« Où repartir ? ») : chaque biome affiche son effet, son
bonus, ou sa condition de déblocage. Le prochain objectif est rappelé avec le record actuel
(« Prochain : 🌑 Royaume des Ombres — zone 7, record : 5 »).

Le HUD affiche le biome courant et son bonus dès qu'on quitte le premier. Et comme le gain annoncé est
celui du run *qui s'achève*, un message précise que le biome choisi s'appliquera au run suivant —
sans ça, le ×2,2 pouvait se lire comme immédiat.

## Critères d'acceptation

- [x] **CA1** 5 biomes ordonnés, difficulté et récompense strictement croissantes.
- [x] **CA2** `rewardMult < hpMult` pour tous : monter n'est jamais gratuit.
- [x] **CA3** Déblocage sur record permanent ; une save bricolée ne démarre pas dans le Néant.
- [x] **CA4** Les PV des ennemis sont bien multipliés (vérifié 75 → 375 au navigateur).
- [x] **CA5** Or et Gloire bonifiés du même facteur.
- [x] **CA6** Choix dans l'écran de Croisade, appliqué au run suivant, persisté.
- [x] **CA7** Équilibre mesuré sur 12 cycles, pas sur un run isolé.
- [x] **CA8** `npm test` vert, build OK, desktop + 375 px.

## Suite possible

Les biomes sont aujourd'hui des **paliers de difficulté** : ils partagent le même contenu. L'étape
suivante, si tu veux aller plus loin, serait de leur donner des **profils différents** (un biome où l'or
abonde mais les reliques sont rares, un autre à l'inverse), ce qui transformerait le choix « quand
monter » en « où aller ». Ça demande d'étendre `biomes.js` avec des multiplicateurs par nature de
récompense — la structure s'y prête déjà.
