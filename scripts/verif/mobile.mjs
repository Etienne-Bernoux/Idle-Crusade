// Sonde : le jeu est-il JOUABLE sur un téléphone ?
//
// Elle existe parce qu'un contrôle plus simple a menti pendant des semaines :
// `scrollWidth <= innerWidth` restait vert alors que la barre de ressources
// s'étendait sur le double du viewport. La cause : `overflow-x: hidden` ne
// résout pas un débordement, il le CACHE — y compris au test.
//
// On mesure donc quatre familles de défauts, et surtout la jouabilité : un
// écran parfaitement contenu peut être inutilisable.
import { chromium, ouvrir, ck, titre, bilan, SAVE } from './_socle.mjs'

const LARGEURS = [320, 360, 375, 414, 768]

// Un élément n'est « inatteignable » que s'il sort du viewport SANS qu'aucun
// ancêtre défilable ne puisse l'y amener. Sans cette nuance, tout contenu d'un
// cadre à défilement est un faux positif — trois itérations perdues à
// « corriger » un arbre qui allait très bien.
const AUDIT = `(() => {
  const vw = innerWidth, out = { page: [], hors: [], petits: [], coupes: [] }
  if (document.documentElement.scrollWidth > vw + 1) out.page.push(document.documentElement.scrollWidth + ' > ' + vw)
  const defilable = el => { for (let a = el.parentElement; a; a = a.parentElement) {
    const o = getComputedStyle(a).overflowX
    if ((o === 'auto' || o === 'scroll') && a.scrollWidth > a.clientWidth + 1) return true } return false }
  const nom = el => (typeof el.className === 'string' && el.className.trim())
    ? '.' + el.className.trim().split(/\\s+/)[0] : el.tagName
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect()
    if (!r.width && !r.height) continue
    if ((r.right > vw + 1 || r.left < -1) && !defilable(el)) out.hors.push(nom(el))
  }
  for (const el of document.querySelectorAll('button, [role=button]')) {
    const r = el.getBoundingClientRect()
    if (!r.width && !r.height) continue
    if (r.height < 32 || r.width < 32) out.petits.push(nom(el) + ' ' + Math.round(r.width) + '×' + Math.round(r.height))
  }
  for (const el of document.querySelectorAll('.header-btn, .resource, .unit-name, .compo-ratio, .zone-name, .modal-title')) {
    if (el.scrollWidth > el.clientWidth + 2) out.coupes.push(nom(el))
  }
  const u = a => [...new Set(a)]
  return { page: out.page, hors: u(out.hors), petits: u(out.petits), coupes: u(out.coupes) }
})()`

const PARTIE = SAVE({
  gold: 5e8, counts: { paysan: 30, soldat: 10, chevalier: 3, champion: 0 },
  currentZone: 12, zonesUnlocked: 12, zonesCleared: 11, wave: 3,
  gloire: 900000, deepestEver: 14, legendeDeepest: 14, prestigeCount: 12,
  legendePoints: 120, legendeCount: 2, bossKills: 400, buyMode: 'max',
})

const nav = await chromium.launch({ channel: 'chrome', headless: true })

for (const w of LARGEURS) {
  titre(`═══ ${w} px ═══`)
  const { ctx, page, erreurs } = await ouvrir(nav, PARTIE, { width: w, height: 740, hasTouch: true, isMobile: w < 600 })
  const propre = a => a.page.length === 0 && a.hors.length === 0 && a.petits.length === 0 && a.coupes.length === 0

  ck(`${w} · écran principal sain`, propre(await page.evaluate(AUDIT)), JSON.stringify(await page.evaluate(AUDIT)))

  // JOUABILITÉ : peut-on agir, pas seulement regarder ?
  const recrutable = await page.$('.unit:not(.locked):not(.insolvable)')
  ck(`${w} · on peut recruter`, !!recrutable)
  if (recrutable) await recrutable.click()

  const actifs = await page.$$('.active-btn')
  const tousVus = await page.evaluate(() => [...document.querySelectorAll('.active-btn')]
    .every(e => { const r = e.getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1 && r.height >= 40 }))
  // Depuis les boss télégraphiés, il faut presser le bon actif en 4,8 s : un
  // défilement cacherait précisément celui qu'il faut.
  ck(`${w} · les 4 actifs sont visibles et pressables ensemble`, actifs.length === 4 && tousVus)

  for (const [nom, sel] of [['Succès', '.header-btn:has-text("Succès")'], ['Forge', '.header-btn:has-text("Forge")'],
    ['Réglages', '.header-btn:has-text("Réglages")'], ['Croisade', '.header-btn.crusade']]) {
    const b = await page.$(sel)
    if (!b) { ck(`${w} · ${nom} présent`, false, 'absent'); continue }
    await b.click(); await page.waitForTimeout(300)
    const a = await page.evaluate(AUDIT)
    ck(`${w} · ${nom} tient dans l écran`, await page.isVisible('.modal') && propre(a), JSON.stringify({ hors: a.hors, petits: a.petits }))
    await page.click('.modal-btn.ghost').catch(() => {})
    await page.waitForTimeout(200)
  }

  // L'Arbre : sous 900 px on privilégie des nœuds TAPABLES à la vue d'ensemble.
  await page.click('.header-btn:has-text("Forge")').catch(() => {})
  await page.waitForTimeout(350)
  const arbre = await page.evaluate(() => {
    const c = document.querySelector('.tree-canvas'); if (!c) return null
    const g = document.querySelector('g[role=button]'); if (!g) return null
    const cr = c.getBoundingClientRect(), av = g.getBoundingClientRect()
    c.scrollLeft += (av.left + av.width / 2) - (cr.left + cr.width / 2)
    const r = g.getBoundingClientRect()
    return { cadreDansEcran: cr.left >= -1 && cr.right <= innerWidth + 1,
             racineAtteignable: r.left >= cr.left - 1 && r.right <= cr.right + 1,
             tailleNoeud: Math.round(r.width) }
  })
  ck(`${w} · l Arbre se parcourt et ses nœuds restent tapables`,
     !!arbre?.cadreDansEcran && !!arbre?.racineAtteignable && arbre.tailleNoeud >= 32, JSON.stringify(arbre))
  await page.click('.modal-btn.ghost').catch(() => {})

  ck(`${w} · aucune erreur console`, erreurs.length === 0, erreurs.slice(0, 2).join(' | '))
  await ctx.close()
}

await nav.close()
bilan()
