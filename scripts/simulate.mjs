// Simulateur d'équilibrage — `node scripts/simulate.mjs`
//
// Rejoue la boucle de combat hors navigateur pour mesurer la durée d'un run et
// de ses cycles de prestige (ticket V3-06). Consomme les MÊMES modules que le
// jeu : src/lib/content.js (zones, troupes), economy.js (coûts), prestige.js
// (Gloire, Forge). Aucune valeur d'équilibrage n'est recopiée ici.
//
// Ce qu'il modélise fidèlement : le tick de combat, les PV/or des ennemis, la
// progression vague → boss → zone, la courbe de coût, les effets de la Forge.
//
// Ce qu'il SIMPLIFIE — à garder en tête en lisant les chiffres :
//   - pas de variance de dégâts (le jeu ajoute ±4, d'espérance nulle) ;
//   - pas de reliques (le jeu en droppe une par boss : +4 à +60% dégâts ou or,
//     donc les durées réelles sont un peu MEILLEURES que celles annoncées ici) ;
//   - pas de Cri de Guerre (actif, suppose un joueur présent) ;
//   - joueur parfaitement rationnel qui réinvestit en continu.
// La fidélité de la boucle est calibrée contre le vrai jeu : voir
// docs/plans/2026-07-27-003-feat-us-15-prestige-balance-plan.md § Calibration.

import { ZONES, TROOPS, TROOP_ORDER, BASE_DPS } from '../src/lib/content.js'
import { unitCost, maxAffordable } from '../src/lib/economy.js'
import { metaEffects, gloireGain, upgradeCost, META_UPGRADES, emptyMetaLevels } from '../src/lib/prestige.js'

const TICK_MS = 800
const MAX_TICKS = 20_000_000   // garde-fou anti-boucle infinie

function fmtDuration(ticks) {
  const s = Math.round(ticks * TICK_MS / 1000)
  if (s < 90) return `${s} s`
  const m = Math.floor(s / 60)
  if (m < 90) return `${m} min ${String(s % 60).padStart(2, '0')} s`
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`
}

// Politique d'achat : réinvestir dans le tier au meilleur rendement (dps par or),
// en MAX, tant que c'est finançable. C'est l'approximation d'un joueur qui optimise.
function invest(state, eff) {
  for (;;) {
    let best = null
    for (const id of TROOP_ORDER) {
      const t = TROOPS[id]
      if (state.zonesUnlocked < t.unlockZone) continue
      if (t.requiresMeta && !eff.championUnlocked) continue
      const cost = unitCost(t.baseCost, state.counts[id], eff.costMult)
      if (cost > state.gold) continue
      const ratio = t.dps / cost
      if (!best || ratio > best.ratio) best = { id, ratio }
    }
    if (!best) return
    const t = TROOPS[best.id]
    const { count, cost } = maxAffordable(t.baseCost, state.counts[best.id], state.gold, eff.costMult)
    if (count === 0) return
    state.gold -= cost
    state.counts[best.id] += count
  }
}

function dpsOf(state, eff) {
  const troops = TROOP_ORDER.reduce((s, id) => s + state.counts[id] * TROOPS[id].dps, 0)
  return (BASE_DPS + troops) * eff.dmgMult
}

// Joue un run jusqu'à avoir clear `targetZone`. Renvoie les ticks écoulés et
// le détail par zone. `buy` à false = mesure la boucle de combat seule (calibration).
export function runUntilZoneCleared(metaLevels = emptyMetaLevels(), targetZone = 5, buy = true) {
  const eff = metaEffects(metaLevels)
  const state = {
    gold: 0,
    counts: TROOP_ORDER.reduce((acc, id) => ({ ...acc, [id]: 0 }), {}),
    zonesUnlocked: 1,
    zonesCleared: 0,
    wavesCleared: 0,
    goldEarned: 0,
  }
  const perZone = []
  let ticks = 0
  let zoneStartTick = 0

  for (let zone = 1; zone <= targetZone; zone++) {
    const z = ZONES[zone]
    for (let wave = 1; wave <= z.waves; wave++) {
      const isBoss = wave === z.waves
      const enemy = isBoss ? z.boss : z.mobs[(wave - 1) % z.mobs.length]
      let hp = enemy.hpMax
      while (hp > 0) {
        if (buy) invest(state, eff)
        const dmg = Math.round(dpsOf(state, eff))
        hp -= dmg
        ticks += 1
        if (ticks > MAX_TICKS) throw new Error(`soft-lock : zone ${zone} vague ${wave} jamais tuée`)
      }
      const earned = Math.floor(enemy.gold * eff.goldMult)
      state.gold += earned
      state.goldEarned += earned
      state.wavesCleared += 1
      if (isBoss) {
        state.zonesCleared = Math.max(state.zonesCleared, zone)
        state.zonesUnlocked = Math.max(state.zonesUnlocked, zone + 1)
      }
    }
    perZone.push({ zone, name: z.name, ticks: ticks - zoneStartTick, cumulative: ticks })
    zoneStartTick = ticks
  }
  return { ticks, perZone, state, gloire: gloireGain(state.wavesCleared) }
}

// Boucle de prestige paramétrable, pour comparer des variantes d'équilibrage.
// gloireOf(state) : la formule de gain à tester (défaut = celle du jeu).
export function simulateCycles({ cycles = 4, gloireOf = (s) => gloireGain(s.wavesCleared) } = {}) {
  let levels = emptyMetaLevels()
  let purse = 0
  const out = []
  for (let cycle = 1; cycle <= cycles; cycle++) {
    const run = runUntilZoneCleared(levels, 5, true)
    const gained = gloireOf(run.state)
    out.push({
      cycle,
      ticks: run.ticks,
      gained,
      levels: { ...levels },
      ratio: out.length ? run.ticks / out[out.length - 1].ticks : null,
    })
    const spend = spendGloire(levels, purse + gained)
    levels = spend.levels
    purse = spend.remaining
  }
  return out
}

// Dépense la Gloire disponible sur la Forge, du meilleur rendement au pire.
// Priorité : Fureur et Butin (elles accélèrent directement le run suivant),
// puis Intendance, puis le Serment du Champion, puis le reste.
const SPEND_ORDER = ['fureur', 'butin', 'intendance', 'champion', 'discipline', 'fortune']

export function spendGloire(levels, gloire) {
  const next = { ...levels }
  let purse = gloire
  let bought = true
  while (bought) {
    bought = false
    for (const id of SPEND_ORDER) {
      const up = META_UPGRADES.find(u => u.id === id)
      const cost = upgradeCost(id, next[id] ?? 0)
      if (cost !== null && cost <= purse && (next[id] ?? 0) < up.maxLevel) {
        purse -= cost
        next[id] = (next[id] ?? 0) + 1
        bought = true
      }
    }
  }
  return { levels: next, remaining: purse }
}

function main() {
  const cycles = Number(process.argv[2] ?? 4)

  console.log('=== Détail du premier run (aucune Gloire) ===')
  const first = runUntilZoneCleared(emptyMetaLevels(), 5, true)
  for (const z of first.perZone) {
    console.log(`  zone ${z.zone} ${z.name.padEnd(20)} ${String(z.ticks).padStart(7)} ticks  ${fmtDuration(z.ticks).padStart(12)}  (cumul ${fmtDuration(z.cumulative)})`)
  }
  console.log(`  troupes finales : ${TROOP_ORDER.map(id => `${id} ${first.state.counts[id]}`).join(', ')}`)

  console.log('\n=== Cycles de prestige ===')
  let levels = emptyMetaLevels()
  let purse = 0
  let previous = null
  for (let cycle = 1; cycle <= cycles; cycle++) {
    const run = runUntilZoneCleared(levels, 5, true)
    const ratio = previous ? run.ticks / previous : null
    const spent = Object.entries(levels).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v}`).join(', ') || 'aucune upgrade'
    console.log(
      `  Croisade #${cycle} : ${fmtDuration(run.ticks).padStart(12)}` +
      (ratio ? `  (×${ratio.toFixed(2)} vs cycle précédent)` : '') +
      `  → +${run.gloire} Gloire   [${spent}]`,
    )
    previous = run.ticks
    const spend = spendGloire(levels, purse + run.gloire)
    levels = spend.levels
    purse = spend.remaining
  }
  console.log(`\n  Cible DESIGN.md : 1er cycle ≈ 1 h, 2e ≈ 30 min (×0.6 par cycle).`)
}

// Exécuté directement (et non importé par un test) → on lance la mesure.
if (process.argv[1] && process.argv[1].endsWith('simulate.mjs')) main()
