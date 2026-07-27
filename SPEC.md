# Idle Crusade — Spec produit

> Idle game de combat médiéval en navigateur. Statique, déployé sur GitHub Pages :
> <https://etienne-bernoux.github.io/Idle-Crusade/>
>
> Ce document décrit **le quoi et le pourquoi**. Le découpage en versions et leur état vivent dans
> [docs/ROADMAP.md](docs/ROADMAP.md), les tickets dans [docs/BACKLOG.md](docs/BACKLOG.md),
> les formules d'équilibrage dans [docs/DESIGN.md](docs/DESIGN.md), et les plans d'implémentation
> par US dans [docs/plans/](docs/plans/).

## Vision en une phrase

Tu construis ton armée, elle se bat seule contre des hordes médiévales. Tu pushes vers de nouvelles zones, tu loots des reliques sur les boss, et tu pars en croisade pour reset et devenir plus fort à chaque cycle.

## Pillars

1. **L'idle est central.** Le combat est le moteur narratif, pas le cœur tactique du gameplay.
2. **Pas de tactique.** Auto-battler simple, 1 ou 2 actions actives au plus.
3. **La satisfaction du prestige.** Reset = puissance, le hook long terme.
4. **Statique et autonome.** Site statique sans backend, déployé sur GitHub Pages.

## Boucle de gameplay

```
Paysans (production passive) ──> Or
Or ──> recrute Soldats / Chevaliers / Champions (tiers)
Troupes ──> combattent en auto la zone actuelle ──> drop Or + XP de zone
XP de zone ──> débloque la zone suivante (forêt → ruines → château → ...)
Boss de fin de zone ──> drop Reliques (équipement permanent)
[Prestige] Croisade ──> reset Or/Troupes/Zones, conserve Reliques + Points de Gloire
Points de Gloire ──> upgrades meta permanents
```

## Mécaniques

### Ressources

| Ressource           | Description                              | Reset au prestige ? |
|---------------------|------------------------------------------|---------------------|
| Or                  | Monnaie principale, drop des combats     | Oui                 |
| Reliques            | Équipement permanent (drop boss)         | Non                 |
| Points de Gloire    | Monnaie de prestige                      | Non                 |

### Troupes

Quatre tiers, débloqués progressivement. Chaque achat fait monter le coût (×1.15 par unité, façon Cookie Clicker).

| Tier | Nom        | Coût base | DPS de base | Déblocage                          |
|------|------------|-----------|-------------|------------------------------------|
| 1    | Paysan     | 10        | 2           | Disponible dès le départ            |
| 2    | Soldat     | 100       | 12          | Après avoir clear la zone 1         |
| 3    | Chevalier  | 1 000     | 150         | Après le 1er boss (zone 2)          |
| 4    | Champion   | 10 000    | 2 000       | Achat avec Points de Gloire (V3+)   |

> Les nombres sont des bases pour le design ; l'équilibrage chiffré final vit dans `docs/DESIGN.md`.

### Combat

- Auto-battler. Tick logique : **1 tick / 800 ms** (animations en CSS, indépendantes). Un catch-up tick rattrape les ticks dus quand l'onglet a été throttlé.
- Stats agrégées de l'armée (DPS total) vs PV de la cible.
- Cible = vague de mobs (3-5 mobs), puis boss en fin de zone.
- Vague morte → vague suivante (fade out / respawn).
- Boss mort → zone débloquée + drop de Relique aléatoire.
- L'armée n'a pas de PV (on simplifie). Mort possible uniquement dans les modes futurs.

### Actifs

Cliquables, à effet immédiat ou court, avec cooldown.

| Actif | Effet | Durée | Cooldown | Ouvert à |
|---|---|---|---|---|
| 📯 Cri de Guerre | ×2 dégâts | 10 s | 25 s | zone 1 |
| 🧪 Potion de Rage | +40 points de critique | 8 s | 40 s | zone 2 |
| 🗡️ Percée | ignore l'armure | 12 s | 50 s | zone 3 |
| 💰 Ferveur | ×3 or | 15 s | 60 s | zone 4 |

> **La Potion de Soin est retirée (US 23).** Elle promettait de restaurer des PV que l'armée n'a pas
> (cf. § Combat) ; lui en donner aurait introduit la mort, donc le soft-lock, dans un jeu conçu sans.
> Remplacée par la Potion de Rage, qui exploite les critiques d'US 22.

Chaque actif exploite un levier **différent** (dégâts, critique, armure, économie) et se débloque à un
palier distinct. Les nœuds « cooldown des actifs » de l'Arbre portent sur tous ; les bonus de durée du
Cri ne portent que sur lui.

### Zones

Progression linéaire. Chaque zone = N vagues + 1 boss.

| #  | Zone               | Vagues | PV / vague | PV boss | Or / vague |
|----|--------------------|--------|------------|---------|------------|
| 1  | Forêt Sombre       | 10     | 50         | 500     | 5          |
| 2  | Ruines             | 12     | 300        | 3 000   | 25         |
| 3  | Château Hanté      | 14     | 1 800      | 18 000  | 100        |
| 4  | Cathédrale Profanée| 16     | 11 000     | 110 000 | 400        |
| 5  | Enfer              | 18     | 65 000     | 650 000 | 1 500      |

> Scaling : ×6 par zone sur PV/Or. Voir `docs/DESIGN.md` pour la formule.
>
> ⚠️ Cette table est le **cadrage initial**, pas la vérité. Les 5 zones sont livrées mais leurs
> valeurs ont bougé à l'implémentation (le boss de l'Enfer est à 1,8 M PV, pas 650 k). Les chiffres
> vivants sont le catalogue `ZONES` dans `src/lib/content.js` — on ne les recopie pas ici pour éviter
> deux sources de vérité.
>
> **Depuis US 18, ces 5 zones ne sont plus la fin du jeu mais des *thèmes* qui rebouclent en
> profondeur** : zone 6 = « Forêt Sombre II », etc. Il y a toujours une zone suivante. Voir
> `docs/DESIGN.md` § Zones sans fin.

### Reliques

- Drop garanti à la mort du boss de zone.
- Pool aléatoire pondéré (commun / rare / légendaire).
- Effets : +X% dégâts globaux, +Y% Or, −Z% cooldowns, etc.
- Équipables : 4 slots (Arme, Armure, Bannière, Amulette).
- Conservées au prestige.

### Prestige (Croisade)

- Disponible dès qu'on a battu le boss de la zone 5.
- Reset : Or, Troupes, Progression de zone, Reliques équipées (pas l'inventaire de Reliques).
- Conservé : Reliques (en inventaire), Points de Gloire, meta-upgrades.
- Gain de Gloire : `floor(sqrt(zones_clear × 10))`. À ajuster.
- Meta-upgrades dépensables en Gloire :
  - +X% dégâts globaux
  - +Y% drops d'or
  - Vitesse d'attaque +Z%
  - Débloquer le tier Champion
  - Réduire cooldowns des actifs
  - Augmenter la qualité des drops Reliques

### Save

- Format : JSON sérialisé, stocké en `localStorage` sous la clé `croisade.save`. ✅
- Autosave toutes les **10 s** (le cadrage disait 5 s), + une sauvegarde sur `beforeunload`. ✅
- Bouton manuel "Exporter / Importer" (texte base64 copiable) : **non fait**, reporté.
- Versionning du save (`SAVE_VERSION = 1`) avec défauts pour les champs absents (forward-compat). ✅

## Glossaire

- **DPS** : dégâts par seconde de l'armée agrégée.
- **Tick** : pas logique du moteur de jeu, un toutes les 800 ms.
- **Vague** : groupe de mobs entre deux respawns.
- **Boss** : ennemi unique en fin de zone, drop garanti.
- **Croisade** : nom du prestige.
- **Gloire** : monnaie meta du prestige.
- **Relique** : équipement permanent à effets passifs.

## Hors-périmètre (V1-V4)

- Multijoueur / leaderboards
- Versions mobiles natives
- Synchronisation cloud
- Microtransactions
- Audio / musique de fond (peut arriver en V4 polish, pas avant)
