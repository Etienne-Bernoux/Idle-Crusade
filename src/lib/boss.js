// Boss télégraphiés — la seule scène jouée du jeu.
//
// Constat qui l'a motivé : un boss ne différait d'un mob que par ses PV, son
// armure et son type. Rien ne s'y passait. Et en parallèle, la politique
// optimale des actifs était « lancer chaque actif dès qu'il est prêt » — quand
// le jeu optimal est un automatisme, il n'y a pas de décision.
//
// Le principe : à des paliers de PV, le boss ANNONCE une action pendant
// quelques ticks. Chaque annonce a exactement UN actif qui la contre. Le joueur
// lit une icône et appuie sur le bouton assorti — un jeu d'appariement, jouable
// sans savoir lire.
//
// Invariant non négociable : rater un contre ne fait JAMAIS perdre. Ça coûte du
// temps et du butin. Le pilier « on ne peut pas perdre » reste intact, et c'est
// ce qui autorise cette tactique dans un idle.

import { isActiveUnlocked } from './actives.js'

// Paliers de PV auxquels le boss annonce. Trois : assez pour rythmer un combat,
// assez peu pour ne pas transformer un idle en jeu de rythme.
export const TELEGRAPH_THRESHOLDS = [0.75, 0.5, 0.25]

// Fenêtre de réaction, en ticks de 800 ms.
//
// Élargie de 4 à 6 ticks (3,2 s → 4,8 s) sur une observation de vérification :
// un pilote automatisé ratait la fenêtre de 3,2 s une fois sur deux à cause de
// ses seuls temps d'aller-retour. Si une machine la rate, un enfant de 5 ans la
// rate. Une annonce doit être une invitation, pas un test de réflexes.
export const TELEGRAPH_TICKS = 6

// Chaque annonce nomme son contre. Le malus s'applique jusqu'à la mort du boss
// si le contre est raté ; le bonus est une fenêtre courte s'il est réussi.
export const TELEGRAPHS = {
  carapace: {
    id: 'carapace', sprite: '🛡️', name: 'Carapace',
    tell: 'Le boss se blinde !', counter: 'percee',
    // Non contré : +35 points d'armure jusqu'à la fin du combat.
    malus: { armorPts: 35 },
  },
  fureur: {
    id: 'fureur', sprite: '🔥', name: 'Fureur',
    tell: 'Le boss entre en fureur !', counter: 'warcry',
    // Non contré : il encaisse 35% de dégâts en moins.
    malus: { dmgTakenMult: 0.65 },
  },
  voile: {
    id: 'voile', sprite: '🌫️', name: 'Voile',
    tell: 'Un voile brouille ta visée !', counter: 'rage',
    // Non contré : les critiques ne passent plus.
    malus: { critMult: 0 },
  },
  rapine: {
    id: 'rapine', sprite: '💰', name: 'Rapine',
    tell: 'Le boss cache son butin !', counter: 'ferveur',
    // Non contré : moitié moins d'or. Le seul malus qui ne touche pas au combat.
    malus: { goldMult: 0.5 },
  },
}

export const TELEGRAPH_IDS = Object.keys(TELEGRAPHS)

export function telegraphById(id) {
  return TELEGRAPHS[id] ?? null
}

// Récompense d'un contre réussi : une faille ouverte, dégâts majorés le temps
// de quelques ticks. Elle doit être franche — sans elle, contrer serait
// seulement « éviter d'être puni », ce qui n'est pas une récompense.
export const BREACH_DMG_MULT = 1.6
export const BREACH_TICKS = 6

// Quelles annonces pour ce boss. DÉTERMINISTE : le joueur doit pouvoir
// apprendre un boss, pas subir un tirage. On dérive d'une graine stable (la
// zone) plutôt que du hasard.
//
// On ne retient QUE les annonces dont le contre est déjà débloqué. Sans ce
// filtre, un boss de zone 3 annonçait Rapine, dont le contre (Ferveur) n'ouvre
// qu'en zone 4 : une punition sans parade possible. Effet secondaire heureux —
// la scène s'enrichit au rythme des actifs, une annonce en zone 1, trois à
// partir de la zone 4.
export function telegraphsFor(zoneIndex = 1, zonesUnlocked = 99) {
  const dispo = TELEGRAPH_IDS.filter(id => isActiveUnlocked(TELEGRAPHS[id].counter, zonesUnlocked))
  if (!dispo.length) return []
  const start = Math.abs(Math.floor(zoneIndex)) % dispo.length
  const combien = Math.min(TELEGRAPH_THRESHOLDS.length, dispo.length)
  return Array.from({ length: combien }, (_, i) => dispo[(start + i) % dispo.length])
}

// Le contre est réussi si l'actif attendu est ACTIF à la résolution. On ne
// demande pas de l'avoir lancé pendant la fenêtre : un joueur qui l'avait déjà
// en cours a anticipé, ce qui doit compter comme une réussite.
export function isCountered(telegraphId, activeState = {}) {
  const t = TELEGRAPHS[telegraphId]
  if (!t) return false
  return !!activeState[t.counter]?.active
}

// Effets cumulés des annonces ratées. Contrat identique aux autres agrégateurs
// du projet : les points s'additionnent, les multiplicateurs se multiplient.
export function bossDebuffs(missed = []) {
  let armorPts = 0
  let dmgTakenMult = 1
  let goldMult = 1
  let critMult = 1
  for (const id of missed) {
    const m = TELEGRAPHS[id]?.malus
    if (!m) continue
    if (m.armorPts) armorPts += m.armorPts
    if (m.dmgTakenMult != null) dmgTakenMult *= m.dmgTakenMult
    if (m.goldMult != null) goldMult *= m.goldMult
    if (m.critMult != null) critMult *= m.critMult
  }
  return { armorPts, dmgTakenMult, goldMult, critMult }
}

// Bornes : trois annonces toutes ratées ne doivent pas rendre un boss
// infranchissable — sinon on a réintroduit la défaite par la porte de service.
export const WORST_CASE_DMG_FLOOR = 0.2
