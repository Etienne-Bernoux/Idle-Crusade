// Rôles de troupes : ce que chaque tier apporte À L'ARMÉE, en plus de son dps.
//
// Avant, les quatre tiers ne différaient que par leur dps et leur coût : monter
// en tier était juste « plus fort », jamais « autre chose ». Chacun a désormais
// une capacité passive qui pousse à une composition, pas à un empilement.
//
//   🌾 Paysan    « Marée humaine » — la masse fait des coups chanceux
//   ⚔️ Soldat    « Discipline »    — l'ordre profite à toute l'armée
//   🐎 Chevalier « Charge »        — la lourdeur perce les armures
//   🛡️ Champion  « Étendard »      — l'élite transforme les coups critiques
//
// Chaque rôle a un SEUIL (tous les N soldats…) et un PLAFOND. Le seuil rend la
// progression lisible — on voit le palier arriver — et le plafond garantit qu'un
// rôle poussé à l'extrême ne casse pas le jeu. Les deux sont testés.

export const ROLES = {
  paysan: {
    name: 'Marée humaine',
    sprite: '🌾',
    // La masse crée des occasions : chaque paquet de paysans ajoute de la chance
    // de critique à TOUTE l'armée.
    effect: 'critChance',
    per: 25,
    amount: 1,
    cap: 25,
    unit: 'pts de critique',
    desc: '+1 pt de critique tous les 25 paysans',
  },
  soldat: {
    name: 'Discipline',
    sprite: '⚔️',
    // L'entraînement collectif : un bonus de dégâts qui profite à tous les tiers,
    // y compris aux paysans et aux champions.
    effect: 'armyDmgPct',
    per: 5,
    amount: 1,
    cap: 50,
    unit: '% dégâts',
    desc: '+1% de dégâts à toute l\'armée tous les 5 soldats',
  },
  chevalier: {
    name: 'Charge',
    sprite: '🐎',
    // La cavalerie lourde ouvre les brèches : elle réduit l'armure EFFECTIVE de
    // la cible. C'est le rôle qui répond aux boss blindés.
    effect: 'armorPen',
    per: 1,
    amount: 1,
    cap: 40,
    unit: 'pts de pénétration',
    desc: "+1 pt de pénétration d'armure par chevalier",
  },
  champion: {
    name: 'Étendard',
    sprite: '🛡️',
    // L'élite ne multiplie pas les coups, elle les rend dévastateurs : elle
    // augmente le MULTIPLICATEUR de critique, pas leur fréquence.
    effect: 'critMultBonus',
    per: 1,
    amount: 0.25,
    cap: 3,
    unit: '× sur les critiques',
    desc: '+0,25 au multiplicateur de critique par champion',
  },
}

// Apport d'un tier seul, plafonné. Renvoie une valeur brute dans l'unité du rôle.
export function roleValue(troopId, count = 0) {
  const role = ROLES[troopId]
  if (!role || !(count > 0)) return 0
  const raw = Math.floor(count / role.per) * role.amount
  // Arrondi à 2 décimales : le pas du Champion est de 0,25, une addition
  // flottante donnerait 0,7500000000000001 à l'affichage.
  return Math.round(Math.min(raw, role.cap) * 100) / 100
}

// Progression vers le prochain palier : { current, next, missing } ou null si le
// plafond est atteint. Sert à afficher « encore 7 pour +1 » — sans ça un rôle à
// seuil est invisible entre deux paliers.
export function roleProgress(troopId, count = 0) {
  const role = ROLES[troopId]
  if (!role) return null
  const current = roleValue(troopId, count)
  if (current >= role.cap) return { current, next: null, missing: 0 }
  const reached = Math.floor(count / role.per)
  const nextThreshold = (reached + 1) * role.per
  return {
    current,
    next: Math.round(Math.min((reached + 1) * role.amount, role.cap) * 100) / 100,
    missing: nextThreshold - count,
  }
}

// Effets cumulés de la composition. Un seul objet, consommé par le combat.
export function roleEffects(counts = {}) {
  return {
    critChance: roleValue('paysan', counts.paysan ?? 0),
    armyDmgPct: roleValue('soldat', counts.soldat ?? 0),
    armorPen: roleValue('chevalier', counts.chevalier ?? 0),
    critMultBonus: roleValue('champion', counts.champion ?? 0),
  }
}

// Plafonds théoriques, pour les tests d'équilibre et l'affichage d'objectifs.
export function roleCaps() {
  return Object.fromEntries(Object.entries(ROLES).map(([id, r]) => [id, r.cap]))
}

// Effectif nécessaire pour plafonner un rôle : utile pour savoir si le plafond
// est atteignable en pratique ou purement théorique.
export function countToCap(troopId) {
  const role = ROLES[troopId]
  if (!role) return Infinity
  return Math.ceil(role.cap / role.amount) * role.per
}
