// Succès — 200+ jalons, chacun porteur d'une rareté et d'un multiplicateur léger.
//
// Deux partis pris structurants :
//
// 1. GÉNÉRÉS PAR FAMILLES, pas écrits un par un. Deux cents entrées à la main
//    dérivent au premier changement d'équilibrage. Une famille déclare un
//    compteur, une échelle de paliers et une stat ; les succès en tombent. On
//    ajoute un palier, pas une ligne de catalogue.
//
// 2. PRÉDICATS PURS sur un instantané d'état. Aucun compteur parallèle propre
//    aux succès : ils lisent ce que le jeu tient déjà. Seuls les ids obtenus
//    sont persistés.
//
// Les multiplicateurs sont VOLONTAIREMENT minuscules (×1,002 à ×1,02). Deux
// cents bonus qui s'empilent, même petits, déplacent la courbe : le total est
// borné par un test et mesuré au simulateur, pas laissé à l'intuition.

// Raretés : on prolonge l'échelle des reliques (commun / rare / légendaire)
// d'un cran, parce que 200 succès demandent plus de granularité au sommet que
// 24 reliques.
export const ACHIEVEMENT_RARITIES = {
  commun:     { label: 'Commun',     color: '#9aa0a6', mult: 1.002 },
  rare:       { label: 'Rare',       color: '#4ea1ff', mult: 1.005 },
  legendaire: { label: 'Légendaire', color: '#d4af37', mult: 1.01 },
  mythique:   { label: 'Mythique',   color: '#b14cff', mult: 1.02 },
}

// Les quatre stats que les succès peuvent majorer — les mêmes que le Panthéon,
// pour que le joueur n'ait pas un cinquième vocabulaire à apprendre.
export const ACHIEVEMENT_STATS = ['dmgMult', 'goldMult', 'relicMult', 'gloireMult']

// Rareté déduite de la position dans la famille : les premiers paliers sont
// communs, le dernier tiers est légendaire, l'ultime est mythique.
function rarityAt(index, total) {
  const r = index / Math.max(1, total - 1)
  if (index === total - 1 && total >= 8) return 'mythique'
  if (r >= 0.66) return 'legendaire'
  if (r >= 0.33) return 'rare'
  return 'commun'
}

// Une famille = un compteur, une échelle, une stat. `read` extrait la valeur de
// l'instantané ; `label` compose l'intitulé du palier.
function family({ prefix, sprite, stat, read, label, desc, thresholds }) {
  return thresholds.map((n, i) => ({
    id: `${prefix}-${n}`,
    sprite,
    name: label(n),
    desc: desc(n),
    rarity: rarityAt(i, thresholds.length),
    stat,
    test: s => read(s) >= n,
  }))
}

const fr = n => Math.floor(n).toLocaleString('fr-FR').replace(/ | /g, ' ')
const troop = (id, nom, sprite, thresholds) => family({
  prefix: `troupe-${id}`, sprite, stat: 'dmgMult',
  read: s => s.counts[id] ?? 0,
  label: n => `${nom} ×${fr(n)}`,
  desc: n => `Avoir ${fr(n)} ${nom.toLowerCase()}s en même temps`,
  thresholds,
})

const TROOP_STEPS = [10, 50, 150, 400, 1000, 2500, 6000, 15000]

// --- Les familles ------------------------------------------------------------
const FAMILIES = [
  ...troop('paysan', 'Paysan', '🌾', TROOP_STEPS),
  ...troop('soldat', 'Soldat', '⚔️', TROOP_STEPS),
  ...troop('chevalier', 'Chevalier', '🐎', TROOP_STEPS),
  ...troop('champion', 'Champion', '🛡️', TROOP_STEPS),

  ...family({
    prefix: 'profondeur', sprite: '🗺️', stat: 'dmgMult',
    read: s => s.deepestEver,
    label: n => `Zone ${n}`,
    desc: n => `Atteindre la zone ${n}`,
    thresholds: [2, 3, 5, 7, 10, 13, 16, 20, 25, 30, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300],
  }),
  ...family({
    prefix: 'boss', sprite: '💀', stat: 'dmgMult',
    read: s => s.bossKills,
    label: n => `${fr(n)} boss`,
    desc: n => `Terrasser ${fr(n)} boss`,
    thresholds: [1, 5, 20, 60, 150, 400, 1000, 2500, 6000, 15000, 40000, 100000],
  }),
  ...family({
    prefix: 'vagues', sprite: '🌊', stat: 'goldMult',
    read: s => s.wavesTotal,
    label: n => `${fr(n)} vagues`,
    desc: n => `Vaincre ${fr(n)} vagues au total`,
    thresholds: [25, 100, 400, 1200, 4000, 12000, 35000, 100000, 300000, 1e6, 3e6, 1e7],
  }),
  ...family({
    prefix: 'crit', sprite: '💥', stat: 'dmgMult',
    read: s => s.critCount,
    label: n => `${fr(n)} critiques`,
    desc: n => `Placer ${fr(n)} coups critiques`,
    thresholds: [10, 100, 500, 2000, 8000, 25000, 80000, 250000, 750000, 2e6, 6e6, 2e7],
  }),
  ...family({
    prefix: 'actifs', sprite: '📯', stat: 'dmgMult',
    read: s => s.activesCast,
    label: n => `${fr(n)} invocations`,
    desc: n => `Déclencher ${fr(n)} actifs`,
    thresholds: [5, 25, 100, 400, 1200, 3500, 10000, 30000, 90000, 250000, 700000, 2e6],
  }),

  ...family({
    prefix: 'reliques', sprite: '💎', stat: 'relicMult',
    read: s => s.relicsFound,
    label: n => `${fr(n)} reliques`,
    desc: n => `Trouver ${fr(n)} reliques`,
    thresholds: [1, 5, 20, 60, 150, 400, 1000, 2500, 6000, 15000, 40000, 100000],
  }),
  ...family({
    prefix: 'legendaires', sprite: '🌟', stat: 'relicMult',
    read: s => s.legendaryFound,
    label: n => `${fr(n)} légendaires`,
    desc: n => `Trouver ${fr(n)} reliques légendaires`,
    thresholds: [1, 5, 20, 60, 150, 400, 1000, 3000],
  }),
  ...family({
    prefix: 'forge', sprite: '🔨', stat: 'relicMult',
    read: s => s.forgeCount,
    label: n => `${fr(n)} forges`,
    desc: n => `Forger ${fr(n)} fois une relique`,
    thresholds: [1, 5, 20, 60, 150, 400, 1000, 3000],
  }),
  ...family({
    prefix: 'fusion', sprite: '⚗️', stat: 'relicMult',
    read: s => s.fuseCount,
    label: n => `${fr(n)} fusions`,
    desc: n => `Fusionner ${fr(n)} fois des reliques`,
    thresholds: [1, 5, 20, 60, 150, 400, 1000, 3000],
  }),

  ...family({
    prefix: 'or', sprite: '🪙', stat: 'goldMult',
    read: s => s.goldTotal,
    label: n => `${fr(n)} or amassés`,
    desc: n => `Amasser ${fr(n)} or au total`,
    thresholds: [1000, 25000, 5e5, 1e7, 2e8, 5e9, 1e11, 2e12, 5e13, 1e15, 2e16, 5e17, 1e19, 1e21],
  }),

  ...family({
    prefix: 'croisade', sprite: '⚔', stat: 'gloireMult',
    read: s => s.prestigeCount,
    label: n => `${fr(n)} Croisades`,
    desc: n => `Partir en Croisade ${fr(n)} fois`,
    thresholds: [1, 3, 10, 25, 60, 150, 350, 800, 2000, 5000, 12000, 30000],
  }),
  ...family({
    prefix: 'legende', sprite: '✨', stat: 'gloireMult',
    read: s => s.legendeCount,
    label: n => `${fr(n)} Légendes`,
    desc: n => `Entrer dans la Légende ${fr(n)} fois`,
    thresholds: [1, 3, 8, 20, 50, 120, 300, 750, 2000, 5000],
  }),
  ...family({
    prefix: 'arbre', sprite: '🏰', stat: 'gloireMult',
    read: s => s.treeNodes,
    label: n => `${fr(n)} nœuds`,
    desc: n => `Posséder ${fr(n)} nœuds de l'Arbre en même temps`,
    thresholds: [1, 5, 12, 22, 32, 42, 48, 50],
  }),
  ...family({
    prefix: 'pantheon', sprite: '🗿', stat: 'gloireMult',
    read: s => s.pantheonSpent,
    label: n => `${fr(n)} points de Légende`,
    desc: n => `Placer ${fr(n)} points dans le Panthéon`,
    thresholds: [1, 10, 40, 120, 350, 1000, 3000, 9000, 27000, 80000],
  }),
  ...family({
    prefix: 'ameliorations', sprite: '⚒', stat: 'goldMult',
    read: s => s.upgradeLevels,
    label: n => `${fr(n)} améliorations`,
    desc: n => `Acheter ${fr(n)} niveaux d'amélioration de troupe`,
    thresholds: [1, 5, 15, 35, 70, 130, 220, 350],
  }),
]

// --- Succès uniques ----------------------------------------------------------
// Ceux qui ne sont pas un palier sur une échelle : ils récompensent un ÉTAT
// particulier, pas une quantité.
const UNIQUES = [
  { id: 'armee-complete', sprite: '🎖️', name: 'Armée complète', rarity: 'rare', stat: 'dmgMult',
    desc: 'Avoir les quatre tiers de troupe en même temps',
    test: s => ['paysan', 'soldat', 'chevalier', 'champion'].every(t => (s.counts[t] ?? 0) > 0) },
  { id: 'quatre-slots', sprite: '🧿', name: 'Paré pour la guerre', rarity: 'commun', stat: 'relicMult',
    desc: 'Avoir les quatre slots de reliques équipés',
    test: s => s.equippedCount >= 4 },
  { id: 'relique-max', sprite: '⚒️', name: 'Chef-d\'œuvre', rarity: 'legendaire', stat: 'relicMult',
    desc: 'Forger une relique au niveau maximum',
    test: s => s.maxForged >= 1 },
  { id: 'arbre-complet', sprite: '👑', name: 'Grand Œuvre', rarity: 'mythique', stat: 'gloireMult',
    desc: 'Acheter l\'Arbre de Gloire en entier',
    test: s => s.treeNodes >= 50 },
  { id: 'panthéon-equilibre', sprite: '⚖️', name: 'Équilibriste', rarity: 'legendaire', stat: 'gloireMult',
    desc: 'Avoir au moins 10 niveaux dans chacune des quatre voies du Panthéon',
    test: s => s.pantheonMin >= 10 },
  { id: 'panthéon-focus', sprite: '🎯', name: 'Monomaniaque', rarity: 'legendaire', stat: 'dmgMult',
    desc: 'Avoir 100 niveaux dans une seule voie du Panthéon',
    test: s => s.pantheonMax >= 100 },
  { id: 'tous-biomes', sprite: '🌍', name: 'Grand Voyageur', rarity: 'mythique', stat: 'goldMult',
    desc: 'Avoir joué les cinq biomes',
    test: s => s.biomesSeen >= 5 },
  { id: 'neant', sprite: '🕳️', name: 'Les mains vides', rarity: 'legendaire', stat: 'goldMult',
    desc: 'Partir en Croisade depuis le Néant',
    test: s => s.neantCrusades >= 1 },
  { id: 'sans-arbre', sprite: '🌱', name: 'À la loyale', rarity: 'legendaire', stat: 'dmgMult',
    desc: 'Atteindre la zone 10 sans aucun nœud d\'Arbre',
    test: s => s.deepestNoTree >= 10 },
]

export const ACHIEVEMENTS = [...FAMILIES, ...UNIQUES]

const byId = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]))

export function achievementById(id) {
  return byId[id] ?? null
}

// Instantané par défaut : un champ absent ne débloque rien et ne plante rien.
const EMPTY = {
  counts: {}, deepestEver: 0, bossKills: 0, wavesTotal: 0, critCount: 0, activesCast: 0,
  relicsFound: 0, legendaryFound: 0, forgeCount: 0, fuseCount: 0, maxForged: 0,
  equippedCount: 0, goldTotal: 0, prestigeCount: 0, legendeCount: 0, treeNodes: 0,
  pantheonSpent: 0, pantheonMin: 0, pantheonMax: 0, biomesSeen: 0, neantCrusades: 0,
  upgradeLevels: 0,
  deepestNoTree: 0,
}

export function newlyUnlocked(snapshot = {}, already = []) {
  const s = { ...EMPTY, ...snapshot, counts: { ...EMPTY.counts, ...(snapshot?.counts ?? {}) } }
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

// Effets agrégés. Multiplicatifs, comme tout le reste du jeu.
export function achievementEffects(already = []) {
  const out = { dmgMult: 1, goldMult: 1, relicMult: 1, gloireMult: 1 }
  for (const id of already) {
    const a = byId[id]
    if (!a) continue
    out[a.stat] *= ACHIEVEMENT_RARITIES[a.rarity].mult
  }
  return out
}

export function progress(already = []) {
  const owned = new Set(already.filter(id => byId[id]))
  return { done: owned.size, total: ACHIEVEMENTS.length }
}

export function sanitizeAchievements(raw) {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter(id => typeof id === 'string' && byId[id]))]
}
