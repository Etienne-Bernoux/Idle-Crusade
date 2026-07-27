// Économie du recrutement : coût unitaire et coûts de lot. Logique pure.
// Le coût monte de 15% par unité déjà possédée (façon Cookie Clicker).

export const COST_GROWTH = 1.15

// Coût de la PROCHAINE unité. costMult vient de la Forge (Intendance).
export function unitCost(baseCost, owned, costMult = 1) {
  return Math.floor(baseCost * Math.pow(COST_GROWTH, owned) * costMult)
}

// Coût de `n` unités achetées d'affilée = somme des coûts unitaires successifs.
// On somme les arrondis plutôt que d'arrondir une somme géométrique : sinon le
// prix d'un lot différerait de celui de n achats un par un (Σ floor ≠ floor Σ),
// et un joueur qui compare les deux se sentirait volé.
export function bulkCost(baseCost, owned, n, costMult = 1) {
  if (!(n > 0)) return 0
  let total = 0
  for (let i = 0; i < n; i++) total += unitCost(baseCost, owned + i, costMult)
  return total
}

// Combien d'unités `gold` permet d'acheter, et leur coût total.
// Boucle bornée par la croissance exponentielle du coût : n reste logarithmique
// en or disponible (~175 tours pour 10¹² d'or), donc pas de formule fermée.
export function maxAffordable(baseCost, owned, gold, costMult = 1) {
  let n = 0
  let total = 0
  for (;;) {
    const next = total + unitCost(baseCost, owned + n, costMult)
    if (next > gold) return { count: n, cost: total }
    total = next
    n += 1
  }
}

export const BUY_MODES = [
  { id: 'x1', label: '×1', qty: 1 },
  { id: 'x10', label: '×10', qty: 10 },
  { id: 'max', label: 'MAX', qty: null },   // qty null = calculé depuis l'or
]

export const DEFAULT_BUY_MODE = 'x1'

export function isBuyMode(id) {
  return BUY_MODES.some(m => m.id === id)
}

// Ce qu'un clic sur une troupe ferait dans le mode courant.
//   count       : unités réellement achetées (0 = insolvable, le clic ne fait rien)
//   cost        : or effectivement débité (0 si count vaut 0)
//   displayCost : prix à AFFICHER sur la carte, même quand c'est inabordable —
//                 sinon une carte insolvable annoncerait « 🪙 0 ». En MAX sans
//                 rien de finançable, on affiche le prix de la prochaine unité,
//                 c'est le palier que le joueur cherche à atteindre.
// ×10 est tout-ou-rien : pas question d'acheter 9 unités par surprise.
export function plannedPurchase(mode, baseCost, owned, gold, costMult = 1) {
  if (mode === 'max') {
    const { count, cost } = maxAffordable(baseCost, owned, gold, costMult)
    return { count, cost, displayCost: count > 0 ? cost : unitCost(baseCost, owned, costMult) }
  }
  const qty = BUY_MODES.find(m => m.id === mode)?.qty ?? 1
  const displayCost = bulkCost(baseCost, owned, qty, costMult)
  const affordable = displayCost <= gold
  return { count: affordable ? qty : 0, cost: affordable ? displayCost : 0, displayCost }
}
