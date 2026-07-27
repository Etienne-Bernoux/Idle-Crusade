import { test } from 'node:test'
import assert from 'node:assert/strict'
import { unitCost, bulkCost, maxAffordable, plannedPurchase, isBuyMode } from './economy.js'

test('unitCost : la 1re unité coûte le prix de base, puis +15% par unité possédée', () => {
  assert.equal(unitCost(10, 0), 10)
  assert.equal(unitCost(10, 1), 11)      // floor(11.5)
  assert.equal(unitCost(10, 2), 13)      // floor(13.225)
  assert.equal(unitCost(1000, 3), 1520)  // floor(1520.875)
})

test('unitCost : le multiplicateur de la Forge réduit le prix', () => {
  assert.equal(unitCost(100, 0, 0.85), 85)
  assert.equal(unitCost(100, 0, 1), 100)
})

test('bulkCost égale exactement la somme de n achats unitaires (invariant CA2)', () => {
  for (const [base, owned, n] of [[10, 0, 10], [100, 7, 3], [1000, 25, 17], [10000, 0, 1]]) {
    let manual = 0
    for (let i = 0; i < n; i++) manual += unitCost(base, owned + i)
    assert.equal(bulkCost(base, owned, n), manual, `base=${base} owned=${owned} n=${n}`)
  }
})

test('bulkCost : lot vide ou négatif → 0', () => {
  assert.equal(bulkCost(10, 0, 0), 0)
  assert.equal(bulkCost(10, 0, -5), 0)
})

test('bulkCost respecte le multiplicateur de coût', () => {
  assert.ok(bulkCost(100, 0, 10, 0.85) < bulkCost(100, 0, 10))
})

test('maxAffordable : exact aux bornes', () => {
  // 1re unité à 10. Avec 9 d'or : rien. Avec 10 : une seule.
  assert.deepEqual(maxAffordable(10, 0, 9), { count: 0, cost: 0 })
  assert.deepEqual(maxAffordable(10, 0, 10), { count: 1, cost: 10 })
  // 10 + 11 = 21 pour deux unités : 20 n'en paie qu'une.
  assert.deepEqual(maxAffordable(10, 0, 20), { count: 1, cost: 10 })
  assert.deepEqual(maxAffordable(10, 0, 21), { count: 2, cost: 21 })
})

test('maxAffordable : son coût est cohérent avec bulkCost', () => {
  const { count, cost } = maxAffordable(10, 3, 5000)
  assert.equal(cost, bulkCost(10, 3, count))
  assert.ok(cost <= 5000)
  assert.ok(bulkCost(10, 3, count + 1) > 5000, 'une unité de plus doit dépasser le budget')
})

test('maxAffordable : reste borné même avec une fortune (croissance exponentielle)', () => {
  const { count } = maxAffordable(10, 0, 1e12)
  assert.ok(count > 100 && count < 250, `count=${count} doit rester logarithmique`)
})

test('plannedPurchase ×1 : achète une unité si elle est payable', () => {
  assert.deepEqual(plannedPurchase('x1', 10, 0, 10), { count: 1, cost: 10, displayCost: 10 })
  assert.deepEqual(plannedPurchase('x1', 10, 0, 9), { count: 0, cost: 0, displayCost: 10 })
})

test('plannedPurchase ×10 est tout-ou-rien', () => {
  const full = bulkCost(10, 0, 10)
  assert.deepEqual(plannedPurchase('x10', 10, 0, full), { count: 10, cost: full, displayCost: full })
  // Un sou de moins : on n'achète pas 9 unités par surprise.
  assert.deepEqual(plannedPurchase('x10', 10, 0, full - 1), { count: 0, cost: 0, displayCost: full })
})

test('plannedPurchase MAX prend ce qui est finançable', () => {
  const { count, cost } = plannedPurchase('max', 10, 0, 100)
  assert.ok(count > 1)
  assert.ok(cost <= 100)
  assert.equal(cost, bulkCost(10, 0, count))
})

test('plannedPurchase : displayCost reste le prix visé même quand rien n est achetable', () => {
  // Une carte insolvable doit annoncer un prix, pas « 🪙 0 ».
  assert.equal(plannedPurchase('x10', 10, 0, 0).displayCost, bulkCost(10, 0, 10))
  // MAX sans le sou : on affiche le palier suivant (prix d'une unité).
  assert.deepEqual(plannedPurchase('max', 10, 0, 3), { count: 0, cost: 0, displayCost: 10 })
})

test('plannedPurchase : le débit est nul quand count vaut 0', () => {
  for (const mode of ['x1', 'x10', 'max']) {
    const p = plannedPurchase(mode, 1000, 5, 0)
    assert.equal(p.count, 0, mode)
    assert.equal(p.cost, 0, mode)
    assert.ok(p.displayCost > 0, mode)
  }
})

test('plannedPurchase : mode inconnu retombe sur une unité', () => {
  assert.deepEqual(plannedPurchase('nawak', 10, 0, 999), { count: 1, cost: 10, displayCost: 10 })
})

test('isBuyMode valide les modes connus seulement', () => {
  assert.ok(isBuyMode('x1') && isBuyMode('x10') && isBuyMode('max'))
  assert.equal(isBuyMode('x100'), false)
  assert.equal(isBuyMode(undefined), false)
})
