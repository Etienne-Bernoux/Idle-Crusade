---
title: "feat: US 3 — Recrutement paysan + catch-up tick"
type: feat
status: active
date: 2026-05-06
---

# US 3 — Recrutement paysan + catch-up tick

Premier moment d'**interaction** : on clique sur le paysan dans la caserne, l'or descend, le compteur paysan monte, le DPS total grimpe → les mobs tombent plus vite → l'or revient plus vite. Spirale Cookie Clicker.

Bonus : on solde la **dette d'US 1** (background tab throttling) en intégrant `lastTickAt` + catch-up. Maintenant qu'on a un état cumulatif (or + paysans), simuler N ticks à la reprise donne un vrai gain au joueur.

**Hook produit (fils 5 ans)** : "papa, j'achète encore un paysan ?" → "non attends d'en avoir 50 or…" → "REGARDE J'EN AI 50 !" → click → 🧑‍🌾 23 → 24, dps 35 → 36, mob meurt 2 % plus vite.

## Critères d'acceptation

- [ ] Le bloc Paysan dans la caserne est cliquable (whole `.unit`)
- [ ] Au clic : si `gold >= paysanCost` → `gold -= paysanCost`, `paysans += 1`, le coût se recalcule
- [ ] Si `gold < paysanCost` : `.unit` est visuellement désactivé (opacity 0.5, cursor not-allowed), pas de side-effect au clic
- [ ] Le compteur paysan dans la caserne se met à jour réactivement (`23` → `24`)
- [ ] Le coût affiché se met à jour réactivement (`🪙 47` → `🪙 54`)
- [ ] Le DPS affiché dans la zone combat se met à jour (`35 dps` → `36 dps` après 1er paysan)
- [ ] Au démarrage, `paysans = 0`, donc DPS = `35` exactement, coût premier paysan = `10`
- [ ] Quand l'onglet revient au premier plan après ≥ 5 s d'absence, le compteur d'or saute du montant correspondant aux mobs tués pendant l'absence (catch-up)
- [ ] Aucune anim popup spammée pendant le catch-up (sinon écran inondé au retour d'arrière-plan)
- [ ] Soldat / Chevalier / Champion : restent strictement figés (pas cliquables, valeurs en dur)

## Décisions techniques

### Économie paysan
- **Coût** : `Math.floor(10 * Math.pow(1.15, paysans))`. Pas d'arrondi à la dizaine, on garde la précision Cookie Clicker.
- **Effet** : `+1 DPS unitaire`. DPS total dérivé : `$: dps = baseDps + paysans` avec `const baseDps = 35`.
- **Pas de plafond** sur le nombre de paysans (overflow `Number.MAX_SAFE_INTEGER` = 9e15, pas un souci).

### Recrutement (handler)
```js
function recruterPaysan() {
  if (gold < paysanCost) return  // sécurité, pas d'erreur
  gold -= paysanCost
  paysans += 1
}
```
Pas de feedback popup à l'achat en US 3 (le compteur header qui descend de 10 + le paysan-count qui monte de 1 sont déjà 2 feedbacks). On ajoutera éventuellement un popup `-10 or` en US 4+ si manque de feel.

### Catch-up `lastTickAt`
**Approche** : refactor le `tick()` actuel en `applyOneTick({ withAnim: bool })`. Le callback de `setInterval` calcule combien de ticks doivent s'appliquer depuis `lastTickAt` :

```js
let lastTickAt = performance.now()

function tick() {
  const now = performance.now()
  const elapsed = now - lastTickAt
  const n = Math.floor(elapsed / tickMs)
  if (n <= 0) return

  lastTickAt += n * tickMs

  // 1 tick = anim normale. Plusieurs ticks (= catch-up) = simulation sèche.
  if (n === 1) {
    applyOneTick({ withAnim: true })
  } else {
    for (let i = 0; i < n; i++) applyOneTick({ withAnim: false })
  }
}
```

**`applyOneTick({ withAnim })`** :
- `withAnim: true` → comportement actuel (popup damage, hit shake, popup gold+150ms, respawn 250ms via `later()`)
- `withAnim: false` → décrément HP sec, si HP ≤ 0 → `gold += enemy.gold`, rotate `mobIdx`, reset HP. **Pas de `later()`, pas de popup**. Synchrone.

`onMount` : `lastTickAt = performance.now()` (au cas où `setInterval` tarde).

### Layout de la caserne
- Reste à 4 lignes (Paysan, Soldat, Chevalier, Champion). Soldat reste figé (US 5).
- Paysan : `class:insolvable={gold < paysanCost}` ajouté dynamiquement.
- `on:click={recruterPaysan}` sur le `.unit` du paysan.

### CSS
- Nouvelle classe `.unit.insolvable` : `opacity: 0.5; cursor: not-allowed;` (override le `.unit { cursor: pointer }` existant si on l'a)
- Note : le `.unit` actuel a déjà `cursor: pointer`. Bon point de départ.

## Étapes d'implémentation

1. **`src/App.svelte` `<script>`** :
   - Ajouter `let paysans = 0`, `let lastTickAt = 0`
   - Renommer `dps` en `baseDps` (le `const baseDps = 35`), ajouter `$: dps = baseDps + paysans`
   - Ajouter `$: paysanCost = Math.floor(10 * Math.pow(1.15, paysans))`
   - Renommer `tick()` → `applyOneTick({ withAnim })`, ajuster pour skipper les `later()` quand `withAnim === false`
   - Nouvelle fonction `tick()` qui catch-up
   - Nouvelle fonction `recruterPaysan()`
   - Initialiser `lastTickAt = performance.now()` dans `onMount`

2. **`src/App.svelte` markup** (caserne, paysan) :
   - `<div class="unit" class:insolvable={gold < paysanCost} on:click={recruterPaysan}>`
   - Coût dynamique : `🪙 {formatNumber(paysanCost)}`
   - Count dynamique : `{paysans}`

3. **`src/App.svelte` markup** (combat, dps) :
   - `<span class="dps-value">{dps} dps</span>` (au lieu de `35 dps` en dur)

4. **`src/app.css`** :
   - Ajouter `.unit.insolvable { opacity: 0.5; cursor: not-allowed; }`
   - Garder le `.unit:hover` existant pour le feedback hover quand cliquable

5. **Validation locale** :
   - `npm run dev` → recruter 5 paysans, voir le DPS monter de 35 à 40, coût passe de 10 à ~17
   - Mettre l'onglet en background 30 s, revenir, vérifier que l'or a sauté (~10-30 or selon DPS)
   - Vérifier qu'aucun popup ne spamme à la reprise

6. **Build, commit, push, PR, review, compound, merge.**

## Pseudo-code

```js
// src/App.svelte <script>
let paysans = 0
const baseDps = 35
$: dps = baseDps + paysans
$: paysanCost = Math.floor(10 * Math.pow(1.15, paysans))

function recruterPaysan() {
  if (gold < paysanCost) return
  gold -= paysanCost
  paysans += 1
}

let lastTickAt = 0

function applyOneTick({ withAnim }) {
  if (isRespawning) return

  const dmg = dps + Math.floor(Math.random() * 9 - 4)
  enemyHp -= dmg

  if (withAnim) {
    pushPop('damage', dmg)
    isHit = true
    later(() => isHit = false, 200)
  }

  if (enemyHp <= 0) {
    gold += enemy.gold
    if (withAnim) {
      later(() => pushPop('gold', enemy.gold), 150)
      isRespawning = true
      later(() => respawnNextMob(), 250)
    } else {
      // catch-up : respawn instantané, pas de popup
      respawnNextMob()
    }
  }
}

function respawnNextMob() {
  mobIdx = (mobIdx + 1) % mobs.length
  enemy = mobs[mobIdx]
  enemyHp = enemy.hpMax
  isRespawning = false
}

function tick() {
  const now = performance.now()
  const elapsed = now - lastTickAt
  const n = Math.floor(elapsed / tickMs)
  if (n <= 0) return
  lastTickAt += n * tickMs

  if (n === 1) {
    applyOneTick({ withAnim: true })
  } else {
    for (let i = 0; i < n; i++) applyOneTick({ withAnim: false })
  }
}

onMount(() => {
  lastTickAt = performance.now()
  const intervalId = setInterval(tick, tickMs)
  // ... cleanup inchangé
})
```

## Hors scope

- Pas de production passive d'or (le paysan ajoute du DPS, point)
- Pas de feedback popup à l'achat (`-10 or`)
- Pas de popup "welcome back, +X or pendant ton absence" (à voir en US 4+)
- Soldat / Chevalier / Champion figés (US 5)
- Pas de localStorage (US 7)
- Pas d'achat multiple (×10, ×100) — un clic = un paysan
- Pas de raccourci clavier
- Pas de scaling exponentiel des HP de mobs (pour l'instant ils sont fixes — la spirale vient du DPS qui augmente)

## Gotchas anticipés

- **`isRespawning` pendant catch-up** : si le mob meurt au tick K, on `respawn` instantané (sans setTimeout). Le flag `isRespawning` n'a pas le temps de basculer à `true`. Si la fonction `applyOneTick` continue à boucler, le tick K+1 va attaquer le **nouveau** mob. C'est le comportement voulu.
- **`applyOneTick({ withAnim: false })` doit pas pusher dans `pendingTimeouts`** : aucun `later()` appelé, donc pas de souci. Mais si un refactor casse ça, le Set explose pendant un long catch-up.
- **`Math.pow(1.15, paysans)`** : à `paysans = 1000`, le coût explose à `~10^61`, dépasse `Number.MAX_SAFE_INTEGER`. À ce stade le jeu est cassé pour d'autres raisons. Pas un souci de US 3.
- **Throttling background** : Chrome throttle `setInterval` à 1×/min en background. Donc `tick()` ne tourne qu'une fois par minute → `elapsed` = 60000 ms → `n` = 75 ticks (à `tickMs=800`). On simule 75 ticks d'un coup. CPU négligeable (boucle pure JS). OK.
- **Précision `performance.now()`** : sub-millisecond, pas de souci pour notre granularité 800 ms.
- **Boucle for synchrone bloquante** : si l'absence est très longue (1 h = 4500 ticks), la boucle simule 4500 itérations en 1 frame. Mesure : ~50 µs par itération de tick simple → 4500 × 50 µs = 225 ms de blocage. Acceptable mais à surveiller. Solution future si gênant : rendre la boucle asynchrone via `setTimeout(0)` chunks.

## Estimation

**~1h30** avec le fils. Le moment magique : il achète le 1er paysan, le compteur dps passe de 35 à 36, et il dit "ça change rien". Tu lui montres le 5ème paysan (dps 40), le mob meurt visiblement plus vite. Spirale ressentie.

## Sources

- Spec : [SPEC.md](../../SPEC.md)
- Plan US 2 : [`2026-05-06-002-feat-us-2-or-du-combat-plan.md`](2026-05-06-002-feat-us-2-or-du-combat-plan.md)
- Pattern doc (catch-up + popups) : [`docs/solutions/patterns/idle-game-tick-and-popups.md`](../../docs/solutions/patterns/idle-game-tick-and-popups.md)
- App.svelte actuel : [`src/App.svelte`](../../src/App.svelte)
- CLAUDE.md : [CLAUDE.md](../../CLAUDE.md)
