---
title: "feat: US 18 — Zones sans fin (cycles de profondeur) + Échos"
type: feat
status: completed
date: 2026-07-27
---

# US 18 — Le jeu n'a plus de fin

Jusqu'ici l'Enfer était un mur : son boss rebouclait sur lui-même et la partie se terminait de fait
après quelques Croisades. C'est la limite qu'US 15 avait chiffrée et qu'US 16 n'avait fait que
repousser.

## Structure : des thèmes qui rebouclent en profondeur

Les 5 zones écrites à la main deviennent des **thèmes**. Au-delà de la 5ᵉ, on reboucle en montant d'un
**cycle** : zone 6 = « Forêt Sombre II », zone 10 = « Enfer II », zone 11 = « Forêt Sombre III »… Le
contenu (mobs, boss, décor) est réutilisé, seules les valeurs sont mises à l'échelle.

Pourquoi ce découpage plutôt qu'une génération libre : un thème est déjà l'unité que le joueur
reconnaît (« je suis dans les Ruines »), et c'est **exactement la maille d'un futur regroupement en
biomes** — un biome = un thème, un cycle = une profondeur (cf. § Suite).

**Facteur d'échelle : ×7,1 par zone**, relevé sur la progression écrite à la main (700 → 5 000 →
35 000 → 250 000 → 1 800 000, soit ×7,1 constant). Un cycle complet vaut donc ×7,1⁵. Un test vérifie
qu'**aucune marche** n'apparaît entre zones consécutives, y compris au passage de cycle (5 → 6 = ×7,02).

## Deux problèmes que la mesure a imposé de résoudre

### 1. Les zones profondes auraient été du contenu mort

Mesuré au simulateur, arbre vide :

| Sortie | Temps | Gloire | Rendement |
|---|---|---|---|
| zone 5 | 28 min | 83 | 2,93 /min |
| zone 6 | 47 min | 89 | 1,89 /min |
| zone 7 | 97 min | 95 | 0,98 /min |
| zone 8 | 221 min | 102 | 0,46 /min |

Le temps explose (×1,7 à ×2,3 par zone) alors que la Gloire, calculée sur les **vagues**, ne croît que
linéairement. **Aucun joueur n'aurait quitté la zone 5.**

Correctif : un **bonus de profondeur** entre dans le gain, sous la racine —
`gloire = √(vagues × 100 × 4^(zone_max − 5))`, soit ×2 de gain par zone au-delà du minimum de Croisade,
ce qui compense le surcoût de temps mesuré.

Sous la racine et pas en facteur direct : à ×2 en facteur, un joueur profond gagnerait 85 000 Gloire
par run et remplirait l'Arbre entier (8 008) d'un seul coup. Sous la racine, **la profondeur devient
rentable quand on est assez fort pour la traverser vite** — la dynamique qu'on veut d'un idle.

Résultat : la profondeur optimale suit la puissance, sans réponse unique.

| Arbre | zone 5 | 6 | 7 | 8 | 9 | 10 | optimal |
|---|---|---|---|---|---|---|---|
| vide | 3 | 4 | 4 | 4 | 3 | 3 | zone 7 |
| tier 4 | 10 | 12 | 11 | 11 | 9 | 7 | zone 6 |
| tier 7 | 57 | 72 | 91 | 96 | 98 | 86 | zone 9 |
| tier 10 | 449 | 698 | 880 | 1026 | 1081 | 920 | zone 9 |

### 2. L'Arbre était un puits fini

Avec des zones sans fin, un joueur profond gagne plus que **l'Arbre entier** (2 002 par branche,
8 008 au total) en un seul run : plus rien à acheter, et le plateau qu'on venait de supprimer revient.

Correctif : les **Échos**. Une branche entièrement acquise ouvre son Écho, achetable **indéfiniment** —
+25% additifs sur la stat que la branche développe déjà, coût ×1,5 par niveau. Effet modeste, coût
géométrique : c'est un déversoir de fin de partie, pas un raccourci pour sauter les paliers.

## Affichage : les grands nombres

Au cycle 4, un boss dépasse 10¹⁵ PV. DESIGN.md classe en anti-pattern « une courbe qui rend le
late-game illisible (10²⁰+) ». `formatNumber()` abrège désormais au-delà du million : `1,8 M`,
`228 Md`, `4,1 P`, puis `1,2×10^30` quand les suffixes sont épuisés. Un test vérifie qu'**aucune valeur
affichée ne dépasse 12 caractères** sur 30 cycles de profondeur.

## Le moment fort remplace la fin de partie

`triggerVictory()` (l'écran « ENFER VAINCUES », devenu inatteignable) devient
`triggerDepthMilestone()` : entrer dans un nouveau cycle affiche **« ⚔ PROFONDEUR II ⚔ »**. Même
mécanique d'`invocationId`, nouveau sens.

## Courbe finale (`node scripts/simulate.mjs 16 7`, sortie zone 7)

1 h 36 → 44:27 (**×0,46**) → 40:34 → 12:38 → 7:40 → 6:42 → 5:18 → 2:29 → … → 1:59 au cycle 16.
Gloire gagnée : 383 → 2 757, toujours croissante. Après le cycle 10 l'Arbre est complet et les **Échos
prennent le relais** (⚔10+3).

Le premier run à **1 h 36** approche enfin la cible d'~1 h de DESIGN.md — parce que viser la zone 7
est désormais un choix raisonnable, ce qui n'existait pas avant.

## Suite : donjons et biomes

La structure posée ici est le socle de la hiérarchie envisagée :

- **thème** (Forêt, Ruines, Château, Cathédrale, Enfer) → devient le **biome**
- **cycle** (I, II, III…) → devient la **profondeur de donjon**
- **zone** (numéro global) → devient le **niveau** dans le donjon

Ce qu'il faudra faire à ce moment-là, et qui n'a **pas** été anticipé ici (YAGNI) : un catalogue de
biomes dont les thèmes actuels sont les cinq premières entrées, un déblocage par biome (aujourd'hui la
progression est une droite), et une UI de sélection. `zoneAt(n)` restera le point d'entrée : il
suffira qu'il consulte le biome courant au lieu de la seule table des thèmes.

## Critères d'acceptation

- [x] **CA1** `zoneAt(n)` répond pour tout n ; le premier cycle est l'identité.
- [x] **CA2** Aucune marche de difficulté entre zones consécutives (test sur 20 zones).
- [x] **CA3** L'or suit les PV : le ratio récompense/difficulté reste constant.
- [x] **CA4** Le jeu ne se termine plus ; un nouveau cycle affiche un jalon de profondeur.
- [x] **CA5** La profondeur rapporte de la Gloire, sans permettre de remplir l'Arbre d'un run.
- [x] **CA6** Échos : ouverts par une branche complète, achetables sans limite, coût croissant.
- [x] **CA7** Les grands nombres restent lisibles (≤ 12 caractères) sur 30 cycles.
- [x] **CA8** Persistance des Échos ; save antérieure sans le champ tolérée.
- [x] **CA9** `npm test` vert, build OK, traversée vérifiée jusqu'à « Ruines II » au navigateur.
