# Backlog

Tickets découpés par version. Format : ID, titre, priorité (P0=must / P1=should / P2=nice), taille (S/M/L), tags.

Conventions :
- Un ticket = un commit (ou une PR) cohérent
- Les tickets P0 d'une version doivent être faits avant de passer à la suivante
- Les dépendances sont notées explicitement

> **État au 29/07/2026.** Ce backlog a été écrit avant le début du dev et n'a jamais servi de plan
> d'exécution : le découpage réellement livré est celui des **US 0 → 33**, tracé dans
> [plans/](plans/) et dans l'historique git. Les sections **V1, V2 et V3 ci-dessous sont livrées**
> et ne sont conservées que pour mémoire — y compris V3, dont les tickets V3-01 → V3-07 décrivent
> une Forge plate que l'implémentation a remplacée par l'Arbre de Gloire.
>
> Les **11 US postérieures à V3** (14, 16 → 26) ne figurent nulle part ici : elles sont nées en
> cours de route. Leur récapitulatif tient dans [ROADMAP.md](ROADMAP.md) § V3+.
>
> **Le seul contenu actionnable de ce fichier est donc la section V4**, plus les quelques reliquats
> V1/V2 listés ci-dessous.

## Reliquats encore ouverts

- **V1-13** ~~achat ×10 / max~~ → **livré** par l'US 14.
- **V2-05** · `[P1/S/content]` Sélecteur de zone (revenir farmer une zone clear) — **à requalifier** :
  l'US 18 a rendu les zones sans fin, donc « revenir en arrière » n'a plus le même sens qu'au cadrage.
- **V2-12** · `[P1/S/ui]` Tooltip de relique — partiellement couvert : l'US 26 affiche les bonus des
  reliques équipées dans le panneau.
- ~~**V2-16** Export / Import save~~ → **livré** par l'US 33 (écran de Réglages, code
  `IDLECRUSADE1:` en base64, aperçu de la partie avant écrasement).
- **V2-18** · `[P2/S/ui]` Réglages du tick — jamais fait, faible valeur.

---

## V1 — MVP jouable ✅ livré

### Setup

- **V1-01** · `[P0/S/setup]` Init projet Vite + Svelte + TypeScript
  - `npm create vite@latest`, structure src/, eslint + prettier
- **V1-02** · `[P0/S/deploy]` GitHub Action de déploiement sur GitHub Pages
  - Workflow `pages.yml`, build + deploy sur push main
  - Vérifier l'URL de prod accessible
- **V1-03** · `[P0/S/setup]` Intégration des sprites validés en V0
  - Copier `assets/sprites/*.png` dans `public/sprites/`
  - Helper `<Sprite name="paysan" />`

### State & save

- **V1-04** · `[P0/M/core]` Définition du modèle de state TypeScript
  - Types : `GameState`, `Troop`, `Zone`, `Resources`
  - Voir `docs/ARCHITECTURE.md` section "Save format"
- **V1-05** · `[P0/M/core]` Svelte stores : `gameStore`, `combatStore`
  - Store principal + dérivés (DPS calculé, coût prochaine troupe)
- **V1-06** · `[P0/M/core]` Sauvegarde / chargement localStorage
  - Autosave toutes les 5 s
  - Load au démarrage, fallback sur état initial si corrompu
  - Versionning du save (`saveVersion: 1`)

### Boucle de combat

- **V1-07** · `[P0/M/combat]` Game loop à 10 Hz (`setInterval`)
  - Calcul des dégâts du tick : `dps_total / 10`
  - Application sur la cible courante
- **V1-08** · `[P0/M/combat]` Modèle de zone : vagues + boss
  - 1 zone (Forêt Sombre), 10 vagues, 1 boss
  - Transitions vague → vague, vague 10 → boss
- **V1-09** · `[P0/M/combat]` Mort de cible : respawn ou progression
  - Mob mort → next wave
  - Boss mort → zone "completed" (pas encore d'unlock zone 2 en V1)
- **V1-10** · `[P1/S/combat]` Drop d'or par mob/boss
  - Or ajouté aux ressources, calcul affiché en HUD

### Recrutement

- **V1-11** · `[P0/M/economy]` Coût d'une troupe (formule ×1.15)
  - `cost = base × 1.15^owned`
  - Affichage du coût courant dans la caserne
- **V1-12** · `[P0/S/economy]` Action "Recruter Paysan"
  - Décrément Or, incrément count, recalcul DPS
- **V1-13** · `[P1/S/ui]` Bouton "Acheter ×10 / max" (QoL)

### UI minimale

- **V1-14** · `[P0/M/ui]` Layout : header (ressources) + main (combat) + sidebar (caserne)
  - Reprendre le mockup HTML, le porter en composants Svelte
- **V1-15** · `[P0/M/ui]` Composant `BattleScene` (armée + ennemi + HP bar)
  - Animations CSS reprises du mockup
- **V1-16** · `[P0/S/ui]` Composant `Caserne` avec 1 carte de troupe
- **V1-17** · `[P1/S/ui]` Damage popups dynamiques

### Tests / qualité

- **V1-18** · `[P1/S/tests]` Tests unitaires sur les formules (cost, dps)
  - Vitest, 1 fichier
- **V1-19** · `[P2/S/qa]` Pass manuel : check qu'on clear la zone en <10 min

---

## V2 — Profondeur ✅ P0 livrés

> **V2-14** (Potion de Soin) est **abandonné**, pas en attente : l'US 23 l'a retiré du jeu et
> remplacé par trois autres actifs. Les reliquats encore ouverts sont remontés en tête de fichier.
> **V2-17** est couvert autrement (popups + toast de victoire, pas de système de toasts générique).

### Troupes

- **V2-01** · `[P0/M/economy]` Ajouter Soldat, Chevalier (et stub Champion)
- **V2-02** · `[P0/S/economy]` Système de déblocage par condition (zone clear, etc.)
- **V2-03** · `[P1/M/ui]` Caserne paginée ou scroll si plus de 4 cartes

### Zones

- **V2-04** · `[P0/M/content]` 4 nouvelles zones (Ruines → Enfer)
- **V2-05** · `[P0/S/content]` Sélecteur de zone (revenir farmer une zone clear)
- **V2-06** · `[P0/M/content]` Sprites des 5 boss (générer via Nano Banana, recette `PROMPTS.md`)

### Reliques

- **V2-07** · `[P0/L/loot]` Système de loot : pool, raretés, drop garanti boss
- **V2-08** · `[P0/M/loot]` Inventaire de Reliques (composant)
- **V2-09** · `[P0/M/loot]` 4 slots équipables (Arme / Armure / Bannière / Amulette)
- **V2-10** · `[P0/M/loot]` Effets passifs des Reliques (multiplicateurs sur stats)
- **V2-11** · `[P0/M/content]` 12 reliques distinctes minimum
- **V2-12** · `[P1/S/ui]` Tooltip de relique (effet, rareté, source)

### Actifs

- **V2-13** · `[P0/M/combat]` Cri de Guerre (×2 dmg 10 s, CD 60 s)
- **V2-14** · `[P0/M/combat]` Potion de Soin (PV armée à introduire)
- **V2-15** · `[P0/S/ui]` Boutons d'actifs avec cooldown visuel

### QoL

- **V2-16** · `[P1/M/save]` Export / Import save (texte base64)
- **V2-17** · `[P1/S/ui]` Notifications toast (relique loot, zone clear)
- **V2-18** · `[P2/S/ui]` Réglages du tick (visuel only, pas le tick logique)

---

## V3 — Prestige ✅ livrée (autrement que décrit)

- **V3-01** · `[P0/L/prestige]` Mécanique Croisade : reset + calcul gain Gloire
  - Formule : `floor(sqrt(zones_clear × 10))`
- **V3-02** · `[P0/M/prestige]` Écran de prestige : preview du gain
- **V3-03** · `[P0/M/prestige]` Confirmation et reset effectif
- **V3-04** · `[P0/M/prestige]` Tier Champion débloquable en Gloire
- **V3-05** · `[P0/L/prestige]` 6 meta-upgrades :
  - +X% dégâts globaux (5 niv.)
  - +Y% drops d'or (5 niv.)
  - +Z% vitesse d'attaque (5 niv.)
  - −W% cooldowns actifs (3 niv.)
  - +V% qualité drops (3 niv.)
  - Débloquer Champion (one-shot)
- **V3-06** · `[P0/M/balance]` Premier passage d'équilibrage de la courbe
  - Premier prestige autour de 1 h, second autour de 30 min
- **V3-07** · `[P1/M/ui]` Compteur "Prestige #N" persistant en HUD

---

## V4 — Polish ⬜ à venir

- **V4-01** · `[P0/M/audio]` Intégration Tone.js ou audio HTML5
- **V4-02** · `[P0/M/audio]` SFX : clic recrutement, swing, hit, mort boss, prestige
- **V4-03** · `[P1/M/audio]` Musique de fond loopable, toggle on/off
- **V4-04** · `[P0/M/anim]` Animations de swing par classe (paysan ≠ champion)
- **V4-05** · `[P1/M/anim]` Particules sur les boss à la mort
- **V4-06** · `[P0/L/achievements]` Système d'achievements
  - 15-20 jalons, sauvegarde dans le save, popup à l'unlock
- **V4-07** · `[P0/M/balance]` Pass d'équilibrage final basé sur retours
- **V4-08** · `[P0/M/ui]` Page d'accueil / pause / settings
  - Volume, reset hard (avec confirmation), version, crédits

---

## Backlog parking (V5+ ou jamais)

- Nouvelle couche de prestige (Légende)
- Skill tree alternatif
- Events temporels (Halloween, Yule)
- Boss optionnels rares
- Responsive / mobile
- Localisation EN
- Steam release via Tauri
- Familiers passifs

---

## Légende

- **Priorité** : P0 must, P1 should, P2 nice-to-have
- **Taille** : S (≤2 h), M (½ journée), L (1+ jour)
- **Tags** : `setup`, `deploy`, `core`, `ui`, `combat`, `economy`, `content`, `loot`, `prestige`, `balance`, `audio`, `anim`, `tests`, `qa`, `save`, `achievements`
