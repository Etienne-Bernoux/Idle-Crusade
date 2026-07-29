// Arbre de Gloire : un vrai graphe, pas quatre listes côte à côte.
//
// Topologie, de la racine à la couronne :
//
//                        [ COURONNE ]              exige les 4 apex
//                    /      |     |     \
//                [apex]  [apex] [apex] [apex]      un par branche
//                   |       |      |      |
//                [clé]    [clé]  [clé]  [clé]      exige les DEUX voies
//                 /  \     /  \   /  \   /  \
//               voie voie   …    …   …   …   …     2 voies de 4 nœuds
//                 \  /     \  /   \  /   \  /
//                [tronc]  [tronc][tronc][tronc]    2 nœuds
//                    \      |      |      /
//                        [ RACINE ]                point de départ commun
//
// Ce qui en fait un arbre et plus une liste : un nœud peut avoir **plusieurs
// parents** (`requires`). Il y a donc de vraies fourches (le tronc se divise en
// deux voies aux effets différents) et de vraies convergences (la clé de voûte
// exige les deux voies, la couronne exige les quatre branches).
//
// 10 paliers de profondeur, 50 nœuds.

export const BRANCHES = [
  { id: 'guerre',   name: 'Guerre',   sprite: '⚔',  color: '#c41e3a', desc: 'Frapper plus fort' },
  { id: 'fortune',  name: 'Fortune',  sprite: '🪙', color: '#d4af37', desc: "Gagner plus d'or" },
  { id: 'reliques', name: 'Reliques', sprite: '💎', color: '#4ea1ff', desc: 'Meilleur butin' },
  { id: 'croisade', name: 'Croisade', sprite: '🏆', color: '#b87333', desc: 'Prestiges plus rentables' },
]

// Barème par profondeur : la racine est presque offerte, la couronne se mérite.
export const TIER_COSTS = [5, 12, 25, 45, 75, 120, 190, 300, 480, 750]
export const MAX_DEPTH = TIER_COSTS.length - 1

// Grille de rendu : écartement des branches, et des deux voies autour de leur axe.
const BRANCH_X = [-3, -1, 1, 3]
const LIMB_SPREAD = 0.62

const ROOT = {
  id: 'racine',
  name: 'Vœu de Croisade',
  desc: '+10% dégâts',
  effect: { dmgPct: 10 },
  keystone: true,
}

// Le Champion est un tier de troupe, donc du contenu : il pend directement à la
// racine et reste accessible quelle que soit la spécialisation choisie. L'avoir
// mis en clé de voûte de la branche Guerre le rendait inatteignable pour trois
// joueurs sur quatre.
const CHAMPION = {
  id: 'champion',
  name: 'Serment du Champion',
  desc: 'Débloque le tier Champion',
  sprite: '🛡️',
  effect: { unlockChampion: true },
}

const CROWN = {
  id: 'couronne',
  name: 'Couronne de Croisade',
  desc: 'Dégâts ×1,5 et or ×1,5',
  effect: { dmgMult: 1.5, goldMult: 1.5 },
  keystone: true,
}

// Une branche = 2 nœuds de tronc, 2 voies de 4 nœuds, 1 clé de voûte, 1 apex.
// Les deux voies servent le même thème par des moyens différents : c'est là que
// le joueur choisit un style, et non seulement un ordre.
const BRANCH_SPECS = {
  guerre: {
    trunk: [
      { name: 'Fureur I', desc: '+15% dégâts', effect: { dmgPct: 15 } },
      { name: 'Fureur II', desc: '+20% dégâts', effect: { dmgPct: 20 } },
    ],
    limbs: [
      {
        id: 'lame', name: 'Voie de la Lame',
        nodes: [
          { name: 'Lame Affûtée', desc: '+25% dégâts', effect: { dmgPct: 25 } },
          { name: 'Rage du Berserk', desc: '+30% dégâts', effect: { dmgPct: 30 } },
          { name: 'Frappe Brutale', desc: '+40% dégâts', effect: { dmgPct: 40 } },
          { name: 'Fureur Ultime', desc: '+50% dégâts', effect: { dmgPct: 50 } },
        ],
      },
      {
        // La Voie du Cor est devenue la Voie de la Précision (US 25) : l'Arbre
        // n'avait AUCUN levier sur les critiques, alors qu'ils sont au cœur du
        // combat depuis US 22 et des rôles depuis US 24. Les cooldowns d'actifs
        // restent ici — c'est la voie « technique » de la branche Guerre.
        id: 'precision', name: 'Voie de la Précision',
        nodes: [
          { name: 'Précision', desc: '+5 pts de critique', effect: { critChancePts: 5 } },
          { name: 'Souffle Court', desc: '−15% cooldown des actifs', effect: { cooldownPct: 15 } },
          { name: 'Œil Aiguisé', desc: '+7 pts de critique', effect: { critChancePts: 7 } },
          { name: 'Coup Fatal', desc: '+1 au multiplicateur de critique', effect: { critMultBonus: 1 } },
        ],
      },
    ],
    caps: {
      lame: { name: 'Croisade Sanglante', desc: 'Dégâts ×2', effect: { dmgMult: 2 } },
      precision: { name: 'Coup de Grâce', desc: '+1 au multiplicateur de critique', effect: { critMultBonus: 1 } },
    },
  },

  fortune: {
    trunk: [
      { name: 'Butin I', desc: "+15% d'or", effect: { goldPct: 15 } },
      { name: 'Butin II', desc: "+20% d'or", effect: { goldPct: 20 } },
    ],
    limbs: [
      {
        id: 'pillage', name: 'Voie du Pillage',
        nodes: [
          { name: 'Razzia', desc: "+25% d'or", effect: { goldPct: 25 } },
          { name: 'Mise à Sac', desc: "+30% d'or", effect: { goldPct: 30 } },
          { name: 'Rançon', desc: "+40% d'or", effect: { goldPct: 40 } },
          { name: 'Or du Sang', desc: "+50% d'or", effect: { goldPct: 50 } },
        ],
      },
      {
        id: 'intendance', name: "Voie de l'Intendance",
        nodes: [
          { name: 'Intendance I', desc: '−5% coût de recrutement', effect: { costPct: 5 } },
          { name: 'Intendance II', desc: '−8% coût de recrutement', effect: { costPct: 8 } },
          { name: 'Forge Rentable', desc: '+100% or de la fonte', effect: { meltPct: 100 } },
          { name: 'Intendance III', desc: '−12% coût de recrutement', effect: { costPct: 12 } },
        ],
      },
    ],
    caps: {
      pillage: { name: 'Avarice', desc: 'Or ×2', effect: { goldMult: 2 } },
      intendance: { name: 'Trésor de Guerre', desc: '5 000 or au début de chaque run', effect: { startGold: 5000 } },
    },
  },

  reliques: {
    trunk: [
      // Effet de PREMIER ordre en tête de branche : mesuré, un tronc qui n'achetait
      // que des multiplicateurs sur les effets de reliques (+20% d'un bonus déjà
      // petit) laissait la branche 19% derrière Guerre à tous les horizons. Doubler
      // le butin agit sur la quantité, pas sur un pourcentage de pourcentage.
      { name: 'Aubaine', desc: '+1 relique par boss', effect: { relicDrops: 1 } },
      { name: 'Bénédiction I', desc: '+20% aux effets des reliques', effect: { relicPct: 20 } },
    ],
    limbs: [
      {
        id: 'chance', name: 'Voie de la Chance',
        nodes: [
          { name: 'Providence I', desc: 'Reliques rares plus fréquentes', effect: { qualityLevel: 1 } },
          { name: 'Bénédiction II', desc: '+25% aux effets des reliques', effect: { relicPct: 25 } },
          { name: 'Providence II', desc: 'Reliques rares plus fréquentes', effect: { qualityLevel: 1 } },
          { name: 'Main Chanceuse', desc: '+6 pts de critique', effect: { critChancePts: 6 } },
        ],
      },
      {
        id: 'reliquaire', name: 'Voie du Reliquaire',
        nodes: [
          { name: 'Sacoche', desc: '+10 places de reliques', effect: { invCap: 10 } },
          { name: 'Fonte Sacrée', desc: '+75% or de la fonte', effect: { meltPct: 75 } },
          { name: 'Grande Sacoche', desc: '+20 places de reliques', effect: { invCap: 20 } },
          { name: 'Onction', desc: '+25% aux effets des reliques', effect: { relicPct: 25 } },
        ],
      },
    ],
    caps: {
      chance: { name: 'Élu du Ciel', desc: 'Effets des reliques ×2', effect: { relicMult: 2 } },
      reliquaire: { name: 'Grand Reliquaire', desc: '+50% aux effets des reliques', effect: { relicPct: 50 } },
    },
  },

  croisade: {
    trunk: [
      { name: 'Gloire I', desc: '+10% de Gloire gagnée', effect: { gloirePct: 10 } },
      { name: 'Gloire II', desc: '+15% de Gloire gagnée', effect: { gloirePct: 15 } },
    ],
    limbs: [
      {
        id: 'gloire', name: 'Voie de la Gloire',
        nodes: [
          { name: 'Gloire III', desc: '+20% de Gloire gagnée', effect: { gloirePct: 20 } },
          { name: 'Gloire IV', desc: '+25% de Gloire gagnée', effect: { gloirePct: 25 } },
          { name: 'Gloire V', desc: '+30% de Gloire gagnée', effect: { gloirePct: 30 } },
          { name: 'Gloire VI', desc: '+40% de Gloire gagnée', effect: { gloirePct: 40 } },
        ],
      },
      {
        id: 'heritage', name: "Voie de l'Héritage",
        nodes: [
          { name: 'Départ Armé', desc: '10 paysans au début de run', effect: { startTroops: 10 } },
          { name: 'Garnison', desc: '+40 paysans au début de run', effect: { startTroops: 40 } },
          { name: 'Héritage', desc: '+25 paysans au début de run', effect: { startTroops: 25 } },
          { name: 'Armée Permanente', desc: '+150 paysans au début de run', effect: { startTroops: 150 } },
        ],
      },
    ],
    caps: {
      gloire: { name: 'Apothéose', desc: 'Gloire ×2', effect: { gloireMult: 2 } },
      heritage: { name: 'Armée de Légende', desc: '+200 paysans au début de run', effect: { startTroops: 200 } },
    },
  },
}

// --- Construction du graphe --------------------------------------------------
// Chaque nœud porte : id, branch, depth, x/y (grille de rendu), requires[], coût.

function buildTree() {
  const nodes = [{ ...ROOT, branch: null, depth: 0, x: 0, y: 0, requires: [], cost: TIER_COSTS[0] }]
  // Nœud commun : accessible depuis la racine, hors de toute spécialisation.
  nodes.push({ ...CHAMPION, branch: null, depth: 3, x: 0, y: 3, requires: [ROOT.id], cost: TIER_COSTS[3], keystone: true })

  BRANCHES.forEach((branch, i) => {
    const spec = BRANCH_SPECS[branch.id]
    const axis = BRANCH_X[i]

    const trunkIds = []
    spec.trunk.forEach((node, t) => {
      const id = `${branch.id}-tronc${t + 1}`
      nodes.push({
        ...node,
        id,
        branch: branch.id,
        depth: t + 1,
        x: axis * (t === 0 ? 0.6 : 1),
        y: t + 1,
        requires: t === 0 ? [ROOT.id] : [trunkIds[t - 1]],
        cost: TIER_COSTS[t + 1],
      })
      trunkIds.push(id)
    })

    // Fourche : deux voies parallèles qui ne se rejoignent PLUS. Chacune finit
    // sur sa propre clé de voûte — on part du centre et on s'enfonce, sans col
    // commun qui annulerait la spécialisation au dernier palier.
    spec.limbs.forEach((limb, l) => {
      const side = l === 0 ? -1 : 1
      let previous = trunkIds[trunkIds.length - 1]
      limb.nodes.forEach((node, k) => {
        const id = `${branch.id}-${limb.id}${k + 1}`
        nodes.push({
          ...node,
          id,
          branch: branch.id,
          limb: limb.id,
          limbName: limb.name,
          depth: 3 + k,
          x: axis + side * LIMB_SPREAD,
          y: 3 + k,
          requires: [previous],
          cost: TIER_COSTS[3 + k],
        })
        previous = id
      })
      const capId = `${branch.id}-${limb.id}-apex`
      nodes.push({
        ...spec.caps[limb.id],
        id: capId,
        branch: branch.id,
        limb: limb.id,
        limbName: limb.name,
        depth: 7,
        x: axis + side * LIMB_SPREAD,
        y: 7,
        requires: [previous],
        keystone: true,
        cost: TIER_COSTS[7],
      })
    })
  })

  return nodes
}

export const TREE = buildTree()

const byNodeId = TREE.reduce((acc, n) => ({ ...acc, [n.id]: n }), {})

export const ROOT_ID = ROOT.id
export const CHAMPION_ID = CHAMPION.id

export function nodeById(id) {
  return byNodeId[id] ?? null
}

export function branchNodes(branchId) {
  return TREE.filter(n => n.branch === branchId).sort((a, b) => a.depth - b.depth)
}

// Les arêtes du graphe, pour le rendu : une par couple (parent → enfant).
export const EDGES = TREE.flatMap(n => n.requires.map(from => ({ from, to: n.id })))

export function requirementsOf(id) {
  return byNodeId[id]?.requires ?? []
}

// Déblocable = TOUS les parents acquis. « Tous » et pas « au moins un » : c'est
// ce qui donne son sens aux convergences (la clé exige les deux voies).
export function isUnlockable(id, owned) {
  const node = byNodeId[id]
  if (!node || owned.includes(id)) return false
  return node.requires.every(req => owned.includes(req))
}

// Achat pur : renvoie { gloire, owned } ou null si impossible.
export function buyNode(id, owned, gloire) {
  if (!isUnlockable(id, owned)) return null
  const node = byNodeId[id]
  if (gloire < node.cost) return null
  return { gloire: gloire - node.cost, owned: [...owned, id] }
}

export function totalSpent(owned) {
  return owned.reduce((sum, id) => sum + (byNodeId[id]?.cost ?? 0), 0)
}

export function treeTotalCost() {
  return TREE.reduce((sum, n) => sum + n.cost, 0)
}

// Coût pour atteindre un nœud, prérequis compris et déjà-acquis déduits. Sert à
// l'affichage (« encore 245 Gloire pour cet apex ») et à l'équilibrage.
export function costToReach(id, owned = []) {
  const visited = new Set(owned)
  let total = 0
  const walk = (nodeId) => {
    if (visited.has(nodeId)) return
    visited.add(nodeId)
    const node = byNodeId[nodeId]
    if (!node) return
    node.requires.forEach(walk)
    total += node.cost
  }
  walk(id)
  return total
}

// ---------- ÉCHOS : le puits de Gloire sans fin ----------
//
// Une branche entièrement acquise ouvre son « Écho », achetable INDÉFINIMENT.
// Sans lui, l'Arbre est un puits fini : avec les zones sans fin, un joueur
// profond gagne davantage que l'Arbre entier en un run et n'aurait plus rien à
// acheter — le plateau qu'on venait de supprimer reviendrait.
export const ECHO_BASE_COST = 1000
export const ECHO_COST_GROWTH = 1.5
export const ECHO_PCT = 25

const ECHO_EFFECT = { guerre: 'dmgPct', fortune: 'goldPct', reliques: 'relicPct', croisade: 'gloirePct' }

export function isBranchComplete(branchId, owned) {
  return branchNodes(branchId).every(n => owned.includes(n.id))
}

export function echoCost(level) {
  return Math.floor(ECHO_BASE_COST * Math.pow(ECHO_COST_GROWTH, level))
}

export function buyEcho(branchId, owned, echoes, gloire) {
  if (!ECHO_EFFECT[branchId] || !isBranchComplete(branchId, owned)) return null
  const level = echoes[branchId] ?? 0
  const cost = echoCost(level)
  if (gloire < cost) return null
  return { gloire: gloire - cost, echoes: { ...echoes, [branchId]: level + 1 } }
}

export function sanitizeEchoes(raw) {
  const out = {}
  for (const branchId of Object.keys(ECHO_EFFECT)) {
    const lvl = raw?.[branchId]
    if (Number.isFinite(lvl) && lvl > 0) out[branchId] = Math.floor(lvl)
  }
  return out
}

// Agrégation. Les `*Pct` s'additionnent (paliers d'une même idée), les `*Mult`
// se multiplient (apex et couronne), et les deux se composent.
export function treeEffects(owned = [], echoes = {}) {
  const echoPct = (key) => Object.entries(echoes).reduce(
    (s, [branchId, lvl]) => s + (ECHO_EFFECT[branchId] === key ? ECHO_PCT * (lvl ?? 0) : 0),
    0,
  )
  const sum = (key) => owned.reduce((s, id) => s + (byNodeId[id]?.effect[key] ?? 0), 0) + echoPct(key)
  const mult = (key) => owned.reduce((m, id) => m * (byNodeId[id]?.effect[key] ?? 1), 1)
  const has = (key) => owned.some(id => byNodeId[id]?.effect[key] === true)

  return {
    dmgMult: (1 + sum('dmgPct') / 100) * mult('dmgMult'),
    goldMult: (1 + sum('goldPct') / 100) * mult('goldMult'),
    // Plancher à 25% du prix : arbre complet, recruter doit coûter quelque chose.
    costMult: Math.max(0.25, 1 - sum('costPct') / 100),
    cooldownMult: Math.max(0.25, 1 - sum('cooldownPct') / 100),
    // Critiques : l'Arbre pilote désormais la fréquence (points) ET la puissance.
    critChanceBonus: sum('critChancePts'),
    critMultBonus: sum('critMultBonus'),
    qualityLevel: sum('qualityLevel'),
    relicEffectMult: (1 + sum('relicPct') / 100) * mult('relicMult'),
    meltMult: 1 + sum('meltPct') / 100,
    gloireMult: (1 + sum('gloirePct') / 100) * mult('gloireMult'),
    invCapBonus: sum('invCap'),
    relicDrops: sum('relicDrops'),
    startTroops: sum('startTroops'),
    startGold: sum('startGold'),
    championUnlocked: has('unlockChampion'),
  }
}

// --- Migrations --------------------------------------------------------------

// Le chemin minimal jusqu'au Serment du Champion, prérequis compris. Les deux
// migrations s'en servent pour ne jamais retirer un tier de troupe déjà acquis.
// Chemin minimal jusqu'au Champion. Depuis l'US 28 il pend directement à la
// racine : accorder le tier ne force plus à offrir toute une branche Guerre.
function championPath() {
  const path = []
  const walk = (id) => {
    if (path.includes(id)) return
    byNodeId[id].requires.forEach(walk)
    path.push(id)
  }
  walk(CHAMPION.id)
  return path
}

// Save v1 : l'ancienne Forge (6 upgrades à niveaux). On rembourse la Gloire
// dépensée plutôt que d'inventer une équivalence nœud par nœud.
const LEGACY_COSTS = { fureur: 5, butin: 5, intendance: 8, discipline: 12, fortune: 15, champion: 50 }

export function migrateFromMetaLevels(metaLevels = {}, gloire = 0) {
  let refund = 0
  for (const [id, base] of Object.entries(LEGACY_COSTS)) {
    const level = metaLevels[id] ?? 0
    for (let l = 0; l < level; l++) refund += base * Math.pow(l + 1, 2)
  }
  const owned = (metaLevels.champion ?? 0) > 0 ? championPath() : []
  if (owned.length) refund = Math.max(0, refund - LEGACY_COSTS.champion)
  return { owned, gloire: gloire + refund }
}

// Save v2 : l'arbre en quatre colonnes (`guerre-1` … `croisade-10`). La topologie
// change, donc les ids ne correspondent plus. Même politique : on rembourse ce
// qui avait été dépensé et le joueur replace où il veut. Un Champion acquis le
// reste (l'ancien `guerre-6` était le Serment).
export function migrateFromLinearTree(oldNodeIds = [], gloire = 0) {
  let refund = 0
  for (const id of oldNodeIds) {
    const tier = Number(String(id).split('-')[1])
    if (Number.isFinite(tier) && tier >= 1 && tier <= TIER_COSTS.length) refund += TIER_COSTS[tier - 1]
  }
  const owned = oldNodeIds.includes('guerre-6') ? championPath() : []
  if (owned.length) refund = Math.max(0, refund - totalSpent(owned))
  return { owned, gloire: gloire + refund }
}

// v3 → v4 : l'Arbre reconvergeait vers une couronne unique, ce qui annulait au
// dernier palier la spécialisation qu'il venait d'offrir. Les clés de voûte de
// branche (`<branche>-cle`), les apex de branche (`<branche>-apex`) et la
// couronne ont disparu au profit d'une clé PAR VOIE.
//
// Même politique que les migrations précédentes : on rembourse ce qui a été
// dépensé et le joueur replace où il veut, plutôt que d'inventer une
// équivalence nœud à nœud qui mentirait sur son intention.
export function migrateFromConvergentTree(oldNodeIds = [], gloire = 0) {
  const valid = new Set(TREE.map(n => n.id))
  const owned = []
  let refund = 0
  for (const id of oldNodeIds) {
    if (valid.has(id)) owned.push(id)
    else refund += TIER_COSTS[7] ?? 0   // les ids disparus étaient tous des paliers 7-9
  }
  // Un nœud conservé dont le prérequis a sauté resterait inatteignable : on ne
  // garde que ce qui reste réellement enchaîné depuis la racine.
  const reachable = []
  let changed = true
  while (changed) {
    changed = false
    for (const id of owned) {
      if (reachable.includes(id)) continue
      if (isUnlockable(id, reachable)) { reachable.push(id); changed = true }
    }
  }
  for (const id of owned) if (!reachable.includes(id)) refund += byNodeId[id]?.cost ?? 0
  return { owned: reachable, gloire: gloire + refund }
}
