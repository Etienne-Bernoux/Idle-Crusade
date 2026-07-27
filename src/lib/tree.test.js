import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  TREE, BRANCHES, TIER_COSTS, MAX_TIER,
  nodeById, branchNodes, requirementOf, isUnlockable, buyNode,
  totalSpent, branchCostUpTo, treeEffects, migrateFromMetaLevels,
  isBranchComplete, echoCost, buyEcho, sanitizeEchoes, ECHO_BASE_COST, ECHO_COST_GROWTH,
} from './tree.js'

const allOf = (branch) => branchNodes(branch).map(n => n.id)
const fullTree = () => TREE.map(n => n.id)

test('l arbre a 4 branches de 10 nœuds, ids uniques', () => {
  assert.equal(BRANCHES.length, 4)
  assert.equal(TREE.length, 40)
  const ids = TREE.map(n => n.id)
  assert.equal(new Set(ids).size, 40)
  for (const b of BRANCHES) {
    const nodes = branchNodes(b.id)
    assert.equal(nodes.length, MAX_TIER, `branche ${b.id}`)
    assert.deepEqual(nodes.map(n => n.tier), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  }
})

test('chaque nœud est présentable et coûte le barème de sa profondeur', () => {
  for (const n of TREE) {
    assert.ok(n.name, `${n.id} sans nom`)
    assert.ok(n.desc, `${n.id} sans description`)
    assert.ok(Object.keys(n.effect).length > 0, `${n.id} sans effet`)
    assert.equal(n.cost, TIER_COSTS[n.tier - 1], `${n.id} hors barème`)
  }
})

test('les coûts montent strictement avec la profondeur', () => {
  for (let i = 1; i < TIER_COSTS.length; i++) {
    assert.ok(TIER_COSTS[i] > TIER_COSTS[i - 1], `palier ${i + 1} pas plus cher`)
  }
})

test('pousser une branche à fond coûte plus que les 3 autres au même palier', () => {
  // L'intention du barème : la profondeur est un choix, pas un passage obligé.
  const fond = branchCostUpTo(10)
  const large = 3 * branchCostUpTo(5)
  assert.ok(fond > large, `${fond} devrait dépasser ${large}`)
})

test('le tier 1 est libre, les suivants exigent le précédent de la branche', () => {
  assert.equal(requirementOf('guerre-1'), null)
  assert.equal(requirementOf('guerre-2'), 'guerre-1')
  assert.equal(requirementOf('croisade-10'), 'croisade-9')
  assert.equal(requirementOf('inconnu-3'), null)
})

test('isUnlockable respecte la chaîne de prérequis', () => {
  assert.ok(isUnlockable('guerre-1', []))
  assert.equal(isUnlockable('guerre-2', []), false)
  assert.ok(isUnlockable('guerre-2', ['guerre-1']))
  // Déjà possédé → plus déblocable.
  assert.equal(isUnlockable('guerre-1', ['guerre-1']), false)
  // Une branche voisine ne débloque rien.
  assert.equal(isUnlockable('guerre-2', ['fortune-1']), false)
})

test('buyNode débite la Gloire et ajoute le nœud', () => {
  const res = buyNode('guerre-1', [], 100)
  assert.deepEqual(res, { gloire: 95, owned: ['guerre-1'] })
})

test('buyNode est pur : ne mute pas la liste passée', () => {
  const owned = []
  buyNode('guerre-1', owned, 100)
  assert.deepEqual(owned, [])
})

test('buyNode refuse sans prérequis, sans Gloire, ou en double', () => {
  assert.equal(buyNode('guerre-2', [], 9999), null)
  assert.equal(buyNode('guerre-1', [], 4), null)
  assert.equal(buyNode('guerre-1', ['guerre-1'], 9999), null)
  assert.equal(buyNode('nawak-1', [], 9999), null)
})

test('totalSpent additionne le coût des nœuds pris', () => {
  assert.equal(totalSpent([]), 0)
  assert.equal(totalSpent(['guerre-1', 'guerre-2']), 5 + 12)
  assert.equal(totalSpent(['guerre-1', 'inconnu']), 5)
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
  // Fureur I (15) + Lame Affûtée (20) = +35%
  assert.equal(treeEffects(['guerre-1', 'guerre-2']).dmgMult.toFixed(2), '1.35')
})

test('les keystones se multiplient par-dessus les paliers', () => {
  // Guerre complète : +15+20+30+50+75 = +190% puis ×2
  const full = treeEffects(allOf('guerre'))
  assert.equal(full.dmgMult.toFixed(2), (2.9 * 2).toFixed(2))
  assert.ok(full.championUnlocked)
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
  // +10+20+30+50+75 = +185%, puis ×2
  assert.equal(e.gloireMult.toFixed(2), (2.85 * 2).toFixed(2))
  assert.equal(e.startTroops, 225)    // 10 + 40 + 25 + 150, cumulatifs
})

test('la branche Reliques cumule qualité, places et effets', () => {
  const e = treeEffects(allOf('reliques'))
  assert.equal(e.qualityLevel, 3)
  assert.equal(e.invCapBonus, 30)
  assert.equal(e.relicEffectMult.toFixed(2), (2.5 * 2).toFixed(2))
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

test('migration : un Champion déjà débloqué le reste (nœud + prérequis accordés)', () => {
  const { owned } = migrateFromMetaLevels({ champion: 1 }, 0)
  assert.deepEqual(owned, ['guerre-1', 'guerre-2', 'guerre-3', 'guerre-4', 'guerre-5', 'guerre-6'])
  assert.ok(treeEffects(owned).championUnlocked)
  // L'invariant de l'arbre tient : chaque nœud accordé a son prérequis.
  for (const id of owned) {
    const req = requirementOf(id)
    assert.ok(req === null || owned.includes(req), `${id} sans prérequis`)
  }
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
  // +190% de paliers, ×2 keystone → 5.8 ; deux Échos ajoutent 50% sous le ×2.
  assert.equal(avecEcho.toFixed(2), ((2.9 + 0.5) * 2).toFixed(2))
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
