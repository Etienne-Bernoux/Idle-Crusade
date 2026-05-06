---
title: Patterns idle game — tick, popups, cleanup timers
category: patterns
date: 2026-05-06
updated: 2026-05-06
tags: [svelte, idle-game, settimeout, setinterval, hmr, background-tab, animation, vibe-code]
project: idle-crusade
related_pr:
  - https://github.com/Etienne-Bernoux/Idle-Crusade/pull/2
  - https://github.com/Etienne-Bernoux/Idle-Crusade/pull/3
---

> **Doc évolutive** — enrichi à chaque US qui ajoute un type d'effet visuel transient. US 1 = damage popups. US 2 = gold popups + ordering + marges cleanup.

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

## Pattern : popups transients (effets visuels)

Floattent vers le haut, disparaissent. Réutilisable pour : damage, `+XX or`, `+1 niveau`, `CRIT !`, etc.

### Architecture (US 2)

**Un seul array `pops`**, discriminé par `kind`. Chaque type a une variante CSS et une durée de vie. Pas de fichier `lib/popups.js` extrait tant qu'on a ≤ 3 kinds (le helper fait 5 lignes en place).

```svelte
<script>
  let pops = []
  let nextPopId = 0

  // Marge sur le cleanup vs animation CSS — 100 ms de plus pour éviter
  // un micro-flash si le main thread est chargé sur la dernière frame.
  const POP_LIFE_MS = { damage: 1100, gold: 1300 }

  function pushPop(kind, value) {
    const id = nextPopId++
    pops = [...pops, { id, kind, value, x: Math.random() * 80 - 40 }]
    later(() => pops = pops.filter(p => p.id !== id), POP_LIFE_MS[kind])
  }
</script>

{#each pops as pop (pop.id)}
  <div
    class="pop"
    class:gold-pop={pop.kind === 'gold'}
    style="left: calc(50% + {pop.x}px)"
  >
    {pop.kind === 'gold' ? `+${pop.value} or` : `-${pop.value}`}
  </div>
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

### Quand extraire dans `src/lib/popups.js` ?

Pas à la 2e occurrence (estimation US 1 invalidée à US 2). Le helper `pushPop` fait 5 lignes, vit dans `App.svelte`, et bénéficie de la closure sur `pops` et `nextPopId`. Extraire = perdre cette intimité pour pas grand-chose. **Seuil révisé** : extraire à partir de **3 kinds distincts** (ex : damage / gold / crit / xp), où la table `POP_LIFE_MS` et la logique de positionnement justifient un module dédié.

### Pièges identifiés

#### Ordering de popups simultanés (US 2 review)

Au coup fatal, on a deux popups dans la même frame : `damage` (le coup tue) puis `gold` (drop). Si on les push synchrones avec des `x` random proches (10 px d'écart sur 80 px de spread → 1 fois sur 8), le gold recouvre le damage et le joueur ne perçoit pas le coup fatal — juste "or qui pop sans raison".

**Fix retenu** : décaler le push gold de 150 ms via `later()`. Effet "tap → reward" lisible, plus pédagogique pour un débutant (le fils de 5 ans).

```js
if (enemyHp <= 0) {
  gold += enemy.gold
  later(() => pushPop('gold', enemy.gold), 150)
  // ...respawn
}
```

Alternative non retenue : biaiser le `x` ou `top` du gold pop. Plus brut, moins narratif.

#### Cleanup pile-aligné sur l'animation CSS

Si `setTimeout(cleanup, 1000)` aligné pile sur `animation-duration: 1s`, et que le main thread est chargé sur la dernière frame (devtools ouvert, GC, retour d'arrière-plan), le node disparaît à `opacity: 0.05` au lieu de `0` → micro-flash visible.

**Fix** : 100 ms de marge (`1100` pour anim 1 s, `1300` pour anim 1.2 s). Gratuit, le node a `pointer-events: none` et est déjà invisible.

Alternative plus élégante mais plus complexe : écouter `animationend` sur le node. Pas la peine pour un idle game.

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

## Ce qui s'est confirmé OK

### US 1 (review combat scripté)
- ✅ **Cleanup `setInterval`** dans `onMount` return — Svelte appelle bien le cleanup, pas de doublon HMR
- ✅ **Race tick × respawn** : `isRespawning` set en première instruction du tick, JS single-threaded → pas de race
- ✅ **Race popup push/filter** : single-threaded, réassignations atomiques entre tasks de l'event loop
- ✅ **Leak `pops`** : 1-2 popups en vol max en régime stable (animation 1 s × tick 800 ms)
- ✅ **`nextPopId` overflow** : `Number.MAX_SAFE_INTEGER` à 1.25 tick/s → 228 millions d'années avant overflow

### US 2 (review or du combat)
- ✅ **`gold` overflow** : à 7.5 or/s en moyenne, ~10^14 heures avant `Number.MAX_SAFE_INTEGER`
- ✅ **Resize fenêtre pendant `gold +=`** : non-issue, Svelte schedule le reactive update, JS reste single-thread
- ✅ **Cascade CSS `.pop` vs `.pop.gold-pop`** : spécificité (0,2,0) vs (0,1,0), `.gold-pop` override bien `animation-duration` du parent

## Liens

- PR : [Etienne-Bernoux/Idle-Crusade#2](https://github.com/Etienne-Bernoux/Idle-Crusade/pull/2)
- Plan source : [`docs/plans/2026-05-06-001-feat-us-1-combat-scripte-plan.md`](../../plans/2026-05-06-001-feat-us-1-combat-scripte-plan.md)
- Setup d'origine : [`docs/solutions/setup/static-site-vite-svelte-gh-pages.md`](../setup/static-site-vite-svelte-gh-pages.md)
- Conventions projet : [`CLAUDE.md`](../../../CLAUDE.md)
