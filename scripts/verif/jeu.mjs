// Sonde : la boucle de jeu et ses systèmes répondent-ils encore ?
//
// Couvre ce qu'aucun test unitaire ne voit — que les modules purs sont CÂBLÉS,
// que cliquer fait quelque chose, qu'un écran s'ouvre et rend ce qu'il doit.
import { chromium, ouvrir, save, jusqua, ck, titre, bilan, SAVE, BRANCHE } from './_socle.mjs'

const nav = await chromium.launch({ channel: 'chrome', headless: true })
const pv = p => p.evaluate(() => {
  const t = document.querySelector('.hp-label')?.textContent ?? ''
  return parseFloat((t.match(/([\d ,.]+)\s*\//)?.[1] ?? '0').replace(/\s/g, '').replace(',', '.'))
})

titre('1. La Frappe — sans armée, il faut cliquer')
{
  const { ctx, page, erreurs } = await ouvrir(nav, SAVE({ counts: { paysan: 0, soldat: 0, chevalier: 0, champion: 0 }, gold: 0 }))
  const depart = await pv(page)
  await page.waitForTimeout(2500)
  ck('rien ne bouge sans cliquer', (await pv(page)) === depart, `${depart}`)
  // Le sprite oscille en permanence : Playwright le juge « instable », un doigt non.
  for (let i = 0; i < 4; i++) { await page.click('.enemy-sprite', { force: true }); await page.waitForTimeout(80) }
  ck('cliquer blesse', (await pv(page)) < depart)
  ck('aucune erreur console', erreurs.length === 0, erreurs.slice(0, 2).join(' | '))
  await ctx.close()
}

titre('2. Améliorer la Frappe, et que ça survive')
{
  const { ctx, page, erreurs } = await ouvrir(nav, SAVE({ gold: 100000 }))
  const avant = await page.textContent('.frappe-card .unit-stats')
  await page.click('.frappe-buy')
  await jusqua(page, async () => (await save(page)).frappeNiveau === 1)
  ck('les dégâts par clic montent', (await page.textContent('.frappe-card .unit-stats')) !== avant)
  ck('le niveau est persisté', (await save(page)).frappeNiveau === 1)
  ck('aucune erreur console', erreurs.length === 0, erreurs.slice(0, 2).join(' | '))
  await ctx.close()
}

titre('3. La lecture de composition suit l ennemi')
{
  // Le piège documenté du projet : une valeur lue DANS une fonction crée une
  // dépendance invisible, et le chiffre resterait figé sur le premier ennemi.
  const { ctx, page, erreurs } = await ouvrir(nav, SAVE({
    counts: { paysan: 200, soldat: 150, chevalier: 45, champion: 0 },
    currentZone: 3, zonesUnlocked: 3, zonesCleared: 2, gold: 1e6,
  }))
  ck('la lecture est affichée', await page.isVisible('.compo'))
  const vues = new Set()
  for (let i = 0; i < 30; i++) { vues.add(await page.textContent('.compo-ratio')); await page.waitForTimeout(400) }
  ck('le ratio varie avec les ennemis', vues.size > 1, `${vues.size} valeurs : ${[...vues].join(' ')}`)
  ck('aucune erreur console', erreurs.length === 0, erreurs.slice(0, 2).join(' | '))
  await ctx.close()
}

titre('4. Le Conseil du retour')
{
  const { ctx, page, erreurs } = await ouvrir(nav, SAVE({ savedAt: Date.now() - 6 * 3600e3 }))
  ck('six heures d absence ouvrent le Conseil', await page.isVisible('.conseil-carte'))
  const n = (await page.$$('.conseil-carte')).length
  ck('trois cartes au maximum', n > 0 && n <= 3, `${n}`)
  ck('deux options par carte', (await page.$$('.conseil-choix .modal-btn')).length === n * 2)
  await page.click('.conseil-choix .modal-btn')
  ck('trancher retire la carte', await jusqua(page, async () => (await save(page)).conseil.length === n - 1))
  ck('aucune erreur console', erreurs.length === 0, erreurs.slice(0, 2).join(' | '))
  await ctx.close()
}

titre('5. Les Pierres de Vœu')
{
  const { ctx, page } = await ouvrir(nav, SAVE({ treeNodes: BRANCHE('reliques'), voeu: 'fer' }))
  ck('le Vœu de Fer ne laisse qu un emplacement', (await page.$$('.relic-line')).length === 1)
  await ctx.close()
  const muet = await ouvrir(nav, SAVE({ treeNodes: BRANCHE('guerre'), voeu: 'silence', zonesUnlocked: 5 }))
  ck('le Vœu de Silence coupe les actifs', (await muet.page.$$('.active-btn:not([disabled])')).length === 0)
  await muet.ctx.close()
  // Il faut 5 zones vaincues pour que l'écran de Croisade montre son sélecteur ;
  // en deçà il affiche l'état verrouillé, et il n'y a rien à inspecter.
  const sans = await ouvrir(nav, SAVE({ treeNodes: ['racine'], zonesCleared: 5, zonesUnlocked: 6, deepestEver: 6 }))
  await sans.page.click('.header-btn.crusade')
  await sans.page.waitForSelector('.biome-picker', { timeout: 5000 })
  ck('aucun Vœu proposé sans apex', !((await sans.page.textContent('.biome-picker')) ?? '').includes('Pierre de Vœu'))
  await sans.ctx.close()
}

titre('6. Chaque écran s ouvre et rend quelque chose')
{
  const { ctx, page, erreurs } = await ouvrir(nav, SAVE({
    gloire: 900000, treeNodes: ['racine'], deepestEver: 14, legendeDeepest: 14,
    prestigeCount: 5, zonesCleared: 5, zonesUnlocked: 6, bossKills: 50,
  }))
  const ecrans = [
    ['Améliorer', '.header-btn:has-text("Améliorer")', '.modal'],
    ['Succès', '.header-btn:has-text("Succès")', '.achievement'],
    ['Forge', '.header-btn:has-text("Forge")', 'g[role=button]'],
    ['Réglages', '.header-btn:has-text("Réglages")', '.settings-code'],
    ['Croisade', '.header-btn.crusade', '.modal'],
    ['Légende', '.header-btn.legende', '.modal'],
  ]
  for (const [nom, bouton, contenu] of ecrans) {
    const b = await page.$(bouton)
    if (!b) { ck(`${nom} : bouton présent`, false, 'absent'); continue }
    await b.click()
    await page.waitForTimeout(350)
    ck(`${nom} s ouvre et rend son contenu`, await page.isVisible(contenu))
    await page.click('.modal-btn.ghost').catch(() => {})
    await page.waitForTimeout(200)
  }
  ck('aucune erreur console', erreurs.length === 0, erreurs.slice(0, 2).join(' | '))
  await ctx.close()
}

titre('7. Export / import de save')
{
  const a = await ouvrir(nav, SAVE({ gold: 777777, currentZone: 4, zonesUnlocked: 4, prestigeCount: 9 }))
  await a.page.click('.header-btn:has-text("Réglages")')
  await a.page.waitForSelector('.settings-code')
  const code = await a.page.inputValue('.settings-code')
  ck('un code est produit', code.startsWith('IDLECRUSADE1:'), `${code.length} caractères`)
  await a.ctx.close()

  const b = await ouvrir(nav, SAVE())
  await b.page.click('.header-btn:has-text("Réglages")')
  await b.page.waitForSelector('.settings-code')
  const champs = await b.page.$$('.settings-code')
  await champs[1].fill('nawak')
  await b.page.waitForTimeout(300)
  ck('un code invalide est refusé avec une raison', await b.page.isVisible('.settings-error'))
  await champs[1].fill(code)
  await b.page.waitForTimeout(400)
  ck('un code valide montre ce qu on va écraser', await b.page.isVisible('.settings-preview'))
  await b.page.click('.modal-btn.primary:has-text("Remplacer")')
  ck('la partie est réellement chargée', await jusqua(b.page, async () => (await save(b.page)).gold === 777777))
  await b.ctx.close()
}

await nav.close()
bilan()
