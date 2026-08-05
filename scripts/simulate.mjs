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
// Reliques et actifs sont modélisés depuis l'US 27 (options `--no-relics` /
// `--no-actives` pour retrouver l'ancien comportement). Ils ne sont pas
// approchés par une moyenne : les actifs sont joués sur la vraie timeline de
// ticks, les reliques réellement tirées et équipées. Motif : un playtest
// navigateur a mesuré le premier cycle à 10 min 11 là où le simulateur sans eux
// annonce 22 min 18 — un facteur 2,2, pas un détail.
//
// Ce qu'il SIMPLIFIE encore — à garder en tête en lisant les chiffres :
//   - pas de variance de dégâts (le jeu ajoute ±4, d'espérance nulle) ;
//   - joueur parfaitement rationnel qui réinvestit en continu et lance chaque
//     actif dès qu'il est prêt ;
//   - politique d'équipement des reliques volontairement bête : on équipe si le
//     slot est vide ou si le pourcentage brut est meilleur, sans arbitrer entre
//     un bonus d'or et un bonus de dégâts ;
//   - la Frappe (US 38) n'est pas modélisée clic par clic : `heroDps` y tient
//     lieu de « joueur présent qui frappe de temps en temps ». C'est un
//     PLANCHER — un joueur qui clique vraiment démarre plus vite que ce que le
//     simulateur annonce, surtout dans les premières secondes d'un run ;
//   - pas de forge ni de fusion de reliques (US 26) ;
//   - pas de boss télégraphiés (US 30) : le simulateur ne contre jamais, il
//     subit donc les trois malus de chaque boss. Ses durées de fin de zone sont
//     PESSIMISTES pour un joueur présent, fidèles pour un joueur absent ;
//   - pas de places d'inventaire ni d'or de fonte, donc la Voie du Reliquaire
//     est sous-évaluée.
// La fidélité de la boucle est calibrée contre le vrai jeu : voir
// docs/plans/2026-07-27-003-feat-us-15-prestige-balance-plan.md § Calibration.

import { TROOPS, TROOP_ORDER, BASE_DPS, zoneAt } from '../src/lib/content.js'
import { unitCost, maxAffordable } from '../src/lib/economy.js'
import { gloireGain, rarityWeights } from '../src/lib/prestige.js'
import { rollRelique, reliqueEffect, equipRelique, RELIQUES, RELIQUE_SLOTS } from '../src/lib/reliques.js'
import { ACTIVES, activeTimings, isActiveUnlocked } from '../src/lib/actives.js'
import { biomeEffects, unlockedBiomes } from '../src/lib/biomes.js'
import { averageHit, BASE_CRIT_CHANCE, BASE_CRIT_MULT } from '../src/lib/combat.js'
import { roleEffects } from '../src/lib/roles.js'
import { TROOP_ORDER as ORDER } from '../src/lib/content.js'
import { TREE, BRANCHES, treeEffects, isUnlockable, buyNode, isBranchComplete, echoCost, buyEcho } from '../src/lib/tree.js'
import { UPGRADE_KINDS, upgradePrice, levelOf, buyTroopUpgrade, troopDmgMult, roleUpgradeMult } from '../src/lib/upgrades.js'
import { pantheonEffects, legendeGain, LEGENDE_MIN_ZONE } from '../src/lib/legende.js'
import { ACHIEVEMENTS, achievementEffects } from '../src/lib/achievements.js'
import { voeuEffects } from '../src/lib/voeux.js'
import { VOIES, voieEffects } from '../src/lib/route.js'
import { patineMult } from '../src/lib/patine.js'
import { TELEGRAPHS, bossDebuffs } from '../src/lib/boss.js'

const TICK_MS = 800
const MAX_TICKS = 20_000_000   // garde-fou anti-boucle infinie

// --- Aléa reproductible ------------------------------------------------------
// Les reliques introduisent du hasard, donc un run n'est plus une valeur mais
// une distribution. Un générateur à graine rend chaque mesure rejouable, et
// permet de moyenner sur plusieurs graines au lieu de conclure sur un coup de
// chance — c'est précisément ce que la mesure navigateur ne savait pas faire.
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// --- Actifs ------------------------------------------------------------------
// Joués sur la vraie timeline : chaque actif a une durée et un cooldown en
// ticks, et le joueur simulé le relance dès qu'il est prêt. Pas de moyenne
// d'uptime : la Percée qui tombe pendant un boss blindé ne vaut pas la même
// chose qu'étalée uniformément.
function freshActives() {
  return ACTIVES.reduce((acc, a) => ({ ...acc, [a.id]: { left: 0, cd: 0 } }), {})
}

function tickActives(act, zonesUnlocked, timingOpts) {
  for (const a of ACTIVES) {
    const s = act[a.id]
    if (s.left > 0) s.left -= 1
    if (s.cd > 0) s.cd -= 1
    if (s.left <= 0 && s.cd <= 0 && isActiveUnlocked(a.id, zonesUnlocked)) {
      const { durationMs, cooldownMs } = activeTimings(a.id, timingOpts)
      s.left = Math.max(1, Math.round(durationMs / TICK_MS))
      s.cd = Math.max(1, Math.round(cooldownMs / TICK_MS))
    }
  }
}

function currentActiveEffects(act) {
  let dmgMult = 1, goldMult = 1, critBonus = 0, ignoreArmor = false
  for (const a of ACTIVES) {
    if (act[a.id].left <= 0) continue
    if (a.effect.dmgMult) dmgMult *= a.effect.dmgMult
    if (a.effect.goldMult) goldMult *= a.effect.goldMult
    if (a.effect.critBonus) critBonus += a.effect.critBonus
    if (a.effect.ignoreArmor) ignoreArmor = true
  }
  return { dmgMult, goldMult, critBonus, ignoreArmor }
}

// --- Reliques ----------------------------------------------------------------
// Un drop garanti par boss, tiré avec les poids de rareté que l'Arbre améliore.
// Politique d'équipement assumée simple (cf. préambule) : slot vide, ou
// pourcentage brut supérieur.
let LIMITED_SLOTS = null
// La Patine (US 40) mûrit à l'horloge murale. Le simulateur tient un temps
// simulé en ticks : on le convertit en ms pour réutiliser la VRAIE fonction du
// jeu plutôt que d'en réécrire une approximation qui dériverait.
// Forçage de la Patine pour le banc de mesure. Nécessaire, parce qu'elle est
// INMESURABLE dans un run : +1,25 %/heure, alors qu'un run dure des minutes.
// Elle n'existe qu'entre les sessions — la modéliser tick par tick est juste,
// mais ne dira jamais rien. Pour connaître son plafond, il faut l'imposer.
let PATINE_FORCEE = null
function relicTotals(equipped, eff, legRelicMult = 1, nowTick = 0) {
  // treeEffects() expose relicEffectMult, PAS relicPct/relicMult (qui sont les clés
  // d'effet des NŒUDS, pas de l'agrégat). Lire les mauvaises laissait le boost à 1 :
  // la branche Reliques était mesurée avec son effet principal éteint, et paraissait
  // faible pour cette seule raison.
  const boost = (eff.relicEffectMult ?? 1) * legRelicMult
  let dmg = 0, gold = 0, crit = 0
  for (const slot of (LIMITED_SLOTS ?? RELIQUE_SLOTS)) {
    const r = equipped[slot]
    if (!r) continue
    const e = reliqueEffect(r.defId, r.rarity, r.level ?? 0)
    if (!e) continue
    const patine = PATINE_FORCEE ?? patineMult((r.equippedAtTick ?? 0) * TICK_MS, nowTick * TICK_MS)
    e.pct *= patine
    if (e.type === 'dmg') dmg += e.pct * boost
    else if (e.type === 'gold') gold += e.pct * boost
    else if (e.type === 'crit') crit += e.pct * boost
  }
  return { dmg, gold, crit }
}

function maybeEquip(state, rolled, nowTick = 0) {
  // rollRelique() ne pose pas d'uid — c'est l'appelant qui le fait dans le jeu.
  // Sans lui, le filtre d'equipRelique() ne distingue pas deux exemplaires.
  const relic = { ...rolled, uid: state.nextUid++, level: 0, equippedAtTick: nowTick }
  const slot = RELIQUES[relic.defId].slot
  const cur = state.equipped[slot]
  const val = r => (r ? (reliqueEffect(r.defId, r.rarity, r.level ?? 0)?.pct ?? 0) : -1)
  if (val(relic) <= val(cur)) { state.inventory.push(relic); return }
  const res = equipRelique(state.inventory, state.equipped, relic)
  state.inventory = res.inventory
  state.equipped = res.equipped
}

function fmtDuration(ticks) {
  const s = Math.round(ticks * TICK_MS / 1000)
  if (s < 90) return `${s} s`
  const m = Math.floor(s / 60)
  if (m < 90) return `${m} min ${String(s % 60).padStart(2, '0')} s`
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`
}

// Politique d'investissement : à chaque tick, dépenser l'or là où il rapporte le
// plus de dps par pièce — en RECRUTANT ou en AMÉLIORANT. C'est ce qui permet de
// vérifier que les deux leviers coexistent : si améliorer dominait toujours,
// recruter deviendrait décoratif (et inversement).
function dpsGainOfRecruit(state, eff, bio, id) {
  const t = TROOPS[id]
  const before = state.counts[id]
  const cost = unitCost(t.baseCost, before, eff.costMult * bio.troopCostMult * VOW_COST)
  if (cost > state.gold) return null
  const gain = t.dps * ((before + 1) * troopDmgMult(state.upgrades, id, before + 1)
                        - before * troopDmgMult(state.upgrades, id, before))
  return { kind: 'recruit', id, cost, ratio: gain / cost }
}

function dpsGainOfUpgrade(state, eff, bio, id, kind) {
  const level = levelOf(state.upgrades, id, kind.id)
  const price = upgradePrice(kind.id, level, TROOPS[id].baseCost)
  if (price === null || price > state.gold) return null
  const next = { ...state.upgrades, [id]: { ...(state.upgrades[id] ?? {}), [kind.id]: level + 1 } }
  const dpsNow = dpsOf(state, eff)
  const dpsNext = dpsOf({ ...state, upgrades: next }, eff)
  const gain = dpsNext - dpsNow
  if (gain <= 0) return null
  return { kind: 'upgrade', id, kindId: kind.id, cost: price, ratio: gain / price }
}

let BANNED = []
let VOW_COST = 1
function invest(state, eff, bio) {
  for (;;) {
    const options = []
    for (const id of TROOP_ORDER) {
      const t = TROOPS[id]
      if (state.zonesUnlocked < t.unlockZone) continue
      if (BANNED.includes(id)) continue
      if (t.requiresMeta && !eff.championUnlocked) continue
      const r = dpsGainOfRecruit(state, eff, bio, id)
      if (r) options.push(r)
      for (const kind of UPGRADE_KINDS) {
        const u = dpsGainOfUpgrade(state, eff, bio, id, kind)
        if (u) options.push(u)
      }
    }
    if (!options.length) return
    options.sort((a, b) => b.ratio - a.ratio)
    const best = options[0]
    if (best.kind === 'upgrade') {
      const res = buyTroopUpgrade(state.upgrades, best.id, best.kindId, state.gold, TROOPS[best.id].baseCost)
      state.gold = res.gold
      state.upgrades = res.troopUpgrades
      state.spentOnUpgrades = (state.spentOnUpgrades ?? 0) + best.cost
    } else {
      const t = TROOPS[best.id]
      const { count, cost } = maxAffordable(t.baseCost, state.counts[best.id], state.gold, eff.costMult * bio.troopCostMult * VOW_COST)
      if (count === 0) return
      state.gold -= cost
      state.counts[best.id] += count
    }
  }
}

// Dégâts moyens par tick, formule identique à celle du jeu : affinités par tier,
// armure de la cible, espérance de critique. `enemy` peut être absent (mesure de
// dps nominal hors combat).
// goldMult DOIT y figurer : sans lui, goldFx vaut undefined, l'or gagné devient
// NaN, et maxAffordable() boucle à l'infini puisque `next > NaN` est toujours faux.
const TELEGRAPH_IDS_SIM = Object.keys(TELEGRAPHS)
const NO_DEBUFF = { armorPts: 0, dmgTakenMult: 1, goldMult: 1, critMult: 1 }
const NO_BONUS = { relicDmg: 0, relicCrit: 0, critMultFactor: 1, act: { dmgMult: 1, goldMult: 1, critBonus: 0, ignoreArmor: false } }
function dpsOf(state, eff, enemy = null, bonus = NO_BONUS) {
  const troopDps = TROOP_ORDER.reduce((acc, id) => ({
    ...acc,
    [id]: state.counts[id] * TROOPS[id].dps * troopDmgMult(state.upgrades, id, state.counts[id]),
  }), {})
  // Les rôles de composition comptent : ils modifient chance et puissance des
  // critiques, la pénétration, et les dégâts d'armée.
  // Doctrine (or) amplifie les rôles ; l'Arbre (Gloire) pilote les critiques.
  const doctrine = ORDER.reduce((acc, id) => ({ ...acc, [id]: roleUpgradeMult(state.upgrades, id) }), {})
  const roles = roleEffects(state.counts, doctrine)
  return averageHit({
    heroDps: BASE_DPS,
    troopDps,
    enemyType: enemy?.type ?? null,
    armorPct: bonus.act.ignoreArmor ? 0 : (enemy?.armor ?? 0),
    critChancePct: BASE_CRIT_CHANCE + roles.critChance + (eff.critChanceBonus ?? 0)
                   + bonus.relicCrit + bonus.act.critBonus,
    critMult: BASE_CRIT_MULT + roles.critMultBonus + (eff.critMultBonus ?? 0),
    critMultFactor: bonus.critMultFactor ?? 1,
    armorPen: roles.armorPen,
    globalMult: eff.dmgMult * (1 + roles.armyDmgPct / 100)
                * (1 + bonus.relicDmg / 100) * bonus.act.dmgMult,
  })
}

// Joue un run jusqu'à avoir clear `targetZone`. Renvoie les ticks écoulés et
// le détail par zone. `buy` à false = mesure la boucle de combat seule (calibration).
// Échos courants du run simulé (le déversoir de fin de partie).
let ECHOES = {}
export function runUntilZoneCleared(treeNodes = [], targetZone = 5, buy = true, echoes = {}, biomeId = 'croisade', opts = {}) {
  const { relics = true, actives = true, seed = 1, pantheon = {}, maxTicks = MAX_TICKS } = opts
  // La Légende multiplie PAR-DESSUS l'Arbre : c'est une couche au-dessus,
  // pas une branche de plus.
  const pan = pantheonEffects(pantheon)
  const vow = voeuEffects(opts.voeu ?? null)
  // Les succès majorent les mêmes quatre stats. `achievements: 'all'` mesure le
  // pire cas d'empilement — catalogue complet — pour vérifier que « léger » le reste.
  const ach = opts.achievements === 'all'
    ? achievementEffects(ACHIEVEMENTS.map(a => a.id))
    : achievementEffects(opts.achievements ?? [])
  const leg = {
    dmgMult: pan.dmgMult * ach.dmgMult,
    goldMult: pan.goldMult * ach.goldMult * vow.goldMult,
    relicMult: pan.relicMult * ach.relicMult * vow.relicMult,
    gloireMult: pan.gloireMult * ach.gloireMult * vow.gloireMult,
  }
  // Le Vœu de Silence coupe les actifs et, en échange, en rend une fraction
  // permanente. Le Vœu du Nombre interdit des tiers.
  const muet = vow.mute
  const passif = vow.passiveActivePct / 100
  const rng = mulberry32(seed)
  // Vœu d'Errance : le biome est tiré au sort. Le modéliser est indispensable —
  // sans ça on mesurerait son bonus de Gloire SANS son coût, et il paraîtrait
  // gratuit. Un tirage peut tomber sur le Néant, qui supprime le butin.
  if (vow.randomBiome) {
    const choix = unlockedBiomes(PRESTIGE_MIN_ZONES * 3)
    biomeId = choix[Math.floor(rng() * choix.length)]?.id ?? biomeId
  }

  PATINE_FORCEE = opts.patine ?? null
  ECHOES = echoes
  const bio = biomeEffects(biomeId)
  // La Route (US 41) : une voie tenue sur tout le run. Ce n'est pas ce que fait
  // le jeu (un carrefour par zone), mais c'est la mesure qui nous intéresse —
  // l'effet PUR d'une voie, sans qu'un tirage la dilue.
  const route = voieEffects(opts.voie ?? 'directe')
  // Fraction de télégraphes contrés. Le jeu punit un contre raté ; ne pas le
  // modéliser rendait le simulateur optimiste sur les boss.
  const contre = opts.contre ?? 1
  const eff = treeEffects(treeNodes, ECHOES)
  const timingOpts = {
    cooldownMult: eff.cooldownMult ?? 1,
    warCryDurationMult: eff.warCryDurationMult ?? 1,
    biomeWarCryDurMult: bio.warCryDurMult ?? 1,
    biomeWarCryCdMult: bio.warCryCdMult ?? 1,
  }
  // Miroir de doPrestige() : l'Arbre paie le démarrage du run.
  BANNED = vow.bannedTiers
  VOW_COST = vow.costMult
  LIMITED_SLOTS = vow.relicSlots ? RELIQUE_SLOTS.slice(0, vow.relicSlots) : null
  const state = {
    gold: eff.startGold,
    counts: TROOP_ORDER.reduce((acc, id) => ({ ...acc, [id]: id === 'paysan' ? eff.startTroops : 0 }), {}),
    zonesUnlocked: 1,
    zonesCleared: 0,
    wavesCleared: 0,
    goldEarned: 0,
    upgrades: {},
    // Les reliques sont conservées à la Croisade : le cycle suivant les reçoit
    // via opts.carry, sinon on repart nu.
    inventory: [],
    equipped: opts.carry?.equipped ?? RELIQUE_SLOTS.reduce((a, s) => ({ ...a, [s]: null }), {}),
    nextUid: opts.carry?.nextUid ?? 1,
  }
  const act = freshActives()
  let relicFx = relicTotals(state.equipped, eff, leg.relicMult, 0)
  const perZone = []
  let ticks = 0
  let zoneStartTick = 0

  for (let zone = 1; zone <= targetZone; zone++) {
    const z = zoneAt(zone, biomeId, bio.waveMult * route.waveMult)
    for (let wave = 1; wave <= z.waves; wave++) {
      const isBoss = wave === z.waves
      const enemy = isBoss ? z.boss : z.mobs[(wave - 1) % z.mobs.length]
      let hp = Math.round(enemy.hpMax * bio.hpMult * route.hpMult)
      // Trois seuils de télégraphe par boss (boss.js). Chacun raté applique son
      // malus jusqu'à la fin du combat.
      // Ne tirer QUE si des contres peuvent échouer : sinon on consommerait le
      // générateur pour rien et deux runs de même graine cesseraient d'être
      // comparables.
      const rates = isBoss && contre < 1
        ? bossDebuffs(TELEGRAPH_IDS_SIM.filter(() => rng() >= contre))
        : NO_DEBUFF
      // Même plafond que le jeu (App.svelte) : sans lui la sonde punirait
      // plus fort que la réalité.
      const armure = Math.min(95, (enemy.armor ?? 0) + rates.armorPts + (isBoss ? route.bossArmorPts : 0))
      let goldFx = 1
      while (hp > 0) {
        if (buy) invest(state, eff, bio)
        if (actives && !muet) tickActives(act, state.zonesUnlocked, timingOpts)
        let a = actives && !muet ? currentActiveEffects(act) : NO_BONUS.act
        if (muet) {
          // Effets permanents, à `passif` de leur intensité.
          a = { dmgMult: 1 + (2 - 1) * passif, goldMult: 1 + (3 - 1) * passif,
                critBonus: 40 * passif, ignoreArmor: false }
        }
        goldFx = a.goldMult
        const bonus = { relicDmg: relicFx.dmg, relicCrit: relicFx.crit, critMultFactor: rates.critMult,
                        act: { ...a, dmgMult: a.dmgMult * leg.dmgMult } }
        const dmg = Math.round(dpsOf(state, eff, { ...enemy, armor: armure }, bonus) * rates.dmgTakenMult)
        hp -= dmg
        ticks += 1
        if (ticks > maxTicks) throw new Error(`hors budget : zone ${zone} vague ${wave}`)
      }
      // L'or de la cible est encaissé au tick où elle meurt : la Ferveur ne
      // compte que si elle est active À CE MOMENT, pas en moyenne sur la vague.
      const earned = Math.floor(enemy.gold * eff.goldMult * bio.rewardMult * bio.goldMult
                                * (1 + relicFx.gold / 100) * goldFx * leg.goldMult
                                * route.goldMult * rates.goldMult * (opts.orMult ?? 1))
      state.gold += earned
      state.goldEarned += earned
      state.wavesCleared += 1
      if (isBoss) {
        state.zonesCleared = Math.max(state.zonesCleared, zone)
        state.zonesUnlocked = Math.max(state.zonesUnlocked, zone + 1)
        if (relics) {
          // Même règle que le jeu : le biome fixe le nombre de drops, l'Arbre
          // en ajoute, et un biome à zéro drop le reste.
          const n = bio.relicDrops > 0 ? bio.relicDrops + (eff.relicDrops ?? 0) + vow.relicDrops + route.relicDrops : 0
          const weights = rarityWeights((eff.qualityLevel ?? 0) + (bio.qualityBonus ?? 0) + vow.qualityLevel)
          for (let d = 0; d < n; d++) maybeEquip(state, rollRelique(rng, weights), ticks)
          relicFx = relicTotals(state.equipped, eff, leg.relicMult, ticks)
        }
      }
    }
    perZone.push({ zone, name: z.name, ticks: ticks - zoneStartTick, cumulative: ticks })
    zoneStartTick = ticks
  }
  const gloire = Math.floor(gloireGain(state.wavesCleared, state.zonesCleared) * eff.gloireMult * leg.gloireMult * bio.rewardMult * bio.goldMult)
  return { ticks, perZone, state, gloire }
}

// Boucle de prestige paramétrable, pour comparer des variantes d'équilibrage.
// gloireOf(state) : la formule de gain à tester (défaut = celle du jeu).
// TARGET_ZONE : jusqu'où le joueur pousse avant de partir en Croisade. Avec les
// zones sans fin, ce n'est plus « la dernière » mais un choix de stratégie.
let TARGET_ZONE = 5
export function simulateCycles({ cycles = 4, target = 5, relics = true, actives = true, seed = 1 } = {}) {
  TARGET_ZONE = target
  let nodes = []
  let ech = {}
  let purse = 0
  // Les reliques équipées survivent à la Croisade (cf. SPEC § Prestige) : c'est
  // le seul état de run qui se transmet, et il change la courbe.
  let carry = null
  const out = []
  for (let cycle = 1; cycle <= cycles; cycle++) {
    const run = runUntilZoneCleared(nodes, TARGET_ZONE, true, ech, 'croisade',
      { relics, actives, seed: seed + cycle, carry })
    carry = { equipped: run.state.equipped, nextUid: run.state.nextUid }
    out.push({
      cycle,
      ticks: run.ticks,
      gained: run.gloire,
      nodes: [...nodes],
      echoes: { ...ech },
      ratio: out.length ? run.ticks / out[out.length - 1].ticks : null,
    })
    const spend = spendGloire(nodes, purse + run.gloire, ech)
    nodes = spend.owned
    ech = spend.echoes
    purse = spend.remaining
  }
  return out
}

// Dépense la Gloire dans l'Arbre. Politique : le nœud ouvert le moins cher
// d'abord, en privilégiant les branches qui accélèrent le cycle suivant
// (Croisade puis Guerre puis Fortune) à coût égal. C'est l'approximation d'un
// joueur qui optimise sa progression, pas d'un joueur qui thématise.
const BRANCH_PRIORITY = ['croisade', 'guerre', 'fortune', 'reliques']

export function spendGloire(owned, gloire, echoes = {}) {
  let purse = gloire
  let nodes = [...owned]
  let ech = { ...echoes }
  for (;;) {
    // TREE et pas BRANCHES.flatMap(branchNodes) : la racine et la couronne
    // n'appartiennent à aucune branche, et sans la racine rien ne se débloque.
    const candidates = TREE
      .filter(n => isUnlockable(n.id, nodes) && n.cost <= purse)
      .sort((a, b) =>
        a.cost - b.cost ||
        BRANCH_PRIORITY.indexOf(a.branch) - BRANCH_PRIORITY.indexOf(b.branch))
    if (candidates.length) {
      const res = buyNode(candidates[0].id, nodes, purse)
      purse = res.gloire
      nodes = res.owned
      continue
    }
    // Plus rien à débloquer : on verse dans les Échos des branches complètes,
    // en commençant par la moins chère (donc la moins avancée).
    const echoable = BRANCH_PRIORITY
      .filter(id => isBranchComplete(id, nodes) && echoCost(ech[id] ?? 0) <= purse)
      .sort((a, b) => echoCost(ech[a] ?? 0) - echoCost(ech[b] ?? 0))
    if (!echoable.length) return { owned: nodes, remaining: purse, echoes: ech }
    const res = buyEcho(echoable[0], nodes, ech, purse)
    purse = res.gloire
    ech = res.echoes
  }
}

// Dépense bornée à UNE branche (plus la racine, sans laquelle rien n'ouvre).
// Sert à comparer ce que vaut chaque branche, ce que la politique globale
// de spendGloire() ne peut pas montrer puisqu'elle panache.
export function spendInBranch(owned, gloire, branchId) {
  let purse = gloire
  let nodes = [...owned]
  for (;;) {
    const c = TREE
      .filter(n => isUnlockable(n.id, nodes) && n.cost <= purse && (n.branch === branchId || n.branch === null))
      .sort((a, b) => a.cost - b.cost)
    if (!c.length) return { owned: nodes, remaining: purse }
    const r = buyNode(c[0].id, nodes, purse)
    purse = r.gloire
    nodes = r.owned
  }
}

// Compare les 4 branches à budget de Gloire égal, moyenné sur N graines.
function compareBranches(gloire, seeds, target, opts) {
  const avg = nodes => {
    const ts = Array.from({ length: seeds }, (_, i) =>
      runUntilZoneCleared(nodes, target, true, {}, 'croisade', { ...opts, seed: 1 + i * 977 }))
    return {
      ticks: Math.round(ts.reduce((s, r) => s + r.ticks, 0) / seeds),
      gloire: Math.round(ts.reduce((s, r) => s + r.gloire, 0) / seeds),
    }
  }
  const base = avg([])
  console.log(`\n=== Valeur comparée des branches — ${gloire} Gloire, ${seeds} graines, sortie zone ${target} ===`)
  console.log('| Branche | Nœuds | Cycle suivant | vs baseline | Gloire rendue |')
  console.log('|---|---|---|---|---|')
  console.log(`| _aucune_ | 0 | ${fmtDuration(base.ticks)} | ×1.00 | +${base.gloire} |`)
  const rows = []
  for (const b of BRANCHES) {
    const spend = spendInBranch([], gloire, b.id)
    const r = avg(spend.owned)
    rows.push({ b, r, n: spend.owned.length, left: spend.remaining })
    console.log(`| ${b.sprite} ${b.name} | ${spend.owned.length} | ${fmtDuration(r.ticks)} | ×${(r.ticks / base.ticks).toFixed(2)} | +${r.gloire} |`)
  }
  // Une branche vaut par ce qu'elle fait gagner de temps ET de Gloire : juger
  // la branche Croisade au seul chronomètre du run passerait à côté de son objet.
  console.log('\nRendement combiné (Gloire par minute de cycle, base 100) :')
  const eff0 = base.gloire / base.ticks
  for (const { b, r } of rows) {
    const e = (r.gloire / r.ticks) / eff0 * 100
    console.log(`  ${b.sprite} ${b.name.padEnd(10)} ${e.toFixed(0).padStart(4)}`)
  }
}

// Même exercice sur PLUSIEURS cycles, la Gloire restant enfermée dans la branche.
// Une branche dont le bénéfice arrive tard est structurellement sous-notée par une
// mesure à un cycle : c'est exactement l'hypothèse à tester, pas à supposer.
function branchCurve(branchId, cycles, seeds, target, opts) {
  const perCycle = Array.from({ length: cycles }, () => [])
  for (let s = 0; s < seeds; s++) {
    let nodes = []
    let purse = 0
    let carry = null
    for (let c = 0; c < cycles; c++) {
      const run = runUntilZoneCleared(nodes, target, true, {}, 'croisade',
        { ...opts, seed: 1 + s * 977 + c, carry })
      carry = { equipped: run.state.equipped, nextUid: run.state.nextUid }
      perCycle[c].push(run.ticks)
      purse += run.gloire
      if (branchId) {
        const sp = spendInBranch(nodes, purse, branchId)
        nodes = sp.owned
        purse = sp.remaining
      }
    }
  }
  return perCycle.map(xs => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length))
}

function compareBranchCurves(cycles, seeds, target, opts) {
  console.log(`\n=== Courbe sur ${cycles} cycles, Gloire enfermée dans une seule branche (${seeds} graines) ===`)
  const base = branchCurve(null, cycles, seeds, target, opts)
  const head = Array.from({ length: cycles }, (_, i) => `C${i + 1}`).join(' | ')
  console.log(`| Branche | ${head} | cumul |`)
  console.log(`|---${'|---'.repeat(cycles)}|---|`)
  const row = (label, xs) => {
    const tot = xs.reduce((a, b) => a + b, 0)
    console.log(`| ${label} | ${xs.map(fmtDuration).join(' | ')} | ${fmtDuration(tot)} |`)
    return tot
  }
  const baseTot = row('_aucune_', base)
  for (const b of BRANCHES) {
    const xs = branchCurve(b.id, cycles, seeds, target, opts)
    const tot = row(`${b.sprite} ${b.name}`, xs)
    console.log(`|   ↳ vs baseline |${xs.map((x, i) => ` ×${(x / base[i]).toFixed(2)} |`).join('')} **×${(tot / baseTot).toFixed(2)}** |`)
  }
}

// Calibrage de la Légende : est-ce que la progression CONTINUE d'un cycle de
// Légende au suivant, ou est-ce qu'on rebute simplement plus loin ?
function maxDepthWithin(minutes, pantheon, nodes, echoes, seed) {
  const budget = Math.floor(minutes * 60 * 1000 / TICK_MS)
  let best = 0
  for (let z = LEGENDE_MIN_ZONE - 5; z <= 60; z++) {
    try {
      const r = runUntilZoneCleared(nodes, z, true, echoes, 'croisade', { seed, pantheon, maxTicks: budget })
      if (r.ticks > budget) break
      best = z
    } catch (_) { break }
  }
  return best
}

function calibrateLegende(cycles, seeds, opts) {
  const BUDGET_MIN = 30           // ce qu'un joueur accepte de passer sur un run
  const all = TREE.map(n => n.id)
  const ech = { guerre: 8, fortune: 8, reliques: 8, croisade: 8 }
  console.log(`\n=== Cycles de Légende — arbre complet, budget ${BUDGET_MIN} min par run ===`)
  console.log('| Cycle | points cumulés | ×dégâts | profondeur atteinte | gagné |')
  console.log('|---|---|---|---|---|')
  let pts = 0
  let levels = {}
  let prev = 0
  for (let c = 1; c <= cycles; c++) {
    const depths = Array.from({ length: seeds }, (_, i) => maxDepthWithin(BUDGET_MIN, levels, all, ech, 1 + i * 977))
    const depth = Math.round(depths.reduce((a, b) => a + b, 0) / seeds)
    const gained = legendeGain(depth)
    const fx = pantheonEffects(levels)
    console.log(`| ${c} | ${pts} | ×${fx.dmgMult.toExponential(1)} | **zone ${depth}** | +${gained} |`)
    if (depth <= prev && c > 1) {
      console.log(`\n  ⚠️  la progression s'arrête : zone ${depth} au cycle ${c} contre ${prev} au précédent`)
      break
    }
    prev = depth
    pts += gained
    // Spécialisation : tout sur une voie, ce que le système demande.
    levels = { ...levels, fureur: (levels.fureur ?? 0) + gained }
  }
}

// L'or est-il encore le goulot ? La question ne se répond pas en lisant une
// formule : elle se répond en ajoutant de l'or et en regardant si ça accélère.
// Si doubler l'or ne fait rien gagner, c'est que le mur est ailleurs.
function goldPressure(seeds, target, opts) {
  console.log(`\n=== Pression de l'or — sortie zone ${target} ===`)
  console.log("Si multiplier l'or n'accélère plus, c'est qu'il a cessé d'être le goulot.")
  console.log('\n| ×or | durée | gain vs ×1 | élasticité |')
  console.log('|---|---|---|---|')
  let base = null
  for (const m of [1, 1.8, 4, 8, 32]) {
    const t = Array.from({ length: seeds }, (_, i) =>
      runUntilZoneCleared([], target, true, {}, 'croisade', { ...opts, orMult: m, seed: 1 + i * 977 }).ticks)
    const ticks = t.reduce((a, b) => a + b, 0) / t.length
    base ??= ticks
    // Élasticité : combien de % de temps gagné pour 1% d'or en plus. Proche de
    // 0 = l'or ne fait plus rien.
    const elast = m === 1 ? '—' : ((1 - ticks / base) / (m - 1)).toFixed(3)
    console.log(`| ×${m} | ${fmtDuration(ticks)} | ${m === 1 ? '—' : ((1 - ticks / base) * 100).toFixed(1) + '%'} | ${elast} |`)
  }
}

// Chaque voie tenue sur tout le run : l'effet PUR, sans qu'un tirage le dilue.
function compareVoies(seeds, target, opts) {
  console.log(`\n=== Les voies de la Route, mesurées — sortie zone ${target} ===`)
  console.log('| Voie | durée | vs directe | or gagné | vs directe |')
  console.log('|---|---|---|---|---|')
  let ref = null, refOr = null
  for (const id of Object.keys(VOIES)) {
    const runs = Array.from({ length: seeds }, (_, i) =>
      runUntilZoneCleared([], target, true, {}, 'croisade', { ...opts, voie: id, seed: 1 + i * 977 }))
    const ticks = runs.reduce((a, r) => a + r.ticks, 0) / runs.length
    const or = runs.reduce((a, r) => a + r.state.goldEarned, 0) / runs.length
    ref ??= ticks; refOr ??= or
    const dt = id === 'directe' ? '—' : `${ticks < ref ? '' : '+'}${((ticks / ref - 1) * 100).toFixed(0)}%`
    const dor = id === 'directe' ? '—' : `${or > refOr ? '+' : ''}${((or / refOr - 1) * 100).toFixed(0)}%`
    console.log(`| ${VOIES[id].nom} | ${fmtDuration(ticks)} | ${dt} | ${Math.round(or)} | ${dor} |`)
  }
}

// Contrer coûte de l'attention. Combien ça vaut, mesuré ?
function compareContres(seeds, target, opts) {
  console.log(`\n=== Ce que coûte un télégraphe raté — sortie zone ${target} ===`)
  console.log('| contres réussis | durée | vs parfait | or gagné |')
  console.log('|---|---|---|---|')
  let ref = null
  for (const c of [1, 0.75, 0.5, 0]) {
    const runs = Array.from({ length: seeds }, (_, i) =>
      runUntilZoneCleared([], target, true, {}, 'croisade', { ...opts, contre: c, seed: 1 + i * 977 }))
    const ticks = runs.reduce((a, r) => a + r.ticks, 0) / runs.length
    const or = runs.reduce((a, r) => a + r.state.goldEarned, 0) / runs.length
    ref ??= ticks
    console.log(`| ${(c * 100).toFixed(0)}% | ${fmtDuration(ticks)} | ${c === 1 ? '—' : '+' + ((ticks / ref - 1) * 100).toFixed(0) + '%'} | ${Math.round(or)} |`)
  }
}

// --- Banc des invariants analytiques --------------------------------------
//
// Le projet a pris l'habitude de borner par le raisonnement puis de figer la
// borne dans un test unitaire. Trois fois de suite (MIN_VISIBLE_GAIN, la
// non-dominance des voies, le plancher de boss), la mesure de run a démoli ce
// que l'analyse validait. Ce banc existe pour que les bornes qui comptent
// soient des DURÉES DE RUN, pas des pourcentages par slot dont personne ne
// peut rien déduire.

// Le meilleur porteur de chaque slot, pour une nature d'effet donnée.
export function meilleurStuff(nature = 'tout', rarity = 'legendaire', level = 5) {
  const eq = RELIQUE_SLOTS.reduce((a, s) => ({ ...a, [s]: null }), {})
  const base = {}
  for (const [id, d] of Object.entries(RELIQUES)) {
    if (nature !== 'tout' && d.effect.type !== nature) continue
    if (d.effect.base > (base[d.slot] ?? 0)) {
      base[d.slot] = d.effect.base
      eq[d.slot] = { uid: 1, defId: id, rarity, level }
    }
  }
  return eq
}

// Vitesse de run relative à un joueur nu. C'est LA quantité qui compte : un
// pourcentage par slot ne dit rien, un ×5 sur la durée dit tout.
export function vitesseRelative({ equipped = null, patine = null, achievements = null,
                                  target = 5, seeds = 4 } = {}) {
  const graines = Array.from({ length: seeds }, (_, i) => 1 + i * 977)
  const jouer = (o) => graines
    .map(seed => runUntilZoneCleared([], target, true, {}, 'croisade', { seed, relics: false, ...o }).ticks)
    .reduce((a, b) => a + b, 0) / seeds
  const nu = jouer({})
  const stuffe = jouer({
    patine,
    achievements: achievements ?? undefined,
    carry: equipped ? { equipped, nextUid: 9 } : undefined,
  })
  return nu / stuffe
}

function banc(target, seeds) {
  console.log(`\n=== Banc des invariants — sortie zone ${target}, ${seeds} graines ===`)
  console.log('Ce que les bornes analytiques valent en DURÉE DE RUN.\n')
  console.log('| ce qu on mesure | ×vitesse |')
  console.log('|---|---|')
  const l = (nom, o) => console.log(`| ${nom} | **×${vitesseRelative({ ...o, target, seeds }).toFixed(2)}** |`)
  l('reliques communes niv.0, dégâts', { equipped: meilleurStuff('dmg', 'commun', 0) })
  l('reliques légendaires niv.5, dégâts', { equipped: meilleurStuff('dmg') })
  l('… avec la Patine au plafond', { equipped: meilleurStuff('dmg'), patine: 1.5 })
  l('le meilleur de chaque slot', { equipped: meilleurStuff('tout') })
  l('le meilleur + Patine au plafond', { equipped: meilleurStuff('tout'), patine: 1.5 })
  l(`catalogue de succès complet (${ACHIEVEMENTS.length})`, { achievements: 'all' })
  console.log('\n⚠ La Patine ne se mesure PAS dans un run : +1,25 %/heure contre des runs de')
  console.log('  quelques minutes. Elle n existe qu entre les sessions — d où le forçage.')
}

function main() {
  const args = process.argv.slice(2)
  const flags = new Set(args.filter(a => a.startsWith('--')))
  const pos = args.filter(a => !a.startsWith('--'))
  const cycles = Number(pos[0] ?? 4)
  const target = Number(pos[1] ?? 5)
  const relics = !flags.has('--no-relics')
  const actives = !flags.has('--no-actives')
  const seeds = Number((args.find(a => a.startsWith('--seeds=')) ?? '--seeds=1').split('=')[1])
  const opts = { relics, actives }

  console.log(`Modélisation : reliques ${relics ? 'OUI' : 'non'} · actifs ${actives ? 'OUI' : 'non'} · ${seeds} graine(s)`)
  if (flags.has('--banc')) { banc(target, seeds); return }
  if (flags.has('--or')) { goldPressure(seeds, target, opts); return }
  if (flags.has('--voies')) { compareVoies(seeds, target, opts); return }
  if (flags.has('--contres')) { compareContres(seeds, target, opts); return }
  if (flags.has('--legende')) {
    calibrateLegende(cycles, seeds, opts)
    return
  }
  if (flags.has('--curves')) {
    compareBranchCurves(cycles, seeds, target, opts)
    return
  }
  if (flags.has('--branches')) {
    const purse = Number((args.find(a => a.startsWith('--gloire=')) ?? '--gloire=83').split('=')[1])
    compareBranches(purse, seeds, target, opts)
    return
  }
  console.log('=== Détail du premier run (aucune Gloire) ===')
  const first = runUntilZoneCleared([], target, true, {}, 'croisade', { ...opts, seed: 1 })
  for (const z of first.perZone) {
    console.log(`  zone ${z.zone} ${z.name.padEnd(20)} ${String(z.ticks).padStart(7)} ticks  ${fmtDuration(z.ticks).padStart(12)}  (cumul ${fmtDuration(z.cumulative)})`)
  }
  console.log(`  troupes finales : ${TROOP_ORDER.map(id => `${id} ${first.state.counts[id]}`).join(', ')}`)

  console.log(`\n=== Cycles de prestige (Arbre de Gloire, sortie zone ${target}) ===`)
  // Avec les reliques, un run n'est plus une valeur mais une distribution : on
  // moyenne sur `seeds` graines plutôt que de conclure sur un coup de chance.
  const runs = Array.from({ length: seeds }, (_, i) => simulateCycles({ cycles, target, ...opts, seed: 1 + i * 1000 }))
  const cy = runs[0].map((_, idx) => {
    const ticks = Math.round(runs.reduce((s, r) => s + r[idx].ticks, 0) / seeds)
    const gained = Math.round(runs.reduce((s, r) => s + r[idx].gained, 0) / seeds)
    const spread = seeds > 1
      ? Math.max(...runs.map(r => r[idx].ticks)) / Math.min(...runs.map(r => r[idx].ticks))
      : null
    return { ...runs[0][idx], ticks, gained, spread }
  })
  cy.forEach((c, i) => { c.ratio = i ? c.ticks / cy[i - 1].ticks : null })
  for (const c of cy) {
    const depth = BRANCHES.map(b => {
      const d = c.nodes.filter(id => id.startsWith(b.id + '-')).length
      const e = c.echoes?.[b.id] ?? 0
      return `${b.sprite}${d}${e ? `+${e}` : ''}`
    }).join(' ')
    console.log(
      `  Croisade #${String(c.cycle).padStart(2)} : ${fmtDuration(c.ticks).padStart(12)}` +
      (c.ratio ? `  (×${c.ratio.toFixed(2)})` : '        ') +
      `  → +${String(c.gained).padStart(5)} Gloire   arbre ${depth}` +
      (c.spread ? `   écart graines ×${c.spread.toFixed(2)}` : ''),
    )
  }
  console.log('\n  Référence mesurée au navigateur (US 27) : 1er cycle 10 min 11.')
}

// Exécuté directement (et non importé par un test) → on lance la mesure.
if (process.argv[1] && process.argv[1].endsWith('simulate.mjs')) main()
