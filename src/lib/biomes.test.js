import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BIOMES, DEFAULT_BIOME, biomeById, isBiomeUnlocked, unlockedBiomes,
  resolveBiome, nextBiome, biomeEffects,
} from './biomes.js'

test('les biomes sont présentables et ordonnés du plus doux au plus dur', () => {
  assert.ok(BIOMES.length >= 3)
  for (let i = 1; i < BIOMES.length; i++) {
    assert.ok(BIOMES[i].hpMult > BIOMES[i - 1].hpMult, `${BIOMES[i].id} pas plus dur`)
    assert.ok(BIOMES[i].rewardMult > BIOMES[i - 1].rewardMult, `${BIOMES[i].id} pas plus payant`)
    assert.ok(BIOMES[i].unlockAtZone > BIOMES[i - 1].unlockAtZone, `${BIOMES[i].id} pas plus exigeant`)
  }
  for (const b of BIOMES) {
    assert.ok(b.name && b.sprite && b.desc, `${b.id} pas présentable`)
  }
})

test('le premier biome est gratuit, neutre, et sert de défaut', () => {
  const first = BIOMES[0]
  assert.equal(first.id, DEFAULT_BIOME)
  assert.equal(first.hpMult, 1)
  assert.equal(first.rewardMult, 1)
  assert.equal(first.unlockAtZone, 0)
  assert.ok(isBiomeUnlocked(first.id, 0), 'il doit être jouable dès le premier run')
})

test('la récompense monte MOINS vite que la difficulté', () => {
  // C'est l'invariant d'équilibre : sinon monter en biome serait toujours gagnant
  // et le choix disparaîtrait. Le gain vient de ce qu'un joueur fort traverse la
  // difficulté plus vite qu'elle ne monte.
  for (const b of BIOMES.slice(1)) {
    assert.ok(b.rewardMult < b.hpMult, `${b.id} : ${b.rewardMult} vs ${b.hpMult}`)
  }
})

test('un biome se débloque en ayant ATTEINT sa zone, une fois pour toutes', () => {
  const maudites = BIOMES[1]
  assert.equal(isBiomeUnlocked(maudites.id, maudites.unlockAtZone - 1), false)
  assert.ok(isBiomeUnlocked(maudites.id, maudites.unlockAtZone))
  assert.ok(isBiomeUnlocked(maudites.id, 999))
})

test('unlockedBiomes ne renvoie que ce qui est ouvert', () => {
  assert.deepEqual(unlockedBiomes(0).map(b => b.id), [DEFAULT_BIOME])
  const two = unlockedBiomes(BIOMES[1].unlockAtZone)
  assert.equal(two.length, 2)
  assert.equal(unlockedBiomes(999).length, BIOMES.length)
})

test('resolveBiome refuse un biome non débloqué ou inconnu', () => {
  assert.equal(resolveBiome('neant', 0), DEFAULT_BIOME, 'une save bricolée ne démarre pas dans le Néant')
  assert.equal(resolveBiome('nawak', 999), DEFAULT_BIOME)
  assert.equal(resolveBiome('maudites', 5), 'maudites')
})

test('nextBiome annonce le prochain objectif, puis null', () => {
  assert.equal(nextBiome(0).id, BIOMES[1].id)
  assert.equal(nextBiome(999), null)
})

test('biomeById est tolérant : un id inconnu retombe sur le défaut', () => {
  assert.equal(biomeById('nawak').id, DEFAULT_BIOME)
  assert.equal(biomeById(undefined).id, DEFAULT_BIOME)
})

test('biomeEffects donne des défauts NEUTRES pour toute règle absente', () => {
  // Porte de sortie unique : une règle non déclarée ne doit rien changer, et
  // aucun défaut ne doit se disperser dans App.svelte.
  assert.deepEqual(biomeEffects(DEFAULT_BIOME), {
    hpMult: 1, rewardMult: 1, waveMult: 1, relicDrops: 1, goldMult: 1,
    qualityBonus: 0, troopCostMult: 1, warCryDurMult: 1, warCryCdMult: 1, gloireMult: 1,
  })
})

test('chaque biome au-delà du premier a une règle NOMMÉE et un effet réel', () => {
  const neutral = biomeEffects(DEFAULT_BIOME)
  for (const b of BIOMES.slice(1)) {
    assert.ok(b.ruleName && b.ruleDesc, `${b.id} sans règle présentable`)
    const e = biomeEffects(b.id)
    // Au moins un levier de gameplay change, pas seulement hpMult/rewardMult.
    const gameplayKeys = ['waveMult', 'relicDrops', 'goldMult', 'qualityBonus',
      'troopCostMult', 'warCryDurMult', 'warCryCdMult', 'gloireMult']
    const changed = gameplayKeys.filter(k => e[k] !== neutral[k])
    assert.ok(changed.length > 0, `${b.id} ne change aucun levier de jeu`)
  }
})

test('chaque règle a un CONTREPOIDS : rien n est gratuit', () => {
  // Profusion : +2 reliques mais des zones plus longues.
  const maudites = biomeEffects('maudites')
  assert.equal(maudites.relicDrops, 2)
  assert.ok(maudites.waveMult > 1)
  // Disette : deux crans de rareté, mais l'or est divisé.
  const ombres = biomeEffects('ombres')
  assert.equal(ombres.qualityBonus, 2)
  assert.ok(ombres.goldMult < 1)
  // Bain de Sang : le Cri devient dominant, mais recruter coûte le double.
  const ecarlate = biomeEffects('ecarlate')
  assert.ok(ecarlate.warCryDurMult > 1 && ecarlate.warCryCdMult < 1)
  assert.ok(ecarlate.troopCostMult > 1)
  // Vacuité : plus aucune relique, contre de la Gloire.
  const neant = biomeEffects('neant')
  assert.equal(neant.relicDrops, 0)
  assert.ok(neant.gloireMult > 1)
})

test('les règles sont toutes distinctes : aucun biome n en double un autre', () => {
  const signatures = BIOMES.map(b => JSON.stringify(biomeEffects(b.id)))
  assert.equal(new Set(signatures).size, BIOMES.length)
})
