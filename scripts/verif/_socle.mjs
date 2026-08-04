// Socle commun des sondes : lancement du navigateur, saves de test, et les
// primitives d'assertion. Une sonde ne devrait décrire QUE ce qu'elle vérifie.
//
//   node scripts/verif/<sonde>.mjs [port] [chemin/vers/playwright/index.mjs]
//
// Playwright n'est pas une dépendance du projet (« zéro dépendance ») : on
// l'emprunte à une installation existante.

export const PORT = process.argv[2] ?? '4173'
const CHEMIN = process.argv[3]
  ?? '/Users/etiennebernoux/Perso/projets/portfolio/node_modules/playwright/index.mjs'

export const { chromium } = await import(CHEMIN)
export const URL_JEU = `http://localhost:${PORT}/`

const resultats = []
export function ck(nom, ok, detail = '') {
  resultats.push({ nom, ok })
  console.log(`${ok ? '  ✅' : '  ❌'} ${nom}${detail ? ` — ${detail}` : ''}`)
}
export function titre(t) { console.log(`\n${t}`) }
export function bilan() {
  const ko = resultats.filter(r => !r.ok)
  console.log(`\n${'─'.repeat(52)}\n${resultats.length - ko.length}/${resultats.length} OK`)
  if (ko.length) { ko.slice(0, 12).forEach(k => console.log(`  ❌ ${k.nom}`)); process.exit(1) }
}

// Une save complète et cohérente. Chaque sonde n'écrase que ce qui l'intéresse,
// pour que l'ajout d'un champ au jeu ne casse pas six fichiers.
export const SAVE = (o = {}) => ({
  version: 4,
  gold: 5000, counts: { paysan: 20, soldat: 0, chevalier: 0, champion: 0 },
  currentZone: 1, wave: 1, zonesUnlocked: 1,
  inventory: [], equipped: { arme: null, armure: null, banniere: null, amulette: null },
  nextReliqueUid: 0, zonesCleared: 0, wavesCleared: 0,
  gloire: 0, treeNodes: [], echoes: {}, biome: 'croisade', voeu: null,
  deepestEver: 0, troopUpgrades: {}, prestigeCount: 0, buyMode: 'x1',
  legendePoints: 0, pantheon: {}, legendeCount: 0, legendeDeepest: 0,
  achievements: [], bossKills: 0, legendaryFound: 0, wavesTotal: 0, critCount: 0,
  activesCast: 0, forgeCount: 0, fuseCount: 0, goldTotal: 0, biomesSeen: [],
  neantCrusades: 0, deepestNoTree: 0, conseil: [], savedAt: Date.now(),
  frappeNiveau: 0, soundOn: false, volume: 0,
  ...o,
})

// Arbre complet d'une branche : ce qu'il faut pour débloquer son Vœu.
export const BRANCHE = (b) => ['racine', 'champion', `${b}-tronc1`, `${b}-tronc2`]
  .concat(['1', '2', '3', '4'].map(i => `${b}-${{ guerre: 'lame', fortune: 'pillage', reliques: 'chance', croisade: 'gloire' }[b]}${i}`))
  .concat([`${b}-${{ guerre: 'lame', fortune: 'pillage', reliques: 'chance', croisade: 'gloire' }[b]}-apex`])

export async function ouvrir(navigateur, save, viewport = { width: 1280, height: 900 }) {
  const { width, height, ...reste } = viewport
  const ctx = await navigateur.newContext({ viewport: { width, height }, ...reste })
  await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), ['croisade.save', JSON.stringify(save)])
  const page = await ctx.newPage()
  const erreurs = []
  page.on('pageerror', e => erreurs.push(String(e)))
  page.on('console', m => {
    if (m.type() !== 'error') return
    if ((m.location()?.url ?? '').endsWith('/favicon.ico')) return   // le projet n'a pas de favicon
    erreurs.push(m.text())
  })
  await page.goto(URL_JEU, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.game')
  await page.waitForTimeout(400)
  return { ctx, page, erreurs }
}

export const save = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('croisade.save') ?? '{}'))

// Attendre une CONDITION, jamais un délai : un timeout calibré sur une machine
// au repos échoue sous charge. Trois sondes l'ont appris à leurs dépens.
export async function jusqua(page, predicat, { pas = 300, max = 40 } = {}) {
  for (let i = 0; i < max; i++) {
    if (await predicat()) return true
    await page.waitForTimeout(pas)
  }
  return false
}
