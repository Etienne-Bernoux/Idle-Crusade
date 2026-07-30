// La Frappe — le coup que le joueur porte lui-même.
//
// Avant, le héros tapait tout seul à 12 dps : les premières secondes d'un run
// se REGARDAIENT. C'est le seul moment du jeu où le joueur n'a ni armée, ni or,
// ni rien à décider — et il n'avait rien à faire non plus.
//
// Désormais le héros ne frappe que si on le lui demande. Sans armée, cliquer
// est le seul moyen d'avancer ; avec une armée, c'est un appoint. Le pilier
// idle tient parce que la Frappe est **bornée par la vitesse d'un doigt** : elle
// amorce un run, elle ne peut pas le porter.
//
// Elle est améliorable, et cela ne viole pas l'invariant « rien de payé en or
// n'a d'effet transverse » : la Frappe est au héros ce qu'une Doctrine est à un
// tier de troupe — sa propre ligne, qui ne touche que lui.

// Calibrage contraint par le pilier idle, et il a fallu s'y reprendre : à ×1,7
// sur 8 niveaux, la Frappe atteignait 2 793 dps et écrasait une armée de
// 100 paysans (400 dps) — le jeu serait devenu un clicker. Un test borne
// désormais le rapport.
export const FRAPPE_BASE = 8          // dégâts d'un clic nu
export const FRAPPE_MULT = 1.4        // par niveau
export const FRAPPE_MAX = 6           // niveaux
export const FRAPPE_PRIX_BASE = 25
export const FRAPPE_PRIX_MULT = 3.2

// Cadence retenue pour tout calcul de dps : un humain qui clique vite tient
// environ 5 coups par seconde, pas davantage. C'est ce plafond biologique qui
// garantit que la Frappe reste un amorçage.
export const FRAPPE_CLICS_PAR_SEC = 5

export function frappeLevel(raw) {
  const n = Math.floor(raw ?? 0)
  return Number.isFinite(n) ? Math.min(FRAPPE_MAX, Math.max(0, n)) : 0
}

// Dégâts d'un clic. `globalMult` est le même multiplicateur que celui de
// l'armée (reliques, Arbre, Panthéon, succès) : sans lui la Frappe serait morte
// après deux minutes, et l'améliorer n'aurait aucun sens passé la zone 1.
export function frappeDamage(level = 0, globalMult = 1) {
  return FRAPPE_BASE * Math.pow(FRAPPE_MULT, frappeLevel(level)) * globalMult
}

// Prix du niveau suivant, ou null si la Frappe est au maximum.
export function frappePrice(level = 0) {
  const l = frappeLevel(level)
  if (l >= FRAPPE_MAX) return null
  return Math.floor(FRAPPE_PRIX_BASE * Math.pow(FRAPPE_PRIX_MULT, l))
}

export function buyFrappe(level = 0, gold = 0) {
  const prix = frappePrice(level)
  if (prix === null || gold < prix) return null
  return { level: frappeLevel(level) + 1, gold: gold - prix }
}

// Ce que la Frappe vaut en dps si on clique sans relâche. Sert à la comparer à
// l'armée — et à vérifier qu'elle ne la remplace jamais.
export function frappeDps(level = 0, globalMult = 1) {
  return frappeDamage(level, globalMult) * FRAPPE_CLICS_PAR_SEC
}
