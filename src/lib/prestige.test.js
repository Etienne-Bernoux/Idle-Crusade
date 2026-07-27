import { test } from 'node:test'
import assert from 'node:assert/strict'
import { gloireGain, rarityWeights, MAX_QUALITY_LEVEL } from './prestige.js'

test('gloireGain suit floor(10 × sqrt(vagues)) — table de DESIGN.md', () => {
  assert.equal(gloireGain(1), 10)
  assert.equal(gloireGain(25), 50)
  assert.equal(gloireGain(70), 83)     // clear des 5 zones : 10+12+14+16+18 vagues
  assert.equal(gloireGain(100), 100)
  assert.equal(gloireGain(200), 141)
  assert.equal(gloireGain(1000), 316)
})

test('gloireGain : 0 ou négatif → 0 (pas de NaN)', () => {
  assert.equal(gloireGain(0), 0)
  assert.equal(gloireGain(-3), 0)
  assert.equal(gloireGain(undefined), 0)
})

test('gloireGain croît avec le farm mais à rendement décroissant', () => {
  // Le point de la formule : farmer deux fois plus ne double pas le gain,
  // mais il augmente — c'est ce que l'ancienne version (bornée à 5 zones) ne faisait pas.
  assert.ok(gloireGain(140) > gloireGain(70))
  assert.ok(gloireGain(140) < 2 * gloireGain(70))
})

test('rarityWeights : bornes de DESIGN et somme constante à 100', () => {
  const floor = rarityWeights(0)
  assert.deepEqual(floor, { commun: 70, rare: 25, legendaire: 5 })
  const ceil = rarityWeights(3)
  assert.deepEqual(ceil, { commun: 40, rare: 45, legendaire: 15 })
  for (const lvl of [0, 1, 2, 3]) {
    const w = rarityWeights(lvl)
    assert.equal(Math.round(w.commun + w.rare + w.legendaire), 100)
  }
})

test('rarityWeights est monotone : plus de Fortune, plus de légendaires', () => {
  const legendaires = [0, 1, 2, 3].map(l => rarityWeights(l).legendaire)
  for (let i = 1; i < legendaires.length; i++) {
    assert.ok(legendaires[i] > legendaires[i - 1], `niveau ${i} doit dépasser ${i - 1}`)
  }
})
