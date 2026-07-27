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

// Poids de rareté selon le niveau de Fortune. Interpolation linéaire entre les
// bornes de DESIGN § Drop rate : 70/25/5 (niv. 0) → 40/45/15 (niv. max).
const QUALITY_FLOOR = { commun: 70, rare: 25, legendaire: 5 }
const QUALITY_CEIL = { commun: 40, rare: 45, legendaire: 15 }

// 3 paliers, portés par les nœuds « Fortune » de la branche Reliques.
export const MAX_QUALITY_LEVEL = 3

export function rarityWeights(fortuneLevel = 0) {
  const max = MAX_QUALITY_LEVEL
  const t = Math.min(Math.max(fortuneLevel, 0), max) / max
  const lerp = (a, b) => a + (b - a) * t
  return {
    commun: lerp(QUALITY_FLOOR.commun, QUALITY_CEIL.commun),
    rare: lerp(QUALITY_FLOOR.rare, QUALITY_CEIL.rare),
    legendaire: lerp(QUALITY_FLOOR.legendaire, QUALITY_CEIL.legendaire),
  }
}
