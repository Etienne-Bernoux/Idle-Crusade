---
title: "feat: US 24 — Chaque troupe a un rôle, pas seulement plus de dps"
type: feat
status: completed
date: 2026-07-28
---

# US 24 — Quatre troupes, quatre rôles

Retour d'Etienne : « les 4 troupes sont de plus en plus fortes mais font la même chose ». Exact —
seuls `dps` et `baseCost` les distinguaient. Monter en tier était « plus fort », jamais « autre chose ».

## Les rôles

| | Tier | Rôle | Effet | Seuil | Plafond |
|---|---|---|---|---|---|
| 🌾 | Paysan | **Marée humaine** | +1 pt de critique | tous les 25 | +25 (625 paysans) |
| ⚔️ | Soldat | **Discipline** | +1% de dégâts à toute l'armée | tous les 5 | +50% (250 soldats) |
| 🐎 | Chevalier | **Charge** | +1 pt de pénétration d'armure | par unité | 40 (40 chevaliers) |
| 🛡️ | Champion | **Étendard** | +0,25 au multiplicateur de critique | par unité | +3 (12 champions) |

Chaque rôle a un **seuil** (la progression se voit arriver) et un **plafond** (aucun ne peut casser le
jeu) — les deux sont testés, y compris l'atteignabilité réelle des plafonds.

**La pénétration d'armure est un concept neuf** dans `combat.js` : elle retire des points d'armure
avant calcul, sans jamais la rendre négative. Distincte de `ignoreArmor` (actif Percée et critiques),
qui annule tout.

## Ce que ça change au jeu

Les rôles créent des **synergies entre tiers**, pas des silos : les paysans donnent la *fréquence* des
critiques, les champions leur *puissance*. Ni l'un ni l'autre ne vaut autant seul.

Mesuré sur un boss à 55% d'armure, type Démon :

| Composition | dps nominal | sans rôles | avec rôles | gain |
|---|---|---|---|---|
| tout paysans (600) | 1 200 | 785 | 1 519 | ×1,94 |
| tout soldats (150) | 1 800 | 1 177 | 1 530 | ×1,30 |
| tout chevaliers (45) | 6 750 | 6 622 | 10 348 | ×1,56 |
| **mixte pensé** (300/80/25) | 5 310 | 4 699 | 9 668 | **×2,06** |
| **mixte + 8 champions** | 21 310 | 20 395 | 56 432 | **×2,77** |

Le gain va à qui **compose** : empiler un seul tier ne rapporte que ×1,30 à ×1,94, un mixte réfléchi
×2,06, et la synergie crit-chance × crit-multiplicateur ×2,77.

## Équilibre : pas de recalibrage

Premier run mesuré : **22:18** contre 25:56 avant (−14%). Ce gain vient de ce que la politique du
simulateur compose bien (elle achète au meilleur ratio, ce qui produit un mixte). Un joueur qui empile
un seul tier reste au niveau d'avant. Le gain récompense donc la décision, ce qui était l'objectif —
aucun paramètre n'a été retouché.

## Lisibilité

Chaque carte de troupe affiche son rôle, sa valeur actuelle (« +12 pts de pénétration ») ou ce qui
manque au prochain palier (« encore 7 »). Sans cette seconde ligne, un rôle à seuil est invisible entre
deux paliers.

L'ennemi affiche son **armure effective** et ce qui a été percé : « 🛡️ 23% (−12 percés) ». Le HUD
montre chance ET multiplicateur de critique (« 12% ×5 »), puisque les deux sont désormais pilotables.

## Critères d'acceptation

- [x] **CA1** Un rôle par tier, quatre effets distincts (test).
- [x] **CA2** Chaque rôle a un seuil et un plafond, tous deux testés.
- [x] **CA3** Les plafonds sont atteignables en pratique, pas décoratifs.
- [x] **CA4** La pénétration réduit l'armure sans la rendre négative ; un critique reste supérieur.
- [x] **CA5** Les rôles créent des synergies mesurables entre tiers.
- [x] **CA6** Le simulateur en tient compte ; l'écart de puissance est justifié par la composition.
- [x] **CA7** UI : rôle, valeur et progression par troupe ; armure percée visible ; crit complet au HUD.
- [x] **CA8** `npm test` vert (208), build OK, tout vérifié au navigateur.
