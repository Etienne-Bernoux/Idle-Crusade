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
    'buyMode', 'counts', 'currentZone', 'equipped', 'gloire', 'gold', 'inventory',
    'nextReliqueUid', 'prestigeCount', 'treeNodes', 'version', 'wave', 'wavesCleared',
    'zonesCleared', 'zonesUnlocked',
  ])
  assert.equal(out.version, SAVE_VERSION)
  assert.equal(out.gold, 42)
  assert.equal(out.currentZone, 2)
})

test('serialize applique des défauts pour les champs absents (forward-compat)', () => {
  const out = serialize({ gold: 5 })
  assert.equal(out.gold, 5)
  assert.equal(out.wave, 1)
  assert.equal(out.zonesUnlocked, 1)
  assert.deepEqual(out.inventory, [])
  assert.deepEqual(out.equipped, { arme: null, armure: null, banniere: null, amulette: null })
  assert.equal(out.nextReliqueUid, 0)
  assert.equal(out.zonesCleared, 0)
  assert.equal(out.gloire, 0)
  assert.deepEqual(out.treeNodes, [])
  assert.equal(out.prestigeCount, 0)
  assert.equal(out.buyMode, 'x1')
  assert.equal(out.wavesCleared, 0)
})

test('serialize : une save V2 (sans champs de prestige) reste chargeable', () => {
  const v2 = { gold: 900, counts: { paysan: 12 }, currentZone: 5, wave: 3, zonesUnlocked: 5 }
  const out = serialize(v2)
  assert.equal(out.gold, 900)
  assert.equal(out.gloire, 0)
  assert.equal(out.prestigeCount, 0)
  assert.equal(out.zonesCleared, 0)
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

test('migration v1 → v2 : l ancienne Forge devient de la Gloire à re-dépenser', () => {
  const v1 = JSON.stringify({
    version: 1, gold: 100, counts: { paysan: 2 }, currentZone: 2, wave: 3, zonesUnlocked: 2,
    gloire: 7, metaLevels: { fureur: 2, butin: 1 }, prestigeCount: 1,
  })
  const out = parseSave(v1)
  assert.equal(out.version, 2)
  assert.deepEqual(out.treeNodes, [])
  assert.equal(out.gloire, 37)          // 7 + (5+20) + 5 remboursés
  assert.equal(out.metaLevels, undefined)
  assert.equal(out.gold, 100)           // le reste du run est intact
})

test('migration v1 → v2 : un Champion débloqué survit à la migration', () => {
  const v1 = JSON.stringify({ version: 1, gloire: 0, metaLevels: { champion: 1 } })
  const out = parseSave(v1)
  assert.ok(out.treeNodes.includes('guerre-6'), 'le Serment doit être accordé')
  assert.equal(out.treeNodes.length, 6, 'avec sa chaîne de prérequis')
})

test('une save v2 passe sans migration', () => {
  const v2 = JSON.stringify({ version: 2, gold: 5, treeNodes: ['guerre-1'], gloire: 3 })
  const out = parseSave(v2)
  assert.deepEqual(out.treeNodes, ['guerre-1'])
  assert.equal(out.gloire, 3)
})

test('migration : le drapeau `migrated` ne fuit jamais dans la save écrite', () => {
  const migrated = parseSave(JSON.stringify({ version: 1, gloire: 0, metaLevels: { fureur: 1 } }))
  assert.equal(migrated.migrated, true, 'l appelant doit pouvoir le détecter')
  // …mais serialize() ne le reprend pas : la save réécrite est propre.
  assert.equal(serialize(migrated).migrated, undefined)
})
