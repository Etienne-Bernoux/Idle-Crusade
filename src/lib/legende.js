// La Légende — deuxième couche de prestige.
//
// Raison d'être, mesurée (cf. docs/plans/2026-07-29-001) : le contenu croît
// ×7,4 par zone, la puissance ×1,5. Aucun réglage ne rattrape un écart
// exponentiel ; il fallait une source de puissance exponentielle.
//
// Le principe tient en une ligne : une monnaie qui croît LINÉAIREMENT avec la
// profondeur, dont chaque point donne un effet MULTIPLICATIF. Linéaire ×
// multiplicatif = exponentiel. C'est exactement ce qui manquait aux Échos, dont
// les +25% s'additionnaient et dont la puissance restait donc linéaire.
//
// Corollaire assumé : le coût d'un niveau est PLAT (1 point). La décision du
// joueur est l'allocation entre les voies, pas l'épargne. Une courbe de coût
// ramènerait une croissance polynomiale, c'est-à-dire le problème d'origine.

// Profondeur à atteindre pour entrer dans la Légende. Assez tard pour que la
// Croisade ait été comprise et pratiquée, assez tôt pour arriver avant le mur
// (mesuré vers la zone 15-16).
export const LEGENDE_MIN_ZONE = 10

// Points gagnés par zone au-delà du seuil.
//
// Calibré au simulateur (`--legende`), pas déduit. Ce qui casse le mur n'est pas
// qu'un cycle couvre à lui seul le contenu qu'il ouvre — c'est que les points
// s'ACCUMULENT d'une Légende à l'autre pendant que leur effet se multiplie.
//
// Profondeur atteinte sur 6 cycles, budget de 30 min par run :
//   K=10 → 14 → 20 → 33 → 45   (+23 zones d'un coup : le contenu est avalé)
//   K=3  → 14 → 15 → 18 → 21 → 25 → 31   ← retenu
//   K=2  → 14 → 15 → 16 → 18 → 20 → 23   (trop plat pour se sentir récompensé)
//
// L'accélération est inhérente : les points croissent avec la profondeur ET leur
// effet est multiplicatif. On la veut douce au début, franche ensuite.
export const LEGENDE_PER_ZONE = 3

// Multiplicateur par niveau, commun à toutes les voies : la comparaison entre
// voies doit porter sur ce qu'elles multiplient, jamais sur un taux caché.
export const PANTHEON_MULT = 1.25

export const PANTHEON = [
  { id: 'fureur',  name: 'Fureur Éternelle',  sprite: '⚔',  effect: 'dmgMult',   desc: 'dégâts' },
  { id: 'opulence', name: 'Opulence Éternelle', sprite: '🪙', effect: 'goldMult',  desc: 'or gagné' },
  { id: 'faveur',  name: 'Faveur Éternelle',  sprite: '💎', effect: 'relicMult', desc: 'effets des reliques' },
  { id: 'renom',   name: 'Renom Éternel',     sprite: '🏆', effect: 'gloireMult', desc: 'Gloire gagnée' },
]

const byId = Object.fromEntries(PANTHEON.map(v => [v.id, v]))

export function pantheonById(id) {
  return byId[id] ?? null
}

// Gain d'une entrée en Légende. Linéaire en profondeur : c'est le point entier
// du système, une formule sous-racine ou logarithmique le casserait.
export function legendeGain(deepestZone, perZone = LEGENDE_PER_ZONE) {
  return Math.max(0, Math.floor(deepestZone) - (LEGENDE_MIN_ZONE - 1)) * perZone
}

export function canEnterLegende(deepestZone) {
  return Math.floor(deepestZone) >= LEGENDE_MIN_ZONE
}

export function emptyPantheon() {
  return PANTHEON.reduce((acc, v) => ({ ...acc, [v.id]: 0 }), {})
}

// Niveau d'une voie, tolérant à une save qui ne la connaît pas encore.
export function levelOf(levels = {}, id) {
  const n = levels?.[id]
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

export function buyPantheon(levels = {}, id, points) {
  if (!byId[id] || points < 1) return null
  return { levels: { ...levels, [id]: levelOf(levels, id) + 1 }, points: points - 1 }
}

// Effets agrégés. Chaque voie est un multiplicateur pur : contrat identique aux
// autres agrégateurs du projet (les multiplicateurs se multiplient).
export function pantheonEffects(levels = {}, mult = PANTHEON_MULT) {
  const out = { dmgMult: 1, goldMult: 1, relicMult: 1, gloireMult: 1 }
  for (const v of PANTHEON) out[v.effect] = Math.pow(mult, levelOf(levels, v.id))
  return out
}

// Total investi, pour l'affichage et pour un éventuel remboursement de save.
export function totalSpent(levels = {}) {
  return PANTHEON.reduce((s, v) => s + levelOf(levels, v.id), 0)
}
