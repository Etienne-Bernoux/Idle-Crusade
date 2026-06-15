import { test } from 'node:test'
import assert from 'node:assert/strict'
import { serialize, parseSave, SAVE_VERSION } from './save.js'

test('serialize ne garde que les primitifs durables + version', () => {
  const out = serialize({
    gold: 42, counts: { paysan: 3 }, currentZone: 2, zonesUnlocked: 2,
    // transients qui ne doivent PAS être sérialisés :
    enemy: { hpMax: 999 }, enemyHp: 12, pops: [1, 2], isFlashing: true, lastTickAt: 123,
  })
  assert.deepEqual(Object.keys(out).sort(), [
    'counts', 'currentZone', 'equipped', 'gold', 'inventory', 'nextReliqueUid', 'version', 'zonesUnlocked',
  ])
  assert.equal(out.version, SAVE_VERSION)
  assert.equal(out.gold, 42)
  assert.equal(out.currentZone, 2)
})

test('serialize applique des défauts pour les champs absents (forward-compat)', () => {
  const out = serialize({ gold: 5 })
  assert.equal(out.gold, 5)
  assert.equal(out.zonesUnlocked, 1)
  assert.deepEqual(out.inventory, [])
  assert.deepEqual(out.equipped, { arme: null, armure: null, banniere: null, amulette: null })
  assert.equal(out.nextReliqueUid, 0)
})

test('parseSave : clé absente (null) → null', () => {
  assert.equal(parseSave(null), null)
})

test('parseSave : JSON corrompu → null (pas de throw)', () => {
  assert.equal(parseSave('not json {{'), null)
})

test('parseSave : valeur non-objet → null', () => {
  assert.equal(parseSave('42'), null)
  assert.equal(parseSave('"abc"'), null)
})

test('parseSave : JSON valide → objet', () => {
  const data = parseSave('{"version":1,"gold":7,"currentZone":2}')
  assert.equal(data.gold, 7)
  assert.equal(data.currentZone, 2)
})

test('round-trip serialize → JSON → parseSave', () => {
  const raw = JSON.stringify(serialize({ gold: 100, counts: { paysan: 9 }, currentZone: 2, zonesUnlocked: 2 }))
  const back = parseSave(raw)
  assert.equal(back.gold, 100)
  assert.equal(back.counts.paysan, 9)
  assert.equal(back.version, SAVE_VERSION)
})
