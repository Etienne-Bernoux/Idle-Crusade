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

- **Code** : JS pur. PascalCase pour les composants Svelte (`App.svelte`, `Header.svelte`), camelCase pour variables/fonctions, kebab-case pour les fichiers non-composants (`game-tick.js`).
- **UI affichée** : français. Le titre de marque est "Idle Crusade", mais dans le jeu on dit "Croisade".
- **Commits** : conventional commits en anglais (`feat:`, `fix:`, `chore:`, `docs:`).
- **Pas de TS, pas d'ESLint, pas de Prettier** tant qu'on n'en sent pas le besoin. YAGNI strict.
- **Pas d'assets dans `public/`** sauf nécessaire absolu. Tout reste inline.

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
- `mockup-v0.html` (à venir, après US 0) — maquette visuelle d'origine pour comparaison
