import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MILESTONES, MILESTONE_MULT, milestoneMult, nextMilestone,
  UPGRADE_KINDS, upgradePrice, levelOf, buyTroopUpgrade,
  troopDmgMult, globalEffects, sanitizeTroopUpgrades, emptyTroopUpgrades,
} from './upgrades.js'

const TROOPS = ['paysan', 'soldat', 'chevalier', 'champion']

test('les paliers doublent le dps à chaque seuil franchi', () => {
  assert.equal(milestoneMult(0), 1)
  assert.equal(milestoneMult(24), 1)
  assert.equal(milestoneMult(25), 2)
  assert.equal(milestoneMult(99), 2)
  assert.equal(milestoneMult(100), 4)
  assert.equal(milestoneMult(400), 8)
  // Au-delà du dernier seuil, plus de gain automatique : la suite s'achète.
  assert.equal(milestoneMult(10000), 8)
})

test('les seuils sont strictement croissants', () => {
  for (let i = 1; i < MILESTONES.length; i++) {
    assert.ok(MILESTONES[i] > MILESTONES[i - 1])
  }
  assert.ok(MILESTONE_MULT > 1)
})

test('nextMilestone annonce le prochain palier, puis null', () => {
  assert.equal(nextMilestone(0), 25)
  assert.equal(nextMilestone(25), 100)
  assert.equal(nextMilestone(399), 400)
  assert.equal(nextMilestone(400), null)
})

test('le catalogue couvre trois effets distincts', () => {
  const effects = new Set(UPGRADE_KINDS.map(k => k.effect))
  assert.deepEqual([...effects].sort(), ['globalDmg', 'gold', 'tierDmg'])
  for (const k of UPGRADE_KINDS) {
    assert.ok(k.name && k.sprite, `${k.id} pas présentable`)
    assert.ok(k.maxLevel >= 1 && k.costFactor > 0, `${k.id} mal borné`)
  }
})

test('le prix monte ×5 par niveau et dépend du tier', () => {
  // Paysan (base 10) : 10 × 150 = 1 500, puis 7 500, 37 500…
  assert.equal(upgradePrice('entrainement', 0, 10), 1500)
  assert.equal(upgradePrice('entrainement', 1, 10), 7500)
  assert.equal(upgradePrice('entrainement', 2, 10), 37500)
  // Chevalier (base 1000) : cent fois plus cher au même niveau.
  assert.equal(upgradePrice('entrainement', 0, 1000), 150000)
})

test('upgradePrice → null au max et pour une ligne inconnue', () => {
  assert.equal(upgradePrice('entrainement', 5, 10), null)
  assert.equal(upgradePrice('banniere', 3, 10), null)
  assert.equal(upgradePrice('nawak', 0, 10), null)
})

test('buyTroopUpgrade débite l or et monte le niveau', () => {
  const res = buyTroopUpgrade(emptyTroopUpgrades(TROOPS), 'paysan', 'entrainement', 2000, 10)
  assert.equal(res.gold, 500)
  assert.equal(levelOf(res.troopUpgrades, 'paysan', 'entrainement'), 1)
})

test('buyTroopUpgrade est pur : la structure passée n est pas mutée', () => {
  const before = emptyTroopUpgrades(TROOPS)
  buyTroopUpgrade(before, 'paysan', 'entrainement', 2000, 10)
  assert.equal(levelOf(before, 'paysan', 'entrainement'), 0)
})

test('buyTroopUpgrade refuse sans or, ou au niveau max', () => {
  assert.equal(buyTroopUpgrade({}, 'paysan', 'entrainement', 1499, 10), null)
  assert.equal(buyTroopUpgrade({ paysan: { entrainement: 5 } }, 'paysan', 'entrainement', 1e9, 10), null)
})

test('buyTroopUpgrade n abîme pas les autres tiers', () => {
  const start = { soldat: { equipement: 2 } }
  const res = buyTroopUpgrade(start, 'paysan', 'entrainement', 2000, 10)
  assert.equal(levelOf(res.troopUpgrades, 'soldat', 'equipement'), 2)
})

test('troopDmgMult combine paliers et améliorations du tier', () => {
  // 25 unités = ×2 de paliers ; Entraînement 1 = ×1.3 → ×2.6
  const up = { paysan: { entrainement: 1 } }
  assert.equal(troopDmgMult(up, 'paysan', 25).toFixed(2), '2.60')
  // Entraînement 1 (×1.3) + Équipement 1 (×1.4) = ×1.82, sans palier
  const both = { paysan: { entrainement: 1, equipement: 1 } }
  assert.equal(troopDmgMult(both, 'paysan', 0).toFixed(2), '1.82')
})

test('troopDmgMult ignore les bonus globaux (ils sont transverses)', () => {
  const up = { paysan: { banniere: 3, pillage: 3 } }
  assert.equal(troopDmgMult(up, 'paysan', 0), 1)
})

test('troopDmgMult d un tier non amélioré vaut ses seuls paliers', () => {
  const up = { paysan: { entrainement: 5 } }
  assert.equal(troopDmgMult(up, 'soldat', 25), 2)
})

test('globalEffects additionne bannières et pillages de tous les tiers', () => {
  const up = { paysan: { banniere: 2 }, soldat: { banniere: 1, pillage: 2 } }
  const e = globalEffects(up)
  assert.equal(e.dmgMult.toFixed(2), '1.30')   // 3 bannières × 10%
  assert.equal(e.goldMult.toFixed(2), '1.30')  // 2 pillages × 15%
})

test('globalEffects est neutre sans amélioration', () => {
  assert.deepEqual(globalEffects({}), { dmgMult: 1, goldMult: 1 })
  assert.deepEqual(globalEffects(undefined), { dmgMult: 1, goldMult: 1 })
})

test('le gain maximal par tier reste borné et connu', () => {
  // Garde-fou : paliers (×8) × Entraînement (1.3^5) × Équipement (1.4^5) ≈ ×160.
  // Calibré au simulateur : au-delà, les améliorations écrasaient le reste du jeu
  // (premier run divisé par deux). Voir le plan d'US 17 § Calibrage.
  const maxed = { paysan: { entrainement: 5, equipement: 5 } }
  const mult = troopDmgMult(maxed, 'paysan', 999)
  assert.ok(mult > 100, `mult=${mult} : le levier doit rester spectaculaire`)
  assert.ok(mult < 500, `mult=${mult} : mais pas écraser le recrutement`)
})

test('sanitize écarte tiers inconnus, valeurs absurdes, et clampe au max', () => {
  const raw = {
    paysan: { entrainement: 3, nawak: 9 },
    inconnu: { entrainement: 2 },
    soldat: { equipement: 99, banniere: -4, pillage: 1.7 },
    chevalier: 'pas un objet',
  }
  const clean = sanitizeTroopUpgrades(raw, TROOPS)
  assert.deepEqual(clean.paysan, { entrainement: 3 })
  assert.equal(clean.inconnu, undefined)
  assert.deepEqual(clean.soldat, { equipement: 5, pillage: 1 })
  assert.equal(clean.chevalier, undefined)
})

test('sanitize d une save vide donne une structure vide, pas un plantage', () => {
  assert.deepEqual(sanitizeTroopUpgrades(undefined, TROOPS), {})
  assert.deepEqual(sanitizeTroopUpgrades({}, TROOPS), {})
})
