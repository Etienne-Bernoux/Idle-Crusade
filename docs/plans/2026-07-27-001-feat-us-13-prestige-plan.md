---
title: "feat: US 13 — Prestige (Croisade, Gloire, Forge)"
type: feat
status: in-progress
date: 2026-07-27
---

# US 13 — Prestige : la Croisade

Ouvre V3. Le joueur qui a battu l'Enfer peut **partir en Croisade** : il reset son run contre des
**Points de Gloire**, monnaie permanente dépensée dans la **Forge de Gloire** (meta-upgrades).
C'est le hook long terme : chaque cycle est plus rapide que le précédent.

Source : `docs/BACKLOG.md` V3-01 → V3-07, formules dans `docs/DESIGN.md` § Prestige.

## Décisions

- **Condition** : avoir battu le boss de la zone 5 au moins une fois dans le run (`zonesCleared >= 5`).
- **Gain** : `floor(sqrt(zonesCleared × 10))` (DESIGN). 5 zones → 7 Gloire.
- **Reset** : Or, troupes recrutées, zone/vague courante, `zonesUnlocked`, `zonesCleared`.
- **Conservé** : Gloire, niveaux de Forge, inventaire de reliques, **et les reliques équipées**.
- **Coût d'upgrade** : `baseCost × (level + 1)²` (DESIGN), quadratique pour décourager le mono-stack.
- **`zonesCleared` est une nouvelle donnée durable** : `zonesUnlocked` ne suffit pas — battre le boss
  de la zone 5 ne débloque aucune zone 6, donc `zonesUnlocked` plafonne à 5 et ne peut pas servir de
  compteur de zones clear.

### Écart 1 — l'upgrade « vitesse d'attaque » est remplacée

DESIGN prévoit `+5% vitesse d'attaque / niveau`. **Non implémentable proprement** : `tickMs` porte un
invariant explicite dans `App.svelte` (« tickMs DOIT rester entier constant, un buff qui le
modifierait corromprait l'horloge » — `lastTickAt += n * tickMs` du catch-up). Et comme le moteur
agrège un DPS unique sans attaques individuelles, un `speedMult` sur les dégâts par tick serait le
**clone mathématique** de l'upgrade `+dégâts` : deux lignes dans la Forge pour un seul effet.

Remplacée par **Intendance : −3% coût de recrutement par niveau** (5 niveaux, −15% max), qui agit sur
la courbe `×1.15^n` — un levier réellement distinct, et lisible pour un joueur de 5 ans (« les
paysans coûtent moins cher »). Réversible : si tu préfères la vitesse, il faudra d'abord lever
l'invariant de `tickMs` (recréer l'interval sur changement).

### Écart 2 — les reliques équipées restent équipées

`SPEC.md` dit « reset : … Reliques équipées (pas l'inventaire) ». Déséquiper au prestige n'enlève
rien au joueur (il ré-équipe aussitôt depuis l'inventaire conservé) : c'est 4 clics de friction pure,
soit l'anti-pattern « UI qui demande de cliquer pour progresser » listé dans DESIGN. On conserve
l'équipement.

## La Forge de Gloire (6 upgrades)

| id | Nom | Effet / niveau | Niveaux | Coût base |
|---|---|---|---|---|
| `fureur` | Fureur | +10% dégâts | 5 | 5 |
| `butin` | Butin | +10% Or | 5 | 5 |
| `intendance` | Intendance | −3% coût de recrutement | 5 | 8 |
| `discipline` | Discipline | −5% cooldown des actifs | 3 | 12 |
| `fortune` | Fortune | +qualité des drops | 3 | 15 |
| `champion` | Serment du Champion | débloque le tier Champion | 1 | 50 |

Effets **multiplicatifs entre upgrades, additifs au sein d'une upgrade** (DESIGN).

`fortune` déplace les poids de rareté de 70/25/5 (niv. 0) vers 40/45/15 (niv. 3), par interpolation
linéaire — les bornes viennent de DESIGN § Drop rate.

Le déblocage du Champion reste **une donnée, pas une branche** (convention du repo) : `unlockZone: 1`
+ un champ `requiresMeta: 'champion'` sur le tier, et le dérivé compare `metaLevels.champion > 0`.

## Critères d'acceptation

- [ ] **CA1** `src/lib/prestige.js` pur + testé : `gloireGain`, `upgradeCost`, `metaEffects`, `rarityWeights`.
- [ ] **CA2** Gloire et « Croisade #N » affichées en HUD depuis le state réel (le HUD affiche `12` en dur aujourd'hui).
- [ ] **CA3** Bouton Croisade visible/actif seulement si `zonesCleared >= 5` ; sinon il indique ce qui manque.
- [ ] **CA4** Écran de prestige : preview du gain, ce qui est perdu / gardé, confirmation explicite (pas de reset au premier clic).
- [ ] **CA5** Après Croisade : or 0, troupes 0, zone 1 vague 1, Gloire créditée, compteur incrémenté, inventaire + équipement intacts.
- [ ] **CA6** Forge : achat d'un niveau débite la Gloire, incrémente le niveau, applique l'effet immédiatement ; bouton grisé si Gloire insuffisante ou niveau max.
- [ ] **CA7** Save : `gloire`, `metaLevels`, `prestigeCount`, `zonesCleared` persistés ; une save V2 (sans ces champs) se charge sans casser.
- [ ] **CA8** Champion recrutable seulement après l'achat du Serment.
- [ ] **CA9** Desktop + mobile 375 px sans débordement ; `npm test` vert ; build OK.

## Étapes

1. **CP1** — `src/lib/prestige.js` + `prestige.test.js` (logique pure, aucun câblage UI).
2. **CP2** — State + save + hydrate + HUD (Gloire, Croisade #N) + `zonesCleared` incrémenté au kill de boss.
3. **CP3** — Application des effets : `fureur`/`butin` sur les dérivés, `intendance` sur `costOf`,
   `discipline` sur le cooldown du Cri, `fortune` sur `rollRelique`, `champion` sur `troopRows`.
4. **CP4** — Bouton + écran de Croisade (overlay, preview, confirmation) et fonction `doPrestige()`.
5. **CP5** — Panneau Forge de Gloire (achat des niveaux).
6. **CP6** — Vérification navigateur (parcours complet jusqu'au prestige, desktop + mobile), équilibrage de sanity.

## Risques

- **Le premier prestige est censé tomber vers 1 h** (DESIGN). Les PV de zones ont dérivé à la hausse
  depuis le cadrage : le vrai étalonnage est le ticket V3-06, hors périmètre de cette US. On vérifie
  seulement l'absence de soft-lock.
- Reset partiel raté = perte de save joueur. Mitigation : `doPrestige()` reconstruit un état par
  défaut explicite champ par champ (pas de mutation sélective), puis `saveNow` immédiat.
