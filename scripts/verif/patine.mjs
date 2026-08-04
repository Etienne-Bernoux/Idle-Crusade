// Sonde : une relique portée prend-elle vraiment de la valeur, et le
// déséquipement remet-il bien le compteur à zéro ?
//
// C'est la remise à zéro qui crée l'arbitrage. Sans elle, la Patine ne serait
// qu'un compteur qui monte, et jeter une relique ne coûterait rien.
import { chromium, ouvrir, save, jusqua, ck, titre, bilan, SAVE } from './_socle.mjs'
import { PATINE_HEURE_MS, PATINE_MAX } from '../../src/lib/patine.js'

const nav = await chromium.launch({ channel: 'chrome', headless: true })

const relique = (equippedAt) => ({ uid: 1, defId: 'lame_rouillee', rarity: 'legendaire', level: 0, equippedAt })
const equipee = ({ depuis, reste = {} }) => SAVE({
  counts: { paysan: 60, soldat: 0, chevalier: 0, champion: 0 },
  equipped: { arme: relique(depuis), armure: null, banniere: null, amulette: null },
  ...reste,
})
const effet = (p) => p.evaluate(() => {
  const t = document.querySelector('.relic-line-effect')?.textContent ?? ''
  return parseFloat((t.match(/\+([\d,.]+)/)?.[1] ?? '0').replace(',', '.'))
})

titre('1. Une relique neuve ne vaut que sa valeur')
{
  const { ctx, page, erreurs } = await ouvrir(nav, equipee({ depuis: Date.now() }))
  ck('aucun marqueur de patine sur du neuf', !(await page.isVisible('.relic-patine')))
  ck('aucune erreur console', erreurs.length === 0, erreurs.slice(0, 2).join(' | '))
  await ctx.close()
}

titre('2. Portée longtemps, elle vaut plus — et ça se voit')
{
  const neuve = await ouvrir(nav, equipee({ depuis: Date.now() }))
  const base = await effet(neuve.page)
  await neuve.ctx.close()

  const murie = await ouvrir(nav, equipee({ depuis: Date.now() - 50 * PATINE_HEURE_MS }))
  const apres = await effet(murie.page)
  ck('l effet a grandi', apres > base, `${base} → ${apres}`)
  ck('et il reste plafonné', apres <= base * PATINE_MAX * 1.01, `×${(apres / base).toFixed(2)}`)
  ck('un marqueur de patine est affiché', await murie.page.isVisible('.relic-patine'))
  await murie.ctx.close()
}

titre('3. Changer d avis coûte la maturation')
{
  const { ctx, page, erreurs } = await ouvrir(nav, equipee({
    depuis: Date.now() - 50 * PATINE_HEURE_MS,
    reste: { inventory: [{ uid: 2, defId: 'lame_rouillee', rarity: 'commun', level: 0 }] },
  }))
  const avant = await effet(page)
  await page.click('.relic-item')
  ck('équiper horodate la nouvelle', await jusqua(page, async () => {
    const s = await save(page)
    return typeof s.equipped?.arme?.equippedAt === 'number'
  }))
  const st = await save(page)
  const pose = st.equipped?.arme?.equippedAt
  ck('la nouvelle repart de zéro', typeof pose === 'number' && Math.abs(Date.now() - pose) < 60000,
     pose ? `posée il y a ${Math.round((Date.now() - pose) / 1000)} s` : 'aucun horodatage')
  const apres = await effet(page)
  ck('et son effet est retombé', apres < avant, `${avant} → ${apres}`)
  ck('aucune erreur console', erreurs.length === 0, erreurs.slice(0, 2).join(' | '))
  await ctx.close()
}

await nav.close()
bilan()
