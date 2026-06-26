---
title: "feat: US 8 — Layout responsive mobile (colonne unique)"
type: feat
status: active
date: 2026-06-16
---

# US 8 — Layout responsive mobile (colonne unique)

Le jeu est **injouable sur mobile** depuis le début : `.game` est une grille fixe `280px 1fr 280px` (~840px+ mini) qui déborde d'un viewport téléphone (375px) ; le débordement est masqué par `overflow: hidden` → seule la Caserne est visible, le combat / les Reliques / les actifs sont hors écran. Jamais vérifié en mobile jusqu'ici.

**Fix (tranché)** : sous un seuil étroit, passer en **colonne unique scrollable** — Combat en premier (priorité), puis Caserne, puis Reliques, puis actifs. CSS pur, zéro JS.

## Critères d'acceptation

- [ ] **CA1** À ≤ 720px de large : layout en **une colonne**, ordre `header → combat → caserne → reliques → actifs`.
- [ ] **CA2** La **page scrolle verticalement** (lever `overflow: hidden` sous le seuil) ; le combat reste exploitable (min-height raisonnable, ennemi + PV + dps visibles d'emblée).
- [ ] **CA3** Plus aucun débordement horizontal (`scrollWidth <= innerWidth`) ; tous les panneaux et les boutons d'actifs sont **atteignables**.
- [ ] **CA4** Les panneaux (caserne, reliques) ne scrollent plus en interne sur mobile (ils s'étendent, la page scrolle) — l'inventaire reste lisible (déjà borné à 30 par US 7).
- [ ] **CA5** Header lisible sur 375px (titre + Or + Gloire ne se chevauchent pas — réduire la typo/les gaps si besoin).
- [ ] **CA6** **Aucune régression desktop** (≥ 721px : grille 3 colonnes inchangée).

## Décisions techniques (CSS uniquement, `src/app.css`)

Seuil : `max-width: 720px` (sous le minimum des 3 colonnes).

```css
@media (max-width: 720px) {
  html, body { overflow-y: auto; overflow-x: hidden; }
  .game {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    grid-template-areas:
      "header"
      "center"   /* combat en 1er */
      "left"     /* caserne */
      "right"    /* reliques */
      "actives";
    height: auto;
    min-height: 100vh;
  }
  .combat { min-height: 58vh; }            /* combat exploitable */
  .panel { overflow-y: visible; }          /* la page scrolle, pas les panneaux */
  .relic-inventory { overflow-y: visible; flex: none; }  /* idem inventaire */
  .title { font-size: 1.25rem; }           /* header tient sur 375px */
  .resources { gap: 12px; }
  .resource .value { min-width: 0; }
}
```

> Le breakpoint cible tablette-portrait/phone. Tablette paysage (≥ 768px large) garde la grille desktop — acceptable (les panneaux 280px tiennent dès ~720px+).

## Étapes
1. Ajouter la media query dans `src/app.css`.
2. **Vérif mobile** (preview_resize mobile 375 + tablet 768) : une colonne, ordre correct, pas de débordement horizontal, actifs atteignables, combat visible, header lisible. Screenshot.
3. **Vérif desktop** (1280) : grille 3 colonnes intacte (non-régression).
4. Commit (branche `claude/us-8-mobile-responsive`), review, compound (ajouter « tester en mobile » à la routine de vérif).

## Hors scope
- Refonte visuelle mobile (tailles de sprites, ergonomie tactile fine) — on vise jouable + lisible.
- Onglets / tiroirs (option écartée au profit de la colonne unique).
- Orientation paysage spécifique sur téléphone.

## Gotchas
- **`overflow: hidden` sur `html,body`** (ligne ~25) : doit devenir `overflow-y: auto` **uniquement** sous le seuil, sinon le desktop scrollerait. Garder `overflow-x: hidden` pour éviter tout débordement latéral résiduel.
- **`.combat` background `cover`** : sur un combat haut et étroit, le sprite forêt reste correct (cover). Vérifier visuellement.
- **`height: 100vh` → `auto`** sur `.game` en mobile : sinon les sections sont compressées dans 100vh au lieu de s'empiler.
- **Tester les DEUX** : mobile (375) ET desktop (1280) dans la même passe — c'est une régression desktop facile à introduire.

## Sources
- Patterns : [docs/solutions/patterns/idle-game-tick-and-popups.md](../solutions/patterns/idle-game-tick-and-popups.md)
- Code : [src/app.css](../../src/app.css) (`.game` ~34-44, `html,body` ~17-26)
