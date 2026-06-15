import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RELIQUES, RARITIES, RELIQUE_SLOTS, rollRelique, reliqueEffect, equipRelique } from './reliques.js'

const emptyEquipped = () => ({ arme: null, armure: null, banniere: null, amulette: null })

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

test('equipRelique : slot vide → relique quitte l inventaire, entre dans son slot', () => {
  const r = { uid: 1, defId: 'lame_rouillee', rarity: 'commun' }   // slot arme
  const { inventory, equipped } = equipRelique([r], emptyEquipped(), r)
  assert.deepEqual(inventory, [])
  assert.equal(equipped.arme, r)
  assert.equal(equipped.armure, null)
})

test('equipRelique : slot occupé → swap, l ancienne revient en inventaire', () => {
  const old = { uid: 1, defId: 'lame_rouillee', rarity: 'commun' }   // arme
  const neu = { uid: 2, defId: 'hache_brisee', rarity: 'rare' }      // arme aussi
  const { inventory, equipped } = equipRelique([neu], { ...emptyEquipped(), arme: old }, neu)
  assert.equal(equipped.arme, neu)
  assert.deepEqual(inventory, [old])   // l'ancienne arme est de retour
})

test('equipRelique : invariant — total d instances conservé', () => {
  const a = { uid: 1, defId: 'lame_rouillee', rarity: 'commun' }
  const b = { uid: 2, defId: 'banniere_loup', rarity: 'rare' }
  const c = { uid: 3, defId: 'hache_brisee', rarity: 'commun' }   // arme, va swap a
  const start = { inventory: [b, c], equipped: { ...emptyEquipped(), arme: a } }
  const before = start.inventory.length + RELIQUE_SLOTS.filter(s => start.equipped[s]).length
  const after = equipRelique(start.inventory, start.equipped, c)
  const total = after.inventory.length + RELIQUE_SLOTS.filter(s => after.equipped[s]).length
  assert.equal(total, before)   // 3 instances avant et après
  // c est équipé, a est revenu en inventaire, aucune en double
  const uids = [...after.inventory.map(r => r.uid), ...RELIQUE_SLOTS.map(s => after.equipped[s]?.uid).filter(Boolean)]
  assert.deepEqual([...new Set(uids)].sort(), [1, 2, 3])
})
