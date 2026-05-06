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
- **Effets visuels transients** (popups, +XX gold, level-up, crit) : array d'objets avec `id` auto-incrémenté + cleanup `setTimeout` aligné sur la durée d'animation CSS. À la 2e occurrence, extraire dans `src/lib/popups.js`.

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
