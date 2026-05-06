---
title: Setup d'un site statique Vite + Svelte (JS pur) sur GitHub Pages
category: setup
date: 2026-05-06
tags: [vite, svelte, github-pages, github-actions, static-site, vibe-code]
project: idle-crusade
related_pr: https://github.com/Etienne-Bernoux/Idle-Crusade/pull/1
---

# Setup site statique Vite + Svelte sur GitHub Pages

> Mode d'emploi pour la prochaine fois qu'un projet perso statique doit partir de zéro vers une URL publique GH Pages, en JS pur (pas de TS/lint/test/store).

## Contexte

US 0 d'un projet de jeu idle (Idle Crusade). Objectif : transposer un mockup HTML statique en projet Svelte buildé par Vite et déployé automatiquement sur GH Pages, sans aucune logique métier. Premier des 8 increments.

## Décisions clés (avec justification)

### 1. `base: './'` plutôt que `base: '/repo-name/'`
Évite la friction "ça marche en prod mais pas en local" et la logique conditionnelle `process.env.GITHUB_PAGES`. Marche partout (dev, preview, prod GH Pages) tant qu'on n'utilise pas de routing absolu.

### 2. Init manuel plutôt que `npm create vite@latest .`
`npm create vite` est interactif et râle sur un dossier non-vide (cas typique : SPEC.md, CLAUDE.md, docs/ déjà présents). Plus rapide d'initialiser à la main 6 fichiers (~15 lignes de boilerplate) puis `npm install`. Évite les prompts.

### 3. CSS 100% dans `src/app.css` (global) tant que monolithique
Pas de `<style>` dans `App.svelte` tant qu'il est seul. Le découpage par composant attend l'éclatement de `App.svelte`. Évite le scoping prématuré.

### 4. Pas de `defineConfig` en JS pur
`defineConfig` n'apporte que de l'autocomplete TypeScript. En JS, exporter l'objet directement est strictement équivalent et plus court.

### 5. Pas de TS / ESLint / Prettier en V1
YAGNI strict. Conventions implicites figées dans CLAUDE.md (indent 2, single quotes, pas de `;` final). À introduire seulement si on en sent le besoin.

## Gotcha CRITIQUE — GH Pages 404 silencieux

**Après le merge sur `main`, le workflow tourne vert mais l'URL renvoie 404.**

→ Cause : par défaut, `Settings → Pages → Source` est sur "Deploy from a branch". Il faut le passer à **"GitHub Actions"** (action manuelle, une seule fois par repo). Sans ça, l'artifact uploadé par `actions/upload-pages-artifact` n'est jamais servi.

C'est le **seul réglage manuel** du setup. À documenter dans tout README ou plan d'US 0.

## Fichiers minimaux qui marchent

### `package.json`
```json
{
  "name": "idle-crusade",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^3.1.2",
    "svelte": "^4.2.19",
    "vite": "^5.4.10"
  }
}
```

### `vite.config.js`
```js
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default {
  plugins: [svelte()],
  base: './',
}
```

### `src/main.js`
```js
import './app.css'
import App from './App.svelte'

new App({
  target: document.getElementById('app'),
})
```

### `index.html`
```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Idle Crusade</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

### `.github/workflows/deploy.yml`
```yaml
name: Deploy to GitHub Pages
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: false }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: ./dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

## Bénéfices observés

- `npm install` : 35 packages, 8 s
- `npm run build` : 144 ms, ~13 KB total non-gzippé (HTML 0,71 KB + CSS 5,94 KB + JS 7,1 KB)
- Workflow Actions : ~30-60 s entre push `main` et URL live
- Aucune vulnérabilité critique (`npm audit` : 7 moderate, toutes dev-server / SSR-only — non applicable à un bundle CSR statique)

## Process learnings (vibe-code)

- **`/ce:review` standard veut faire trop pour un US de setup** : sélectionner manuellement 3 agents pertinents (simplicity, security, pattern-consistency) plutôt que lancer la full pipeline (12+ agents Rails/migrations/perf).
- **`/ce:work` standard veut Figma sync + screenshots avant/après + post-deploy monitoring** : non applicable au statique perso. Adapter en sautant ces phases.
- **Pas de fichiers `todos/`** : vibe-code, on traite les findings inline pour ne pas polluer le repo.
- **`gh auth login` est interactif** (device flow) : ne peut pas être lancé depuis Claude Code. À déléguer à l'utilisateur dès qu'on en a besoin pour `gh pr create`.

## Conventions induites (figées dans CLAUDE.md)

- Format nombres FR : espace fine `1 247` (pas `1,247`)
- Indentation 2 espaces partout
- Single quotes JS, pas de `;` final
- Commits conventional, **sujet 100% anglais** (un de mes premiers commits a mélangé FR/EN — éviter)
- CSS dans `app.css` tant que `App.svelte` monolithique
- `mockup-v0.html` figé : ne plus modifier, sert de référence visuelle

## Prevention / next time

- ✅ **Réglage GH Pages "GitHub Actions"** : ajouter à toute checklist setup, c'est le seul piège réel.
- ✅ Garder le mockup d'origine renommé en `mockup-v0.html` plutôt que supprimé : utile pour comparer visuellement après transposition.
- ✅ Ne pas créer de favicon/SVG custom en V0/V1 : l'absence ne se voit pas, le temps perdu se voit.

## Liens

- PR : [Etienne-Bernoux/Idle-Crusade#1](https://github.com/Etienne-Bernoux/Idle-Crusade/pull/1)
- Plan source : [`docs/plans/2026-05-05-001-feat-setup-vite-svelte-gh-pages-plan.md`](../../plans/2026-05-05-001-feat-setup-vite-svelte-gh-pages-plan.md)
- Spec produit : [`SPEC.md`](../../../SPEC.md)
- Conventions projet : [`CLAUDE.md`](../../../CLAUDE.md)
