import test from 'node:test'
import assert from 'node:assert/strict'
import {
  LEGENDE_MIN_ZONE, LEGENDE_PER_ZONE, PANTHEON_MULT, PANTHEON,
  legendeGain, canEnterLegende, emptyPantheon, levelOf, buyPantheon,
  pantheonEffects, totalSpent, pantheonById,
} from './legende.js'

test('la Légende ne s ouvre qu à la profondeur prévue', () => {
  assert.equal(canEnterLegende(LEGENDE_MIN_ZONE - 1), false)
  assert.equal(canEnterLegende(LEGENDE_MIN_ZONE), true)
  assert.equal(legendeGain(LEGENDE_MIN_ZONE - 1), 0)
  assert.equal(legendeGain(1), 0)
})

test('le gain est LINÉAIRE en profondeur', () => {
  // C'est tout l'intérêt du système : une formule sous-racine ou logarithmique
  // rendrait la puissance sous-exponentielle, donc le mur reviendrait.
  const a = legendeGain(12)
  const b = legendeGain(13)
  const c = legendeGain(14)
  assert.equal(b - a, LEGENDE_PER_ZONE)
  assert.equal(c - b, LEGENDE_PER_ZONE)
})

test('chaque point dépensé est MULTIPLICATIF, jamais additif', () => {
  // Le défaut exact des Échos : +25% additif donne une puissance linéaire.
  const un = pantheonEffects({ fureur: 1 }).dmgMult
  const deux = pantheonEffects({ fureur: 2 }).dmgMult
  const trois = pantheonEffects({ fureur: 3 }).dmgMult
  assert.ok(Math.abs(deux / un - trois / deux) < 1e-9, 'le rapport doit être constant')
  assert.equal(deux.toFixed(6), Math.pow(PANTHEON_MULT, 2).toFixed(6))
})

test('profondeur linéaire et effet multiplicatif donnent bien une puissance exponentielle', () => {
  // Le test qui justifie l'US : deux zones de plus doivent multiplier la
  // puissance par un facteur CONSTANT, pas lui ajouter un terme constant.
  // C'est la propriété structurelle qui manquait aux Échos.
  const powerAt = zone => pantheonEffects({ fureur: legendeGain(zone) }).dmgMult
  const r1 = powerAt(14) / powerAt(12)
  const r2 = powerAt(16) / powerAt(14)
  assert.ok(Math.abs(r1 - r2) / r1 < 1e-9, `${r1} vs ${r2}`)
  assert.ok(r1 > 1, 'un gain de profondeur doit multiplier la puissance')
  // On n'assert PAS ici qu'un cycle couvre à lui seul la croissance du contenu :
  // une première version le faisait et imposait K ≥ 9, ce qui avalait 23 zones
  // par cycle. C'est l'accumulation entre Légendes qui casse le mur, et cela se
  // mesure au simulateur (`--legende`), pas dans un test unitaire qui
  // recopierait le facteur de croissance des zones.
})

test('un panthéon vierge ne multiplie rien', () => {
  const e = pantheonEffects(emptyPantheon())
  assert.deepEqual(e, { dmgMult: 1, goldMult: 1, relicMult: 1, gloireMult: 1 })
  assert.equal(totalSpent(emptyPantheon()), 0)
})

test('acheter dépense exactement un point et monte exactement un niveau', () => {
  const res = buyPantheon({ fureur: 2 }, 'fureur', 5)
  assert.equal(res.points, 4)
  assert.equal(res.levels.fureur, 3)
})

test('acheter refuse une voie inconnue ou une bourse vide', () => {
  assert.equal(buyPantheon({}, 'inexistante', 10), null)
  assert.equal(buyPantheon({}, 'fureur', 0), null)
})

test('les voies couvrent quatre effets distincts', () => {
  const effets = PANTHEON.map(v => v.effect)
  assert.equal(new Set(effets).size, effets.length, `doublon : ${effets.join(', ')}`)
  assert.equal(effets.length, 4)
})

test('un niveau venu d une save corrompue ne casse pas les effets', () => {
  // Même politique défensive que le reste du projet : une save illisible
  // dégrade, elle ne plante pas.
  assert.equal(levelOf({ fureur: 'douze' }, 'fureur'), 0)
  assert.equal(levelOf({ fureur: -3 }, 'fureur'), 0)
  assert.equal(levelOf(undefined, 'fureur'), 0)
  assert.equal(pantheonEffects({ fureur: NaN }).dmgMult, 1)
})

test('pantheonById répond sur les ids du catalogue et rien d autre', () => {
  assert.equal(pantheonById('fureur').name, 'Fureur Éternelle')
  assert.equal(pantheonById('nope'), null)
})
