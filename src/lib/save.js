// Persistance localStorage versionnée et défensive.
// On ne sérialise que des primitifs durables (jamais les dérivés ni les
// états transients). Le format est pensé extensible : `version` + champs
// additifs lus avec défaut, pour qu'une save plus ancienne ne casse pas.
import { migrateFromMetaLevels } from './tree.js'

const SAVE_KEY = 'croisade.save'
export const SAVE_VERSION = 2

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
    troopUpgrades: state.troopUpgrades ?? {},
    prestigeCount: state.prestigeCount ?? 0,
    // Préférence d'UI, pas de la progression — mais persistée quand même : la
    // redemander à chaque session annulerait le confort qu'elle apporte.
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
  if ((data.version ?? 1) < 2 && data.metaLevels) {
    const { owned, gloire } = migrateFromMetaLevels(data.metaLevels, data.gloire ?? 0)
    // `migrated` signale à l'appelant qu'il DOIT réécrire la save tout de suite.
    // Sans ça la v1 reste en localStorage avec ses metaLevels, et le
    // remboursement se rejoue à chaque rechargement → Gloire infinie.
    return { ...data, version: 2, treeNodes: owned, gloire, metaLevels: undefined, migrated: true }
  }
  return data
}
