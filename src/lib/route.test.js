import test from 'node:test'
import assert from 'node:assert/strict'
import { VOIES, VOIE_IDS, CHOIX_PAR_CARREFOUR, voiesPour, voieEffects, resolveVoie, voieById } from './route.js'

test('chaque voie est présentable', () => {
  for (const id of VOIE_IDS) {
    const v = VOIES[id]
    assert.ok(v.nom && v.sprite && v.desc, `${id} incomplète`)
  }
})

test('aucune voie n a QUE des avantages', () => {
  // Le garde-fou du système : une voie strictement meilleure ne serait pas un
  // choix, seulement un impôt sur les distraits.
  //
  // ⚠ Ce test est ANALYTIQUE, et son autorité s'arrête là. Il a validé pendant
  // toute l'US 41 une route marchande qui, mesurée en run (US 45), était 8%
  // plus RAPIDE que la voie directe tout en doublant l'or — strictement
  // meilleure. La vraie garantie est la table mesurée de DESIGN.md § US 45 ;
  // ceci n'attrape que les oublis grossiers.
  for (const id of VOIE_IDS) {
    if (id === 'directe') continue
    const fx = voieEffects(id)
    // `waveMult < 1` compte des DEUX côtés : moins de vagues, c'est plus vite
    // ET moins de butin total. C'est un troc à lui tout seul.
    const gagne = fx.goldMult > 1 || fx.gloireMult > 1 || fx.relicDrops > 0 || fx.waveMult < 1
    const paie = fx.hpMult > 1 || fx.goldMult < 1 || fx.bossArmorPts > 0
                 || fx.gloireMult < 1 || fx.waveMult < 1
    assert.ok(gagne, `${id} ne rapporte rien`)
    assert.ok(paie, `${id} ne coûte rien`)
  }
})

test('les voies gagnent sur des axes DIFFÉRENTS', () => {
  // Deux voies qui gagneraient sur le même axe se classeraient, et on aurait
  // reproduit le défaut de l'Arbre que les Vœux ont corrigé.
  const axe = (fx) => {
    if (fx.relicDrops > 0) return 'butin'
    if (fx.gloireMult > 1) return 'gloire'
    if (fx.waveMult < 1) return 'temps'
    if (fx.goldMult > 1) return 'or'
    return 'aucun'
  }
  const axes = VOIE_IDS.filter(id => id !== 'directe').map(id => axe(voieEffects(id)))
  assert.equal(new Set(axes).size, axes.length, `doublon d axe : ${axes.join(', ')}`)
})

test('un carrefour propose toujours de ne rien parier', () => {
  // Refuser le pari doit rester possible, sinon le choix devient un impôt.
  for (const z of [1, 2, 3, 5, 9, 14, 37]) {
    const v = voiesPour(z)
    assert.equal(v.length, CHOIX_PAR_CARREFOUR, `zone ${z}`)
    assert.ok(v.includes('directe'), `zone ${z} ne propose pas la voie directe`)
    assert.equal(new Set(v).size, v.length, `zone ${z} répète une voie : ${v.join(', ')}`)
  }
})

test('les voies d une zone sont DÉTERMINISTES', () => {
  // On apprend une route, on ne subit pas un tirage — même principe que les
  // annonces de boss.
  assert.deepEqual(voiesPour(7), voiesPour(7))
  assert.notDeepEqual(voiesPour(1), voiesPour(2))
})

test('les effets partent d un neutre complet', () => {
  const n = voieEffects('directe')
  assert.deepEqual(n, { goldMult: 1, hpMult: 1, waveMult: 1, gloireMult: 1, bossArmorPts: 0, relicDrops: 0 })
  assert.deepEqual(voieEffects('inconnue'), n, 'un id inconnu ne doit rien changer')
})

test('les facteurs restent dans des ordres de grandeur mesurés', () => {
  // Une voie n'est qu'un jeu de facteurs sur le barème commun : elle ne doit
  // pas pouvoir sortir des bornes que tout le reste respecte.
  for (const id of VOIE_IDS) {
    const fx = voieEffects(id)
    assert.ok(fx.hpMult >= 0.5 && fx.hpMult <= 2, `${id} : PV ×${fx.hpMult}`)
    assert.ok(fx.goldMult >= 0.5 && fx.goldMult <= 2, `${id} : or ×${fx.goldMult}`)
    assert.ok(fx.waveMult >= 0.4 && fx.waveMult <= 2, `${id} : vagues ×${fx.waveMult}`)
    assert.ok(fx.bossArmorPts <= 40, `${id} : +${fx.bossArmorPts} pts d armure`)
  }
})

test('une voie inconnue retombe sur la voie directe', () => {
  assert.equal(resolveVoie('nawak'), 'directe')
  assert.equal(resolveVoie(undefined), 'directe')
  assert.equal(resolveVoie('riche'), 'riche')
  assert.equal(voieById('nawak'), null)
})
