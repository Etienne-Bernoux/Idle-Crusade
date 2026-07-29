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

> Le simulateur ne modélise pas les reliques (limite documentée depuis US 15) : l'équilibre repose ici
> sur ces bornes analytiques, pas sur une mesure de run.

Effets de bord traités : le cap d'inventaire trie sur l'effet réel (niveaux compris), et la fonte rend
davantage sur une relique forgée.

