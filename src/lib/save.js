// Persistance localStorage versionnée et défensive.
// On ne sérialise que des primitifs durables (jamais les dérivés ni les
// états transients). Le format est pensé extensible : `version` + champs
// additifs lus avec défaut, pour qu'une save plus ancienne ne casse pas.
import { migrateFromMetaLevels, migrateFromLinearTree, migrateFromConvergentTree } from './tree.js'

const SAVE_KEY = 'croisade.save'
export const SAVE_VERSION = 4

const emptyEquipped = () => ({ arme: null, armure: null, banniere: null, amulette: null })

// Construit le payload durable depuis l'état courant. Les `?? ` rendent la
// sérialisation tolérante aux champs pas encore introduits (reliques en CP2).
export function serialize(state) {
  return {
    version: SAVE_VERSION,
    gold: state.gold ?? 0,
    counts: state.counts ?? {},
    currentZone: state.currentZone ?? 1,
    wave: state.wave ?? 1,
    zonesUnlocked: state.zonesUnlocked ?? 1,
    inventory: state.inventory ?? [],
    equipped: state.equipped ?? emptyEquipped(),
    nextReliqueUid: state.nextReliqueUid ?? 0,
    // Prestige (CP2). zonesCleared compte les boss de zone battus dans le run
    // courant : zonesUnlocked ne peut pas servir, il plafonne à la dernière zone.
    zonesCleared: state.zonesCleared ?? 0,
    wavesCleared: state.wavesCleared ?? 0,
    gloire: state.gloire ?? 0,
    treeNodes: state.treeNodes ?? [],
    echoes: state.echoes ?? {},
    biome: state.biome ?? 'croisade',
    deepestEver: state.deepestEver ?? 0,
    troopUpgrades: state.troopUpgrades ?? {},
    prestigeCount: state.prestigeCount ?? 0,
    // Préférence d'UI, pas de la progression — mais persistée quand même : la
    // redemander à chaque session annulerait le confort qu'elle apporte.
    // Légende (2e prestige, US 28). Champs additifs : une save antérieure
    // les lit à zéro et reste jouable.
    legendePoints: state.legendePoints ?? 0,
    pantheon: state.pantheon ?? {},
    legendeCount: state.legendeCount ?? 0,
    legendeDeepest: state.legendeDeepest ?? 0,
    // Succès : seuls les ids obtenus et les deux compteurs à vie que les
    // prédicats ne peuvent pas reconstituer depuis l'état courant.
    achievements: state.achievements ?? [],
    bossKills: state.bossKills ?? 0,
    legendaryFound: state.legendaryFound ?? 0,
    wavesTotal: state.wavesTotal ?? 0,
    critCount: state.critCount ?? 0,
    activesCast: state.activesCast ?? 0,
    forgeCount: state.forgeCount ?? 0,
    fuseCount: state.fuseCount ?? 0,
    goldTotal: state.goldTotal ?? 0,
    biomesSeen: state.biomesSeen ?? [],
    neantCrusades: state.neantCrusades ?? 0,
    deepestNoTree: state.deepestNoTree ?? 0,
    buyMode: state.buyMode ?? 'x1',
  }
}

// Écriture best-effort : un quota plein ou le mode privé Safari ne doit jamais
// planter le jeu.
export function saveNow(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(serialize(state)))
  } catch (_) {
    /* quota / mode privé : échec silencieux */
  }
}

// Logique de chargement pure (testable sans localStorage).
// Renvoie l'objet migré, ou null si rien / illisible — null = état par défaut.
export function parseSave(raw) {
  if (raw == null) return null              // clé absente (1er lancement)
  let data
  try {
    data = JSON.parse(raw)
  } catch (_) {
    return null                             // JSON corrompu
  }
  if (typeof data !== 'object' || data == null) return null
  return migrate(data)
}

export function loadSave() {
  let raw
  try {
    raw = localStorage.getItem(SAVE_KEY)
  } catch (_) {
    return null
  }
  return parseSave(raw)
}

// v1 → v2 : l'ancienne Forge (6 upgrades à niveaux, `metaLevels`) est devenue
// l'Arbre de Gloire (`treeNodes`). On rembourse la Gloire dépensée plutôt que
// d'inventer une équivalence nœud par nœud — le joueur re-dépense où il veut.
// Détail et cas du Champion : migrateFromMetaLevels() dans tree.js.
function migrate(data) {
  // v3 → v4 : l'Arbre ne reconverge plus (US 28). Les ids de clé de voûte, d'apex
  // de branche et de couronne n'existent plus — on rembourse, le joueur replace.
  if ((data.version ?? 1) === 3) {
    const { owned, gloire } = migrateFromConvergentTree(data.treeNodes ?? [], data.gloire ?? 0)
    return { ...data, version: 4, treeNodes: owned, gloire, migrated: true }
  }
  // v2 → v3 : l'Arbre est passé de quatre colonnes à un vrai graphe, donc les ids
  // ont changé. Même politique que v1 → v2 : on rembourse, le joueur replace.
  if ((data.version ?? 1) === 2 && Array.isArray(data.treeNodes) && data.treeNodes.length) {
    const { owned, gloire } = migrateFromLinearTree(data.treeNodes, data.gloire ?? 0)
    return { ...data, version: 3, treeNodes: owned, gloire, migrated: true }
  }
  if ((data.version ?? 1) < 2 && data.metaLevels) {
    const { owned, gloire } = migrateFromMetaLevels(data.metaLevels, data.gloire ?? 0)
    // `migrated` signale à l'appelant qu'il DOIT réécrire la save tout de suite.
    // Sans ça la v1 reste en localStorage avec ses metaLevels, et le
    // remboursement se rejoue à chaque rechargement → Gloire infinie.
    return { ...data, version: 3, treeNodes: owned, gloire, metaLevels: undefined, migrated: true }
  }
  // Une v2 sans nœuds n'a rien à convertir : on la marque simplement à jour.
  if ((data.version ?? 1) < SAVE_VERSION) return { ...data, version: SAVE_VERSION }
  return data
}
