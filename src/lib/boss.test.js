import test from 'node:test'
import assert from 'node:assert/strict'
import {
  TELEGRAPHS, TELEGRAPH_IDS, TELEGRAPH_THRESHOLDS, TELEGRAPH_TICKS,
  BREACH_DMG_MULT, BREACH_TICKS, WORST_CASE_DMG_FLOOR,
  telegraphsFor, isCountered, bossDebuffs, telegraphById,
} from './boss.js'
import { ACTIVE_IDS, isActiveUnlocked } from './actives.js'

test('chaque annonce est présentable et nomme un actif qui existe vraiment', () => {
  for (const id of TELEGRAPH_IDS) {
    const t = TELEGRAPHS[id]
    assert.ok(t.name, `${id} sans nom`)
    assert.ok(t.sprite, `${id} sans emoji`)
    assert.ok(t.tell, `${id} sans texte d'annonce`)
    assert.ok(ACTIVE_IDS.includes(t.counter), `${id} pointe vers un actif inconnu : ${t.counter}`)
    assert.ok(Object.keys(t.malus).length > 0, `${id} sans conséquence`)
  }
})

test('les quatre actifs ont chacun exactement une annonce à contrer', () => {
  // C'est ce qui donne enfin un rôle distinct à chaque actif : sans bijection,
  // un actif resterait sans emploi et un autre servirait deux fois.
  const counters = TELEGRAPH_IDS.map(id => TELEGRAPHS[id].counter)
  assert.equal(new Set(counters).size, counters.length, `doublon : ${counters.join(', ')}`)
  assert.deepEqual([...counters].sort(), [...ACTIVE_IDS].sort())
})

test('la fenêtre de réaction laisse le temps de voir et d appuyer', () => {
  // 4 ticks à 800 ms ≈ 3,2 s. En dessous de 2 s on exige des réflexes, ce qui
  // contredit le genre et exclut un enfant de 5 ans.
  assert.ok(TELEGRAPH_TICKS * 0.8 >= 2, `${TELEGRAPH_TICKS} ticks, trop court`)
  assert.ok(TELEGRAPH_TICKS * 0.8 <= 6, 'si long que rater devient impossible')
})

test('les annonces d un boss sont DÉTERMINISTES et toutes distinctes', () => {
  // Un joueur doit pouvoir apprendre un boss, pas subir un tirage.
  assert.deepEqual(telegraphsFor(3, 9), telegraphsFor(3, 9))
  for (const zone of [1, 2, 3, 4, 5, 12, 37]) {
    const t = telegraphsFor(zone, 9)
    assert.equal(t.length, TELEGRAPH_THRESHOLDS.length)
    assert.equal(new Set(t).size, t.length, `zone ${zone} répète une annonce : ${t.join(', ')}`)
  }
})

test('des zones voisines ne proposent pas la même série', () => {
  assert.notDeepEqual(telegraphsFor(1, 9), telegraphsFor(2, 9))
})

test('un boss n annonce JAMAIS ce que le joueur ne peut pas encore contrer', () => {
  // Trouvé au navigateur : en zone 3 le boss annonçait Rapine, dont le contre
  // (Ferveur) n'ouvre qu'en zone 4. Une punition sans parade possible.
  for (let zonesUnlocked = 1; zonesUnlocked <= 6; zonesUnlocked++) {
    for (const id of telegraphsFor(zonesUnlocked, zonesUnlocked)) {
      assert.ok(isActiveUnlocked(TELEGRAPHS[id].counter, zonesUnlocked),
        `zone ${zonesUnlocked} annonce ${id}, contré par ${TELEGRAPHS[id].counter} qui est verrouillé`)
    }
  }
})

test('la scène s enrichit au rythme des actifs débloqués', () => {
  assert.equal(telegraphsFor(1, 1).length, 1, 'zone 1 : un seul actif, donc une seule annonce')
  assert.equal(telegraphsFor(1, 2).length, 2)
  assert.ok(telegraphsFor(1, 4).length >= 3)
})

test('contrer, c est avoir le bon actif ACTIF — anticiper compte', () => {
  const actif = { percee: { active: true } }
  assert.ok(isCountered('carapace', actif), 'Percée doit contrer la Carapace')
  assert.equal(isCountered('fureur', actif), false, 'le mauvais actif ne contre rien')
  assert.equal(isCountered('carapace', {}), false)
  assert.equal(isCountered('carapace', { percee: { active: false } }), false)
  assert.equal(isCountered('inconnu', actif), false)
})

test('un contre réussi ouvre une faille qui vaut la peine', () => {
  // Sans bonus, contrer ne serait qu'« éviter d'être puni » — pas une récompense.
  assert.ok(BREACH_DMG_MULT > 1.3, 'la faille doit se sentir')
  assert.ok(BREACH_TICKS >= 3)
})

test('les malus se cumulent selon le contrat du projet', () => {
  const rien = bossDebuffs([])
  assert.deepEqual(rien, { armorPts: 0, dmgTakenMult: 1, goldMult: 1, critMult: 1 })
  const deux = bossDebuffs(['carapace', 'fureur'])
  assert.equal(deux.armorPts, 35)
  assert.equal(deux.dmgTakenMult.toFixed(4), (0.65).toFixed(4))
  assert.equal(bossDebuffs(['voile']).critMult, 0)
  assert.equal(bossDebuffs(['rapine']).goldMult, 0.5)
})

test('tout rater ralentit fort mais ne bloque JAMAIS', () => {
  // L'invariant qui autorise cette tactique dans un idle : rater coûte du temps
  // et du butin, jamais la partie. Un boss qui deviendrait infranchissable
  // réintroduirait la défaite par la porte de service.
  for (const zone of [1, 2, 3, 4, 5, 9]) {
    const pire = bossDebuffs(telegraphsFor(zone, 9))
    assert.ok(pire.dmgTakenMult >= WORST_CASE_DMG_FLOOR,
      `zone ${zone} : les dégâts tombent à ×${pire.dmgTakenMult}`)
    assert.ok(pire.dmgTakenMult > 0, 'des dégâts nuls seraient un soft-lock')
    assert.ok(pire.goldMult > 0, 'zéro or serait une punition sèche')
    assert.ok(pire.armorPts < 100, 'une armure de 100% est une invulnérabilité')
  }
})

test('telegraphById répond sur le catalogue et rien d autre', () => {
  assert.equal(telegraphById('carapace').counter, 'percee')
  assert.equal(telegraphById('nope'), null)
})
