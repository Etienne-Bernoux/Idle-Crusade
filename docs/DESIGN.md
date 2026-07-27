# Design — Équilibrage et courbes

> Document vivant. Les chiffres sont des points de départ, à ajuster en V3 (premier équilibrage) puis V4 (polish).

**Écarts constatés entre ce cadrage et le jeu livré** (V2) — le code est la source de vérité :

| Sujet | Cadrage ici | Livré | Verdict |
|---|---|---|---|
| Cri de Guerre — cooldown | 60 s | **25 s** | volontaire (US 10 : 60 s rendait l'actif oubliable) |
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
dps(n) = baseDps × n × global_multiplier
```

`global_multiplier` = produit des multiplicateurs (Reliques, Forge, Gloire).

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
gloire(zones_clear) = floor(sqrt(zones_clear × 10))
```

| Zones clear | Gloire gagnée |
|-------------|---------------|
| 1           | 3             |
| 3           | 5             |
| 5           | 7             |
| 10          | 10            |
| 20          | 14            |
| 50          | 22            |

### Coût des meta-upgrades (Forge de Gloire)

Quadratique pour décourager le mono-stack :

```
cost(level) = baseCost × (level + 1)^2
```

| Upgrade               | Base | Niv. 1 | Niv. 5  |
|-----------------------|------|--------|---------|
| +10% dégâts (par niv) | 5    | 5      | 125     |
| +10% Or (par niv)     | 5    | 5      | 125     |
| +5% vitesse (par niv) | 8    | 8      | 200     |
| −5% CD actifs         | 12   | 12     | 300     |
| Qualité drops         | 15   | 15     | 375     |
| Débloquer Champion    | 50   | one-shot |       |

> Effets multiplicatifs entre upgrades, additifs au sein d'une même upgrade.

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
