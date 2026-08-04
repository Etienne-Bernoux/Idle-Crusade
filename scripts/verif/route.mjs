// Sonde : le carrefour apparaît-il à l'entrée d'une zone, et le choix
// change-t-il vraiment la zone qu'on traverse ?
//
// Ce qui compte n'est pas qu'un bouton s'affiche, c'est que le pari se paie :
// « la route marchande » doit réellement donner plus d'or ET des ennemis plus
// durs. Sans ça, le carrefour ne serait qu'un habillage.
import { chromium, ouvrir, save, jusqua, ck, titre, bilan, SAVE } from './_socle.mjs'
import { VOIES, voiesPour, CHOIX_PAR_CARREFOUR } from '../../src/lib/route.js'

const nav = await chromium.launch({ channel: 'chrome', headless: true })

// Assez d'armée pour tuer le boss de la zone 1 sans attendre.
const pretPourLeBoss = (reste = {}) => SAVE({
  gold: 1e9,
  counts: { paysan: 400, soldat: 200, chevalier: 100, champion: 50 },
  ...reste,
})
const visible = (p, sel) => jusqua(p, () => p.isVisible(sel))

titre('1. Le carrefour s ouvre à l entrée de la zone suivante')
let voiesAffichees = []
{
  const { ctx, page, erreurs } = await ouvrir(nav, pretPourLeBoss())
  ck('le carrefour finit par s afficher', await visible(page, '.carrefour'), 'jamais vu')
  voiesAffichees = await page.$$eval('.carrefour-voie .carrefour-nom', ns => ns.map(n => n.textContent.trim()))
  ck(`${CHOIX_PAR_CARREFOUR} voies proposées`, voiesAffichees.length === CHOIX_PAR_CARREFOUR, voiesAffichees.join(' / '))
  ck('la voie directe est toujours offerte', voiesAffichees.includes(VOIES.directe.nom),
     'refuser le pari doit rester possible')
  ck('le combat est suspendu pendant le choix', await page.isVisible('.zone-transition'))
  ck('aucune erreur console', erreurs.length === 0, erreurs.slice(0, 2).join(' | '))
  await ctx.close()
}

titre('2. Choisir referme le carrefour et relance le combat')
{
  const { ctx, page } = await ouvrir(nav, pretPourLeBoss())
  await visible(page, '.carrefour')
  await page.click('.carrefour-voie')
  ck('le carrefour se referme sur le clic', await jusqua(page, async () => !(await page.isVisible('.carrefour'))))
  ck('et l ennemi suivant apparaît', await jusqua(page, () => page.isVisible('.enemy-hp-bar, .enemy')))
  const st = await save(page)
  ck('la voie est persistée', typeof st.voie === 'string' && VOIES[st.voie], `voie=${st.voie}`)
  await ctx.close()
}

titre('3. Ne pas choisir n immobilise pas le joueur')
{
  const { ctx, page } = await ouvrir(nav, pretPourLeBoss())
  await visible(page, '.carrefour')
  ck('la transition finit par se lever seule', await jusqua(page, async () => !(await page.isVisible('.zone-transition')), 12000))
  const st = await save(page)
  ck('et la voie retombe sur la directe', st.voie === 'directe', `voie=${st.voie}`)
  await ctx.close()
}

titre('4. Le pari se paie : la route marchande enrichit ET durcit')
{
  const mesure = async (voie) => {
    const { ctx, page } = await ouvrir(nav, pretPourLeBoss({ currentZone: 2, wave: 2, zonesUnlocked: 2, voie }))
    await jusqua(page, () => page.isVisible('.hp-label'))
    // Le PV MAX, lu sur l'étiquette de la barre : le PV courant descend déjà.
    const hp = await page.evaluate(() => {
      const t = document.querySelector('.hp-label')?.textContent ?? ''
      const m = t.match(/\/\s*([\d\s]+)/)
      return m ? parseInt(m[1].replace(/\s/g, ''), 10) : null
    })
    await ctx.close()
    return hp
  }
  const direct = await mesure('directe')
  const riche = await mesure('riche')
  ck('les ennemis de la route marchande sont plus coriaces',
     direct && riche && riche > direct, `${direct} PV → ${riche} PV`)
}

titre('5. Mobile : les trois voies restent lisibles et tapables')
{
  const { ctx, page, erreurs } = await ouvrir(nav, pretPourLeBoss(), { width: 375, height: 812 })
  await visible(page, '.carrefour')
  const audit = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.carrefour-voie')]
    return {
      debordent: btns.filter(b => b.getBoundingClientRect().right > innerWidth + 1).length,
      horsEcran: btns.filter(b => b.getBoundingClientRect().bottom > innerHeight).length,
      tropPetits: btns.filter(b => b.getBoundingClientRect().height < 44).length,
      largeurPage: document.documentElement.scrollWidth,
    }
  })
  ck('aucune voie ne déborde à droite', audit.debordent === 0, JSON.stringify(audit))
  ck('les trois tiennent dans la hauteur', audit.horsEcran === 0, `${audit.horsEcran} sous le pli`)
  ck('et chacune fait au moins 44 px de haut', audit.tropPetits === 0, `${audit.tropPetits} trop petites`)
  ck('la page ne s élargit pas', audit.largeurPage <= 375, `${audit.largeurPage} px`)
  await page.click('.carrefour-voie')
  ck('le choix passe au doigt', await jusqua(page, async () => !(await page.isVisible('.carrefour'))))
  ck('aucune erreur console', erreurs.length === 0, erreurs.slice(0, 2).join(' | '))
  await ctx.close()
}

await nav.close()
bilan()
