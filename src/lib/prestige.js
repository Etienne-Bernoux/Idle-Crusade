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
// Bonus de profondeur : chaque zone au-delà du minimum de Croisade double la
// masse qui entre sous la racine. Sans lui, les zones sans fin sont du contenu
// MORT — mesuré : pousser de la zone 5 à la 8 coûte 28 → 221 min pour un gain de
// 83 → 102 Gloire. Personne ne le ferait.
//
// Base 4 → ×2 de gain par zone après la racine, ce qui compense exactement le
// surcoût de temps mesuré (×1,7 à ×2,3 par zone). En dessous, pousser n'était
// jamais rentable et les zones profondes restaient du contenu mort.
//
// Pourquoi sous la racine et pas en facteur direct : à ×2 par zone en facteur,
// un joueur profond gagnerait 85 000 Gloire par run et remplirait l'Arbre
// (8 000 au total) d'un seul coup. Sous la racine, la profondeur devient
// rentable QUAND ON EST ASSEZ FORT POUR LA TRAVERSER VITE — ce qui est
// exactement la dynamique qu'on veut d'un idle.
export const DEPTH_BONUS_BASE = 4

export function depthMultiplier(deepestZone) {
  return Math.pow(DEPTH_BONUS_BASE, Math.max(0, deepestZone - PRESTIGE_MIN_ZONES))
}

export function gloireGain(wavesCleared, deepestZone = PRESTIGE_MIN_ZONES) {
  if (!(wavesCleared > 0)) return 0
  return Math.floor(Math.sqrt(wavesCleared * 100 * depthMultiplier(deepestZone)))
}

// Poids de rareté par palier de qualité. Table explicite plutôt qu'une
// interpolation : chaque palier est une décision de design qu'on veut pouvoir
// relire d'un coup d'œil.
//
// Les paliers 0 à 3 sont ceux que l'Arbre de Gloire peut offrir (bornes de
// DESIGN § Drop rate). Les paliers 4 et 5 n'existent QUE via la règle « Disette »
// du Royaume des Ombres : c'est ce qui rend ce biome réellement différent et pas
// seulement plus dur.
const QUALITY_TABLE = [
  { commun: 70, rare: 25, legendaire: 5 },
  { commun: 60, rare: 32, legendaire: 8 },
  { commun: 50, rare: 39, legendaire: 11 },
  { commun: 40, rare: 45, legendaire: 15 },
  { commun: 32, rare: 48, legendaire: 20 },
  { commun: 25, rare: 50, legendaire: 25 },
]

// Palier maximal atteignable par l'Arbre seul.
export const MAX_QUALITY_LEVEL = 3
// Palier maximal absolu, biome compris.
export const MAX_QUALITY_LEVEL_ABS = QUALITY_TABLE.length - 1

export function rarityWeights(qualityLevel = 0) {
  const lvl = Math.min(Math.max(Math.floor(qualityLevel), 0), MAX_QUALITY_LEVEL_ABS)
  return { ...QUALITY_TABLE[lvl] }
}

