// La Patine — une relique équipée mûrit au temps réel.
//
// Idée retenue de l'idéation, sous l'angle « rythme et retour ». Le loot est
// aujourd'hui un tri automatique : le plus gros pourcentage gagne, aucun
// arbitrage. La Patine crée un **coût d'opportunité** — la seule chose qui
// transforme un inventaire en décision. Jeter 30 h de patine pour +15 % de base,
// est-ce que ça vaut le coup ?
//
// Elle avance à l'HORLOGE MURALE, pas au tick. C'est le seul mécanisme du jeu
// qui récompense littéralement le fait de fermer l'onglet — et il ne viole pas
// l'exclusion de la progression hors-ligne : on ne gagne pas de ressources en
// dormant, un objet qu'on a choisi de porter prend seulement de la valeur.
//
// Art antérieur assumé : la file de compétences d'EVE Online, où l'engagement
// n'est pas « jouer plus » mais « avoir bien choisi avant de partir ». Le
// vieillissement en fût aussi : ouvrir trop tôt, c'est perdre.

export const PATINE_HEURE_MS = 3600e3
export const PATINE_PAR_HEURE = 0.0125   // +1,25 % de l'effet par heure portée
// Plafond volontairement modeste : les effets de relique sont déjà bornés par
// nature (≤70 % de dégâts par slot). Un ×2 doublerait ces bornes et forcerait à
// réétalonner tout le reste ; ×1,5 se sent sans rien casser.
export const PATINE_MAX = 1.5
export const PATINE_HEURES_PLEIN = (PATINE_MAX - 1) / PATINE_PAR_HEURE   // 40 h

// Paliers d'affichage : la couleur doit dire d'un coup d'œil ce qu'on risque de
// jeter. Sans retour visuel, le coût d'opportunité resterait théorique.
export const PATINE_PALIERS = [
  { seuil: 1.0,  nom: 'Neuve',    sprite: '·',  color: '#9aa0a6' },
  { seuil: 1.1,  nom: 'Cuivrée',  sprite: '◔',  color: '#b87333' },
  { seuil: 1.25, nom: 'Dorée',    sprite: '◑',  color: '#d4af37' },
  { seuil: 1.4,  nom: 'Auréolée', sprite: '◕',  color: '#fff1a8' },
]

// Multiplicateur d'une relique portée depuis `equippedAt`. Défensif : une save
// trafiquée, une date dans le futur ou un champ absent rendent 1 — jamais NaN,
// jamais un bonus gratuit.
export function patineMult(equippedAt, now = Date.now()) {
  const debut = Number(equippedAt)
  if (!Number.isFinite(debut) || debut <= 0) return 1
  const heures = (Number(now) - debut) / PATINE_HEURE_MS
  if (!Number.isFinite(heures) || heures <= 0) return 1
  return Math.min(PATINE_MAX, 1 + heures * PATINE_PAR_HEURE)
}

export function patinePalier(mult) {
  let out = PATINE_PALIERS[0]
  for (const p of PATINE_PALIERS) if (mult >= p.seuil) out = p
  return out
}

// Heures restantes avant le palier suivant, ou null si la relique est mûre.
// Sert à dire au joueur ce qu'il gagnerait à patienter.
export function prochainPalier(mult) {
  const suivant = PATINE_PALIERS.find(p => p.seuil > mult)
  if (!suivant) return null
  return { ...suivant, heures: (suivant.seuil - mult) / PATINE_PAR_HEURE }
}

// Équiper HORODATE. Déséquiper remet à zéro : sans cette remise à zéro il n'y a
// pas de décision, seulement un compteur qui monte.
export function horodater(relic, now = Date.now()) {
  return relic ? { ...relic, equippedAt: now } : relic
}
