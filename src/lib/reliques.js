// Catalogue de reliques + tirage pondéré. Logique pure (rng injectable) pour
// rester testable. Une relique en jeu est une instance { uid, defId, rarity } ;
// sa magnitude d'effet est dérivée du catalogue au runtime (pas snapshotée),
// ce qui garde la save mince et migrable.

// Raretés : poids de tirage, couleur d'affichage, multiplicateur d'effet.
export const RARITIES = {
  commun:     { label: 'Commun',     weight: 70, color: '#9aa0a6', mult: 1 },
  rare:       { label: 'Rare',       weight: 25, color: '#4ea1ff', mult: 2.5 },
  legendaire: { label: 'Légendaire', weight: 5,  color: '#d4af37', mult: 6 },
}

// Définitions. effect.type ∈ { 'dmg', 'gold', 'crit' }.
// 'crit' ajoute des POINTS de chance de critique (pas un pourcentage relatif) :
// +6 sur une base de 8 fait passer à 14% de chance, ce qui est lisible.
// base = effet en % à la rareté commune ; magnitude = base * RARITIES[rarity].mult.
export const RELIQUES = {
  lame_rouillee:  { name: 'Lame Rouillée',     slot: 'arme',     sprite: '🗡️', effect: { type: 'dmg',  base: 5 } },
  hache_brisee:   { name: 'Hache Brisée',      slot: 'arme',     sprite: '🪓', effect: { type: 'dmg',  base: 6 } },
  cotte_maille:   { name: 'Cotte de Mailles',  slot: 'armure',   sprite: '🛡️', effect: { type: 'dmg',  base: 4 } },
  heaume_terni:   { name: 'Heaume Terni',      slot: 'armure',   sprite: '⛑️', effect: { type: 'dmg',  base: 4 } },
  banniere_loup:  { name: 'Bannière du Loup',  slot: 'banniere', sprite: '🚩', effect: { type: 'gold', base: 8 } },
  oriflamme:      { name: 'Oriflamme',         slot: 'banniere', sprite: '🏴', effect: { type: 'gold', base: 10 } },
  amulette_os:    { name: "Amulette d'Os",     slot: 'amulette', sprite: '📿', effect: { type: 'gold', base: 7 } },
  anneau_corbeau: { name: 'Anneau du Corbeau', slot: 'amulette', sprite: '💍', effect: { type: 'gold', base: 9 } },
  dague_traitre:  { name: 'Dague du Traître',  slot: 'arme',     sprite: '🔪', effect: { type: 'crit', base: 3 } },
  oeil_faucon:    { name: 'Œil du Faucon',     slot: 'amulette', sprite: '🦅', effect: { type: 'crit', base: 2 } },
  gantelet_brise: { name: 'Gantelet Brisé',    slot: 'armure',   sprite: '🥊', effect: { type: 'crit', base: 2 } },
}

export const RELIQUE_SLOTS = ['arme', 'armure', 'banniere', 'amulette']
export const SLOT_LABELS = { arme: 'Arme', armure: 'Armure', banniere: 'Bannière', amulette: 'Amulette' }

const DEF_IDS = Object.keys(RELIQUES)

// Tirage pur. rng injecté pour testabilité. Renvoie { defId, rarity }.
// weights : override des poids de rareté (upgrade Fortune de la Forge) ; les
// poids par défaut du catalogue s'appliquent si absent. On itère sur les clés de
// RARITIES et non sur celles de `weights` pour que l'ordre commun → rare →
// légendaire reste garanti quelle que soit la forme de l'override.
export function rollRelique(rng = Math.random, weights = null) {
  const defId = DEF_IDS[Math.floor(rng() * DEF_IDS.length)]
  const keys = Object.keys(RARITIES)
  const weightOf = (key) => weights ? (weights[key] ?? 0) : RARITIES[key].weight
  const total = keys.reduce((s, key) => s + weightOf(key), 0)
  let roll = rng() * total
  let rarity = 'commun'
  for (const key of keys) {
    roll -= weightOf(key)
    if (roll < 0) { rarity = key; break }
  }
  return { defId, rarity }
}

// ---------- AMÉLIORATION DES RELIQUES (US 26) ----------
//
// Deux voies, volontairement différentes :
//   • FORGER — payer de l'or pour ajouter des niveaux (+15% de l'effet chacun).
//     Progression continue, disponible tout de suite.
//   • FUSIONNER — sacrifier trois exemplaires identiques pour monter d'une
//     rareté. Progression par palier, et surtout : ça donne enfin un usage aux
//     doublons, qui n'étaient jusqu'ici que fondus en or.
//
// Borne d'équilibre : une légendaire niveau 5 vaut base × 6 (rareté) × 1,75
// (niveaux) = base × 10,5. Sur quatre slots, amplifié par l'Arbre (×5 max), cela
// reste dans les ordres de grandeur d'avant US 26 majorés de 75% — pas d'un
// facteur qui exigerait de réétalonner la courbe. Un test borne ce total.
export const RELIC_MAX_LEVEL = 5
export const RELIC_LEVEL_PCT = 15

// Multiplicateur d'effet dû aux niveaux forgés.
export function levelMult(level = 0) {
  const lvl = Math.min(Math.max(Math.floor(level ?? 0), 0), RELIC_MAX_LEVEL)
  return 1 + lvl * RELIC_LEVEL_PCT / 100
}

// Prix du prochain niveau. null = déjà au maximum. Le coût suit la rareté : une
// légendaire est plus chère à forger, ce qui évite de tout investir sur un commun.
const FORGE_BASE_COST = { commun: 2000, rare: 12000, legendaire: 80000 }

export function forgeCost(rarity, level = 0) {
  if (level >= RELIC_MAX_LEVEL) return null
  const base = FORGE_BASE_COST[rarity]
  if (!base) return null
  return Math.floor(base * Math.pow(3, level))
}

// Forge pure : renvoie { gold, relic } ou null si impossible.
export function forgeRelique(relic, gold) {
  if (!relic || !RELIQUES[relic.defId]) return null
  const level = relic.level ?? 0
  const cost = forgeCost(relic.rarity, level)
  if (cost === null || gold < cost) return null
  return { gold: gold - cost, relic: { ...relic, level: level + 1 } }
}

// Fusion : trois exemplaires de MÊME définition et MÊME rareté donnent une
// rareté supérieure. Deux garde-fous pour ne jamais punir l'investissement :
// on consomme d'abord les MOINS forgés, et le résultat hérite du meilleur niveau
// parmi ceux qui ont été consommés.
export const FUSE_COUNT = 3
const RARITY_LADDER = ['commun', 'rare', 'legendaire']

export function nextRarity(rarity) {
  const i = RARITY_LADDER.indexOf(rarity)
  return i >= 0 && i < RARITY_LADDER.length - 1 ? RARITY_LADDER[i + 1] : null
}

// Les instances fusionnables présentes dans un inventaire, groupées.
export function fusableGroups(inventory = []) {
  const groups = new Map()
  for (const r of inventory) {
    if (!RELIQUES[r.defId] || !nextRarity(r.rarity)) continue
    const key = `${r.defId}:${r.rarity}`
    groups.set(key, [...(groups.get(key) ?? []), r])
  }
  return [...groups.entries()]
    .filter(([, list]) => list.length >= FUSE_COUNT)
    .map(([key, list]) => {
      const [defId, rarity] = key.split(':')
      return { defId, rarity, count: list.length, into: nextRarity(rarity) }
    })
}

// Fusion pure : renvoie { inventory, relic } ou null si impossible.
export function fuseRelique(inventory, defId, rarity, nextUid) {
  const target = nextRarity(rarity)
  if (!target || !RELIQUES[defId]) return null
  const matching = inventory.filter(r => r.defId === defId && r.rarity === rarity)
  if (matching.length < FUSE_COUNT) return null
  // On consomme les MOINS forgés et on garde le meilleur niveau : investir dans
  // une relique ne doit jamais se retourner contre le joueur.
  const sorted = [...matching].sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
  const consumed = sorted.slice(0, FUSE_COUNT)
  const keptLevel = Math.max(...consumed.map(r => r.level ?? 0))
  const consumedUids = new Set(consumed.map(r => r.uid))
  return {
    inventory: inventory.filter(r => !consumedUids.has(r.uid)),
    relic: { uid: nextUid, defId, rarity: target, level: keptLevel },
  }
}

// Effet (%) d'une instance, dérivé du catalogue et de ses niveaux forgés. null si
// defId inconnu (relique fantôme d'une save plus ancienne) — l'appelant filtre.
export function reliqueEffect(defId, rarity, level = 0) {
  const def = RELIQUES[defId]
  if (!def) return null
  const pct = def.effect.base * (RARITIES[rarity]?.mult ?? 1) * levelMult(level)
  // Arrondi à une décimale : 6 × 2,5 × 1,45 donnerait 21,749999999999996.
  return { type: def.effect.type, pct: Math.round(pct * 10) / 10 }
}

// Or rendu par la fonte (auto-recyclage) d'une relique, par rareté.
export const MELT_GOLD = { commun: 15, rare: 50, legendaire: 200 }

// Une relique forgée rend davantage : l'or investi n'est pas entièrement perdu
// si le cap d'inventaire la sacrifie.
export function meltValue(rarity, level = 0) {
  return Math.floor((MELT_GOLD[rarity] ?? 0) * levelMult(level))
}

// Magnitude d'effet d'une instance — sert à classer "la plus faible".
function magnitude(r) {
  const e = reliqueEffect(r.defId, r.rarity, r.level)
  return e ? e.pct : 0
}

// Ramène l'inventaire à `cap` en retirant les instances de plus faible effet.
// Renvoie { inventory: gardées, melted: [retirées] }. Pur, immutable.
export function capInventory(inventory, cap) {
  if (inventory.length <= cap) return { inventory, melted: [] }
  const sorted = [...inventory].sort((a, b) => magnitude(b) - magnitude(a)) // fort → faible
  return { inventory: sorted.slice(0, cap), melted: sorted.slice(cap) }
}

// Équipe une relique (pur, immutable). La retire de l'inventaire, l'installe
// dans son slot ; l'ancienne relique du slot retourne en inventaire.
// Invariant : une instance est soit en inventaire, soit équipée — jamais les deux.
export function equipRelique(inventory, equipped, relic) {
  const slot = RELIQUES[relic.defId].slot
  const current = equipped[slot]
  let nextInventory = inventory.filter(r => r.uid !== relic.uid)
  if (current) nextInventory = [...nextInventory, current]
  return { inventory: nextInventory, equipped: { ...equipped, [slot]: relic } }
}
