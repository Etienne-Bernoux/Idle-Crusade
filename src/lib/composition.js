// Ce que vaut vraiment la composition de l'armée.
//
// Constat qui l'a motivé, mesuré en US 24 : une composition pensée vaut ×2,06
// contre ×1,30 pour un empilement mono-tier — et RIEN à l'écran ne le dit. Le
// joueur voit un dps global ; le levier le plus profond du jeu lui est invisible.
//
// Parti pris : on ne compare PAS à un optimum théorique. Un score « tu es à 60%
// de la meilleure composition » suppose de connaître cette meilleure
// composition, et se tromperait en donnant au joueur un objectif faux. On
// mesure ce qui est vérifiable : **ce que les rôles rapportent réellement, ici,
// maintenant, contre cet ennemi** — le rapport entre les dégâts avec rôles et
// les mêmes dégâts sans eux. C'est un fait, pas une opinion.

import { averageHit } from './combat.js'
import { roleEffects, roleProgress, ROLES } from './roles.js'

// Quel rôle porte quel effet. DÉRIVÉ du catalogue plutôt que recopié : une
// seconde table serait une seconde source de vérité, qui dériverait au premier
// rôle ajouté.
export const ROLE_EFFECT_KEY = Object.fromEntries(
  Object.entries(ROLES).map(([tier, r]) => [tier, r.effect]),
)

// Deux décimales à l'écran : en dessous de ce gain, le conseil serait invisible.
export const MIN_VISIBLE_GAIN = 0.005

export const NEUTRAL_ROLES = { critChance: 0, armyDmgPct: 0, armorPen: 0, critMultBonus: 0 }

// `ctx` porte tout ce qui ne dépend PAS des rôles : dps de base, type et armure
// de la cible, socle de critique, multiplicateur global (reliques, Arbre,
// Panthéon, actifs). Les rôles ne touchent qu'aux quatre leviers ci-dessus.
function dpsWith(fx, ctx) {
  return averageHit({
    heroDps: ctx.heroDps ?? 0,
    troopDps: ctx.troopDps ?? {},
    enemyType: ctx.enemyType ?? null,
    armorPct: ctx.armorPct ?? 0,
    critChancePct: (ctx.critChanceBase ?? 0) + fx.critChance,
    critMult: (ctx.critMultBase ?? 1) + fx.critMultBonus,
    ignoreArmor: ctx.ignoreArmor ?? false,
    armorPen: fx.armorPen,
    globalMult: (ctx.globalMult ?? 1) * (1 + fx.armyDmgPct / 100),
  })
}

// Le chiffre à afficher, et sa décomposition.
//
// `per[tier]` est la contribution MARGINALE du tier : ce qu'on perdrait en
// retirant son seul rôle. C'est la bonne lecture pour un joueur — « ce tier me
// rapporte » — là où la contribution absolue dirait surtout qui est nombreux.
export function compositionValue(counts = {}, doctrine = {}, ctx = {}) {
  const full = roleEffects(counts, doctrine)
  const sansRoles = dpsWith(NEUTRAL_ROLES, ctx)
  const avecRoles = dpsWith(full, ctx)
  const ratio = sansRoles > 0 ? avecRoles / sansRoles : 1

  const per = {}
  for (const [tier, key] of Object.entries(ROLE_EFFECT_KEY)) {
    const ampute = { ...full, [key]: NEUTRAL_ROLES[key] }
    const sansLui = dpsWith(ampute, ctx)
    per[tier] = {
      value: full[key],
      // Ce que ce rôle apporte à lui seul, en multiplicateur.
      gain: sansLui > 0 ? avecRoles / sansLui : 1,
      progress: roleProgress(tier, counts[tier] ?? 0, doctrine[tier] ?? 1),
    }
  }
  return { sansRoles, avecRoles, ratio, per }
}

// Quel recrutement ferait le plus progresser la composition ? On simule le
// franchissement du PROCHAIN palier de rôle de chaque tier et on garde le
// meilleur. C'est ce qui transforme un constat en conseil actionnable.
//
// Renvoie null quand aucun tier ne peut plus progresser (tous plafonnés) ou
// qu'aucun n'est débloqué : mieux vaut ne rien dire que conseiller à vide.
export function bestNextStep(counts = {}, doctrine = {}, ctx = {}, unlocked = null) {
  const base = compositionValue(counts, doctrine, ctx).ratio
  let best = null
  for (const tier of Object.keys(ROLE_EFFECT_KEY)) {
    if (unlocked && !unlocked.includes(tier)) continue
    const p = roleProgress(tier, counts[tier] ?? 0, doctrine[tier] ?? 1)
    if (!p || p.missing == null || p.missing <= 0) continue   // plafonné
    const projete = { ...counts, [tier]: (counts[tier] ?? 0) + p.missing }
    const ratio = compositionValue(projete, doctrine, ctx).ratio
    const gain = ratio - base
    // Sous la résolution d'affichage, le conseil promettrait un chiffre
    // identique à l'actuel — « ×1,06 → ×1,06 » ne dit rien au joueur.
    if (gain < MIN_VISIBLE_GAIN) continue
    if (!best || gain > best.gain) {
      best = { tier, name: ROLES[tier]?.name ?? tier, sprite: ROLES[tier]?.sprite ?? '', missing: p.missing, gain, ratio }
    }
  }
  return best
}
