// Arbre de Gloire : 4 branches de 10 nœuds, dépensées en Points de Gloire après
// une Croisade. Logique pure — l'UI ne stocke que la liste des nœuds possédés.
//
// Structure : chaque branche est une CHAÎNE. Le nœud de profondeur N exige le
// nœud N-1 de la même branche, rien d'autre. Le choix du joueur n'est donc pas
// « quel nœud » mais « quelle branche je pousse en premier », ce qui reste
// lisible pour un enfant de 5 ans tout en offrant 40 paliers de progression.
//
// Coûts : même barème pour les 4 branches (voir TIER_COSTS), pour que comparer
// deux branches ne demande aucun calcul mental.

export const BRANCHES = [
  { id: 'guerre',   name: 'Guerre',   sprite: '⚔',  color: '#c41e3a', desc: 'Frapper plus fort' },
  { id: 'fortune',  name: 'Fortune',  sprite: '🪙', color: '#d4af37', desc: 'Gagner plus d\'or' },
  { id: 'reliques', name: 'Reliques', sprite: '💎', color: '#4ea1ff', desc: 'Meilleur butin' },
  { id: 'croisade', name: 'Croisade', sprite: '🏆', color: '#b87333', desc: 'Prestiges plus rentables' },
]

// Barème par profondeur. Le coût double presque à chaque palier : la branche
// qu'on pousse à fond coûte autant que les trois autres réunies au même niveau.
export const TIER_COSTS = [5, 12, 25, 45, 75, 120, 190, 300, 480, 750]

export const MAX_TIER = TIER_COSTS.length

// Un nœud : { id, branch, tier, name, desc, effect }.
// `effect` est agrégé par treeEffects() ; `keystone` = palier marquant (UI).
const NODES = [
  // ---------- ⚔ GUERRE ----------
  ['guerre', 1,  'Fureur I',           '+15% dégâts',                        { dmgPct: 15 }],
  ['guerre', 2,  'Lame Affûtée',       '+20% dégâts',                        { dmgPct: 20 }],
  ['guerre', 3,  'Cor de Guerre',      'Cri de Guerre : +50% de durée',      { warCryPct: 50 }],
  ['guerre', 4,  'Fureur II',          '+30% dégâts',                        { dmgPct: 30 }],
  ['guerre', 5,  'Discipline de Fer',  '−15% cooldown des actifs',           { cooldownPct: 15 }],
  ['guerre', 6,  'Serment du Champion', 'Débloque le tier Champion',         { unlockChampion: true }, true],
  ['guerre', 7,  'Fureur III',         '+50% dégâts',                        { dmgPct: 50 }],
  ['guerre', 8,  'Souffle du Dragon',  '−25% cooldown des actifs',           { cooldownPct: 25 }],
  ['guerre', 9,  'Fureur IV',          '+75% dégâts',                        { dmgPct: 75 }],
  ['guerre', 10, 'Croisade Sanglante', 'Dégâts ×2',                          { dmgMult: 2 }, true],

  // ---------- 🪙 FORTUNE ----------
  ['fortune', 1,  'Butin I',          "+15% d'or",                           { goldPct: 15 }],
  ['fortune', 2,  'Intendance I',     '−5% coût de recrutement',             { costPct: 5 }],
  ['fortune', 3,  'Butin II',         "+25% d'or",                           { goldPct: 25 }],
  ['fortune', 4,  'Pillage',          "+35% d'or",                           { goldPct: 35 }],
  ['fortune', 5,  'Intendance II',    '−10% coût de recrutement',            { costPct: 10 }],
  ['fortune', 6,  'Forge Rentable',   '+100% or de la fonte de reliques',    { meltPct: 100 }, true],
  ['fortune', 7,  'Butin III',        "+50% d'or",                           { goldPct: 50 }],
  ['fortune', 8,  'Intendance III',   '−15% coût de recrutement',            { costPct: 15 }],
  ['fortune', 9,  'Trésor de Guerre', '5 000 or au début de chaque run',     { startGold: 5000 }, true],
  ['fortune', 10, 'Avarice',          'Or ×2',                               { goldMult: 2 }, true],

  // ---------- 💎 RELIQUES ----------
  ['reliques', 1,  'Fortune I',       'Reliques rares plus fréquentes',      { qualityLevel: 1 }],
  ['reliques', 2,  'Sacoche',         '+10 places de reliques',              { invCap: 10 }],
  ['reliques', 3,  'Bénédiction I',   '+25% aux effets des reliques',        { relicPct: 25 }],
  ['reliques', 4,  'Fortune II',      'Reliques rares plus fréquentes',      { qualityLevel: 1 }],
  ['reliques', 5,  'Sacoche II',      '+20 places de reliques',              { invCap: 20 }],
  ['reliques', 6,  'Reliquaire',      '+50% aux effets des reliques',        { relicPct: 50 }, true],
  ['reliques', 7,  'Fortune III',     'Reliques rares plus fréquentes',      { qualityLevel: 1 }],
  ['reliques', 8,  'Fonte Sacrée',    '+150% or de la fonte',                { meltPct: 150 }],
  ['reliques', 9,  'Bénédiction II',  '+75% aux effets des reliques',        { relicPct: 75 }],
  ['reliques', 10, 'Élu du Ciel',     'Effets des reliques ×2',              { relicMult: 2 }, true],

  // ---------- 🏆 CROISADE ----------
  ['croisade', 1,  'Gloire I',            '+10% de Gloire gagnée',           { gloirePct: 10 }],
  ['croisade', 2,  'Départ Armé',         '10 paysans au début de chaque run', { startTroops: 10 }, true],
  ['croisade', 3,  'Gloire II',           '+20% de Gloire gagnée',           { gloirePct: 20 }],
  ['croisade', 4,  'Garnison',            '+40 paysans au début de run',     { startTroops: 40 }, true],
  ['croisade', 5,  'Gloire III',          '+30% de Gloire gagnée',           { gloirePct: 30 }],
  ['croisade', 6,  'Héritage',            '+25 paysans au début de run',     { startTroops: 25 }],
  ['croisade', 7,  'Gloire IV',           '+50% de Gloire gagnée',           { gloirePct: 50 }],
  ['croisade', 8,  'Armée Permanente',    '+150 paysans au début de run',    { startTroops: 150 }, true],
  ['croisade', 9,  'Gloire V',            '+75% de Gloire gagnée',           { gloirePct: 75 }],
  ['croisade', 10, 'Légende',             'Gloire ×2',                       { gloireMult: 2 }, true],
]

export const TREE = NODES.map(([branch, tier, name, desc, effect, keystone = false]) => ({
  id: `${branch}-${tier}`,
  branch,
  tier,
  name,
  desc,
  effect,
  keystone,
  cost: TIER_COSTS[tier - 1],
}))

const byNodeId = TREE.reduce((acc, n) => ({ ...acc, [n.id]: n }), {})

export function nodeById(id) {
  return byNodeId[id] ?? null
}

export function branchNodes(branchId) {
  return TREE.filter(n => n.branch === branchId).sort((a, b) => a.tier - b.tier)
}

// Le nœud de profondeur N exige celui de profondeur N-1 de sa branche.
export function requirementOf(id) {
  const node = byNodeId[id]
  if (!node || node.tier === 1) return null
  return `${node.branch}-${node.tier - 1}`
}

export function isUnlockable(id, owned) {
  const node = byNodeId[id]
  if (!node) return false
  if (owned.includes(id)) return false
  const req = requirementOf(id)
  return req === null || owned.includes(req)
}

// Achat pur : renvoie { gloire, owned } ou null si impossible (prérequis manquant,
// déjà pris, Gloire insuffisante). null plutôt qu'un throw : l'UI grise déjà le
// nœud, un clic passé entre deux renders ne doit pas casser le jeu.
export function buyNode(id, owned, gloire) {
  if (!isUnlockable(id, owned)) return null
  const node = byNodeId[id]
  if (gloire < node.cost) return null
  return { gloire: gloire - node.cost, owned: [...owned, id] }
}

export function totalSpent(owned) {
  return owned.reduce((sum, id) => sum + (byNodeId[id]?.cost ?? 0), 0)
}

// Coût pour amener une branche jusqu'à `tier` inclus (aide à l'équilibrage).
export function branchCostUpTo(tier) {
  return TIER_COSTS.slice(0, tier).reduce((a, b) => a + b, 0)
}

// Agrégation. Les `*Pct` s'additionnent (ce sont des paliers d'une même idée),
// les `*Mult` se multiplient (ce sont les keystones), et les deux se composent.
// Contrat volontairement identique à l'ancien metaEffects() : App.svelte n'a
// qu'un objet de multiplicateurs à consommer.
export function treeEffects(owned = []) {
  const sum = (key) => owned.reduce((s, id) => s + (byNodeId[id]?.effect[key] ?? 0), 0)
  const mult = (key) => owned.reduce((m, id) => m * (byNodeId[id]?.effect[key] ?? 1), 1)
  const has = (key) => owned.some(id => byNodeId[id]?.effect[key] === true)

  return {
    dmgMult: (1 + sum('dmgPct') / 100) * mult('dmgMult'),
    goldMult: (1 + sum('goldPct') / 100) * mult('goldMult'),
    // Plancher à 25% du prix : même arbre complet, recruter doit coûter quelque chose.
    costMult: Math.max(0.25, 1 - sum('costPct') / 100),
    cooldownMult: Math.max(0.25, 1 - sum('cooldownPct') / 100),
    warCryDurationMult: 1 + sum('warCryPct') / 100,
    qualityLevel: sum('qualityLevel'),
    relicEffectMult: (1 + sum('relicPct') / 100) * mult('relicMult'),
    meltMult: 1 + sum('meltPct') / 100,
    gloireMult: (1 + sum('gloirePct') / 100) * mult('gloireMult'),
    invCapBonus: sum('invCap'),
    // Cumulatifs : 10 + 40 + 25 + 150 = 225 paysans avec la branche complète.
    // On offre des paysans et pas une zone avancée : mesuré au simulateur, un
    // départ en zone 3 RALLONGE le run (mobs à 3000 PV sans les revenus des
    // zones sautées). Une grosse garnison fait retraverser le début vite, en
    // récoltant l'or au passage.
    startTroops: sum('startTroops'),
    startGold: sum('startGold'),
    championUnlocked: has('unlockChampion'),
  }
}

// --- Migration depuis l'ancienne Forge (6 upgrades à niveaux, save v1) ---
//
// On rembourse en Gloire ce que le joueur avait dépensé (respec offert) plutôt
// que de bricoler une équivalence nœud par nœud. Exception : si le Champion
// était débloqué, on ACCORDE la branche Guerre jusqu'au Serment — sinon la
// migration retirerait un tier de troupe déjà acquis, ce qui serait une
// régression pour le joueur.
const LEGACY_COSTS = { fureur: 5, butin: 5, intendance: 8, discipline: 12, fortune: 15, champion: 50 }
const CHAMPION_NODE = 'guerre-6'

export function migrateFromMetaLevels(metaLevels = {}, gloire = 0) {
  let refund = 0
  for (const [id, base] of Object.entries(LEGACY_COSTS)) {
    const level = metaLevels[id] ?? 0
    for (let l = 0; l < level; l++) refund += base * Math.pow(l + 1, 2)
  }
  const owned = []
  if ((metaLevels.champion ?? 0) > 0) {
    // Le Serment et toute sa chaîne de prérequis, pour ne pas casser l'invariant.
    const championTier = byNodeId[CHAMPION_NODE].tier
    for (let t = 1; t <= championTier; t++) owned.push(`guerre-${t}`)
    refund -= LEGACY_COSTS.champion   // déjà « payé » sous forme de nœuds accordés
  }
  return { owned, gloire: gloire + Math.max(0, refund) }
}
