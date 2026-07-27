// Amélioration des troupes : deux leviers qui se cumulent, payés en OR (l'Arbre
// de Gloire, lui, se paie en Gloire et survit au prestige — ici tout est remis à
// zéro par la Croisade, comme les troupes elles-mêmes).
//
//   1. PALIERS AUTOMATIQUES — accumuler des unités d'un tier double son dps à
//      chaque seuil franchi. Gratuit, automatique, et c'est ce qui donne du sens
//      au recrutement en MAX : le 10e paysan vaut bien plus que le 9e.
//   2. AMÉLIORATIONS ACHETABLES — quatre lignes par tier, aux effets volontairement
//      différents (dps du tier, dps global, or) pour que le choix ne soit pas
//      « laquelle est la meilleure » mais « de quoi ai-je besoin maintenant ».

// Seuils de paliers et multiplicateur appliqué à CHAQUE seuil franchi.
// Seuils espacés et multiplicateurs mesurés : voir docs/plans/2026-07-27-005-*.md
// § Calibrage. Des seuils rapprochés (10/25/50/100/200) divisaient la durée du
// premier run par deux — les améliorations écrasaient le reste du jeu.
export const MILESTONES = [25, 100, 400]
export const MILESTONE_MULT = 2

// Multiplicateur de dps d'un tier dû à ses seuls paliers automatiques.
export function milestoneMult(count) {
  const reached = MILESTONES.filter(m => count >= m).length
  return Math.pow(MILESTONE_MULT, reached)
}

// Prochain seuil à atteindre, ou null si tous franchis (pour l'affichage
// « encore 6 pour ×2 » : sans ça le palier est invisible tant qu'il n'est pas là).
export function nextMilestone(count) {
  return MILESTONES.find(m => count < m) ?? null
}

// Catalogue des améliorations. Le même pour les 4 tiers : le coût est
// proportionnel au `baseCost` du tier, donc améliorer un Champion coûte
// naturellement mille fois plus qu'améliorer un Paysan.
//
//   effect 'tierDmg'   → multiplie le dps de CE tier (mult par niveau)
//   effect 'globalDmg' → ajoute un % au dps de TOUTES les troupes (pct par niveau)
//   effect 'gold'      → ajoute un % à l'or gagné (pct par niveau)
export const UPGRADE_KINDS = [
  { id: 'entrainement', name: 'Entraînement', sprite: '🎯', effect: 'tierDmg',   mult: 1.3, maxLevel: 5, costFactor: 150 },
  { id: 'equipement',   name: 'Équipement',   sprite: '🛠️', effect: 'tierDmg',   mult: 1.4, maxLevel: 5, costFactor: 750 },
  { id: 'banniere',     name: 'Bannière',     sprite: '🚩', effect: 'globalDmg', pct: 10,   maxLevel: 3, costFactor: 3600 },
  { id: 'pillage',      name: 'Pillage',      sprite: '💰', effect: 'gold',      pct: 15,   maxLevel: 3, costFactor: 1800 },
]

const kindById = UPGRADE_KINDS.reduce((acc, k) => ({ ...acc, [k.id]: k }), {})

export function emptyTroopUpgrades(troopIds) {
  return troopIds.reduce((acc, id) => ({ ...acc, [id]: {} }), {})
}

// Coût du prochain niveau. null = déjà au max.
// ×5 par niveau : la 5e amélioration d'un tier coûte 625 fois la 1re, ce qui
// force à répartir entre tiers plutôt qu'à empiler un seul.
export function upgradePrice(kindId, level, troopBaseCost) {
  const kind = kindById[kindId]
  if (!kind || level >= kind.maxLevel) return null
  return Math.floor(troopBaseCost * kind.costFactor * Math.pow(5, level))
}

export function levelOf(troopUpgrades, troopId, kindId) {
  return troopUpgrades?.[troopId]?.[kindId] ?? 0
}

// Achat pur : renvoie { gold, troopUpgrades } ou null si impossible.
export function buyTroopUpgrade(troopUpgrades, troopId, kindId, gold, troopBaseCost) {
  const level = levelOf(troopUpgrades, troopId, kindId)
  const price = upgradePrice(kindId, level, troopBaseCost)
  if (price === null || gold < price) return null
  return {
    gold: gold - price,
    troopUpgrades: {
      ...troopUpgrades,
      [troopId]: { ...(troopUpgrades[troopId] ?? {}), [kindId]: level + 1 },
    },
  }
}

// Multiplicateur de dps propre à un tier : ses paliers automatiques × ses
// améliorations 'tierDmg'. Ne contient PAS les bonus globaux (voir globalEffects).
export function troopDmgMult(troopUpgrades, troopId, count) {
  let mult = milestoneMult(count)
  for (const kind of UPGRADE_KINDS) {
    if (kind.effect !== 'tierDmg') continue
    mult *= Math.pow(kind.mult, levelOf(troopUpgrades, troopId, kind.id))
  }
  return mult
}

// Bonus transverses, toutes troupes confondues : les Bannières dopent le dps
// global, les Pillages l'or. Additifs entre eux (des paliers d'une même idée).
export function globalEffects(troopUpgrades = {}) {
  let dmgPct = 0
  let goldPct = 0
  for (const troopId of Object.keys(troopUpgrades)) {
    for (const kind of UPGRADE_KINDS) {
      const lvl = levelOf(troopUpgrades, troopId, kind.id)
      if (!lvl) continue
      if (kind.effect === 'globalDmg') dmgPct += kind.pct * lvl
      if (kind.effect === 'gold') goldPct += kind.pct * lvl
    }
  }
  return { dmgMult: 1 + dmgPct / 100, goldMult: 1 + goldPct / 100 }
}

// Nettoie une structure venue d'une save : tiers et lignes inconnus écartés,
// niveaux clampés. Même défense que les reliques fantômes.
export function sanitizeTroopUpgrades(raw, troopIds) {
  const out = {}
  for (const troopId of troopIds) {
    const entry = raw?.[troopId]
    if (!entry || typeof entry !== 'object') continue
    const clean = {}
    for (const kind of UPGRADE_KINDS) {
      const lvl = entry[kind.id]
      if (Number.isFinite(lvl) && lvl > 0) clean[kind.id] = Math.min(Math.floor(lvl), kind.maxLevel)
    }
    if (Object.keys(clean).length) out[troopId] = clean
  }
  return out
}
