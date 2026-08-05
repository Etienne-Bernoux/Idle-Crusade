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
- **CSS** : l'éclatement est fait (US 42). Une famille de classes **possédée par un seul composant**
  vit dans son `<style>` scopé ; le **chrome partagé** (`.modal-backdrop`, `.modal`, `.modal-btn`,
  `.crusade-*`, `.biome-*` — utilisés par plusieurs modales) reste dans `src/app.css`, dupliquer
  serait pire. **Piège vécu** : en déplaçant une famille, emporter aussi ses `@media` restées
  ailleurs dans `app.css`. Svelte suffixe le sélecteur scopé d'une classe de hash, donc la règle du
  composant **bat** l'override global qu'on a laissé derrière — l'arbre est repassé de nœuds
  tapables à 15 px intappables, sans la moindre erreur.

### Patterns Svelte (figés US 1)
- **Ordre dans `<script>`** : `import` → `const` (config / data immuable) → `let` (state) → helpers (`function`) → `$:` derived → `function` métier → `onMount`.
- **State vs data** : valeur courante en `let` plat (`enemyHp`), max/config sur l'objet source (`enemy.hpMax`). Le state mute, la donnée est figée.
- **Cleanup `onMount`** : tout `setInterval` se cleanup via `return () => clearInterval(id)`. Pour les `setTimeout`, utiliser un Set tracké (helper `later(fn, ms)` dans App.svelte) pour les cleanup tous d'un coup. Sans ça, HMR Svelte/Vite accumule des timers fantômes en dev.
- **Reactivity arrays** : toujours réassigner (`arr = [...arr, x]` ou `arr = arr.filter(...)`), jamais `arr.push(x)`. Sinon Svelte 4 ne ré-render pas.
- **Effets visuels transients** (popups, +XX gold, level-up, crit) : un seul array `pops` keyed par `id` auto-incrémenté, discriminé par `kind: 'damage' | 'gold' | …`. Helper `pushPop(kind, value)` + cleanup `setTimeout` via `later()` aligné sur la durée d'animation CSS. Extraire dans `src/lib/popups.js` seulement si > 3 kinds (pas avant — c'est ~10 lignes).
- **Helpers utilitaires partagés** : `src/lib/*.js` modules ESM, fonctions pures. Premier helper : [`src/lib/format.js`](src/lib/format.js) (format nombres FR avec espace fine).
- **Catch-up tick (idle game core)** : un `let lastTickAt = 0` initialisé dans `onMount` à `performance.now()`. Le callback `setInterval(tick)` calcule `n = Math.floor((now - lastTickAt) / tickMs)` et applique les `n` ticks dus. Une seule fonction métier `applyOneTick(withAnim)` sert les deux paths : `n === 1` → `applyOneTick(true)` (animations live) ; `n > 1` → boucle `for` synchrone sans animations + un seul popup "welcome-back" résumé. Évite que les browsers throttlés en background gèlent le jeu. Détaillé dans [docs/solutions/patterns/idle-game-tick-and-popups.md](docs/solutions/patterns/idle-game-tick-and-popups.md).
- **Éléments cliquables** : préférer un `<button>` natif (focus/keyboard gratuits, sémantique correcte). Tomber sur `<div role="button" tabindex="0" on:keydown>` **uniquement** si une contrainte CSS rend le reset `<button>` plus pénible que les 4 attributs ARIA.
- **Catalogues de données** : `const` array d'objets ou map indexée par discriminant (zone, tier…), en haut du `<script>`. Pour un lookup par discriminant entier connu (ex: zone N), préférer une map `{ 1: {...}, 2: {...} }` (lookup O(1)) au tableau filtré. Pour la rotation cyclique (mobs en boucle), garder un array. **Un catalogue par entité, pas des maps parallèles** : depuis US 5, tout ce qui caractérise une zone vit sous `zones[N]` (`name`, `waves`, `bg`, `mobs[]` en rotation, `boss`) — on a supprimé les anciens `ZONE_BOSSES` / `wavesPerZone` séparés. Le déblocage est **une donnée, pas une branche** : champ `unlockZone` sur la troupe + comparaison `zonesUnlocked >= unlockZone` dans le dérivé, jamais un `if (zone === 2)`. Seuil de généralisation : on bascule du hardcoding au catalogue **au 2e instance concret** (1 zone/troupe = code direct assumé, YAGNI).
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
- **Pas d'assets dans `public/`** sauf nécessaire absolu. Emojis et SVG inline en V1.

### Git
- **Commits** : conventional commits, **sujet 100% anglais** (`feat: setup vite svelte and gh pages deployment`, pas de mélange FR/EN dans le sujet).

## Workflow par US

Cycle pour chaque User Story :

1. **`/ce:plan`** → plan détaillé dans `docs/plans/YYYY-MM-DD-NNN-...md`
2. **`/ce:work`** → implémentation contre le plan
3. **`/review`** → relecture critique
4. **`/ce:compound`** → capture des apprentissages

Les US sont listées dans [docs/BACKLOG.md](docs/BACKLOG.md) (tickets par version) et leur état
d'avancement dans [docs/ROADMAP.md](docs/ROADMAP.md). [SPEC.md](SPEC.md) porte le quoi/pourquoi,
[docs/DESIGN.md](docs/DESIGN.md) les formules d'équilibrage.

## Contexte de collaboration

- Projet perso d'Etienne, codé en mode **vibe code** — Claude peut proposer et coder librement, Etienne challenge ou valide à la volée.
- Etienne code en duo avec son fils (5 ans). **Le fils kiffe le résultat visuel**, pas les explications. Donc :
  - Privilégier les feedbacks visuels (emojis, animations CSS simples, chiffres qui poppent)
  - Pas de gros nombres flottants (1247.83) — arrondir avant affichage
  - Si une feature n'a pas de manifestation visible à l'écran, elle attend
- **Sondes navigateur versionnées** : `scripts/verif/` (`jeu.mjs`, `mobile.mjs`, `son.mjs`, `patine.mjs`, `route.mjs`, `critique.mjs`). Elles
  pilotent le vrai jeu et vérifient ce qu'aucun test unitaire ne voit. Playwright n'est PAS une
  dépendance : son chemin se passe en argument. Voir `scripts/verif/README.md`.
- **Stratégie de test (depuis V2)** : la **logique pure** (`src/lib/*.js` — save, reliques, formules) est couverte par des **tests unitaires `node:test`** (`*.test.js` à côté du module, lancés via `npm test`, zéro dépendance). Le **comportement UI** (combat, drop, équip, transition) se vérifie **dans le navigateur** (vibe code, on regarde si ça tourne). On teste **au fur et à mesure**, checkpoint par checkpoint — pas à la fin. Pour rendre une logique testable, l'extraire en fonction pure (ex. `parseSave(raw)` séparé de `loadSave()` qui lit `localStorage`).

## Documents de référence

- [SPEC.md](SPEC.md) — vision produit, pillars, mécaniques, jalons
- [docs/plans/](docs/plans/) — plans détaillés par US
- `mockup-v0.html` — maquette visuelle d'origine **figée** (sert de référence visuelle). Ne plus modifier. Les divergences avec `App.svelte` sont attendues : titre `CROISADE` → `IDLE CRUSADE`, format nombres `1,247` → `1 247`.
