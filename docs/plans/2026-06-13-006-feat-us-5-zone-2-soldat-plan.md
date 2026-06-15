---
title: "feat: US 5 — Zone 2 (Ruines) + tier Soldat"
type: feat
status: active
date: 2026-06-13
---

# US 5 — Zone 2 (Ruines) + tier Soldat

US 4 affichait "ZONE 2 DÉBLOQUÉE" mais aucune zone 2 n'existait derrière, et seul le Paysan était une vraie troupe (Soldat/Chevalier/Champion = cartes statiques en dur). US 5 **tient la promesse** : on bat le boss de la Forêt → **écran de transition cinématique** → on débarque dans les **Ruines** (mobs thématiques + boss nommé), et le **Soldat** devient recrutable (vrai DPS, vrai coût).

**Décisions produit (tranchées avec Etienne)**
- **Passage de zone** : auto + écran de transition animé (~2 s). L'événement se sent, zéro friction (idle préservé).
- **Identité des Ruines** : mobs thématiques (💀 squelette, 🦇 chauve-souris, 🕷️ araignée…) + boss nommé **Liche des Ruines** 💀.

**Hook produit (fils 5 ans)** : le boss Forêt tombe → flash + écran "⚔ LES RUINES ⚔" plein écran → le décor change (pierre froide vs forêt) → de **nouveaux** monstres jamais vus → et la carte **Soldat** qui s'allume dans la caserne ("je peux acheter le chevalier… euh le soldat !").

## Critères d'acceptation

- [ ] La caserne est pilotée par un **catalogue de troupes** (fini les 4 `.unit` en dur) : Paysan + Soldat recrutables, Chevalier/Champion verrouillés avec hint.
- [ ] **Soldat** : coût base 100 (×1.15 / unité), **+12 dps**, **déverrouillé quand `zonesUnlocked >= 2`** (= boss Forêt battu). Avant : carte grisée "🔒 Bats le boss de la Forêt".
- [ ] Le **DPS total** se recalcule depuis le catalogue : `baseDps + Σ(count × dps)` par troupe. Recruter un Soldat fait monter le DPS de 12.
- [ ] Recruter décrémente l'or du **coût courant recalculé** (pas la dérivée), incrémente le count via réassignation (réactivité Svelte 4).
- [ ] **Zone 2 (Ruines)** existe : 12 vagues, mobs thématiques propres, boss **Liche des Ruines** 💀, décor distinct (CSS, pas d'asset lourd).
- [ ] À la mort du boss **Forêt** (path live) : `zonesUnlocked → 2`, **écran de transition ~2 s** ("⚔ LES RUINES ⚔"), combat en pause, puis spawn de la vague 1 des Ruines. Le décor et le nom de zone ont changé.
- [ ] Le nom de zone, le nombre de vagues et le décor de fond sont **dérivés de la zone courante**, plus aucun "Forêt Sombre" / `10` en dur dans le markup.
- [ ] Mort du boss **Ruines** (pas de zone 3 en US 5) : pas de transition, **flash + toast "🏆 RUINES VAINCUES 🏆"**, on reboucle la vague 1 des Ruines (farm).
- [ ] **Catch-up (n>1)** : l'avancement de zone se fait **instantanément, sans écran ni flash** (l'or cumulé est absorbé par le pop welcome-back existant). Revenir après 30 min peut faire passer de la Forêt aux Ruines sans animation.
- [ ] Aucune régression sur le combat zone 1 (vagues 1→9, boss vague 10, pops dégâts/or, shake, respawn).

## Décisions techniques

### Catalogue de zones (remplace `mobs` global + `ZONE_BOSSES` + `wavesPerZone`)

```js
const zones = {
  1: {
    name: 'Forêt Sombre',
    bg: `url(${foretSprite})`,
    waves: 10,
    mobs: [
      { name: 'Gobelin Maraudeur', sprite: '👹', spriteUrl: gobelinSprite, hpMax: 500, gold: 5 },
      { name: 'Squelette Croulant', sprite: '💀', spriteUrl: null, hpMax: 600, gold: 8 },
      { name: 'Loup Galeux', sprite: '🐺', spriteUrl: null, hpMax: 450, gold: 4 },
      { name: 'Orc Brute', sprite: '👺', spriteUrl: null, hpMax: 700, gold: 12 },
      { name: 'Rat Géant', sprite: '🐀', spriteUrl: null, hpMax: 350, gold: 3 },
    ],
    boss: { name: 'Roi Gobelin', sprite: '👑', spriteUrl: null, hpMax: 5000, gold: 200 },
  },
  2: {
    name: 'Ruines',
    // Décor CSS-only (pas d'asset) : pierre froide vs forêt chaude.
    bg: 'radial-gradient(circle at 50% 20%, #3b3f4a 0%, #1a1c22 60%, #0e0f13 100%)',
    waves: 12,
    mobs: [
      { name: 'Squelette Brisé', sprite: '💀', spriteUrl: null, hpMax: 2500, gold: 30 },
      { name: 'Chauve-souris Vorace', sprite: '🦇', spriteUrl: null, hpMax: 2000, gold: 25 },
      { name: 'Araignée Géante', sprite: '🕷️', spriteUrl: null, hpMax: 3200, gold: 40 },
      { name: 'Spectre Errant', sprite: '👻', spriteUrl: null, hpMax: 2800, gold: 35 },
      { name: 'Goule Affamée', sprite: '🧟', spriteUrl: null, hpMax: 3500, gold: 50 },
    ],
    boss: { name: 'Liche des Ruines', sprite: '💀', spriteUrl: null, hpMax: 25000, gold: 1200 },
  },
}
```

> Nombres ×~5 vs zone 1 (échelle réelle du code, pas la table SPEC qui a divergé). À affiner au feeling en jouant — c'est du vibe-code.

### Catalogue de troupes (remplace le hardcoding paysan + 3 fausses cartes)

```js
const baseDps = 35
const TROOPS = {
  paysan:    { name: 'Paysan',    spriteUrl: paysanSprite,    baseCost: 10,    dps: 1,    unlockZone: 1,  hint: '' },
  soldat:    { name: 'Soldat',    spriteUrl: soldatSprite,    baseCost: 100,   dps: 12,   unlockZone: 2,  hint: 'Bats le boss de la Forêt' },
  chevalier: { name: 'Chevalier', spriteUrl: chevalierSprite, baseCost: 1000,  dps: 150,  unlockZone: 99, hint: 'Bientôt…' },
  champion:  { name: 'Champion',  spriteUrl: championSprite,   baseCost: 10000, dps: 2000, unlockZone: 99, hint: 'Endgame' },
}
const TROOP_ORDER = ['paysan', 'soldat', 'chevalier', 'champion']

let counts = { paysan: 0, soldat: 0, chevalier: 0, champion: 0 }

// Coût recalculé depuis le primitif (convention US 3 : ne pas lire la dérivée).
function costOf(id) {
  return Math.floor(TROOPS[id].baseCost * Math.pow(1.15, counts[id]))
}

function recruit(id) {
  if (zonesUnlocked < TROOPS[id].unlockZone) return
  const cost = costOf(id)
  if (gold < cost) return
  gold -= cost
  counts = { ...counts, [id]: counts[id] + 1 }   // réassignation = réactivité
}

// Dérivés réactifs (dépendent de counts / zonesUnlocked).
$: dps = baseDps + TROOP_ORDER.reduce((s, id) => s + counts[id] * TROOPS[id].dps, 0)
$: troopRows = TROOP_ORDER.map(id => ({
  id,
  name: TROOPS[id].name,
  spriteUrl: TROOPS[id].spriteUrl,
  dps: TROOPS[id].dps,
  hint: TROOPS[id].hint,
  count: counts[id],
  cost: costOf(id),
  unlocked: zonesUnlocked >= TROOPS[id].unlockZone,
}))
```

### State zone courante

```js
let currentZone = 1
let wave = 1
let zonesUnlocked = 1
// transition
let isTransitioning = false
let transitionZoneName = ''
let transitionInvocationId = 0

$: zone = zones[currentZone]   // raccourci markup (nom, waves, bg)
```

### Spawn piloté par la zone courante

```js
function spawnNextEnemy() {
  const z = zones[currentZone]
  if (wave === z.waves) {
    enemy = z.boss
    enemyHp = z.boss.hpMax
    isBoss = true
  } else {
    mobIdx = (mobIdx + 1) % z.mobs.length
    enemy = z.mobs[mobIdx]
    enemyHp = enemy.hpMax
    isBoss = false
  }
  isRespawning = false
}
```

### Branche kill réécrite (live vs catch-up, zone-aware)

```js
if (enemyHp <= 0) {
  gold += enemy.gold
  if (withAnim) later(() => pushPop('gold', enemy.gold), 150)

  if (isBoss) {
    const next = currentZone + 1
    const hasNext = zones[next] !== undefined
    if (hasNext) {
      zonesUnlocked = Math.max(zonesUnlocked, next)
      if (withAnim) {
        startZoneTransition(next)   // gère wave=1, currentZone, spawn, écran
        return                      // pas de respawn générique : la transition s'en charge
      }
      currentZone = next            // catch-up : avance sèche, pas d'écran
    }
    wave = 1
    if (withAnim && !hasNext) triggerVictory()  // dernière zone : flash + toast
  } else {
    wave += 1
  }

  if (withAnim) {
    isRespawning = true
    later(spawnNextEnemy, 250)
  } else {
    spawnNextEnemy()
  }
}
```

### Transition cinématique (live only, invocationId-guardée)

```js
function startZoneTransition(next) {
  const myId = ++transitionInvocationId
  isFlashing = true
  later(() => { if (myId === transitionInvocationId) isFlashing = false }, 500)
  isTransitioning = true
  transitionZoneName = zones[next].name
  isRespawning = true               // pause le tick (guard existant) + masque le sprite
  later(() => {
    if (myId !== transitionInvocationId) return
    currentZone = next
    wave = 1
    isTransitioning = false
    spawnNextEnemy()                // lève isRespawning
  }, 2000)
}
```

> `applyOneTick` commence déjà par `if (isRespawning) return` → combat en pause pendant les 2 s, gratuit. Pas besoin d'un guard `isTransitioning` séparé dans le tick.

### `triggerVictory()` — message dynamique

Repurpose pour le cas "dernière zone vaincue" uniquement (le passage zone 1→2 passe par la transition).

```js
let victoryMessage = ''
function triggerVictory() {
  const myId = ++victoryInvocationId
  isFlashing = true
  later(() => { if (myId === victoryInvocationId) isFlashing = false }, 500)
  victoryMessage = `🏆 ${zones[currentZone].name.toUpperCase()} VAINCUES 🏆`
  showVictoryToast = true
  later(() => { if (myId === victoryInvocationId) showVictoryToast = false }, 3000)
}
```

### Markup

**Caserne** — remplacer les 4 `<div class="unit">` par un `{#each troopRows}` :

```svelte
{#each troopRows as t (t.id)}
  <div
    class="unit"
    class:locked={!t.unlocked}
    class:insolvable={t.unlocked && gold < t.cost}
    on:click={() => t.unlocked && recruit(t.id)}
    on:keydown={(e) => t.unlocked && (e.key === 'Enter' || e.key === ' ') && recruit(t.id)}
    role="button"
    tabindex={t.unlocked ? 0 : -1}
  >
    <div class="unit-icon"><img src={t.spriteUrl} alt={t.name} class="unit-icon-img" /></div>
    <div class="unit-info">
      <div class="unit-name">{t.name}</div>
      {#if t.unlocked}
        <div class="unit-stats">+{t.dps} dps · ×1.15</div>
        <div class="unit-cost">🪙 {formatNumber(t.cost)}</div>
      {:else}
        <div class="unit-stats">{t.hint}</div>
        <div class="unit-cost">🔒 verrouillé</div>
      {/if}
    </div>
    <div class="unit-count">{t.unlocked ? t.count : '—'}</div>
  </div>
{/each}
```

**Zone** — fond + nom + waves dérivés :

```svelte
<section class="combat" style:--zone-bg={zone.bg}>
  ...
  <div class="zone-name display">{zone.name}</div>
  ...
  Vague {wave} / {zone.waves} · Boss à
  <span ...>{zone.waves - wave} vague{zone.waves - wave > 1 ? 's' : ''}</span>
```

**Overlays** — toast dynamique + écran de transition (après les pops dans `.combat`) :

```svelte
{#if showVictoryToast}
  <div class="victory-toast" transition:fade={{ duration: 300 }}>{victoryMessage}</div>
{/if}
{#if isTransitioning}
  <div class="zone-transition" transition:fade={{ duration: 350 }}>
    <div class="zone-transition-label">⚔ {transitionZoneName.toUpperCase()} ⚔</div>
  </div>
{/if}
```

### CSS

- `.combat` : remplacer `var(--bg-foret, none)` par `var(--zone-bg, none)` dans le shorthand `background` (le `center / cover no-repeat` marche aussi sur un gradient).
- Nouveau `.zone-transition` : overlay plein `inset:0`, fond sombre semi-opaque, flex center, `z-index` au-dessus du combat ; `.zone-transition-label` en Cinzel ~3rem, doré, text-shadow, légère anim de scale-in.

## Étapes d'implémentation

1. **`<script>`** : introduire `const zones`, `const TROOPS` + `TROOP_ORDER`, `let counts`, `currentZone`, state transition. Supprimer `mobs`, `ZONE_BOSSES`, `wavesPerZone`, `paysans`, `recruitPaysan`, `paysanCost`.
2. **Dérivés** : `dps`, `troopRows`, `zone`. Helpers `costOf`, `recruit`.
3. **`spawnNextEnemy`** zone-aware.
4. **`applyOneTick`** : réécrire la branche kill (live/catch-up, transition).
5. **`startZoneTransition`** + `triggerVictory` dynamique.
6. **Markup** : caserne `{#each}`, zone dérivée, overlays transition + toast.
7. **`app.css`** : `--zone-bg`, `.zone-transition` + label + keyframe scale-in.
8. **Validation navigateur** (cf. ci-dessous), build, commit, PR, `/review`, `/ce:compound`.

## Validation locale (`npm run dev`)

- Zone 1 inchangée : vagues 1→9, boss vague 10. Soldat grisé "🔒 Bats le boss de la Forêt".
- Tuer le boss Forêt → flash + écran "⚔ LES RUINES ⚔" ~2 s → décor pierre, mobs nouveaux (💀🦇🕷️👻🧟), `Vague 1 / 12`.
- Soldat **déverrouillé** : recruter → DPS +12, coût qui monte ×1.15.
- Tuer le boss Liche → toast "🏆 RUINES VAINCUES 🏆", reboucle vague 1 Ruines.
- Catch-up : laisser tourner en background longtemps (ou baisser temporairement `tickMs`) → vérifier passage Forêt→Ruines **sans** écran, or cumulé dans le pop welcome-back.

## Hors scope

- **Sélecteur de zone** (revenir farmer la Forêt) — backlog V2-05, US ultérieure.
- **Zone 3+**, Chevalier/Champion recrutables (restent verrouillés).
- **Reliques / loot boss**, actifs (Cri/Potion), localStorage (US save).
- **Scaling HP des mobs par vague** — HP figé par mob, comme zone 1.
- Décor des Ruines en sprite dédié (CSS suffit ; sprite éventuel en polish).
- Équilibrage fin de la courbe — chiffres posés "au jugé", ajustés en jouant.

## Gotchas anticipés

- **`return` après `startZoneTransition`** : indispensable, sinon le respawn générique (250 ms) tire un mob par-dessus la transition.
- **`enemy.gold` lu à T+150 pendant la transition** : OK, `enemy` ne mute qu'à la fin de la transition (T+2000). Le pop or peut être masqué par l'écran — acceptable, le compteur header bouge.
- **Réactivité `counts`** : réassigner (`counts = {...counts, [id]: …}`), jamais muter en place (Svelte 4).
- **`troopRows` recalcul** : dépend de `counts` ET `zonesUnlocked` → le Soldat passe `unlocked:true` pile à la mort du boss Forêt (révélé pendant l'écran de transition).
- **`isRespawning` réutilisé pour pauser le tick pendant la transition** : voulu. Levé seulement par `spawnNextEnemy` en fin de transition.
- **Catch-up multi-zones** : `applyOneTick(false)` avance `currentZone` sans écran ; `Math.max` garde `zonesUnlocked` monotone. Aucun toast/flash (path `withAnim:false`).
- **`--zone-bg` gradient dans le shorthand `background`** : `center / cover no-repeat` est valide sur un gradient (cover = étirement). Vérifier visuellement le rendu Ruines.
- **Sprites zone 2 = emojis** (pas de `spriteUrl`) : la branche `{#if enemy.spriteUrl}` retombe déjà sur `{enemy.sprite}`. Vérifier la taille emoji vs `.sprite-img`.

## Estimation

**~2 h** avec le fils. Le moment magique : le 👑 tombe, l'écran devient noir, "⚔ LES RUINES ⚔" s'affiche en doré, le décor change en pierre froide, des **squelettes et des araignées** apparaissent, et la carte **Soldat** s'allume. "On peut acheter le nouveau monsieur !"

## Sources

- Spec : [SPEC.md](../../SPEC.md) (Zones, Troupes)
- Plan US 4 : [`2026-05-06-004-feat-us-4-boss-zone-1-plan.md`](2026-05-06-004-feat-us-4-boss-zone-1-plan.md)
- Patterns : [`docs/solutions/patterns/idle-game-tick-and-popups.md`](../../docs/solutions/patterns/idle-game-tick-and-popups.md)
- Code actuel : [`src/App.svelte`](../../src/App.svelte), [`src/app.css`](../../src/app.css)
