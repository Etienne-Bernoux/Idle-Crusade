---
title: "feat: US 7 — Borne d'inventaire (fonte auto en or)"
type: feat
status: active
date: 2026-06-15
---

# US 7 — Borne d'inventaire (fonte auto en or)

L'inventaire de reliques peut grossir sans limite : le boss de la dernière zone loope et droppe à chaque kill, y compris en catch-up (onglet en arrière-plan longtemps → des centaines de reliques). Save qui gonfle, panneau illisible, et — avec `inventory = [...inventory, relic]` à chaque drop — une boucle catch-up qui devient O(n²).

**Fix produit (tranché)** : au-delà d'un cap, la relique **la plus faible** est automatiquement **fondue en or**, avec un petit feedback. Zéro gestion (idle-friendly), l'enfant voit un gain au lieu d'une perte, et ça borne l'inventaire **et** la perf (la boucle catch-up reste O(n × cap)).

> Origine : note I1 du SpecFlow dans [2026-06-15-001-...-plan.md](2026-06-15-001-feat-reliques-loot-and-save-plan.md). Pas de cap sur les ticks de catch-up : la fonte garde l'inventaire petit, donc la boucle synchrone reste bornée même sur plusieurs jours.

## Critères d'acceptation

- [ ] **CA1** `INVENTORY_CAP` (≈30) : l'inventaire ne dépasse jamais le cap.
- [ ] **CA2** Sur drop qui fait dépasser le cap : la relique **de plus faible effet** (pct le plus bas) est retirée et **fondue** → or ajouté.
- [ ] **CA3** Gain de fonte par rareté (commun < rare < légendaire). La fonte de la nouvelle relique elle-même est possible (si c'est la plus faible).
- [ ] **CA4** **Les reliques équipées ne sont jamais fondues** (elles ne sont pas dans `inventory`).
- [ ] **CA5** **Live** : petit feedback « ⚗️ relique fondue +X or ». **Catch-up** : fonte silencieuse, l'or est absorbé par le pop welcome-back existant (déjà dérivé de `gold`).
- [ ] **CA6** L'équip-swap qui renvoie une relique en inventaire respecte aussi le cap.
- [ ] **CA7** Logique pure (`capInventory`, `meltValue`) **unit-testée**.
- [ ] **CA8** Pas de régression : drop, équip, effets, persistance (l'inventaire borné se sérialise/hydrate normalement).

## Décisions techniques

### `src/lib/reliques.js` (pur, testable)

```js
// Or rendu par la fonte d'une relique, par rareté.
export const MELT_GOLD = { commun: 15, rare: 50, legendaire: 200 }
export function meltValue(rarity) { return MELT_GOLD[rarity] ?? 0 }

// Magnitude d'effet d'une instance (pour classer "le plus faible").
function magnitude(r) {
  const e = reliqueEffect(r.defId, r.rarity)
  return e ? e.pct : 0
}

// Ramène l'inventaire au cap en retirant les instances les plus faibles.
// Renvoie { inventory: gardées, melted: [retirées] }. Pur.
export function capInventory(inventory, cap) {
  if (inventory.length <= cap) return { inventory, melted: [] }
  const sorted = [...inventory].sort((a, b) => magnitude(b) - magnitude(a)) // fort → faible
  return { inventory: sorted.slice(0, cap), melted: sorted.slice(cap) }
}
```

### `src/App.svelte`

```js
const INVENTORY_CAP = 30

// Helper : ajoute des reliques à l'inventaire, applique le cap, encaisse la fonte.
// withAnim : feedback live ; sinon silencieux (or compté dans le welcome-back).
function addToInventory(relics, withAnim) {
  const { inventory: kept, melted } = capInventory([...inventory, ...relics], INVENTORY_CAP)
  inventory = kept
  if (melted.length) {
    const meltGold = melted.reduce((s, r) => s + meltValue(r.rarity), 0)
    gold += meltGold
    if (withAnim) later(() => pushPop('melt', meltGold), 300)  // après le pop de drop
  }
}
```

- **Drop** (branche boss de `applyOneTick`) : remplacer `inventory = [...inventory, relic]` par `addToInventory([relic], withAnim)`. Le `relic` reste capturé pour le reveal/pop de drop **avant** une éventuelle fonte (le drop se voit, puis la fonte de la plus faible).
- **Équip** : après le retour de l'ancienne relique en inventaire (`equipRelique`), appliquer `capInventory` (l'équip est toujours live → feedback possible). Le plus simple : `equip()` réutilise `addToInventory` pour le retour, ou applique `capInventory` sur le résultat.
- **Pop `melt`** : 4e `kind`. `POP_LIFE_MS.melt = 1300`. Rendu : `⚗️ +{value} or`, couleur sourde (gris). Branche `{:else if pop.kind === 'melt'}` dans le `{#each pops}`.

> 4e kind de pop → la convention CLAUDE.md (« extraire `popups.js` si > 3 kinds ») est franchie. **Décision** : on reste inline pour cette US (l'extraction couple `pops`/`nextPopId`/`later` par closure — refactor non trivial, cf. réticence du doc patterns). À tracer comme dette si un 5e kind arrive.

## Étapes (test au fur et à mesure)

1. `reliques.js` : `MELT_GOLD`, `meltValue`, `capInventory` + **tests** (`capInventory` retire les bons, garde le cap, ordre par magnitude ; `meltValue` par rareté ; equipées hors scope car hors `inventory`). `npm test` vert.
2. `App.svelte` : `INVENTORY_CAP`, `addToInventory`, branchement drop + équip, pop `melt`. Build vert.
3. **Vérif navigateur** : farmer au-delà du cap (dps boosté) → inventaire plafonne à 30, or qui monte, pop ⚗️ visible ; équiper une relique → pas fondue ; reload → inventaire borné persiste.
4. Revert hacks de test. Commit (branche `claude/us-7-inventory-cap`), `/review`, `/ce:compound`.

## Hors scope
- Vente manuelle / recyclage choisi par le joueur (la fonte auto suffit).
- Tri / filtres d'inventaire.
- Résumé « +N reliques / +X or fondu » détaillé en catch-up (le pop or welcome-back suffit).

## Gotchas
- **Magnitude dmg vs gold** comparées sur le même `pct` : acceptable (un +6% dmg et un +6% or « pèsent » pareil pour le tri). Pas de pondération fine.
- **Fondre la relique qu'on vient de dropper** : possible et voulu (si c'est la plus faible et l'inventaire est plein) — le drop se voit quand même (pop/reveal émis avant la fonte).
- **Réactivité** : `inventory = kept` (réassignation), `gold +=` (primitif) → dérivés OK.
- **Catch-up** : `addToInventory([relic], false)` → fonte silencieuse, `gold` monte, le welcome-back `gained` l'inclut déjà.
- **Persistance** : rien de spécial — l'inventaire borné se sérialise comme avant.

## Estimation
~1 h. Le petit farme, voit l'or grimper par fonte (« ça fait de l'or ! ») sans inventaire qui explose.

## Sources
- Plan US 6 : [2026-06-15-001-feat-reliques-loot-and-save-plan.md](2026-06-15-001-feat-reliques-loot-and-save-plan.md) (note I1)
- Patterns : [docs/solutions/patterns/idle-game-tick-and-popups.md](../solutions/patterns/idle-game-tick-and-popups.md)
- Code : [src/lib/reliques.js](../../src/lib/reliques.js), [src/App.svelte](../../src/App.svelte)
