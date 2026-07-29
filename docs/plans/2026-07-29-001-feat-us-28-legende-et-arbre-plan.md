# US 28 — La Légende : casser le mur, et refondre l'Arbre

**Date** : 2026-07-29
**Origine** : session de jeu d'Etienne — « j'ai tout maxé et l'accès à la dernière zone est
impossible », « la forge s'arrête trop tôt », « j'ai 236 000 points à dépenser et rien à acheter ».

## Le diagnostic, mesuré

Ces trois symptômes n'en font qu'un. **Le jeu n'a aucune source de puissance exponentielle.**

| Grandeur | Croissance |
|---|---|
| PV des ennemis | **×7,4 par zone** |
| Or gagné | ×7,4 par zone |
| Troupes achetables (coût en 1,15ⁿ) | **+14 par zone** — linéaire |
| Paliers de troupe (×2 tous les 25) | ~×1,5 par zone |
| Échos, seul puits infini | **+25 % additif** par niveau — linéaire |
| Gloire gagnée | ×2 par zone |

Le contenu croît **×7,4 par zone**, la puissance **×1,5**. L'écart se creuse exponentiellement.

Mur mesuré, tout maxé (arbre complet + 12 échos par branche) :

| zone | durée de la zone seule |
|---|---|
| 12 | 36 s |
| 14 | 14 min |
| 16 | **12 h** |
| 18 | **15 jours** |
| 20 | impossible |

Les Échos étaient censés être le puits de fin de partie (US 18). Ils sont **infinis en coût**
(×1,5 par niveau) mais **bornés en effet** (+25 % additif). D'où les 236 000 Gloire sans emploi :
ce n'est pas qu'il n'y a rien à acheter, c'est que ce qu'il reste à acheter ne sert plus à rien.

> Écarté après calcul : rendre les Échos multiplicatifs. Pour suivre ×7,4 par zone il leur faudrait
> **+220 % par niveau**. Le levier est le mauvais, ce n'est pas une question de réglage.

## Le principe de la correction

**Une monnaie qui croît linéairement avec la profondeur, dont chaque point donne un effet
multiplicatif.** Linéaire × multiplicatif = exponentiel. C'est la pièce manquante.

Prototypé dans le simulateur — 10 points par zone au-delà de la 9, chaque point ×1,25 :

| zone | avant | avec Légende |
|---|---|---|
| 16 | 12 h | **0,2 min** |
| 18 | 15 jours | **0,8 min** |
| 20 | impossible | **3,2 min** |

Le mur tombe. Le réglage prototypé est **trop généreux** au milieu (zones 10 à 16 toutes à 0,2 min,
plus aucune résistance) : à calibrer, avec le même outil.

## Ce qu'on livre

### La Légende — deuxième couche de prestige

- **Déblocage** : avoir atteint la zone 10. Assez tard pour que la Croisade ait été comprise et
  pratiquée, assez tôt pour arriver avant le mur.
- **Gain** : linéaire en profondeur — `max(0, zoneMax - 9) × K`, K à calibrer autour de 10.
- **Reset** : Gloire, Arbre, Échos, zones, troupes, or, améliorations de troupes.
  **Conservé** : les reliques (la collection longue) et le compte de Croisades.
- **Dépense** : un **Panthéon** de voies sans plafond, chaque point donnant un multiplicateur.
  Coût plat (1 point par niveau) : la décision est l'**allocation**, pas l'épargne.

C'est aussi le « changement important de gameplay en milieu de partie » demandé : le joueur
abandonne un arbre qu'il connaît pour une monnaie neuve.

### L'Arbre — de la convergence vers la spécialisation

Retour d'Etienne : *« ton arbre est peu commun, habituellement on part du centre et on s'enfonce
dans des spécialisations »*. C'est juste. La forme actuelle est racine → 4 branches → 2 voies →
**clé de voûte qui reconverge** → apex → **couronne unique**. On s'écarte, puis on se rassemble :
la fin du parcours **annule** la spécialisation du milieu.

Cible : on part du centre et on **diverge**, sans jamais reconverger. Les extrémités sont des
identités exclusives, pas un col commun. La couronne disparaît en tant que point de passage.

Refondu en même temps que la Légende : les deux touchent la progression, une seule migration de
save au lieu de deux.

## Découpage

| CP | Contenu | Vérification |
|---|---|---|
| 1 | `src/lib/legende.js` pur + tests : gain, Panthéon, effets agrégés | `npm test` |
| 2 | Calibrage de K et du multiplicateur par point | simulateur, plusieurs graines |
| 3 | Refonte de la topologie de l'Arbre + migration de save | tests + garde-fou d'ids |
| 4 | UI : écran de Légende, Panthéon, compteur | **navigateur obligatoire** |
| 5 | Rééquilibrage global et mise à jour de `DESIGN.md` | simulateur |

## Hors périmètre

- **Système de succès** (V4-06) : décidé, mais **après** ce déblocage — décorer une impasse n'a pas
  de sens. Idée retenue au passage : que les succès rapportent, pour être un système de progression
  et pas un tableau de bord.
- Le simulateur ne modélise toujours ni les places d'inventaire, ni l'or de fonte, ni la forge et la
  fusion de reliques.

## Risques

- **La migration de save est le vrai danger.** Refondre la topologie change les ids de nœuds ; la
  politique du projet est le remboursement (déjà appliquée en v1→v2 et v2→v3), pas l'équivalence
  nœud à nœud. À refaire ici, avec le test qui va avec.
- **Le calibrage peut trivialiser le milieu de jeu**, comme le prototype l'a montré. La Légende doit
  laisser chaque zone coûter un peu plus que la précédente, pas effacer la résistance.
- **Deux couches de prestige, c'est deux fois plus à comprendre.** L'écran de Légende doit dire ce
  qu'on perd et ce qu'on garde aussi clairement que celui de Croisade.
