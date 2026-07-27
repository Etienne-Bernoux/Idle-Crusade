// Prestige (Croisade) : gain de Gloire, catalogue de la Forge, effets meta.
// Logique pure et sans état — l'UI n'y met que des primitifs (niveaux, compteurs).
// Formules de référence : docs/DESIGN.md § Prestige.

// Nombre de zones à clear avant de pouvoir partir en Croisade.
export const PRESTIGE_MIN_ZONES = 5

// Gloire gagnée pour un run, en fonction des VAGUES vaincues.
//
// Historiquement basée sur les zones clear (`√(zones × 10)`, table DESIGN.md).
// Mesuré au simulateur : avec seulement 5 zones, `zonesCleared` vaut 5 à chaque
// run, donc le gain valait 7 à vie et les cycles de prestige ne raccourcissaient
// pas (×0.97). Les vagues, elles, continuent de croître — la dernière zone
// reboucle sur son boss, donc farmer plus longtemps rapporte plus, ce que la
// racine carrée était censée récompenser.
//
// Le facteur 100 est calibré sur la cible de DESIGN.md (×0.6 par cycle) :
// il donne ×0.53 au deuxième cycle. Voir docs/plans/2026-07-27-003-feat-us-15-prestige-balance-plan.md.
export function gloireGain(wavesCleared) {
  if (!(wavesCleared > 0)) return 0
  return Math.floor(Math.sqrt(wavesCleared * 100))
}

// Catalogue de la Forge. `perLevel` est l'incrément d'effet par niveau ;
// son interprétation dépend de `effect` et vit dans metaEffects().
export const META_UPGRADES = [
  { id: 'fureur',      name: 'Fureur',              sprite: '🔥', effect: 'dmg',      perLevel: 10, maxLevel: 5, baseCost: 5,  desc: '+10% dégâts par niveau' },
  { id: 'butin',       name: 'Butin',               sprite: '💰', effect: 'gold',     perLevel: 10, maxLevel: 5, baseCost: 5,  desc: "+10% d'or par niveau" },
  { id: 'intendance',  name: 'Intendance',          sprite: '📜', effect: 'cost',     perLevel: 3,  maxLevel: 5, baseCost: 8,  desc: '−3% coût de recrutement par niveau' },
  { id: 'discipline',  name: 'Discipline',          sprite: '⏳', effect: 'cooldown', perLevel: 5,  maxLevel: 3, baseCost: 12, desc: '−5% cooldown des actifs par niveau' },
  { id: 'fortune',     name: 'Fortune',             sprite: '🍀', effect: 'quality',  perLevel: 1,  maxLevel: 3, baseCost: 15, desc: 'Reliques rares plus fréquentes' },
  { id: 'champion',    name: 'Serment du Champion', sprite: '🛡️', effect: 'unlock',   perLevel: 1,  maxLevel: 1, baseCost: 50, desc: 'Débloque le tier Champion' },
]

export const META_IDS = META_UPGRADES.map(u => u.id)

export function emptyMetaLevels() {
  return META_IDS.reduce((acc, id) => ({ ...acc, [id]: 0 }), {})
}

const byId = META_UPGRADES.reduce((acc, u) => ({ ...acc, [u.id]: u }), {})

// Coût du PROCHAIN niveau (on passe de `level` à `level + 1`). Quadratique.
// null = déjà au max : l'appelant affiche "max" au lieu d'un prix.
export function upgradeCost(id, level) {
  const up = byId[id]
  if (!up || level >= up.maxLevel) return null
  return up.baseCost * Math.pow(level + 1, 2)
}

export function canAfford(id, level, gloire) {
  const cost = upgradeCost(id, level)
  return cost !== null && gloire >= cost
}

// Achat pur : renvoie le nouvel état { gloire, levels } ou null si impossible.
// null (et pas un throw) parce que l'UI grise déjà le bouton — un clic passé
// entre deux renders ne doit pas crasher le jeu.
export function buyUpgrade(id, levels, gloire) {
  const level = levels[id] ?? 0
  if (!canAfford(id, level, gloire)) return null
  return {
    gloire: gloire - upgradeCost(id, level),
    levels: { ...levels, [id]: level + 1 },
  }
}

// Poids de rareté selon le niveau de Fortune. Interpolation linéaire entre les
// bornes de DESIGN § Drop rate : 70/25/5 (niv. 0) → 40/45/15 (niv. max).
const QUALITY_FLOOR = { commun: 70, rare: 25, legendaire: 5 }
const QUALITY_CEIL = { commun: 40, rare: 45, legendaire: 15 }

export function rarityWeights(fortuneLevel = 0) {
  const max = byId.fortune.maxLevel
  const t = Math.min(Math.max(fortuneLevel, 0), max) / max
  const lerp = (a, b) => a + (b - a) * t
  return {
    commun: lerp(QUALITY_FLOOR.commun, QUALITY_CEIL.commun),
    rare: lerp(QUALITY_FLOOR.rare, QUALITY_CEIL.rare),
    legendaire: lerp(QUALITY_FLOOR.legendaire, QUALITY_CEIL.legendaire),
  }
}

// Multiplicateurs dérivés des niveaux, prêts à consommer par l'UI.
// Additif au sein d'une upgrade (5 niveaux de Fureur = +50%), multiplicatif
// entre upgrades (côté appelant, qui les compose avec ceux des reliques).
export function metaEffects(levels = {}) {
  const lvl = (id) => Math.min(Math.max(levels[id] ?? 0, 0), byId[id].maxLevel)
  return {
    dmgMult: 1 + lvl('fureur') * 0.10,
    goldMult: 1 + lvl('butin') * 0.10,
    costMult: 1 - lvl('intendance') * 0.03,
    cooldownMult: 1 - lvl('discipline') * 0.05,
    rarityWeights: rarityWeights(lvl('fortune')),
    championUnlocked: lvl('champion') > 0,
  }
}
