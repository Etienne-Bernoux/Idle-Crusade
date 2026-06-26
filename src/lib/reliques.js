// Catalogue de reliques + tirage pondéré. Logique pure (rng injectable) pour
// rester testable. Une relique en jeu est une instance { uid, defId, rarity } ;
// sa magnitude d'effet est dérivée du catalogue au runtime (pas snapshotée),
// ce qui garde la save mince et migrable.

// Raretés : poids de tirage, couleur d'affichage, multiplicateur d'effet.
export const RARITIES = {
  commun:     { label: 'Commun',     weight: 70, color: '#9aa0a6', mult: 1 },
  rare:       { label: 'Rare',       weight: 25, color: '#4ea1ff', mult: 2.5 },
  legendaire: { label: 'Légendaire', weight: 5,  color: '#d4af37', mult: 6 },
}

// Définitions. effect.type ∈ { 'dmg', 'gold' } (pas de cooldown : pas d'actifs).
// base = effet en % à la rareté commune ; magnitude = base * RARITIES[rarity].mult.
export const RELIQUES = {
  lame_rouillee:  { name: 'Lame Rouillée',     slot: 'arme',     sprite: '🗡️', effect: { type: 'dmg',  base: 5 } },
  hache_brisee:   { name: 'Hache Brisée',      slot: 'arme',     sprite: '🪓', effect: { type: 'dmg',  base: 6 } },
  cotte_maille:   { name: 'Cotte de Mailles',  slot: 'armure',   sprite: '🛡️', effect: { type: 'dmg',  base: 4 } },
  heaume_terni:   { name: 'Heaume Terni',      slot: 'armure',   sprite: '⛑️', effect: { type: 'dmg',  base: 4 } },
  banniere_loup:  { name: 'Bannière du Loup',  slot: 'banniere', sprite: '🚩', effect: { type: 'gold', base: 8 } },
  oriflamme:      { name: 'Oriflamme',         slot: 'banniere', sprite: '🏴', effect: { type: 'gold', base: 10 } },
  amulette_os:    { name: "Amulette d'Os",     slot: 'amulette', sprite: '📿', effect: { type: 'gold', base: 7 } },
  anneau_corbeau: { name: 'Anneau du Corbeau', slot: 'amulette', sprite: '💍', effect: { type: 'gold', base: 9 } },
}

export const RELIQUE_SLOTS = ['arme', 'armure', 'banniere', 'amulette']
export const SLOT_LABELS = { arme: 'Arme', armure: 'Armure', banniere: 'Bannière', amulette: 'Amulette' }

const DEF_IDS = Object.keys(RELIQUES)

// Tirage pur. rng injecté pour testabilité. Renvoie { defId, rarity }.
export function rollRelique(rng = Math.random) {
  const defId = DEF_IDS[Math.floor(rng() * DEF_IDS.length)]
  const total = Object.values(RARITIES).reduce((s, r) => s + r.weight, 0)
  let roll = rng() * total
  let rarity = 'commun'
  for (const [key, r] of Object.entries(RARITIES)) {
    roll -= r.weight
    if (roll < 0) { rarity = key; break }
  }
  return { defId, rarity }
}

// Effet (%) d'une instance, dérivé du catalogue. null si defId inconnu (relique
// fantôme d'une save plus ancienne) — l'appelant filtre.
export function reliqueEffect(defId, rarity) {
  const def = RELIQUES[defId]
  if (!def) return null
  return { type: def.effect.type, pct: def.effect.base * (RARITIES[rarity]?.mult ?? 1) }
}

// Or rendu par la fonte (auto-recyclage) d'une relique, par rareté.
export const MELT_GOLD = { commun: 15, rare: 50, legendaire: 200 }
export function meltValue(rarity) {
  return MELT_GOLD[rarity] ?? 0
}

// Magnitude d'effet d'une instance — sert à classer "la plus faible".
function magnitude(r) {
  const e = reliqueEffect(r.defId, r.rarity)
  return e ? e.pct : 0
}

// Ramène l'inventaire à `cap` en retirant les instances de plus faible effet.
// Renvoie { inventory: gardées, melted: [retirées] }. Pur, immutable.
export function capInventory(inventory, cap) {
  if (inventory.length <= cap) return { inventory, melted: [] }
  const sorted = [...inventory].sort((a, b) => magnitude(b) - magnitude(a)) // fort → faible
  return { inventory: sorted.slice(0, cap), melted: sorted.slice(cap) }
}

// Équipe une relique (pur, immutable). La retire de l'inventaire, l'installe
// dans son slot ; l'ancienne relique du slot retourne en inventaire.
// Invariant : une instance est soit en inventaire, soit équipée — jamais les deux.
export function equipRelique(inventory, equipped, relic) {
  const slot = RELIQUES[relic.defId].slot
  const current = equipped[slot]
  let nextInventory = inventory.filter(r => r.uid !== relic.uid)
  if (current) nextInventory = [...nextInventory, current]
  return { inventory: nextInventory, equipped: { ...equipped, [slot]: relic } }
}
