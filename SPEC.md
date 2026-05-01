# Croisade — Spec

> Idle game habillé en combat médiéval. Cadrage initial, vivant, à itérer.

---

## Vision en une phrase

Tu construis ton armée, elle se bat toute seule contre des hordes médiévales, tu pushes vers de nouvelles zones, et tu pars en croisade pour reset et devenir plus fort à chaque cycle.

---

## Pillars

1. **L'idle est central.** Le combat est le moteur narratif et le sink de progression, pas le cœur du gameplay.
2. **Pas de tactique.** Auto-battler simple, 1 ou 2 actions actives au plus.
3. **La satisfaction du prestige.** Reset = puissance, le hook long terme.
4. **Léger et autonome.** Site statique, déployable en un push sur GitHub Pages.

---

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

---

## Mécaniques

### Ressources

- **Or** : monnaie principale, courante. Reset au prestige.
- **Reliques** : équipement permanent (drop boss). Conservées au prestige.
- **Points de Gloire** : monnaie de prestige. Permanents.

### Troupes (tiers)

| Tier | Nom        | Coût base | Dégâts/sec | Notes |
|------|------------|-----------|------------|-------|
| 1    | Paysan     | 10        | 1          | Spammable, scale en quantité |
| 2    | Soldat     | 100       | 12         | Mid-tier, recrutable après zone 2 |
| 3    | Chevalier  | 1 000     | 150        | Débloqué après le 1er boss |
| 4    | Champion   | 10 000    | 2 000      | Endgame, débloqué via Gloire |

> Tous les coûts/scalings sont à équilibrer plus tard. Croissance type ×1.15 par unité achetée (Cookie Clicker style).

### Combat

- Auto-battler tick à 1 Hz (ou 10 Hz pour la fluidité visuelle).
- Stats agrégées de tes troupes (DPS total) vs HP de la cible.
- Cible = vague de mobs ou boss. Vague morte → vague suivante. Boss mort → zone débloquée.
- Mort possible sur les boss → pénalité = perte de progression dans la zone (~30s).

### Actifs (cliquables)

- **Cri de guerre** : ×2 dégâts pendant 10s. Cooldown 60s.
- **Potion de soin** : restaure les PV de l'armée. 1 charge, régen 90s.

### Zones

- Progression linéaire : Forêt Sombre → Ruines → Château Hanté → Cathédrale → … (TBD).
- Chaque zone a un nombre de vagues + 1 boss.
- HP/loot scale exponentiellement par zone.

### Prestige (Croisade)

- Disponible après avoir battu le boss de la zone N (à définir, ex : zone 5).
- Reset : Or, Troupes, Progression de zones.
- Conservé : Reliques, Points de Gloire, upgrades meta achetés.
- Gain : Points de Gloire = f(zones complétées avant croisade).
- Meta-upgrades dépensables en Gloire :
  - +X% dégâts globaux
  - +Y% drops d'or
  - Vitesse d'auto-attaque
  - Débloquer un nouveau tier de troupes
  - Réduire cooldowns des actifs

---

## Stack technique

- **Vite + TypeScript + Svelte** (au plus économe en boilerplate pour un truc réactif)
- Persistance : `localStorage` (pas de backend)
- Déploiement : GitHub Pages via GitHub Action (`actions/deploy-pages`)
- Pas d'assets lourds : SVG inline ou emojis pour la V1, sprites plus tard si besoin

> Alternative envisagée : un seul `index.html` autonome (zéro build). À trancher au moment d'attaquer la V1.

---

## Découpage en jalons

### V0 — Mockup statique (en cours)
- [x] Cadrage / spec
- [x] Maquette HTML statique pour valider le feel visuel

### V1 — MVP jouable
- [ ] Setup Vite + Svelte
- [ ] Boucle minimale : 1 type de troupe, 1 zone, 1 boss
- [ ] Sauvegarde localStorage
- [ ] Tick de combat fonctionnel
- [ ] Déploiement GitHub Pages

### V2 — Profondeur
- [ ] 4 tiers de troupes
- [ ] 5 zones + bosses
- [ ] 2 actifs (Cri, Potion)
- [ ] Reliques (loot boss)

### V3 — Prestige
- [ ] Mécanique de croisade
- [ ] Points de Gloire + meta-upgrades
- [ ] Équilibrage de la courbe

### V4+ — Polish
- [ ] Sons / feedbacks
- [ ] Animations
- [ ] Achievements
- [ ] Plus de zones / mécaniques (events, classes…)

---

## Décisions à trancher plus tard

- Tour par tour visuel ou flux continu ?
- Stat HP de l'armée → faut-il une régen passive ?
- Skill tree en plus des meta-upgrades ?
- Multi-armées (plusieurs combats en parallèle) ?
- Mobile-first ou desktop d'abord ?

---

## Notes de collaboration

Suivre la méta-règle de `Claude.md` du dossier parent :
- Cadrage en ping-pong, pas de cahier des charges d'un bloc
- Etienne écrit le use case, Claude challenge
- ~50 lignes max par itération de code
- Avant de coder : "Tu écris ou je propose ?"
