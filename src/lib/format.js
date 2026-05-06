// Format un nombre avec espace fine comme séparateur de milliers (1 247).
// Arrondit vers le bas — on n'affiche jamais de décimales.
export function formatNumber(n) {
  return Math.floor(n).toLocaleString('fr-FR')
}
