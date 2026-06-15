---
title: "feat: US 6 — Reliques (loot boss) + sauvegarde localStorage"
type: feat
status: active
date: 2026-06-15
origin: docs/brainstorms/2026-06-15-reliques-loot-boss-requirements.md
---

# US 6 — Reliques (loot boss) + sauvegarde localStorage

Premier hook de **progression long terme** : un boss meurt → une **relique** brillante tombe → on l'**équipe** dans l'un des 4 slots → on devient durablement plus fort. Et parce qu'une collection n'a de sens que si elle survit au reload, on intègre la **sauvegarde localStorage** dans la même US.

> Décisions produit tranchées en brainstorm — voir origin : [docs/brainstorms/2026-06-15-reliques-loot-boss-requirements.md](../brainstorms/2026-06-15-reliques-loot-boss-requirements.md). 4 slots équipables (SPEC complète), clic pour équiper, effets bornés à +% dégâts / +% drop d'or, save embarquée, une seule US **découpée en 4 checkpoints vérifiables**.

**Hook produit (fils 5 ans)** : le boss tombe, l'écran de transition annonce non seulement la zone suivante mais **« Tu as trouvé : 🗡️ Lame des Ruines ! »** dans la couleur de sa rareté. Le petit ouvre le panneau Reliques, clique sa nouvelle relique, et voit le **dps grimper d'un coup**. Et au prochain lancement, ses trésors sont toujours là.

## Découpage en checkpoints (une seule PR, chacun vert avant le suivant)

1. **Save** — persistance de l'état existant (or, troupes, zone). Vert = reload conserve la partie.
2. **Drop** — catalogue reliques + drop garanti boss + entrée en inventaire + feedback. Vert = tuer un boss donne une relique, conservée au reload.
3. **Équip** — panneau Reliques (4 slots + inventaire), clic pour équiper/swap. Vert = équip/swap fonctionnels et persistés.
4. **Effets** — multiplicateurs dégâts/or des reliques équipées. Vert = équiper fait monter le dps visiblement, l'or droppé augmente.

---

## Critères d'acceptation

### Checkpoint 1 — Sauvegarde
- [ ] **CA1** Au démarrage, `loadSave()` réhydrate l'état **avant** d'initialiser le moteur (`lastTickAt`, spawn, interval). Pas de flash d'or à 0 ni de mob zone 1 fugace. *(SpecFlow S1)*
- [ ] **CA2** Save corrompue (`JSON.parse` throw) → `try/catch` → démarrage état neuf, **pas de crash**, log discret. *(S2)*
- [ ] **CA3** Clé absente (1er lancement) → état par défaut, **sans** log d'erreur (cas nominal, distinct de CA2). *(S3)*
- [ ] **CA4** Hydratation **par champ avec défauts** (`raw.gold ?? 0`, `raw.inventory ?? []`…) : une save à laquelle il manque des champs (ajout de contenu futur) ne casse pas. *(S5)*
- [ ] **CA5** `saveVersion` présent ; squelette `migrate(raw)` (no-op v1) ; `version > SAVE_VERSION` → best-effort/neuf. *(S4)*
- [ ] **CA6** `saveNow()` unique appelé par : autosave (interval ~10 s), kill de boss, équip/swap, changement de zone, `beforeunload`. Interval + listener **nettoyés** dans le `return` d'`onMount`. *(S6, S7)*
- [ ] **CA7** Seuls les **primitifs durables** sont sérialisés (`version, gold, counts, currentZone, zonesUnlocked, inventory, equipped`). Aucun transient (`pops, isFlashing, isTransitioning, lastTickAt, enemy, enemyHp, mobIdx, isBoss…`). *(T1)*
- [ ] **CA8** Reload conserve or / troupes / zone courante / zonesUnlocked. *(critère de succès)*

### Checkpoint 2 — Drop
- [ ] **CA9** Mort d'un boss = **drop garanti** d'une relique (en plus de l'or), sur **les deux** paths (live + catch-up). Tirage placé **avant** la branche transition/`return`. *(D1)*
- [ ] **CA10** La relique droppée est une **instance** `{ uid, defId, rarity }` : `uid` = compteur incrémenté (clé `{#each}` + identité equip), `defId` → catalogue, `rarity` tirée au drop. *(C2, D6)*
- [ ] **CA11** Rareté tirée par **pondération** (commun/rare/légendaire), visible par **couleur**, et module la magnitude de l'effet. *(R2)*
- [ ] **CA12** Boss **avec** zone suivante : la relique est révélée **dans l'écran de transition** (« Tu as trouvé : … » + couleur rareté). Boss de **dernière zone** (pas de transition) : **pop dédié** de relique, décalé après le pop d'or (séquence kill → or → relique). *(D2, ordering pops US 2)*
- [ ] **CA13** Drop en **catch-up silencieux** (aucun pop par relique) ; le pop welcome-back résume **« +N reliques »** en plus de l'or. *(D3)*
- [ ] **CA14** RNG non déterministe en catch-up **assumé** (le *nombre* de reliques est correct = 1/boss ; rareté non rejouable, sans conséquence). *(D4)*
- [ ] **CA15** Reliques droppées **persistées** (inventaire survit au reload). *(R8)*

### Checkpoint 3 — Équipement
- [ ] **CA16** Panneau **Reliques** (colonne droite, remplace la Forge factice) : **4 slots** Arme/Armure/Bannière/Amulette en haut + **inventaire scrollable** dessous. *(R5, layout)*
- [ ] **CA17** L'inventaire liste les reliques **non équipées** ; les équipées sont dans leurs slots. État **vide** explicite (« Tue des boss pour trouver des reliques »). *(E2, E3)*
- [ ] **CA18** **Clic** sur une relique de l'inventaire → `equip(relique)` : slot vide → s'installe ; slot occupé → **swap** (l'ancienne retourne en inventaire). Réassignation `equipped`/`inventory` (réactivité). *(E1)*
- [ ] **CA19** Invariant : une instance (uid) est **soit** en inventaire **soit** dans un slot, jamais les deux — vérifié après reload. *(C3)*
- [ ] **CA20** À l'hydratation, **filtrer** silencieusement toute relique (inventaire ou slot) dont le `defId` n'existe plus au catalogue → slot vidé, pas de crash. *(C1)*

### Checkpoint 4 — Effets
- [ ] **CA21** `$: relicDmgMult` et `$: relicGoldMult` dérivés de `equipped` + catalogue (recalcul depuis le primitif, pas depuis le dérivé `dps`). *(convention US 3)*
- [ ] **CA22** `$: dps = (baseDps + Σ troupes) * relicDmgMult` → équiper une relique de dégâts fait **monter le dps affiché immédiatement**. *(R6 / CA bloquant E4)*
- [ ] **CA23** Or appliqué avec `Math.floor(enemy.gold * relicGoldMult)` sur **les deux** paths (live + catch-up). *(E4, E5)*
- [ ] **CA24** Pas de flottant affiché (dps via `formatNumber`, or arrondi). *(E5, CLAUDE.md)*
- [ ] **CA25** Aucune régression sur le combat, la transition de zone, le recrutement, le catch-up existants.

---

## Décisions techniques

### Nouveaux modules `src/lib/` (fonctions pures, kebab-case)

**`src/lib/reliques.js`** — catalogue + tirage pur.
```js
// Raretés : poids de tirage + couleur + multiplicateur d'effet.
export const RARITIES = {
  commun:     { label: 'Commun',     weight: 70, color: '#9aa0a6', mult: 1 },
  rare:       { label: 'Rare',       weight: 25, color: '#4ea1ff', mult: 2.5 },
  legendaire: { label: 'Légendaire', weight: 5,  color: '#d4af37', mult: 6 },
}

// Catalogue de définitions. effect.type ∈ { 'dmg', 'gold' } (pas de cooldown : pas d'actifs).
// base = valeur d'effet en % à la rareté commune ; magnitude finale = base * RARITIES[rarity].mult.
export const RELIQUES = {
  lame_rouillee:  { name: 'Lame Rouillée',   slot: 'arme',     sprite: '🗡️', effect: { type: 'dmg',  base: 5 } },
  hache_brisee:   { name: 'Hache Brisée',    slot: 'arme',     sprite: '🪓', effect: { type: 'dmg',  base: 6 } },
  cotte_maille:   { name: 'Cotte de Mailles',slot: 'armure',   sprite: '🛡️', effect: { type: 'dmg',  base: 4 } },
  heaume_terni:   { name: 'Heaume Terni',    slot: 'armure',   sprite: '⛑️', effect: { type: 'dmg',  base: 4 } },
  banniere_loup:  { name: 'Bannière du Loup',slot: 'banniere', sprite: '🚩', effect: { type: 'gold', base: 8 } },
  oriflamme:      { name: 'Oriflamme',       slot: 'banniere', sprite: '🏴', effect: { type: 'gold', base: 10 } },
  amulette_os:    { name: "Amulette d'Os",   slot: 'amulette', sprite: '📿', effect: { type: 'gold', base: 7 } },
  anneau_corbeau: { name: 'Anneau du Corbeau',slot: 'amulette',sprite: '💍', effect: { type: 'gold', base: 9 } },
}

const DEF_IDS = Object.keys(RELIQUES)

// Tirage pur (rng injecté pour testabilité). Renvoie { defId, rarity }.
export function rollRelique(rng = Math.random) {
  const defId = DEF_IDS[Math.floor(rng() * DEF_IDS.length)]
  const total = Object.values(RARITIES).reduce((s, r) => s + r.weight, 0)
  let roll = rng() * total
  let rarity = 'commun'
  for (const [key, r] of Object.entries(RARITIES)) {
    if ((roll -= r.weight) < 0) { rarity = key; break }
  }
  return { defId, rarity }
}

// Magnitude d'effet (%) d'une instance, dérivée du catalogue (pas snapshotée).
export function reliqueEffect(defId, rarity) {
  const def = RELIQUES[defId]
  if (!def) return null
  return { type: def.effect.type, pct: def.effect.base * RARITIES[rarity].mult }
}
```
> Chiffres = base d'équilibrage, à ajuster en jouant. Pondération 70/25/5. **Note** : `slot` ne contraint pas le type d'effet (arme/armure = dmg, bannière/amulette = gold ici), simple cohérence thématique.

**`src/lib/save.js`** — persistance versionnée, défensive.
```js
const SAVE_KEY = 'croisade.save'
export const SAVE_VERSION = 1

// Construit le payload durable depuis l'état (primitifs uniquement).
export function serialize(state) {
  return {
    version: SAVE_VERSION,
    gold: state.gold,
    counts: state.counts,
    currentZone: state.currentZone,
    zonesUnlocked: state.zonesUnlocked,
    inventory: state.inventory,   // [{ uid, defId, rarity }]
    equipped: state.equipped,     // { arme:uid|null, armure, banniere, amulette }
    nextReliqueUid: state.nextReliqueUid,
  }
}

export function saveNow(state) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(serialize(state))) }
  catch (_) { /* quota / mode privé : échec silencieux (S9) */ }
}

// Charge + migre + hydrate par champ. Renvoie null si rien/illisible.
export function loadSave() {
  const raw = localStorage.getItem(SAVE_KEY)
  if (raw == null) return null            // 1er lancement (S3)
  let data
  try { data = JSON.parse(raw) } catch (_) { return null }  // corrompu (S2)
  if (typeof data !== 'object' || data == null) return null
  return migrate(data)                    // (S4)
}

function migrate(data) {
  // v1 : no-op. Squelette pour les futures versions.
  return data
}
```

### Catalogue/état dans `App.svelte`

```js
// const (après TROOP_ORDER, ~ligne 52) :
import { RELIQUES, RARITIES, rollRelique, reliqueEffect } from './lib/reliques.js'
import { loadSave, saveNow, SAVE_VERSION } from './lib/save.js'
const RELIQUE_SLOTS = ['arme', 'armure', 'banniere', 'amulette']
const SLOT_LABELS = { arme: 'Arme', armure: 'Armure', banniere: 'Bannière', amulette: 'Amulette' }
const AUTOSAVE_MS = 10000

// let (avec les autres états) :
let inventory = []                         // [{ uid, defId, rarity }] non équipées
let equipped = { arme: null, armure: null, banniere: null, amulette: null } // uid|null
let nextReliqueUid = 0
```

### Hydratation défensive (au load)

```js
function hydrate(raw) {
  gold = raw.gold ?? 0
  counts = { paysan: 0, soldat: 0, chevalier: 0, champion: 0, ...(raw.counts ?? {}) }
  currentZone = zones[raw.currentZone] ? raw.currentZone : 1
  zonesUnlocked = raw.zonesUnlocked ?? 1
  nextReliqueUid = raw.nextReliqueUid ?? 0
  // Filtrer les instances dont le defId a disparu du catalogue (C1).
  const known = (r) => r && RELIQUES[r.defId]
  inventory = (raw.inventory ?? []).filter(known)
  const eq = { arme: null, armure: null, banniere: null, amulette: null }
  // equipped persiste des uid ; on garde le mapping slot→uid si l'instance existe encore.
  // (Modèle alternatif : equipped stocke les instances. À trancher en code — voir gotchas.)
  equipped = { ...eq, ...(raw.equipped ?? {}) }
}
```
> **Décision de modèle à figer au checkpoint 3** : `inventory` porte les instances ; `equipped[slot]` porte **l'instance équipée elle-même** (pas un uid pointant vers l'inventaire) — invariant CA19 « une instance est soit en inventaire soit équipée ». Ça simplifie le filtrage C1 (filtrer aussi les slots) et le rendu. Le pseudo-code ci-dessus sera ajusté pour stocker l'instance dans `equipped[slot]`.

### Drop dans `applyOneTick` (point exact)

```js
if (enemyHp <= 0) {
  gold += Math.floor(enemy.gold * relicGoldMult)     // CA23 : mult or, les deux paths
  if (withAnim) later(() => pushPop('gold', enemy.gold), 150)

  if (isBoss) {
    // --- DROP : avant toute logique de zone / return (D1) ---
    const drop = rollRelique()
    const relic = { uid: nextReliqueUid++, defId: drop.defId, rarity: drop.rarity }
    inventory = [...inventory, relic]
    droppedThisTick = relic                            // mémorisé pour le feedback

    const next = currentZone + 1
    const hasNext = zones[next] !== undefined
    if (hasNext) {
      zonesUnlocked = Math.max(zonesUnlocked, next)
      if (withAnim) {
        startZoneTransition(next, relic)               // relique révélée dans l'écran
        saveNow(state())                               // CA6 : save sur kill boss
        return
      }
      currentZone = next
    }
    wave = 1
    if (withAnim && !hasNext) {
      triggerVictory()
      later(() => pushPop('relic', relic), 450)        // pop dédié, après l'or (D2)
    }
    if (withAnim) saveNow(state())
  } else {
    wave += 1
  }
  // ... respawn live / catch-up inchangé
}
```
> `startZoneTransition(next, relic)` reçoit la relique pour l'afficher dans l'overlay (`transitionRelic`). En catch-up (`withAnim:false`), aucun pop ; le compteur de reliques gagnées est résumé dans le welcome-back (étendre le bloc `goldBefore`/`gained` du `tick()` avec un `relicsBefore = inventory.length`).

### Multiplicateurs (dérivés)

```js
$: equippedList = RELIQUE_SLOTS.map(s => equipped[s]).filter(Boolean)
$: relicDmgMult  = 1 + equippedList
  .map(r => reliqueEffect(r.defId, r.rarity))
  .filter(e => e?.type === 'dmg')
  .reduce((s, e) => s + e.pct / 100, 0)
$: relicGoldMult = 1 + equippedList
  .map(r => reliqueEffect(r.defId, r.rarity))
  .filter(e => e?.type === 'gold')
  .reduce((s, e) => s + e.pct / 100, 0)
$: dps = (baseDps + TROOP_ORDER.reduce((s, id) => s + counts[id] * TROOPS[id].dps, 0)) * relicDmgMult
```

### Équipement

```js
function equip(relic) {
  const slot = RELIQUES[relic.defId].slot
  const current = equipped[slot]
  equipped = { ...equipped, [slot]: relic }
  inventory = inventory.filter(r => r.uid !== relic.uid)
  if (current) inventory = [...inventory, current]      // swap : ancienne revient
  saveNow(state())                                       // CA6
}
```

### Save : load + autosave dans `onMount`

```js
onMount(() => {
  const raw = loadSave()
  if (raw) hydrate(raw)
  spawnNextEnemy()                       // ennemi cohérent avec currentZone/wave (T1)
  lastTickAt = performance.now()         // APRÈS hydrate (S1, S8 : pas d'offline-progress)
  const intervalId = setInterval(tick, tickMs)
  const autosaveId = setInterval(() => saveNow(state()), AUTOSAVE_MS)
  const onUnload = () => saveNow(state())
  window.addEventListener('beforeunload', onUnload)
  return () => {
    clearInterval(intervalId)
    clearInterval(autosaveId)
    window.removeEventListener('beforeunload', onUnload)
    pendingTimeouts.forEach(clearTimeout)
    pendingTimeouts.clear()
  }
})

// Snapshot de l'état durable pour saveNow (évite de passer 7 args).
function state() {
  return { gold, counts, currentZone, zonesUnlocked, inventory, equipped, nextReliqueUid }
}
```

### UI — panneau Reliques (remplace la Forge factice, colonne droite)

```svelte
<aside class="panel reliques">
  <div class="panel-title">💎 Reliques</div>
  <div class="relic-slots">
    {#each RELIQUE_SLOTS as slot}
      <div class="relic-slot" class:empty={!equipped[slot]}>
        {#if equipped[slot]}
          <span class="relic-icon" style="color:{RARITIES[equipped[slot].rarity].color}">
            {RELIQUES[equipped[slot].defId].sprite}
          </span>
        {:else}<span class="relic-slot-label">{SLOT_LABELS[slot]}</span>{/if}
      </div>
    {/each}
  </div>
  <div class="relic-inventory">
    {#if inventory.length === 0}
      <div class="relic-empty">Tue des boss pour trouver des reliques 💀</div>
    {:else}
      {#each inventory as r (r.uid)}
        <button class="relic-item" on:click={() => equip(r)}
          style="border-color:{RARITIES[r.rarity].color}">
          <span class="relic-icon">{RELIQUES[r.defId].sprite}</span>
          <span class="relic-info">
            <span class="relic-name">{RELIQUES[r.defId].name}</span>
            <span class="relic-effect">
              +{Math.round(reliqueEffect(r.defId, r.rarity).pct)}%
              {reliqueEffect(r.defId, r.rarity).type === 'dmg' ? 'dégâts' : 'or'}
            </span>
          </span>
        </button>
      {/each}
    {/if}
  </div>
</aside>
```
> Native `<button>` pour les items (focus/clavier gratuits, CLAUDE.md). Couleur de rareté en bordure/icône. CSS : `.relic-slots` (grille 4), `.relic-slot(.empty)`, `.relic-item`, `.relic-empty`, `.pop.relic-pop` (couleur via style inline). Pop `relic` ajouté à `POP_LIFE_MS` → 3 kinds : **extraire `pushPop`/`pops` dans `src/lib/popups.js`** (seuil convention atteint).

## Étapes d'implémentation (par checkpoint)

**CP1 — Save**
1. `src/lib/save.js` (SAVE_KEY, SAVE_VERSION, serialize, saveNow, loadSave, migrate).
2. `App.svelte` : `state()`, `hydrate(raw)` (sans reliques pour l'instant), branchement `onMount` (load → spawn → lastTickAt → intervals + beforeunload + cleanup).
3. **Valider** : jouer, recruter, changer de zone, reload → tout est conservé ; vider la clé → départ neuf ; mettre une valeur corrompue → pas de crash.

**CP2 — Drop**
4. `src/lib/reliques.js` (catalogue, rollRelique, reliqueEffect).
5. Extraire `src/lib/popups.js` (3e kind `relic`).
6. État `inventory`/`equipped`/`nextReliqueUid` + drop dans `applyOneTick` (avant `return`), feedback transition (`startZoneTransition(next, relic)` + `transitionRelic` dans l'overlay) et pop dernière zone, résumé catch-up.
7. Étendre `serialize`/`hydrate` (reliques + filtrage C1).
8. **Valider** : tuer boss zone 1 (relique dans l'écran de transition), tuer boss dernière zone (pop relique), reload → inventaire conservé ; tester le drop en catch-up (booster baseDps + onglet background) → silencieux + résumé.

**CP3 — Équip**
9. Panneau Reliques (slots + inventaire + vide) en remplacement de la Forge ; `equip(relic)` + swap ; `equipped` stocke l'instance (invariant CA19).
10. **Valider** : équiper, swap, reload → équipées conservées, pas de doublon inventaire/slot ; lire le DOM **après re-render** (gotcha vérif).

**CP4 — Effets**
11. `relicDmgMult`/`relicGoldMult` dérivés ; `dps` multiplié ; or `Math.floor(enemy.gold * relicGoldMult)` sur les deux paths ; arrondis.
12. **Valider** : équiper relique dégâts → dps monte immédiatement ; relique or → gain d'or par kill augmente (live ET catch-up) ; pas de flottant affiché.

**Build, commit (par checkpoint si possible), PR, /review, /ce:compound (1er pattern save → enrichir le doc patterns).**

## Hors scope

- **Offline-progress** (rejouer les kills pendant l'onglet *fermé*) : on persiste l'état, pas le temps écoulé. `lastTickAt` reste en `performance.now()`, non persisté. *(S8)* — à documenter pour que ce ne soit pas pris pour un bug.
- **Effet −% cooldown** (pas d'actifs encore), vente / destruction / fusion de reliques, tooltip riche, drag & drop.
- **Tri / pagination de l'inventaire** : panneau scrollable suffit pour cette US ; tri à prévoir si l'inventaire devient illisible *(I1, future US)*.
- **Conservation au prestige** : prestige = V3 ; le format de save est conçu extensible (champ `version`, primitifs uniquement).
- Backup de save corrompue (`.bak`), gestion fine du quota localStorage.

## Gotchas anticipés

- **Drop après le `return` de transition** = boss de fin de zone ne droppe jamais → tirer la relique **dès `isBoss`**, avant la branche `hasNext`/`return`. *(D1, le plus critique)*
- **`equipped` doit déclencher la réactivité** : réassigner (`equipped = {...equipped, [slot]: relic}`), jamais muter. Idem `inventory`. *(E1, E4)*
- **Multiplicateur d'or sur les deux paths** : `gold += Math.floor(enemy.gold * relicGoldMult)` aussi en catch-up, sinon montants faux au retour. *(E4)*
- **uid d'instance obligatoire** pour `{#each inventory as r (r.uid)}` et pour identifier la bonne relique à équiper quand deux ont le même `defId`. *(C2)*
- **Invariant inventaire/équipé** : une instance est dans `inventory` **ou** `equipped`, jamais les deux. Sérialiser les deux séparément, vérifier après reload. *(C3)*
- **`enemy` lu dans le feedback de drop** : capturer la relique (`droppedThisTick`/argument) avant `startZoneTransition`+`return` ; ne pas relire `enemy` après (il mute à T+2000). *(D2)*
- **Cleanup de l'autosave interval + listener `beforeunload`** dans le `return` d'`onMount` (HMR accumule sinon). *(S7)*
- **Ordre `onMount`** : `loadSave/hydrate` → `spawnNextEnemy` → `lastTickAt` → intervals. Sinon flash d'état par défaut. *(S1)*
- **Ne pas persister les transients** ni `enemy/enemyHp/wave?` (reconstruits au load). *(T1)*
- **3e kind de pop** (`relic`) = seuil d'extraction `src/lib/popups.js` (convention CLAUDE.md).
- **`migrate` no-op mais présent** : le squelette doit exister dès v1 pour les futures évolutions. *(S4)*

## Estimation

**~3-4 h** avec le fils, en 4 temps. Le grand moment : le boss de la Forêt tombe, l'écran annonce **« LES RUINES »** ET **« 🗡️ Lame des Ruines — Légendaire ! »** en doré. Le petit ouvre les Reliques, clique, et hurle « JE FAIS PLUS DE DÉGÂTS ! ». Puis on recharge la page exprès — et tout est encore là.

## Sources & références

- **Origin** : [docs/brainstorms/2026-06-15-reliques-loot-boss-requirements.md](../brainstorms/2026-06-15-reliques-loot-boss-requirements.md) — décisions portées : 4 slots équipables, clic pour équiper, save embarquée, effets dmg/or uniquement, une US en 4 checkpoints.
- Patterns : [docs/solutions/patterns/idle-game-tick-and-popups.md](../solutions/patterns/idle-game-tick-and-popups.md) — split `withAnim` (drop silencieux en catch-up), `pops`/overlays + `invocationId`, `later()`, réassignation réactive, catalogues.
- Plan US 5 (catalogues, transition) : [2026-06-13-006-feat-us-5-zone-2-soldat-plan.md](2026-06-13-006-feat-us-5-zone-2-soldat-plan.md).
- Code : [src/App.svelte](../../src/App.svelte) (`applyOneTick` ~177-223, `startZoneTransition` ~161-175, `tick` ~228-246, `onMount` ~248-256), [src/app.css](../../src/app.css) (`.panel`, `.unit`, `.forge`, `.pop`), [src/lib/format.js](../../src/lib/format.js).
- SPEC : [SPEC.md](../../SPEC.md) (Reliques, Save).

## À capitaliser après l'US

Premier système de **persistance** du projet → enrichir [idle-game-tick-and-popups.md](../solutions/patterns/idle-game-tick-and-popups.md) d'une section « save versionnée + hydratation défensive » (schéma versionné, primitifs only, parse défensif, filtrage des ids disparus, load avant init moteur). *(recommandation learnings-researcher)*
