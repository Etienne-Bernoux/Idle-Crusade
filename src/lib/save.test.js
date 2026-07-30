import { test } from 'node:test'
import assert from 'node:assert/strict'
import { serialize, parseSave, SAVE_VERSION } from './save.js'

test('serialize ne garde que les primitifs durables + version', () => {
  const out = serialize({
    gold: 42, counts: { paysan: 3 }, currentZone: 2, zonesUnlocked: 2,
    // transients qui ne doivent PAS être sérialisés :
    enemy: { hpMax: 999 }, enemyHp: 12, pops: [1, 2], isFlashing: true, lastTickAt: 123,
  })
  assert.deepEqual(Object.keys(out).sort(), [
    'achievements', 'activesCast', 'biome', 'biomesSeen', 'bossKills', 'buyMode', 'conseil', 'counts',
    'critCount', 'currentZone', 'deepestEver', 'deepestNoTree', 'echoes', 'equipped', 'forgeCount',
    'fuseCount', 'gloire', 'gold', 'goldTotal', 'inventory', 'legendaryFound', 'legendeCount',
    'legendeDeepest', 'legendePoints', 'neantCrusades', 'nextReliqueUid',
    'pantheon', 'prestigeCount', 'savedAt', 'treeNodes', 'troopUpgrades',
    'version', 'voeu', 'wave', 'wavesCleared', 'wavesTotal', 'zonesCleared', 'zonesUnlocked',
  ])
  assert.equal(out.version, SAVE_VERSION)
  assert.equal(out.gold, 42)
  assert.equal(out.currentZone, 2)
})

test('serialize applique des défauts pour les champs absents (forward-compat)', () => {
  const out = serialize({ gold: 5 })
  assert.equal(out.gold, 5)
  assert.equal(out.wave, 1)
  assert.equal(out.zonesUnlocked, 1)
  assert.deepEqual(out.inventory, [])
  assert.deepEqual(out.equipped, { arme: null, armure: null, banniere: null, amulette: null })
  assert.equal(out.nextReliqueUid, 0)
  assert.equal(out.zonesCleared, 0)
  assert.equal(out.gloire, 0)
  assert.deepEqual(out.treeNodes, [])
  assert.deepEqual(out.echoes, {})
  assert.equal(out.biome, 'croisade')
  assert.equal(out.deepestEver, 0)
  assert.deepEqual(out.troopUpgrades, {})
  assert.equal(out.prestigeCount, 0)
  assert.equal(out.buyMode, 'x1')
  assert.equal(out.wavesCleared, 0)
})

test('serialize : une save V2 (sans champs de prestige) reste chargeable', () => {
  const v2 = { gold: 900, counts: { paysan: 12 }, currentZone: 5, wave: 3, zonesUnlocked: 5 }
  const out = serialize(v2)
  assert.equal(out.gold, 900)
  assert.equal(out.gloire, 0)
  assert.equal(out.prestigeCount, 0)
  assert.equal(out.zonesCleared, 0)
})

test('parseSave : clé absente (null) → null', () => {
  assert.equal(parseSave(null), null)
})

test('parseSave : JSON corrompu → null (pas de throw)', () => {
  assert.equal(parseSave('not json {{'), null)
})

test('parseSave : valeur non-objet → null', () => {
  assert.equal(parseSave('42'), null)
  assert.equal(parseSave('"abc"'), null)
})

test('parseSave : JSON valide → objet', () => {
  const data = parseSave('{"version":1,"gold":7,"currentZone":2}')
  assert.equal(data.gold, 7)
  assert.equal(data.currentZone, 2)
})

test('round-trip serialize → JSON → parseSave', () => {
  const raw = JSON.stringify(serialize({ gold: 100, counts: { paysan: 9 }, currentZone: 2, zonesUnlocked: 2 }))
  const back = parseSave(raw)
  assert.equal(back.gold, 100)
  assert.equal(back.counts.paysan, 9)
  assert.equal(back.version, SAVE_VERSION)
})

test('migration v1 → v2 : l ancienne Forge devient de la Gloire à re-dépenser', () => {
  const v1 = JSON.stringify({
    version: 1, gold: 100, counts: { paysan: 2 }, currentZone: 2, wave: 3, zonesUnlocked: 2,
    gloire: 7, metaLevels: { fureur: 2, butin: 1 }, prestigeCount: 1,
  })
  const out = parseSave(v1)
  assert.equal(out.version, 3)
  assert.deepEqual(out.treeNodes, [])
  assert.equal(out.gloire, 37)          // 7 + (5+20) + 5 remboursés
  assert.equal(out.metaLevels, undefined)
  assert.equal(out.gold, 100)           // le reste du run est intact
})

test('migration v1 → v3 : un Champion débloqué survit à la migration', () => {
  const v1 = JSON.stringify({ version: 1, gloire: 0, metaLevels: { champion: 1 } })
  const out = parseSave(v1)
  assert.ok(out.treeNodes.includes('champion'), 'le Serment doit être accordé')
  // Depuis l'US 28 le Champion pend à la racine : deux nœuds suffisent, là où
  // il fallait offrir les douze de la branche Guerre.
  assert.equal(out.treeNodes.length, 2)
})

test('une save v2 voit son arbre remboursé (la topologie a changé en v3)', () => {
  const v2 = JSON.stringify({ version: 2, gold: 5, treeNodes: ['guerre-1'], gloire: 3 })
  const out = parseSave(v2)
  assert.equal(out.version, 3)
  assert.deepEqual(out.treeNodes, [])
  assert.equal(out.gloire, 3 + 5, 'le nœud de palier 1 valait 5')
})

test('une save v3 est remboursée de ce que la refonte a supprimé (v4)', () => {
  // L'Arbre ne reconverge plus : clés de branche, apex de branche et couronne
  // n'existent plus. Politique inchangée depuis v1 — on rembourse, le joueur
  // replace, plutôt que d'inventer une équivalence qui trahirait son intention.
  const v3 = JSON.stringify({ version: 3, gold: 5, treeNodes: ['racine', 'couronne'], gloire: 3 })
  const out = parseSave(v3)
  assert.equal(out.version, 4)
  assert.deepEqual(out.treeNodes, ['racine'], 'la couronne disparaît')
  assert.ok(out.gloire > 3, 'et elle est remboursée')
  assert.equal(out.migrated, true)
})

test('une save v4 passe sans rien changer', () => {
  const v4 = JSON.stringify({ version: 4, gold: 5, treeNodes: ['racine'], gloire: 3 })
  const out = parseSave(v4)
  assert.deepEqual(out.treeNodes, ['racine'])
  assert.equal(out.gloire, 3)
  assert.equal(out.migrated, undefined)
})

test('une save v3 ne garde pas un nœud dont le prérequis a sauté', () => {
  // Un nœud conservé mais devenu inatteignable serait pire qu'absent : il
  // occuperait l'arbre sans pouvoir être ni utilisé ni racheté.
  const v3 = JSON.stringify({ version: 3, treeNodes: ['guerre-lame1'], gloire: 0 })
  const out = parseSave(v3)
  assert.deepEqual(out.treeNodes, [], 'sans la racine ni le tronc, il ne tient pas')
  assert.ok(out.gloire > 0, 'et il est remboursé')
})

test('migration : le drapeau `migrated` ne fuit jamais dans la save écrite', () => {
  const migrated = parseSave(JSON.stringify({ version: 1, gloire: 0, metaLevels: { fureur: 1 } }))
  assert.equal(migrated.migrated, true, 'l appelant doit pouvoir le détecter')
  // …mais serialize() ne le reprend pas : la save réécrite est propre.
  assert.equal(serialize(migrated).migrated, undefined)
})

test('une save d avant la Légende reste jouable et repart de zéro', () => {
  // Champs additifs : la politique du projet est qu'une save antérieure se lise
  // avec des défauts, jamais qu'elle soit rejetée.
  const out = serialize({ gold: 10 })
  assert.equal(out.legendePoints, 0)
  assert.equal(out.legendeCount, 0)
  assert.equal(out.legendeDeepest, 0)
  assert.deepEqual(out.pantheon, {})
})

test('la profondeur de Légende est distincte du record permanent', () => {
  // deepestEver ne redescend jamais : s'en servir pour le gain laisserait
  // réclamer les mêmes points en boucle sans rejouer.
  const out = serialize({ deepestEver: 42, legendeDeepest: 3 })
  assert.equal(out.deepestEver, 42)
  assert.equal(out.legendeDeepest, 3)
})

test('les succès sont persistés, et une save sans eux repart vide', () => {
  assert.deepEqual(serialize({ gold: 1 }).achievements, [])
  assert.deepEqual(serialize({ achievements: ['premier-sang'] }).achievements, ['premier-sang'])
})

test('les compteurs à vie des succès sont persistés et repartent de zéro', () => {
  // Ils ne sont PAS dérivables de l'état courant : un compteur de critiques ou
  // de fusions ne se reconstitue pas depuis un instantané.
  const vide = serialize({ gold: 1 })
  for (const k of ['wavesTotal', 'critCount', 'activesCast', 'forgeCount', 'fuseCount',
    'goldTotal', 'neantCrusades', 'deepestNoTree']) {
    assert.equal(vide[k], 0, k)
  }
  assert.deepEqual(vide.biomesSeen, [])
  assert.equal(serialize({ critCount: 42 }).critCount, 42)
})

test('la Pierre de Vœu est persistée, et vide par défaut', () => {
  assert.equal(serialize({ gold: 1 }).voeu, null)
  assert.equal(serialize({ voeu: 'fer' }).voeu, 'fer')
})

test('la save est horodatée — sans ça, aucune absence n est mesurable', () => {
  const avant = Date.now()
  const out = serialize({ gold: 1 })
  assert.ok(out.savedAt >= avant, 'savedAt doit être posé à la sérialisation')
  assert.deepEqual(out.conseil, [])
  assert.equal(serialize({ savedAt: 42 }).savedAt, 42, 'un horodatage fourni est respecté')
})
