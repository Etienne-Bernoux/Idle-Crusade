// Garde-fou anti-câblage muet dans App.svelte.
//
// Pourquoi il existe : le merge de l'US 23 a supprimé du template le bloc
// `{#if showPrestigeScreen}` en entier. Le prestige et le choix de biome sont
// restés injouables pendant quatre US, en production, avec 230 tests au vert —
// parce que `prestige.js` et `biomes.js` étaient intacts : c'est le CÂBLAGE qui
// manquait, et aucun test de logique pure ne peut voir ça.
//
// Ce que ce test attrape : un `$:` dérivé ou une `function` déclarés puis jamais
// référencés ailleurs dans le fichier. Au moment du bug, `doPrestige`,
// `biomeChoices` et `upcomingBiome` étaient exactement dans cet état.
//
// Ce qu'il n'attrape pas : un symbole encore écrit quelque part mais plus lu
// (`showPrestigeScreen` restait affecté). Le garde-fou est volontairement
// simple et sans dépendance — il ne remplace pas la vérification navigateur,
// il rend juste impossible la disparition silencieuse d'un pan d'UI.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const source = readFileSync(fileURLToPath(new URL('./App.svelte', import.meta.url)), 'utf8')

// Depuis l'éclatement (US 35), une partie du template vit dans des composants.
// Le garde-fou doit les couvrir : sinon un symbole passé en prop paraîtrait
// orphelin, et surtout un pan d'UI pourrait disparaître d'un fichier qu'on ne
// regarde pas.
const componentsDir = fileURLToPath(new URL('./components/', import.meta.url))
const components = readdirSync(componentsDir)
  .filter(f => f.endsWith('.svelte'))
  .map(f => ({ nom: f, src: readFileSync(componentsDir + f, 'utf8') }))

// Les commentaires citent souvent un symbole ("cf. doPrestige") : les compter
// comme un usage rendrait le garde-fou aveugle dès qu'un nom est mentionné.
const code = source
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')

function declarations() {
  const out = []
  for (const m of code.matchAll(/^\s{2}\$:\s*([A-Za-z_$][\w$]*)\s*=/gm)) out.push({ kind: '$:', name: m[1] })
  for (const m of code.matchAll(/^\s{2}function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) out.push({ kind: 'function', name: m[1] })
  return out
}

// Occurrences du nom hors de sa propre ligne de déclaration.
function usesElsewhere(name) {
  const decl = new RegExp(`^\\s{2}(\\$:\\s*${name}\\s*=|function\\s+${name}\\s*\\()`)
  return code
    .split('\n')
    .filter(line => !decl.test(line))
    .filter(line => new RegExp(`\\b${name}\\b`).test(line))
    .length
}

test('aucun dérivé ni fonction d App.svelte n est déclaré sans jamais servir', () => {
  const orphans = declarations().filter(d => usesElsewhere(d.name) === 0)
  assert.deepEqual(
    orphans.map(d => `${d.kind} ${d.name}`),
    [],
    'symbole déclaré et jamais référencé : soit un pan d UI a sauté à un merge, '
    + 'soit c est du code mort à retirer',
  )
})

test('les points d entrée du prestige et des biomes restent câblés au template', () => {
  // Contrôle nominatif, en plus du garde-fou générique : ce sont les symboles
  // que le merge d US 23 avait orphelinés, et le cœur de la boucle longue.
  const template = code.slice(code.indexOf('</script>'))
  for (const name of ['showPrestigeScreen', 'doPrestige', 'biomeChoices']) {
    assert.ok(
      new RegExp(`\\b${name}\\b`).test(template),
      `${name} n apparaît plus dans le template : l écran de Croisade est de nouveau muet`,
    )
  }
})

test('chaque composant extrait est réellement monté par App.svelte', () => {
  // Un composant importé mais jamais posé dans le markup est du code mort ;
  // un composant posé sans import ne compile pas. On vérifie les deux sens.
  for (const { nom } of components) {
    const balise = nom.replace('.svelte', '')
    assert.ok(source.includes(`from './components/${nom}'`), `${nom} n'est pas importé`)
    assert.ok(new RegExp(`<${balise}[\\s/>]`).test(source), `${nom} est importé mais jamais monté`)
  }
})

test('aucun composant ne déclare de prop qu il n utilise pas', () => {
  // Une prop oubliée après un remaniement est un contrat qui ment au parent.
  for (const { nom, src } of components) {
    const corps = src.replace(/<!--[\s\S]*?-->/g, '')
    for (const m of corps.matchAll(/^\s*export let ([A-Za-z_$][\w$]*)/gm)) {
      const prop = m[1]
      const usages = corps.split('\n')
        .filter(l => !new RegExp(`^\\s*export let ${prop}\\b`).test(l))
        .filter(l => new RegExp(`\\b${prop}\\b`).test(l))
      assert.ok(usages.length > 0, `${nom} déclare la prop « ${prop} » sans jamais s'en servir`)
    }
  }
})
