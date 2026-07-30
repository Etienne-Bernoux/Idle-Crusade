import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FRAPPE_BASE, FRAPPE_MAX, FRAPPE_CLICS_PAR_SEC,
  frappeLevel, frappeDamage, frappePrice, buyFrappe, frappeDps,
} from './frappe.js'

test('un clic nu fait quelque chose, et améliorer le fait grandir', () => {
  assert.equal(frappeDamage(0), FRAPPE_BASE)
  assert.ok(frappeDamage(1) > frappeDamage(0))
  assert.ok(frappeDamage(FRAPPE_MAX) > frappeDamage(0) * 6, 'la progression doit se sentir')
})

test('la Frappe suit les multiplicateurs de l armée', () => {
  // Sans ça elle serait morte après deux minutes, et l'améliorer n'aurait
  // aucun sens passé la zone 1.
  assert.equal(frappeDamage(2, 10), frappeDamage(2) * 10)
})

test('le niveau est borné des deux côtés, même depuis une save trafiquée', () => {
  assert.equal(frappeLevel(-5), 0)
  assert.equal(frappeLevel(999), FRAPPE_MAX)
  assert.equal(frappeLevel('douze'), 0)
  assert.equal(frappeLevel(undefined), 0)
  assert.equal(frappeDamage(999), frappeDamage(FRAPPE_MAX), 'pas de dégâts infinis')
})

test('le prix monte, et disparaît au maximum', () => {
  let precedent = 0
  for (let l = 0; l < FRAPPE_MAX; l++) {
    const p = frappePrice(l)
    assert.ok(p > precedent, `le niveau ${l} ne coûte pas plus que le précédent`)
    precedent = p
  }
  assert.equal(frappePrice(FRAPPE_MAX), null)
})

test('le premier niveau est à portée dès les premières secondes', () => {
  // Si le premier achat n'était pas atteignable en cliquant un peu, la
  // mécanique n'aurait aucune boucle.
  assert.ok(frappePrice(0) <= 50, `${frappePrice(0)} est trop cher pour un début`)
})

test('acheter dépense et monte d un cran, jamais au-delà du maximum', () => {
  const r = buyFrappe(0, 1000)
  assert.equal(r.level, 1)
  assert.equal(r.gold, 1000 - frappePrice(0))
  assert.equal(buyFrappe(0, 0), null, 'sans or, rien')
  assert.equal(buyFrappe(FRAPPE_MAX, 1e9), null, 'au maximum, rien')
})

test('la Frappe amorce un run mais ne peut pas le porter', () => {
  // Le garde-fou du pilier idle : elle est bornée par la vitesse d'un doigt.
  // Une armée modeste doit déjà l'écraser, sinon le jeu devient un clicker.
  const frappeMax = frappeDps(FRAPPE_MAX, 1)
  const armeeModeste = 100 * 4          // 100 paysans à 4 dps
  assert.ok(frappeMax < armeeModeste,
    `Frappe max ${Math.round(frappeMax)} dps contre une armée à ${armeeModeste}`)
})

test('sans armée, la Frappe est le SEUL moyen d avancer', () => {
  // La raison d'être de la mécanique : à zéro troupe, il faut cliquer.
  assert.ok(frappeDamage(0) > 0)
  assert.equal(FRAPPE_CLICS_PAR_SEC > 0, true)
})
