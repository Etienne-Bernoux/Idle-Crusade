---
title: "feat: US 1 — Combat scripté visible"
type: feat
status: active
date: 2026-05-06
---

# US 1 — Combat scripté visible

Faire **vivre** le panneau central : un mob prend des coups en continu, son HP descend, il meurt avec un effet visuel, un nouveau mob respawn. Aucune ressource encore (gold figé, caserne figée, forge figée). Premier moment où le jeu "bouge tout seul".

**Hook produit** : c'est l'US qui doit faire kiffer le fils de 5 ans. Tout est calibré pour le visuel : popups dégâts, sprite qui tremble, mob qui change.

## Critères d'acceptation

- [ ] À l'ouverture, le mob (sprite emoji + nom + HP) prend des coups toutes les ~800 ms sans aucune action utilisateur
- [ ] La barre HP décroît visuellement (transition fluide)
- [ ] Chaque coup déclenche : (a) un shake du sprite, (b) un popup `-XX` qui flotte vers le haut sur ~1 s
- [ ] Quand HP ≤ 0, le sprite disparaît ~250 ms puis un nouveau mob apparaît (nouveau emoji, nouveau nom, HP plein)
- [ ] La rotation traverse **au moins 5 mobs distincts** avant de boucler
- [ ] Le reste du jeu (header gold/gloire, caserne, forge, boutons actifs) est **identique à US 0** — aucune valeur ne bouge
- [ ] Pas de console errors / warnings
- [ ] Plus de mémoire qui fuit : les popups sont nettoyés du DOM après leur animation

## Décisions techniques

### Réactivité Svelte 4 idiomatique
- Variables réactives `let` mutées dans une fonction `tick()`. Pas de stores Svelte (overkill pour US 1, monolithique).
- Dérivés via `$:` (ex: `$: hpPercent = Math.max(0, enemyHp / enemy.hpMax * 100)`).
- Cleanup de l'interval via la fonction de retour de `onMount` (pattern Svelte standard).

### Catalogue des mobs
- Constante `const mobs = [...]` en haut de `<script>` dans `App.svelte`. Pas de fichier séparé pour US 1 (5 mobs en dur, ~6 lignes).
- Format : `{ name: string, sprite: string (emoji), hpMax: number }`.
- Roulement séquentiel (`mobIdx = (mobIdx + 1) % mobs.length`) — randomiser arrivera plus tard si on en sent l'envie.

### Damage popups (le truc le plus subtil)
- État : array `damages = [{ id, value, x }]` géré réactivement.
- Génération : à chaque `tick()`, on push un objet avec un `id` auto-incrémenté et un `x` random (-40 à +40 px autour du centre de `.combat`).
- Cleanup : `setTimeout(() => damages = damages.filter(d => d.id !== id), 1000)` — durée alignée sur l'animation CSS `@keyframes popup` (1 s).
- Rendu : `{#each damages as dmg (dmg.id)}` avec une key pour que Svelte ne ré-anime pas les popups existants.
- **Important** : le `{#each}` vit dans `<section class="combat">` (position: relative déjà), pas dans `<div class="enemy">`, pour que `position: absolute` se base sur le bon parent.

### Animation hit (shake)
- Un flag `let isHit = false`. Toggle à `true` à chaque tick, retour à `false` après 200 ms.
- Markup : `<div class="enemy-sprite" class:hit={isHit}>{enemy.sprite}</div>` — déclenche `@keyframes shake` déjà présente dans `app.css`.

### Respawn
- Flag `let isRespawning = false`. Quand HP ≤ 0 → `isRespawning = true` + `setTimeout(250 ms)` qui change de mob et reset `enemyHp`.
- Pendant le respawn, le sprite a `opacity: 0` (binding inline `style="opacity: {isRespawning ? 0 : 1}"`).
- Le `tick()` skip si `isRespawning` (early return).

## Étapes d'implémentation

### 1. Ajouter `.damage-pop` dans `src/app.css`
Porter la classe + les keyframes `popup` du `mockup-v0.html` (lignes 236-248) vers `app.css`. Pas de modification d'autres règles.

### 2. Réécrire `src/App.svelte` — bloc `<script>`
Variables réactives, catalogue mobs, `tick()`, `onMount` cleanup. Cible : ~40 lignes JS au total.

### 3. Réécrire le bloc `<section class="combat">` du markup
- Bindings réactifs sur `enemy.sprite`, `enemy.name`, `enemyHp`, `hpPercent`
- `class:hit={isHit}` sur `.enemy-sprite`
- `style="opacity: {isRespawning ? 0 : 1}"` sur `.enemy-sprite` (avec `transition: opacity 0.25s` à ajouter dans CSS si manquant — vérifier)
- `{#each damages}` après le bloc `.enemy`, à l'intérieur de `.combat`

### 4. Vérifier que le reste du jeu n'a pas bougé
Diff visuel avec US 0 : header, caserne, forge, actives doivent être strictement identiques (mêmes valeurs en dur). Le `1 247` reste le `1 247`.

### 5. Validation locale
- `npm run dev` → ouvrir, regarder 30 secondes, vérifier la rotation des mobs et l'absence d'erreurs console.
- Test rapide "fils de 5 ans" : est-ce que ça donne envie de regarder ?

### 6. Build & deploy
- `npm run build` (must pass clean)
- Push branche → PR → review → compound → merge.

## Pseudo-code de référence

### `src/App.svelte` (bloc script)
```svelte
<script>
  import { onMount } from 'svelte'

  const mobs = [
    { name: 'Gobelin Maraudeur', sprite: '👹', hpMax: 500 },
    { name: 'Squelette Croulant', sprite: '💀', hpMax: 600 },
    { name: 'Loup Galeux', sprite: '🐺', hpMax: 450 },
    { name: 'Orc Brute', sprite: '👺', hpMax: 700 },
    { name: 'Rat Géant', sprite: '🐀', hpMax: 350 },
  ]

  let mobIdx = 0
  let enemy = mobs[mobIdx]
  let enemyHp = enemy.hpMax
  let isHit = false
  let isRespawning = false

  let damages = []
  let nextDmgId = 0

  const dps = 35
  const tickMs = 800

  $: hpPercent = Math.max(0, enemyHp / enemy.hpMax * 100)

  function tick() {
    if (isRespawning) return

    const dmg = dps + Math.floor(Math.random() * 9 - 4)
    enemyHp -= dmg

    const id = nextDmgId++
    damages = [...damages, { id, value: dmg, x: Math.random() * 80 - 40 }]
    setTimeout(() => damages = damages.filter(d => d.id !== id), 1000)

    isHit = true
    setTimeout(() => isHit = false, 200)

    if (enemyHp <= 0) {
      isRespawning = true
      setTimeout(() => {
        mobIdx = (mobIdx + 1) % mobs.length
        enemy = mobs[mobIdx]
        enemyHp = enemy.hpMax
        isRespawning = false
      }, 250)
    }
  }

  onMount(() => {
    const id = setInterval(tick, tickMs)
    return () => clearInterval(id)
  })
</script>
```

## Hors scope (à NE PAS faire en US 1)

- Pas de gold qui monte (le compteur header reste figé à `1 247`)
- Pas de bouton "Recruter" fonctionnel (la caserne reste affichée mais inerte)
- Pas de boutons actifs fonctionnels (Cri/Potion figés, pas de cooldown qui tourne)
- Pas de progression de zone/vague (les valeurs "Forêt Sombre", "Vague 7/10" restent en dur)
- Pas de sons / pas de musique
- Pas de `localStorage` (le combat redémarre à zéro à chaque reload)
- Pas de multi-mob simultané (un seul mob à la fois)
- Pas de découpage en sous-composants (`App.svelte` reste monolithique)
- Pas d'extraction `src/lib/combat.js` ou `src/game-tick.js` (US 2/3 quand le besoin se sentira)

## Gotchas anticipés

- **Memory leak des popups** : si on oublie le `setTimeout` de cleanup, l'array `damages` grossit indéfiniment. Critique en mode idle (laisser tourner 1h = 4500 popups dans le DOM). → Test : laisser tourner 5 min, vérifier que `damages.length` ne dépasse pas ~5.
- **Position des popups** : si on les met dans `.enemy` au lieu de `.combat`, le `position: absolute` se base sur `.enemy` (pas `position: relative`) et ils filent en haut de page. Toujours dans `.combat`.
- **Race au respawn** : si on ne flag pas `isRespawning` et qu'on n'early-return pas dans `tick()`, on peut taper sur un mob déjà mort et avoir des popups négatifs / HP négatifs visibles. Le flag est non-négociable.
- **Svelte reactivity sur arrays** : `damages.push(x)` ne déclenche pas la réactivité Svelte 4. Toujours utiliser `damages = [...damages, x]` ou `damages = damages.filter(...)`.
- **Cleanup interval** : sans `return () => clearInterval(id)` dans `onMount`, en HMR Vite l'interval double à chaque save → tick deux fois plus rapide après plusieurs reloads dev. Cleanup obligatoire.

## Estimation

**1 session de ~1 h** avec le fils. Le clou du spectacle : le moment où il voit le premier popup `-37` flotter et le premier 💀 remplacer le 👹.

## Sources

- Spec produit : [SPEC.md](../../SPEC.md)
- Mockup d'origine (référence pour le tick et les popups) : [`mockup-v0.html`](../../mockup-v0.html) lignes 494-561
- App.svelte actuel : [`src/App.svelte`](../../src/App.svelte)
- CSS existant (animations déjà en place) : [`src/app.css`](../../src/app.css)
- Plan précédent : [US 0](2026-05-05-001-feat-setup-vite-svelte-gh-pages-plan.md)
- Solution doc : [`docs/solutions/setup/static-site-vite-svelte-gh-pages.md`](../../docs/solutions/setup/static-site-vite-svelte-gh-pages.md)
