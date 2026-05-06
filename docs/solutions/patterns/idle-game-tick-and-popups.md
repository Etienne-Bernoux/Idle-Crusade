---
title: Patterns idle game — tick, damage popups, cleanup timers
category: patterns
date: 2026-05-06
tags: [svelte, idle-game, settimeout, setinterval, hmr, background-tab, animation, vibe-code]
project: idle-crusade
related_pr: https://github.com/Etienne-Bernoux/Idle-Crusade/pull/2
---

# Patterns idle game — tick, damage popups, cleanup timers

> Patterns Svelte 4 figés en US 1 d'Idle Crusade. À réutiliser dès qu'un idle game perso a besoin d'un tick visuel, d'effets transients, et d'un cleanup propre des timers.

## ⚠️ Dette technique connue — à traiter en US 2

### Background tab throttling = *le* défaut classique des idle games

Chrome/Firefox **throttlent `setInterval` à 1×/min** quand l'onglet est en background depuis >5 min. Pas 1 s, **1 minute**. Conséquence concrète sur un idle :

> "Je reviens après le goûter (30 min plus tard) → j'ai tué 30 mobs au lieu de 2 250."

Pour un gosse de 5 ans qui ferme l'onglet, joue à autre chose et revient : c'est l'inverse du feel attendu (qui devrait être "WAOUH 4382 mobs tués pendant que j'étais pas là").

**Solution standard** (à appliquer dès qu'on a une ressource cumulative — donc US 2 quand l'or commencera à monter) :

```js
let lastTickAt = performance.now()

function tick() {
  const now = performance.now()
  const elapsed = now - lastTickAt
  const ticksToApply = Math.floor(elapsed / tickMs)
  lastTickAt += ticksToApply * tickMs

  for (let i = 0; i < ticksToApply; i++) {
    applyOneTick()
  }
}

setInterval(tick, tickMs)
```

À chaque réveil de l'onglet, on applique `Math.floor(elapsed / tickMs)` ticks d'un coup. Catch-up indolore.

**Pourquoi pas en US 1 ?** Le tick US 1 est purement visuel (combat sans ressource). Catch-up de 4382 mobs invisibles ne donne rien de plus que "le mob courant est à HP plein quand tu reviens" — déjà le comportement actuel.

**À tracer dans le plan US 2** : prévoir `lastTickAt = performance.now()` dès l'introduction du gold/sec.

---

## Pattern : damage popups (effets transients)

Floattent vers le haut, disparaissent. Réutilisable pour : `+XX or`, `+1 niveau`, `CRIT !`, etc.

### Implémentation Svelte 4

```svelte
<script>
  let damagePops = []
  let nextPopId = 0

  function spawnPop(value) {
    const id = nextPopId++
    damagePops = [...damagePops, {
      id,
      value,
      x: Math.random() * 80 - 40, // spread horizontal
    }]
    later(() => {
      damagePops = damagePops.filter(d => d.id !== id)
    }, 1000) // aligné sur l'animation CSS
  }
</script>

{#each damagePops as pop (pop.id)}
  <div class="damage-pop" style="left: calc(50% + {pop.x}px)">-{pop.value}</div>
{/each}
```

```css
.damage-pop {
  position: absolute;
  top: 40%;
  pointer-events: none;
  animation: popup 1s ease-out forwards;
}
@keyframes popup {
  0% { opacity: 1; transform: translate(-50%, 0) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -60px) scale(1.4); }
}
```

### Pourquoi cette forme

- **Array réassigné**, pas `.push()` — Svelte 4 ne ré-render pas sur mutation.
- **Key par id** dans `{#each ... as pop (pop.id)}` — Svelte ne ré-anime pas les popups existants quand l'array mute.
- **Cleanup `setTimeout`** aligné sur la durée d'animation. Sans ça, l'array grossit indéfiniment en mode idle.
- **Position parent** : le `{#each}` doit vivre dans un parent `position: relative`. Sinon les popups partent en haut de page.

**À extraire dans `src/lib/popups.js`** dès la 2e occurrence (gold pop + dmg pop par exemple).

---

## Pattern : tracking des `setTimeout` pour cleanup HMR-safe

Helper `later(fn, ms)` qui tracke chaque timeout dans un `Set` partagé, cleanup global au unmount.

```js
const pendingTimeouts = new Set()

function later(fn, ms) {
  const id = setTimeout(() => {
    pendingTimeouts.delete(id)
    fn()
  }, ms)
  pendingTimeouts.add(id)
}

onMount(() => {
  const intervalId = setInterval(tick, tickMs)
  return () => {
    clearInterval(intervalId)
    pendingTimeouts.forEach(clearTimeout)
    pendingTimeouts.clear()
  }
})
```

### Pourquoi

- **HMR Vite/Svelte** unmount-remount le composant à chaque sauvegarde en dev. Sans tracking, les `setTimeout` en vol survivent et tentent de muter du state qui n'existe plus.
- **Cohérence** : on tracke déjà l'`setInterval`, c'est incohérent de laisser les `setTimeout` orphelins.
- **Production** : sur cette app, App.svelte ne unmount jamais — donc invisible pour le user. Mais en dev, ça pollue le profiler et complique le debug.

### À NE PAS faire

- ❌ Ne pas oublier `pendingTimeouts.delete(id)` dans le callback du timeout — sinon le `Set` grossit indéfiniment (chaque timeout qui fire reste référencé).
- ❌ Ne pas mélanger des `setTimeout` "système" (animation cleanup) et "métier" (cooldowns) dans le même Set : si la sémantique diverge, deux Sets séparés.

---

## Conventions Svelte figées (US 1, dans CLAUDE.md)

### Ordre dans `<script>`
```
import → const (data immuable) → let (state) → helpers → $: derived → function métier → onMount
```

### State vs data
- **Valeur courante** en `let` plat : `enemyHp`
- **Max / config** sur l'objet source figé : `enemy.hpMax`

> Le state mute, la donnée est figée. Lecture facile : "qu'est-ce qui change ?" → les `let`.

### Reactivity arrays
Toujours réassigner :
```js
arr = [...arr, x]      // ✓
arr = arr.filter(...)   // ✓
arr.push(x)             // ✗ (Svelte 4 ne ré-render pas)
```

---

## Ce qui s'est confirmé OK (frontend-races review)

- ✅ **Cleanup `setInterval`** dans `onMount` return — Svelte appelle bien le cleanup, pas de doublon HMR
- ✅ **Race tick × respawn** : `isRespawning` set en première instruction du tick, JS single-threaded → pas de race
- ✅ **Race popup push/filter** : single-threaded, réassignations atomiques entre tasks de l'event loop
- ✅ **Leak `damagePops`** : 1-2 popups en vol max en régime stable (animation 1 s × tick 800 ms)
- ✅ **`nextPopId` overflow** : `Number.MAX_SAFE_INTEGER` à 1.25 tick/s → 228 millions d'années avant overflow

## Liens

- PR : [Etienne-Bernoux/Idle-Crusade#2](https://github.com/Etienne-Bernoux/Idle-Crusade/pull/2)
- Plan source : [`docs/plans/2026-05-06-001-feat-us-1-combat-scripte-plan.md`](../../plans/2026-05-06-001-feat-us-1-combat-scripte-plan.md)
- Setup d'origine : [`docs/solutions/setup/static-site-vite-svelte-gh-pages.md`](../setup/static-site-vite-svelte-gh-pages.md)
- Conventions projet : [`CLAUDE.md`](../../../CLAUDE.md)
