---
title: "feat: US 14 — Achat en lot (×1 / ×10 / MAX)"
type: feat
status: in-progress
date: 2026-07-27
---

# US 14 — Recruter par lots

Ticket **V1-13** du backlog, resté ouvert depuis V1. Devenu urgent avec l'arrivée du prestige (US 13) :
chaque Croisade remet les troupes à zéro, et re-recruter 40 paysans à un clic par unité est le genre
de friction que DESIGN.md classe en anti-pattern (« une UI qui demande de cliquer toutes les 10 s »).

## Décisions

- Trois modes : **×1**, **×10**, **MAX**. Sélecteur en tête du panneau Caserne, un seul actif.
- **×10 = tout ou rien** (convention du genre — Cookie Clicker, Realm Grinder) : si les 10 ne sont pas
  finançables, la carte est insolvable, on n'achète pas 7 unités par surprise. **MAX** achète autant
  que l'or le permet.
- Le mode est **persisté dans la save** : c'est une préférence, la redemander à chaque session serait
  la même friction qu'on est en train de supprimer.
- La carte de troupe affiche le **coût du lot** et la quantité réellement achetable en MAX
  (`×7 · 🪙 1 200`), pas le coût unitaire — sinon le prix affiché mentirait sur ce que fait le clic.

## Décision technique — la formule de coût sort d'App.svelte

`costOf()` vit aujourd'hui dans `App.svelte` et **n'est couverte par aucun test**, alors que c'est la
formule la plus structurante de l'économie. Elle part dans un module pur `src/lib/economy.js` avec ses
variantes de lot, et devient testable.

**Le coût d'un lot est la somme des coûts unitaires arrondis**, pas l'arrondi de la somme
géométrique : `costOf` fait déjà `Math.floor(base × 1.15^owned × costMult)` par unité, et
`Σ floor(x) ≠ floor(Σ x)`. Une formule fermée décalerait le prix du lot de quelques pièces par
rapport à N achats unitaires — un joueur qui compare se ferait avoir. On somme donc en boucle : le
coût croît en `1.15^n`, donc `n` reste logarithmique en or disponible (or ≈ 10¹² → n ≈ 175 tours),
c'est gratuit.

## Critères d'acceptation

- [ ] **CA1** `src/lib/economy.js` pur et testé : `unitCost`, `bulkCost`, `maxAffordable`.
- [ ] **CA2** `bulkCost(base, owned, n)` égale exactement la somme de `n` achats unitaires successifs.
- [ ] **CA3** Sélecteur ×1 / ×10 / MAX dans la Caserne, mode actif visuellement distinct.
- [ ] **CA4** ×10 achète 10 unités et débite le coût du lot ; insolvable si les 10 ne sont pas payables.
- [ ] **CA5** MAX achète le maximum finançable, et rien (carte insolvable) si même 1 unité est hors budget.
- [ ] **CA6** Le coût affiché correspond au lot ; en MAX la quantité achetable est indiquée.
- [ ] **CA7** L'Intendance (Forge) réduit le coût du lot comme celui de l'unité.
- [ ] **CA8** Le mode survit à un reload ; une save sans le champ démarre en ×1.
- [ ] **CA9** `npm test` vert, build OK, desktop + mobile 375 px sans débordement.

## Étapes

1. **CP1** — `src/lib/economy.js` + tests ; `App.svelte` consomme le module (comportement ×1 inchangé).
2. **CP2** — State `buyMode` + persistance + sélecteur UI + affichage du coût de lot.
3. **CP3** — Vérification navigateur : les 3 modes, l'insolvabilité, l'Intendance, le reload, le mobile.
