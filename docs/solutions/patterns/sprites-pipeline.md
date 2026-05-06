---
title: Pipeline et intégration des sprites pixel art
category: patterns
date: 2026-05-06
tags: [sprites, vite, svelte, webp, pixel-art, image-loading, idle-crusade]
project: idle-crusade
related_pr:
  - https://github.com/Etienne-Bernoux/Idle-Crusade/pull/6
---

# Pipeline et intégration des sprites pixel art

Recette complète pour générer, traiter, optimiser et intégrer des sprites pixel art dans un projet Vite + Svelte. Né en US 4.5 d'Idle Crusade, après qu'Etienne a généré ses premières unités via Nano Banana.

## Pipeline de bout en bout

```
1. Génération    Nano Banana (Gemini) avec prompt structuré
                 → fond magenta solide #FF00FF (Gemini ne fait pas
                   de vraie transparence)
                 → 1024×1024 unités/mobs, 1024×512 décors
                 → suffixe anti-watermark
                 → image de référence pour cohérence stylistique

2. Chroma key    scripts/chroma_key.py (Python + Pillow)
                 → remplace #FF00FF par alpha 0
                 → tolérance +/- couleur pour bords flous
                 → produit <nom>.png clean depuis <nom>_raw.png

3. Optimisation  scripts/optimize-sprites.mjs (Node + sharp)
                 → resize 512×512 unités, 1024×512 décors
                 → WebP qualité 85 (unités) / 80 (décors)
                 → idempotent (skip si .webp plus récent que .png)
                 → npm run sprites

4. Commit        Seuls les .webp sont versionnés
                 → src/assets/sprites/*.png ignored
                 → src/assets/sprites/*_raw.png ignored
                 → src/assets/sprites/*.webp commit
                 → scripts/* + PROMPTS.md commit (workflow reproductible)

5. Bundle        Vite ESM imports
                 → import gobelinUrl from './assets/sprites/gobelin.webp'
                 → hash auto, output dans dist/assets/<name>-<hash>.webp
                 → cache long-term au déploiement
```

## Tailles obtenues (idle-crusade, US 4.5)

| Asset | PNG clean | WebP | Réduction |
|---|---|---|---|
| Unité (paysan, soldat, chevalier, champion) | ~1 MB | 17-25 KB | -98 % |
| Mob (gobelin) | 1 MB | 26 KB | -97 % |
| Décor (forêt 1024×512) | 4.2 MB | 62 KB | -99 % |
| **Total 6 sprites** | **~9 MB** | **~173 KB** | **-98 %** |

Pour un site GH Pages statique, ces ratios sont la norme — les PNG bruts d'IA générative sont massivement compressibles. Cible toujours sous 500 KB total pour le V1.

## Intégration Svelte

### Import ESM par fichier

```js
import paysanUrl from './assets/sprites/paysan.webp'
import gobelinUrl from './assets/sprites/gobelin.webp'
// ... un import par sprite
```

**Pourquoi pas `import.meta.glob` ?** Sur 6 sprites, le bénéfice (boilerplate réduit) est inférieur au coût (clés string magiques, IDE autocomplete cassé, tree-shaking moins explicite). Au-delà de 12-15 sprites, basculer vers `import.meta.glob` peut se justifier.

### Catalogue avec fallback emoji

```js
const mobs = [
  { name: 'Gobelin', sprite: '👹', spriteUrl: gobelinUrl, hpMax: 500 },
  { name: 'Squelette', sprite: '💀', hpMax: 600 },  // pas encore de sprite
]
```

`spriteUrl` **omis** (pas `null`) quand pas de sprite — le truthy-check `{#if spriteUrl}` traite `undefined` correctement. Signal plus clair : "seuls les mobs avec sprite l'ont".

### Markup conditionnel

```svelte
{#key enemy.name}
  {#if enemy.spriteUrl}
    <img src={enemy.spriteUrl} alt={enemy.name} class="sprite-img" />
  {:else}
    {enemy.sprite}
  {/if}
{/key}
```

Le `{#key}` est **critique** : sans lui, Svelte mute `src` sur le même `<img>` au respawn → si le navigateur n'a pas la nouvelle image en cache, l'**ancienne** reste affichée à 100 % opacity pendant le load (visuellement : on voit le mob précédent ressusciter une fraction de seconde avant que le nouveau apparaisse). Le `{#key}` force démontage / remontage → tabula rasa.

### Préchargement au mount

```js
const ALL_SPRITES = [paysanUrl, gobelinUrl, foretUrl /* ... */]

onMount(() => {
  for (const url of ALL_SPRITES) {
    const img = new Image()
    img.src = url
  }
  // ... le reste du onMount
})
```

Sans préchargement, **au premier paint** : le `<img>` peut afficher son `alt` text le temps que le réseau / Vite serve la WebP. Sur un sprite à `font-size: 7rem`, ça donne "Gobelin Maraudeur" écrit en énorme pendant 50-200 ms. Cheap feel garanti.

Le préchargement est **synchrone à monter dans la closure** mais asynchrone à l'exécution : `new Image(); img.src = url` lance le fetch sans attendre, le browser met en cache, le `<img>` du markup hit le cache instantanément.

### CSS pour les `<img>` qui héritent du parent

```css
.enemy-sprite img.sprite-img {
  display: block;
  width: 1em;
  height: 1em;
  image-rendering: -webkit-optimize-contrast;  /* Safari ≤16 fallback */
  image-rendering: pixelated;
}
```

`width: 1em` fait suivre la taille du `font-size` du parent (`7rem` mob, `9rem` boss). Magie CSS, zéro recalcul.

`image-rendering` : `pixelated` est le bon mode pour préserver le crisp pixel art au scaling. Safari ≤16 ne le supporte pas → ajouter `-webkit-optimize-contrast` avant comme fallback (le browser prend la dernière déclaration qu'il comprend).

## Background image avec CSS variable injectée par Svelte

```svelte
<section class="combat" style:--bg-foret="url({foretUrl})">
```

```css
.combat {
  background:
    radial-gradient(...),
    var(--bg-foret, none) center / cover no-repeat,
    url("data:image/svg+xml,...");
}
.combat::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(21, 16, 12, 0.55);  /* assombrit le bg pour lisibilité */
  pointer-events: none;
  z-index: 0;
}
.combat > * { position: relative; z-index: 1; }
```

**Le pattern** : Vite hash le `.webp` au build → on ne peut pas écrire l'URL en dur dans le CSS. Solution : injecter via une **variable CSS** posée par Svelte (`style:--bg-foret`), référencée par le CSS statique (`var(--bg-foret, none)`). Bénéfice : l'asset reste hashé, le CSS reste statique, pas de `<style>` scoped Svelte.

**Le piège** : l'overlay `::before` est dans le stacking context. Tout enfant direct doit recevoir `position: relative; z-index: 1` pour passer au-dessus. Les enfants positionnés en absolute (popups, toast) **doivent être enfants directs** de `.combat` pour bénéficier du rule `> *`. Sinon, ils restent sous l'overlay.

## Quand extraire en composant `<Sprite>` ?

Pas avant 6+ duplications du `{#if spriteUrl}<img>{:else}{emoji}{/if}` dans le markup, OU avant l'éclatement de `App.svelte` en sous-composants. À US 4.5, le conditional est dupliqué 5 fois (4 caserne + 1 combat) — limite de tolérance.

Quand on l'extraira, signature visée :
```svelte
<Sprite url={enemy.spriteUrl} fallback={enemy.sprite} alt={enemy.name} class="sprite-img" />
```

## Anti-patterns

- **Commit les `_raw.png`** (~25 MB par session) : juste les exclure via `.gitignore`. Le workflow Nano Banana est documenté dans `PROMPTS.md`, n'importe qui peut regen.
- **Servir les PNG directement** : 9 MB sur GH Pages c'est lent et inutile. Toujours optimiser en WebP.
- **`<img src={enemy.spriteUrl}>` sans `{#key}`** : flash de l'ancien sprite au respawn si cache miss.
- **Background image en dur dans le CSS** : casse le hash Vite. Toujours via CSS variable.
- **`image-rendering: auto`** sur du pixel art : flou au scaling. Pixelated obligatoire.

## Liens

- PR : [Etienne-Bernoux/Idle-Crusade#6](https://github.com/Etienne-Bernoux/Idle-Crusade/pull/6)
- Plan source : [`docs/plans/2026-05-06-005-feat-us-4-5-sprites-integration-plan.md`](../../plans/2026-05-06-005-feat-us-4-5-sprites-integration-plan.md)
- Workflow Nano Banana : [`src/assets/sprites/PROMPTS.md`](../../../src/assets/sprites/PROMPTS.md)
- Chroma key : [`scripts/chroma_key.py`](../../../scripts/chroma_key.py)
- Optimisation WebP : [`scripts/optimize-sprites.mjs`](../../../scripts/optimize-sprites.mjs)
- Doc soeur (tick + popups) : [`idle-game-tick-and-popups.md`](idle-game-tick-and-popups.md)
