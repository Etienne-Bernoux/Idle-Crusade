---
title: "feat: Setup Vite+Svelte et déploiement GitHub Pages (US 0)"
type: feat
status: active
date: 2026-05-05
---

# US 0 — Setup Vite+Svelte + déploiement GitHub Pages

Première US du V1 de **Croisade**. Objectif : avoir une URL publique qui sert le mockup actuel transposé en projet Svelte, builté par Vite, déployé via GitHub Actions. Aucun gameplay encore — juste le pipeline.

## Critères d'acceptation

- [ ] `npm install && npm run dev` ouvre le mockup à l'identique en local
- [ ] `npm run build` produit un `dist/` valide (sans erreur, assets résolus)
- [ ] Push sur `main` → GitHub Action verte → site accessible à `https://<user>.github.io/croisade/`
- [ ] L'URL publique affiche **visuellement** le même rendu que le mockup actuel : grille header / left-stats / center-combat / right-troops / actives, fonts Cinzel + EB Garamond chargées, palette parchemin/or/sang
- [ ] Le code est en JS pur (pas de `.ts`, pas de `tsconfig.json`)
- [ ] Le `README.md` minimal explique : `npm i`, `npm run dev`, `npm run build`

## Décisions techniques

- **Stack** : Vite 5 + Svelte 4, template officiel `npm create vite@latest . -- --template svelte` (pas de `-ts`).
- **Fonts** : on garde le `<link>` Google Fonts CDN du mockup (zéro coût build, suffisant pour V1). Pas de `@fontsource/*`.
- **`base` Vite** : `base: './'` (chemins relatifs). Marche en dev et sur GH Pages sans flag conditionnel — plus simple à expliquer à un fils de 5 ans qui demande "pourquoi ça marche pas en local".
- **Composants** : pour US 0, **tout dans `App.svelte`** (monolithique). Pas de découpage prématuré. Les composants apparaîtront dans les US 2-6 quand chaque zone aura du comportement.
- **CSS global** : variables `:root`, fonts, body styles → `src/app.css`. Le reste (layout grid, panels) → `<style>` dans `App.svelte`.
- **Node** : 20 LTS. Ajouter un `.nvmrc` avec `20`.

## Étapes d'implémentation

### 1. Préserver le mockup actuel
```
git mv index.html mockup-v0.html
```
Garde une trace de la maquette d'origine pour comparaison visuelle. Ne sera pas servie par Vite.

### 2. Init Vite + Svelte
```
npm create vite@latest . -- --template svelte
npm install
```
Vite va générer `index.html`, `package.json`, `vite.config.js`, `src/App.svelte`, `src/main.js`, `src/app.css`, `public/vite.svg`.

### 3. Transposer le mockup dans Svelte
- Copier le bloc `<style>` du mockup → split entre `src/app.css` (variables, body, fonts) et `<style>` de `App.svelte` (layout + panels)
- Copier la structure HTML (`<div class="game">...`) → template de `App.svelte`
- Ajouter les `<link>` Google Fonts dans `index.html` (pas dans App.svelte)
- Lang FR : `<html lang="fr">`
- `<title>Croisade</title>` (drop le "— Mockup")
- Supprimer la `vite.svg` par défaut

### 4. Configurer Vite pour GH Pages
**`vite.config.js`** :
```js
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  base: './',
})
```

### 5. Créer le workflow GitHub Actions
**`.github/workflows/deploy.yml`** :
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

### 6. Setup manuel GitHub (à faire une fois)
- Créer le repo distant (si pas déjà fait) : `gh repo create croisade --public --source=. --push`
- **Settings → Pages → Source : "GitHub Actions"** (sinon le déploiement échoue silencieusement)

### 7. README minimal
- 5-6 lignes : pitch + commandes (`npm i`, `npm run dev`, `npm run build`)
- Lien vers la spec

### 8. Validation
- Push, watch l'action verte (`gh run watch`)
- Ouvrir l'URL publique, vérifier rendu identique au mockup
- Comparer côte à côte avec `mockup-v0.html` ouvert en local

## Hors scope (à NE PAS faire en US 0)

- Aucune logique de jeu (pas de tick, pas de compteur, pas de bouton)
- Aucune décomposition en sous-composants Svelte
- Aucun store Svelte
- Pas de `localStorage`
- Pas de TypeScript, pas de Prettier/ESLint config (on verra plus tard si besoin)
- Pas de tests
- Pas de favicon custom (la `vite.svg` par défaut peut sauter, mais zéro effort design)

## Gotchas anticipés

- **Pages source mal réglée** : si `Settings → Pages → Source` reste sur "Deploy from a branch", le workflow tournera mais rien ne sera servi. → Première chose à vérifier si l'URL renvoie 404 alors que l'action est verte.
- **Chemins absolus dans le mockup** : aucun pour l'instant (tout est inline CSS), donc `base: './'` suffit. À surveiller si on rajoute des assets dans `src/assets/`.
- **Conflit `index.html`** : Vite veut générer le sien. C'est pour ça qu'on renomme `index.html` → `mockup-v0.html` AVANT `npm create vite`.
- **Fonts Google bloquées** : si le réseau est restrictif, fallback sur `Georgia, serif`. Déjà en place dans le mockup.

## Sources

- Spec produit : [SPEC.md](../../SPEC.md)
- Mockup d'origine : [index.html](../../index.html) → renommé en `mockup-v0.html` à l'étape 1
- Vite + Svelte : `vite.dev/guide`, `svelte.dev/docs`
- Deploy Pages action : `github.com/actions/deploy-pages`

## Estimation

**1 session (1-2h)** avec le fils. La majorité du temps sera passée sur (a) la transposition CSS du mockup et (b) le premier setup GitHub Pages (la seule étape "magique" pour un enfant — voir le site apparaître à une vraie URL).
