import test from 'node:test'
import assert from 'node:assert/strict'
import {
  VOEUX, VOEU_IDS, VOEU_GLOIRE_MULT, BRANCHES_SANS_VOEU,
  voeuById, isVoeuUnlocked, unlockedVoeux, resolveVoeu, voeuEffects,
  isTierBanned, voeuOfBranch, coveredBranches,
} from './voeux.js'
import { BRANCHES, TREE } from './tree.js'

test('chaque Vœu est présentable et nomme une branche réelle', () => {
  for (const id of VOEU_IDS) {
    const v = VOEUX[id]
    assert.ok(v.name && v.sprite, `${id} sans nom ou emoji`)
    assert.ok(v.renoncement, `${id} sans renoncement — un Vœu qui ne coûte rien n'est pas un choix`)
    assert.ok(v.contrepartie, `${id} sans contrepartie`)
    assert.ok(v.metric, `${id} sans métrique`)
    assert.ok(BRANCHES.some(b => b.id === v.branch), `${id} pointe vers une branche inconnue`)
  }
})

test('chaque Vœu gagne sur une métrique DIFFÉRENTE', () => {
  // Le cœur du système. Si deux Vœux gagnaient sur le même axe, ils se
  // classeraient — et on aurait reproduit le défaut de l'Arbre qu'ils corrigent.
  const m = VOEU_IDS.map(id => VOEUX[id].metric)
  assert.equal(new Set(m).size, m.length, `doublon de métrique : ${m.join(', ')}`)
})

test('une branche porte au plus un Vœu', () => {
  const b = VOEU_IDS.map(id => VOEUX[id].branch)
  assert.equal(new Set(b).size, b.length, `deux Vœux sur la même branche : ${b.join(', ')}`)
})

test('la branche Croisade n a délibérément pas de Vœu', () => {
  // Deux candidats mesurés puis écartés (cf. commentaire dans voeux.js) : l'un
  // murait la progression, l'autre pouvait rendre un run injouable. Ce test
  // existe pour que combler ce trou soit une DÉCISION, pas une dérive.
  for (const id of BRANCHES_SANS_VOEU) assert.equal(voeuOfBranch(id), null)
  assert.equal(coveredBranches().length, BRANCHES.length - BRANCHES_SANS_VOEU.length)
})

test('un Vœu se débloque en poussant SA branche à fond', () => {
  for (const id of VOEU_IDS) {
    const apex = TREE.find(n => n.branch === VOEUX[id].branch && n.id.endsWith('-apex'))
    assert.ok(apex, `pas d'apex pour ${VOEUX[id].branch}`)
    assert.ok(isVoeuUnlocked(id, [apex.id]), `${id} devrait être débloqué par ${apex.id}`)
    assert.equal(isVoeuUnlocked(id, []), false, `${id} ne doit rien donner sans arbre`)
  }
})

test('un Vœu ne se débloque pas par la branche d à côté', () => {
  const autre = TREE.find(n => n.branch === 'guerre' && n.id.endsWith('-apex'))
  assert.equal(isVoeuUnlocked('fer', [autre.id]), false)
})

test('resolveVoeu retombe sur « aucun » quand l arbre a été remis à zéro', () => {
  // La Légende vide l'Arbre : le Vœu choisi ne doit pas survivre en silence.
  assert.equal(resolveVoeu('fer', []), null)
  assert.equal(resolveVoeu('inexistant', TREE.map(n => n.id)), null)
  assert.equal(resolveVoeu('fer', ['reliques-chance-apex']), 'fer')
})

test('aucun Vœu ne donne QUE des avantages', () => {
  // Un Vœu strictement meilleur ramènerait le classement qu'on veut supprimer.
  // Mesuré : à ×4, le Vœu de Fer était plus rapide ET plus riche ET mieux loti.
  for (const id of VOEU_IDS) {
    const e = voeuEffects(id)
    const coute = e.goldMult < 1 || e.mute || e.bannedTiers.length > 0 || e.relicSlots !== null
    assert.ok(coute, `${id} ne renonce à rien`)
  }
})

test('tous portent la prime commune, sinon ne rien prendre serait toujours plus sûr', () => {
  for (const id of VOEU_IDS) assert.ok(voeuEffects(id).gloireMult >= VOEU_GLOIRE_MULT)
  assert.equal(voeuEffects(null).gloireMult, 1)
})

test('un état neutre quand aucun Vœu n est pris', () => {
  const e = voeuEffects(null)
  assert.equal(e.goldMult, 1)
  assert.equal(e.mute, false)
  assert.equal(e.relicMult, 1)
  assert.equal(e.relicSlots, null)
  assert.deepEqual(e.bannedTiers, [])
  assert.equal(isTierBanned(null, 'champion'), false)
})

test('voeuById et unlockedVoeux répondent sur le catalogue et rien d autre', () => {
  assert.equal(voeuById('fer').branch, 'reliques')
  assert.equal(voeuById('nope'), null)
  assert.deepEqual(unlockedVoeux([]), [])
  assert.ok(unlockedVoeux(TREE.map(n => n.id)).length === VOEU_IDS.length)
})
