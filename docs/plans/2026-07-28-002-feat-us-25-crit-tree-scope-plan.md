---
title: "feat: US 25 — Critiques dans l'Arbre, et séparation in-run / inter-run"
type: feat
status: completed
date: 2026-07-28
---

# US 25 — Deux systèmes, deux rôles

Deux retours d'Etienne, liés :

1. « C'est dommage de mettre au même niveau l'amélioration in-run et l'amélioration entre les runs. »
2. « Ce serait bien de transformer l'arbre pour pouvoir améliorer les crits. »

## Le recouvrement, et sa correction

Les améliorations en or comptaient quatre lignes, dont deux **transverses** : « Bannière » (+10% de
dégâts à toutes les troupes) et « Pillage » (+15% d'or). C'est exactement ce que fait l'Arbre de
Gloire — deux systèmes au même niveau de lecture, l'un temporaire et l'autre permanent, avec les mêmes
effets. Elles sont retirées.

Le partage est désormais net, et **annoncé dans chaque modale** :

| | Payé en | Portée | Survie |
|---|---|---|---|
| 🏰 **Arbre de Gloire** | Gloire | effets **globaux** et structurels | conservé à jamais |
| ⚒ **Améliorer les troupes** | or | **propre à un tier** | remis à zéro par la Croisade |

Un test verrouille l'invariant : plus aucune ligne payée en or n'a d'effet transverse.

À leur place, une ligne neuve : **📖 Doctrine** (3 niveaux, ×1,5 par niveau) qui amplifie le **rôle**
du tier (US 24) — le seul levier du jeu qui touche les rôles. Renforcer ses paysans en Doctrine, c'est
choisir de faire de la chance de critique sa stratégie *pour ce run*.

La Doctrine amplifie l'apport **et le plafond** du rôle : sans ça elle n'aurait aucun effet sur un rôle
déjà au maximum, donc aucun intérêt en fin de run.

## Les critiques entrent dans l'Arbre

L'Arbre n'avait **aucun** levier sur les critiques, alors qu'ils sont au cœur du combat depuis US 22 et
des rôles depuis US 24. La **Voie du Cor** de la branche Guerre devient la **Voie de la Précision** :

| Palier | Nœud | Effet |
|---|---|---|
| 3 | Précision | +5 pts de critique |
| 4 | Souffle Court | −15% cooldown des actifs |
| 5 | Œil Aiguisé | +7 pts de critique |
| 6 | Coup Fatal | **+1 au multiplicateur de critique** |

Elle reste la voie « technicienne » de la branche : elle garde le cooldown des actifs.

Et dans la branche Reliques, « Bénédiction III » (+30% d'effets) laisse la place à **Main Chanceuse**
(+6 pts de critique) — thématiquement à sa place dans la Voie de la Chance.

Arbre complet : **+18 points de critique et +1 au multiplicateur**. Deux tests bornent l'ensemble
(≤ 30 points, ≤ +3 au multiplicateur) : un critique doit rester un **événement**, pas la norme.

Conséquence assumée : plus aucun nœud ne fournit de durée de Cri, donc `warCryDurationMult` disparaît
de `treeEffects` — le laisser exposé serait du code mort. Le seul levier de durée restant est la règle
de biome « Bain de Sang ». Un test vérifie que la sortie a bien disparu.

## Équilibre

Premier run **22:18**, identique à US 24 : les points de critique gagnés dans l'Arbre compensent les
+10% de dégâts et +15% d'or perdus avec Bannière et Pillage. Aucun réétalonnage.

Mesuré au navigateur : la Voie de la Précision complète fait passer le critique de **12% ×3 à 24% ×4**.
Deux niveaux de Doctrine sur les paysans portent leur rôle de **+4 à +9 points de critique**.

## Compatibilité des saves

`sanitizeTroopUpgrades` filtre sur le catalogue courant : une save contenant les anciennes lignes
`banniere`/`pillage` les ignore silencieusement, sans effet résiduel — vérifié au navigateur. Les ids de
l'Arbre changent (`guerre-cor*` → `guerre-precision*`), et la migration de save existante s'en charge
déjà par remboursement.

## Critères d'acceptation

- [x] **CA1** Plus aucune amélioration en or n'a d'effet transverse (test).
- [x] **CA2** La Doctrine amplifie le rôle du tier, et lui seul.
- [x] **CA3** La Doctrine amplifie aussi le plafond du rôle.
- [x] **CA4** L'Arbre pilote la fréquence ET la puissance des critiques.
- [x] **CA5** Les gains de critique de l'Arbre sont bornés par test.
- [x] **CA6** `warCryDurationMult` retiré : plus aucun nœud ne le fournit.
- [x] **CA7** Chaque modale annonce sa portée et sa survie au prestige.
- [x] **CA8** Une save contenant les lignes retirées se charge sans effet résiduel.
- [x] **CA9** `npm test` vert (214), build OK, équilibre inchangé (22:18).
