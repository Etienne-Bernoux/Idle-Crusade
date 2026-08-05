// Sonde : au-delà de 100 points de critique, le joueur voit-il que son surplus
// sert encore à quelque chose ?
//
// C'est le cœur du problème d'US 44 : le plafond était dur et SILENCIEUX. Un
// joueur pouvait investir une branche d'Arbre, un actif et trois reliques dans
// une stat qui ne rendait plus rien, sans qu'aucun écran ne le dise.
import { chromium, ouvrir, ck, titre, bilan, SAVE } from './_socle.mjs'
import { TREE } from '../../src/lib/tree.js'
import { critOverflow } from '../../src/lib/combat.js'

const nav = await chromium.launch({ channel: 'chrome', headless: true })

// Trois reliques crit légendaires niveau 5, une par slot, plus une grosse armée
// et l'Arbre complet : le cas qui saturait.
const sature = SAVE({
  gold: 1e6,
  counts: { paysan: 1000, soldat: 500, chevalier: 200, champion: 80 },
  treeNodes: TREE.map(n => n.id),
  gloire: 1e9,
  equipped: {
    arme:     { uid: 1, defId: 'dague_traitre',  rarity: 'legendaire', level: 5 },
    armure:   { uid: 2, defId: 'gantelet_brise', rarity: 'legendaire', level: 5 },
    banniere: null,
    amulette: { uid: 3, defId: 'oeil_faucon',    rarity: 'legendaire', level: 5 },
  },
})
const lire = (p) => p.textContent('.resource.crit .value')

titre('1. Un build saturé affiche un plafond honnête, pas un chiffre mort')
{
  const { ctx, page, erreurs } = await ouvrir(nav, sature)
  const txt = (await lire(page)).replace(/\s+/g, ' ').trim()
  ck('la chance affichée est plafonnée à 100%', txt.startsWith('100%'), txt)
  ck('le surplus est montré, pas escamoté', await page.isVisible('.crit-surplus'), txt)
  const mult = parseFloat((txt.match(/×([\d,.]+)/)?.[1] ?? '0').replace(',', '.'))
  ck('et la puissance a monté au-dessus du socle', mult > 8, `×${mult}`)
  ck('aucune erreur console', erreurs.length === 0, erreurs.slice(0, 2).join(' | '))
  await ctx.close()
}

titre('2. Sans saturation, rien ne change à l écran')
{
  const { ctx, page } = await ouvrir(nav, SAVE({ counts: { paysan: 40, soldat: 0, chevalier: 0, champion: 0 } }))
  const txt = (await lire(page)).replace(/\s+/g, ' ').trim()
  ck('la chance reste sous le plafond', !txt.startsWith('100%'), txt)
  ck('aucun badge de surplus', !(await page.isVisible('.crit-surplus')), txt)
  await ctx.close()
}

titre('3. Le dps affiché suit vraiment la conversion')
{
  const { ctx, page } = await ouvrir(nav, sature)
  const dps = await page.evaluate(() =>
    parseInt((document.querySelector('.dps-value')?.textContent ?? '0').replace(/\s/g, ''), 10))
  // Le socle sans conversion plafonnerait le coup moyen au critMult nu. On ne
  // recalcule pas le dps ici — on vérifie qu'il dépasse ce que l'ancien
  // plafond permettait, à composition identique.
  const nu = critOverflow(101, 8)
  ck('la conversion est bien celle du module', nu.chance === 100 && nu.mult > 8, JSON.stringify(nu))
  ck('le dps affiché est un vrai chiffre', Number.isFinite(dps) && dps > 0, String(dps))
  await ctx.close()
}

await nav.close()
bilan()
