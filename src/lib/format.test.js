import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatNumber, formatMult } from './format.js'

test('formatNumber groupe les milliers et arrondit vers le bas', () => {
  // Le séparateur de fr-FR est U+202F (espace insécable étroit), pas un espace
  // ASCII — l'écrire en clair dans le test le rendrait faussement rouge.
  const NBSP = ' '
  assert.equal(formatNumber(7), '7')
  assert.equal(formatNumber(1247.83), `1${NBSP}247`)
  assert.equal(formatNumber(1000000), `1${NBSP}000${NBSP}000`)
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
