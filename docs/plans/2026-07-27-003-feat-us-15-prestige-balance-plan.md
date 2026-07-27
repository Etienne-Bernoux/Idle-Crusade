---
title: "feat: US 15 — Simulateur d'équilibrage et calibrage du cycle de prestige"
type: feat
status: completed
date: 2026-07-27
---

# US 15 — Mesurer, puis calibrer le cycle de prestige

Ticket **V3-06**. DESIGN.md fixe la cible : *« premier prestige ~1 h, cycles de plus en plus courts,
×0.6 par cycle »*. Personne ne l'avait jamais mesurée. Impossible de le faire à la main : il faudrait
jouer des heures par variante testée.

## Étape 1 — rendre le contenu mesurable

Les catalogues (`zones`, `TROOPS`, `baseDps`) vivaient dans `App.svelte`, donc inaccessibles hors
navigateur. Ils partent dans **`src/lib/content.js`**, en **données pures** : les visuels y sont
désignés par des clés (`spriteKey`, `bgSprite`) que l'UI résout en URLs Vite via `withSprites()`.
Aucun `import ... from './assets/*.webp'` dans le module, sinon Node ne peut pas l'importer.

Bénéfice immédiat au-delà du simulateur : les invariants de contenu deviennent testables (difficulté
croissante d'une zone à l'autre, boss plus dur que ses mobs, tiers ordonnés en dps **et** en coût).

## Étape 2 — le simulateur

**`scripts/simulate.mjs`** (`node scripts/simulate.mjs`, aucune dépendance) rejoue la boucle de combat
et mesure la durée d'un run et de ses cycles. Il **importe les modules réels** — `content.js`,
`economy.js`, `prestige.js` — donc aucune valeur d'équilibrage n'y est recopiée : pas de dérive
possible entre l'outil et le jeu sur les données.

Ce qu'il simplifie, et qui est écrit en tête du fichier : pas de variance de dégâts (±4 d'espérance
nulle), pas de reliques (donc les durées réelles sont un peu meilleures), pas de Cri de Guerre,
joueur parfaitement rationnel qui réinvestit dans le meilleur ratio dps/or.

### Calibration contre le vrai jeu

Un simulateur non calibré ne prouve rien. Mesure croisée sur le même scénario — clear de la zone 1
**sans acheter une seule troupe**, ce qui isole la boucle de combat :

| Source | Ticks |
|---|---|
| `scripts/simulate.mjs` (`buy: false`) | **113** |
| Jeu réel piloté dans Chrome | **109** (87,2 s / 800 ms) |

**3,5 % d'écart**, cohérent avec la variance de dégâts et le respawn de 250 ms entre ennemis que le
simulateur ignore. Suffisant pour comparer des variantes entre elles.

## Étape 3 — ce que la mesure révèle

Premier run, sans aucune Gloire : **31 min** (cible ~1 h → le jeu est deux fois plus rapide que prévu,
ce n'est pas grave en soi).

Le problème est ailleurs — les cycles ne raccourcissent pas :

```
Croisade #1 : 31 min             → +7 Gloire
Croisade #2 : 28 min  (×0.91)    → +7 Gloire   [fureur 1]
Croisade #3 : 28 min  (×0.97)    → +7 Gloire   [fureur 1, butin 1]
Croisade #4 : 27 min  (×0.97)    → +7 Gloire   [fureur 1, butin 1, intendance 1]
```

**Cause racine : `gloireGain(zonesCleared)` est plafonné par le contenu.** La formule
`floor(sqrt(zones × 10))` vient d'une table DESIGN qui suppose 10, 20, 50 zones clear. Le jeu en a
**cinq**. Donc `zonesCleared` vaut 5 à chaque run, et le gain vaut **7 à vie**. Une upgrade complète
coûte 275 Gloire (coût quadratique) : il faudrait ~40 croisades pour maxer Fureur.

Vérification que le plafond de niveaux n'y est pour rien : en déplafonnant Fureur et Butin
(`maxLevel` 5 → 99), les 8 premiers cycles sont **identiques au tick près**. Le facteur limitant est
bien le gain, pas les niveaux.

## Étape 4 — la correction

**Baser le gain sur les vagues vaincues du run, pas sur les zones.** C'est la seule mesure qui
continue de croître : la dernière zone reboucle sur son boss, donc un joueur qui farme l'Enfer plus
longtemps gagne davantage — ce que la racine carrée de DESIGN était censée récompenser.

    gloire = floor(10 × √(vagues vaincues))     // = floor(√(vagues × 100))

Le facteur n'est pas choisi au doigt mouillé, il est **calibré sur la cible que DESIGN s'est fixée** :

| Formule testée | Gain au 1er clear | Cycles mesurés |
|---|---|---|
| `√(zones × 10)` — actuelle | 7 | 31 → 28 → 28 → 27 → 27 min |
| `√(vagues)` | 8 | 31 → 28 → 28 → 27 → 27 min |
| `√(vagues × 20)` | 37 | 31 → 27 → 23 → 23 → 22 min |
| **`√(vagues × 100)`** | **83** | **31 → 17 (×0.53) → 14 → 13 → 12 → 9 min** |
| `√(or / 10)` | 239 | 31 → 14 (×0.45) → 10 → 9 → 8 min |

`√(vagues × 100)` donne **×0.53 au deuxième cycle** — la cible DESIGN est ×0.6 — et une descente
régulière ensuite. Les variantes basées sur l'or vont trop vite et rendent la première Croisade
presque triviale.

Effet de bord assumé : à 83 Gloire, le **Serment du Champion (50)** devient accessible dès la première
Croisade. C'est souhaitable — le 4ᵉ tier de troupe cessait d'être du contenu mort.

## Ce que cette US ne corrige PAS (décision produit)

La mesure montre que **la boucle plafonne** vers 9-12 min et n'ira jamais plus bas : avec 5 zones, un
run bat toujours 70 vagues, donc le gain de Gloire reste constant d'un cycle à l'autre, alors que le
coût des upgrades est quadratique. La progression meta ralentit jusqu'à l'arrêt.

Un idle sans fin a besoin d'une dimension extensible. Trois directions, à trancher :

1. **Zones infinies au-delà de l'Enfer** — zone N générée avec un scaling (×7 PV, ×6 or comme
   aujourd'hui). Le run va plus loin à chaque cycle, donc bat plus de vagues, donc gagne plus de
   Gloire : la boucle s'auto-alimente. C'est la solution standard du genre.
2. **Farm récompensé dans l'Enfer** — la zone reboucle déjà ; rendre le rebouclage plus dur et plus
   rémunérateur ferait croître le gain sans nouveau contenu.
3. **Accepter une boucle finie** — le jeu « se termine » après ~6-8 Croisades. Légitime pour un
   projet perso, mais autant le savoir.

## Critères d'acceptation

- [x] **CA1** `src/lib/content.js` pur, importable par Node, testé (invariants de contenu).
- [x] **CA2** Le jeu rend exactement comme avant l'extraction (sprites de troupes, fond de zone).
- [x] **CA3** `node scripts/simulate.mjs` produit le détail par zone et les cycles de prestige.
- [x] **CA4** L'écart simulateur / jeu réel est mesuré et documenté (< 5 %).
- [x] **CA5** `gloireGain` prend les vagues vaincues ; `√(vagues × 100)`, testée sur table.
- [x] **CA6** `wavesCleared` est persisté et remis à zéro par la Croisade ; save V3 antérieure tolérée.
- [x] **CA7** L'écran de Croisade annonce le gain sur la base des vagues.
- [x] **CA8** DESIGN.md porte la nouvelle formule et le rapport de mesure.
- [x] **CA9** `npm test` vert, build OK, vérification navigateur du prestige.
