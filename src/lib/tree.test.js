import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  TREE, EDGES, BRANCHES, TIER_COSTS, MAX_DEPTH, ROOT_ID, CHAMPION_ID,
  nodeById, branchNodes, requirementsOf, isUnlockable, buyNode,
  totalSpent, treeTotalCost, costToReach, treeEffects,
  migrateFromMetaLevels, migrateFromLinearTree,
  isBranchComplete, echoCost, buyEcho, sanitizeEchoes, ECHO_BASE_COST, ECHO_COST_GROWTH,
} from './tree.js'

const allOf = (branch) => branchNodes(branch).map(n => n.id)
const fullTree = () => TREE.map(n => n.id)
const childrenOf = (id) => EDGES.filter(e => e.from === id).map(e => e.to)

// ---------- TOPOLOGIE : c'est un ARBRE, pas quatre listes ----------

test('une racine unique, sans prérequis, d où tout part', () => {
  const roots = TREE.filter(n => n.requires.length === 0)
  assert.deepEqual(roots.map(n => n.id), [ROOT_ID])
  // Les 4 branches, plus le Champion qui est du contenu commun.
  assert.equal(childrenOf(ROOT_ID).length, BRANCHES.length + 1)
})

test('il y a de vraies FOURCHES : des nœuds à plusieurs enfants', () => {
  const forks = TREE.filter(n => childrenOf(n.id).length > 1)
  // La racine + le haut de chaque tronc, qui se divise en deux voies.
  assert.equal(forks.length, 1 + BRANCHES.length)
  for (const b of BRANCHES) {
    const trunkTop = `${b.id}-tronc2`
    assert.equal(childrenOf(trunkTop).length, 2, `${trunkTop} doit se diviser en deux voies`)
  }
})

test('il y a de vraies CONVERGENCES : des nœuds à plusieurs parents', () => {
  const merges = TREE.filter(n => n.requires.length > 1)
  // Une clé de voûte par VOIE, plus aucune convergence finale.
  for (const b of BRANCHES) {
    for (const limb of ['0', '1']) void limb
  }
  const caps = TREE.filter(n => n.keystone && n.branch)
  assert.equal(caps.length, BRANCHES.length * 2, 'deux clés par branche, une par voie')
  for (const cap of caps) {
    assert.equal(cap.requires.length, 1, `${cap.id} doit prolonger UNE voie, pas en fusionner deux`)
  }
})

test('chaque branche a deux voies distinctes de quatre nœuds', () => {
  for (const b of BRANCHES) {
    const limbs = {}
    for (const n of branchNodes(b.id)) if (n.limb) (limbs[n.limb] ??= []).push(n)
    assert.equal(Object.keys(limbs).length, 2, `${b.id} doit avoir deux voies`)
    for (const [limbId, nodes] of Object.entries(limbs)) {
      // 4 nœuds + la clé de voûte propre à la voie (US 28).
      assert.equal(nodes.length, 5, `${b.id}/${limbId}`)
      assert.ok(nodes[0].limbName, 'une voie doit être nommable dans l UI')
    }
  }
})

test('le graphe est acyclique et entièrement atteignable depuis la racine', () => {
  const reached = new Set()
  let changed = true
  while (changed) {
    changed = false
    for (const n of TREE) {
      if (reached.has(n.id)) continue
      if (n.requires.every(r => reached.has(r))) { reached.add(n.id); changed = true }
    }
  }
  assert.equal(reached.size, TREE.length, 'un nœud inatteignable = un cycle ou un prérequis cassé')
})

test('un prérequis est toujours moins profond que son enfant', () => {
  for (const n of TREE) {
    for (const req of n.requires) {
      assert.ok(nodeById(req).depth < n.depth, `${req} (${nodeById(req).depth}) → ${n.id} (${n.depth})`)
    }
  }
})

test('l arbre fait 50 nœuds, et ne monte plus jusqu au dernier palier', () => {
  assert.equal(TREE.length, 50)
  assert.equal(new Set(TREE.map(n => n.id)).size, 50, 'ids uniques')
  // Depuis l'US 28 le sommet est la clé de voûte d'une VOIE (palier 7). Les
  // paliers 8 et 9 servaient l'apex de branche et la couronne, qui faisaient
  // reconverger l'arbre — ils n'ont plus d'objet.
  assert.equal(Math.max(...TREE.map(n => n.depth)), 7)
  assert.ok(MAX_DEPTH >= 7)
})

test('chaque nœud est présentable, coûte son palier, et a une place à l écran', () => {
  for (const n of TREE) {
    assert.ok(n.name, `${n.id} sans nom`)
    assert.ok(n.desc, `${n.id} sans description`)
    assert.ok(Object.keys(n.effect).length > 0, `${n.id} sans effet`)
    assert.equal(n.cost, TIER_COSTS[n.depth], `${n.id} hors barème`)
    assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y), `${n.id} sans coordonnées de rendu`)
  }
})

test('les coûts montent strictement avec la profondeur', () => {
  for (let i = 1; i < TIER_COSTS.length; i++) assert.ok(TIER_COSTS[i] > TIER_COSTS[i - 1])
})

// ---------- DÉBLOCAGE ----------

test('la racine est déblocable d emblée, ses enfants seulement après elle', () => {
  assert.ok(isUnlockable(ROOT_ID, []))
  assert.equal(isUnlockable('guerre-tronc1', []), false)
  assert.ok(isUnlockable('guerre-tronc1', [ROOT_ID]))
})

test('une convergence exige TOUS ses parents, pas un seul', () => {
  const lame = ['racine', 'guerre-tronc1', 'guerre-tronc2', 'guerre-lame1', 'guerre-lame2', 'guerre-lame3', 'guerre-lame4']
  assert.ok(isUnlockable('guerre-lame-apex', lame), 'une voie poussée à fond suffit à sa propre clé')
  const both = [...lame, 'guerre-precision1', 'guerre-precision2', 'guerre-precision3', 'guerre-precision4']
  assert.equal(isUnlockable('guerre-precision-apex', lame), false, "la voie d'à côté reste à payer")
})

test('l Arbre ne reconverge nulle part', () => {
  // Le retour d'Etienne : on part du centre et on s'enfonce dans des
  // spécialisations. Un nœud qui exigerait deux voies, ou quatre branches,
  // annulerait le choix au dernier palier.
  for (const n of TREE) {
    if (n.id === ROOT_ID) continue
    assert.ok(n.requires.length <= 1, `${n.id} fusionne ${n.requires.length} chemins`)
  }
})

test('le Champion est du contenu commun, pas une récompense de spécialisation', () => {
  // Le mettre en clé de voûte de la branche Guerre le rendait inatteignable
  // pour trois joueurs sur quatre.
  const champion = nodeById(CHAMPION_ID)
  assert.deepEqual(champion.requires, [ROOT_ID])
  assert.equal(champion.branch, null)
  assert.equal(treeEffects([CHAMPION_ID]).championUnlocked, true)
})

test('buyNode débite, ajoute, et reste pur', () => {
  const owned = []
  const res = buyNode(ROOT_ID, owned, 100)
  assert.deepEqual(res, { gloire: 95, owned: [ROOT_ID] })
  assert.deepEqual(owned, [], 'la liste passée ne doit pas être mutée')
})

test('buyNode refuse sans prérequis, sans Gloire, en double, ou inconnu', () => {
  assert.equal(buyNode('guerre-tronc1', [], 9999), null)
  assert.equal(buyNode(ROOT_ID, [], 4), null)
  assert.equal(buyNode(ROOT_ID, [ROOT_ID], 9999), null)
  assert.equal(buyNode('nawak', [], 9999), null)
})

test('costToReach additionne le chemin complet, et déduit l acquis', () => {
  // La racine (5) + deux nœuds de tronc (12 + 25).
  assert.equal(costToReach('guerre-tronc2'), 5 + 12 + 25)
  assert.equal(costToReach('guerre-tronc2', [ROOT_ID]), 12 + 25)
  // Une clé de voûte passe par les DEUX voies : son chemin est plus coûteux
  // que celui d un simple nœud de même profondeur.
  assert.ok(costToReach('guerre-lame-apex') > costToReach('guerre-lame4'))
})

test('aucun nœud ne coûte à lui seul l arbre entier', () => {
  // Avant, la couronne exigeait tout : son coût d'accès ÉTAIT le total. Sans
  // convergence, plus aucun nœud n'oblige à tout acheter.
  for (const n of TREE) assert.ok(costToReach(n.id) < treeTotalCost(), `${n.id}`)
})

test('totalSpent additionne le coût des nœuds pris', () => {
  assert.equal(totalSpent([]), 0)
  assert.equal(totalSpent([ROOT_ID, 'guerre-tronc1']), 5 + 12)
  assert.equal(totalSpent([ROOT_ID, 'inconnu']), 5)
})

test('un arbre vide donne des effets neutres', () => {
  const e = treeEffects([])
  assert.equal(e.dmgMult, 1)
  assert.equal(e.goldMult, 1)
  assert.equal(e.costMult, 1)
  assert.equal(e.cooldownMult, 1)
  assert.equal(e.gloireMult, 1)
  assert.equal(e.relicEffectMult, 1)
  assert.equal(e.meltMult, 1)
  assert.equal(e.qualityLevel, 0)
  assert.equal(e.invCapBonus, 0)
  assert.equal(e.startTroops, 0)
  assert.equal(e.startGold, 0)
  assert.equal(e.championUnlocked, false)
})

test('les paliers en pourcentage s additionnent', () => {
  // Racine (10) + Fureur I (15) = +25%
  assert.equal(treeEffects(['racine', 'guerre-tronc1']).dmgMult.toFixed(2), '1.25')
})

test('les keystones se multiplient par-dessus les paliers', () => {
  // Guerre complète : tronc (15+20) + Voie de la Lame (25+30+40+50) = +180%,
  // puis l apex applique son ×2 par-dessus.
  const full = treeEffects(allOf('guerre'))
  assert.equal(full.dmgMult.toFixed(2), (2.8 * 2).toFixed(2))
  // Le Champion n'est plus dans la branche : c'est un nœud commun (US 28).
  assert.equal(full.championUnlocked, false)
})

test('les réductions ont un plancher : recruter garde un prix', () => {
  const e = treeEffects(allOf('fortune'))
  assert.ok(e.costMult >= 0.25)
  assert.ok(e.costMult < 1)
  const cd = treeEffects(allOf('guerre'))
  assert.ok(cd.cooldownMult >= 0.25)
})

test('la branche Croisade fait croître le gain de Gloire', () => {
  const e = treeEffects(allOf('croisade'))
  // Tronc (10+15) + Voie de la Gloire (20+25+30+40) = +140%, puis Apothéose ×2.
  assert.equal(e.gloireMult.toFixed(2), (2.4 * 2).toFixed(2))
  // Voie de l Héritage : 10 + 40 + 25 + 150, plus Armée de Légende (200).
  assert.equal(e.startTroops, 425)
})

test('la branche Reliques cumule qualité, places, effets et un peu de chance', () => {
  const e = treeEffects(allOf('reliques'))
  // 2 et non 3 depuis l'US 27 : le nœud de qualité du tronc a cédé la place à
  // « Aubaine » (+1 relique par boss). La branche échange un cran de rareté
  // contre du volume — un effet qui se voit dès le premier prestige, là où la
  // rareté ne payait que sur les drops à venir.
  assert.equal(e.qualityLevel, 2)
  assert.equal(e.relicDrops, 1)
  assert.equal(e.invCapBonus, 30)
  // « Bénédiction III » a laissé la place à « Main Chanceuse » (US 25) : la
  // branche perd 30 points d'effet de relique et gagne 6 points de critique.
  assert.equal(e.relicEffectMult.toFixed(2), (2.2 * 2).toFixed(2))
  assert.equal(e.critChanceBonus, 6)
})

test('l arbre complet reste dans des ordres de grandeur jouables', () => {
  const e = treeEffects(fullTree())
  // Garde-fou anti-inflation : un arbre max ne doit pas exploser la courbe.
  assert.ok(e.dmgMult < 10, `dmgMult=${e.dmgMult}`)
  assert.ok(e.goldMult < 10, `goldMult=${e.goldMult}`)
  assert.ok(e.gloireMult < 10, `gloireMult=${e.gloireMult}`)
})

test('migration : rembourse la Gloire dépensée dans l ancienne Forge', () => {
  // fureur 2 = 5 + 20 = 25 ; butin 1 = 5. Total 30.
  const { owned, gloire } = migrateFromMetaLevels({ fureur: 2, butin: 1 }, 7)
  assert.deepEqual(owned, [])
  assert.equal(gloire, 37)
})

test('migration : un Champion déjà débloqué le reste (chemin complet accordé)', () => {
  const { owned } = migrateFromMetaLevels({ champion: 1 }, 0)
  assert.ok(owned.includes(CHAMPION_ID), 'le Serment doit être accordé')
  assert.ok(treeEffects(owned).championUnlocked)
  // Le Champion pendant à la racine (US 28), le chemin tient en deux nœuds.
  assert.deepEqual(owned, ['racine', 'champion'])
  // L invariant du graphe tient : chaque nœud accordé a tous ses prérequis.
  for (const id of owned) {
    for (const req of requirementsOf(id)) {
      assert.ok(owned.includes(req), `${id} accordé sans son prérequis ${req}`)
    }
  }
})

test('migration v2 → v3 : l arbre en colonnes est remboursé, le Champion conservé', () => {
  // Ancien arbre : 3 nœuds de Guerre (5+12+25) et 2 de Fortune (5+12).
  const { owned, gloire } = migrateFromLinearTree(
    ['guerre-1', 'guerre-2', 'guerre-3', 'fortune-1', 'fortune-2'], 100,
  )
  assert.deepEqual(owned, [], 'aucun nœud conservé : la topologie a changé')
  assert.equal(gloire, 100 + 5 + 12 + 25 + 5 + 12)
})

test('migration v2 → v3 : l ancien Serment (guerre-6) reste un Champion', () => {
  const old = Array.from({ length: 6 }, (_, i) => `guerre-${i + 1}`)
  const { owned } = migrateFromLinearTree(old, 0)
  assert.ok(owned.includes(CHAMPION_ID))
  assert.ok(treeEffects(owned).championUnlocked)
})

test('migration : sans ancienne Forge, rien à faire', () => {
  assert.deepEqual(migrateFromMetaLevels({}, 12), { owned: [], gloire: 12 })
  assert.deepEqual(migrateFromMetaLevels(undefined, 0), { owned: [], gloire: 0 })
})

test('nodeById et branchNodes tolèrent l inconnu', () => {
  assert.equal(nodeById('nope'), null)
  assert.deepEqual(branchNodes('nope'), [])
})

// ---------- ÉCHOS ----------

test('un Écho n est ouvert que par une branche entièrement acquise', () => {
  assert.equal(isBranchComplete('guerre', []), false)
  assert.equal(isBranchComplete('guerre', allOf('guerre').slice(0, 9)), false)
  assert.ok(isBranchComplete('guerre', allOf('guerre')))
  assert.equal(buyEcho('guerre', allOf('guerre').slice(0, 9), {}, 1e9), null)
})

test('le coût d un Écho croît géométriquement', () => {
  assert.equal(echoCost(0), ECHO_BASE_COST)
  assert.equal(echoCost(1), Math.floor(ECHO_BASE_COST * ECHO_COST_GROWTH))
  assert.ok(echoCost(10) > echoCost(9))
})

test('buyEcho débite, incrémente, et reste pur', () => {
  const owned = allOf('guerre')
  const echoes = {}
  const res = buyEcho('guerre', owned, echoes, 5000)
  assert.equal(res.gloire, 5000 - ECHO_BASE_COST)
  assert.equal(res.echoes.guerre, 1)
  assert.deepEqual(echoes, {}, 'la structure passée ne doit pas être mutée')
})

test('buyEcho refuse sans Gloire, et pour une branche inconnue', () => {
  assert.equal(buyEcho('guerre', allOf('guerre'), {}, ECHO_BASE_COST - 1), null)
  assert.equal(buyEcho('nawak', [], {}, 1e9), null)
})

test('les Échos versent leurs % dans le même pot que les paliers', () => {
  const owned = allOf('guerre')
  const sansEcho = treeEffects(owned).dmgMult
  const avecEcho = treeEffects(owned, { guerre: 2 }).dmgMult
  // +180% de paliers, ×2 d apex → 5,6 ; deux Échos ajoutent 50% SOUS le ×2.
  assert.equal(avecEcho.toFixed(2), ((2.8 + 0.5) * 2).toFixed(2))
  assert.ok(avecEcho > sansEcho)
})

test('chaque branche a un Écho qui dope SA stat', () => {
  assert.ok(treeEffects(allOf('fortune'), { fortune: 4 }).goldMult > treeEffects(allOf('fortune')).goldMult)
  assert.ok(treeEffects(allOf('croisade'), { croisade: 4 }).gloireMult > treeEffects(allOf('croisade')).gloireMult)
  assert.ok(treeEffects(allOf('reliques'), { reliques: 4 }).relicEffectMult > treeEffects(allOf('reliques')).relicEffectMult)
})

test('l Écho est un puits SANS FIN : le coût suit toujours la Gloire disponible', () => {
  // C'est sa raison d'être : avec les zones sans fin, un joueur profond gagne
  // plus que l'Arbre entier (8 008) en un run et n'aurait plus rien à acheter.
  let level = 0
  let spent = 0
  for (let i = 0; i < 40; i++) { spent += echoCost(level); level++ }
  assert.ok(spent > 8008 * 100, `40 Échos absorbent ${spent} Gloire`)
})

test('sanitizeEchoes écarte branches inconnues et valeurs absurdes', () => {
  const clean = sanitizeEchoes({ guerre: 3, nawak: 5, fortune: -2, reliques: 1.8, croisade: 'x' })
  assert.deepEqual(clean, { guerre: 3, reliques: 1 })
  assert.deepEqual(sanitizeEchoes(undefined), {})
})

// ---------- CRITIQUES DANS L'ARBRE (US 25) ----------

test('l Arbre pilote désormais la FRÉQUENCE et la PUISSANCE des critiques', () => {
  const neutre = treeEffects([])
  assert.equal(neutre.critChanceBonus, 0)
  assert.equal(neutre.critMultBonus, 0)
  const full = treeEffects(TREE.map(n => n.id))
  assert.ok(full.critChanceBonus > 0, 'aucun levier de fréquence')
  assert.ok(full.critMultBonus > 0, 'aucun levier de puissance')
})

test('la Voie de la Précision porte l essentiel du critique', () => {
  const voie = branchNodes('guerre').filter(n => n.limb === 'precision').map(n => n.id)
  const e = treeEffects(voie)
  assert.equal(e.critChanceBonus, 12)   // 5 + 7
  // Coup Fatal, plus « Coup de Grâce » qui coiffe désormais la voie (US 28).
  assert.equal(e.critMultBonus, 2)
  // Elle garde aussi la technique des actifs : c'est la voie « technicienne ».
  assert.ok(e.cooldownMult < 1)
})

test('les critiques de l Arbre restent dans des bornes jouables', () => {
  // Base du jeu : 8% de chance, ×3. L'Arbre complet ne doit pas rendre le
  // critique systématique — sinon ce n'est plus un événement.
  const full = treeEffects(TREE.map(n => n.id))
  assert.ok(full.critChanceBonus <= 30, `+${full.critChanceBonus} pts est trop`)
  assert.ok(full.critMultBonus <= 3, `+${full.critMultBonus} au multiplicateur est trop`)
})

test('l Arbre ne fournit plus de durée de Cri (plus aucun nœud ne le fait)', () => {
  // Le laisser exposé serait du code mort : le seul levier de durée restant est
  // la règle de biome « Bain de Sang ».
  assert.equal('warCryDurationMult' in treeEffects([]), false)
})

test('la branche Reliques ouvre sur un effet de premier ordre', () => {
  // Mesuré en US 27 : un tronc qui n'achetait que des multiplicateurs sur les
  // effets de reliques laissait la branche 19% derrière Guerre à TOUS les
  // horizons — pas seulement au premier cycle. Le premier nœud doit donc agir
  // sur une quantité (le nombre de reliques), pas sur un pourcentage de bonus.
  const tronc1 = branchNodes('reliques').find(n => n.id === 'reliques-tronc1')
  assert.equal(treeEffects([tronc1.id]).relicDrops, 1)
})

test('aucun nœud de la branche Reliques n usurpe le nom de la branche Fortune', () => {
  // « Fortune I/II/III » vivaient dans la branche Reliques alors qu'il existe une
  // branche Fortune : collision de lecture pour le joueur.
  const noms = branchNodes('reliques').map(n => n.name)
  assert.equal(noms.some(n => /^Fortune\b/.test(n)), false, `collision : ${noms.join(', ')}`)
})

test('relicDrops ne sort pas de l Arbre sans nœud acheté', () => {
  assert.equal(treeEffects([]).relicDrops, 0)
})
