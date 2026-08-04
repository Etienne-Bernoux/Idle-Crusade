// La Route — après un boss, la zone suivante n'est plus imposée.
//
// Idée retenue de l'idéation. Le constat qu'elle corrige : « deux runs ne
// diffèrent que par le biome ». Les Vœux ont déjà élargi l'éventail au départ
// (5 biomes × 4 Vœux), mais tout se décide AVANT de jouer — une fois parti,
// plus aucun choix jusqu'à la Croisade suivante.
//
// Art antérieur assumé : la carte de Slay the Spire. Le choix entre nœuds de
// MÊME palier est le générateur de divergence le moins cher qui soit — pas une
// mécanique, seulement des frères et sœurs.
//
// Deux règles de design, chacune verrouillée par un test :
//   • aucune voie ne domine : chacune gagne sur un axe et paie sur un autre ;
//   • le barème commun n'est pas touché. Une voie n'est qu'un jeu de facteurs
//     appliqués à la zone, comme une règle de biome — donc rien ne peut dériver
//     accidentellement hors des ordres de grandeur mesurés.

export const VOIES = {
  directe: {
    id: 'directe', sprite: '🛣️', nom: 'La voie directe',
    desc: 'Rien de particulier. Le chemin que tu aurais pris.',
    fx: {},
  },
  riche: {
    id: 'riche', sprite: '💰', nom: 'La route marchande',
    desc: 'Plus d\'or, mais des ennemis mieux nourris',
    fx: { goldMult: 1.8, hpMult: 1.35 },
  },
  rapide: {
    id: 'rapide', sprite: '🏃', nom: 'Le sentier de traverse',
    desc: 'Deux fois moins de vagues, et deux fois moins de butin',
    fx: { waveMult: 0.5, goldMult: 0.55 },
  },
  hantee: {
    id: 'hantee', sprite: '👻', nom: 'Les terres hantées',
    desc: 'Un boss blindé, une relique de plus',
    fx: { bossArmorPts: 25, relicDrops: 1 },
  },
  sanglante: {
    id: 'sanglante', sprite: '🩸', nom: 'La marche forcée',
    desc: 'Ennemis coriaces, mais la Gloire s\'en souvient',
    fx: { hpMult: 1.6, gloireMult: 1.5 },
  },
}

export const VOIE_IDS = Object.keys(VOIES)
export const CHOIX_PAR_CARREFOUR = 3

export function voieById(id) {
  return VOIES[id] ?? null
}

// Les voies proposées à un carrefour. DÉTERMINISTE par zone : on apprend une
// route, on ne subit pas un tirage — même principe que les annonces de boss.
// « La voie directe » est toujours offerte : refuser un pari doit rester
// possible, sinon ce n'est plus un choix mais un impôt.
export function voiesPour(zone = 1) {
  const paris = VOIE_IDS.filter(id => id !== 'directe')
  const depart = Math.abs(Math.floor(zone)) % paris.length
  const retenus = []
  for (let i = 0; i < CHOIX_PAR_CARREFOUR - 1; i++) {
    retenus.push(paris[(depart + i) % paris.length])
  }
  return ['directe', ...retenus]
}

const NEUTRE = { goldMult: 1, hpMult: 1, waveMult: 1, gloireMult: 1, bossArmorPts: 0, relicDrops: 0 }

export function voieEffects(id) {
  const v = VOIES[id]
  return v ? { ...NEUTRE, ...v.fx } : { ...NEUTRE }
}

// Une voie qu'on ne peut plus honorer (id inconnu venu d'une save) retombe sur
// la voie directe : jamais d'exception dans la boucle de jeu.
export function resolveVoie(id) {
  return VOIES[id] ? id : 'directe'
}
