// Biomes : le monde qu'on CHOISIT avant de partir en Croisade.
//
// Un biome n'est pas qu'un palier de difficulté. Il apporte :
//   1. son propre BESTIAIRE — 5 zones nommées, leurs mobs, leurs boss, leurs
//      décors (voir BIOME_BESTIARY dans content.js) ;
//   2. une RÈGLE signature qui change la façon de jouer, pas seulement les
//      chiffres : profusion de reliques, disette d'or, frénésie du Cri, néant ;
//   3. son couple difficulté / récompense.
//
// Ce qui garantit l'équilibre malgré la variété : les valeurs (PV, or, vagues)
// viennent d'un barème COMMUN (`ZONE_TEMPLATE`, content.js) que le biome ne
// touche que par les multiplicateurs déclarés ici. Un biome ne peut donc pas
// être accidentellement plus dur ou plus généreux que ce que sa fiche annonce.
//
// Les règles n'utilisent que des leviers DÉJÀ présents dans la boucle de jeu
// (vagues, drops, qualité, coût des troupes, Cri, Gloire) : aucune mécanique de
// combat nouvelle, donc rien qui puisse dériver en silence.

// Chaque règle est un jeu de facteurs. Absent = neutre (cf. biomeEffects).
//   waveMult       : vagues par zone            relicDrops    : reliques par boss
//   goldMult       : or gagné                   qualityBonus  : crans de rareté offerts
//   troopCostMult  : coût de recrutement        gloireMult    : Gloire gagnée
//   warCryDurMult  : durée du Cri               warCryCdMult  : cooldown du Cri
export const BIOMES = [
  {
    id: 'croisade',
    name: 'Terres de Croisade',
    sprite: '🌿',
    desc: 'Le monde tel qu\'il est.',
    hpMult: 1,
    rewardMult: 1,
    unlockAtZone: 0,
    ruleName: 'Aucune règle',
    ruleDesc: 'Le monde de référence : rien n\'est modifié.',
    rules: {},
  },
  {
    id: 'maudites',
    name: 'Terres Maudites',
    sprite: '🥀',
    desc: 'Ennemis ×5 · butin et Gloire ×2,2',
    hpMult: 5,
    rewardMult: 2.2,
    unlockAtZone: 5,
    ruleName: 'Profusion',
    ruleDesc: '2 reliques par boss, mais 50% de vagues en plus.',
    rules: { relicDrops: 2, waveMult: 1.5 },
  },
  {
    id: 'ombres',
    name: 'Royaume des Ombres',
    sprite: '🌑',
    desc: 'Ennemis ×25 · butin et Gloire ×4,8',
    hpMult: 25,
    rewardMult: 4.8,
    unlockAtZone: 7,
    ruleName: 'Disette',
    ruleDesc: "Or divisé par 2, mais reliques deux crans plus rares.",
    rules: { goldMult: 0.5, qualityBonus: 2 },
  },
  {
    id: 'ecarlate',
    name: 'Abîme Écarlate',
    sprite: '🩸',
    desc: 'Ennemis ×125 · butin et Gloire ×10,5',
    hpMult: 125,
    rewardMult: 10.5,
    unlockAtZone: 9,
    ruleName: 'Bain de Sang',
    ruleDesc: 'Cri de Guerre deux fois plus long et deux fois plus fréquent, recrutement au double du prix.',
    rules: { warCryDurMult: 2, warCryCdMult: 0.5, troopCostMult: 2 },
  },
  {
    id: 'neant',
    name: 'Néant',
    sprite: '🕳️',
    desc: 'Ennemis ×625 · butin et Gloire ×23',
    hpMult: 625,
    rewardMult: 23,
    unlockAtZone: 11,
    ruleName: 'Vacuité',
    ruleDesc: 'Aucune relique ne subsiste, mais la Gloire est majorée de moitié.',
    rules: { relicDrops: 0, gloireMult: 1.5 },
  },
]

export const DEFAULT_BIOME = BIOMES[0].id

const byId = BIOMES.reduce((acc, b) => ({ ...acc, [b.id]: b }), {})

export function biomeById(id) {
  return byId[id] ?? byId[DEFAULT_BIOME]
}

// Un biome est ouvert quand on a atteint sa zone de déblocage AU MOINS UNE FOIS,
// dans n'importe quel biome. `deepestEver` est un record permanent, distinct de
// `zonesCleared` qui est propre au run.
export function isBiomeUnlocked(id, deepestEver = 0) {
  const biome = byId[id]
  return !!biome && deepestEver >= biome.unlockAtZone
}

export function unlockedBiomes(deepestEver = 0) {
  return BIOMES.filter(b => isBiomeUnlocked(b.id, deepestEver))
}

// Le biome à retenir au chargement : celui de la save s'il est connu ET ouvert,
// sinon le premier. Évite qu'une save bricolée démarre dans le Néant.
export function resolveBiome(id, deepestEver = 0) {
  return isBiomeUnlocked(id, deepestEver) ? id : DEFAULT_BIOME
}

export function nextBiome(deepestEver = 0) {
  return BIOMES.find(b => !isBiomeUnlocked(b.id, deepestEver)) ?? null
}

// Tout ce que le jeu consomme d'un biome, défauts neutres appliqués. Porte de
// sortie unique : une règle absente n'a aucun effet, et aucune valeur par défaut
// ne se disperse dans App.svelte.
export function biomeEffects(id) {
  const b = biomeById(id)
  const r = b.rules ?? {}
  return {
    hpMult: b.hpMult,
    rewardMult: b.rewardMult,
    waveMult: r.waveMult ?? 1,
    relicDrops: r.relicDrops ?? 1,
    goldMult: r.goldMult ?? 1,
    qualityBonus: r.qualityBonus ?? 0,
    troopCostMult: r.troopCostMult ?? 1,
    warCryDurMult: r.warCryDurMult ?? 1,
    warCryCdMult: r.warCryCdMult ?? 1,
    gloireMult: r.gloireMult ?? 1,
  }
}
