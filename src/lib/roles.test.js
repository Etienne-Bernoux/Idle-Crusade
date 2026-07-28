import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ROLES, roleValue, roleProgress, roleEffects, roleCaps, countToCap } from './roles.js'
import { TROOP_ORDER } from './content.js'

test('chaque tier a un rôle, et les quatre rôles sont DIFFÉRENTS', () => {
  // C'est tout l'objet de l'US : quatre troupes qui ne font pas la même chose.
  assert.deepEqual(Object.keys(ROLES).sort(), [...TROOP_ORDER].sort())
  const effects = Object.values(ROLES).map(r => r.effect)
  assert.equal(new Set(effects).size, 4, `doublons : ${effects.join(', ')}`)
})

test('chaque rôle est présentable et borné', () => {
  for (const [id, r] of Object.entries(ROLES)) {
    assert.ok(r.name && r.sprite && r.desc && r.unit, `${id} pas présentable`)
    assert.ok(r.per >= 1, `${id} : seuil invalide`)
    assert.ok(r.amount > 0, `${id} : apport nul`)
    assert.ok(r.cap > 0 && r.cap < Infinity, `${id} : plafond manquant`)
  }
})

test('un rôle ne rapporte rien avant son premier seuil', () => {
  assert.equal(roleValue('paysan', 0), 0)
  assert.equal(roleValue('paysan', 24), 0)
  assert.equal(roleValue('paysan', 25), 1)
  assert.equal(roleValue('soldat', 4), 0)
  assert.equal(roleValue('soldat', 5), 1)
})

test('un rôle progresse par paliers, pas continûment', () => {
  // 25 → 1, 49 → 1, 50 → 2 : le joueur voit le palier tomber.
  assert.equal(roleValue('paysan', 49), 1)
  assert.equal(roleValue('paysan', 50), 2)
  assert.equal(roleValue('soldat', 27), 5)
})

test('chaque rôle PLAFONNE : aucun ne peut casser le jeu', () => {
  for (const [id, r] of Object.entries(ROLES)) {
    assert.equal(roleValue(id, 1e9), r.cap, `${id} dépasse son plafond`)
  }
})

test('le pas du Champion reste propre en flottant', () => {
  // 0,25 par unité : une addition naïve donnerait 0,7500000000000001.
  assert.equal(roleValue('champion', 3), 0.75)
  assert.equal(roleValue('champion', 7), 1.75)
})

test('roleProgress annonce le prochain palier, puis s arrête au plafond', () => {
  const p = roleProgress('paysan', 18)
  assert.equal(p.current, 0)
  assert.equal(p.next, 1)
  assert.equal(p.missing, 7, 'encore 7 paysans pour le premier point')

  const capped = roleProgress('paysan', 1e9)
  assert.equal(capped.next, null, 'au plafond, plus rien à annoncer')
  assert.equal(capped.current, ROLES.paysan.cap)
})

test('roleProgress tolère un tier inconnu', () => {
  assert.equal(roleProgress('nawak', 10), null)
  assert.equal(roleValue('nawak', 10), 0)
})

test('roleEffects agrège la composition en un seul objet', () => {
  const e = roleEffects({ paysan: 100, soldat: 50, chevalier: 10, champion: 4 })
  assert.equal(e.critChance, 4)       // 100 / 25
  assert.equal(e.armyDmgPct, 10)      // 50 / 5
  assert.equal(e.armorPen, 10)        // 1 par chevalier
  assert.equal(e.critMultBonus, 1)    // 4 × 0,25
})

test('roleEffects est neutre sur une armée vide', () => {
  assert.deepEqual(roleEffects({}), { critChance: 0, armyDmgPct: 0, armorPen: 0, critMultBonus: 0 })
  assert.deepEqual(roleEffects(), { critChance: 0, armyDmgPct: 0, armorPen: 0, critMultBonus: 0 })
})

test('les plafonds sont ATTEIGNABLES en pratique, pas décoratifs', () => {
  // Un plafond qu'aucune partie réelle n'atteint ne sert à rien. On se cale sur
  // les effectifs observés au simulateur : ~200 paysans, ~100 soldats, quelques
  // dizaines de chevaliers, une poignée de champions.
  const caps = roleCaps()
  assert.equal(countToCap('paysan'), 625)
  assert.equal(countToCap('soldat'), 250)
  assert.equal(countToCap('chevalier'), 40)
  assert.equal(countToCap('champion'), 12)
  // Le Champion coûte 10 000 de base : 12 exemplaires est un objectif de fin de
  // partie, pas une formalité.
  assert.ok(caps.champion > 0)
})

test('les rôles créent des SYNERGIES entre tiers, pas des silos', () => {
  // Paysans (fréquence des crits) + Champions (puissance des crits) : ni l'un ni
  // l'autre ne vaut autant seul que les deux ensemble. C'est ce qui fait qu'une
  // composition se pense.
  const seuls = roleEffects({ paysan: 500 })
  const ensemble = roleEffects({ paysan: 500, champion: 8 })
  assert.equal(seuls.critMultBonus, 0)
  assert.ok(ensemble.critChance > 0 && ensemble.critMultBonus > 0)
})
