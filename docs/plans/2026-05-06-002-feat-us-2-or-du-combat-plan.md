---
title: "feat: US 2 — L'or coule du combat"
type: feat
status: active
date: 2026-05-06
---

# US 2 — L'or coule du combat

Premier feel de **progression** : chaque mob tué donne de l'or, le compteur du header monte, un popup `+XX or` flotte. Premier moment où le jeu te récompense.

**Hook produit (fils 5 ans)** : voir la pièce 🪙 dans le header passer de 0 → 5 → 13 → 24 → … et entendre dans sa tête le "ka-ching" implicite à chaque kill.

## Critères d'acceptation

- [ ] Au démarrage, le compteur d'or du header est à **`0`** (plus le `1 247` figé du mockup)
- [ ] Chaque mort de mob crédite un montant d'or (variable selon le mob, voir table)
- [ ] Le compteur d'or se met à jour réactivement, formaté avec espace fine (`1 247`, pas `1247`)
- [ ] Un popup **doré** `+XX or` apparaît sur la zone combat à la mort (~1 s, flotte vers le haut)
- [ ] Visuellement distinguable du popup dégât (couleur or vs gris, signe `+` vs `-`)
- [ ] Le reste du jeu (caserne, forge, actives) reste figé, mêmes valeurs que US 1
- [ ] Pas de fuite mémoire (gold popups cleanup à 1 s comme les damages)

## Décisions techniques

### Drop d'or par mob — table dans le catalogue
Ajout d'une propriété `gold` au catalogue mobs. Variations pour que le fils sente la différence :

| Mob | HP | Or |
|---|---|---|
| Gobelin Maraudeur 👹 | 500 | 5 |
| Squelette Croulant 💀 | 600 | 8 |
| Loup Galeux 🐺 | 450 | 4 |
| Orc Brute 👺 | 700 | 12 |
| Rat Géant 🐀 | 350 | 3 |

Pas de variance random sur le drop pour US 2 (suffit que ça monte).

### Format des nombres → `src/lib/format.js`
**2e occurrence** du format FR (header + popup or) → on extrait. CLAUDE.md le prévoyait.

```js
// src/lib/format.js
export function formatNumber(n) {
  return Math.floor(n).toLocaleString('fr-FR')
}
```

Utilisé dans le header (`{formatNumber(gold)}`) et dans les popups or.

### Popups or — réutiliser le pattern damage
On garde l'array existant. Deux options :
- **Option A** : un seul array `pops = [{ id, kind: 'damage' | 'gold', value, x }]`
- **Option B** : deux arrays distincts `damagePops` + `goldPops`

→ **Option A**, plus économe (un seul `{#each}`, un seul cleanup, le `kind` détermine la classe CSS et le préfixe `-` ou `+`).

Conséquence : renommer `damagePops` → `pops`, `nextPopId` → reste pareil. Le helper `later()` reste tel quel.

### Catch-up `lastTickAt` — REPOUSSÉ à US 3
La dette identifiée en US 1 (`docs/solutions/patterns/idle-game-tick-and-popups.md`).

**Pourquoi pas en US 2** : en US 2, le seul gain est par kill du combat visuel. Catch-up = simuler N kills en background = simuler le combat = subtil. **En US 3** (paysan production passive `gold += paysans × elapsed / 1000`), le catch-up devient trivial sur la ressource principale. On le fera là.

→ **À tracer dans le plan US 3.**

### Gold initial = `0`
On part vide. Premier vrai gameplay. Fini le `1 247` figé du mockup. La gloire reste à `12` figée (US 4+).

## Étapes d'implémentation

### 1. Créer `src/lib/format.js`
Helper unique `formatNumber(n)`. ~5 lignes.

### 2. Modifier `src/App.svelte` — bloc `<script>`
- Ajouter `import { formatNumber } from './lib/format.js'`
- Ajouter prop `gold` à chaque mob dans le catalogue
- Renommer `damagePops` → `pops` ; `nextPopId` reste
- Ajouter `let gold = 0`
- Modifier `tick()` :
  - Push avec `{ id, kind: 'damage', value: dmg, x }`
  - À la mort : `gold += enemy.gold` ; push `{ id: nextPopId++, kind: 'gold', value: enemy.gold, x: Math.random() * 80 - 40 }` ; cleanup `later(...)` 1 s

### 3. Modifier `src/App.svelte` — markup
- Header : `<span class="value">{formatNumber(gold)}</span>` (au lieu de `1 247` en dur)
- Combat `{#each}` : utiliser `class:gold-pop={pop.kind === 'gold'}` + signe dynamique `{pop.kind === 'gold' ? '+' : '-'}{pop.value}` + suffixe `{pop.kind === 'gold' ? ' or' : ''}`

### 4. Modifier `src/app.css`
- Ajouter une variante `.damage-pop.gold-pop` : couleur `var(--gold)` (déjà là pour les damage en fait — vérifier), font plus grosse, légèrement plus lente (`animation-duration: 1.2s`) pour qu'elle se voit bien.
- Pour distinguer visuellement du damage (qui est doré aussi actuellement), je propose : **damage en parchemin/blanc cassé**, **gold en or pur + bold + plus gros**. Ça force aussi à réviser l'ergo des popups.

### 5. Validation locale
- `npm run dev` → regarder 30 s
- Compteur monte ? popups dorés à la mort ? pas de leak ? format `1 247` au-delà de 999 ?
- Test "fils 5 ans" : "regarde, t'as vu, c'est passé à 100 !"

### 6. Build, commit, push, PR

## Pseudo-code

### `src/lib/format.js`
```js
export function formatNumber(n) {
  return Math.floor(n).toLocaleString('fr-FR')
}
```

### `App.svelte` — bloc combat (extrait)
```js
function tick() {
  if (isRespawning) return

  const dmg = dps + Math.floor(Math.random() * 9 - 4)
  enemyHp -= dmg

  pushPop('damage', dmg)

  isHit = true
  later(() => isHit = false, 200)

  if (enemyHp <= 0) {
    gold += enemy.gold
    pushPop('gold', enemy.gold)
    isRespawning = true
    later(() => {
      mobIdx = (mobIdx + 1) % mobs.length
      enemy = mobs[mobIdx]
      enemyHp = enemy.hpMax
      isRespawning = false
    }, 250)
  }
}

function pushPop(kind, value) {
  const id = nextPopId++
  pops = [...pops, { id, kind, value, x: Math.random() * 80 - 40 }]
  later(() => pops = pops.filter(p => p.id !== id), kind === 'gold' ? 1200 : 1000)
}
```

## Hors scope (à NE PAS faire en US 2)

- Pas de bouton "Recruter" fonctionnel (caserne reste figée)
- Pas de production passive (paysan ne produit rien tout seul → US 3)
- Pas de boutons actifs fonctionnels
- Pas de catch-up `lastTickAt` (US 3, où la production passive le rend trivial)
- Pas de localStorage (US 7)
- Pas de progression de zone/vague
- Pas de scaling exponentiel des coûts (rien à acheter encore)
- Pas de découpage en sous-composants

## Gotchas anticipés

- **Rename `damagePops` → `pops`** dans App.svelte ET dans CLAUDE.md (la convention figée mentionne `damagePops`). Update au passage.
- **Format `0` au démarrage** : `formatNumber(0)` → `"0"` ? À vérifier que `Math.floor(0).toLocaleString('fr-FR')` retourne bien `"0"` (et pas `"-0"`).
- **Distinguer popups** : si on garde la même classe CSS pour gold et damage, on perd la différenciation visuelle. Penser à faire deux variantes nettes — c'est crucial pour le fils.
- **Couleur damage** : actuellement `.damage-pop` est en `color: var(--gold)`. À changer en `var(--parchment)` ou `var(--blood-bright)` pour libérer le gold pour les pops or. Préférence : **damage en parchemin** (lisible mais discret) ; **gold en gold + bold** (festif).

## Estimation

**~1 h** avec le fils. Le clou : voir le compteur d'or passer 100 puis 500. C'est exactement ce que le mode idle promet.

## Sources

- Spec : [SPEC.md](../../SPEC.md)
- Plan US 1 : [`2026-05-06-001-feat-us-1-combat-scripte-plan.md`](2026-05-06-001-feat-us-1-combat-scripte-plan.md)
- Patterns idle game : [`docs/solutions/patterns/idle-game-tick-and-popups.md`](../../docs/solutions/patterns/idle-game-tick-and-popups.md)
- App.svelte actuel : [`src/App.svelte`](../../src/App.svelte)
- CLAUDE.md (conventions, helper format prévu) : [CLAUDE.md](../../CLAUDE.md)
