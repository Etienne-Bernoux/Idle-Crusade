---
title: "feat: US 4 — Boss zone 1 + déblocage zone 2"
type: feat
status: active
date: 2026-05-06
---

# US 4 — Boss zone 1 + déblocage zone 2

Première récompense de progression vraiment satisfaisante. Tu tues 9 mobs normaux, le 10ème est un **boss** (Roi Gobelin 👑) avec un gros HP. Quand il tombe, **flash écran + pop or géant + toast "ZONE 2 DÉBLOQUÉE"**. Puis on repart à la vague 1.

**Hook produit (fils 5 ans)** : la barre de progression des vagues qui descend ("plus que 3 vagues avant le boss !"), la tension du boss (HP énorme, sprite imposant, le combat qui dure), l'explosion visuelle au kill, et le sentiment d'avoir "fini la première zone".

## Critères d'acceptation

- [ ] Au démarrage, on est à **vague 1/10**, mob normal de la rotation existante
- [ ] À chaque kill de mob normal, `wave` incrémente (1 → 2 → … → 9)
- [ ] **Vague 10** : le prochain spawn n'est plus un mob normal mais le **boss** (Roi Gobelin 👑, HP 5 000, gold 200)
- [ ] Le sprite du boss est **plus gros** que les mobs (CSS `font-size: 9rem`)
- [ ] L'affichage zone-progress se met à jour réactivement :
  - Vague 1-9 : `Forêt Sombre · Vague X/10 · Boss à Y vagues`
  - Vague 10 (boss en cours) : `Forêt Sombre · 👑 BOSS · Roi Gobelin`
- [ ] À la mort du boss : (a) flash écran 0.5s, (b) popup `+200 or` géant central, (c) toast 3s "🎉 ZONE 2 DÉBLOQUÉE 🎉"
- [ ] Après le toast, retour à vague 1 avec un mob normal de la rotation
- [ ] `zonesUnlocked` passe à `2` (state préparé pour US 5)
- [ ] Pendant un catch-up (n>1 ticks), si le boss est tué, **pas de flash, pas de toast** (juste l'or compté dans le welcome-back pop existant)
- [ ] Si on revient avec catch-up qui couvre plusieurs cycles boss, l'or est cumulé correctement (`zonesUnlocked` peut être passé à `2` sans flash)

## Décisions techniques

### Catalogue boss (séparé)
```js
const bosses = [
  { name: 'Roi Gobelin', sprite: '👑', hpMax: 5000, gold: 200, zone: 1 },
]
```
Un seul boss pour US 4. À US 5+, ajouter Liche/Ogre/etc. pour la zone 2+. Le `zone` sert à choisir le bon boss quand `zonesUnlocked` augmente.

### State ajouté
```js
let wave = 1
let zonesUnlocked = 1
let isBoss = false
let showVictoryToast = false
let isFlashing = false
const wavesPerZone = 10
```

### Logique de spawn
Refactor `respawnNextMob()` → `spawnNextEnemy()`. Décide entre mob normal et boss selon `wave` :

```js
function spawnNextEnemy() {
  if (wave === wavesPerZone) {
    // Vague boss
    const boss = bosses.find(b => b.zone === zonesUnlocked) || bosses[0]
    enemy = boss
    enemyHp = boss.hpMax
    isBoss = true
  } else {
    mobIdx = (mobIdx + 1) % mobs.length
    enemy = mobs[mobIdx]
    enemyHp = enemy.hpMax
    isBoss = false
  }
  isRespawning = false
}
```

### Logique au kill
```js
if (enemyHp <= 0) {
  gold += enemy.gold
  if (isBoss) {
    if (withAnim) triggerVictory()  // flash + toast
    zonesUnlocked = Math.max(zonesUnlocked, 2)
    wave = 1
  } else {
    wave += 1
  }
  // ... pop or et respawn comme avant
}
```

### `triggerVictory()` — uniquement en path live
```js
function triggerVictory() {
  isFlashing = true
  later(() => isFlashing = false, 500)
  showVictoryToast = true
  later(() => showVictoryToast = false, 3000)
}
```

### Markup zone-progress dynamique
```svelte
<div class="zone-name display">Forêt Sombre</div>
<div class="zone-progress">
  {#if isBoss}
    👑 <span class="display" style="color: var(--blood-bright)">BOSS · {enemy.name}</span>
  {:else}
    Vague {wave} / {wavesPerZone} · Boss à
    <span class="display" style="color: var(--blood-bright)">
      {wavesPerZone - wave} vague{wavesPerZone - wave > 1 ? 's' : ''}
    </span>
  {/if}
</div>
```

### Markup overlay flash + toast
Dans `<section class="combat">`, après les pops :
```svelte
{#if isFlashing}
  <div class="victory-flash"></div>
{/if}
{#if showVictoryToast}
  <div class="victory-toast">🎉 ZONE 2 DÉBLOQUÉE 🎉</div>
{/if}
```

### CSS additions
```css
.enemy-sprite.boss {
  font-size: 9rem;
}
.victory-flash {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(212, 175, 55, 0.6) 0%, transparent 70%);
  pointer-events: none;
  animation: victoryFlash 0.5s ease-out forwards;
}
@keyframes victoryFlash {
  0% { opacity: 0; }
  20% { opacity: 1; }
  100% { opacity: 0; }
}
.victory-toast {
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Cinzel', serif;
  font-size: 2.4rem;
  font-weight: 800;
  color: var(--gold);
  text-shadow: 0 0 20px rgba(212, 175, 55, 0.8), 2px 2px 0 #000;
  white-space: nowrap;
  pointer-events: none;
  animation: toastIn 0.4s ease-out;
}
@keyframes toastIn {
  0% { opacity: 0; transform: translate(-50%, 20px) scale(0.8); }
  100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
}
```

### Catch-up safety
Le path `withAnim: false` ne touche **jamais** à `isFlashing` / `showVictoryToast` / `pushPop`. Si l'utilisateur revient après 30 min et qu'on a tué 2 boss pendant l'absence, l'or est ajouté à `gold`, `zonesUnlocked` reste à 2 (no-op au 2ème), pas d'animation. Le welcome-back pop existant absorbe le tout.

### Affichage du boss sprite
Ajouter `class:boss={isBoss}` sur `.enemy-sprite` pour appliquer la taille augmentée. La `transition: opacity 0.25s` existante prend le relais pour le respawn (boss → mob normal).

## Étapes d'implémentation

1. **`src/App.svelte` `<script>`** :
   - Ajouter `const bosses = [...]`
   - Ajouter state `wave`, `zonesUnlocked`, `isBoss`, `showVictoryToast`, `isFlashing`
   - Renommer `respawnNextMob` → `spawnNextEnemy`, ajouter logique boss
   - Modifier la branche kill dans `applyOneTick` (boss vs mob → wave++ ou victory)
   - Ajouter `triggerVictory()`

2. **`src/App.svelte` markup** :
   - Zone-progress dynamique (wave/boss)
   - Sprite boss : `class:boss={isBoss}`
   - Overlay flash + toast à la fin de `<section class="combat">`

3. **`src/app.css`** :
   - `.enemy-sprite.boss` (9rem)
   - `.victory-flash` + `@keyframes victoryFlash`
   - `.victory-toast` + `@keyframes toastIn`

4. **Validation locale** :
   - `npm run dev` → tuer 9 mobs (regarder le compteur descendre 9 → 8 → … → 1)
   - Vague 10 : boss apparaît, sprite gros
   - Tuer le boss : flash + toast + pop or +200
   - Toast disparaît après 3s, retour vague 1

5. **Build, commit, push, PR, review, compound, merge.**

## Hors scope

- Pas de zone 2 jouable (US 5)
- Pas de plusieurs boss (1 par zone, US 5+ ajoutera Liche/Ogre/etc.)
- Pas de skip wave / fast-forward
- Pas de scaling HP des mobs avec la wave (pour l'instant tout reste à HP figé)
- Pas de localStorage (US 7)
- Pas de musique de boss
- Pas de barre de progression des vagues séparée (le texte suffit pour US 4)

## Gotchas anticipés

- **Boss tué juste avant le `setTimeout(triggerVictory)` du tick précédent** : impossible, c'est synchrone. Mais à surveiller si on refactor.
- **`isFlashing` toggle 500 ms** : doit cleanup au unmount via `pendingTimeouts` (déjà couvert par `later()`).
- **Vague boss = vague 10 mais affichage `Boss à 0 vagues`** : à éviter. La condition `isBoss` doit prendre le dessus dans le markup.
- **Race entre `spawnNextEnemy()` synchrone (catch-up) et toast** : pas de souci, le toast n'est jamais déclenché en catch-up (`withAnim: false`).
- **`Math.max(zonesUnlocked, 2)`** : monotone croissante, OK même si on tue plusieurs boss avant que l'utilisateur revienne.
- **Boss zone 2+** non encore défini : pour US 4 on a un seul boss zone 1, c'est OK. La structure `bosses[zone]` est prête pour l'extension.
- **CSS `.enemy-sprite.boss { font-size: 9rem }`** vs animation `bob` existante : pas de conflit (font-size n'est pas dans la keyframe).
- **`isHit` shake sur boss** : déclenché normalement, l'anim shake fonctionne même à 9rem. À vérifier visuellement (pas de débordement).

## Estimation

**~1h30** avec le fils. Le moment magique : il voit "Boss à 1 vague" et il s'écrie "ATTENDS, ÇA VA ÊTRE UN BOSS !". Puis le 👑 apparaît, énorme. Puis il met 30 secondes à le tuer (vs 5s pour un mob normal). Puis BOOM, flash + toast + 200 or.

## Sources

- Spec : [SPEC.md](../../SPEC.md) (section Boss + Zones)
- Plan US 3 : [`2026-05-06-003-feat-us-3-recrutement-paysan-plan.md`](2026-05-06-003-feat-us-3-recrutement-paysan-plan.md)
- Pattern doc : [`docs/solutions/patterns/idle-game-tick-and-popups.md`](../../docs/solutions/patterns/idle-game-tick-and-popups.md)
- App.svelte actuel : [`src/App.svelte`](../../src/App.svelte)
