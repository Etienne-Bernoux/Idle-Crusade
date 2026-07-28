---
title: Dépendances réactives cachées dans une fonction (Svelte)
category: patterns
date: 2026-07-28
tags: [svelte, reactivite, derived, piege, debug, vibe-code]
project: idle-crusade
related_pr:
  - https://github.com/Etienne-Bernoux/Idle-Crusade/pull/22
  - https://github.com/Etienne-Bernoux/Idle-Crusade/pull/25
  - https://github.com/Etienne-Bernoux/Idle-Crusade/pull/26
---

# Une fonction qui lit une variable réactive casse la réactivité

Rencontré **trois fois** en une session, avec trois symptômes différents et la même cause. Aucun test
unitaire ne peut l'attraper : la logique pure est juste, c'est le câblage qui est muet.

## La règle

Svelte détermine les dépendances d'un bloc `$:` en analysant **statiquement les identifiants qui y
apparaissent**. Si un dérivé appelle une fonction qui lit une variable réactive **dans son corps**,
cette variable n'apparaît pas dans le bloc : Svelte ne la voit pas, et le dérivé **ne se recalcule
jamais** quand elle change.

```js
// ❌ La dépendance à `biome` est invisible : $: zone garde sa première valeur
function zoneOf(n) {
  return build(n, biome)
}
$: zone = zoneOf(currentZone)

// ✅ La valeur passe en argument : Svelte voit `biome` dans le bloc
function zoneOf(n, biomeId = biome) {
  return build(n, biomeId)
}
$: zone = zoneOf(currentZone, biome)
```

## Variante : lire un dérivé dans le même tour synchrone

Même famille, autre mécanisme. Un `$:` n'est pas recalculé **immédiatement** après la mutation de sa
source, mais au prochain cycle de mise à jour. Donc du code impératif qui mute puis lit dans la même
foulée travaille sur l'ancienne valeur :

```js
// ❌ spawnNextEnemy() lit le dérivé `biomeFx`, pas encore recalculé
biome = resolveBiome(pendingBiome, deepestEver)
spawnNextEnemy()

// ✅ recalculer depuis le PRIMITIF à la demande
function currentBiomeFx() { return biomeEffects(biome) }
```

C'est la même discipline que celle déjà en vigueur dans ce repo pour `costOf` : **recalculer depuis le
primitif, jamais lire la dérivée**.

## Les trois incidents

| US | Symptôme | Cause |
|---|---|---|
| 17 | `troopRows` ne se met pas à jour à l'achat d'Intendance | `costOf(id)` lisait `meta.costMult` dans son corps |
| 20 | Les PV du biome ne s'appliquent pas — 75 dans les deux biomes | `scaledEnemy()` lisait le dérivé `biomeFx`, muté juste avant |
| 21 | Les **ennemis** sont du bon biome, mais **le nom de zone et le nombre de vagues** sont périmés | `zoneOf(n)` lisait `biome` dans son corps |

Le troisième est le plus instructif : les ennemis étaient corrects parce que `spawnNextEnemy()` est
appelé **impérativement** après le changement de biome, donc il rappelait la fonction au bon moment.
Seul le dérivé `$: zone` restait figé. Un état partiellement juste est plus difficile à voir qu'un état
franchement cassé.

## Symptôme à reconnaître

**Une partie de l'écran suit la donnée, une autre non.** C'est la signature : le code impératif
(spawn, clic, timer) voit la nouvelle valeur, les dérivés gardent l'ancienne. Si tout était périmé, on
soupçonnerait la donnée elle-même ; là, on soupçonne à tort la source.

## Comment l'éviter

- Toute fonction appelée depuis un `$:` reçoit ses dépendances réactives en **arguments**.
- Le dérivé les passe **explicitement**, même quand la fonction a un défaut qui les lit
  (`zoneOf(currentZone, biome)`) : c'est ce qui les rend visibles à l'analyse statique.
- Un cache mémoïsé doit inclure ces valeurs dans sa **clé** — sinon il resservira l'entrée du biome
  précédent alors même que la réactivité est réparée.
- Vérification : changer la donnée en jeu et comparer **deux affichages différents** qui en dépendent.
  Un seul suffit à masquer le bug.

## Voir aussi

- [idle-game-tick-and-popups.md](idle-game-tick-and-popups.md) — patterns de tick et de timers
- `docs/DESIGN.md` § Biomes et § Rôles de troupes — les deux endroits où le piège a mordu
