import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatNumber, formatMult } from './format.js'

test('formatNumber groupe les milliers sous un million et arrondit vers le bas', () => {
  // Le séparateur de fr-FR est U+202F (espace insécable étroit), pas un espace
  // ASCII — l'écrire en clair dans le test le rendrait faussement rouge.
  const NBSP = '\u202f'
  assert.equal(formatNumber(7), '7')
  assert.equal(formatNumber(1247.83), `1${NBSP}247`)
  assert.equal(formatNumber(999999), `999${NBSP}999`)
})

test('formatNumber abrège au-delà du million (zones sans fin)', () => {
  assert.equal(formatNumber(1e6), '1,0 M')
  assert.equal(formatNumber(1.8e6), '1,8 M')
  assert.equal(formatNumber(1.26e7), '12,6 M')
  assert.equal(formatNumber(3.5e8), '350 M')
  assert.equal(formatNumber(2.28e11), '228 Md')
  assert.equal(formatNumber(4.11e15), '4,1 P')
})

test('formatNumber passe en exponentielle quand les suffixes sont épuisés', () => {
  assert.equal(formatNumber(1.2e30), '1,2×10^30')
  assert.match(formatNumber(5e45), /×10\^45$/)
})

test('formatNumber reste lisible sur toute la trajectoire d un run très long', () => {
  // Garde-fou anti « pavé de chiffres » : aucune valeur affichée ne doit dépasser
  // une douzaine de caractères, quelle que soit la profondeur atteinte.
  for (let cycle = 1; cycle <= 30; cycle++) {
    const hp = 700 * Math.pow(7.1, 5 * (cycle - 1))
    const out = formatNumber(hp)
    assert.ok(out.length <= 12, `cycle ${cycle} : « ${out} » (${out.length} caractères)`)
  }
})

test('formatMult garde une décimale pour les petits multiplicateurs', () => {
  // formatNumber arrondirait ×1,69 en « ×1 » : le joueur ne verrait pas son achat.
  assert.equal(formatMult(1.69), '1,7')
  assert.equal(formatMult(2.6), '2,6')
  assert.equal(formatMult(2), '2')
  assert.equal(formatMult(1), '1')
})

test('formatMult repasse à l entier au-delà de 10', () => {
  assert.equal(formatMult(12.4), '12')
  assert.equal(formatMult(159.7), '159')
})
