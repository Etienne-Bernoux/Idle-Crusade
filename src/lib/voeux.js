// Pierres de Vœu — des nœuds qui ne se comparent pas.
//
// Constat mesuré : l'Arbre CLASSE ses branches au lieu d'offrir un choix
// (Guerre ×0,67, Fortune ×0,71, Reliques ×0,77, Croisade ×0,81 sur 5 cycles).
// Et c'est structurel, pas un problème de réglage : **tous les nœuds parlent la
// même monnaie — un multiplicateur — donc ils se classent toujours.** Aucun
// rééquilibrage ne corrige ça ; seuls des effets NON COMMENSURABLES le peuvent.
//
// Un Vœu ne donne donc pas un pourcentage. Il change une règle et impose un
// renoncement. On ne peut pas dire qu'il est « meilleur » — seulement qu'il
// appelle une autre façon de jouer.
//
// Règles du système :
//   • UN SEUL Vœu à la fois, choisi au départ d'une Croisade, comme le biome.
//   • Chaque Vœu se débloque en possédant l'apex de SA branche : c'est une
//     récompense de spécialisation, pas un cadeau.
//   • Chacun doit gagner sur une MÉTRIQUE DIFFÉRENTE. Si l'un dominait sur la
//     même que les autres, on aurait juste déplacé le classement d'un cran.

import { BRANCHES } from './tree.js'

// Prime commune : sans elle, ne prendre aucun Vœu serait toujours le choix sûr,
// et le système ne serait qu'une option décorative. Avec elle, jouer sans Vœu
// devient le choix prudent et en prendre un devient un pari.
export const VOEU_GLOIRE_MULT = 1.5

export const VOEUX = {
  pauvrete: {
    id: 'pauvrete', branch: 'fortune', sprite: '🕊️', name: 'Vœu de Pauvreté',
    metric: 'butin',
    renoncement: 'Ton or est divisé par 5',
    contrepartie: 'Les boss lâchent 2 reliques, de 2 crans de rareté supérieurs',
    effects: { goldMult: 0.2, relicDrops: 1, qualityLevel: 2 },
  },
  silence: {
    id: 'silence', branch: 'guerre', sprite: '🤫', name: 'Vœu de Silence',
    metric: 'passif',
    renoncement: 'Tu ne peux plus lancer d\'actifs — et les boss n\'annoncent plus rien',
    contrepartie: 'Leurs effets deviennent permanents, à 20 %',
    effects: { mute: true, passiveActivePct: 20 },
  },
  fer: {
    id: 'fer', branch: 'reliques', sprite: '⛓️', name: 'Vœu de Fer',
    metric: 'concentration',
    // Mesuré : à ×4, concentrer était STRICTEMENT meilleur — plus rapide, plus
    // de Gloire, plus de butin. Un Vœu qui n'a pas de coût n'est pas un choix.
    // À ×2,5, le run ralentit vraiment et la contrepartie est ailleurs : la
    // qualité du butin, pas la vitesse.
    renoncement: 'Un seul emplacement de relique',
    contrepartie: 'Son effet compte ×2,5, et tes trouvailles montent d\'un cran',
    effects: { relicSlots: 1, relicMult: 2.5, qualityLevel: 1 },
  },
}

export const VOEU_IDS = Object.keys(VOEUX)

export function voeuById(id) {
  return VOEUX[id] ?? null
}

// Débloqué en possédant l'apex de sa branche. On accepte les deux apex d'une
// branche : le joueur a poussé une voie à fond, peu importe laquelle.
export function isVoeuUnlocked(id, treeNodes = []) {
  const v = VOEUX[id]
  if (!v) return false
  return treeNodes.some(n => typeof n === 'string' && n.startsWith(`${v.branch}-`) && n.endsWith('-apex'))
}

export function unlockedVoeux(treeNodes = []) {
  return VOEU_IDS.filter(id => isVoeuUnlocked(id, treeNodes))
}

// Un id inconnu, ou un Vœu plus débloqué (arbre remis à zéro par la Légende),
// retombe silencieusement sur « aucun ». Jamais d'exception dans la boucle.
export function resolveVoeu(id, treeNodes = []) {
  return isVoeuUnlocked(id, treeNodes) ? id : null
}

const NEUTRE = {
  goldMult: 1, relicDrops: 0, qualityLevel: 0, mute: false, passiveActivePct: 0,
  bannedTiers: [], roleCapMult: {}, relicSlots: null, relicMult: 1, gloireMult: 1, costMult: 1,
  randomBiome: false, gloireBonusPct: 0,
}

export function voeuEffects(id) {
  const v = VOEUX[id]
  if (!v) return { ...NEUTRE }
  const e = { ...NEUTRE, ...v.effects }
  // La prime commune et le bonus propre au Vœu se composent.
  e.gloireMult = VOEU_GLOIRE_MULT * (1 + (e.gloireBonusPct ?? 0) / 100)
  return e
}

export function isTierBanned(id, tier) {
  return voeuEffects(id).bannedTiers.includes(tier)
}

// Une branche, au plus un Vœu.
export function voeuOfBranch(branchId) {
  return VOEU_IDS.map(id => VOEUX[id]).find(v => v.branch === branchId) ?? null
}

// LA BRANCHE CROISADE N'A PAS DE VŒU, et c'est un constat mesuré, pas un oubli.
// Deux candidats y ont été essayés puis écartés :
//
//   • « Vœu du Nombre » (interdire un tier de troupe). Mesuré deux fois : la
//     zone 13 devenait inatteignable, y compris avec plafonds de rôle doublés
//     ET recrutement à moitié prix. Interdire un tier n'est pas un renoncement,
//     c'est un plafond dur sur la profondeur — le dps dépend du meilleur tier
//     disponible et le contenu croît exponentiellement.
//   • « Vœu d'Errance » (biome tiré au sort). Mesuré avec le tirage modélisé :
//     tomber sur les Terres Maudites (×5 PV) rendait le run infaisable dans un
//     budget de 120 min. Un renoncement ne doit pas pouvoir rendre une partie
//     injouable.
//
// La question reste ouverte : que peut-on renoncer, sur cette branche, qui
// coûte sans murer ? Un test verrouille l'état actuel pour que la réponse soit
// une décision et non une dérive.
export const BRANCHES_SANS_VOEU = ['croisade']

export function coveredBranches() {
  return BRANCHES.map(b => b.id).filter(id => voeuOfBranch(id) !== null)
}
