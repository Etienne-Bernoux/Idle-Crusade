import test from 'node:test'
import assert from 'node:assert/strict'
import { exportSave, parseImport, describeSave, EXPORT_PREFIX, SAVE_VERSION } from './save.js'

// btoa/atob sont des API navigateur : node:test tourne sans DOM.
globalThis.btoa ??= s => Buffer.from(s, 'binary').toString('base64')
globalThis.atob ??= s => Buffer.from(s, 'base64').toString('binary')

const PARTIE = {
  gold: 1234, counts: { paysan: 50, soldat: 20 }, currentZone: 7, zonesUnlocked: 7,
  deepestEver: 14, prestigeCount: 9, legendeCount: 2, achievements: ['boss-1', 'boss-5'],
  biome: 'maudites',
}

test('un aller-retour rend exactement la même partie', () => {
  const r = parseImport(exportSave(PARTIE))
  assert.ok(r.ok, r.reason)
  assert.equal(r.data.gold, 1234)
  assert.equal(r.data.currentZone, 7)
  assert.equal(r.data.deepestEver, 14)
  assert.deepEqual(r.data.counts, { paysan: 50, soldat: 20 })
  assert.deepEqual(r.data.achievements, ['boss-1', 'boss-5'])
  assert.equal(r.data.version, SAVE_VERSION)
})

test('le code survit aux accents', () => {
  // btoa seul jette sur du non-latin-1 : les biomes et reliques sont accentués.
  const r = parseImport(exportSave({ ...PARTIE, biome: 'Terres Maudites — Élu du Ciel ✨' }))
  assert.ok(r.ok, r.reason)
  assert.equal(r.data.biome, 'Terres Maudites — Élu du Ciel ✨')
})

test('le code se reconnaît à l œil', () => {
  assert.ok(exportSave(PARTIE).startsWith(EXPORT_PREFIX))
})

test('tout ce qui n est pas un code est refusé avec une raison lisible', () => {
  for (const mauvais of ['', '   ', 'nawak', '{"gold":5}', null, undefined, 42]) {
    const r = parseImport(mauvais)
    assert.equal(r.ok, false, `« ${mauvais} » a été accepté`)
    assert.ok(r.reason && r.reason.length > 10, 'la raison doit être montrable au joueur')
  }
})

test('un code tronqué à la copie est détecté, pas chargé à moitié', () => {
  // Le cas réel : on sélectionne mal dans un champ texte.
  const code = exportSave(PARTIE)
  const r = parseImport(code.slice(0, Math.floor(code.length / 2)))
  assert.equal(r.ok, false)
})

test('un JSON valide qui n est pas une partie est refusé', () => {
  // parseSave accepterait n'importe quel objet : sans ce garde-fou, importer
  // « {"bonjour":1} » écraserait la partie par du vide.
  const faux = EXPORT_PREFIX + Buffer.from('{"bonjour":1}', 'binary').toString('base64')
  const r = parseImport(faux)
  assert.equal(r.ok, false)
  assert.match(r.reason, /progression/)
})

test('une save ANCIENNE exportée reste importable — la migration s applique', () => {
  const v3 = EXPORT_PREFIX + Buffer.from(
    JSON.stringify({ version: 3, gold: 9, treeNodes: ['racine', 'couronne'], gloire: 10 }), 'binary',
  ).toString('base64')
  const r = parseImport(v3)
  assert.ok(r.ok, r.reason)
  assert.equal(r.data.version, SAVE_VERSION)
  assert.deepEqual(r.data.treeNodes, ['racine'], 'la couronne supprimée doit disparaître')
  assert.ok(r.data.gloire > 10, 'et être remboursée')
})

test('describeSave montre ce qu on s apprête à écraser', () => {
  const r = parseImport(exportSave(PARTIE))
  assert.deepEqual(describeSave(r.data), {
    zone: 7, record: 14, croisades: 9, legendes: 2, succes: 2,
  })
  assert.equal(describeSave(null), null)
})
