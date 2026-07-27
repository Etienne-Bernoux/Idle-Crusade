---
title: "feat: US 21 — Chaque biome a son monde et sa règle"
type: feat
status: completed
date: 2026-07-27
---

# US 21 — Des biomes, pas des paliers

Retour d'Etienne : les biomes d'US 20 partageaient le même contenu, ils n'étaient que des curseurs de
difficulté. Chacun apporte désormais **son monde** et **une règle qui change la façon de jouer**.

## 1. Un bestiaire par biome

Cinq mondes de cinq zones, avec leurs noms, leurs ennemis, leurs boss et leurs décors — 150 entrées au
total, zéro réutilisation :

| Biome | Zones |
|---|---|
| 🌿 Terres de Croisade | Forêt Sombre · Ruines · Château Hanté · Cathédrale Profanée · Enfer |
| 🥀 Terres Maudites | Marais Putride · Champ de Potence · Verger Pétrifié · Nécropole Engloutie · Cœur de la Malédiction |
| 🌑 Royaume des Ombres | Seuil du Crépuscule · Galerie des Reflets · Bibliothèque Muette · Théâtre Vide · Nuit Absolue |
| 🩸 Abîme Écarlate | Fleuve Vermeil · Arène des Suppliciés · Forge de Chair · Autel Palpitant · Cœur du Monde |
| 🕳️ Néant | Bord du Monde · Mer de Cendres · Horloge Brisée · Chœur du Vide · Néant Pur |

**Ce qui garantit que la variété ne casse rien : un barème COMMUN.** `ZONE_TEMPLATE` porte toutes les
valeurs (vagues, PV, or) ; les bestiaires ne portent que des noms et des visuels. Un biome ne *peut
pas* devenir accidentellement plus dur ou plus rentable que sa fiche ne l'annonce — un test compare les
cinq biomes valeur par valeur.

## 2. Une règle signature par biome

Chaque règle a un **contrepoids** : rien n'est gratuit. Et chacune n'utilise que des leviers **déjà
présents** dans la boucle de jeu, donc aucune mécanique de combat neuve ne peut dériver en silence.

| Biome | Règle | Effet | Contrepoids |
|---|---|---|---|
| 🥀 | **Profusion** | 2 reliques par boss | +50% de vagues par zone |
| 🌑 | **Disette** | reliques deux crans plus rares | or divisé par 2 |
| 🩸 | **Bain de Sang** | Cri de Guerre ×2 en durée, ÷2 en cooldown | recrutement au double du prix |
| 🕳️ | **Vacuité** | Gloire majorée de moitié | plus aucune relique |

`biomeEffects()` est la **porte de sortie unique** : toute règle absente y prend un défaut neutre,
aucune valeur par défaut ne se disperse dans `App.svelte`. Trois tests verrouillent l'ensemble : chaque
biome change au moins un levier de jeu, chaque règle a un contrepoids, et aucune signature n'est en
double.

**Disette a demandé d'étendre les paliers de rareté.** L'Arbre plafonne à 3 crans (40/45/15) ; la table
va maintenant jusqu'à 5 (25/50/25), les deux derniers n'étant atteignables **que** par ce biome. Sans
ça, la règle n'aurait rien fait pour un joueur ayant déjà maxé la branche Reliques.

## Mesure : les biomes se jouent-ils différemment ?

Même arbre (6 nœuds par branche), sortie zone 5 :

| Biome | Durée | Vagues | Or gagné | Gloire | Règle |
|---|---|---|---|---|---|
| 🌿 | 5 min | 70 | 1,6 M | +199 | — |
| 🥀 | 19 min | **105** | 4,1 M | +538 | Profusion |
| 🌑 | 74 min | 70 | 3,9 M *(bridé)* | +478 | Disette |
| 🩸 | 201 min | 70 | 16,9 M | +2 091 | Bain de Sang |
| 🕳️ | 468 min | 70 | 37,0 M | +4 581 | Vacuité |

Les profils diffèrent réellement : Profusion allonge le run et double le butin, Disette rapporte moins
d'or que son palier ne le voudrait (÷2 visible dans la colonne), Vacuité pousse la Gloire.

Progression cumulée sur 12 Croisades, inchangée par rapport à US 20 :

| Stratégie | Temps de jeu | Arbre atteint | Gloire cumulée |
|---|---|---|---|
| Rester en 🌿 | 160 min | 28/50 | 1 520 |
| Monter dès que possible | 291 min | 45/50 | 5 260 |

L'arbitrage tient : monter coûte du temps et rapporte de la progression, et rester dans le premier
biome empêche toujours de finir l'Arbre.

## Deux bugs, tous deux des dépendances invisibles pour Svelte

1. **`Cannot access 'biome' before initialization`** — `zoneOf()` lit `biome` pour choisir le bestiaire,
   et il est appelé dès l'initialisation de `enemy`. La déclaration de `biome` a été remontée avant le
   reste du state, avec un commentaire qui dit pourquoi elle ne doit pas redescendre.
2. **Le nom de zone et le nombre de vagues restaient ceux du biome précédent** alors que les ennemis
   changeaient bien. `zoneOf(n)` lisait `biome` dans son corps : Svelte ne voyait pas la dépendance et
   ne recalculait jamais `$: zone`. Les ennemis, eux, étaient corrects parce que `spawnNextEnemy()` est
   appelé impérativement. Corrigé en passant le biome en **argument** (`zoneOf(n, biome)`) — même
   correction qu'en US 17 pour `costOf`/`troopRows`, et même leçon : une dépendance cachée dans une
   fonction est invisible pour le compilateur.

Aucun test unitaire ne pouvait attraper le second : c'est le pilotage navigateur qui l'a montré, en
comparant le nom de zone affiché dans les cinq biomes.

## Critères d'acceptation

- [x] **CA1** 5 bestiaires de 5 zones, aucun nom de zone ni de boss réutilisé.
- [x] **CA2** Barème de valeurs identique dans tous les biomes (test valeur par valeur).
- [x] **CA3** Chaque biome au-delà du premier change au moins un levier de gameplay.
- [x] **CA4** Chaque règle a un contrepoids vérifié par test.
- [x] **CA5** Les cinq signatures de règles sont distinctes.
- [x] **CA6** Les paliers de rareté 4 et 5 n'existent que par la règle Disette.
- [x] **CA7** Les cycles de profondeur fonctionnent dans tous les biomes.
- [x] **CA8** Un biome inconnu retombe sur le bestiaire de départ sans planter.
- [x] **CA9** `npm test` vert (156), build OK, cinq mondes vérifiés au navigateur.
