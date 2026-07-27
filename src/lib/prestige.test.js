import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  gloireGain,
  upgradeCost,
  canAfford,
  buyUpgrade,
  metaEffects,
  rarityWeights,
  emptyMetaLevels,
  META_UPGRADES,
} from './prestige.js'

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

test('upgradeCost est quadratique et vaut baseCost au niveau 0', () => {
  assert.equal(upgradeCost('fureur', 0), 5)
  assert.equal(upgradeCost('fureur', 4), 125)
  assert.equal(upgradeCost('intendance', 0), 8)
  assert.equal(upgradeCost('discipline', 2), 108)
})

test('upgradeCost → null au niveau max (et pour un id inconnu)', () => {
  assert.equal(upgradeCost('fureur', 5), null)
  assert.equal(upgradeCost('champion', 1), null)
  assert.equal(upgradeCost('inconnu', 0), null)
})

test('canAfford exige la Gloire exacte et refuse au max', () => {
  assert.equal(canAfford('fureur', 0, 4), false)
  assert.equal(canAfford('fureur', 0, 5), true)
  assert.equal(canAfford('fureur', 5, 9999), false)
})

test('buyUpgrade débite la Gloire et incrémente le niveau', () => {
  const res = buyUpgrade('fureur', emptyMetaLevels(), 10)
  assert.equal(res.gloire, 5)
  assert.equal(res.levels.fureur, 1)
})

test('buyUpgrade est pur : ne mute pas les niveaux passés', () => {
  const levels = emptyMetaLevels()
  buyUpgrade('fureur', levels, 10)
  assert.equal(levels.fureur, 0)
})

test('buyUpgrade → null si Gloire insuffisante ou niveau max', () => {
  assert.equal(buyUpgrade('fureur', emptyMetaLevels(), 4), null)
  assert.equal(buyUpgrade('champion', { champion: 1 }, 9999), null)
})

test('metaEffects : additif au sein d une upgrade', () => {
  assert.equal(metaEffects({ fureur: 5 }).dmgMult, 1.5)
  assert.equal(metaEffects({ butin: 3 }).goldMult.toFixed(2), '1.30')
  assert.equal(metaEffects({ intendance: 5 }).costMult.toFixed(2), '0.85')
  assert.equal(metaEffects({ discipline: 3 }).cooldownMult.toFixed(2), '0.85')
})

test('metaEffects : niveaux absents, négatifs ou au-delà du max sont clampés', () => {
  const neutral = metaEffects({})
  assert.equal(neutral.dmgMult, 1)
  assert.equal(neutral.costMult, 1)
  assert.equal(neutral.championUnlocked, false)
  assert.equal(metaEffects({ fureur: -2 }).dmgMult, 1)
  assert.equal(metaEffects({ fureur: 99 }).dmgMult, 1.5)
})

test('metaEffects : le Serment débloque le Champion', () => {
  assert.equal(metaEffects({ champion: 1 }).championUnlocked, true)
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

test('le catalogue est cohérent : ids uniques, coûts et niveaux positifs', () => {
  const ids = META_UPGRADES.map(u => u.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const u of META_UPGRADES) {
    assert.ok(u.baseCost > 0, `${u.id} doit avoir un coût`)
    assert.ok(u.maxLevel >= 1, `${u.id} doit avoir au moins un niveau`)
    assert.ok(u.name && u.desc, `${u.id} doit être présentable en UI`)
  }
})
