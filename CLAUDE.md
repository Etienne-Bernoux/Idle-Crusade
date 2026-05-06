# Idle Crusade

Idle game médiéval. Tu construis ton armée, elle se bat toute seule, tu pushes vers de nouvelles zones, tu pars en croisade pour reset et devenir plus fort.

## Stack

- **Vite + Svelte** (JS pur, pas de TypeScript)
- Persistance : `localStorage`
- Déploiement : GitHub Pages, auto via push sur `main` (workflow `.github/workflows/deploy.yml`)
- Pas de backend, pas d'assets lourds (emojis + SVG inline en V1)

## Commandes

- `npm install` — install
- `npm run dev` — dev local (HMR)
- `npm run build` — build prod (`dist/`)
- `npm run preview` — preview du build local

## Conventions

### Naming
- **Composants Svelte** : PascalCase (`App.svelte`, `Header.svelte`).
- **Fichiers non-composants** : kebab-case (`game-tick.js`).
- **Variables et fonctions** : camelCase.
- **UI affichée** : français. Le nom du jeu, partout (titre `<header>`, `<title>` HTML, README), est **Idle Crusade**.

### Code style
- **JS pur**, pas de TS / ESLint / Prettier (YAGNI strict). Conventions implicites figées :
  - **Indentation** : 2 espaces (Svelte, JS, CSS, YAML, HTML).
  - **Strings JS** : single quotes.
  - **Pas de `;` en fin de ligne JS** (style Svelte/Vite par défaut).
- **CSS** : tout dans `src/app.css` tant que `App.svelte` reste monolithique. On passera à `<style>` scopé par composant **uniquement à l'éclatement** (US qui découpera l'UI).

### Patterns Svelte (figés US 1)
- **Ordre dans `<script>`** : `import` → `const` (config / data immuable) → `let` (state) → helpers (`function`) → `$:` derived → `function` métier → `onMount`.
- **State vs data** : valeur courante en `let` plat (`enemyHp`), max/config sur l'objet source (`enemy.hpMax`). Le state mute, la donnée est figée.
- **Cleanup `onMount`** : tout `setInterval` se cleanup via `return () => clearInterval(id)`. Pour les `setTimeout`, utiliser un Set tracké (helper `later(fn, ms)` dans App.svelte) pour les cleanup tous d'un coup. Sans ça, HMR Svelte/Vite accumule des timers fantômes en dev.
- **Reactivity arrays** : toujours réassigner (`arr = [...arr, x]` ou `arr = arr.filter(...)`), jamais `arr.push(x)`. Sinon Svelte 4 ne ré-render pas.
- **Effets visuels transients** (popups, +XX gold, level-up, crit) : un seul array `pops` keyed par `id` auto-incrémenté, discriminé par `kind: 'damage' | 'gold' | …`. Helper `pushPop(kind, value)` + cleanup `setTimeout` via `later()` aligné sur la durée d'animation CSS. Extraire dans `src/lib/popups.js` seulement si > 3 kinds (pas avant — c'est ~10 lignes).
- **Helpers utilitaires partagés** : `src/lib/*.js` modules ESM, fonctions pures. Premier helper : [`src/lib/format.js`](src/lib/format.js) (format nombres FR avec espace fine).
- **Catch-up tick (idle game core)** : un `let lastTickAt = 0` initialisé dans `onMount` à `performance.now()`. Le callback `setInterval(tick)` calcule `n = Math.floor((now - lastTickAt) / tickMs)` et applique les `n` ticks dus. Une seule fonction métier `applyOneTick(withAnim)` sert les deux paths : `n === 1` → `applyOneTick(true)` (animations live) ; `n > 1` → boucle `for` synchrone sans animations + un seul popup "welcome-back" résumé. Évite que les browsers throttlés en background gèlent le jeu. Détaillé dans [docs/solutions/patterns/idle-game-tick-and-popups.md](docs/solutions/patterns/idle-game-tick-and-popups.md).
- **Éléments cliquables** : préférer un `<button>` natif (focus/keyboard gratuits, sémantique correcte). Tomber sur `<div role="button" tabindex="0" on:keydown>` **uniquement** si une contrainte CSS rend le reset `<button>` plus pénible que les 4 attributs ARIA.
- **Catalogues de données** : `const` array d'objets ou map indexée par discriminant (zone, tier…), en haut du `<script>`. Pour un lookup par discriminant entier connu (ex: zone N), préférer `const ZONE_BOSSES = { 1: {...}, 2: {...} }` (lookup O(1), pas de field redondant) au tableau filtré. Pour la rotation cyclique (mobs en boucle), garder un array.
- **Overlays temporaires** (toast, flash, banner) : flag booléen `let isXxx = false` + déclenchement via `later()` aligné sur la durée. Animation enter/leave : `transition:fade` Svelte plutôt qu'un `@keyframes` custom. Si la fonction qui déclenche peut être ré-entrée, **toujours** câbler un `invocationId` :
  ```js
  let invocationId = 0
  function trigger() {
    const myId = ++invocationId
    isXxx = true
    later(() => { if (myId === invocationId) isXxx = false }, durationMs)
  }
  ```
  Évite les états désync quand le 2e trigger arrive avant le cleanup du 1er.

### UI / format
- **Nombres affichés** : séparateur de milliers = espace fine (`1 247`, pas `1,247`). Quand le besoin viendra, prévoir `src/lib/format.js` avec un helper basé sur `Math.floor(n).toLocaleString('fr-FR')`.
- **Pas de gros nombres flottants** (`1247.83`) — arrondir avant affichage.
- **Pas d'assets dans `public/`** sauf nécessaire absolu. Tout passe par `src/assets/` + import ESM Vite (hash auto).
- **Sprites pixel art** : pipeline complet documenté dans [`docs/solutions/patterns/sprites-pipeline.md`](docs/solutions/patterns/sprites-pipeline.md). Résumé :
  - Génération via Nano Banana (prompts + art bible dans `src/assets/sprites/PROMPTS.md`)
  - Chroma key magenta → `scripts/chroma_key.py`
  - Optimisation WebP via `npm run sprites` (devdep `sharp`, `scripts/optimize-sprites.mjs`)
  - Commit uniquement les `.webp` (PNG sources gitignored)
  - Catalogue : prop `spriteUrl` ajoutée aux objets, fallback emoji via `{#if spriteUrl}<img>{:else}{emoji}{/if}`
  - **Toujours** `{#key}` autour du `<img>` quand le `src` peut changer (évite flash de l'ancien sprite au cache miss)
  - **Toujours** précharger les sprites au mount (`new Image(); img.src = url` pour chaque) → évite le flash de texte alt au premier paint
  - `image-rendering: -webkit-optimize-contrast; image-rendering: pixelated;` (fallback Safari ≤16)
  - Background image : CSS variable injectée par Svelte (`style:--bg-foret={url(...)}`) référencée par CSS statique (`var(--bg-foret, none)`).

### Git
- **Commits** : conventional commits, **sujet 100% anglais** (`feat: setup vite svelte and gh pages deployment`, pas de mélange FR/EN dans le sujet).

## Workflow par US

Cycle pour chaque User Story :

1. **`/ce:plan`** → plan détaillé dans `docs/plans/YYYY-MM-DD-NNN-...md`
2. **`/ce:work`** → implémentation contre le plan
3. **`/review`** → relecture critique
4. **`/ce:compound`** → capture des apprentissages

Les US sont listées dans [SPEC.md](SPEC.md), section "Découpage en jalons" (mise à jour au fil de l'eau).

## Contexte de collaboration

- Projet perso d'Etienne, codé en mode **vibe code** — Claude peut proposer et coder librement, Etienne challenge ou valide à la volée.
- Etienne code en duo avec son fils (5 ans). **Le fils kiffe le résultat visuel**, pas les explications. Donc :
  - Privilégier les feedbacks visuels (emojis, animations CSS simples, chiffres qui poppent)
  - Pas de gros nombres flottants (1247.83) — arrondir avant affichage
  - Si une feature n'a pas de manifestation visible à l'écran, elle attend
- Pas de tests en V1. On itère vite, on regarde si ça tourne dans le navigateur.

## Documents de référence

- [SPEC.md](SPEC.md) — vision produit, pillars, mécaniques, jalons
- [docs/plans/](docs/plans/) — plans détaillés par US
- `mockup-v0.html` — maquette visuelle d'origine **figée** (sert de référence visuelle). Ne plus modifier. Les divergences avec `App.svelte` sont attendues : titre `CROISADE` → `IDLE CRUSADE`, format nombres `1,247` → `1 247`.
