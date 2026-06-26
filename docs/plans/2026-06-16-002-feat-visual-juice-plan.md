---
title: "feat: US 9 — Juice visuel (pulse boss, flash légendaire, shake)"
type: feat
status: active
date: 2026-06-16
---

# US 9 — Juice visuel

Rendre les moments forts plus « juteux » pour le fils, sans nouvelle mécanique ni asset. Trois effets CSS, branchés sur des états/évents existants, **sans nouveau `kind` de pop** (on évite de forcer le refacto `popups.js`).

1. **Pulse boss faible** : la barre de PV pulse (rouge) quand l'ennemi est un **boss** ET sous **25%** PV → tension sur les longs combats.
2. **Flash légendaire** : drop d'une relique **légendaire** (live) → flash doré plein écran (au-delà du reveal/pop existant).
3. **Shake à la mort d'un boss** : la zone combat tremble brièvement (live) au kill du boss.

## Critères d'acceptation

- [ ] **CA1** Barre de PV : classe réactive `low` quand `isBoss && hpPercent < 25` → animation pulse. Disparaît au-dessus de 25% / sur un mob normal.
- [ ] **CA2** Drop légendaire **live** (transition zone OU dernière zone) → flash doré (~0.6s). Pas de flash en catch-up (silencieux).
- [ ] **CA3** Mort de boss **live** → shake bref (~0.4s) de `.combat`. Pas de shake en catch-up.
- [ ] **CA4** Effets **ré-entrants gardés** par `invocationId` (comme victory/transition) — pas d'état resté allumé.
- [ ] **CA5** Zéro impact gameplay/balance, **aucun nouveau pop kind**, pas de régression (combat, transition, drop, équip).
- [ ] **CA6** Vérifié **desktop ET mobile** (le shake/translate ne crée pas de débordement horizontal).

## Décisions techniques (`src/App.svelte` + `src/app.css`)

```js
// state
let isShaking = false
let isLegendaryFlash = false
let shakeId = 0
let legendaryId = 0

function triggerShake() {
  const my = ++shakeId
  isShaking = true
  later(() => { if (my === shakeId) isShaking = false }, 400)
}
function triggerLegendaryFlash() {
  const my = ++legendaryId
  isLegendaryFlash = true
  later(() => { if (my === legendaryId) isLegendaryFlash = false }, 600)
}
```

Dans la branche boss de `applyOneTick`, juste après le drop (`addToInventory([relic], withAnim)`), **avant** la logique de transition/`return** :
```js
if (withAnim) {
  triggerShake()
  if (relic.rarity === 'legendaire') triggerLegendaryFlash()
}
```

Markup :
- `<section class="combat" class:shake={isShaking} ...>`
- barre PV : `<div class="hp-bar" class:low={isBoss && hpPercent < 25}>`
- overlay : `{#if isLegendaryFlash}<div class="legendary-flash"></div>{/if}` (dans `.combat`, après les pops).

CSS :
- `@keyframes combatShake { translateX ±4px }` ; `.combat.shake { animation: combatShake 0.4s }` (transform → pas de reflow, amplitude faible pour ne rien déborder, OK mobile).
- `.legendary-flash` : radial doré plein (`inset:0`, `z-index` > combat), `animation: legendaryFlash 0.6s` (réutilise l'esprit de `.victory-flash`).
- `.hp-bar.low` : `animation: hpPulse 0.6s infinite` (glow rouge / opacité). S'arrête quand la classe part.

## Étapes (test au fur et à mesure)
1. State + triggers + branchement drop (App.svelte). Markup (3 accroches). CSS (3 keyframes).
2. Build. (Pas de test unitaire : pur visuel/CSS — vérif navigateur.)
3. **Vérif navigateur desktop + mobile** : pulse PV sur boss bas, flash sur drop légendaire (forcer rareté en test), shake au kill boss ; pas de débordement horizontal (shake), pas d'état resté allumé ; reload OK.
4. Revert hacks de test. Commit (branche `claude/us-9-visual-juice`), review, compound.

## Hors scope
- Crit / gros chiffres aléatoires (5e pop kind → forcerait le refacto `popups.js` + touche la balance) — US séparée.
- Sons, particules, toasts d'événements.

## Gotchas
- **invocationId** dès la 1re occurrence (effets ré-entrants : 2 boss rapprochés).
- **Shake = `transform`** (pas `margin`/`top`) → pas de reflow ni de débordement ; amplitude ≤ 4px ; revérifier `scrollWidth <= innerWidth` en mobile.
- **`isFlashing` existant** (victory/transition) : ne pas réutiliser pour le légendaire → flag dédié `isLegendaryFlash` pour éviter les collisions.
- **Live only** : les 3 effets sont guardés `withAnim` (rien en catch-up).
- **z-index** du `.legendary-flash` au-dessus de `.combat > * {z-index:1}` mais sous la transition (20) — ~12.

## Sources
- Patterns : [docs/solutions/patterns/idle-game-tick-and-popups.md](../solutions/patterns/idle-game-tick-and-popups.md) (overlays + invocationId, US 4/5)
- Code : [src/App.svelte](../../src/App.svelte), [src/app.css](../../src/app.css)
