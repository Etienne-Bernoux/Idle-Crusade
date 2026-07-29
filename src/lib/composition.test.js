import test from 'node:test'
import assert from 'node:assert/strict'
import { compositionValue, bestNextStep, ROLE_EFFECT_KEY, NEUTRAL_ROLES, MIN_VISIBLE_GAIN } from './composition.js'
import { roleEffects, ROLES } from './roles.js'

// Contexte de combat représentatif : un boss blindé et typé, comme celui contre
// lequel la composition compte le plus.
const CTX = {
  heroDps: 10,
  troopDps: { paysan: 400, soldat: 600, chevalier: 900, champion: 1200 },
  enemyType: 'demon',
  armorPct: 55,
  critChanceBase: 8,
  critMultBase: 3,
  globalMult: 1,
}

test('la table des effets colle exactement à roleEffects', () => {
  // Si les deux divergent, la contribution par tier devient un mensonge.
  const fx = roleEffects({ paysan: 100, soldat: 100, chevalier: 100, champion: 100 })
  for (const [tier, key] of Object.entries(ROLE_EFFECT_KEY)) {
    assert.ok(key in fx, `${tier} pointe vers « ${key} », absent de roleEffects`)
    assert.equal(key, ROLES[tier].effect)
  }
  assert.deepEqual(Object.keys(NEUTRAL_ROLES).sort(), Object.keys(fx).sort())
})

test('une armée sans rôle ne vaut ni plus ni moins que sa somme', () => {
  // Sous les premiers seuils, aucun rôle n'est actif : le ratio doit valoir 1.
  const r = compositionValue({ paysan: 1, soldat: 1, chevalier: 0, champion: 0 }, {}, CTX)
  assert.equal(r.ratio.toFixed(3), '1.000')
})

test('une composition pensée bat nettement un empilement mono-tier', () => {
  // Le fait mesuré en US 24, rendu vérifiable : c'est tout l'objet du module.
  const mono = compositionValue({ paysan: 600, soldat: 0, chevalier: 0, champion: 0 }, {}, CTX)
  const mixte = compositionValue({ paysan: 200, soldat: 150, chevalier: 45, champion: 8 }, {}, CTX)
  assert.ok(mixte.ratio > mono.ratio,
    `mixte ×${mixte.ratio.toFixed(2)} devrait battre mono ×${mono.ratio.toFixed(2)}`)
  assert.ok(mixte.ratio > 1.5, `×${mixte.ratio.toFixed(2)} : le levier doit être franc`)
})

test('la contribution par tier est marginale, pas absolue', () => {
  const counts = { paysan: 200, soldat: 150, chevalier: 45, champion: 8 }
  const r = compositionValue(counts, {}, CTX)
  for (const tier of Object.keys(ROLE_EFFECT_KEY)) {
    assert.ok(r.per[tier].gain >= 1, `${tier} : ${r.per[tier].gain}`)
    assert.ok(r.per[tier].progress, `${tier} sans progression`)
  }
  // Un tier absent ne rapporte rien : sans lui, retirer son rôle ne change rien.
  const sansChampion = compositionValue({ ...counts, champion: 0 }, {}, CTX)
  assert.equal(sansChampion.per.champion.gain.toFixed(3), '1.000')
})

test('contre une cible blindée, la pénétration du Chevalier pèse', () => {
  const counts = { paysan: 200, soldat: 150, chevalier: 45, champion: 8 }
  const blinde = compositionValue(counts, {}, { ...CTX, armorPct: 80 })
  const nu = compositionValue(counts, {}, { ...CTX, armorPct: 0 })
  assert.ok(blinde.per.chevalier.gain > nu.per.chevalier.gain,
    'la Charge doit valoir davantage contre une armure épaisse')
})

test('le conseil désigne un tier réel, et un gain réel', () => {
  const counts = { paysan: 40, soldat: 10, chevalier: 2, champion: 0 }
  const step = bestNextStep(counts, {}, CTX)
  assert.ok(step, 'un conseil doit exister quand rien n est plafonné')
  assert.ok(ROLE_EFFECT_KEY[step.tier], `tier inconnu : ${step.tier}`)
  assert.ok(step.missing > 0)
  assert.ok(step.gain > 0)
  // Et le conseil doit être tenu : recruter ce qu'il dit donne bien ce ratio.
  const suivi = compositionValue({ ...counts, [step.tier]: counts[step.tier] + step.missing }, {}, CTX)
  assert.equal(suivi.ratio.toFixed(4), step.ratio.toFixed(4))
})

test('le conseil respecte les tiers débloqués', () => {
  const counts = { paysan: 40, soldat: 0, chevalier: 0, champion: 0 }
  const step = bestNextStep(counts, {}, CTX, ['paysan'])
  assert.equal(step.tier, 'paysan', 'ne jamais conseiller un tier que le joueur ne peut pas recruter')
})

test('aucun conseil quand tout est plafonné — mieux vaut se taire', () => {
  const maxes = Object.fromEntries(Object.keys(ROLES).map(t => [t, ROLES[t].per * ROLES[t].cap * 10]))
  assert.equal(bestNextStep(maxes, {}, CTX), null)
})

test('un contexte vide ne fait rien exploser', () => {
  const r = compositionValue({}, {}, {})
  assert.ok(Number.isFinite(r.ratio))
  assert.equal(bestNextStep({}, {}, {}, []), null)
})

test('aucun conseil dont le gain serait invisible à l écran', () => {
  // Trouvé au navigateur : le conseil promettait « ×1,1 » alors que l'actuel
  // affichait déjà ×1,1. Un conseil qu'on ne peut pas distinguer ne conseille rien.
  const counts = { paysan: 40, soldat: 10, chevalier: 2, champion: 0 }
  const step = bestNextStep(counts, {}, CTX)
  if (step) assert.ok(step.gain >= MIN_VISIBLE_GAIN, `gain ${step.gain} sous le seuil`)
})
