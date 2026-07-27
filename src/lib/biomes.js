// Biomes : le niveau de difficulté qu'on CHOISIT avant de partir en Croisade.
//
// Un biome multiplie les PV de tous les ennemis du run, et multiplie en retour
// l'or et la Gloire gagnés. C'est une dimension ORTHOGONALE aux zones : les zones
// (Forêt, Ruines… puis leurs cycles de profondeur) restent la progression à
// l'intérieur d'un run ; le biome règle la dureté de ce run.
//
// Pourquoi pas un « départ en zone avancée » : mesuré en US 16, démarrer plus
// loin RALLONGE le run — on affronte des ennemis coriaces sans les revenus des
// zones sautées. Un multiplicateur global n'a pas ce défaut : la courbe entière
// est décalée, revenus compris.
//
// L'équilibre tient à un seul rapport : un biome ×5 en PV rend le run environ
// deux fois plus long (le joueur monte son dps vite), donc récompenser ×2,2 rend
// la montée en biome légèrement gagnante quand on est assez fort — et perdante
// quand on ne l'est pas. Facteurs calibrés au simulateur, cf. le plan d'US 20.

export const BIOMES = [
  {
    id: 'croisade',
    name: 'Terres de Croisade',
    sprite: '🌿',
    desc: 'Le monde tel qu\'il est. Aucun bonus, aucune peine.',
    hpMult: 1,
    rewardMult: 1,
    // Le premier biome n'a rien à débloquer : c'est le point d'entrée.
    unlockAtZone: 0,
  },
  {
    id: 'maudites',
    name: 'Terres Maudites',
    sprite: '🥀',
    desc: 'Ennemis ×5 plus résistants, butin et Gloire ×2,2.',
    hpMult: 5,
    rewardMult: 2.2,
    unlockAtZone: 5,
  },
  {
    id: 'ombres',
    name: 'Royaume des Ombres',
    sprite: '🌑',
    desc: 'Ennemis ×25, butin et Gloire ×4,8.',
    hpMult: 25,
    rewardMult: 4.8,
    unlockAtZone: 7,
  },
  {
    id: 'ecarlate',
    name: 'Abîme Écarlate',
    sprite: '🩸',
    desc: 'Ennemis ×125, butin et Gloire ×10,5.',
    hpMult: 125,
    rewardMult: 10.5,
    unlockAtZone: 9,
  },
  {
    id: 'neant',
    name: 'Néant',
    sprite: '🕳️',
    desc: 'Ennemis ×625, butin et Gloire ×23.',
    hpMult: 625,
    rewardMult: 23,
    unlockAtZone: 11,
  },
]

export const DEFAULT_BIOME = BIOMES[0].id

const byId = BIOMES.reduce((acc, b) => ({ ...acc, [b.id]: b }), {})

export function biomeById(id) {
  return byId[id] ?? byId[DEFAULT_BIOME]
}

// Un biome est ouvert quand on a atteint sa zone de déblocage AU MOINS UNE FOIS,
// dans n'importe quel biome. `deepestEver` est donc un record permanent, distinct
// de `zonesCleared` qui est propre au run.
export function isBiomeUnlocked(id, deepestEver = 0) {
  const biome = byId[id]
  return !!biome && deepestEver >= biome.unlockAtZone
}

export function unlockedBiomes(deepestEver = 0) {
  return BIOMES.filter(b => isBiomeUnlocked(b.id, deepestEver))
}

// Le biome à retenir au chargement : celui de la save s'il est connu ET ouvert,
// sinon on retombe sur le premier. Évite qu'une save bricolée démarre dans le
// Néant.
export function resolveBiome(id, deepestEver = 0) {
  return isBiomeUnlocked(id, deepestEver) ? id : DEFAULT_BIOME
}

// Le prochain biome à débloquer, pour l'afficher comme objectif. null si tout est
// déjà ouvert.
export function nextBiome(deepestEver = 0) {
  return BIOMES.find(b => !isBiomeUnlocked(b.id, deepestEver)) ?? null
}

export function biomeEffects(id) {
  const b = biomeById(id)
  return { hpMult: b.hpMult, rewardMult: b.rewardMult }
}
