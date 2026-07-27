// Actifs : les boutons qu'on clique, seule intervention manuelle d'un idle.
// Logique pure ; l'UI ne garde qu'un état { active, ready } par actif.
//
// La Potion de Soin est retirée. Elle restaurait des PV que l'armée n'a pas —
// promesse impossible depuis V1, et lui en donner aurait introduit la mort, donc
// le soft-lock, dans un jeu conçu sans. Sa place est prise par la Potion de Rage,
// qui exploite les critiques d'US 22.
//
// Chaque actif tire parti d'une mécanique différente pour que le choix du moment
// compte : le Cri pour les gros paquets de PV, la Rage et la Percée contre les
// boss blindés, la Ferveur quand on veut financer un palier.

export const ACTIVES = [
  {
    id: 'warcry',
    name: 'Cri de Guerre',
    sprite: '📯',
    desc: '×2 dégâts',
    effect: { dmgMult: 2 },
    durationMs: 10000,
    cooldownMs: 25000,
    unlockZone: 1,
  },
  {
    id: 'rage',
    name: 'Potion de Rage',
    sprite: '🧪',
    desc: '+40 points de critique',
    effect: { critBonus: 40 },
    durationMs: 8000,
    cooldownMs: 40000,
    unlockZone: 2,
  },
  {
    id: 'percee',
    name: 'Percée',
    sprite: '🗡️',
    desc: 'Ignore l\'armure',
    effect: { ignoreArmor: true },
    durationMs: 12000,
    cooldownMs: 50000,
    unlockZone: 3,
  },
  {
    id: 'ferveur',
    name: 'Ferveur',
    sprite: '💰',
    desc: '×3 or',
    effect: { goldMult: 3 },
    durationMs: 15000,
    cooldownMs: 60000,
    unlockZone: 4,
  },
]

export const ACTIVE_IDS = ACTIVES.map(a => a.id)

const byId = ACTIVES.reduce((acc, a) => ({ ...acc, [a.id]: a }), {})

export function activeById(id) {
  return byId[id] ?? null
}

export function emptyActiveState() {
  return ACTIVE_IDS.reduce((acc, id) => ({ ...acc, [id]: { active: false, ready: true } }), {})
}

export function isActiveUnlocked(id, zonesUnlocked = 1) {
  const a = byId[id]
  return !!a && zonesUnlocked >= a.unlockZone
}

// Durée et cooldown effectifs.
//
// `cooldownMult` (nœuds « cooldown des actifs » de l'Arbre) s'applique à TOUS les
// actifs — c'est ce que son libellé promet. Les modificateurs du Cri (nœuds
// « Cor de Guerre » et règle « Bain de Sang ») ne touchent QUE le Cri, également
// par fidélité à leurs libellés.
export function activeTimings(id, {
  cooldownMult = 1,
  warCryDurationMult = 1,
  biomeWarCryDurMult = 1,
  biomeWarCryCdMult = 1,
} = {}) {
  const a = byId[id]
  if (!a) return { durationMs: 0, cooldownMs: 0 }
  const isWarCry = id === 'warcry'
  const duration = a.durationMs * (isWarCry ? warCryDurationMult * biomeWarCryDurMult : 1)
  const cooldown = a.cooldownMs * cooldownMult * (isWarCry ? biomeWarCryCdMult : 1)
  return {
    // Plancher : un actif doit rester un acte, pas un état permanent.
    durationMs: Math.round(duration),
    cooldownMs: Math.max(1000, Math.round(cooldown)),
  }
}

// Effets agrégés des actifs EN COURS. Contrat identique aux autres agrégateurs
// du projet : les multiplicateurs se multiplient, les points s'additionnent.
export function activeEffects(state = {}) {
  let dmgMult = 1
  let goldMult = 1
  let critBonus = 0
  let ignoreArmor = false
  for (const a of ACTIVES) {
    if (!state[a.id]?.active) continue
    if (a.effect.dmgMult) dmgMult *= a.effect.dmgMult
    if (a.effect.goldMult) goldMult *= a.effect.goldMult
    if (a.effect.critBonus) critBonus += a.effect.critBonus
    if (a.effect.ignoreArmor) ignoreArmor = true
  }
  return { dmgMult, goldMult, critBonus, ignoreArmor }
}

// Nettoie un état venu d'une save. Les actifs ne sont PAS persistés en cours
// d'effet : au chargement tout est prêt et rien n'est actif — sinon un buff
// pourrait être figé pour toujours par un rechargement au mauvais moment.
export function freshActiveState() {
  return emptyActiveState()
}
