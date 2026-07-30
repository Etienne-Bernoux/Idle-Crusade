// Le Conseil du retour — l'absence produit des décisions, pas un tas d'or.
//
// Constat de l'idéation : « rythme et retour » est l'axe le plus vide du jeu.
// Revenir, aujourd'hui, c'est regarder un nombre plus grand. Et le levier
// classique du genre — plus de bonus hors-ligne — ne crée aucune raison de
// revenir MAINTENANT plutôt que demain.
//
// Cadrage important : le projet exclut délibérément la progression hors-ligne
// (« pas d'offline-progress : voulu », App.svelte). On ne la réintroduit PAS.
// Ce qui attend au retour, ce sont des **arbitrages** — des situations
// rencontrées pendant l'absence, dont il faut décider. On ne gagne rien en
// dormant ; on a seulement des choix à faire au réveil.
//
// Deux garde-fous de design :
//   • les cartes n'interrompent jamais la boucle — elles attendent, le combat
//     continue. Punir l'absence serait absurde dans un idle ;
//   • aucune option ne doit être toujours meilleure. Chaque carte échange DEUX
//     monnaies différentes, et laquelle vaut le plus dépend de la situation :
//     on veut de l'or quand on pousse, de la Gloire quand on part en Croisade.

export const ABSENCE_MIN_MS = 20 * 60 * 1000          // en deçà, on n'a pas « été absent »
export const ABSENCE_PAR_CARTE_MS = 90 * 60 * 1000    // une carte par tranche de 1 h 30
export const CARTES_MAX = 3                            // au-delà, c'est une corvée
export const EXPIRATION_MS = 24 * 60 * 60 * 1000       // la raison de revenir aujourd'hui

// Chaque carte échange deux monnaies distinctes. `a` et `b` décrivent l'option ;
// le montant est calculé au moment de l'affichage, depuis l'état courant.
export const CARTES = {
  prisonnier: {
    id: 'prisonnier', sprite: '⛓️', titre: 'Un prisonnier',
    texte: 'Tes hommes ont capturé un noble en maraude.',
    a: { sprite: '🪙', label: 'Rançon', gain: 'gold' },
    b: { sprite: '⚔', label: 'Exécution', gain: 'gloire' },
  },
  chapelle: {
    id: 'chapelle', sprite: '⛪', titre: 'Une chapelle en ruine',
    texte: 'Elle a été pillée avant toi. Il reste quelque chose.',
    a: { sprite: '💎', label: 'Fouiller', gain: 'relique' },
    b: { sprite: '🪙', label: 'Récupérer la ferraille', gain: 'gold' },
  },
  deserteur: {
    id: 'deserteur', sprite: '🏃', titre: 'Un déserteur',
    texte: 'Il a fui la ligne pendant la nuit, et il a été rattrapé.',
    a: { sprite: '⚔', label: 'Faire un exemple', gain: 'gloire' },
    b: { sprite: '🌾', label: 'Le renvoyer au rang', gain: 'paysans' },
  },
}

export const CARTE_IDS = Object.keys(CARTES)

export function carteById(id) {
  return CARTES[id] ?? null
}

// Combien de cartes une absence produit. Bornée : trois arbitrages est une
// pause agréable, dix est une corvée administrative.
export function nombreDeCartes(absenceMs) {
  if (!(absenceMs >= ABSENCE_MIN_MS)) return 0
  return Math.min(CARTES_MAX, Math.floor(absenceMs / ABSENCE_PAR_CARTE_MS) + 1)
}

// Tirage sans doublon : deux prisonniers d'affilée donneraient l'impression
// d'un distributeur, pas d'un conseil.
export function tirerCartes(absenceMs, rng = Math.random, now = 0) {
  const n = nombreDeCartes(absenceMs)
  const pool = [...CARTE_IDS]
  const out = []
  for (let i = 0; i < n && pool.length; i++) {
    const [id] = pool.splice(Math.floor(rng() * pool.length), 1)
    out.push({ id, expiresAt: now + EXPIRATION_MS })
  }
  return out
}

// Montants, calculés depuis l'état courant pour que la carte reste pertinente
// à tout moment de la partie. `ctx.zoneGold` est l'or d'une cible de la zone
// courante : c'est l'unité de valeur qui suit la progression.
export function montants(carteId, ctx = {}) {
  const zoneGold = Math.max(1, Math.floor(ctx.zoneGold ?? 1))
  const gloire = Math.max(1, Math.floor(ctx.pendingGloire ?? 0))
  const paysans = Math.max(0, Math.floor(ctx.paysans ?? 0))
  switch (carteId) {
    // Calibrage : une carte doit peser quelques minutes de jeu, pas un palier.
    // La première version donnait 60 vagues de revenu — soit cinq zones
    // entières à cette profondeur, et la fortune du joueur multipliée par
    // plusieurs milliers. Un arbitrage devenait un distributeur.
    case 'prisonnier':
      return { a: { gold: zoneGold * 15 }, b: { gloire: Math.max(1, Math.round(gloire * 0.2)) } }
    case 'chapelle':
      return { a: { relique: 1 }, b: { gold: zoneGold * 30 } }
    case 'deserteur':
      return { a: { gloire: Math.max(1, Math.round(gloire * 0.15)) },
               b: { paysans: Math.max(10, Math.round(paysans * 0.25)) } }
    default:
      return { a: {}, b: {} }
  }
}

export function estExpiree(carte, now) {
  return !carte || !(carte.expiresAt > now)
}

// Nettoie ce qui vient d'une save : ids inconnus, cartes périmées, doublons.
export function sanitizeConseil(raw, now = 0) {
  if (!Array.isArray(raw)) return []
  const vus = new Set()
  return raw
    .filter(c => c && CARTES[c.id] && Number.isFinite(c.expiresAt))
    .filter(c => !estExpiree(c, now))
    .filter(c => (vus.has(c.id) ? false : (vus.add(c.id), true)))
    .slice(0, CARTES_MAX)
}
