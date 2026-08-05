# Design — Équilibrage et courbes

> Document vivant. Les chiffres sont des points de départ, à ajuster en V3 (premier équilibrage) puis V4 (polish).

**Écarts constatés entre ce cadrage et le jeu livré** (V2) — le code est la source de vérité :

| Sujet | Cadrage ici | Livré | Verdict |
|---|---|---|---|
| Cri de Guerre — cooldown | 60 s | **25 s** | volontaire (US 10 : 60 s rendait l'actif oubliable), réductible par l'Arbre |
| Potion de Soin | Heal full armée | **retirée (US 23)** | remplacée par la Potion de Rage — l'armée n'a pas de PV |
| Pool de reliques | 12 noms | **8 défs × 3 raretés** | l'effet (variété perçue) est tenu |
| Effets de reliques | dégâts / Or / vitesse / cooldowns | **dégâts et Or seulement** | vitesse et cooldowns arriveront avec V3 |
| Drop rate 70/25/5 | — | conforme | ✅ |
| Coût troupes ×1.15 | — | conforme | ✅ |
| PV de zones | table § Time-to-clear | ont dérivé à la hausse | à réétalonner au passage d'équilibrage V3-06 |

## Philosophie d'équilibrage

- **Premier prestige : ~1 h** de jeu actif/passif
- **Cycles de prestige de plus en plus courts** : ×0.6 par cycle environ jusqu'à plateau
- **Pas de soft-lock** : un joueur qui revient au bout de 24 h doit pouvoir progresser sans gimmick
- **Idle vs actif** : 70% de la progression vient du passif, 30% de l'actif (recrutement, déblocage, prestige)

## Formules de référence

### Coût d'achat d'une troupe

```
cost(n) = base × 1.15^n
```

où `n` = nombre déjà possédé, `base` = coût de base du tier.

| Tier       | Base   | Achat #10 | Achat #50  | Achat #100   |
|------------|--------|-----------|------------|--------------|
| Paysan     | 10     | 40        | 10 836     | 11 740 802   |
| Soldat     | 100    | 405       | 108 366    | 117 408 029  |
| Chevalier  | 1 000  | 4 046     | 1 083 657  | 1.17 G       |
| Champion   | 10 000 | 40 456    | 10 836 574 | 11.7 G       |

### DPS d'une troupe

```
dps_tier(n)  = baseDps_tier × n × mult_tier(n)
mult_tier(n) = paliers(n) × 1.3^entraînement × 1.4^équipement
dps_total    = (dps_héros + Σ dps_tier) × reliques × arbre × bannières × cri
```

**Paliers automatiques** (US 17) : franchir 25, 100 ou 400 unités d'un tier **double** son dps (×8 au
total). C'est ce qui donne du sens au recrutement en masse.

**Améliorations achetables en or** (US 17), prix proportionnel au `baseCost` du tier, ×5 par niveau :

| Ligne | Effet | Niveaux | Base (Paysan) |
|---|---|---|---|
| 🎯 Entraînement | ×1,3 dps du tier / niveau | 5 | 1 500 |
| 🛠️ Équipement | ×1,4 dps du tier / niveau | 5 | 7 500 |
| 🚩 Bannière | +10% dps **global** / niveau | 3 | 36 000 |
| 💰 Pillage | +15% **or** / niveau | 3 | 18 000 |

Gain maximal par tier ≈ **×160** (paliers ×8 × 1,3⁵ × 1,4⁵), borne verrouillée par un test.

> ⚠️ **Calibrage mesuré, pas deviné.** Le premier jet (seuils 10/25/50/100/200, multiplicateurs
> 1,6/1,8) **divisait par deux** la durée du premier run : 15:50 contre 31:10. Les améliorations
> écrasaient le reste du jeu. La version retenue (seuils espacés, multiplicateurs doux, coûts ×3)
> ramène le premier run à 28:21 — le rythme d'avant, avec un levier de plus. Table complète des
> variantes testées : `docs/plans/2026-07-27-005-feat-us-17-troop-upgrades-plan.md` § Calibrage.

### PV d'une vague / boss

```
hp_wave(z, w)  = base_hp × scaling^(z-1) × (0.8 + 0.04*w)
hp_boss(z)     = hp_wave(z, n_waves) × 10
```

avec :
- `base_hp` = 50
- `scaling` = 6 (×6 PV par zone)
- `z` = numéro de zone, `w` = numéro de vague

### Or par cible

```
gold_wave(z) = base_gold × scaling_gold^(z-1)
gold_boss(z) = gold_wave(z) × 50
```

avec `base_gold = 5`, `scaling_gold = 5`.

### Time-to-clear estimé

À DPS optimal (le bon tier de troupe pour la zone) :

| Zone | PV total approx | Time-to-clear (early) | Time-to-clear (avec prestige) |
|------|-----------------|------------------------|-------------------------------|
| 1    | ~1 000          | 2 min                  | 10 s                          |
| 2    | ~7 000          | 5 min                  | 30 s                          |
| 3    | ~45 000         | 10 min                 | 1 min                         |
| 4    | ~280 000        | 25 min                 | 3 min                         |
| 5    | ~1 700 000      | 60 min                 | 8 min                         |

> Ces estimations supposent qu'on a optimisé le recrutement à chaque zone.

## Prestige

### Gain de Gloire

```
gloire = floor( sqrt( vagues × 100 × 4^max(0, zone_max − 5) ) )
```

Deux termes : les **vagues** vaincues (le volume de jeu) et un **bonus de profondeur** qui double le
gain à chaque zone au-delà du minimum de Croisade.

| Sortie | Vagues | Gloire | Repère |
|---|---|---|---|
| zone 3 | 25 | 50 | abandon précoce |
| zone 5 | 70 | 83 | clear des 5 thèmes |
| zone 6 | 80 | 126 | un cycle entamé |
| zone 7 | 92 | 191 | |
| zone 10 | 130 | ~3 300 | fin du 2ᵉ cycle |

> **Le bonus de profondeur n'est pas un confort, il est nécessaire.** Sans lui (US 18, mesuré) :
> sortir en zone 8 coûte 221 min contre 28 min en zone 5 pour 102 Gloire contre 83 — personne
> n'aurait jamais quitté la zone 5 et les zones sans fin auraient été du contenu mort. Il est placé
> **sous la racine** : en facteur direct, un joueur profond gagnerait 85 000 Gloire par run et
> remplirait l'Arbre entier (8 008) d'un coup.

> **Cette formule a remplacé `floor(sqrt(zones_clear × 10))` en US 15, sur la base d'une mesure.**
> L'ancienne version supposait que `zones_clear` monte à 10, 20, 50 — le jeu n'a que **5 zones**, donc
> le gain valait **7 à vie** et les cycles de prestige ne raccourcissaient pas (×0.97 mesuré au
> simulateur). Les vagues, elles, continuent de croître : la dernière zone reboucle sur son boss, donc
> farmer l'Enfer rapporte davantage. Le facteur 100 est calibré pour atteindre la cible ×0.6 de ce
> document (×0.53 mesuré au 2e cycle).

### Courbe de prestige mesurée

> ⚠️ **Chiffres de cette section obsolètes depuis l'US 27.** Ils ont été produits par un simulateur
> qui ne modélisait ni les reliques ni les actifs, et la mention « calibré à 3,5 % » datait d'US 15,
> avant que les US 22 à 26 n'ajoutent critiques, quatre actifs, rôles et forge de reliques. Mesure
> au navigateur : le premier cycle prend **10 min 11**, pas 22 min 18 — un facteur **2,2**. La
> courbe à jour est en § Courbe recalibrée.

`node scripts/simulate.mjs --no-relics --no-actives` — joueur rationnel, sans reliques ni actifs.

| Croisade | Durée du run | Ratio |
|---|---|---|
| #1 | 31 min | — |
| #2 | 16 min 39 | ×0.53 |
| #3 | 14 min 04 | ×0.84 |
| #4 | 12 min 38 | ×0.90 |
| #5 | 11 min 47 | ×0.93 |
| #6 | 9 min 22 | ×0.79 |

Détail du premier run : Forêt 1 min · Ruines 3 min · Château 3 min 41 · Cathédrale 7 min · Enfer
16 min 26. Le premier prestige tombe à **31 min** et non 1 h — écart assumé, la cible d'1 h avait été
posée avant que le contenu existe.

~~**Limite connue : la boucle plafonne vers 9-12 min.**~~ **Levée en US 18** par les zones sans fin
(cycles de profondeur) et les **Échos** — un palier répétable sans limite au pied de chaque branche
complète. Le jeu n'a plus de fin, et la Gloire a toujours un emploi.

### Arbre de Gloire (US 16 — remplace la Forge)

40 paliers, 4 branches de 10. **Barème unique par profondeur**, identique pour les 4 branches :

| Palier | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Branche complète |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Coût | 5 | 12 | 25 | 45 | 75 | 120 | 190 | 300 | 480 | 750 | **2 002** |

Pousser une branche à fond coûte plus que monter les trois autres au palier 5 (486) : la profondeur
est un choix, pas un passage obligé.

**Composition des effets** : les `%` d'une même idée s'**additionnent** (Fureur I..IV = +190%), les
keystones de fin de branche **multiplient** par-dessus (×2). Un arbre complet plafonne à ×5,8 dégâts,
×4,5 or, ×5,7 Gloire — garde-fous verrouillés par des tests.

**Planchers** : les réductions (coût de recrutement, cooldowns) sont bornées à −75%. Arbre complet,
recruter coûte encore quelque chose.

> ⚠️ **Ne pas offrir de zone déjà conquise.** Le design initial de la branche Croisade donnait un
> départ en zone 2 puis 3. Mesuré au simulateur : le cycle **rallonge** (×1.12). Les premières zones
> sont un tutoriel économique rentable — les sauter prive le joueur des revenus qui financent la
> suite, et fait baisser son gain de Gloire (calculé sur les vagues). Remplacé par de gros paquets de
> paysans, qui font retraverser le début vite **en récoltant l'or**.

### Courbe de prestige avec l'Arbre

`node scripts/simulate.mjs 20` :

| Croisade | 1 | 2 | 3 | 4 | 6 | 9 | 14 | 20 |
|---|---|---|---|---|---|---|---|---|
| Durée | 31 min | 20:34 | 18:49 | 13:44 | 12:45 | 5:01 | 3:57 | 2:58 |
| Ratio | — | ×0.66 | ×0.92 | ×0.73 | ×1.00 | ×0.37 | ×0.79 | ×1.00 |
| Gloire gagnée | 83 | 91 | 107 | 107 | 132 | 132 | 174 | 174 |

Les gros décrochages correspondent aux keystones (le Serment du Champion au cycle 9 débloque le 4ᵉ
tier de troupe). Les cycles à ×1.00 sont ceux où la Gloire part dans une branche qui n'accélère pas le
run (Reliques, ou un palier de Gloire) — c'est attendu, pas un plateau.

Le gain de Gloire **croît** désormais (83 → 174) grâce à la branche Croisade : la boucle s'auto-alimente,
ce qui répond au plateau constaté en US 15.

## Courbe recalibrée et valeur des branches (US 27)

Le simulateur modélise désormais les reliques et les actifs (`scripts/simulate.mjs`, options
`--no-relics` / `--no-actives` pour l'ancien comportement). Les actifs sont joués sur la vraie
timeline de ticks, les reliques tirées et équipées à chaque boss, et conservées d'une Croisade à
l'autre.

**Vérification** : premier cycle **10 min 03** simulé contre **10 min 11** mesuré au navigateur,
soit **1,3 % d'écart**. C'est ce qui autorise à nouveau à arbitrer sur le simulateur.

| Croisade | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| Durée | 10:03 | 6:12 | 4:32 | 3:34 |
| Ratio | — | ×0,62 | ×0,73 | ×0,79 |
| Gloire | 83 | 103 | 103 | 120 |

Le hasard des reliques fait qu'un run n'est plus une valeur mais une **distribution** : l'écart
entre graines atteint **×1,6**. Toute mesure se fait donc sur plusieurs graines (`--seeds=N`), et
une mesure isolée ne prouve rien — trois comparaisons de branches faites au navigateur sur une
seule graine se contredisaient l'une l'autre.

### Ce que vaut chaque branche

`node scripts/simulate.mjs 1 5 --branches --seeds=40` — 83 Gloire (le gain du premier prestige)
dépensés dans une seule branche, 200 runs, 0,44 s.

| Branche | Nœuds | Cycle suivant | vs baseline | Gloire rendue | Rendement combiné |
|---|---|---|---|---|---|
| _aucune_ | 0 | 10:08 | ×1,00 | +83 | 100 |
| ⚔ Guerre | 3 | 6:54 | ×0,68 | +83 | **147** |
| 🪙 Fortune | 3 | 7:50 | ×0,77 | +83 | 129 |
| 💎 Reliques | 3 | 9:02 | ×0,89 | +83 | **112** |
| 🏆 Croisade | 3 | 9:18 | ×0,92 | +103 | 135 |

Le rendement combiné (Gloire par minute de cycle, baseline 100) existe parce que **juger une
branche au seul chronomètre du run est un piège** : 🏆 Croisade paraît dernière alors qu'elle est
deuxième une fois son gain de Gloire compté. C'est son objet même.

### Sur plusieurs cycles — la mesure qui a corrigé le diagnostic

Une mesure à un seul cycle sous-note structurellement une branche dont le bénéfice arrive tard.
`node scripts/simulate.mjs 5 5 --curves --seeds=20` enferme la Gloire dans une branche sur 5 cycles :

| Branche | C2 | C3 | C4 | C5 | cumul |
|---|---|---|---|---|---|
| ⚔ Guerre | ×0,66 | ×0,59 | ×0,53 | ×0,47 | **×0,67** |
| 🪙 Fortune | ×0,70 | ×0,61 | ×0,57 | ×0,54 | ×0,71 |
| 💎 Reliques | ×0,80 | ×0,70 | ×0,65 | ×0,64 | **×0,77** |
| 🏆 Croisade | ×0,89 | ×0,85 | ×0,63 | ×0,61 | ×0,81 |

**C'est 🏆 Croisade qui est back-loaded**, pas Reliques : elle décroche d'un coup au cycle 4 quand sa
clé de voûte tombe (×0,85 → ×0,63). 💎 Reliques, elle, était uniformément plus faible — un problème
de puissance, pas de calendrier. Le premier diagnostic posé sur un seul cycle était donc faux.

**Correction appliquée (US 27)** : le tronc de 💎 Reliques n'achetait que des effets de **second
ordre** (+20% d'un bonus de relique déjà petit) là où ⚔ Guerre achète +35% sur toute l'armée. Son
premier nœud agit désormais sur une **quantité** — « Aubaine », +1 relique par boss. Un biome à zéro
drop (le Néant) le reste : un nœud ne doit pas annuler une règle de biome.

Effet mesuré : ×0,80 → **×0,77** cumulé, avec une pente plus franche (×0,80 → ×0,64 au fil des
cycles, contre ×0,79 → ×0,67 avant). **Volontairement pas poussé jusqu'à la parité** : des branches
identiques n'auraient plus d'objet, et l'écart résiduel est structurel — les reliques sont plafonnées
à 4 slots, donc les drops supplémentaires ont un rendement décroissant.

> Renommage au passage : la branche 💎 Reliques portait des nœuds nommés **Fortune II et III** alors
> qu'il existe une branche 🪙 **Fortune**. Devenus **Providence I et II**. Les ids des nœuds sont
> structurels (`reliques-chance1`…), donc aucune save n'est touchée.

**Ce que le simulateur ne voit toujours pas** : les places d'inventaire (`invCapBonus`) et l'or de
fonte (`meltMult`), donc la Voie du Reliquaire est sous-évaluée par cette mesure.

## La Légende — la deuxième couche de prestige (US 28)

### Le mur, et pourquoi aucun réglage ne le corrigeait

Session de jeu d'Etienne : « j'ai tout maxé et l'accès à la dernière zone est impossible », « la
forge s'arrête trop tôt », « j'ai 236 000 points à dépenser et rien à acheter ». Trois symptômes,
une cause.

| Grandeur | Croissance par zone |
|---|---|
| PV des ennemis | **×7,4** |
| Or gagné | ×7,4 |
| Troupes achetables (coût 1,15ⁿ) | **+14** — linéaire |
| Paliers de troupe (×2 tous les 25) | ~×1,5 |
| Échos, seul puits « infini » | **+25 % additif** — linéaire |

Mesuré tout maxé (arbre complet + 12 échos par branche) : zone 12 en 36 s, zone 14 en 14 min,
zone 16 en **12 h**, zone 18 en **15 jours**, zone 20 jamais. Les Échos étaient **infinis en coût**
et **bornés en effet** : d'où une fortune de Gloire sans emploi.

> Rendre les Échos multiplicatifs a été chiffré puis écarté : suivre ×7,4 par zone leur demanderait
> **+220 % par niveau**. Ce n'est pas un réglage raté, c'est le mauvais levier.

### Le principe

**Une monnaie linéaire en profondeur, dont chaque point est un multiplicateur.** Linéaire ×
multiplicatif = exponentiel. Coût de niveau **plat** : une courbe de coût ramènerait une croissance
polynomiale, donc le problème d'origine.

- Déblocage : zone 10 · Gain : `(zoneMax − 9) × 3`, calibré au simulateur
- Reset : Gloire, Arbre, Échos, troupes, or, améliorations · Conservé : reliques, records, Panthéon
- Panthéon : 4 voies (dégâts, or, effets de reliques, Gloire), ×1,25 par niveau, sans plafond

Le gain est calculé sur `legendeDeepest` (profondeur depuis la dernière Légende) et **jamais** sur
`deepestEver`, qui ne redescend pas : sinon on réclamerait les mêmes points en boucle sans rejouer.

### Calibrage — `node scripts/simulate.mjs 7 5 --legende`

Profondeur atteinte par cycle, budget de 30 min par run :

| K | Cycles |
|---|---|
| 10 | 14 → 20 → 33 → 45 — avale 23 zones d'un coup |
| **3** | **13 → 15 → 17 → 20 → 24 → 29 → 36** ← retenu |
| 2 | 14 → 15 → 16 → 18 → 20 → 23 — trop plat |

L'accélération est **inhérente** : les points croissent avec la profondeur et leur effet est
multiplicatif. On la veut douce au début, franche ensuite.

> Se **concentrer** sur une voie bat le contenu ; s'éparpiller sur les quatre ne suffit pas
> (2,5 niveaux par voie et par zone). C'est la décision que le système demande, pas un piège.

## L'Arbre après refonte (US 28)

Retour d'Etienne : *« ton arbre est peu commun, habituellement on part du centre et on s'enfonce
dans des spécialisations »*. Il avait raison — l'ancien arbre s'écartait puis **reconvergeait** vers
une couronne unique, ce qui annulait au dernier palier la spécialisation du milieu.

Désormais : racine → 4 branches → 2 voies → **une clé de voûte par voie**, et plus aucune fusion.
Un test l'énonce : aucun nœud n'a plus d'un prérequis. Le sommet est le palier 7 (les paliers 8 et 9
servaient l'apex de branche et la couronne).

Le **Serment du Champion** quitte la branche Guerre et pend à la racine : un tier de troupe est du
contenu, pas la récompense d'une spécialisation — derrière une clé de branche il était inatteignable
pour trois joueurs sur quatre.

Save migrée v3 → v4 **par remboursement**, comme v1→v2 et v2→v3. Un nœud dont le prérequis a disparu
est retiré et remboursé lui aussi : le garder laisserait un acquis ni utilisable ni rachetable.

### Disposition radiale (US 36)

L'arbre partait du bas et montait en éventail. Il **rayonne désormais depuis son centre** : la
racine occupe le point central, les quatre branches se répartissent à 90° l'une de l'autre, et le
Serment du Champion — le seul nœud commun — coiffe l'ensemble au nord.

Le catalogue n'a pas bougé : il décrit toujours une grille (`x` = position dans l'éventail,
`y` = profondeur). C'est la **projection** qui est passée en polaire — angle depuis `x`, rayon
depuis `y`. La racine, à `y = 0`, est donc au centre par construction, sans cas particulier.

Un détail qui décide du rendu : le **premier anneau est écarté** (104 px contre 58 entre les
suivants). À faible rayon, 90° d'écart angulaire ne font que quelques pixels d'écart réel, et les
quatre branches s'entassaient sur la racine.

**Arbitrage assumé entre bureau et téléphone.** Sur grand écran l'arbre se met à l'échelle pour
tenir entier dans son cadre : sa forme d'ensemble *est* l'information, voir un quart de mandala ne
dit rien. Sous 900 px c'est l'inverse — mis à l'échelle, les nœuds tombent à 12-22 px, et **on
n'achète pas un nœud qu'on ne peut pas viser**. La tapabilité y passe donc avant la vue d'ensemble :
taille réelle, et on parcourt au doigt.

### Courbe et branches après refonte

| Croisade | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| Durée | 10:03 | 6:04 | 4:05 | 2:17 |
| Ratio | — | ×0,60 | ×0,67 | ×0,56 |

Cible de DESIGN (×0,6 par cycle) tenue. Valeur des branches, 83 Gloire, 40 graines :

| Branche | Cycle | vs baseline | Rendement combiné |
|---|---|---|---|
| ⚔ Guerre | 6:54 | ×0,68 | 147 |
| 🪙 Fortune | 7:50 | ×0,77 | 129 |
| 💎 Reliques | 8:05 | ×0,80 | 125 |
| 🏆 Croisade | 9:18 | ×0,92 | 135 |

## Succès (US 28, étendus en US 29)

**207 jalons**, prédicats **purs** sur un instantané d'état — aucun compteur parallèle à maintenir,
donc rien qui puisse dériver. Seuls les ids obtenus sont persistés, plus les compteurs à vie que
l'état ne sait pas reconstituer (boss, vagues, critiques, actifs, forges, fusions, or cumulé).

**Générés par familles**, pas écrits un par un : une famille déclare un compteur, une échelle de
paliers et une stat. Deux cents entrées à la main dériveraient au premier changement d'équilibrage ;
ici on ajoute un palier, pas une ligne de catalogue.

### Raretés et multiplicateurs

L'échelle des reliques prolongée d'un cran — 200 succès demandent plus de granularité au sommet que
24 reliques. La rareté se déduit de la position dans la famille.

| Rareté | Multiplicateur | Nombre |
|---|---|---|
| Commun | ×1,002 | 70 |
| Rare | ×1,005 | 59 |
| Légendaire | ×1,01 | 57 |
| Mythique | ×1,02 | 21 |

Les succès majorent les **mêmes quatre stats que le Panthéon** (dégâts, or, reliques, Gloire) — pas
un cinquième vocabulaire. Un test impose qu'aucune stat ne porte moins de 10 % du catalogue, faute
de quoi trois d'entre elles seraient décoratives.

### Ce que ça pèse réellement — mesuré

L'inquiétude légitime est l'empilement : 207 multiplicateurs, même minuscules, déplacent la courbe.
Mesuré au simulateur (`opts.achievements`), premier cycle de référence 9 min 50 :

| Profil | Succès obtenus | ×dégâts | Cycle |
|---|---|---|---|
| Début — zone 5, 1 Croisade | 22 | ×1,02 | **×0,97** |
| Milieu — zone 20, 30 Croisades | 89 | ×1,11 | **×0,87** |
| Vétéran — zone 60, 500 Croisades | 147 | ×1,29 | ×0,69 |
| Catalogue complet (théorique) | 207 | ×1,83 | ×0,45 |

La dernière ligne n'est pas atteignable : elle exige la zone 300, 10 millions de vagues et 30 000
Croisades. « Léger » est donc tenu **là où le joueur vit réellement** — imperceptible au début, un
appoint franc en milieu de partie, une vraie récompense de complétionniste au bout.

> Réserve posée puis levée par la mesure : doter les succès d'effets crée bien un troisième système
> de progression face à l'Arbre et au Panthéon. Ce qui le rend acceptable est que sa pente est
> plate là où les deux autres sont raides, et qu'il récompense l'étendue du jeu plutôt que la
> profondeur — ce qu'aucun des deux autres ne fait.

## Lecture de composition (US 31)

L'US 24 a mesuré qu'une composition pensée vaut **×2,06** contre ×1,30 pour un empilement
mono-tier. Le levier le plus profond du jeu — et **rien à l'écran ne le disait**. Le joueur voyait
un dps global, jamais ce que sa composition lui apportait ni ce qui manquait.

Sous le dps s'affiche désormais :

- **⚖ Composition ×N** — ce que les rôles rapportent *réellement*, contre *cet* ennemi ;
- une pastille par tier avec sa contribution **marginale** (ce qu'on perdrait en retirant son rôle),
  **grisée quand elle ne rapporte rien** — l'information la plus utile du lot ;
- un conseil : quel recrutement fait le plus progresser, et jusqu'où.

### Ce qu'on ne mesure surtout pas

**Pas de score contre un optimum théorique.** Un « tu es à 60 % de la meilleure composition »
suppose de connaître cette meilleure composition, et donnerait au joueur un objectif faux dès que
l'hypothèse dérive. On affiche un rapport **vérifiable** : les dégâts avec rôles divisés par les
mêmes dégâts sans eux. C'est un fait, pas une opinion.

La contribution par tier est **marginale** et non absolue : « ce tier me rapporte ×1,18 » est ce
qu'un joueur peut utiliser, là où une part absolue dirait surtout qui est le plus nombreux.

### Deux détails qui décident de l'utilité

**Le contexte est passé en argument** (`compositionValue(counts, doctrine, ctx)`), jamais lu dans la
fonction : c'est le piège de réactivité documenté du projet, et il aurait figé le chiffre au premier
ennemi. Vérifié au navigateur — sur 11 ennemis, le ratio prend bien trois valeurs distinctes
(×1,61 · ×2,05 · ×1,68), ce qui montre au passage que **l'affinité de type se lit enfin**.

**Deux décimales, et un seuil de visibilité.** À une décimale, le conseil promettait « ×1,1 » quand
l'actuel affichait déjà ×1,1 : un conseil indistinguable ne conseille rien. Le ratio s'affiche
désormais au centième, et `bestNextStep` ne propose rien dont le gain passerait sous la résolution
d'affichage (`MIN_VISIBLE_GAIN`).

## La Frappe (US 38)

Le héros tapait tout seul à 12 dps : les premières secondes d'un run se **regardaient**. C'est
pourtant le seul moment du jeu où le joueur n'a ni armée, ni or, ni décision à prendre — et il
n'avait rien à faire non plus.

Désormais le héros ne frappe que si on le lui demande : **on clique sur l'ennemi**. Sans armée,
c'est le seul moyen d'avancer.

| | |
|---|---|
| Dégâts d'un clic nu | 8 |
| Progression | 6 niveaux, ×1,4 chacun (×7,5 au total) |
| Prix | 25 or, ×3,2 par niveau |
| Multiplicateurs | la Frappe suit ceux de l'armée (reliques, Arbre, Panthéon, succès) |

Sans ce dernier point, la Frappe serait morte après deux minutes et l'améliorer n'aurait aucun sens
passé la zone 1.

### Deux garde-fous, tous deux nés d'une mesure

**Le pilier idle tient parce que la Frappe est bornée par la vitesse d'un doigt.** À cinq clics par
seconde, une Frappe maximale rend **301 dps** — une armée de 100 paysans en fait déjà 400. Elle
amorce un run, elle ne peut pas le porter. Un test verrouille ce rapport : la première version, à
×1,7 sur 8 niveaux, atteignait **2 793 dps** et aurait transformé le jeu en clicker.

**Sans armée, le tick ne porte plus aucun coup.** `computeHit()` applique un plancher de 1 dégât,
utile pour qu'une armure épaisse ne bloque jamais un joueur qui a des troupes — mais appliqué à une
armée vide, il grignotait l'ennemi tout seul et rendait le clic facultatif. Le tick saute donc le
coup quand l'armée est à zéro… **sans sauter la suite** : c'est elle qui encaisse la mort de la
cible, y compris quand c'est le clic du joueur qui l'a tuée.

> Le simulateur ne modélise pas les clics : `heroDps` y tient lieu de « joueur présent qui frappe de
> temps en temps ». Ses durées de début de run sont donc un **plancher**.

### Où elle vit (US 43)

La Frappe occupait une carte dans la Caserne, entre les troupes. Elle n'en est pas une : elle n'a
ni compte, ni palier de ×2, ni rôle. Elle vit désormais **en tête de « Améliorer »**, avec les
autres dépenses d'or, et la Caserne ne liste plus que ce qui se recrute.

Le rappel « clique sur l'ennemi » descend **sous la barre de vie**, et ne s'affiche que quand
l'armée ne fait rien. Il est là où il sert, à côté de la chose à cliquer, au moment où c'est le
seul moyen d'avancer.

> Mensonge d'affichage corrigé au passage : `averageHit` plancher à 1, donc sans armée l'écran
> annonçait « ton armée frappe à 1 dps ». Le combat, lui, était juste — il est gardé par
> `if (armeeDps > 0)`. C'est ce même `armeeDps` qui décide maintenant de l'affichage.

## La Patine des reliques (US 40)

Le loot était un tri automatique : le plus gros pourcentage gagne, aucun arbitrage. Une relique
**équipée mûrit désormais à l'horloge murale** — +1,25 % de son effet par heure portée, plafonné à
**×1,5** en 40 h. Déséquiper remet à zéro.

C'est la **remise à zéro qui crée la décision**. Sans elle, la Patine ne serait qu'un compteur qui
monte ; avec elle, le drop d'une relique meilleure devient une vraie question — jeter 30 h de
maturation pour +15 % de base, est-ce que ça vaut le coup ? C'est un **coût d'opportunité**, la
seule chose qui transforme un inventaire en arbitrage.

| Palier | Seuil | Atteint en |
|---|---|---|
| · Neuve | ×1,00 | — |
| ◔ Cuivrée | ×1,10 | 8 h |
| ◑ Dorée | ×1,25 | 20 h |
| ◕ Auréolée | ×1,40 | 32 h |

**Ce n'est pas de la progression hors-ligne** — exclusion que le projet maintient. On ne gagne
aucune ressource en dormant : un objet qu'on a *choisi* de porter prend de la valeur. C'est le seul
mécanisme du jeu qui récompense le fait de fermer l'onglet.

> Art antérieur assumé : la file de compétences d'EVE Online, où l'engagement n'est pas « jouer
> plus » mais « avoir bien choisi avant de partir ».

**Plafond volontairement modeste.** Les effets de relique sont déjà bornés par nature (≤ 70 % de
dégâts par slot) ; un ×2 aurait doublé ces bornes et forcé à réétalonner tout le reste. La borne
combinée — plafond de nature × Patine — est désormais **inscrite dans le test** plutôt que laissée
implicite, pour que la documentation cesse d'être vraie par accident.

## Le banc des invariants (US 46)

Le projet avait pris une habitude : borner par le raisonnement, puis figer la borne dans un test
unitaire. **Trois fois de suite, la mesure de run a démoli ce que l'analyse validait** — la
non-dominance des voies et le plancher de boss (US 45), la lisibilité du conseil de composition
(US 31). Un test analytique ne voit pas qu'un bonus d'or achète de l'armée.

D'où ce banc : `node scripts/simulate.mjs --banc`. Il ne mesure qu'une chose, et c'est la seule qui
compte — **la vitesse de run relative à un joueur nu**.

| Ce qu'on mesure | ×vitesse (sortie zone 5) |
|---|---|
| reliques communes niv. 0, dégâts | ×1,06 |
| reliques légendaires niv. 5, dégâts | ×1,94 |
| … avec la Patine au plafond | ×2,28 |
| le meilleur de chaque slot | ×3,79 |
| **le meilleur + Patine au plafond** | **×5,09** |
| catalogue de succès complet (207) | ×2,11 |

### Ce que ça a appris

**La borne des reliques décrivait la mauvaise quantité.** « ≤ 70 % de dégâts par slot » est vrai,
et inutilisable : personne ne peut en déduire ce que vaut un stuff. Le nombre qui compte est
**×5,09 sur la durée d'un run**, et il n'était écrit nulle part. Il est maintenant verrouillé par
un test qui joue de vrais runs, avec un plafond de ×8 — la marge est volontaire : le test n'est pas
là pour geler un chiffre, mais pour crier si une relique ajoutée demain fait passer le maximum de
×5 à ×20.

**Ce plafond est tenable.** Il demande quatre légendaires, toutes forgées au niveau 5, portées
40 heures — et les PV de zone montent en exponentielle, donc ×5 achète deux ou trois zones. À
comparer au Panthéon, explicitement sans plafond : les reliques sont la couche permanente bornée,
c'est cohérent.

**Les succès tiennent leur promesse.** ×2,11 pour le catalogue complet, contre le ×2,22 attendu du
×0,45 documenté en US 29. Cet invariant-là était juste.

**La Patine est INMESURABLE dans un run**, et c'est structurel : +1,25 %/heure contre des runs de
quelques minutes. La modéliser tick par tick est correct pour la fidélité, mais ne dira jamais
rien. Pour connaître son plafond il faut le forcer (`opts.patine`) — ce que fait le banc. C'est la
seule mécanique du jeu qui n'existe qu'**entre** les sessions, et le simulateur ne peut pas la voir
autrement.

> Piège rencontré en écrivant le banc : `patineMult` rejette les horodatages ≤ 0, par conception —
> une relique jamais portée n'a pas de patine. Antidater une relique avec un tick négatif renvoie
> donc silencieusement 1, et la première mesure a conclu que la Patine ne servait à rien.

## Ce que le simulateur ne voyait pas (US 45)

Deuxième équilibrage ciblé. La question posée était simple : **l'or a-t-il cessé d'être le goulot ?**
Avant d'y répondre il fallait combler les trous du modèle. Audit terme à terme de la formule d'or
du jeu contre celle du simulateur :

| Terme | Modélisé avant |
|---|---|
| `routeFx.goldMult` (×0,55 → ×1,8) | **non** |
| `bossFx.goldMult` (×0,5 si télégraphe raté) | **non** — et c'est un malus, donc la sim était optimiste |
| Patine sur l'effet des reliques (×1,5) | **non** |
| arbre, panthéon, succès, vœu, biome, actifs, **or des reliques** | oui |

Les trois sont désormais câblés, avec la vraie fonction du jeu et non une approximation. Le socle
de calibration n'a pas bougé d'une seconde (1er cycle 10 min 26 s) : ajouter de la modélisation
n'a rien perturbé.

### La réponse : non, l'or reste un goulot

On ne le lit pas dans une formule, on le mesure — si ajouter de l'or n'accélère plus, le mur est
ailleurs.

| ×or | durée (sortie zone 8) | gain | élasticité |
|---|---|---|---|
| ×1 | 2 h 19 min | — | — |
| ×1,8 | 1 h 33 min | 33 % | 0,42 |
| ×4 | 72 min | 48 % | 0,16 |
| ×8 | 51 min | 63 % | 0,09 |
| ×32 | 26 min | 82 % | 0,03 |

Fortement décroissant, mais **jamais nul**. Au maximum d'or de relique (≈ ×4), le run reste 48 %
plus rapide : l'arbitrage d'achat tient. L'inquiétude posée avant mesure était surévaluée.

### Un boss devenait invincible

Trouvé en modélisant les maluses de télégraphe. Le Voile non contré multipliait la puissance de
critique par **0**. Comme le jeu sature la chance de critique dès 91 points, **chaque coup est un
critique** — donc chaque coup faisait zéro. Mesuré à 165 points : **1 dégât par tick**.

L'invariant d'US 30 — « rater un contre ne fait jamais perdre » — était donc **faux**, et le test
censé le garder ne vérifiait que `dmgTakenMult`, que le Voile ne touche pas.

Trois corrections, dans cet ordre :

1. **Plancher à 1 sur la puissance de critique** — un critique ne peut jamais taper moins fort
   qu'un coup normal. Supprime le blocage, mais laisse 5,2 % des dégâts, sous le plancher annoncé.
2. **Le facteur de boss s'applique APRÈS la conversion du surplus** (`critMultFactor`), pas avant.
   Appliqué avant, le boss rabotait aussi la valeur du surplus — un double compte qui faisait
   dériver le ratio vers zéro à mesure que la chance montait. Appliqué après, **le ratio vaut
   exactement ce facteur, quelle que soit la chance** : la borne devient démontrable au lieu d'être
   calibrée à la main.
3. **Voile recalibré de 0 à 0,35**, puisque 0,35 × 0,65 (Fureur) = 22,8 % > 20 %.

Vérifié de 8 à 400 points de critique : **22,8 %** des dégâts dans le pire cas, stable. Le test
mesure désormais des **dégâts**, pas un facteur.

### Deux voies sur cinq étaient cassées

La mesure de run a démoli ce que l'analyse validait :

| Voie | avant (mesuré) | verdict |
|---|---|---|
| La route marchande | **-8 % de temps** et +108 % d'or | **strictement meilleure** — l'or supplémentaire achetait plus d'armée que les PV n'en coûtaient |
| Le sentier de traverse | **+47 % de temps** et -33 % d'or | **strictement pire** — l'armée mourait de faim, la « traverse » était plus lente |
| Les terres hantées | -1 % de temps, +5 % d'or, +1 relique | légèrement dominante |

Recalibré, et re-mesuré sur 8 graines à deux profondeurs :

| Voie | temps | or | ce qu'elle achète |
|---|---|---|---|
| La voie directe | — | — | ne pas parier |
| La route marchande | +4 % / +12 % | **+66 % / +70 %** | de l'or contre du temps |
| Le sentier de traverse | **-12 % / -16 %** | -33 % / -2 % | de la vitesse contre du butin |
| Les terres hantées | +14 % / +35 % | -13 % / -21 % | **+1 relique par boss**, contre tout le reste |
| La marche forcée | +53 % | -3 % | **×1,5 Gloire**, contre du temps |

**`bossArmorPts` est un levier quasi mort**, et c'est structurel : l'armure plafonne à 80
(`combat.js`) et un critique l'ignore — or le jeu sature la chance de critique. Les terres hantées
paient donc en **or**, pas en armure. Le +25 reste pour les boss peu blindés.

### Ce que coûte un télégraphe raté, enfin chiffré

| contres réussis | durée (zone 5) | vs parfait |
|---|---|---|
| 100 % | 9 min 38 s | — |
| 75 % | 13 min 30 s | +40 % |
| 50 % | 15 min 37 s | +62 % |
| 0 % | 28 min 00 s | **+191 %** |

Tout rater triple le run. Ça ne bloque jamais — l'invariant, vérifié en run cette fois, pas en
ratio.

> Reste non modélisé : rien, sur l'or. Les dégâts de relique (+157 % max) sont maintenant couverts
> par le même chemin que l'or, la Patine comprise.

## Le plafond de critique, et ce qu'on en fait (US 44)

Premier équilibrage ciblé de la série. Le constat n'est pas ressenti, il est **compté** : la chance
de critique est plafonnée dur à 100 (`combat.js`), et le jeu en distribue bien davantage.

| Source | Points |
|---|---|
| Base | 8 |
| Arbre complet | 18 |
| Marée humaine (rôle paysan) | 25 |
| Potion de Rage | 40 |
| **Sous-total, sans une seule relique** | **91 / 100** |
| 3 reliques crit légendaires niv. 5 | +73,5 |
| … avec la Patine ×1,5 | **+110,3** |

Un joueur milieu de partie est à **91 sur 100 sans porter de relique**. Au-delà, une branche
entière de l'Arbre, un actif sur quatre et trois reliques valaient **exactement zéro** — et rien à
l'écran ne le disait. Ce n'était pas une dérive de courbe : c'était du contenu mort.

### La conversion, et pourquoi ce taux-là

Le surplus passe en **puissance** de critique. Le taux n'est pas choisi au doigt mouillé : sous le
plafond, un point vaut `(critMult − 1)/100` des dégâts bruts par coup. On convertit **au même
taux**, donc franchir 100 n'est ni une perte ni une aubaine.

```
critOverflow(pts, mult) → { chance: min(pts, 100),
                            mult: mult + max(0, pts − 100) × (mult − 1)/100 }
```

**Conservateur par construction face à l'armure** : la vraie équivalence serait
`(critMult − armure passée)/100`, et l'armure passée est ≤ 1 puisqu'un critique l'ignore. Le
surplus rend donc toujours un peu moins que ce qu'il valait, jamais plus. Un test le verrouille
dans les deux sens.

### Ce que ça change, mesuré

| Étape | points | affiché | dégâts avant | après | gain |
|---|---|---|---|---|---|
| débutant | 8 | 8% ×8,00 | 1 560 | 1 560 | — |
| + armée complète | 33 | 33% ×8,00 | 3 310 | 3 310 | — |
| + Arbre complet | 51 | 51% ×8,00 | 4 570 | 4 570 | — |
| + Potion de Rage | 91 | 91% ×8,00 | 7 370 | 7 370 | — |
| + 3 reliques crit | 165 | 100% ×12,52 | 8 000 | 12 515 | **×1,56** |
| + Patine | 201 | 100% ×15,09 | 8 000 | 15 088 | **×1,89** |

**Sous 100 points, rien ne bouge** — donc aucun réétalonnage de la courbe d'early game. Au-dessus,
le simulateur mesure l'effet sur la profondeur : en Légende profonde, **+1 zone par cycle**
(13→14, 17→18, 20→21) et +11 % de points cumulés après quatre cycles. Un ×1,89 en dégâts n'achète
qu'une zone parce que les PV montent en exponentielle — c'est précisément la borne qu'on voulait.

**À l'écran** : la barre affiche `100% ×12,5 +65`. Le surplus est montré, pas escamoté — sinon le
joueur croit ses points perdus, ce qui était le vrai défaut.

> Ce que ça ne règle PAS, et qui reste à traiter pas à pas : le simulateur ne modélise toujours ni
> la Patine ni les voies. Les dégâts de relique (+157 % max) et l'or (+299 % max) restent bornés
> analytiquement, sans mesure de run.

## La Route — le carrefour d'entrée de zone (US 41)

Battre un boss ouvrait une transition purement décorative : deux secondes de fondu, et la zone
suivante s'enchaînait à l'identique. C'était le seul moment où le joueur regardait l'écran sans
rien décider. **Le carrefour occupe cette pause** — trois voies, un choix, la zone change.

| Voie | Effet | Le pari |
|---|---|---|
| 🛣️ La voie directe | rien | ne pas parier |
| 💰 La route marchande | ×1,8 or, ×1,35 PV | payer en temps ce qu'on gagne en or |
| 🏃 Le sentier de traverse | ×0,5 vagues, ×0,55 or | traverser vite, encaisser moins |
| 👻 Les terres hantées | +25 pts d'armure au boss, +1 relique | un mur contre du butin |
| 🩸 La marche forcée | ×1,6 PV, ×1,5 Gloire | souffrir maintenant, prestiger mieux |

**Trois voies tirées sur cinq, la directe toujours offerte.** Le tirage est déterministe par zone —
même profondeur, même carrefour — pour qu'un joueur puisse planifier plutôt que relancer. Et la
voie directe reste systématiquement sur la table : *refuser le pari doit toujours être possible*,
sinon ce n'est plus un choix, c'est un impôt.

**Aucune voie n'est strictement meilleure**, et c'est verrouillé par test : chacune gagne sur un axe
et perd sur un autre. La marchande enrichit mais durcit ; le sentier accélère mais appauvrit. Un
menu où une ligne domine n'est pas un menu.

### Trois décisions de portée

- **La voie s'applique par-dessus le biome, jamais à la place du barème.** Elle multiplie les mêmes
  facteurs qu'une règle de biome (`hpMult`, `goldMult`, `waveMult`), donc rien ne peut dériver hors
  des ordres de grandeur déjà mesurés — et le simulateur reste valide sans la modéliser.
- **Un pari se prend en jouant.** Le rattrapage hors ligne franchit les zones sans carrefour et
  remet la voie à `directe` : on ne veut pas qu'une marche forcée choisie hier plombe huit heures
  de sommeil.
- **Ne pas choisir n'immobilise pas.** La transition se lève seule au bout de 6 s sur la voie
  directe ; choisir la referme immédiatement. Le joueur qui ne regarde pas ne perd que le pari.

> Régression de cascade attrapée au navigateur : `.zone-transition` portait `pointer-events: none`
> — légitime pour un fondu décoratif, fatal dès qu'il porte des boutons. Et sur mobile, le
> `flex: 1 1 190px` du socle s'applique à la **hauteur** une fois la liste passée en colonne :
> trois boutons de 190 px qui grandissent encore, le troisième sous le pli. Sonde
> [`scripts/verif/route.mjs`](../scripts/verif/route.mjs), 17 contrôles.

## Le Conseil du retour (US 37)

L'idéation désignait « rythme et retour » comme l'axe le plus vide du jeu : revenir, c'était
regarder un nombre plus grand. Et le levier classique du genre — plus de bonus hors-ligne — ne crée
aucune raison de revenir **maintenant plutôt que demain**.

**Ce n'est pas de la progression hors-ligne.** Le projet l'exclut délibérément, et on ne la
réintroduit pas : on ne gagne rien en dormant. Ce qui attend au retour, ce sont des **arbitrages** —
des situations rencontrées pendant l'absence, dont il faut décider.

| Carte | Option A | Option B | Échange |
|---|---|---|---|
| ⛓️ Un prisonnier | 🪙 Rançon | ⚔ Exécution | or ↔ Gloire |
| ⛪ Une chapelle en ruine | 💎 Fouiller | 🪙 Récupérer la ferraille | relique ↔ or |
| 🏃 Un déserteur | ⚔ Faire un exemple | 🌾 Le renvoyer au rang | Gloire ↔ troupes |

Une carte par tranche de 1 h 30 d'absence, **trois au maximum** — au-delà c'est une corvée
administrative, pas une pause. Elles **expirent en 24 h** : c'est ce qui crée la raison de revenir
aujourd'hui, sans jamais détruire quoi que ce soit d'acquis.

### Trois règles qui font la différence entre un conseil et un distributeur

**Chaque carte échange deux monnaies différentes**, et un test l'impose. Si les deux options
donnaient la même chose, il n'y aurait pas de choix — seulement un montant. Laquelle vaut le plus
dépend de la situation : on veut de l'or quand on pousse, de la Gloire quand on part en Croisade.

**On peut partir sans trancher.** Les cartes attendent. Forcer un choix ferait du retour une corvée,
et une carte n'interrompt jamais le combat.

**Les montants suivent la progression** — ils se calculent depuis l'or d'une cible de la zone
courante. Une carte qui offrirait 50 or en zone 12 serait une insulte.

> Calibrage corrigé après mesure : la première version donnait **60 vagues de revenu**, soit cinq
> zones entières en profondeur — la fortune du joueur multipliée par plusieurs milliers. Ramené à 15
> et 30 vagues, avec un test qui borne le rapport.

## Pierres de Vœu (US 34)

Mesuré : l'Arbre **classe** ses branches au lieu d'offrir un choix (Guerre ×0,67 · Fortune ×0,71 ·
Reliques ×0,77 · Croisade ×0,81 sur 5 cycles). Et c'est **structurel** : tous les nœuds parlent la
même monnaie — un multiplicateur — donc ils se classeront toujours. Aucun rééquilibrage ne corrige
ça ; seuls des effets **non commensurables** le peuvent.

Un Vœu ne donne pas un pourcentage : il change une règle et impose un renoncement. Un seul à la
fois, choisi au départ d'une Croisade, débloqué en possédant l'apex de **sa** branche.

| Vœu | Branche | Renoncement | Contrepartie | Gagne sur |
|---|---|---|---|---|
| 🕊️ Pauvreté | 🪙 Fortune | or ÷5 | 2 reliques par boss, +2 crans de rareté | le butin |
| 🤫 Silence | ⚔ Guerre | plus d'actifs, plus d'annonces de boss | leurs effets permanents à 20 % | le jeu passif |
| ⛓️ Fer | 💎 Reliques | un seul emplacement | son effet ×2,5, trouvailles +1 cran | la concentration |

Prime commune **×1,5 de Gloire** : sans elle, ne rien prendre serait toujours le choix sûr et le
système ne serait qu'une option décorative.

### Mesuré, et deux fois corrigé

Budget de 120 min par run, 14 graines, arbre = la branche qui débloque le Vœu :

| Vœu | cycle vs sa branche | Gloire | reliques non-communes |
|---|---|---|---|
| 🕊️ Pauvreté | ×1,03 | +50 % | 3,9 (vs 2,3) |
| 🤫 Silence | **×1,28** | +50 % | 2,3 (=) |
| ⛓️ Fer | ×1,14 | +50 % | 4,0 (vs 3,9) |

Aucun n'est strictement meilleur qu'un autre — chacun paie quelque part. Deux corrections que la
mesure a imposées :

- **Le Vœu de Fer était strictement supérieur** à ×4 : plus rapide, plus riche, mieux loti. Ramené
  à ×2,5, il coûte enfin (×1,14) et gagne ailleurs — la qualité du butin.
- **Le Vœu du Nombre a été abandonné.** Interdire un tier de troupe n'est pas un renoncement, c'est
  un **plafond dur sur la profondeur** : la zone 13 devenait inatteignable, y compris avec plafonds
  de rôle doublés *et* recrutement à moitié prix. Le dps dépend du meilleur tier disponible et le
  contenu croît exponentiellement.

### Pourquoi la branche Croisade n'a pas de Vœu

Un second candidat y a été essayé — le **Vœu d'Errance** (biome tiré au sort, +80 % de Gloire). Avec
le tirage **modélisé dans le simulateur**, tomber sur les Terres Maudites (×5 PV) rendait le run
infaisable. Sans cette modélisation il paraissait gratuit : on aurait mesuré son bonus sans son coût.

Un renoncement ne doit pas pouvoir rendre une partie injouable. La question reste ouverte, et un
test verrouille l'état actuel pour que la combler soit une décision et non une dérive.

## Boss télégraphiés (US 30)

Deux constats mesurés, une seule mécanique. Les boss ne différaient d'un mob que par PV, armure et
type — rien ne s'y passait. Et la politique optimale des actifs était « lancer dès que prêt », donc
un automatisme et non une décision.

À trois paliers de PV (75 / 50 / 25 %), le boss **annonce** une action pendant une fenêtre.
Chaque annonce a **exactement un actif qui la contre** — bijection verrouillée par test, sans quoi
un actif resterait sans emploi et un autre servirait deux fois.

| Annonce | Contre | Si raté (jusqu'à la mort du boss) |
|---|---|---|
| 🛡️ Carapace | 🗡️ Percée | +35 points d'armure |
| 🔥 Fureur | 📯 Cri de Guerre | encaisse 35 % de dégâts en moins |
| 🌫️ Voile | 🧪 Potion de Rage | les critiques ne passent plus |
| 💰 Rapine | 💰 Ferveur | moitié moins d'or |

Contré : **faille ouverte**, ×1,6 dégâts pendant 6 ticks. Sans récompense, contrer ne serait
qu'« éviter d'être puni ».

**Invariant non négociable, verrouillé par test** : tout rater ralentit fort mais ne bloque jamais.
Le pilier « on ne peut pas perdre » reste intact — c'est ce qui autorise cette tactique dans un idle.

**Le boss n'annonce jamais ce qu'on ne peut pas contrer.** Trouvé au navigateur : en zone 3 il
annonçait Rapine, dont le contre (Ferveur) n'ouvre qu'en zone 4 — une punition sans parade. Les
annonces sont désormais filtrées sur les actifs débloqués, ce qui fait grandir la scène au rythme du
joueur : une annonce en zone 1, trois à partir de la zone 4. Le choix reste **déterministe** par
zone : on apprend un boss, on ne subit pas un tirage.

**Fenêtre de réaction : 6 ticks (4,8 s).** Elle valait 3,2 s au départ ; un pilote automatisé la
ratait une fois sur deux à cause de ses seuls temps d'aller-retour. Si une machine la rate, un enfant
de 5 ans la rate. Une annonce doit être une invitation, pas un test de réflexes.

> Coût assumé sur la vision : `SPEC.md` pilier 2 dit « pas de tactique ». Ce pilier est déjà révisé
> de fait depuis les US 22 et 24 — « la tactique est facultative mais récompensée ». Le boss
> télégraphié y reste tant que rater coûte du temps et du butin, jamais la partie.

## Reliques

### Pool initial (V2)

| Nom                     | Rareté    | Effet                              | Slot     |
|-------------------------|-----------|------------------------------------|----------|
| Épée du Bûcheron        | Commun    | +5% dégâts                         | Arme     |
| Lame du Capitaine       | Commun    | +12% dégâts                        | Arme     |
| Épée Sainte             | Rare      | +25% dégâts                        | Arme     |
| Excalibur Mineur        | Légendaire| +60% dégâts                        | Arme     |
| Cuir Renforcé           | Commun    | +5% Or                             | Armure   |
| Cotte d'Étoile          | Rare      | +20% Or                            | Armure   |
| Plastron Royal          | Légendaire| +50% Or                            | Armure   |
| Bannière Brûlante       | Commun    | +5% vitesse d'attaque              | Bannière |
| Étendard de Bataille    | Rare      | +15% vitesse d'attaque             | Bannière |
| Bannière de Croisade    | Légendaire| +35% vitesse d'attaque             | Bannière |
| Amulette de Vie         | Commun    | +10% PV armée                      | Amulette |
| Amulette du Roi         | Légendaire| −20% cooldowns actifs              | Amulette |

### Drop rate par boss

| Rareté      | Probabilité base | Avec upgrade qualité (max) |
|-------------|------------------|----------------------------|
| Commun      | 70%              | 40%                        |
| Rare        | 25%              | 45%                        |
| Légendaire  | 5%               | 15%                        |

## Actifs

| Actif | Effet | Durée | Cooldown | Ouvert à |
|---|---|---|---|---|
| 📯 Cri de Guerre | ×2 dégâts | 10 s | 25 s | zone 1 |
| 🧪 Potion de Rage | +40 pts de critique | 8 s | 40 s | zone 2 |
| 🗡️ Percée | ignore l'armure | 12 s | 50 s | zone 3 |
| 💰 Ferveur | ×3 or | 15 s | 60 s | zone 4 |

Garde-fous testés : **durée < cooldown** pour chacun (un actif reste un acte, pas un état), paliers de
déblocage **distincts**, et chaque actif exploite un levier différent — aucun n'est la variante d'un
autre. Plancher de cooldown à 1 s même arbre complet.

> **Potion de Soin retirée en US 23** : elle soignait des PV inexistants. Voir SPEC § Actifs.

## Anti-patterns à éviter

- Une seule stratégie dominante (ex : "spam paysan, ignore le reste")
- Un soft-lock où une zone est trop dure et aucune progression hors prestige
- Un prestige qui rend trop fort instantanément (perte de challenge)
- Une UI qui demande de cliquer toutes les 10 s pour progresser (c'est un idle)
- Une courbe exponentielle qui rend le late-game illisible (chiffres en 10^20+)
- Des achievements gating la progression (ils doivent être bonus)

## Bench / playtest

À faire en V3 et V4 :
- 1 partie blind (tester sans guide), noter les frictions
- 1 partie speedrun (combien de prestiges en 4 h ?)
- 1 partie idle pure (laisser tourner 8 h, mesurer la progression)


## Zones sans fin (US 18)

Les 5 zones écrites à la main sont des **thèmes**. Au-delà, on reboucle en montant d'un **cycle** :
zone 6 = « Forêt Sombre II », zone 11 = « Forêt Sombre III »…

```
theme(n) = ((n - 1) mod 5) + 1
cycle(n) = floor((n - 1) / 5) + 1
échelle(n) = 7.1 ^ (5 × (cycle(n) - 1))        // appliquée aux PV ET à l'or
```

**7,1** n'est pas choisi : c'est le facteur relevé sur la progression écrite à la main (700 → 5 000 →
35 000 → 250 000 → 1 800 000). Le raccord de cycle (zone 5 → 6) donne ×7,02, donc aucune marche. Un
test vérifie que le ratio reste dans [6 ; 9] sur 20 zones consécutives.

### Échos — le puits de Gloire sans fin

Une branche **entièrement acquise** ouvre son Écho, achetable indéfiniment :

```
coût(niveau) = 1000 × 1.5^niveau     effet = +25% (additif) sur la stat de la branche
```

Nécessaire, pas décoratif : un joueur profond gagne plus que l'Arbre entier (8 008 Gloire) en un run.

### Affichage des grands nombres

Au-delà du million, `formatNumber()` abrège : `1,8 M`, `228 Md`, `4,1 P`, puis `1,2×10^30`. Test de
garde : aucune valeur affichée ne dépasse 12 caractères sur 30 cycles de profondeur — DESIGN classe
en anti-pattern les « chiffres en 10^20+ » illisibles.

## Biomes (US 20)

Difficulté **choisie** avant chaque Croisade. Dimension orthogonale aux zones : le biome multiplie les
PV de tous les ennemis du run, et bonifie d'autant l'or et la Gloire.

| Biome | Ennemis | Butin / Gloire | Ouvert à | Règle signature |
|---|---|---|---|---|
| 🌿 Terres de Croisade | ×1 | ×1 | — | aucune |
| 🥀 Terres Maudites | ×5 | ×2,2 | zone 5 | **Profusion** : 2 reliques par boss, +50% de vagues |
| 🌑 Royaume des Ombres | ×25 | ×4,8 | zone 7 | **Disette** : or ÷2, reliques +2 crans de rareté |
| 🩸 Abîme Écarlate | ×125 | ×10,5 | zone 9 | **Bain de Sang** : Cri ×2 durée / ÷2 cooldown, recrutement ×2 |
| 🕳️ Néant | ×625 | ×23 | zone 11 | **Vacuité** : aucune relique, Gloire ×1,5 |

Chaque biome a aussi **son propre bestiaire** : 5 zones nommées, leurs mobs, leurs boss, leurs décors.
Aucun nom n'est réutilisé d'un biome à l'autre (test).

> **Ce qui garantit l'équilibre malgré la variété : un barème COMMUN.** `ZONE_TEMPLATE` (content.js)
> porte toutes les valeurs — vagues, PV, or. Les bestiaires ne portent que des noms et des visuels. Un
> biome ne *peut pas* devenir accidentellement plus dur ou plus rentable que sa fiche ne l'annonce ; un
> test compare les cinq biomes valeur par valeur.

Chaque règle a un **contrepoids** (test), et n'utilise que des leviers déjà présents dans la boucle :
vagues, nombre de drops, qualité, coût des troupes, Cri de Guerre, Gloire. Aucune mécanique de combat
neuve, donc rien qui puisse dériver en silence.

### Paliers de rareté

| Palier | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| Commun | 70 | 60 | 50 | 40 | 32 | 25 |
| Rare | 25 | 32 | 39 | 45 | 48 | 50 |
| Légendaire | 5 | 8 | 11 | **15** | 20 | **25** |

L'Arbre plafonne au palier **3**. Les paliers 4 et 5 n'existent que par la règle **Disette** — sans
quoi elle n'aurait aucun effet sur un joueur ayant déjà maxé la branche Reliques.

### Profils mesurés (même arbre, sortie zone 5)

| Biome | Durée | Vagues | Or | Gloire |
|---|---|---|---|---|
| 🌿 | 5 min | 70 | 1,6 M | +199 |
| 🥀 | 19 min | **105** | 4,1 M | +538 |
| 🌑 | 74 min | 70 | 3,9 M *(or bridé)* | +478 |
| 🩸 | 201 min | 70 | 16,9 M | +2 091 |
| 🕳️ | 468 min | 70 | 37,0 M | +4 581 |

> ⚠️ **Piège d'implémentation (deux fois rencontré).** `zoneOf(n)` doit recevoir le biome en
> **argument**, pas le lire dans son corps : sinon Svelte ne voit pas la dépendance et `$: zone` garde
> le bestiaire précédent — les ennemis étaient corrects (spawn impératif) mais le nom de zone et le
> nombre de vagues, non. Et `biome` doit être déclaré **avant** `enemy`, puisque son initialisation
> appelle `zoneOf`.

**Invariant : `rewardMult < hpMult`.** Si la récompense montait aussi vite que la difficulté, monter
serait toujours gagnant et le choix disparaîtrait. Le gain vient de ce qu'un joueur fort traverse la
difficulté plus vite qu'elle ne monte. Un test le verrouille.

### Ce que la mesure a tranché

Le rendement instantané d'un run (Gloire/min) donne un optimum **incohérent** (B1 → B2 → B1 selon le
palier d'arbre). La bonne métrique est la **progression cumulée sur une série de cycles**. Sur 12
Croisades :

| Stratégie | Temps de jeu | Arbre atteint | Gloire cumulée |
|---|---|---|---|
| Rester en 🌿 | 160 min | **28/50** | 1 520 |
| Monter dès que possible | 275 min | **41/50** | 3 868 |

Monter coûte +72% de temps et rapporte +154% de progression : arbitrage réel. Et **rester dans le
premier biome plafonne l'Arbre à 28/50** — on ne peut pas le terminer sans monter, ce qui donne au
biome un rôle structurel et pas décoratif.

Facteur testé de ×2,2 à ×2,8 ; au-delà de 2,5 monter devient évident et le choix s'efface.

> ⚠️ **Piège d'implémentation.** Le multiplicateur du biome doit être lu depuis le **primitif**
> (`biomeEffects(biome)`) et jamais depuis un dérivé `$:` : `doPrestige()` et `hydrate()` changent
> `biome` puis appellent `spawnNextEnemy()` dans le même tour synchrone, où un dérivé n'est pas encore
> recalculé. Symptôme : le premier ennemi du run sort avec les PV du biome précédent. Aucun test
> unitaire ne l'attrape — c'est le pilotage navigateur qui l'a montré.

## Combat vivant (US 22)

### Types et affinités

Cinq natures : 🐾 Bête · 💀 Mort-vivant · 😈 Démon · 🌑 Ombre · 🗿 Construct. **Le type est porté par la
ZONE**, pas par la créature : la consigne tactique doit être lisible d'un coup d'œil.

| Tier | Fort (×1,5) | Faible (×0,7) |
|---|---|---|
| Paysan | Bête | Construct |
| Soldat | Mort-vivant | Ombre |
| Chevalier | Démon, Construct | Bête |
| Champion | Ombre, Démon | — |

À dps nominal identique, l'écart entre la meilleure et la pire composition va de **×1,43 à ×2,14**.
L'armée équilibrée n'est jamais optimale ni catastrophique : arbitrage spécialisation / polyvalence.

### Armure

Pourcentage encaissé, issu du **barème commun** : mobs 0→20%, boss 15→55%. Plafond absolu **80%**,
plancher de **1 dégât** — aucun ennemi n'est mathématiquement invincible.

### Critiques

Base **8%**, ×3 dégâts, **armure ignorée**. C'est l'interaction qui fait le sel :

| Armure | Sans crit | 30% de crit | Gain |
|---|---|---|---|
| 0% | 12 000 | 19 200 | ×1,60 |
| 45% | 6 600 | 15 420 | ×2,34 |
| 55% | 5 400 | 14 580 | **×2,70** |

Trois reliques portent un effet `crit` (+3 base, +18 en légendaire), réparties sur trois slots pour ne
pas se concurrencer. Elles ajoutent des **points**, jamais un pourcentage relatif.

> Le dps **affiché** est `averageHit` (espérance), pas le dernier tirage : un joueur compare ses achats,
> il a besoin d'une valeur stable. Un test vérifie que 20 000 tirages convergent à moins de 5%.

## Rôles de troupes (US 24)

Chaque tier apporte une capacité passive à l'armée, en plus de son dps. Avant, seuls `dps` et
`baseCost` les distinguaient : monter en tier était « plus fort », jamais « autre chose ».

| Tier | Rôle | Effet | Seuil | Plafond | Effectif pour plafonner |
|---|---|---|---|---|---|
| 🌾 Paysan | Marée humaine | +1 pt de critique | 25 | +25 | 625 |
| ⚔️ Soldat | Discipline | +1% dégâts d'armée | 5 | +50% | 250 |
| 🐎 Chevalier | Charge | +1 pt de pénétration | 1 | 40 | 40 |
| 🛡️ Champion | Étendard | +0,25 au ×critique | 1 | +3 | 12 |

**Seuils** pour que la progression se voie arriver, **plafonds** pour qu'aucun rôle ne casse le jeu.
Les deux sont testés, ainsi que l'atteignabilité réelle des plafonds.

La **pénétration** retire des points d'armure avant calcul (jamais négative) ; elle est distincte de
`ignoreArmor` (actif Percée, critiques) qui annule tout.

### Ce que ça récompense — boss à 55% d'armure, type Démon

| Composition | dps nominal | sans rôles | avec rôles | gain |
|---|---|---|---|---|
| tout paysans (600) | 1 200 | 785 | 1 519 | ×1,94 |
| tout soldats (150) | 1 800 | 1 177 | 1 530 | ×1,30 |
| tout chevaliers (45) | 6 750 | 6 622 | 10 348 | ×1,56 |
| mixte pensé | 5 310 | 4 699 | 9 668 | **×2,06** |
| mixte + 8 champions | 21 310 | 20 395 | 56 432 | **×2,77** |

Le gain va à la composition, pas à l'empilement — d'où l'absence de recalibrage malgré un premier run
qui passe de 25:56 à 22:18 : un joueur qui empile un seul tier reste au niveau d'avant.

## Deux niveaux de progression, deux rôles (US 25)

| | Payé en | Portée | Survie au prestige |
|---|---|---|---|
| 🏰 **Arbre de Gloire** | Gloire | effets **globaux** et structurels | conservé |
| ⚒ **Améliorer les troupes** | or | **propre à un tier** | perdu |

Avant US 25, les améliorations en or comptaient deux lignes transverses (« Bannière » +10% dégâts
globaux, « Pillage » +15% or) qui faisaient doublon avec l'Arbre : deux systèmes au même niveau de
lecture, aux mêmes effets, l'un temporaire et l'autre permanent. Retirées. **Un test verrouille
l'invariant** : plus aucune ligne payée en or n'a d'effet transverse.

À leur place : **📖 Doctrine** (3 niveaux, ×1,5) qui amplifie le **rôle** du tier — seul levier du jeu
sur les rôles. Elle amplifie l'apport *et le plafond*, sinon elle serait inutile sur un rôle déjà maxé.

### Critiques dans l'Arbre

La Voie du Cor (branche Guerre) est devenue la **Voie de la Précision** :

| Palier | Nœud | Effet |
|---|---|---|
| 3 | Précision | +5 pts de critique |
| 4 | Souffle Court | −15% cooldown des actifs |
| 5 | Œil Aiguisé | +7 pts de critique |
| 6 | Coup Fatal | +1 au multiplicateur de critique |

Plus « Main Chanceuse » (+6 pts) dans la Voie de la Chance, branche Reliques. Total arbre complet :
**+18 points, +1 au multiplicateur**, bornés par test (≤ 30 pts, ≤ +3) — un critique doit rester un
événement.

Conséquence : aucun nœud ne fournit plus de durée de Cri, `warCryDurationMult` a donc disparu de
`treeEffects`. Le seul levier restant est la règle de biome « Bain de Sang ».

## Amélioration des reliques (US 26)

Deux voies, volontairement différentes :

| | Voie | Coût | Effet | Nature |
|---|---|---|---|---|
| 🔨 | **Forger** | or : 2 000 / 12 000 / 80 000 selon la rareté, ×3 par niveau | +15% de l'effet, 5 niveaux | continue |
| ⚗️ | **Fusionner** | 3 exemplaires identiques | rareté supérieure | par palier |

La fusion donne enfin un **usage aux doublons**, qui n'étaient que fondus en or par le cap d'inventaire.

**Deux garde-fous anti-frustration** : la fusion consomme d'abord les exemplaires les moins forgés, et
le résultat hérite du meilleur niveau parmi les consommés. Investir dans une relique ne peut jamais se
retourner contre le joueur.

### Bornes d'équilibre

Une relique forgée à fond vaut **×1,75** de sa valeur brute — testé sur chaque définition. Pas un ordre
de grandeur, donc aucun réétalonnage de la courbe.

Second plafond, **par nature d'effet** : ≤ 70% de dégâts, ≤ 120% d'or, ≤ 35 pts de critique par slot.
Un même pourcentage ne pèse pas pareil selon ce qu'il majore — +105% d'or est sain, +105% de dégâts ne
le serait pas. C'est ce découpage qui a corrigé une première borne posée sur la valeur brute.

> Ces bornes par slot sont vraies mais **ne disent rien d'exploitable** : on n'en déduit pas ce que
> vaut un stuff. La borne qui compte est mesurée en run — **×5,09** pour un stuff maximal patiné —
> et vit désormais dans [le banc des invariants](#le-banc-des-invariants-us-46).

> ~~Le simulateur ne modélise pas les reliques.~~ Il les modélise depuis longtemps, Patine comprise
> depuis l'US 45, et le banc d'US 46 mesure leur plafond en durée de run.

Effets de bord traités : le cap d'inventaire trie sur l'effet réel (niveaux compris), et la fonte rend
davantage sur une relique forgée.

