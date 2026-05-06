// Format un nombre avec séparateur de milliers à la française : `1 247`.
// `toLocaleString('fr-FR')` produit un espace insécable étroit (U+202F),
// pas un espace ASCII — comportement standard du locale fr-FR.
// Arrondit vers le bas, on n'affiche jamais de décimales.
export function formatNumber(n) {
  return Math.floor(n).toLocaleString('fr-FR')
}
