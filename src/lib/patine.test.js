import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PATINE_MAX, PATINE_HEURE_MS, PATINE_HEURES_PLEIN, PATINE_PALIERS,
  patineMult, patinePalier, prochainPalier, horodater,
} from './patine.js'

const H = PATINE_HEURE_MS

test('une relique neuve ne vaut pas plus qu elle-même', () => {
  assert.equal(patineMult(1000, 1000), 1)
  assert.equal(patineMult(0), 1)
  assert.equal(patineMult(null), 1)
  assert.equal(patineMult(undefined), 1)
})

test('elle mûrit à l horloge murale', () => {
  const t0 = 1e12
  assert.ok(patineMult(t0, t0 + 10 * H) > patineMult(t0, t0 + 1 * H))
  assert.ok(patineMult(t0, t0 + 1 * H) > 1)
})

test('la maturation est plafonnée, et le plafond reste modeste', () => {
  // Les effets de relique sont déjà bornés par nature (≤70% de dégâts par slot).
  // Un ×2 doublerait ces bornes et forcerait à réétalonner tout le reste.
  const t0 = 1e12
  assert.equal(patineMult(t0, t0 + 10000 * H), PATINE_MAX)
  assert.ok(PATINE_MAX <= 1.5, `×${PATINE_MAX} casserait les bornes de reliques`)
  assert.ok(PATINE_HEURES_PLEIN >= 20, 'mûrir doit demander du temps réel, pas une soirée')
})

test('une save trafiquée ne donne jamais de bonus gratuit', () => {
  const t0 = 1e12
  assert.equal(patineMult('demain', t0), 1)
  assert.equal(patineMult(t0 + 999 * H, t0), 1, 'une date dans le futur ne rapporte rien')
  assert.equal(patineMult(-5, t0), 1)
  assert.ok(Number.isFinite(patineMult(t0, t0 + H)))
})

test('les paliers disent d un coup d œil ce qu on risque de jeter', () => {
  assert.equal(patinePalier(1).nom, 'Neuve')
  assert.equal(patinePalier(PATINE_MAX).nom, 'Auréolée')
  for (const p of PATINE_PALIERS) {
    assert.ok(p.nom && p.sprite && p.color, `palier ${p.seuil} incomplet`)
    assert.ok(p.seuil <= PATINE_MAX, `le palier ${p.nom} est inatteignable`)
  }
})

test('le palier suivant annonce ce qu on gagnerait à patienter', () => {
  const p = prochainPalier(1)
  assert.ok(p && p.heures > 0)
  assert.equal(prochainPalier(PATINE_MAX), null, 'une relique mûre n a plus rien à attendre')
})

test('équiper horodate, et c est la remise à zéro qui crée la décision', () => {
  const r = horodater({ defId: 'x', rarity: 'commun' }, 5000)
  assert.equal(r.equippedAt, 5000)
  assert.equal(horodater(null), null)
  // Sans remise à zéro au déséquipement, il n'y aurait pas d'arbitrage :
  // seulement un compteur qui monte, et jamais de coût à changer d'avis.
  const rehorodatee = horodater(r, 9000)
  assert.equal(rehorodatee.equippedAt, 9000)
})
