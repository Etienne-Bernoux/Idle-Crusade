import { test } from 'node:test'
import assert from 'node:assert/strict'
import { gloireGain, rarityWeights, MAX_QUALITY_LEVEL, depthMultiplier, PRESTIGE_MIN_ZONES } from './prestige.js'

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

test('depthMultiplier : neutre jusqu au minimum de Croisade, puis ×4 par zone', () => {
  assert.equal(depthMultiplier(1), 1)
  assert.equal(depthMultiplier(PRESTIGE_MIN_ZONES), 1)
  assert.equal(depthMultiplier(PRESTIGE_MIN_ZONES + 1), 4)
  assert.equal(depthMultiplier(PRESTIGE_MIN_ZONES + 3), 64)
})

test('après la racine, la profondeur rapporte ×2 par zone', () => {
  // C'est ce qui compense le surcoût de temps (×1,7 à ×2,3 par zone mesuré) :
  // en dessous, personne n'irait jamais au-delà de la zone 5.
  const a = gloireGain(100, PRESTIGE_MIN_ZONES)
  const b = gloireGain(100, PRESTIGE_MIN_ZONES + 1)
  assert.equal((b / a).toFixed(1), '2.0')
})

test('la profondeur augmente le gain sans le faire exploser', () => {
  const base = gloireGain(70, 5)
  assert.equal(base, 83)                                  // inchangé vs avant
  assert.ok(gloireGain(80, 6) > base, 'pousser doit rapporter plus')
  // Sous la racine : 5 zones de plus multiplient le gain par ~40, pas par 1 000.
  const deep = gloireGain(130, 10) / base
  assert.ok(deep > 20 && deep < 80, `×${deep.toFixed(1)} hors de la plage voulue`)
})

test('sans profondeur précisée, le gain reste celui d une sortie au minimum', () => {
  assert.equal(gloireGain(70), gloireGain(70, PRESTIGE_MIN_ZONES))
})
