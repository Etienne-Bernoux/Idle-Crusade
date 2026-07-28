import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  RELIQUES, RARITIES, RELIQUE_SLOTS, rollRelique, reliqueEffect, equipRelique, capInventory, meltValue,
  RELIC_MAX_LEVEL, levelMult, forgeCost, forgeRelique, nextRarity, fusableGroups, fuseRelique,
} from './reliques.js'

const emptyEquipped = () => ({ arme: null, armure: null, banniere: null, amulette: null })

// rng déterministe : renvoie successivement les valeurs fournies.
function seqRng(values) {
  let i = 0
  return () => values[i++ % values.length]
}

test('rollRelique renvoie toujours un defId connu et une rareté connue', () => {
  for (let i = 0; i < 200; i++) {
    const { defId, rarity } = rollRelique()
    assert.ok(RELIQUES[defId], `defId inconnu: ${defId}`)
    assert.ok(RARITIES[rarity], `rareté inconnue: ${rarity}`)
  }
})

test('rollRelique : rng proche de 0 → première def + commun', () => {
  const { defId, rarity } = rollRelique(seqRng([0, 0]))
  assert.equal(defId, Object.keys(RELIQUES)[0])
  assert.equal(rarity, 'commun')
})

test('rollRelique : 2e tirage juste sous le seuil commun reste commun', () => {
  // total des poids = 100 ; commun = 70. roll = 0.69*100 = 69 < 70 → commun.
  const { rarity } = rollRelique(seqRng([0, 0.69]))
  assert.equal(rarity, 'commun')
})

test('rollRelique : 2e tirage au-delà du seuil commun → rare', () => {
  // roll = 0.80*100 = 80 ; 80-70=10 >=0 (pas commun), 10-25<0 → rare.
  const { rarity } = rollRelique(seqRng([0, 0.80]))
  assert.equal(rarity, 'rare')
})

test('rollRelique : tirage tout en haut → légendaire', () => {
  // roll = 0.99*100 = 99 ; -70=29, -25=4, -5<0 → legendaire.
  const { rarity } = rollRelique(seqRng([0, 0.99]))
  assert.equal(rarity, 'legendaire')
})

test('rollRelique : poids surchargés (Fortune) → un tirage commun devient rare', () => {
  // Poids max de Fortune (40/45/15) : roll = 0.42*100 = 42 ; 42-40=2 >=0
  // (plus commun), 2-45<0 → rare. Avec les poids par défaut, 42 < 70 = commun.
  const fortune = { commun: 40, rare: 45, legendaire: 15 }
  assert.equal(rollRelique(seqRng([0, 0.42])).rarity, 'commun')
  assert.equal(rollRelique(seqRng([0, 0.42]), fortune).rarity, 'rare')
})

test('rollRelique : poids surchargés dans un autre ordre restent corrects', () => {
  // L'ordre des clés de l'override ne doit pas changer l'ordre de tirage.
  const shuffled = { legendaire: 15, commun: 40, rare: 45 }
  assert.equal(rollRelique(seqRng([0, 0.10]), shuffled).rarity, 'commun')
  assert.equal(rollRelique(seqRng([0, 0.99]), shuffled).rarity, 'legendaire')
})

test('reliqueEffect : magnitude = base * mult de la rareté', () => {
  // lame_rouillee base 5 ; rare mult 2.5 → 12.5
  assert.deepEqual(reliqueEffect('lame_rouillee', 'rare'), { type: 'dmg', pct: 12.5 })
  // banniere_loup base 8 ; legendaire mult 6 → 48
  assert.deepEqual(reliqueEffect('banniere_loup', 'legendaire'), { type: 'gold', pct: 48 })
  // commun mult 1
  assert.deepEqual(reliqueEffect('amulette_os', 'commun'), { type: 'gold', pct: 7 })
})

test('reliqueEffect : defId inconnu → null (relique fantôme filtrable)', () => {
  assert.equal(reliqueEffect('defId_supprime', 'commun'), null)
})

test('chaque def a un slot valide et un type d effet supporté', () => {
  for (const [id, def] of Object.entries(RELIQUES)) {
    assert.ok(RELIQUE_SLOTS.includes(def.slot), `slot invalide pour ${id}: ${def.slot}`)
    assert.ok(['dmg', 'gold', 'crit'].includes(def.effect.type), `type invalide pour ${id}`)
  }
})

test('equipRelique : slot vide → relique quitte l inventaire, entre dans son slot', () => {
  const r = { uid: 1, defId: 'lame_rouillee', rarity: 'commun' }   // slot arme
  const { inventory, equipped } = equipRelique([r], emptyEquipped(), r)
  assert.deepEqual(inventory, [])
  assert.equal(equipped.arme, r)
  assert.equal(equipped.armure, null)
})

test('equipRelique : slot occupé → swap, l ancienne revient en inventaire', () => {
  const old = { uid: 1, defId: 'lame_rouillee', rarity: 'commun' }   // arme
  const neu = { uid: 2, defId: 'hache_brisee', rarity: 'rare' }      // arme aussi
  const { inventory, equipped } = equipRelique([neu], { ...emptyEquipped(), arme: old }, neu)
  assert.equal(equipped.arme, neu)
  assert.deepEqual(inventory, [old])   // l'ancienne arme est de retour
})

test('equipRelique : invariant — total d instances conservé', () => {
  const a = { uid: 1, defId: 'lame_rouillee', rarity: 'commun' }
  const b = { uid: 2, defId: 'banniere_loup', rarity: 'rare' }
  const c = { uid: 3, defId: 'hache_brisee', rarity: 'commun' }   // arme, va swap a
  const start = { inventory: [b, c], equipped: { ...emptyEquipped(), arme: a } }
  const before = start.inventory.length + RELIQUE_SLOTS.filter(s => start.equipped[s]).length
  const after = equipRelique(start.inventory, start.equipped, c)
  const total = after.inventory.length + RELIQUE_SLOTS.filter(s => after.equipped[s]).length
  assert.equal(total, before)   // 3 instances avant et après
  // c est équipé, a est revenu en inventaire, aucune en double
  const uids = [...after.inventory.map(r => r.uid), ...RELIQUE_SLOTS.map(s => after.equipped[s]?.uid).filter(Boolean)]
  assert.deepEqual([...new Set(uids)].sort(), [1, 2, 3])
})

test('meltValue : croît avec la rareté, 0 si inconnue', () => {
  assert.ok(meltValue('commun') < meltValue('rare'))
  assert.ok(meltValue('rare') < meltValue('legendaire'))
  assert.equal(meltValue('???'), 0)
})

test('capInventory : sous le cap → inchangé, rien de fondu', () => {
  const inv = [{ uid: 1, defId: 'lame_rouillee', rarity: 'commun' }]
  const r = capInventory(inv, 30)
  assert.equal(r.inventory, inv)
  assert.deepEqual(r.melted, [])
})

test('capInventory : au-delà du cap → retire les plus faibles, garde les plus forts', () => {
  const faible = { uid: 1, defId: 'cotte_maille', rarity: 'commun' }    // dmg base 4 ×1 = 4
  const moyen  = { uid: 2, defId: 'hache_brisee', rarity: 'commun' }    // dmg base 6 ×1 = 6
  const fort   = { uid: 3, defId: 'oriflamme', rarity: 'legendaire' }   // gold base 10 ×6 = 60
  const r = capInventory([faible, fort, moyen], 2)
  assert.equal(r.inventory.length, 2)
  assert.deepEqual(r.inventory.map(x => x.uid).sort(), [2, 3])  // garde moyen + fort
  assert.deepEqual(r.melted.map(x => x.uid), [1])               // fond le plus faible
})

test('capInventory : cap 0 → tout fondu', () => {
  const inv = [{ uid: 1, defId: 'lame_rouillee', rarity: 'commun' }, { uid: 2, defId: 'oriflamme', rarity: 'rare' }]
  const r = capInventory(inv, 0)
  assert.equal(r.inventory.length, 0)
  assert.equal(r.melted.length, 2)
})

test('le pool couvre les trois natures d effet, dont le critique', () => {
  const kinds = new Set(Object.values(RELIQUES).map(d => d.effect.type))
  assert.deepEqual([...kinds].sort(), ['crit', 'dmg', 'gold'])
})

test('les reliques de critique ajoutent des POINTS, donc restent modestes', () => {
  // +3 à la rareté commune, ×6 en légendaire = +18 points sur une base de 8.
  // Au-delà, une seule relique ferait basculer tout le système.
  for (const [id, def] of Object.entries(RELIQUES)) {
    if (def.effect.type !== 'crit') continue
    const legendaire = reliqueEffect(id, 'legendaire').pct
    assert.ok(legendaire <= 20, `${id} : +${legendaire} points est trop fort`)
  }
})

test('les reliques de critique sont réparties sur plusieurs slots', () => {
  // Sinon elles se concurrenceraient entre elles et une seule compterait.
  const slots = new Set(Object.values(RELIQUES).filter(d => d.effect.type === 'crit').map(d => d.slot))
  assert.ok(slots.size >= 2, `les reliques de crit ne tiennent que ${slots.size} slot(s)`)
})

// ---------- FORGE ET FUSION (US 26) ----------

test('les niveaux forgés majorent l effet, sans dériver en flottant', () => {
  const brut = reliqueEffect('hache_brisee', 'legendaire', 0).pct
  const forge = reliqueEffect('hache_brisee', 'legendaire', 5).pct
  assert.equal(brut, 36)
  assert.equal(forge, 63)                       // 36 × 1,75
  assert.equal(reliqueEffect('hache_brisee', 'rare', 3).pct, 21.8)
  // Sans arrondi, 6 × 2,5 × 1,45 donnerait 21,749999999999996.
  assert.ok(Number.isFinite(reliqueEffect('hache_brisee', 'rare', 3).pct))
})

test('levelMult clampe hors bornes', () => {
  assert.equal(levelMult(0), 1)
  assert.equal(levelMult(-3), 1)
  assert.equal(levelMult(99), levelMult(RELIC_MAX_LEVEL))
  assert.equal(levelMult(undefined), 1, 'une relique de save ancienne n a pas de niveau')
})

test('le coût de forge croît avec le niveau ET avec la rareté', () => {
  assert.ok(forgeCost('rare', 0) > forgeCost('commun', 0))
  assert.ok(forgeCost('legendaire', 0) > forgeCost('rare', 0))
  assert.ok(forgeCost('commun', 3) > forgeCost('commun', 0))
  assert.equal(forgeCost('commun', RELIC_MAX_LEVEL), null, 'plus rien à forger au max')
  assert.equal(forgeCost('nawak', 0), null)
})

test('forgeRelique débite, monte le niveau, et reste pure', () => {
  const relic = { uid: 1, defId: 'lame_rouillee', rarity: 'commun', level: 0 }
  const res = forgeRelique(relic, 5000)
  assert.equal(res.relic.level, 1)
  assert.equal(res.gold, 5000 - forgeCost('commun', 0))
  assert.equal(relic.level, 0, 'l instance passée ne doit pas être mutée')
})

test('forgeRelique refuse sans or, au max, ou sur une relique fantôme', () => {
  const relic = { uid: 1, defId: 'lame_rouillee', rarity: 'commun', level: 0 }
  assert.equal(forgeRelique(relic, 1), null)
  assert.equal(forgeRelique({ ...relic, level: RELIC_MAX_LEVEL }, 1e9), null)
  assert.equal(forgeRelique({ ...relic, defId: 'disparue' }, 1e9), null)
  assert.equal(forgeRelique(null, 1e9), null)
})

test('nextRarity suit l échelle et s arrête à légendaire', () => {
  assert.equal(nextRarity('commun'), 'rare')
  assert.equal(nextRarity('rare'), 'legendaire')
  assert.equal(nextRarity('legendaire'), null)
  assert.equal(nextRarity('nawak'), null)
})

test('fusableGroups ne propose que ce qui est réellement fusionnable', () => {
  const inv = [
    { uid: 1, defId: 'lame_rouillee', rarity: 'commun' },
    { uid: 2, defId: 'lame_rouillee', rarity: 'commun' },
    { uid: 3, defId: 'lame_rouillee', rarity: 'commun' },
    { uid: 4, defId: 'oriflamme', rarity: 'commun' },
    // Trois légendaires : aucune rareté au-dessus, donc pas fusionnables.
    { uid: 5, defId: 'heaume_terni', rarity: 'legendaire' },
    { uid: 6, defId: 'heaume_terni', rarity: 'legendaire' },
    { uid: 7, defId: 'heaume_terni', rarity: 'legendaire' },
  ]
  const groups = fusableGroups(inv)
  assert.equal(groups.length, 1)
  assert.deepEqual(groups[0], { defId: 'lame_rouillee', rarity: 'commun', count: 3, into: 'rare' })
})

test('fusableGroups ignore les reliques fantômes', () => {
  const inv = Array.from({ length: 3 }, (_, i) => ({ uid: i, defId: 'disparue', rarity: 'commun' }))
  assert.deepEqual(fusableGroups(inv), [])
  assert.deepEqual(fusableGroups(), [])
})

test('fuseRelique consomme trois exemplaires et monte la rareté', () => {
  const inv = Array.from({ length: 3 }, (_, i) => ({ uid: i, defId: 'lame_rouillee', rarity: 'commun', level: 0 }))
  const res = fuseRelique(inv, 'lame_rouillee', 'commun', 42)
  assert.equal(res.relic.rarity, 'rare')
  assert.equal(res.relic.uid, 42)
  assert.equal(res.inventory.length, 0)
})

test('la fusion PROTÈGE l investissement : les moins forgées partent d abord', () => {
  const inv = [
    { uid: 1, defId: 'lame_rouillee', rarity: 'commun', level: 0 },
    { uid: 2, defId: 'lame_rouillee', rarity: 'commun', level: 0 },
    { uid: 3, defId: 'lame_rouillee', rarity: 'commun', level: 0 },
    { uid: 4, defId: 'lame_rouillee', rarity: 'commun', level: 4 },
  ]
  const res = fuseRelique(inv, 'lame_rouillee', 'commun', 42)
  assert.deepEqual(res.inventory.map(r => r.uid), [4], 'la relique forgée doit survivre')
  assert.equal(res.relic.level, 0)
})

test('quand tout doit être consommé, le meilleur niveau est conservé', () => {
  const inv = [
    { uid: 1, defId: 'lame_rouillee', rarity: 'commun', level: 1 },
    { uid: 2, defId: 'lame_rouillee', rarity: 'commun', level: 3 },
    { uid: 3, defId: 'lame_rouillee', rarity: 'commun', level: 2 },
  ]
  const res = fuseRelique(inv, 'lame_rouillee', 'commun', 42)
  assert.equal(res.relic.level, 3, 'fusionner ne doit jamais faire perdre des niveaux')
})

test('fuseRelique refuse en dessous de trois, ou au sommet de l échelle', () => {
  const two = Array.from({ length: 2 }, (_, i) => ({ uid: i, defId: 'lame_rouillee', rarity: 'commun' }))
  assert.equal(fuseRelique(two, 'lame_rouillee', 'commun', 1), null)
  const legend = Array.from({ length: 3 }, (_, i) => ({ uid: i, defId: 'lame_rouillee', rarity: 'legendaire' }))
  assert.equal(fuseRelique(legend, 'lame_rouillee', 'legendaire', 1), null)
})

test('la fonte rend davantage sur une relique forgée', () => {
  assert.equal(meltValue('legendaire', 0), 200)
  assert.equal(meltValue('legendaire', RELIC_MAX_LEVEL), 350)
  assert.equal(meltValue('commun'), 15, 'sans niveau précisé, valeur de base')
})

test('le cap d inventaire sacrifie les reliques les plus FAIBLES, niveaux compris', () => {
  // Une commune très forgée doit survivre à une rare brute si elle vaut plus.
  const forte = { uid: 1, defId: 'hache_brisee', rarity: 'commun', level: 5 }   // 10,5%
  const faible = { uid: 2, defId: 'cotte_maille', rarity: 'commun', level: 0 }  // 4%
  const { inventory, melted } = capInventory([faible, forte], 1)
  assert.deepEqual(inventory.map(r => r.uid), [1])
  assert.deepEqual(melted.map(r => r.uid), [2])
})

test('BORNE D ÉQUILIBRE : la forge majore de 75%, pas d un ordre de grandeur', () => {
  // C'est l'invariant qui dispense de réétalonner la courbe : chaque relique vaut
  // exactement ×1,75 de ce qu'elle valait avant US 26, jamais plus.
  for (const id of Object.keys(RELIQUES)) {
    const brut = reliqueEffect(id, 'legendaire', 0).pct
    const forge = reliqueEffect(id, 'legendaire', RELIC_MAX_LEVEL).pct
    assert.equal((forge / brut).toFixed(2), '1.75', id)
  }
})

test('BORNE D ÉQUILIBRE : plafond par NATURE d effet', () => {
  // Un même pourcentage ne pèse pas pareil selon ce qu'il majore : +105% d'or est
  // sain, +105% de dégâts ne le serait pas. On borne donc par type.
  const max = { dmg: 0, gold: 0, crit: 0 }
  for (const id of Object.keys(RELIQUES)) {
    const e = reliqueEffect(id, 'legendaire', RELIC_MAX_LEVEL)
    max[e.type] = Math.max(max[e.type], e.pct)
  }
  assert.ok(max.dmg <= 70, `+${max.dmg}% de dégâts par slot est trop`)
  assert.ok(max.gold <= 120, `+${max.gold}% d or par slot est trop`)
  assert.ok(max.crit <= 35, `+${max.crit} pts de critique par slot est trop`)
})
