// Format un nombre avec séparateur de milliers à la française : `1 247`.
// `toLocaleString('fr-FR')` produit un espace insécable étroit (U+202F),
// pas un espace ASCII — comportement standard du locale fr-FR.
// Arrondit vers le bas, on n'affiche jamais de décimales.
export function formatNumber(n) {
  return Math.floor(n).toLocaleString('fr-FR')
}

// Multiplicateur affiché. formatNumber() arrondit à l'entier — il afficherait
// « ×1 » pour un ×1,69 durement acheté. On garde une décimale sous 10, et on
// repasse à l'entier au-dessus (à ×160, la décimale n'apprend plus rien).
export function formatMult(mult) {
  if (mult >= 10) return formatNumber(mult)
  if (Number.isInteger(mult)) return String(mult)
  return mult.toFixed(1).replace('.', ',')
}
