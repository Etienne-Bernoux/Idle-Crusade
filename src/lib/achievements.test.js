import test from 'node:test'
import assert from 'node:assert/strict'
import { ACHIEVEMENTS, newlyUnlocked, progress, sanitizeAchievements, achievementById } from './achievements.js'

test('le catalogue est présentable et sans doublon', () => {
  assert.ok(ACHIEVEMENTS.length >= 15, `${ACHIEVEMENTS.length} succès, la cible du backlog est 15-20`)
  const ids = ACHIEVEMENTS.map(a => a.id)
  assert.equal(new Set(ids).size, ids.length, 'ids uniques')
  for (const a of ACHIEVEMENTS) {
    assert.ok(a.name, `${a.id} sans nom`)
    assert.ok(a.desc, `${a.id} sans description`)
    assert.ok(a.sprite, `${a.id} sans emoji`)
    assert.equal(typeof a.test, 'function', `${a.id} sans prédicat`)
  }
})

test('un état vierge ne débloque rien', () => {
  // Le piège classique : un `>= 0` qui offre un succès au premier chargement.
  assert.deepEqual(newlyUnlocked({}, []), [])
  assert.deepEqual(newlyUnlocked(undefined, undefined), [])
})

test('un succès déjà obtenu n est pas re-signalé', () => {
  const snap = { bossKills: 3 }
  const first = newlyUnlocked(snap, [])
  assert.ok(first.includes('premier-sang'))
  assert.deepEqual(newlyUnlocked(snap, first), [])
})

test('plusieurs succès peuvent tomber d un coup, dans l ordre du catalogue', () => {
  const out = newlyUnlocked({ bossKills: 1, relicsFound: 30, deepestEver: 12 }, [])
  assert.ok(out.length >= 3)
  const ordre = ACHIEVEMENTS.map(a => a.id).filter(id => out.includes(id))
  assert.deepEqual(out, ordre)
})

test('un prédicat qui explose ne fait pas tomber les autres', () => {
  // Défensif : un instantané partiel ne doit jamais casser la boucle de jeu.
  const out = newlyUnlocked({ counts: null, bossKills: 1 }, [])
  assert.ok(out.includes('premier-sang'))
})

test('les jalons d armée demandent bien les quatre tiers ensemble', () => {
  const troisTiers = { counts: { paysan: 10, soldat: 10, chevalier: 10 } }
  assert.equal(newlyUnlocked(troisTiers, []).includes('armée-mêlée'), false)
  const quatre = { counts: { paysan: 1, soldat: 1, chevalier: 1, champion: 1 } }
  assert.ok(newlyUnlocked(quatre, []).includes('armée-mêlée'))
})

test('les jalons de profondeur s enchaînent sans se sauter', () => {
  const a20 = newlyUnlocked({ deepestEver: 20 }, [])
  assert.ok(a20.includes('enfer') && a20.includes('plus-loin') && a20.includes('abysses'))
  assert.equal(a20.includes('sans-fin'), false)
})

test('la Légende a ses propres jalons', () => {
  assert.ok(newlyUnlocked({ legendeCount: 1 }, []).includes('premiere-legende'))
  assert.ok(newlyUnlocked({ pantheonSpent: 50 }, []).includes('pantheon'))
})

test('progress compte ce qui est fait, en ignorant les ids inconnus', () => {
  assert.deepEqual(progress([]), { done: 0, total: ACHIEVEMENTS.length })
  assert.equal(progress(['premier-sang', 'nawak']).done, 1)
})

test('sanitize protège d une save trafiquée', () => {
  assert.deepEqual(sanitizeAchievements(null), [])
  assert.deepEqual(sanitizeAchievements(['premier-sang', 'premier-sang', 42, 'faux']), ['premier-sang'])
})

test('achievementById répond sur le catalogue et rien d autre', () => {
  assert.equal(achievementById('premier-sang').name, 'Premier sang')
  assert.equal(achievementById('nope'), null)
})
