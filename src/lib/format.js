// Suffixes courts. Au-delà, on passe en exponentielle : DESIGN.md classe en
// anti-pattern « une courbe qui rend le late-game illisible (10^20+) », et les
// zones sans fin y arrivent en une dizaine de cycles.
const SUFFIXES = ['', 'K', 'M', 'Md', 'T', 'P', 'E', 'Z', 'Y']
const ABBREV_FROM = 1e6   // en dessous, les séparateurs de milliers suffisent

// Format un nombre pour l'affichage.
// Sous un million : séparateur de milliers à la française (`1 247`).
// `toLocaleString('fr-FR')` produit un espace insécable étroit (U+202F), pas un
// espace ASCII — comportement standard du locale fr-FR.
// Au-delà : abrégé (`1,07 M`, `2,3 Md`), jamais de pavé de chiffres.
export function formatNumber(n) {
  const abs = Math.abs(n)
  if (abs < ABBREV_FROM) return Math.floor(n).toLocaleString('fr-FR')

  const tier = Math.floor(Math.log10(abs) / 3)
  if (tier >= SUFFIXES.length) {
    // 10^27 et au-delà : « 1,2 × 10^30 » reste comparable d'un coup d'œil.
    const exp = Math.floor(Math.log10(abs))
    const mantissa = (n / Math.pow(10, exp)).toFixed(1).replace('.', ',')
    return `${mantissa}×10^${exp}`
  }
  const scaled = n / Math.pow(1000, tier)
  // Une décimale sous 100 (2,3 Md), aucune au-dessus (350 Md) : même densité
  // d'information partout.
  const digits = Math.abs(scaled) < 100 ? 1 : 0
  return `${scaled.toFixed(digits).replace('.', ',')} ${SUFFIXES[tier]}`
}

// Multiplicateur affiché. formatNumber() arrondit à l'entier — il afficherait
// « ×1 » pour un ×1,69 durement acheté. On garde une décimale sous 10, et on
// repasse à l'entier au-dessus (à ×160, la décimale n'apprend plus rien).
export function formatMult(mult) {
  if (mult >= 10) return formatNumber(mult)
  if (Number.isInteger(mult)) return String(mult)
  return mult.toFixed(1).replace('.', ',')
}
