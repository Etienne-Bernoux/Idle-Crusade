---
title: "feat: US 4.5 — Intégration sprites pixel art (caserne + gobelin + forêt)"
type: feat
status: active
date: 2026-05-06
---

# US 4.5 — Intégration des sprites pixel art

US **transversale** intercalée avant US 5. Etienne a déjà généré un set de sprites (Nano Banana) avec un pipeline complet (`PROMPTS.md` + `chroma_key.py`). Cette US les intègre dans le jeu, optimise leur poids, et établit le pattern pour les futurs sprites.

**Hook produit (fils 5 ans)** : énorme bond visuel. Plus d'emojis pour le paysan/soldat/chevalier/champion dans la caserne, plus d'emoji pour le Gobelin Maraudeur en combat. Du vrai pixel art chibi. Le décor forêt en arrière-plan.

## Critères d'acceptation

- [ ] Les 4 unités de la caserne (Paysan, Soldat, Chevalier, Champion) affichent leur sprite PNG/WebP au lieu de l'emoji
- [ ] Le mob "Gobelin Maraudeur" affiche `gobelin.webp` au lieu de l'emoji `👹`
- [ ] Les 4 autres mobs (Squelette, Loup, Orc, Rat) **gardent l'emoji** (pas de sprite dispo)
- [ ] Le boss "Roi Gobelin" garde l'emoji `👑` (pas de sprite dédié, à générer plus tard)
- [ ] Le décor `foret.webp` est utilisé en background de la zone combat (opacité réduite pour ne pas masquer les feedbacks)
- [ ] Toutes les animations existantes restent fonctionnelles (bob, shake, opacity respawn, transition boss size)
- [ ] Le bundle network total reste **sous 2 MB** (compression WebP agressive)
- [ ] Le script d'optimisation est commit (`scripts/optimize-sprites.mjs`) et reproductible (`npm run sprites`)
- [ ] `chroma_key.py` + `PROMPTS.md` sont commit (workflow Etienne documenté)
- [ ] `_raw.png` (versions pré-chroma-key, ~25 MB) **non commit** (gitignore)

## Décisions techniques

### Where they live
- **Source clean PNG** : `src/assets/sprites/<nom>.png` — versions chroma-keyed (locales, gitignored)
- **Output WebP commité** : `src/assets/sprites/<nom>.webp` — c'est ce qui est servi
- **Workflow** : `chroma_key.py` (Etienne, hors-build) → `optimize-sprites.mjs` (au besoin) → WebP commité

### Pipeline d'optimisation
- Devdep : `sharp` (Node, binaire C++ natif, idéal pour resize + WebP)
- Script `scripts/optimize-sprites.mjs` :
  - Lit `src/assets/sprites/*.png` (exclut `*_raw.png`)
  - Pour chaque PNG : resize 512×512 (unités/mobs) ou 1024×512 (décor) + WebP qualité 85
  - Output : `<nom>.webp` à côté
  - Idempotent : skip si .webp existe et est plus récent que le .png source
- Commande : `npm run sprites` ajoutée à `package.json`
- Lancé **manuellement** quand Etienne ajoute / modifie des sprites. Pas dans le build CI (les WebP sont versionnés).

### Estimation poids final
- 5 sprites unitaires + 1 mob → 512×512 WebP q85 → ~50-100 KB chacun → **~400-600 KB total**
- 1 décor → 1024×512 WebP q80 → **~150-300 KB**
- **Total cible : ~1 MB** (vs 9 MB des PNG clean, 34 MB total avec _raw)

### Catalogue avec spriteUrl
Étendre `mobs`, `bosses`, et créer un nouveau `units` (caserne) avec `spriteUrl`. Pattern d'import Vite :

```js
import gobelinSprite from './assets/sprites/gobelin.webp'
import paysanSprite from './assets/sprites/paysan.webp'
// etc.

const mobs = [
  { name: 'Gobelin Maraudeur', sprite: '👹', spriteUrl: gobelinSprite, hpMax: 500, gold: 5 },
  { name: 'Squelette Croulant', sprite: '💀', spriteUrl: null, hpMax: 600, gold: 8 },
  // ... emoji-only restent à spriteUrl: null
]
```

`sprite` (emoji) reste comme **fallback** quand `spriteUrl === null`. Pattern utile pour les futures sprites incrémentaux.

### Markup conditionnel
Composant inline (pas un sous-composant Svelte) :

```svelte
<div class="enemy-sprite" ...>
  {#if enemy.spriteUrl}
    <img src={enemy.spriteUrl} alt={enemy.name} class="sprite-img" />
  {:else}
    {enemy.sprite}
  {/if}
</div>
```

Avantages :
- Le mix sprite/emoji marche naturellement
- Toutes les animations CSS de `.enemy-sprite` (bob, shake, hit, transition opacity, taille boss) marchent **sur le wrapper**, pas sur l'image elle-même
- Si la `<img>` foire (network, file manquant), l'`alt` s'affiche → pas de crash silencieux

### CSS pour `<img>` dans `.enemy-sprite`
```css
.enemy-sprite img.sprite-img {
  width: 1em;
  height: 1em;
  display: block;
  image-rendering: pixelated;  /* préserve le crisp pixel art */
  vertical-align: middle;
}
```
`width: 1em` fait suivre la taille du parent (`font-size: 7rem` mob, `9rem` boss). Magie CSS.

### Caserne : `<img>` à la place de l'emoji
```svelte
<div class="unit-icon">
  {#if unit.spriteUrl}
    <img src={unit.spriteUrl} alt={unit.name} class="unit-icon-img" />
  {:else}
    {unit.icon}
  {/if}
</div>
```

Création d'un catalogue `units` parallèle aux `mobs` :
```js
const units = [
  { id: 'paysan', name: 'Paysan', icon: '🧑‍🌾', spriteUrl: paysanSprite, ... },
  { id: 'soldat', name: 'Soldat', icon: '🛡️', spriteUrl: soldatSprite, locked: true },
  // ...
]
```

À ce stade, les unités étaient hardcodées dans le markup. C'est l'occasion de les extraire en data + `{#each}`. Refactor mineur, pas un blocker mais cohérent avec le pattern catalogues.

### Background forêt sur `.combat`
```css
.combat {
  background:
    radial-gradient(ellipse at center, rgba(196, 30, 58, 0.05) 0%, transparent 60%),
    url(/path/to/foret.webp) center / cover no-repeat,
    url("data:image/svg+xml,...");  /* le grid pattern existant */
}
```
Stack : grid pattern (le moins prio) → forêt → radial rouge (le plus prio).

L'opacité de la forêt se gère via un overlay sombre (radial-gradient au-dessus) ou directement via `background-blend-mode: multiply` + couleur sombre. Approche simple : utiliser `filter: brightness(0.5)` sur le background-image n'est pas trivial. Plus simple : un overlay `::before` semi-transparent.

```css
.combat::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(21, 16, 12, 0.55);  /* var(--bg-deep) à 55% */
  pointer-events: none;
  z-index: 0;
}
.combat > * { position: relative; z-index: 1; }
```

À tester visuellement — c'est typiquement le genre de truc qu'on ajuste live.

### Gestion `_raw.png`
Ils sont énormes (~25 MB total) et ne servent qu'au pipeline `chroma_key.py`. Décisions :
- Ils restent en local chez Etienne dans le repo principal
- Ajouter au `.gitignore` : `assets/sprites/*_raw.png` au cas où on les met dans le worktree
- `chroma_key.py` est commit (workflow reproductible)
- `PROMPTS.md` est commit (recette + art bible)

### `preview.html`
Pas une priorité US 4.5. Si Etienne veut, on le copie dans `docs/sprites-preview.html` plus tard.

## Étapes d'implémentation

1. **Copie des sprites** (côté worktree) :
   - Créer `src/assets/sprites/`
   - Copier les `.png` clean (sans `_raw`) du repo principal
   - Copier `chroma_key.py` → `scripts/chroma_key.py`
   - Copier `PROMPTS.md` → `src/assets/sprites/PROMPTS.md`

2. **Pipeline optimisation** :
   - `npm i -D sharp`
   - Créer `scripts/optimize-sprites.mjs` (resize + WebP)
   - `package.json` : ajouter `"sprites": "node scripts/optimize-sprites.mjs"`
   - Lancer `npm run sprites` → produit les `.webp`
   - Vérifier les tailles cibles

3. **`.gitignore`** :
   - Ajouter `src/assets/sprites/*.png` (on commit que les WebP)
   - Ajouter `src/assets/sprites/*_raw.png` (au cas où)

4. **Catalogues + imports** dans `App.svelte` :
   - Imports ESM des `.webp` en haut du `<script>`
   - Catalogue `units` extrait
   - Prop `spriteUrl` ajoutée à `mobs`, `bosses`, `units`

5. **Markup** :
   - Conditionnel `{#if spriteUrl}<img>{:else}{emoji}{/if}` dans la caserne et le combat
   - Caserne : `{#each units as unit}` à la place du markup hardcodé

6. **CSS** :
   - `.enemy-sprite img.sprite-img` (1em, pixelated)
   - `.unit-icon-img` (40px, pixelated)
   - `.combat` : background forêt + overlay `::before`

7. **Validation** :
   - `npm run build` → vérifier le bundle (les WebP doivent apparaître dans `dist/assets/` avec hash)
   - `npm run dev` → visuel : sprites s'affichent, animations marchent, fond forêt visible mais pas envahissant
   - Bundle total `dist/` doit rester sous **2 MB**

8. **Build, commit, push, PR, review, compound, merge.**

## Hors scope

- Pas de sprites pour Squelette / Loup / Orc / Rat / Roi Gobelin (à générer plus tard via le même pipeline)
- Pas de variations visuelles (idle/attack/death frames) — sprites statiques, animations CSS comme avant
- Pas de sprite pour les zones suivantes (zone 2 = nouveau décor à générer)
- Pas d'effet sonore au clic sur sprite
- Pas de preview gallery dans le jeu (`preview.html` reste indépendant)
- Pas de gestion responsive avancée (les sprites suivent `font-size`, ça suffit)

## Gotchas anticipés

- **`sharp` natif** : binaire à compiler / télécharger au `npm i`. Sur Linux CI, ça marche d'office. Sur macOS Apple Silicon, parfois capricieux mais Vite l'utilise déjà beaucoup.
- **`image-rendering: pixelated`** : Safari support correct mais pas tous browsers. Fallback `crisp-edges` envisageable mais le rendu est pas 100% identique. Pour le V1 vibe-code, `pixelated` suffit.
- **Aspect ratio des sprites** : ce sont des 1024×1024 (carrés) pour les unités. Le `width: 1em; height: 1em` les force au carré → cohérent avec les emojis qu'ils remplacent.
- **Forêt en background** : risque de masquer les feedbacks (popups, HP bar, sprite). L'overlay sombre 55% doit suffire, mais à ajuster live (val possible 40-70%).
- **Cache du browser sur les WebP** : Vite hash les fichiers (`gobelin-Bxk2A1.webp`) → invalidation auto au rebuild. Pas de souci.
- **Vite et les imports d'assets > 4KB** : émis en fichier séparé (correct pour des sprites), pas inlined en data URI. C'est ce qu'on veut.
- **Ordre des bg sur `.combat`** : la forêt doit être SOUS le grid pattern existant pour que le grid reste subtil. Tester l'empilement.
- **`background-image` multiple sur `.combat`** : les commas séparent les couches, l'ordre va du **devant** vers **l'arrière**. Donc le radial-gradient d'abord, puis forêt, puis grid pattern.

## Estimation

**~2-3 heures.** Le plus chronophage : ajuster visuellement la lisibilité du fond forêt + les tailles des sprites caserne. Le code Svelte est ~50 lignes ajoutées.

## Sources

- Sprites + workflow : `/Users/etiennebernoux/Perso/projets/croisade/assets/sprites/` (repo principal)
- Pipeline : `/Users/etiennebernoux/Perso/projets/croisade/scripts/chroma_key.py`
- Prompts Nano Banana : `/Users/etiennebernoux/Perso/projets/croisade/assets/sprites/PROMPTS.md`
- Plan US 4 : [`2026-05-06-004-feat-us-4-boss-zone-1-plan.md`](2026-05-06-004-feat-us-4-boss-zone-1-plan.md)
- Pattern catalogues figé en US 4 : [CLAUDE.md](../../CLAUDE.md) (section Conventions)
