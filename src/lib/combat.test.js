import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ENEMY_TYPES, TROOP_AFFINITY, STRONG_MULT, WEAK_MULT, MAX_ARMOR,
  BASE_CRIT_CHANCE, BASE_CRIT_MULT,
  affinityMult, affinityLabel, armorMult, rollCrit, critOverflow, computeHit, averageHit,
} from './combat.js'

// rng déterministe : renvoie successivement les valeurs fournies.
const seq = (values) => { let i = 0; return () => values[i++ % values.length] }
const never = () => 0.999   // jamais de crit
const always = () => 0      // toujours crit

test('les cinq types sont présentables et les affinités les référencent tous', () => {
  const known = Object.keys(ENEMY_TYPES)
  assert.equal(known.length, 5)
  for (const t of Object.values(ENEMY_TYPES)) assert.ok(t.name && t.sprite)
  const cited = new Set(Object.values(TROOP_AFFINITY).flatMap(a => [...a.strong, ...a.faible]))
  for (const type of cited) assert.ok(known.includes(type), `type inconnu cité : ${type}`)
})

test('chaque tier a un profil d affinité DISTINCT', () => {
  // Sinon la composition d armée n aurait aucun intérêt tactique.
  const signatures = Object.values(TROOP_AFFINITY).map(a => JSON.stringify(a))
  assert.equal(new Set(signatures).size, signatures.length)
})

test('tout tier sauf le Champion a une faiblesse', () => {
  for (const [id, aff] of Object.entries(TROOP_AFFINITY)) {
    if (id === 'champion') continue
    assert.ok(aff.faible.length > 0, `${id} devrait avoir une faiblesse`)
    assert.ok(aff.strong.length > 0, `${id} devrait avoir une force`)
  }
})

test('affinityMult applique force, faiblesse, ou neutralité', () => {
  assert.equal(affinityMult('paysan', 'bete'), STRONG_MULT)
  assert.equal(affinityMult('paysan', 'construct'), WEAK_MULT)
  assert.equal(affinityMult('paysan', 'demon'), 1)
  assert.equal(affinityMult('paysan', null), 1)
  assert.equal(affinityMult('inconnu', 'bete'), 1)
})

test('affinityLabel donne à l UI de quoi afficher un pictogramme', () => {
  assert.equal(affinityLabel('soldat', 'mortvivant'), 'strong')
  assert.equal(affinityLabel('soldat', 'ombre'), 'faible')
  assert.equal(affinityLabel('soldat', 'bete'), null)
})

test('l armure réduit les dégâts, sans jamais rendre invincible', () => {
  assert.equal(armorMult(0), 1)
  assert.equal(armorMult(50), 0.5)
  assert.equal(armorMult(MAX_ARMOR), 1 - MAX_ARMOR / 100)
  // Au-delà du plafond, on ne descend pas plus bas.
  assert.equal(armorMult(99), armorMult(MAX_ARMOR))
  assert.equal(armorMult(-20), 1)
})

test('un critique IGNORE l armure', () => {
  assert.equal(armorMult(60, true), 1)
})

test('rollCrit suit la probabilité annoncée', () => {
  assert.equal(rollCrit(() => 0.05, 8), true)     // 5 < 8
  assert.equal(rollCrit(() => 0.5, 8), false)     // 50 > 8
  assert.equal(rollCrit(never, 0), false, 'une chance nulle ne crit jamais')
  assert.equal(rollCrit(always, 100), true, 'une chance de 100% crit toujours')
})

test('computeHit compose affinités, armure et critique', () => {
  // Armée : 100 de paysan (fort vs bête → ×1,5) + 100 de soldat (neutre).
  const base = { troopDps: { paysan: 100, soldat: 100 }, enemyType: 'bete', rng: never }
  assert.equal(computeHit(base).damage, 250)            // 150 + 100
  // Contre un construct : paysan faible (×0,7), chevalier fort (×1,5).
  const other = computeHit({ troopDps: { paysan: 100, chevalier: 100 }, enemyType: 'construct', rng: never })
  assert.equal(other.damage, 70 + 150)
})

test('computeHit : le héros tape indépendamment des affinités', () => {
  const r = computeHit({ heroDps: 50, troopDps: { paysan: 100 }, enemyType: 'construct', rng: never })
  assert.equal(r.damage, 50 + 70)
})

test('computeHit : un critique multiplie ET perce l armure', () => {
  const args = { troopDps: { soldat: 100 }, armorPct: 60 }
  const normal = computeHit({ ...args, rng: never })
  const crit = computeHit({ ...args, rng: always })
  assert.equal(normal.crit, false)
  assert.equal(crit.crit, true)
  assert.equal(normal.damage, 40)                               // 100 × (1 − 0,6)
  assert.equal(crit.damage, 100 * BASE_CRIT_MULT)               // armure ignorée
  assert.equal(crit.damage / normal.damage, 7.5, 'le crit doit être spectaculaire sur un blindé')
})

test('computeHit ne renvoie jamais moins de 1 dégât', () => {
  const r = computeHit({ troopDps: { paysan: 0 }, heroDps: 0, armorPct: MAX_ARMOR, rng: never })
  assert.equal(r.damage, 1)
})

test('computeHit applique le multiplicateur global (reliques, arbre, Cri)', () => {
  const r = computeHit({ troopDps: { soldat: 100 }, globalMult: 3, rng: never })
  assert.equal(r.damage, 300)
})

test('averageHit est l espérance de computeHit', () => {
  const args = { troopDps: { soldat: 1000 }, armorPct: 50, critChancePct: 20, critMult: 3 }
  // 80% × (1000 × 0,5) + 20% × (1000 × 3) = 400 + 600 = 1000
  assert.equal(averageHit(args), 1000)
})

test('averageHit converge vers la moyenne empirique de computeHit', () => {
  const args = { troopDps: { chevalier: 500 }, enemyType: 'demon', armorPct: 40, critChancePct: 25 }
  const expected = averageHit(args)
  let total = 0
  const N = 20000
  // rng pseudo-aléatoire déterministe (pas de Math.random : test reproductible).
  let seed = 42
  const rng = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
  for (let i = 0; i < N; i++) total += computeHit({ ...args, rng }).damage
  const empirical = total / N
  const drift = Math.abs(empirical - expected) / expected
  assert.ok(drift < 0.05, `écart ${(drift * 100).toFixed(1)}% entre théorie (${expected.toFixed(0)}) et tirages (${empirical.toFixed(0)})`)
})

test('les constantes de base sont dans des ordres jouables', () => {
  assert.ok(BASE_CRIT_CHANCE > 0 && BASE_CRIT_CHANCE < 25, 'un crit doit rester un événement')
  assert.ok(BASE_CRIT_MULT >= 2, 'et valoir le coup quand il tombe')
})

test('la pénétration réduit l armure effective, sans jamais la rendre négative', () => {
  assert.equal(armorMult(50, false, 20), 0.7)   // 50 − 20 = 30% encaissés
  assert.equal(armorMult(50, false, 50), 1)     // annulée
  assert.equal(armorMult(50, false, 90), 1, 'pas de bonus au-delà de l annulation')
  assert.equal(armorMult(0, false, 30), 1)
  assert.equal(armorMult(50, false, -10), 0.5, 'une pénétration négative est ignorée')
})

test('un critique reste supérieur à la pénétration (il annule tout)', () => {
  const args = { troopDps: { soldat: 100 }, armorPct: 60, armorPen: 30 }
  const penetre = computeHit({ ...args, rng: () => 0.999 })
  const crit = computeHit({ ...args, rng: () => 0 })
  assert.equal(penetre.damage, 70)                    // 60 − 30 = 30% encaissés
  assert.equal(crit.damage, 100 * BASE_CRIT_MULT)     // armure ignorée entièrement
})

test('averageHit tient compte de la pénétration', () => {
  const sans = averageHit({ troopDps: { soldat: 1000 }, armorPct: 40, critChancePct: 0 })
  const avec = averageHit({ troopDps: { soldat: 1000 }, armorPct: 40, armorPen: 40, critChancePct: 0 })
  assert.equal(sans, 600)
  assert.equal(avec, 1000)
})

// --- Débordement de critique (US 44) ---

test('sous le plafond, rien ne change', () => {
  const r = critOverflow(60, 3)
  assert.equal(r.chance, 60)
  assert.equal(r.mult, 3)
})

test('le plafond de chance reste dur à 100', () => {
  assert.equal(critOverflow(183, 3).chance, 100)
  assert.equal(critOverflow(1e6, 3).chance, 100)
})

test('le surplus part en puissance, pas à la poubelle', () => {
  // 50 points au-dessus du plafond, à ×3 : chacun vaut (3-1)/100 = 0,02.
  assert.equal(critOverflow(150, 3).mult, 4)
  assert.equal(critOverflow(200, 6).mult, 11)
})

test('franchir le plafond ne fait jamais perdre de dégâts', () => {
  // Le point 100 → 101 doit valoir au moins autant que le point 99 → 100.
  const coup = (pts) => averageHit({ heroDps: 1000, critChancePct: pts, critMult: 4 })
  const avant = coup(100) - coup(99)
  const apres = coup(101) - coup(100)
  assert.ok(apres > 0, `le point au-dessus du plafond vaut ${apres}`)
  assert.ok(apres <= avant * 1.001, `${apres} ne doit pas dépasser ${avant}`)
})

test('avec de l armure, le surplus rend moins que sa valeur sous le plafond', () => {
  // Conservateur par construction : un critique ignore l'armure, donc un point
  // sous le plafond valait DAVANTAGE que ce qu'on rend au-dessus.
  const coup = (pts) => averageHit({ heroDps: 1000, armorPct: 60, critChancePct: pts, critMult: 4 })
  assert.ok(coup(101) - coup(100) < coup(100) - coup(99))
})

test('un critMult de 1 ne fabrique rien à partir de rien', () => {
  assert.equal(critOverflow(300, 1).mult, 1)
})

test('la saturation ne gèle plus la progression', () => {
  // Le cas qui a motivé l'US : 91 points sans relique, +110 avec.
  const coup = (pts) => averageHit({ heroDps: 1000, critChancePct: pts, critMult: 6 })
  assert.ok(coup(201) > coup(91) * 1.5, `${coup(91)} → ${coup(201)}`)
})
