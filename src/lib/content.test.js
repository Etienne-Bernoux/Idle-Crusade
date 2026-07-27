import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ZONES, TROOPS, TROOP_ORDER, BASE_DPS, withSprites, troopsWithSprites } from './content.js'

const zoneIds = Object.keys(ZONES).map(Number).sort((a, b) => a - b)

test('les 5 zones sont numérotées de 1 à 5 sans trou', () => {
  assert.deepEqual(zoneIds, [1, 2, 3, 4, 5])
})

test('chaque zone est jouable : vagues, mobs en rotation, boss', () => {
  for (const id of zoneIds) {
    const z = ZONES[id]
    assert.ok(z.name, `zone ${id} sans nom`)
    assert.ok(z.waves >= 1, `zone ${id} sans vague`)
    assert.ok(z.mobs.length > 0, `zone ${id} sans mob`)
    assert.ok(z.boss, `zone ${id} sans boss`)
    for (const e of [...z.mobs, z.boss]) {
      assert.ok(e.name, `ennemi sans nom en zone ${id}`)
      assert.ok(e.hpMax > 0, `${e.name} sans PV`)
      assert.ok(e.gold > 0, `${e.name} sans or`)
      assert.ok(e.sprite || e.spriteKey, `${e.name} sans visuel`)
    }
  }
})

test('la difficulté et les récompenses montent à chaque zone', () => {
  for (let i = 1; i < zoneIds.length; i++) {
    const prev = ZONES[zoneIds[i - 1]]
    const cur = ZONES[zoneIds[i]]
    assert.ok(cur.boss.hpMax > prev.boss.hpMax, `boss zone ${zoneIds[i]} pas plus dur`)
    assert.ok(cur.boss.gold > prev.boss.gold, `boss zone ${zoneIds[i]} pas plus généreux`)
    assert.ok(cur.waves >= prev.waves, `zone ${zoneIds[i]} plus courte que la précédente`)
  }
})

test('le boss d une zone est plus dur que ses propres mobs', () => {
  for (const id of zoneIds) {
    const z = ZONES[id]
    const hardestMob = Math.max(...z.mobs.map(m => m.hpMax))
    assert.ok(z.boss.hpMax > hardestMob, `boss zone ${id} plus faible qu un mob`)
  }
})

test('les tiers de troupes sont ordonnés et cohérents', () => {
  assert.deepEqual(TROOP_ORDER, Object.keys(TROOPS))
  let prevDps = 0
  let prevCost = 0
  for (const id of TROOP_ORDER) {
    const t = TROOPS[id]
    assert.ok(t.dps > prevDps, `${id} pas plus fort que le tier précédent`)
    assert.ok(t.baseCost > prevCost, `${id} pas plus cher que le tier précédent`)
    assert.ok(t.unlockZone >= 1, `${id} sans condition de zone`)
    prevDps = t.dps
    prevCost = t.baseCost
  }
  assert.ok(BASE_DPS > 0, 'le héros doit taper tout seul au démarrage')
})

test('le Champion est le seul tier derrière un achat de Forge', () => {
  const gated = TROOP_ORDER.filter(id => TROOPS[id].requiresMeta)
  assert.deepEqual(gated, ['champion'])
  assert.equal(TROOPS.champion.requiresMeta, 'champion')
})

test('withSprites résout les clés visuelles en URLs', () => {
  const urls = { foret: 'FORET.webp', gobelin: 'GOBELIN.webp' }
  const hydrated = withSprites(ZONES, urls)
  assert.equal(hydrated[1].bg, 'url(FORET.webp)')
  assert.equal(hydrated[1].mobs[0].spriteUrl, 'GOBELIN.webp')
  assert.equal(hydrated[1].mobs[1].spriteUrl, null)      // emoji seul
  assert.equal(hydrated[2].bg, ZONES[2].bg)              // gradient CSS conservé
  assert.equal(hydrated[5].boss.spriteUrl, null)
})

test('withSprites ne mute pas ZONES (le simulateur lit la version pure)', () => {
  withSprites(ZONES, { foret: 'X', gobelin: 'Y' })
  assert.equal(ZONES[1].bg, undefined)
  assert.equal(ZONES[1].mobs[0].spriteUrl, undefined)
  assert.equal(ZONES[1].mobs[0].spriteKey, 'gobelin')
})

test('troopsWithSprites attache une URL à chaque tier', () => {
  const urls = { paysan: 'P', soldat: 'S', chevalier: 'C', champion: 'CH' }
  const hydrated = troopsWithSprites(TROOPS, urls)
  for (const id of TROOP_ORDER) assert.ok(hydrated[id].spriteUrl, `${id} sans sprite`)
  assert.equal(TROOPS.paysan.spriteUrl, undefined, 'la donnée pure ne doit pas être mutée')
})
