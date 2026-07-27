---
title: "feat: US 16 — Arbre de Gloire (4 branches × 10 paliers)"
type: feat
status: completed
date: 2026-07-27
---

# US 16 — L'Arbre de Gloire remplace la Forge

La Forge était une liste plate de 6 upgrades bornées : une fois les cinq premières maxées, la Gloire
n'avait plus d'emploi et le prestige perdait son sens (plateau mesuré en US 15). On la remplace par un
**arbre de 40 paliers** réparti en 4 branches de 10.

## Décisions de structure

- **Chaque branche est une chaîne** : le palier N exige le palier N-1 de la même branche, rien d'autre.
  Le choix du joueur n'est donc pas « quel nœud » mais « quelle branche je pousse en premier ». C'est
  ce qui garde l'écran lisible pour un joueur de 5 ans tout en offrant 40 paliers.
- **Barème unique pour les 4 branches** : `5, 12, 25, 45, 75, 120, 190, 300, 480, 750`. Comparer deux
  branches ne demande aucun calcul mental, et pousser une branche à fond (2 002 Gloire) coûte plus que
  monter les trois autres au palier 5 (3 × 162) — la profondeur est un choix, pas un passage obligé.
- **Les `%` s'additionnent, les keystones se multiplient.** `Fureur I..IV` donnent +190% cumulés, puis
  `Croisade Sanglante` applique un ×2 par-dessus. Un arbre complet plafonne à ×5,8 dégâts — un test
  verrouille ce garde-fou anti-inflation.
- **Les réductions ont un plancher à 25%** : arbre complet, recruter et les cooldowns gardent un coût.

## Les 4 branches

| | Branche | Rôle | Keystones |
|---|---|---|---|
| ⚔ | **Guerre** | frapper plus fort, actifs plus souvent | Serment du Champion (tier 6), Dégâts ×2 (10) |
| 🪙 | **Fortune** | or et coût de recrutement | Forge Rentable (6), Trésor de Guerre (9), Or ×2 (10) |
| 💎 | **Reliques** | qualité, places, puissance du butin | Reliquaire (6), Effets ×2 (10) |
| 🏆 | **Croisade** | rendre les prestiges suivants plus rentables | Garnison (4), Armée Permanente (8), Gloire ×2 (10) |

La branche **Croisade répare le plateau identifié en US 15** : elle fait croître le gain de Gloire
(+185% cumulés, puis ×2), donc la boucle s'auto-alimente au lieu de s'éteindre.

## Deux corrections trouvées par la mesure

**1. Un nœud qui rendait le joueur plus faible.** Le design initial offrait des zones déjà conquises
(« Mémoire des Terres », `startZone`). Mesuré au simulateur : le cycle **rallongeait** (×1.12).
Démarrer en zone 3 avec 35 paysans, c'est affronter des mobs à 3 000 PV **sans les revenus** des
zones sautées — les premières zones sont un tutoriel économique rentable, pas une corvée. Et le gain
de Gloire, calculé sur les vagues, baissait en prime (161 → 144).

Remplacé par de **gros paquets de paysans** (`Garnison` +40, `Armée Permanente` +150) : le joueur
retraverse le début très vite **en récoltant l'or**. Effet strictement positif, aucun piège.

**2. Un bug de migration à Gloire infinie.** La save v1 (`metaLevels`) est migrée vers `treeNodes` à
chaque chargement, mais rien ne réécrivait le `localStorage` — l'ancien format restait en place et le
**remboursement se rejouait à chaque rechargement**. Vérifié dans le navigateur : la Gloire passait de
37 à 67 à 97 en rechargeant. `migrate()` pose désormais un drapeau `migrated` et `onMount` réécrit la
save immédiatement. Test : le drapeau ne fuit jamais dans le fichier écrit.

## Migration depuis la Forge

On **rembourse la Gloire dépensée** (respec offert) plutôt que d'inventer une équivalence nœud par
nœud. Exception : si le Champion était débloqué, on **accorde** la branche Guerre jusqu'au Serment,
prérequis compris — sinon la migration retirerait un tier de troupe déjà acquis.

## Courbe mesurée (`node scripts/simulate.mjs 20`)

31 min → 20:34 (**×0.66**) → 18:49 → 13:44 → 12:45 → 12:21 → **5:01** (Serment du Champion) → … →
**2:58** au cycle 20. Gain de Gloire : 83 → 174. Aucun cycle ne rallonge.

Réserve honnête : le simulateur ne modélise pas les reliques, il **sous-estime donc la branche
Reliques**. Sa politique de dépense ne l'achète que faute de mieux.

## Critères d'acceptation

- [x] **CA1** 40 nœuds, 4 branches de 10, ids uniques, chaîne de prérequis testée.
- [x] **CA2** Achat : débit de Gloire, nœud acquis, palier suivant ouvert, pur (pas de mutation).
- [x] **CA3** Tous les effets câblés : dégâts, or, coût, cooldown, durée du Cri, qualité, effets et
      places de reliques, fonte, Gloire, départ de run, Champion.
- [x] **CA4** Save v2 + migration depuis `metaLevels`, réécrite immédiatement.
- [x] **CA5** UI : 4 colonnes en desktop, onglets de branche en mobile, liens qui se remplissent.
- [x] **CA6** Un nœud verrouillé reste lisible et montre son prix (le joueur doit pouvoir se projeter).
- [x] **CA7** Garde-fous d'équilibrage testés (plafonds, planchers de réduction).
- [x] **CA8** `npm test` vert, build OK, vérification navigateur desktop + 375 px.
