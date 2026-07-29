// Succès — jalons de progression.
//
// Un succès est une PRÉDICATION PURE sur un instantané de l'état : pas de
// compteur parallèle à maintenir, donc rien qui puisse dériver de la réalité du
// jeu. Le seul état persisté est la liste des ids déjà obtenus.
//
// Volontairement sans récompense pour l'instant : les en doter en ferait un
// système de progression de plus, à équilibrer contre l'Arbre et le Panthéon.
// C'est une piste ouverte, pas un oubli.

export const ACHIEVEMENTS = [
  // Premiers pas — ils doivent tomber vite, sinon le système reste invisible.
  { id: 'premier-sang', sprite: '🩸', name: 'Premier sang', desc: 'Battre un premier boss', test: s => s.bossKills >= 1 },
  { id: 'petite-troupe', sprite: '🌾', name: 'Petite troupe', desc: 'Recruter 50 paysans', test: s => (s.counts.paysan ?? 0) >= 50 },
  { id: 'premiere-relique', sprite: '💎', name: 'Chineur', desc: 'Trouver une relique', test: s => s.relicsFound >= 1 },

  // Armée
  { id: 'marée-humaine', sprite: '🌊', name: 'Marée humaine', desc: 'Recruter 500 paysans', test: s => (s.counts.paysan ?? 0) >= 500 },
  { id: 'discipline', sprite: '⚔️', name: 'Discipline', desc: 'Recruter 250 soldats', test: s => (s.counts.soldat ?? 0) >= 250 },
  { id: 'cavalerie', sprite: '🐎', name: 'Cavalerie', desc: 'Recruter 40 chevaliers', test: s => (s.counts.chevalier ?? 0) >= 40 },
  { id: 'garde-royale', sprite: '🛡️', name: 'Garde royale', desc: 'Recruter 12 champions', test: s => (s.counts.champion ?? 0) >= 12 },
  { id: 'armée-mêlée', sprite: '🎖️', name: 'Armée composée', desc: 'Avoir les quatre tiers en même temps',
    test: s => ['paysan', 'soldat', 'chevalier', 'champion'].every(t => (s.counts[t] ?? 0) > 0) },

  // Profondeur
  { id: 'enfer', sprite: '🔥', name: 'Jusqu\'en Enfer', desc: 'Atteindre la zone 5', test: s => s.deepestEver >= 5 },
  { id: 'plus-loin', sprite: '🗺️', name: 'Toujours plus loin', desc: 'Atteindre la zone 10', test: s => s.deepestEver >= 10 },
  { id: 'abysses', sprite: '🕳️', name: 'Abysses', desc: 'Atteindre la zone 20', test: s => s.deepestEver >= 20 },
  { id: 'sans-fin', sprite: '♾️', name: 'Sans fin', desc: 'Atteindre la zone 40', test: s => s.deepestEver >= 40 },

  // Butin
  { id: 'collectionneur', sprite: '🏺', name: 'Collectionneur', desc: 'Trouver 25 reliques', test: s => s.relicsFound >= 25 },
  { id: 'legendaire', sprite: '🌟', name: 'Élu du sort', desc: 'Trouver une relique légendaire', test: s => s.legendaryFound >= 1 },
  { id: 'forgeron', sprite: '🔨', name: 'Forgeron', desc: 'Forger une relique au niveau max', test: s => s.maxForged >= 1 },
  { id: 'riche', sprite: '🪙', name: 'Trésor de guerre', desc: 'Posséder 1 million d\'or', test: s => s.gold >= 1e6 },

  // Prestige
  { id: 'premiere-croisade', sprite: '⚔', name: 'Première Croisade', desc: 'Partir en Croisade', test: s => s.prestigeCount >= 1 },
  { id: 'croise', sprite: '🏆', name: 'Croisé', desc: 'Partir en Croisade 10 fois', test: s => s.prestigeCount >= 10 },
  { id: 'arbre-complet', sprite: '🏰', name: 'Grand Œuvre', desc: 'Acheter 40 nœuds de l\'Arbre', test: s => s.treeNodes >= 40 },
  { id: 'premiere-legende', sprite: '✨', name: 'Entrer dans la Légende', desc: 'Entrer dans la Légende', test: s => s.legendeCount >= 1 },
  { id: 'pantheon', sprite: '🗿', name: 'Panthéon', desc: 'Placer 50 points de Légende', test: s => s.pantheonSpent >= 50 },
]

const byId = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]))

export function achievementById(id) {
  return byId[id] ?? null
}

// Instantané par défaut : un champ absent ne doit jamais faire planter un test,
// ni débloquer un succès par accident.
const EMPTY = {
  counts: {}, deepestEver: 0, bossKills: 0, relicsFound: 0, legendaryFound: 0,
  maxForged: 0, gold: 0, prestigeCount: 0, legendeCount: 0, treeNodes: 0, pantheonSpent: 0,
}

// Renvoie les ids NOUVELLEMENT obtenus, dans l'ordre du catalogue. L'appelant
// décide quoi en faire (toast, son) et les ajoute à sa liste.
export function newlyUnlocked(snapshot = {}, already = []) {
  const s = { ...EMPTY, ...snapshot, counts: { ...EMPTY.counts, ...(snapshot.counts ?? {}) } }
  const owned = new Set(already)
  const out = []
  for (const a of ACHIEVEMENTS) {
    if (owned.has(a.id)) continue
    let ok = false
    try { ok = !!a.test(s) } catch (_) { ok = false }
    if (ok) out.push(a.id)
  }
  return out
}

export function progress(already = []) {
  const owned = new Set(already.filter(id => byId[id]))
  return { done: owned.size, total: ACHIEVEMENTS.length }
}

// Nettoie une liste venue d'une save : ids inconnus retirés, doublons écrasés.
export function sanitizeAchievements(raw) {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter(id => typeof id === 'string' && byId[id]))]
}
