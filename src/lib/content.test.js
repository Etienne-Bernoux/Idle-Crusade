import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ZONES, TROOPS, TROOP_ORDER, BASE_DPS, withSprites, troopsWithSprites,
  zoneAt, cycleOf, themeIndexOf, cycleLabel, THEME_COUNT, ZONE_SCALE, zoneScaleAt,
  ZONE_TEMPLATE, BIOME_IDS,
} from './content.js'

const zoneIds = Object.keys(ZONES).map(Number).sort((a, b) => a - b)

test('les 5 zones sont numérotées de 1 à 5 sans trou', () => {
  assert.deepEqual(zoneIds, [1, 2, 3, 4, 5])
})

test('chaque zone est jouable : vagues, mobs en rotation, boss', () => {
  for (const id of zoneIds) {
    const z = ZONES[id]
    assert.ok(z.name, `zone ${id} sans nom`)
    assert.ok(z.waves >= 1, `zone ${id} sans vague`)
    assert.ok(z.mobs.length > 0, `zone ${id} sans mob`)
    assert.ok(z.boss, `zone ${id} sans boss`)
    for (const e of [...z.mobs, z.boss]) {
      assert.ok(e.name, `ennemi sans nom en zone ${id}`)
      assert.ok(e.hpMax > 0, `${e.name} sans PV`)
      assert.ok(e.gold > 0, `${e.name} sans or`)
      assert.ok(e.sprite || e.spriteKey, `${e.name} sans visuel`)
    }
  }
})

test('la difficulté et les récompenses montent à chaque zone', () => {
  for (let i = 1; i < zoneIds.length; i++) {
    const prev = ZONES[zoneIds[i - 1]]
    const cur = ZONES[zoneIds[i]]
    assert.ok(cur.boss.hpMax > prev.boss.hpMax, `boss zone ${zoneIds[i]} pas plus dur`)
    assert.ok(cur.boss.gold > prev.boss.gold, `boss zone ${zoneIds[i]} pas plus généreux`)
    assert.ok(cur.waves >= prev.waves, `zone ${zoneIds[i]} plus courte que la précédente`)
  }
})

test('le boss d une zone est plus dur que ses propres mobs', () => {
  for (const id of zoneIds) {
    const z = ZONES[id]
    const hardestMob = Math.max(...z.mobs.map(m => m.hpMax))
    assert.ok(z.boss.hpMax > hardestMob, `boss zone ${id} plus faible qu un mob`)
  }
})

test('les tiers de troupes sont ordonnés et cohérents', () => {
  assert.deepEqual(TROOP_ORDER, Object.keys(TROOPS))
  let prevDps = 0
  let prevCost = 0
  for (const id of TROOP_ORDER) {
    const t = TROOPS[id]
    assert.ok(t.dps > prevDps, `${id} pas plus fort que le tier précédent`)
    assert.ok(t.baseCost > prevCost, `${id} pas plus cher que le tier précédent`)
    assert.ok(t.unlockZone >= 1, `${id} sans condition de zone`)
    prevDps = t.dps
    prevCost = t.baseCost
  }
  assert.ok(BASE_DPS > 0, 'le héros doit taper tout seul au démarrage')
})

test('le Champion est le seul tier derrière un achat de Forge', () => {
  const gated = TROOP_ORDER.filter(id => TROOPS[id].requiresMeta)
  assert.deepEqual(gated, ['champion'])
  assert.equal(TROOPS.champion.requiresMeta, 'champion')
})

test('withSprites résout les clés visuelles en URLs', () => {
  const urls = { foret: 'FORET.webp', gobelin: 'GOBELIN.webp' }
  const hydrated = withSprites(ZONES, urls)
  assert.equal(hydrated[1].bg, 'url(FORET.webp)')
  assert.equal(hydrated[1].mobs[0].spriteUrl, 'GOBELIN.webp')
  assert.equal(hydrated[1].mobs[1].spriteUrl, null)      // emoji seul
  assert.equal(hydrated[2].bg, ZONES[2].bg)              // gradient CSS conservé
  assert.equal(hydrated[5].boss.spriteUrl, null)
})

test('withSprites ne mute pas ZONES (le simulateur lit la version pure)', () => {
  withSprites(ZONES, { foret: 'X', gobelin: 'Y' })
  assert.equal(ZONES[1].bg, undefined)
  assert.equal(ZONES[1].mobs[0].spriteUrl, undefined)
  assert.equal(ZONES[1].mobs[0].spriteKey, 'gobelin')
})

test('troopsWithSprites attache une URL à chaque tier', () => {
  const urls = { paysan: 'P', soldat: 'S', chevalier: 'C', champion: 'CH' }
  const hydrated = troopsWithSprites(TROOPS, urls)
  for (const id of TROOP_ORDER) assert.ok(hydrated[id].spriteUrl, `${id} sans sprite`)
  assert.equal(TROOPS.paysan.spriteUrl, undefined, 'la donnée pure ne doit pas être mutée')
})

// ---------- ZONES SANS FIN ----------

test('le premier cycle est l identité : le début du jeu n est pas touché', () => {
  for (let n = 1; n <= THEME_COUNT; n++) {
    const z = zoneAt(n)
    assert.equal(z.name, ZONES[n].name)
    assert.equal(z.boss.hpMax, ZONES[n].boss.hpMax)
    assert.equal(z.mobs[0].hpMax, ZONES[n].mobs[0].hpMax)
    assert.equal(z.cycle, 1)
  }
})

test('au-delà des thèmes, on reboucle en montant d un cycle', () => {
  assert.equal(themeIndexOf(6), 1)
  assert.equal(cycleOf(6), 2)
  assert.equal(zoneAt(6).name, 'Forêt Sombre II')
  assert.equal(zoneAt(10).name, 'Enfer II')
  assert.equal(zoneAt(11).name, 'Forêt Sombre III')
  // Le décor et les noms d'ennemis du thème sont réutilisés.
  assert.equal(zoneAt(6).bgSprite, ZONES[1].bgSprite)
  assert.equal(zoneAt(6).mobs[0].name, ZONES[1].mobs[0].name)
})

test('il y a toujours une zone suivante : le jeu ne se termine plus', () => {
  for (const n of [1, 5, 6, 50, 137]) {
    const z = zoneAt(n)
    assert.ok(z.name, `zone ${n} sans nom`)
    assert.ok(z.boss.hpMax > 0, `zone ${n} sans boss`)
    assert.ok(z.mobs.length > 0, `zone ${n} sans mob`)
    assert.ok(z.waves >= 1, `zone ${n} sans vague`)
  }
})

test('la difficulté monte SANS marche entre zones consécutives, cycles compris', () => {
  // Le point sensible est le passage 5 → 6 (fin d un cycle) : un saut brutal
  // ferait un mur, un saut mou ferait un palier ennuyeux.
  for (let n = 1; n < 20; n++) {
    const ratio = zoneAt(n + 1).boss.hpMax / zoneAt(n).boss.hpMax
    assert.ok(ratio > 6 && ratio < 9, `zone ${n}→${n + 1} : ×${ratio.toFixed(2)} hors de la plage attendue`)
  }
})

test('l or suit les PV : le ratio récompense/difficulté reste constant', () => {
  for (const n of [6, 12, 23]) {
    const z = zoneAt(n)
    const theme = ZONES[themeIndexOf(n)]
    const hpRatio = z.boss.hpMax / theme.boss.hpMax
    const goldRatio = z.boss.gold / theme.boss.gold
    assert.ok(Math.abs(hpRatio - goldRatio) / hpRatio < 0.01, `zone ${n} : ${hpRatio} vs ${goldRatio}`)
  }
})

test('le boss reste plus dur que ses mobs à tous les cycles', () => {
  for (const n of [1, 7, 14, 33]) {
    const z = zoneAt(n)
    assert.ok(z.boss.hpMax > Math.max(...z.mobs.map(m => m.hpMax)), `zone ${n}`)
  }
})

test('zoneScaleAt vaut 1 au premier cycle puis suit ZONE_SCALE', () => {
  assert.equal(zoneScaleAt(1), 1)
  assert.equal(zoneScaleAt(5), 1)
  assert.equal(zoneScaleAt(6).toFixed(2), Math.pow(ZONE_SCALE, THEME_COUNT).toFixed(2))
})

test('cycleLabel passe en chiffres au-delà de XX, pour rester lisible', () => {
  assert.equal(cycleLabel(1), 'I')
  assert.equal(cycleLabel(4), 'IV')
  assert.equal(cycleLabel(20), 'XX')
  assert.equal(cycleLabel(27), '27')
})

test('withSprites fonctionne sur une zone générée', () => {
  const hydrated = withSprites({ 6: zoneAt(6) }, { foret: 'F.webp', gobelin: 'G.webp' })
  assert.equal(hydrated[6].bg, 'url(F.webp)')
  assert.equal(hydrated[6].mobs[0].spriteUrl, 'G.webp')
})

// ---------- BIOMES : contenu propre, barème commun ----------

test('chaque biome a son propre bestiaire : aucun nom de zone partagé', () => {
  const seen = new Map()
  for (const biomeId of BIOME_IDS) {
    for (let n = 1; n <= THEME_COUNT; n++) {
      const zone = zoneAt(n, biomeId)
      assert.ok(zone.name, `${biomeId} zone ${n} sans nom`)
      const owner = seen.get(zone.name)
      assert.equal(owner, undefined, `« ${zone.name} » apparaît dans ${owner} ET ${biomeId}`)
      seen.set(zone.name, biomeId)
    }
  }
  assert.equal(seen.size, BIOME_IDS.length * THEME_COUNT)
})

test('chaque biome a ses propres ennemis et ses propres décors', () => {
  for (const biomeId of BIOME_IDS) {
    for (let n = 1; n <= THEME_COUNT; n++) {
      const z = zoneAt(n, biomeId)
      assert.equal(z.mobs.length, 5, `${biomeId} zone ${n}`)
      assert.ok(z.bg || z.bgSprite, `${biomeId} zone ${n} sans décor`)
      for (const e of [...z.mobs, z.boss]) {
        assert.ok(e.name && e.sprite, `${biomeId} zone ${n} : ennemi incomplet`)
      }
    }
  }
  // Les boss ne se répètent pas non plus d'un biome à l'autre.
  const bosses = BIOME_IDS.flatMap(b => Array.from({ length: THEME_COUNT }, (_, i) => zoneAt(i + 1, b).boss.name))
  assert.equal(new Set(bosses).size, bosses.length, 'un boss est réutilisé entre biomes')
})

test('LE BARÈME EST COMMUN : la variété ne change aucune valeur', () => {
  // C'est l'invariant qui garantit qu'aucun biome ne devient accidentellement
  // plus dur ou plus rentable que sa fiche ne l'annonce.
  for (let n = 1; n <= THEME_COUNT; n++) {
    const tpl = ZONE_TEMPLATE[n - 1]
    for (const biomeId of BIOME_IDS) {
      const z = zoneAt(n, biomeId)
      assert.equal(z.waves, tpl.waves, `${biomeId} zone ${n} : vagues`)
      assert.equal(z.boss.hpMax, tpl.bossHp, `${biomeId} zone ${n} : PV du boss`)
      assert.equal(z.boss.gold, tpl.bossGold, `${biomeId} zone ${n} : or du boss`)
      assert.deepEqual(z.mobs.map(m => m.hpMax), tpl.mobHp, `${biomeId} zone ${n} : PV des mobs`)
      assert.deepEqual(z.mobs.map(m => m.gold), tpl.mobGold, `${biomeId} zone ${n} : or des mobs`)
    }
  }
})

test('waveMult (règle Profusion) allonge les zones sans descendre sous 2 vagues', () => {
  assert.equal(zoneAt(3, 'maudites', 1.5).waves, Math.round(ZONE_TEMPLATE[2].waves * 1.5))
  assert.equal(zoneAt(1, 'croisade', 1).waves, ZONE_TEMPLATE[0].waves)
  assert.ok(zoneAt(1, 'croisade', 0.01).waves >= 2, 'garde-fou : une zone reste jouable')
})

test('les cycles de profondeur fonctionnent dans tous les biomes', () => {
  for (const biomeId of BIOME_IDS) {
    const first = zoneAt(1, biomeId)
    const deeper = zoneAt(1 + THEME_COUNT, biomeId)
    assert.equal(deeper.cycle, 2)
    assert.ok(deeper.name.endsWith(' II'), `${biomeId} : ${deeper.name}`)
    assert.ok(deeper.boss.hpMax > first.boss.hpMax)
  }
})

test('un biome inconnu retombe sur le bestiaire de départ, sans planter', () => {
  assert.equal(zoneAt(1, 'nawak').name, zoneAt(1, 'croisade').name)
  assert.equal(zoneAt(1).name, zoneAt(1, 'croisade').name)
})
