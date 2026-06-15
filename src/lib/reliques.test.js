import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RELIQUES, RARITIES, RELIQUE_SLOTS, rollRelique, reliqueEffect } from './reliques.js'

// rng déterministe : renvoie successivement les valeurs fournies.
function seqRng(values) {
  let i = 0
  return () => values[i++ % values.length]
}

test('rollRelique renvoie toujours un defId connu et une rareté connue', () => {
  for (let i = 0; i < 200; i++) {
    const { defId, rarity } = rollRelique()
    assert.ok(RELIQUES[defId], `defId inconnu: ${defId}`)
    assert.ok(RARITIES[rarity], `rareté inconnue: ${rarity}`)
  }
})

test('rollRelique : rng proche de 0 → première def + commun', () => {
  const { defId, rarity } = rollRelique(seqRng([0, 0]))
  assert.equal(defId, Object.keys(RELIQUES)[0])
  assert.equal(rarity, 'commun')
})

test('rollRelique : 2e tirage juste sous le seuil commun reste commun', () => {
  // total des poids = 100 ; commun = 70. roll = 0.69*100 = 69 < 70 → commun.
  const { rarity } = rollRelique(seqRng([0, 0.69]))
  assert.equal(rarity, 'commun')
})

test('rollRelique : 2e tirage au-delà du seuil commun → rare', () => {
  // roll = 0.80*100 = 80 ; 80-70=10 >=0 (pas commun), 10-25<0 → rare.
  const { rarity } = rollRelique(seqRng([0, 0.80]))
  assert.equal(rarity, 'rare')
})

test('rollRelique : tirage tout en haut → légendaire', () => {
  // roll = 0.99*100 = 99 ; -70=29, -25=4, -5<0 → legendaire.
  const { rarity } = rollRelique(seqRng([0, 0.99]))
  assert.equal(rarity, 'legendaire')
})

test('reliqueEffect : magnitude = base * mult de la rareté', () => {
  // lame_rouillee base 5 ; rare mult 2.5 → 12.5
  assert.deepEqual(reliqueEffect('lame_rouillee', 'rare'), { type: 'dmg', pct: 12.5 })
  // banniere_loup base 8 ; legendaire mult 6 → 48
  assert.deepEqual(reliqueEffect('banniere_loup', 'legendaire'), { type: 'gold', pct: 48 })
  // commun mult 1
  assert.deepEqual(reliqueEffect('amulette_os', 'commun'), { type: 'gold', pct: 7 })
})

test('reliqueEffect : defId inconnu → null (relique fantôme filtrable)', () => {
  assert.equal(reliqueEffect('defId_supprime', 'commun'), null)
})

test('chaque def a un slot valide et un type d effet supporté', () => {
  for (const [id, def] of Object.entries(RELIQUES)) {
    assert.ok(RELIQUE_SLOTS.includes(def.slot), `slot invalide pour ${id}: ${def.slot}`)
    assert.ok(['dmg', 'gold'].includes(def.effect.type), `type invalide pour ${id}`)
  }
})
