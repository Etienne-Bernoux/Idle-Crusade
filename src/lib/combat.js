// Combat vivant : types d'ennemis, affinités des troupes, armure, critiques.
// Logique pure, rng injectable — donc entièrement testable sans navigateur.
//
// L'idée : jusqu'ici un tick faisait `dps` dégâts, point. Trois couches s'ajoutent,
// chacune avec une décision de joueur derrière :
//
//   AFFINITÉS — chaque zone est peuplée d'un TYPE d'ennemi, et chaque tier de
//     troupe est fort (×1,5) ou faible (×0,7) contre certains types. Recruter
//     n'est plus « le meilleur ratio », c'est « le bon pour cette zone ».
//   ARMURE — les ennemis encaissent un pourcentage des dégâts, les boss bien
//     plus. Elle valorise les pointes de dégâts plutôt que le grignotage.
//   CRITIQUES — une chance par coup de frapper fort, ET d'ignorer l'armure. C'est
//     le RNG visible du jeu : un crit sur un boss blindé se sent immédiatement.

// Les cinq natures d'ennemis. Le type est porté par la ZONE (tous ses habitants
// le partagent) : le joueur apprend « ici, ce sont des morts-vivants » et adapte
// sa caserne. Un type par mob rendrait la lecture impossible.
export const ENEMY_TYPES = {
  bete:       { name: 'Bête',        sprite: '🐾' },
  mortvivant: { name: 'Mort-vivant', sprite: '💀' },
  demon:      { name: 'Démon',       sprite: '😈' },
  ombre:      { name: 'Ombre',       sprite: '🌑' },
  construct:  { name: 'Construct',   sprite: '🗿' },
}

export const STRONG_MULT = 1.5
export const WEAK_MULT = 0.7

// Affinités par tier. Le Champion est fort partout SAUF contre rien : c'est le
// tier d'endgame, sa valeur est justement de ne plus avoir à réfléchir.
export const TROOP_AFFINITY = {
  paysan:    { strong: ['bete'],                faible: ['construct'] },
  soldat:    { strong: ['mortvivant'],          faible: ['ombre'] },
  chevalier: { strong: ['demon', 'construct'],  faible: ['bete'] },
  champion:  { strong: ['ombre', 'demon'],      faible: [] },
}

// Multiplicateur d'un tier contre un type. 1 si neutre ou inconnu.
export function affinityMult(troopId, enemyType) {
  const aff = TROOP_AFFINITY[troopId]
  if (!aff || !enemyType) return 1
  if (aff.strong.includes(enemyType)) return STRONG_MULT
  if (aff.faible.includes(enemyType)) return WEAK_MULT
  return 1
}

// Étiquette d'affinité pour l'UI : 'strong' | 'faible' | null.
export function affinityLabel(troopId, enemyType) {
  const aff = TROOP_AFFINITY[troopId]
  if (!aff || !enemyType) return null
  if (aff.strong.includes(enemyType)) return 'strong'
  if (aff.faible.includes(enemyType)) return 'faible'
  return null
}

// Armure : pourcentage de dégâts encaissé, plafonné à 80% pour qu'aucun ennemi
// ne devienne mathématiquement invincible (un plancher de dégâts est garanti).
export const MAX_ARMOR = 80

// `armorPen` : points d'armure retirés avant calcul (rôle « Charge » des
// chevaliers). Distinct de `ignoreArmor`, qui annule tout (actif « Percée », et
// les critiques). La pénétration ne peut pas rendre l'armure négative : au mieux
// elle l'annule.
export function armorMult(armorPct = 0, ignoreArmor = false, armorPen = 0) {
  if (ignoreArmor) return 1
  const effective = Math.max(0, armorPct - Math.max(0, armorPen))
  const armor = Math.min(effective, MAX_ARMOR)
  return 1 - armor / 100
}

export const BASE_CRIT_CHANCE = 8    // en %
export const BASE_CRIT_MULT = 3

// Tirage de critique. rng injecté pour des tests déterministes.
export function rollCrit(rng = Math.random, critChancePct = BASE_CRIT_CHANCE) {
  return rng() * 100 < Math.min(Math.max(critChancePct, 0), 100)
}

// Dégâts d'un tick, tout compris.
//
// `troopDps` : { paysan: 240, soldat: 900, … } — le dps DÉJÀ multiplié par les
// paliers et améliorations de chaque tier, calculé par l'appelant. On applique
// ici l'affinité tier par tier : c'est ce qui fait qu'une armée mal composée
// tape moins fort, même à dps nominal égal.
//
// Un critique ignore l'armure ET multiplie : contre un boss à 60% d'armure,
// il fait ×7,5 les dégâts d'un coup normal. C'est voulu — c'est le moment de
// jeu qu'on veut rendre mémorable.
export function computeHit({
  heroDps = 0,
  troopDps = {},
  enemyType = null,
  armorPct = 0,
  critChancePct = BASE_CRIT_CHANCE,
  critMult = BASE_CRIT_MULT,
  ignoreArmor = false,
  armorPen = 0,
  globalMult = 1,
  rng = Math.random,
} = {}) {
  let raw = heroDps
  for (const [troopId, dps] of Object.entries(troopDps)) {
    raw += dps * affinityMult(troopId, enemyType)
  }
  raw *= globalMult

  const crit = rollCrit(rng, critChancePct)
  const afterArmor = raw * armorMult(armorPct, ignoreArmor || crit, armorPen)
  const damage = Math.max(1, Math.round(afterArmor * (crit ? critMult : 1)))
  return { damage, crit }
}

// Dégâts MOYENS par tick, sans tirage : sert au simulateur d'équilibrage et à
// l'affichage du « dps » dans l'UI (un joueur veut une valeur stable, pas la
// dernière valeur tirée au sort).
export function averageHit({
  heroDps = 0,
  troopDps = {},
  enemyType = null,
  armorPct = 0,
  critChancePct = BASE_CRIT_CHANCE,
  critMult = BASE_CRIT_MULT,
  ignoreArmor = false,
  armorPen = 0,
  globalMult = 1,
} = {}) {
  let raw = heroDps
  for (const [troopId, dps] of Object.entries(troopDps)) {
    raw += dps * affinityMult(troopId, enemyType)
  }
  raw *= globalMult

  const p = Math.min(Math.max(critChancePct, 0), 100) / 100
  const normal = raw * armorMult(armorPct, ignoreArmor, armorPen)
  const critical = raw * armorMult(armorPct, true) * critMult
  return Math.max(1, (1 - p) * normal + p * critical)
}
