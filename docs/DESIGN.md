# Design — Équilibrage et courbes

> Document vivant. Les chiffres sont des points de départ, à ajuster en V3 (premier équilibrage) puis V4 (polish).

**Écarts constatés entre ce cadrage et le jeu livré** (V2) — le code est la source de vérité :

| Sujet | Cadrage ici | Livré | Verdict |
|---|---|---|---|
| Cri de Guerre — cooldown | 60 s | **25 s** | volontaire (US 10 : 60 s rendait l'actif oubliable), réductible par l'Arbre |
| Potion de Soin | Heal full armée | bouton inerte | bloqué : l'armée n'a pas de PV (cf. SPEC § Actifs) |
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
gloire(vagues_vaincues) = floor(10 × sqrt(vagues_vaincues))
```

| Vagues vaincues | Gloire gagnée | Repère |
|-----------------|---------------|--------|
| 25              | 50            | abandon en zone 3 |
| 70              | 83            | clear des 5 zones (10+12+14+16+18) |
| 140             | 118           | + un farm de l'Enfer |
| 500             | 223           | gros farm |

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

**Limite connue : la boucle plafonne vers 9-12 min.** Avec 5 zones, un run bat toujours 70 vagues,
donc le gain reste constant alors que le coût des upgrades est quadratique : la progression meta
ralentit jusqu'à l'arrêt. Rendre la boucle infinie demande une dimension extensible (zones au-delà de
l'Enfer, ou un rebouclage de l'Enfer plus dur et plus rémunérateur). Décision ouverte — voir
`docs/plans/2026-07-27-003-feat-us-15-prestige-balance-plan.md`.

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

| Actif           | Effet               | Durée  | Cooldown |
|-----------------|---------------------|--------|----------|
| Cri de Guerre   | ×2 dégâts           | 10 s   | 60 s     |
| Potion de Soin  | Heal full armée     | instant| 90 s     |

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
