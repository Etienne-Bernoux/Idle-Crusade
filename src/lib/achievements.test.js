import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ACHIEVEMENTS, ACHIEVEMENT_RARITIES, ACHIEVEMENT_STATS,
  newlyUnlocked, achievementEffects, progress, sanitizeAchievements, achievementById,
} from './achievements.js'

test('le catalogue dépasse 200 succès, tous présentables et sans doublon', () => {
  assert.ok(ACHIEVEMENTS.length >= 200, `${ACHIEVEMENTS.length} succès`)
  const ids = ACHIEVEMENTS.map(a => a.id)
  assert.equal(new Set(ids).size, ids.length, 'ids uniques')
  for (const a of ACHIEVEMENTS) {
    assert.ok(a.name, `${a.id} sans nom`)
    assert.ok(a.desc, `${a.id} sans description`)
    assert.ok(a.sprite, `${a.id} sans emoji`)
    assert.ok(ACHIEVEMENT_RARITIES[a.rarity], `${a.id} : rareté « ${a.rarity} » inconnue`)
    assert.ok(ACHIEVEMENT_STATS.includes(a.stat), `${a.id} : stat « ${a.stat} » inconnue`)
    assert.equal(typeof a.test, 'function', `${a.id} sans prédicat`)
  }
})

test('les quatre raretés sont représentées et ordonnées', () => {
  const vus = new Set(ACHIEVEMENTS.map(a => a.rarity))
  for (const r of Object.keys(ACHIEVEMENT_RARITIES)) assert.ok(vus.has(r), `aucun succès ${r}`)
  const m = ACHIEVEMENT_RARITIES
  assert.ok(m.commun.mult < m.rare.mult)
  assert.ok(m.rare.mult < m.legendaire.mult)
  assert.ok(m.legendaire.mult < m.mythique.mult)
})

test('chaque stat porte une part réelle du catalogue', () => {
  // Un catalogue où 90% des succès majorent les dégâts ferait des trois autres
  // stats de la décoration.
  for (const stat of ACHIEVEMENT_STATS) {
    const n = ACHIEVEMENTS.filter(a => a.stat === stat).length
    assert.ok(n >= ACHIEVEMENTS.length * 0.1, `${stat} n'a que ${n} succès sur ${ACHIEVEMENTS.length}`)
  }
})

test('les multiplicateurs restent LÉGERS, même tout débloqué', () => {
  // Le garde-fou de la demande : « des multiplicateurs légers ». 200 bonus qui
  // s'empilent, même minuscules, déplacent la courbe — le total est borné ici
  // et mesuré au simulateur avant d'être figé.
  const tout = achievementEffects(ACHIEVEMENTS.map(a => a.id))
  for (const [stat, v] of Object.entries(tout)) {
    assert.ok(v > 1, `${stat} ne rapporte rien`)
    assert.ok(v <= 2.5, `${stat} atteint ×${v.toFixed(2)} : ce n'est plus léger`)
  }
  // Et le cumul des quatre doit rester sous un ordre de grandeur.
  const produit = Object.values(tout).reduce((a, b) => a * b, 1)
  assert.ok(produit < 10, `cumul ×${produit.toFixed(2)}`)
})

test('un état vierge ne débloque rien', () => {
  // Le piège classique : un seuil à 0 qui offre un succès au premier chargement.
  assert.deepEqual(newlyUnlocked({}, []), [])
  assert.deepEqual(newlyUnlocked(undefined, undefined), [])
})

test('les effets sont multiplicatifs et ne comptent chaque succès qu une fois', () => {
  const un = ACHIEVEMENTS.find(a => a.rarity === 'commun' && a.stat === 'dmgMult')
  const seul = achievementEffects([un.id]).dmgMult
  assert.equal(seul.toFixed(6), ACHIEVEMENT_RARITIES.commun.mult.toFixed(6))
  assert.equal(achievementEffects([un.id, un.id]).dmgMult.toFixed(6), (seul * seul).toFixed(6),
    'la liste est la source, le dédoublonnage appartient à sanitize')
  assert.equal(achievementEffects(['inconnu']).dmgMult, 1, 'un id inconnu ne multiplie rien')
})

test('un succès déjà obtenu n est pas re-signalé', () => {
  const snap = { bossKills: 3 }
  const first = newlyUnlocked(snap, [])
  assert.ok(first.length >= 1)
  assert.deepEqual(newlyUnlocked(snap, first), [])
})

test('les paliers d une famille tombent dans l ordre, sans en sauter', () => {
  const a = newlyUnlocked({ bossKills: 20 }, []).filter(id => id.startsWith('boss-'))
  assert.deepEqual(a, ['boss-1', 'boss-5', 'boss-20'])
})

test('un prédicat qui explose ne fait pas tomber les autres', () => {
  const out = newlyUnlocked({ counts: null, bossKills: 1 }, [])
  assert.ok(out.includes('boss-1'))
})

test('les succès uniques demandent un état, pas une quantité', () => {
  const troisTiers = { counts: { paysan: 10, soldat: 10, chevalier: 10 } }
  assert.equal(newlyUnlocked(troisTiers, []).includes('armee-complete'), false)
  const quatre = { counts: { paysan: 1, soldat: 1, chevalier: 1, champion: 1 } }
  assert.ok(newlyUnlocked(quatre, []).includes('armee-complete'))
})

test('les deux couches de prestige ont leurs propres familles', () => {
  assert.ok(newlyUnlocked({ prestigeCount: 1 }, []).includes('croisade-1'))
  assert.ok(newlyUnlocked({ legendeCount: 1 }, []).includes('legende-1'))
  assert.ok(newlyUnlocked({ pantheonSpent: 10 }, []).includes('pantheon-10'))
})

test('progress compte ce qui est fait, en ignorant les ids inconnus', () => {
  assert.deepEqual(progress([]), { done: 0, total: ACHIEVEMENTS.length })
  assert.equal(progress(['boss-1', 'nawak']).done, 1)
})

test('sanitize protège d une save trafiquée', () => {
  assert.deepEqual(sanitizeAchievements(null), [])
  assert.deepEqual(sanitizeAchievements(['boss-1', 'boss-1', 42, 'faux']), ['boss-1'])
})

test('achievementById répond sur le catalogue et rien d autre', () => {
  assert.ok(achievementById('boss-1').name.includes('boss'))
  assert.equal(achievementById('nope'), null)
})
