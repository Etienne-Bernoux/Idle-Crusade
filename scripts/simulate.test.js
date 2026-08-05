// Les bornes qui comptent sont des DURÉES DE RUN, pas des pourcentages par slot.
//
// Pourquoi ce fichier existe : le projet bornait par le raisonnement, puis
// figeait la borne dans un test unitaire. Trois fois de suite la mesure de run
// a démoli ce que l'analyse validait — la non-dominance des voies (US 45), le
// plancher de boss (US 45), la lisibilité du conseil de composition (US 31).
// Un test analytique ne voit pas qu'un bonus d'or achète de l'armée.
//
// Ces tests jouent donc de VRAIS runs. Ils sortent zone 5 sur 4 graines, ce qui
// prend quelques centièmes de seconde : assez pour qu'ils vivent dans `npm test`.
import test from 'node:test'
import assert from 'node:assert/strict'
import { meilleurStuff, vitesseRelative } from './simulate.mjs'
import { ACHIEVEMENTS } from '../src/lib/achievements.js'

// Plafond du butin : 4 slots légendaires forgés à fond, portés 40 h. Mesuré à
// ×5,1. La borne du test est plus large que la mesure, à dessein — elle n'est
// pas là pour geler un chiffre, mais pour crier si une relique ajoutée demain
// fait passer le stuff maximal de ×5 à ×20.
const PLAFOND_BUTIN = 8

test('un stuff de reliques maximal ne dépasse pas le plafond de butin', () => {
  const v = vitesseRelative({ equipped: meilleurStuff('tout'), patine: 1.5 })
  assert.ok(v <= PLAFOND_BUTIN, `stuff maximal à ×${v.toFixed(2)}, plafond ×${PLAFOND_BUTIN}`)
  // Et il doit valoir quelque chose, sinon le loot ne sert à rien.
  assert.ok(v >= 3, `stuff maximal à seulement ×${v.toFixed(2)}`)
})

test('la rareté et la forge se voient en run, pas seulement en pourcentage', () => {
  const pauvre = vitesseRelative({ equipped: meilleurStuff('dmg', 'commun', 0) })
  const riche = vitesseRelative({ equipped: meilleurStuff('dmg') })
  assert.ok(riche > pauvre * 1.4,
    `commun ×${pauvre.toFixed(2)} → légendaire forgé ×${riche.toFixed(2)}`)
})

test('les succès restent « légers », au sens mesuré du terme', () => {
  // 207 succès qui empilent quatre stats : « léger » ne veut rien dire tant
  // qu'on n'a pas joué le catalogue complet contre un joueur qui n'en a aucun.
  const v = vitesseRelative({ achievements: 'all' })
  assert.ok(v <= 3, `le catalogue complet vaut ×${v.toFixed(2)} — ce n'est plus léger`)
  assert.ok(ACHIEVEMENTS.length >= 200)
})

test('la Patine reste un supplément, jamais le plat principal', () => {
  // Son plafond est ×1,5 sur l'effet des reliques. Si elle valait davantage que
  // le passage commun → légendaire, elle écraserait la boucle de butin.
  const sans = vitesseRelative({ equipped: meilleurStuff('tout') })
  const avec = vitesseRelative({ equipped: meilleurStuff('tout'), patine: 1.5 })
  assert.ok(avec > sans, 'la Patine doit servir à quelque chose')
  assert.ok(avec < sans * 1.6, `la Patine multiplie le stuff par ${(avec / sans).toFixed(2)}`)
})
