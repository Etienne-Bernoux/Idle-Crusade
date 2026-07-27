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
import { gloireGain } from '../src/lib/prestige.js'
import { BRANCHES, branchNodes, treeEffects, isUnlockable, buyNode } from '../src/lib/tree.js'

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
export function runUntilZoneCleared(treeNodes = [], targetZone = 5, buy = true) {
  const eff = treeEffects(treeNodes)
  // Miroir de doPrestige() : l'Arbre paie le démarrage du run.
  const state = {
    gold: eff.startGold,
    counts: TROOP_ORDER.reduce((acc, id) => ({ ...acc, [id]: id === 'paysan' ? eff.startTroops : 0 }), {}),
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
  const gloire = Math.floor(gloireGain(state.wavesCleared) * eff.gloireMult)
  return { ticks, perZone, state, gloire }
}

// Boucle de prestige paramétrable, pour comparer des variantes d'équilibrage.
// gloireOf(state) : la formule de gain à tester (défaut = celle du jeu).
export function simulateCycles({ cycles = 4 } = {}) {
  let nodes = []
  let purse = 0
  const out = []
  for (let cycle = 1; cycle <= cycles; cycle++) {
    const run = runUntilZoneCleared(nodes, 5, true)
    out.push({
      cycle,
      ticks: run.ticks,
      gained: run.gloire,
      nodes: [...nodes],
      ratio: out.length ? run.ticks / out[out.length - 1].ticks : null,
    })
    const spend = spendGloire(nodes, purse + run.gloire)
    nodes = spend.owned
    purse = spend.remaining
  }
  return out
}

// Dépense la Gloire dans l'Arbre. Politique : le nœud ouvert le moins cher
// d'abord, en privilégiant les branches qui accélèrent le cycle suivant
// (Croisade puis Guerre puis Fortune) à coût égal. C'est l'approximation d'un
// joueur qui optimise sa progression, pas d'un joueur qui thématise.
const BRANCH_PRIORITY = ['croisade', 'guerre', 'fortune', 'reliques']

export function spendGloire(owned, gloire) {
  let purse = gloire
  let nodes = [...owned]
  for (;;) {
    const candidates = BRANCHES.flatMap(b => branchNodes(b.id))
      .filter(n => isUnlockable(n.id, nodes) && n.cost <= purse)
      .sort((a, b) =>
        a.cost - b.cost ||
        BRANCH_PRIORITY.indexOf(a.branch) - BRANCH_PRIORITY.indexOf(b.branch))
    if (!candidates.length) return { owned: nodes, remaining: purse }
    const res = buyNode(candidates[0].id, nodes, purse)
    purse = res.gloire
    nodes = res.owned
  }
}

function main() {
  const cycles = Number(process.argv[2] ?? 4)

  console.log('=== Détail du premier run (aucune Gloire) ===')
  const first = runUntilZoneCleared([], 5, true)
  for (const z of first.perZone) {
    console.log(`  zone ${z.zone} ${z.name.padEnd(20)} ${String(z.ticks).padStart(7)} ticks  ${fmtDuration(z.ticks).padStart(12)}  (cumul ${fmtDuration(z.cumulative)})`)
  }
  console.log(`  troupes finales : ${TROOP_ORDER.map(id => `${id} ${first.state.counts[id]}`).join(', ')}`)

  console.log('\n=== Cycles de prestige (Arbre de Gloire) ===')
  const cy = simulateCycles({ cycles })
  for (const c of cy) {
    const depth = BRANCHES.map(b => {
      const d = c.nodes.filter(id => id.startsWith(b.id + '-')).length
      return `${b.sprite}${d}`
    }).join(' ')
    console.log(
      `  Croisade #${String(c.cycle).padStart(2)} : ${fmtDuration(c.ticks).padStart(12)}` +
      (c.ratio ? `  (×${c.ratio.toFixed(2)})` : '        ') +
      `  → +${String(c.gained).padStart(5)} Gloire   arbre ${depth}`,
    )
  }
  console.log('\n  Cible DESIGN.md : 1er cycle ≈ 1 h, puis ×0.6 par cycle.')
}

// Exécuté directement (et non importé par un test) → on lance la mesure.
if (process.argv[1] && process.argv[1].endsWith('simulate.mjs')) main()
