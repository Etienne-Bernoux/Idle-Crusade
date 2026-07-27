import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ACTIVES, ACTIVE_IDS, activeById, emptyActiveState, isActiveUnlocked,
  activeTimings, activeEffects, freshActiveState,
} from './actives.js'

test('la Potion de Soin a disparu du catalogue', () => {
  // Elle promettait de soigner des PV que l'armée n'a pas. Remplacée par la
  // Potion de Rage, qui exploite les critiques.
  const names = ACTIVES.map(a => a.name)
  assert.ok(!names.some(n => n.includes('Soin')), `encore présente : ${names.join(', ')}`)
  assert.ok(names.includes('Potion de Rage'))
})

test('quatre actifs, ids uniques, tous présentables', () => {
  assert.equal(ACTIVES.length, 4)
  assert.equal(new Set(ACTIVE_IDS).size, 4)
  for (const a of ACTIVES) {
    assert.ok(a.name && a.sprite && a.desc, `${a.id} pas présentable`)
    assert.ok(a.durationMs > 0 && a.cooldownMs > 0, `${a.id} mal borné`)
    assert.ok(Object.keys(a.effect).length > 0, `${a.id} sans effet`)
  }
})

test('chaque actif exploite une mécanique DIFFÉRENTE', () => {
  // Sinon ce ne sont que des variantes du même bouton.
  const kinds = ACTIVES.map(a => Object.keys(a.effect)[0])
  assert.equal(new Set(kinds).size, ACTIVES.length, `doublons : ${kinds.join(', ')}`)
})

test('un actif reste un ACTE : sa durée est plus courte que son cooldown', () => {
  for (const a of ACTIVES) {
    assert.ok(a.cooldownMs > a.durationMs, `${a.id} serait presque toujours actif`)
  }
})

test('les actifs se débloquent progressivement, le Cri d emblée', () => {
  assert.ok(isActiveUnlocked('warcry', 1))
  assert.equal(isActiveUnlocked('rage', 1), false)
  assert.ok(isActiveUnlocked('rage', 2))
  assert.ok(isActiveUnlocked('ferveur', 4))
  assert.equal(isActiveUnlocked('inconnu', 99), false)
  // Chaque actif a un palier distinct : on ne noie pas le joueur.
  const zones = ACTIVES.map(a => a.unlockZone)
  assert.equal(new Set(zones).size, ACTIVES.length)
})

test('l état initial : tout prêt, rien d actif', () => {
  const st = emptyActiveState()
  for (const id of ACTIVE_IDS) {
    assert.equal(st[id].active, false)
    assert.equal(st[id].ready, true)
  }
})

test('un état frais est reconstruit au chargement, jamais persisté', () => {
  // Un buff figé par un rechargement au mauvais moment serait permanent.
  assert.deepEqual(freshActiveState(), emptyActiveState())
})

test('activeEffects est neutre quand rien n est actif', () => {
  assert.deepEqual(activeEffects(emptyActiveState()), {
    dmgMult: 1, goldMult: 1, critBonus: 0, ignoreArmor: false,
  })
  assert.deepEqual(activeEffects({}), { dmgMult: 1, goldMult: 1, critBonus: 0, ignoreArmor: false })
})

test('activeEffects agrège les actifs en cours', () => {
  const st = { ...emptyActiveState(), warcry: { active: true, ready: false }, rage: { active: true, ready: false } }
  const e = activeEffects(st)
  assert.equal(e.dmgMult, 2)
  assert.equal(e.critBonus, 40)
  assert.equal(e.ignoreArmor, false)
})

test('activeEffects : Percée et Ferveur se cumulent au reste', () => {
  const st = {
    ...emptyActiveState(),
    warcry: { active: true, ready: false },
    percee: { active: true, ready: false },
    ferveur: { active: true, ready: false },
  }
  const e = activeEffects(st)
  assert.equal(e.dmgMult, 2)
  assert.equal(e.goldMult, 3)
  assert.ok(e.ignoreArmor)
})

test('activeTimings : le cooldown de l Arbre s applique à TOUS les actifs', () => {
  for (const a of ACTIVES) {
    const t = activeTimings(a.id, { cooldownMult: 0.5 })
    assert.equal(t.cooldownMs, Math.round(a.cooldownMs * 0.5), a.id)
  }
})

test('activeTimings : les bonus de DURÉE du Cri ne touchent que le Cri', () => {
  const opts = { warCryDurationMult: 2, biomeWarCryDurMult: 2 }
  assert.equal(activeTimings('warcry', opts).durationMs, 10000 * 4)
  for (const a of ACTIVES.filter(x => x.id !== 'warcry')) {
    assert.equal(activeTimings(a.id, opts).durationMs, a.durationMs, a.id)
  }
})

test('activeTimings : le cooldown de biome ne touche que le Cri', () => {
  const opts = { biomeWarCryCdMult: 0.5 }
  assert.equal(activeTimings('warcry', opts).cooldownMs, 25000 * 0.5)
  assert.equal(activeTimings('rage', opts).cooldownMs, 40000)
})

test('activeTimings : plancher de cooldown à une seconde', () => {
  const t = activeTimings('warcry', { cooldownMult: 0.0001 })
  assert.equal(t.cooldownMs, 1000, 'un actif ne doit jamais devenir un état permanent')
})

test('activeById tolère l inconnu', () => {
  assert.equal(activeById('nawak'), null)
  assert.deepEqual(activeTimings('nawak'), { durationMs: 0, cooldownMs: 0 })
})
