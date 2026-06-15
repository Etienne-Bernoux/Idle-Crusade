---
title: Patterns idle game — tick, popups, cleanup timers
category: patterns
date: 2026-05-06
updated: 2026-06-15
tags: [svelte, idle-game, settimeout, setinterval, hmr, background-tab, animation, vibe-code, catalogue, data-driven, zone-transition, unlock]
project: idle-crusade
related_pr:
  - https://github.com/Etienne-Bernoux/Idle-Crusade/pull/2
  - https://github.com/Etienne-Bernoux/Idle-Crusade/pull/3
  - https://github.com/Etienne-Bernoux/Idle-Crusade/pull/4
  - https://github.com/Etienne-Bernoux/Idle-Crusade/pull/5
  - https://github.com/Etienne-Bernoux/Idle-Crusade/pull/6
---

> **Doc évolutive** — enrichi à chaque US qui ajoute un type d'effet visuel transient ou affine la mécanique de tick. US 1 = damage popups. US 2 = gold popups + ordering + marges cleanup. US 3 = catch-up `lastTickAt` + welcome-back pop. US 4 = overlays temporaires (flash + toast) + invocationId guard. US 5 = transition de zone (pause du tick via `isRespawning`) + généralisation en catalogues (zones / troupes).

# Patterns idle game — tick, damage popups, cleanup timers

> Patterns Svelte 4 d'Idle Crusade, accumulés d'US 1 à US 5 (tick, effets transients, cleanup timers, transition de zone, catalogues data-driven). À réutiliser dès qu'un idle game perso a besoin d'un tick visuel, d'effets transients, d'un cleanup propre des timers, ou d'une progression multi-zones pilotée par catalogue.

## Pattern : catch-up tick (US 3, livré)

### Le problème

Chrome/Firefox **throttlent `setInterval` à ~1×/min** quand l'onglet est en background depuis >5 min. Sur un idle game naïf :

> "Je reviens après le goûter (30 min plus tard) → j'ai tué 30 mobs au lieu de 2 250."

Pour un gosse de 5 ans, c'est l'inverse du feel attendu (qui devrait être "WAOUH 4382 mobs tués pendant que j'étais pas là").

### La solution livrée en US 3

**Split** la fonction métier de la fonction d'orchestration :
- `applyOneTick(withAnim)` : la logique pure (décrémente HP, drop or, respawn). Le `withAnim` conditionne les `pushPop` et les `setTimeout` (animations live vs simulation sèche).
- `tick()` : le callback de `setInterval`. Calcule `n = Math.floor((now - lastTickAt) / tickMs)`, applique les `n` ticks dus.

```js
const tickMs = 800  // DOIT rester entier constant. n * tickMs reste exact tant
                    //  que tickMs est entier. Un buff qui muterait tickMs
                    //  corromprait l'horloge.

let lastTickAt = 0  // initialisé dans onMount à performance.now()

function applyOneTick(withAnim) {
  // logique métier ; les pushPop / later sont gardés par `withAnim`
}

function tick() {
  const now = performance.now()
  const elapsed = now - lastTickAt
  const n = Math.floor(elapsed / tickMs)
  if (n <= 0) return
  lastTickAt += n * tickMs

  if (n === 1) {
    applyOneTick(true)
  } else {
    // Catch-up : simulation sèche + welcome-back pop résumé.
    const goldBefore = gold
    for (let i = 0; i < n; i++) applyOneTick(false)
    const gained = gold - goldBefore
    if (gained > 0) pushPop('gold', gained, 0)  // x=0 = centré
  }
}
```

### Le piège UX (welcome-back pop) — *le* truc que la review a sauvé

**Sans le pop welcome-back**, le compteur d'or saute "magiquement" de `0` à `30 000` quand le tab revient au premier plan. Pour un fils de 5 ans : ça **ressemble à un bug**, pas à une victoire.

**Fix** : tracker `goldBefore = gold` avant la boucle de catch-up, et après push **un seul** popup `gold` centré (`x: 0`) avec le total gagné. Le chiffre à 4-5 chiffres se lit naturellement plus impressionnant qu'un popup `+5 or` standard. Pas une feature, une UX critique.

### Tradeoffs assumés

- **Boucle synchrone bloquante** : pour 1h d'absence (~4 500 ticks), ~225 ms de blocage à la reprise. Acceptable (l'utilisateur revient sur l'onglet, pas de UI critique). Optimisation future possible : chunker via `setTimeout(0)` ou `requestIdleCallback`.
- **Pas de respawn animé pendant catch-up** : `respawnNextMob()` est appelé synchrone depuis `applyOneTick(false)`. Le flag `isRespawning` n'est jamais levé pendant le catch-up — c'est voulu. Le `if (isRespawning) return` au début est un guard pour le path live uniquement.
- **`isRespawning` jamais `true` en catch-up** : voulu et correct. Commenter la ligne `if (isRespawning) return` pour que ce soit lisible : "guard du path live uniquement".

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

## Pattern : overlays temporaires (US 4)

Pour les feedbacks **non-positionnels** qui flooment l'écran (flash de victoire, toast d'unlock, banner welcome-back) — distinct des `pops` qui ont une position keyée.

### Recette

Un flag `let isXxx = false` toggle par un `later(...)` aligné sur la durée souhaitée. Conditionner le rendu via `{#if}`. Pour l'animation enter/leave, **utiliser `transition:fade` de Svelte** plutôt qu'un `@keyframes` custom — l'enter/leave en symétrique sans bricoler.

```svelte
<script>
  import { fade } from 'svelte/transition'

  let isFlashing = false
  let showVictoryToast = false
</script>

{#if isFlashing}
  <div class="victory-flash"></div>
{/if}
{#if showVictoryToast}
  <div class="victory-toast" transition:fade={{ duration: 300 }}>
    🎉 ZONE 2 DÉBLOQUÉE 🎉
  </div>
{/if}
```

### Le piège : ré-entrée → état désync

Si `triggerVictory()` peut être appelé deux fois en moins que la durée du toast (improbable en US 4 mais arrivable plus tard avec des stats hautes), le **2e** `later()` cleanup va déclencher dans 3 s **alors que** le 1er cleanup est déjà passé et a remis `false` — résultat : le toast disparaît trop tôt par rapport au 2e trigger.

**Solution : compteur d'invocation** capturé en closure. Seul le dernier trigger valide ses cleanups.

```js
let victoryInvocationId = 0
function triggerVictory() {
  const myId = ++victoryInvocationId
  isFlashing = true
  later(() => { if (myId === victoryInvocationId) isFlashing = false }, 500)
  showVictoryToast = true
  later(() => { if (myId === victoryInvocationId) showVictoryToast = false }, 3000)
}
```

À cabler **dès la première occurrence** du pattern, pas après avoir vu le bug. Dette compounded autrement.

### Live only, jamais en catch-up

Comme les popups, les overlays sont déclenchés **uniquement** dans le path `withAnim: true` d'`applyOneTick`. Le path catch-up touche jamais à `isFlashing` / `showVictoryToast`. Sinon : 30 minutes en background → 5 toasts qui flashent à la reprise = surcharge sensorielle.

### Position vs `pops`

Pendant qu'un overlay (toast) est affiché, le combat continue. Si l'overlay est positionné au centre (`top: 30%`), il **couvre les pops** qui sortent en dessous (`top: 40%`). Solutions :
- Déplacer l'overlay en haut (`top: 8%` est OK pour notre layout)
- Ou laisser au centre et accepter que les 3 s post-boss sont "cinematic"

**Choix retenu en US 4** : toast en haut. Les pops du combat post-boss restent visibles.

---

## Pattern : transition de zone cinématique (US 5)

Quand le combat doit **se mettre en pause** pendant un feedback long (écran "LES RUINES" ~2 s entre deux zones), pas besoin d'un nouveau flag de pause : **réutiliser `isRespawning`**.

### Le truc : un état "respawn long" = une pause

`applyOneTick` commence déjà par `if (isRespawning) return`. Le respawn normal lève ce flag 250 ms. La transition le lève **2 s** : le tick passe en no-op tout seul, gratuitement. Pas de `isPaused` séparé à câbler, à tester, à oublier.

```js
function startZoneTransition(next) {
  const myId = ++transitionInvocationId
  isTransitioning = true            // overlay plein écran (z-index au-dessus du combat)
  transitionZoneName = zones[next].name
  isRespawning = true               // ← pause le tick via le guard existant + masque le sprite
  later(() => {
    if (myId !== transitionInvocationId) return  // invocationId : cf. pattern overlays US 4
    currentZone = next
    wave = 1
    isTransitioning = false
    spawnNextEnemy()                // lève isRespawning → le combat reprend
  }, 2000)
}
```

### Live only, comme tous les overlays

Le **split `withAnim`** (US 3) s'étend à l'avancement de zone : en live, le boss tué déclenche `startZoneTransition` (écran 2 s) ; en catch-up (`withAnim:false`), on avance `currentZone` **sèchement, sans écran**. Même discipline que flash/toast : le path catch-up ne touche jamais à `isTransitioning`.

```js
if (isBoss) {
  const next = currentZone + 1
  const hasNext = zones[next] !== undefined
  if (hasNext) {
    zonesUnlocked = Math.max(zonesUnlocked, next)
    if (withAnim) { startZoneTransition(next); return }  // live
    currentZone = next                                   // catch-up : sec
  }
  wave = 1
  if (withAnim && !hasNext) triggerVictory()             // dernière zone : flash + toast
}
```

### `z-index` de l'overlay vs le `z-index: 1` du contenu combat

`.combat > * { z-index: 1 }` place tout le contenu (header, sprite, pops) au-dessus du décor. Un overlay de transition doit donc passer **au-dessus de ce 1** (`z-index: 20`), sinon le nom de zone précédent ("Forêt Sombre") transparaît derrière l'écran. Vérifié : l'écran couvre bien toute la zone combat.

---

## Pattern : généralisation en catalogues (US 5)

Confirme la convention "catalogues de données". Tant qu'il n'y a **qu'un** élément réel (le Paysan en US 3), le hardcoding + 3 fausses cartes statiques suffit. **Au 2e élément réel** (Soldat en US 5), on bascule en catalogue + `{#each}` — le seuil d'extraction est le 2e instance concret, pas le 1er.

```js
const TROOPS = {
  paysan: { name: 'Paysan', baseCost: 10, dps: 1, unlockZone: 1, hint: '' },
  soldat: { name: 'Soldat', baseCost: 100, dps: 12, unlockZone: 2, hint: 'Bats le boss de la Forêt' },
  // chevalier/champion : unlockZone 99 = pas encore débloquable (carte grisée + hint)
}
let counts = { paysan: 0, soldat: 0, chevalier: 0, champion: 0 }

// Dérivé : recalcule au moindre changement de counts OU zonesUnlocked.
$: troopRows = TROOP_ORDER.map(id => ({ id, ...TROOPS[id], count: counts[id], cost: costOf(id), unlocked: zonesUnlocked >= TROOPS[id].unlockZone }))
```

- **`counts` en objet réassigné** (`counts = { ...counts, [id]: counts[id] + 1 }`), pas de mutation en place — même règle réactivité que les arrays.
- **Déblocage = donnée, pas branche** : `unlockZone` dans le catalogue + comparaison `zonesUnlocked >= unlockZone`. Le Soldat passe `unlocked:true` **pile** à la mort du boss Forêt (le dérivé dépend de `zonesUnlocked`), révélé pendant l'écran de transition. Zéro `if` éparpillé.
- **Zones** : même forme, map indexée par numéro (`zones[1]`, `zones[2]`), chaque zone porte `name`, `waves`, `mobs[]`, `boss`, `bg`. Le `bg` est une valeur CSS injectée dans `--zone-bg` (sprite pour la Forêt, **gradient CSS** pour les Ruines — pas d'asset lourd pour une nouvelle zone).

### Gotcha vérif navigateur : lire le DOM après `.click()`

En pilotant le jeu via le navigateur pour valider, lire le DOM **synchroniquement** juste après `el.click()` renvoie les valeurs **d'avant** le re-render (Svelte applique les updates en micro-task). Relire après un tick (eval séparé) — sinon faux négatif ("le compteur n'a pas bougé" alors que si).

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

### US 3 (review recrutement paysan + catch-up)
- ✅ **Race click pendant catch-up** : impossible, JS single-threaded, le click handler est queued derrière la boucle `for` synchrone. Quand il s'exécute, `gold` est déjà à jour.
- ✅ **`lastTickAt += n * tickMs` drift** : `tickMs` entier constant → `n * tickMs` reste entier jusqu'à `Number.MAX_SAFE_INTEGER`. Pas de drift float possible des décennies durant.
- ✅ **`recruitPaysan` lit la dérivée `$:paysanCost`** : Svelte 4 garantit dérivés à jour avant le micro-task suivant. **Mais** : pratique fragile si un buff temporaire mute `paysanCost`. **Convention adoptée** : recalculer le coût dans le handler depuis l'état primitif, pas lire la dérivée. Une ligne, zéro ambiguïté.

### US 4 (review boss + overlays)
- ✅ **`enemy` snapshot à T+150** : pas nécessaire, `enemy` ne mute qu'à T+250 via `spawnNextEnemy`. Lire `enemy.gold` directement dans le `later()` à T+150 marche. La capture locale `wasBoss` était symptôme d'over-defensive coding.
- ✅ **setTimeout 3000 ms en background tab** : les `setTimeout` au-delà du throttle browser ne se perdent pas, ils s'exécutent juste plus tard. Le toast finit par se cacher. Si l'utilisateur backgrounde pendant le toast, il aura juste raté l'animation — pas de leak.
- ✅ **Cascade transition Svelte `transition:fade`** : enter/leave symétrique sans `@keyframes` custom. La closure de l'animation tient bien quand le node est détruit (Svelte gère le delay de remove pour laisser l'anim leave finir).
- ⚠️ **Toast couvre les pops** : sans intervention, un overlay au centre cache les feedbacks combat de la wave 1 qui suit. Solution : `top: 8%` pour libérer la zone combat. À garder en tête pour tout overlay long.

## Liens

- PR : [Etienne-Bernoux/Idle-Crusade#2](https://github.com/Etienne-Bernoux/Idle-Crusade/pull/2)
- Plan source : [`docs/plans/2026-05-06-001-feat-us-1-combat-scripte-plan.md`](../../plans/2026-05-06-001-feat-us-1-combat-scripte-plan.md)
- Setup d'origine : [`docs/plans/2026-05-05-001-feat-setup-vite-svelte-gh-pages-plan.md`](../../plans/2026-05-05-001-feat-setup-vite-svelte-gh-pages-plan.md)
- Conventions projet : [`CLAUDE.md`](../../../CLAUDE.md)
