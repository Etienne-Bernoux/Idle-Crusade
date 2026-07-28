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

`node scripts/simulate.mjs` — joueur rationnel, sans reliques ni Cri de Guerre (le réel est donc un
peu meilleur). Le simulateur est calibré à 3,5 % près contre le jeu piloté dans un navigateur.

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

