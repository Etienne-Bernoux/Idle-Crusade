import test from 'node:test'
import assert from 'node:assert/strict'
import { SONS, SON_IDS, GAIN_MAX, VOLUME_DEFAUT, clampVolume, doitJouer, creerLecteur } from './audio.js'

test('le catalogue est une partition complète et jouable', () => {
  assert.ok(SON_IDS.length >= 8, `${SON_IDS.length} sons`)
  for (const id of SON_IDS) {
    const s = SONS[id]
    assert.ok(['sine', 'square', 'triangle', 'sawtooth'].includes(s.type), `${id} : onde « ${s.type} »`)
    assert.ok(s.from > 0 && s.to > 0, `${id} : fréquence nulle`)
    assert.ok(s.dur > 0 && s.dur <= 1, `${id} dure ${s.dur}s — un SFX ne s'installe pas`)
    assert.ok(s.gain > 0 && s.gain <= 1, `${id} : gain ${s.gain}`)
  }
})

test('les moments forts sonnent plus fort que les gestes répétés', () => {
  // La Frappe part plusieurs fois par seconde : si elle sonnait comme la mort
  // d'un boss, le jeu deviendrait insupportable en trente secondes.
  assert.ok(SONS.frappe.gain < SONS.bossMort.gain)
  assert.ok(SONS.frappe.dur < SONS.bossMort.dur)
  assert.ok(SONS.relique.gain < SONS.legendaire.gain)
})

test('aucun son ne peut saturer, quel que soit le volume', () => {
  assert.ok(GAIN_MAX <= 1)
  for (const id of SON_IDS) assert.ok(SONS[id].gain * clampVolume(1) <= 1)
})

test('le volume est borné, même depuis une save trafiquée', () => {
  assert.equal(clampVolume(-3), 0)
  assert.equal(clampVolume(42), 1)
  assert.equal(clampVolume('fort'), VOLUME_DEFAUT)
  assert.equal(clampVolume(undefined), VOLUME_DEFAUT)
  assert.equal(clampVolume(0.3), 0.3)
})

test('rien ne sonne si le son est coupé ou le volume à zéro', () => {
  assert.equal(doitJouer('frappe', { soundOn: true, volume: 0.5 }), true)
  assert.equal(doitJouer('frappe', { soundOn: false, volume: 1 }), false)
  assert.equal(doitJouer('frappe', { soundOn: true, volume: 0 }), false)
  assert.equal(doitJouer('inconnu', { soundOn: true, volume: 1 }), false)
})

test('un navigateur sans Web Audio reste muet, il ne casse pas', () => {
  // Contrainte dure : le son est un confort, jamais une dépendance de la boucle.
  const sansRien = creerLecteur(null)
  assert.equal(sansRien.jouer('frappe', { soundOn: true, volume: 1 }), false)
  assert.doesNotThrow(() => sansRien.reveiller())

  const quiExplose = creerLecteur(() => { throw new Error('interdit') })
  assert.equal(quiExplose.jouer('frappe', { soundOn: true, volume: 1 }), false)
})

test('le lecteur joue quand le contexte répond', () => {
  const appels = []
  const noeud = () => ({ connect: (n) => n, gain: rampe(), frequency: rampe(), start: () => appels.push('start'), stop: () => {}, type: '' })
  function rampe() {
    return { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }
  }
  const faux = {
    currentTime: 0, state: 'running', destination: {},
    createOscillator: noeud, createGain: noeud, resume: () => appels.push('resume'),
  }
  const l = creerLecteur(() => faux)
  assert.equal(l.jouer('frappe', { soundOn: true, volume: 0.8 }), true)
  assert.ok(appels.includes('start'))
})

test('le contexte n est réveillé qu une fois suspendu', () => {
  const appels = []
  const faux = { currentTime: 0, state: 'suspended', destination: {},
    createOscillator: () => ({}), createGain: () => ({}), resume: () => appels.push('resume') }
  creerLecteur(() => faux).reveiller()
  assert.deepEqual(appels, ['resume'], 'les navigateurs interdisent le son avant un geste')
})
