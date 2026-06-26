---
title: "feat: US 11 — Zone 3 (Château Hanté) + tier Chevalier"
type: feat
status: active
date: 2026-06-16
---

# US 11 — Zone 3 (Château Hanté) + Chevalier

Étendre le contenu : une 3e zone + débloquer le tier Chevalier. **Data-driven** : la logique (spawn, transition, hasNext, déblocage) est déjà zone/troupe-agnostique → on ajoute une entrée `zones[3]` et on passe `chevalier.unlockZone` de 99 à 3. Cycle court : **une** zone (vérifiable par playthrough), zones 4-5 ensuite.

## Décisions
- Zone 3 = **Château Hanté** (SPEC). Mobs/boss thématiques (fantômes, armures, vampire). bg pierre froide/violet.
- **Chevalier** débloqué après le boss des Ruines (`zonesUnlocked >= 3`), dps 150, coût 1000 (SPEC).
- Échelle ~×7 sur la zone 2 (méthodo US 10 : saut cohérent, viser la courbe sans actif/relique).

## Critères d'acceptation
- [ ] **CA1** `zones[3]` (Château Hanté) : 14 vagues, 5 mobs thématiques, boss nommé, bg distinct.
- [ ] **CA2** Battre le boss des Ruines → transition cinématique vers Château Hanté (réutilise la méca existante), `zonesUnlocked → 3`.
- [ ] **CA3** **Chevalier** passe `unlocked` à `zonesUnlocked >= 3` : carte recrutable (+150 dps, coût 1000 ×1.15). Avant : grisée « Bats le boss des Ruines ».
- [ ] **CA4** Échelle zone 3 ≈ ×7 sur zone 2 (mobs ~3000, boss ~35000) → étape nette mais franchissable en recrutant des Chevaliers ; **pas de soft-lock**.
- [ ] **CA5** Boss zone 3 → pas de zone 4 encore → loop + toast « CHÂTEAU HANTÉ VAINCU » (méca dernière zone existante).
- [ ] **CA6** Catch-up traverse zone 2→3 sans écran ; save/hydrate OK (currentZone 3 persiste) ; **desktop + mobile**.

## Décisions techniques (data only, `src/App.svelte`)
- `zones[3]` : `name: 'Château Hanté'`, `bg` gradient violet/pierre, `waves: 14`, mobs (~2600-4000), boss (~35000).
  - mobs (ex.) : Armure Hantée 🛡️ 3000/180, Fantôme Hurlant 👻 2600/150, Gargouille 🗿 4000/260, Chauve-souris Géante 🦇 2400/140, Corbeau Maudit 🐦‍⬛ 3200/200.
  - boss : Comte Vampire 🧛 35000/7000.
- `TROOPS.chevalier` : `unlockZone: 99 → 3`, `hint: 'Bientôt…' → 'Bats le boss des Ruines'` (dps 150, baseCost 1000 inchangés).
- **Rien d'autre** : spawn/transition/hasNext/troopRows consomment déjà les catalogues.

## Étapes
1. Ajouter `zones[3]` + régler `chevalier.unlockZone/hint`. Build + `npm test` (vert, data only).
2. **Playthrough** (dps boosté pour atteindre zone 3 vite) : transition Ruines→Château OK, nouveaux mobs/boss/bg, **Chevalier déverrouillé + recrutable** (+150 dps visible), boss zone 3 → toast, pas de soft-lock. Reload conserve zone 3. Vérif **mobile** (nouvelle zone, pas de débordement). Revert le boost.
3. Commit (branche `claude/us-11-zone-3-chevalier`), review, compound.

## Hors scope
- Zones 4-5 (US suivante), Champion (reste unlockZone 99 → prestige V3).
- Sprites dédiés (emojis + gradient).

## Gotchas
- **Échelle** : zone 3 ×7 sur zone 2 ; viser sans actif/relique (le ×2 Cri + reliques sont des bonus).
- **Chevalier coût 1000** vs or zone 3 (150-260/mob, 7000 boss) : recrutable en quelques vagues — vérifier (pas de mur infranchissable).
- **Transition réutilisée** : `startZoneTransition(3, relic)` marche (zones[3] existe) ; le boss zone 2 a `hasNext` true maintenant → transition au lieu du toast « vaincu ».
- **Mobile** : nouvelle zone = même layout ; juste revérifier zéro débordement.

## Sources
- SPEC : [SPEC.md](../../SPEC.md) (Zones, Troupes — Château Hanté, Chevalier)
- Patterns : [docs/solutions/patterns/idle-game-tick-and-popups.md](../solutions/patterns/idle-game-tick-and-popups.md) (catalogues, transition, équilibrage)
- Code : [src/App.svelte](../../src/App.svelte) (`zones`, `TROOPS`)
