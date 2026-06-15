// Persistance localStorage versionnée et défensive.
// On ne sérialise que des primitifs durables (jamais les dérivés ni les
// états transients). Le format est pensé extensible : `version` + champs
// additifs lus avec défaut, pour qu'une save plus ancienne ne casse pas.
const SAVE_KEY = 'croisade.save'
export const SAVE_VERSION = 1

const emptyEquipped = () => ({ arme: null, armure: null, banniere: null, amulette: null })

// Construit le payload durable depuis l'état courant. Les `?? ` rendent la
// sérialisation tolérante aux champs pas encore introduits (reliques en CP2).
export function serialize(state) {
  return {
    version: SAVE_VERSION,
    gold: state.gold ?? 0,
    counts: state.counts ?? {},
    currentZone: state.currentZone ?? 1,
    zonesUnlocked: state.zonesUnlocked ?? 1,
    inventory: state.inventory ?? [],
    equipped: state.equipped ?? emptyEquipped(),
    nextReliqueUid: state.nextReliqueUid ?? 0,
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

// Squelette de migration. v1 = no-op ; les futures versions brancheront ici
// les transformations de champs.
function migrate(data) {
  return data
}
