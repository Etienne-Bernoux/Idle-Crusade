---
title: "feat: US 19 — L'Arbre de Gloire devient un vrai arbre"
type: feat
status: completed
date: 2026-07-27
---

# US 19 — Un arbre, pas quatre listes

Retour d'Etienne, justifié : l'« Arbre » d'US 16 était quatre **colonnes linéaires** côte à côte.
`requirementOf()` renvoyait **un** parent unique, donc quatre chaînes sans aucune ramification. Rien
n'y fourchait, rien n'y convergeait.

## La topologie

```
                    [ COURONNE ]              exige les 4 apex
                /      |     |     \
            [apex]  [apex] [apex] [apex]      un par branche
               |       |      |      |
            [clé]    [clé]  [clé]  [clé]      exige les DEUX voies
             /  \     /  \   /  \   /  \
           voie voie   …    …   …   …   …     2 voies de 4 nœuds
             \  /     \  /   \  /   \  /
            [tronc]  [tronc][tronc][tronc]    2 nœuds
                \      |      |      /
                    [ RACINE ]                point de départ commun
```

Le changement structurant : `requires` est un **tableau**. D'où :

- **5 fourches** : la racine ouvre les 4 branches, et le haut de chaque tronc se divise en **deux
  voies aux effets différents**. La Guerre se scinde en Voie de la Lame (dégâts bruts) et Voie du Cor
  (actifs) ; la Fortune en Pillage (or) et Intendance (coûts) ; les Reliques en Chance (qualité) et
  Reliquaire (places, fonte) ; la Croisade en Gloire (gain) et Héritage (départ de run). Le joueur
  choisit un **style**, plus seulement un ordre.
- **5 convergences** : chaque clé de voûte exige les deux voies de sa branche, la couronne exige les
  quatre apex.

**50 nœuds, 10 paliers (profondeur 0 → 9), 56 arêtes.**

`isUnlockable` vérifie que **tous** les parents sont acquis — c'est ce qui donne leur sens aux
convergences. Avec une seule voie, une clé de voûte reste verrouillée.

## Le rendu

SVG. La grille du catalogue (`x` centré sur 0, `y` de bas en haut) est projetée en pixels avec l'axe
vertical inversé : la racine en bas, la couronne en haut — l'arbre pousse.

- **Arêtes** : éteintes par défaut, colorées et ombrées quand les deux extrémités sont acquises,
  pointillées vers ce qui est accessible. Le chemin parcouru se lit d'un coup d'œil.
- **Nœuds, quatre états** : acquis (rempli, ✓), finançable (halo pulsant), accessible (cerclé),
  verrouillé (éteint **mais lisible, avec son prix** — il faut pouvoir se projeter dans la suite).
- **Achat en deux temps** : on sélectionne, un panneau montre nom/effet/coût, on confirme. À 750
  Gloire le nœud, un achat au clic direct serait une trappe.
- Un nœud verrouillé affiche le **coût du chemin complet** pour l'atteindre (`costToReach`, qui
  remonte les prérequis en déduisant l'acquis).

**Cadrage à l'ouverture** : le canevas se centre sur la frontière de progression (le nœud acquis le
plus haut). C'est le premier défaut que le navigateur a montré — sans ça on ouvrait sur la couronne,
hors de portée, et la racine restait sous le pli.

Mobile : l'arbre ne se réorganise pas, il se parcourt en scrollant son canevas comme une carte.
Le rétrécir le rendrait illisible.

## Équilibre

Coût total : 8 008 → **7 463** Gloire, donc l'étalonnage d'US 16-18 tient. Plafonds arbre complet :
dégâts ×8,7 · or ×8,4 · Gloire ×5,8 · reliques ×5, verrouillés par tests.

Courbe (`node scripts/simulate.mjs 14 7`) : 1 h 36 → 47:17 (×0,49) → 36:06 → 26:55 → 24:42 → 12:32 →
4:57 → … → 1:32 au cycle 14.

**Bug trouvé par la mesure** : la politique d'investissement du simulateur itérait sur
`BRANCHES.flatMap(branchNodes)`, ce qui excluait la **racine** (branche `null`). L'arbre ne se
remplissait plus et tous les cycles restaient à 1 h 36. Corrigé en itérant sur `TREE`.

## Migration (save v3)

Les ids ont changé (`guerre-1` → `guerre-tronc1`, `guerre-lame3`…). On **rembourse** la Gloire
dépensée, le joueur replace où il veut. Un Champion débloqué le reste : on accorde tout le chemin
jusqu'au Serment, **les deux voies comprises** puisque la clé les exige. Un test vérifie qu'aucun nœud
n'est accordé sans ses prérequis.

## Critères d'acceptation

- [x] **CA1** `requires` est un tableau ; le graphe est acyclique et atteignable depuis la racine.
- [x] **CA2** 5 fourches et 5 convergences vérifiées par tests, pas par capture d'écran.
- [x] **CA3** Une clé de voûte est inachetable avec une seule voie.
- [x] **CA4** Rendu SVG avec arêtes diagonales, quatre états de nœud, keystones distincts.
- [x] **CA5** Achat en deux temps ; un nœud verrouillé annonce le coût du chemin.
- [x] **CA6** Le canevas s'ouvre sur la frontière de progression.
- [x] **CA7** Save v3 : remboursement, Champion préservé avec ses prérequis.
- [x] **CA8** Coût total et plafonds dans les ordres de grandeur d'US 16-18.
- [x] **CA9** `npm test` vert, build OK, desktop + 375 px vérifiés au navigateur.
