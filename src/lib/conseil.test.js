import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CARTES, CARTE_IDS, ABSENCE_MIN_MS, ABSENCE_PAR_CARTE_MS, CARTES_MAX, EXPIRATION_MS,
  nombreDeCartes, tirerCartes, montants, estExpiree, sanitizeConseil, carteById,
} from './conseil.js'

test('chaque carte propose deux options qui échangent des monnaies DIFFÉRENTES', () => {
  // Le garde-fou du système : si les deux options donnaient la même chose, la
  // carte serait un distributeur, pas un conseil.
  for (const id of CARTE_IDS) {
    const c = CARTES[id]
    assert.ok(c.titre && c.texte && c.sprite, `${id} incomplète`)
    assert.ok(c.a.label && c.b.label, `${id} sans libellés`)
    assert.notEqual(c.a.gain, c.b.gain, `${id} offre deux fois « ${c.a.gain} »`)
  }
})

test('une absence courte ne produit rien', () => {
  assert.equal(nombreDeCartes(0), 0)
  assert.equal(nombreDeCartes(ABSENCE_MIN_MS - 1), 0)
  assert.ok(nombreDeCartes(ABSENCE_MIN_MS) >= 1)
})

test('le nombre de cartes est borné — trois arbitrages, pas dix', () => {
  assert.equal(nombreDeCartes(ABSENCE_PAR_CARTE_MS * 50), CARTES_MAX)
  for (const h of [1, 3, 8, 24, 240]) {
    assert.ok(nombreDeCartes(h * 3600e3) <= CARTES_MAX)
  }
})

test('le tirage ne répète jamais la même carte', () => {
  for (let s = 0; s < 20; s++) {
    const rng = () => (s * 0.137 + 0.31) % 1
    const t = tirerCartes(ABSENCE_PAR_CARTE_MS * 10, rng, 0)
    assert.equal(new Set(t.map(c => c.id)).size, t.length, JSON.stringify(t.map(c => c.id)))
  }
})

test('chaque carte tirée porte sa date de péremption', () => {
  const t = tirerCartes(ABSENCE_PAR_CARTE_MS * 3, () => 0.5, 1000)
  assert.ok(t.length > 0)
  for (const c of t) assert.equal(c.expiresAt, 1000 + EXPIRATION_MS)
})

test('les montants suivent la progression du joueur', () => {
  // Une carte qui offrirait 50 or en zone 12 serait une insulte.
  const tot = montants('prisonnier', { zoneGold: 10, pendingGloire: 100 })
  const tard = montants('prisonnier', { zoneGold: 1e6, pendingGloire: 100000 })
  assert.ok(tard.a.gold > tot.a.gold * 1000)
  assert.ok(tard.b.gloire > tot.b.gloire * 100)
})

test('aucun montant nul, même sur un état vide', () => {
  // Une option qui ne donne rien transformerait le choix en piège.
  for (const id of CARTE_IDS) {
    const m = montants(id, {})
    for (const côté of ['a', 'b']) {
      const valeurs = Object.values(m[côté])
      assert.ok(valeurs.length > 0, `${id}.${côté} ne donne rien`)
      for (const v of valeurs) assert.ok(v > 0, `${id}.${côté} donne ${v}`)
    }
  }
})

test('les deux options d une carte ne se comparent pas dans la même monnaie', () => {
  for (const id of CARTE_IDS) {
    const m = montants(id, { zoneGold: 100, pendingGloire: 500, paysans: 200 })
    const clesA = Object.keys(m.a), clesB = Object.keys(m.b)
    assert.equal(clesA.length, 1)
    assert.equal(clesB.length, 1)
    assert.notEqual(clesA[0], clesB[0], `${id} : les deux options donnent du ${clesA[0]}`)
  }
})

test('une carte périmée n est plus proposée', () => {
  assert.equal(estExpiree({ expiresAt: 100 }, 200), true)
  assert.equal(estExpiree({ expiresAt: 300 }, 200), false)
  assert.equal(estExpiree(null, 0), true)
})

test('sanitize protège d une save trafiquée ou périmée', () => {
  const now = 1000
  assert.deepEqual(sanitizeConseil(null, now), [])
  assert.deepEqual(sanitizeConseil([{ id: 'inconnue', expiresAt: 9e9 }], now), [])
  assert.deepEqual(sanitizeConseil([{ id: 'prisonnier', expiresAt: 10 }], now), [], 'périmée')
  const doublon = [{ id: 'prisonnier', expiresAt: 9e9 }, { id: 'prisonnier', expiresAt: 9e9 }]
  assert.equal(sanitizeConseil(doublon, now).length, 1)
  const trop = CARTE_IDS.concat(CARTE_IDS).map(id => ({ id, expiresAt: 9e9 }))
  assert.ok(sanitizeConseil(trop, now).length <= CARTES_MAX)
})

test('carteById répond sur le catalogue et rien d autre', () => {
  assert.equal(carteById('prisonnier').titre, 'Un prisonnier')
  assert.equal(carteById('nope'), null)
})

test('une carte pèse quelques minutes de jeu, pas un palier', () => {
  // Garde-fou contre la dérive du distributeur : la première version donnait
  // 60 vagues de revenu, soit cinq zones entières en profondeur.
  const zoneGold = 1000
  for (const id of CARTE_IDS) {
    const m = montants(id, { zoneGold, pendingGloire: 1000, paysans: 400 })
    for (const côté of ['a', 'b']) {
      const or = m[côté].gold ?? 0
      assert.ok(or <= zoneGold * 40, `${id}.${côté} donne ${or / zoneGold} vagues de revenu`)
    }
  }
})
