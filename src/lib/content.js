// Contenu du jeu : zones (vagues, mobs, boss) et tiers de troupes.
// Données PURES et sans dépendance à Vite : ce module doit rester importable par
// Node (tests d'équilibrage, simulateur `scripts/simulate.mjs`). Les visuels sont
// donc désignés par des clés (`spriteKey`, `bgSprite`) que l'UI résout en URLs
// d'assets via withSprites() — jamais d'`import ... from './assets/*.webp'` ici.

// ---------- BARÈME COMMUN DES ZONES ----------
//
// Les VALEURS (vagues, PV, or) vivent ici et NULLE PART ailleurs. Chaque biome
// fournit seulement des noms et des visuels (BIOME_BESTIARY) : c'est ce qui
// permet d'avoir cinq mondes différents sans qu'aucun ne devienne
// accidentellement plus dur ou plus rentable que sa fiche ne l'annonce.
//
// Progression relevée puis figée : ×7,1 par zone sur les PV comme sur l'or.
export const ZONE_TEMPLATE = [
  { waves: 10, mobHp: [60, 75, 50, 95, 40], mobGold: [5, 7, 4, 10, 3], bossHp: 700, bossGold: 120, mobArmor: 0, bossArmor: 15 },
  { waves: 12, mobHp: [420, 360, 560, 480, 620], mobGold: [28, 22, 40, 34, 50], bossHp: 5000, bossGold: 1000, mobArmor: 5, bossArmor: 25 },
  { waves: 14, mobHp: [3000, 2600, 4000, 2400, 3200], mobGold: [180, 150, 260, 140, 200], bossHp: 35000, bossGold: 7000, mobArmor: 10, bossArmor: 35 },
  { waves: 16, mobHp: [20000, 17000, 28000, 19000, 16000], mobGold: [1100, 950, 1700, 1050, 900], bossHp: 250000, bossGold: 50000, mobArmor: 15, bossArmor: 45 },
  { waves: 18, mobHp: [130000, 110000, 100000, 180000, 145000], mobGold: [8000, 7000, 6500, 13000, 9500], bossHp: 1800000, bossGold: 350000, mobArmor: 20, bossArmor: 55 },
]

export const THEME_COUNT = ZONE_TEMPLATE.length

// ---------- BESTIAIRES : ce qui rend chaque biome reconnaissable ----------
//
// Une entrée = [nom de zone, décor, [5 mobs], boss]. Un mob/boss = [nom, emoji]
// ou [nom, emoji, clé de sprite] quand un pixel art existe.
const BIOME_BESTIARY = {
  croisade: [
    ['Forêt Sombre', { bgSprite: 'foret', type: 'bete' },
      [['Gobelin Maraudeur', '👹', 'gobelin'], ['Sanglier Enragé', '🐗'], ['Loup Galeux', '🐺'], ['Orc Brute', '👺'], ['Rat Géant', '🐀']],
      ['Roi Gobelin', '👑']],
    ['Ruines', { bg: 'radial-gradient(circle at 50% 20%, #3b3f4a 0%, #1a1c22 60%, #0e0f13 100%)', type: 'mortvivant' },
      [['Squelette Brisé', '💀'], ['Chauve-souris Vorace', '🦇'], ['Araignée Géante', '🕷️'], ['Spectre Errant', '👻'], ['Goule Affamée', '🧟']],
      ['Liche des Ruines', '💀']],
    ['Château Hanté', { bg: 'radial-gradient(circle at 50% 25%, #3a2d4a 0%, #1a1422 55%, #0c0810 100%)', type: 'ombre' },
      [['Armure Hantée', '🛡️'], ['Fantôme Hurlant', '👻'], ['Gargouille', '🗿'], ['Chauve-souris Géante', '🦇'], ['Corbeau Maudit', '🐦‍⬛']],
      ['Comte Vampire', '🧛']],
    ['Cathédrale Profanée', { bg: 'radial-gradient(circle at 50% 25%, #4a1f2a 0%, #1f0e14 55%, #0c0608 100%)', type: 'demon' },
      [['Cultiste Déchu', '🧎'], ['Démon Mineur', '👿'], ['Gargouille de Pierre', '🗿'], ['Spectre de Crypte', '👻'], ['Chauve-souris Maudite', '🦇']],
      ['Archidémon', '😈']],
    ['Enfer', { bg: 'radial-gradient(circle at 50% 30%, #7a2410 0%, #3a0f06 50%, #0a0402 100%)', type: 'demon' },
      [['Diablotin', '👿'], ['Chien des Enfers', '🐺'], ['Âme Damnée', '👻'], ['Golem de Lave', '🗿'], ['Démon Ailé', '🦇']],
      ['Seigneur des Enfers', '👹']],
  ],

  maudites: [
    ['Marais Putride', { bg: 'radial-gradient(circle at 50% 25%, #3f4a2a 0%, #1c2213 55%, #0a0d06 100%)', type: 'bete' },
      [['Noyé Boursouflé', '🧟'], ['Sangsue Géante', '🪱'], ['Crapaud Vénéneux', '🐸'], ['Nuée de Moustiques', '🦟'], ['Racine Étrangleuse', '🌿']],
      ['Mère des Marais', '🐸']],
    ['Champ de Potence', { bg: 'radial-gradient(circle at 50% 20%, #4a4438 0%, #221f18 60%, #0d0c09 100%)', type: 'mortvivant' },
      [['Pendu Grinçant', '💀'], ['Corbeau Charognard', '🐦‍⬛'], ['Bourreau Sans Tête', '🪓'], ['Épouvantail Vivant', '🎃'], ['Chien Squelette', '🐕']],
      ['Grand Bourreau', '🪓']],
    ['Verger Pétrifié', { bg: 'radial-gradient(circle at 50% 25%, #4a3a2a 0%, #221a12 55%, #0d0a06 100%)', type: 'construct' },
      [['Arbre Hurleur', '🌳'], ['Ronce Carnivore', '🥀'], ['Essaim de Guêpes', '🐝'], ['Sève Corrompue', '🫧'], ['Berger Fossilisé', '🗿']],
      ['Chêne Millénaire', '🌳']],
    ['Nécropole Engloutie', { bg: 'radial-gradient(circle at 50% 25%, #2a3a4a 0%, #121a22 55%, #06090d 100%)', type: 'mortvivant' },
      [['Momie Gorgée d\'Eau', '🧟'], ['Prêtre Noyé', '🧎'], ['Anguille Spectrale', '🐍'], ['Statue Suintante', '🗿'], ['Cloche Funèbre', '🔔']],
      ['Pharaon Submergé', '⚱️']],
    ['Cœur de la Malédiction', { bg: 'radial-gradient(circle at 50% 30%, #5a2a4a 0%, #2a1222 50%, #0d060a 100%)', type: 'demon' },
      [['Avatar de Pourriture', '🦠'], ['Chimère Difforme', '🐐'], ['Aberration Rampante', '🪳'], ['Écho de Peste', '☠️'], ['Gardien Suppurant', '🛡️']],
      ['La Plaie Première', '🦠']],
  ],

  ombres: [
    ['Seuil du Crépuscule', { bg: 'radial-gradient(circle at 50% 25%, #2f2a4a 0%, #161322 55%, #08060d 100%)', type: 'ombre' },
      [['Voile Mouvant', '🌫️'], ['Silhouette Muette', '👤'], ['Chat de Nuit', '🐈‍⬛'], ['Lanterne Éteinte', '🕯️'], ['Murmure', '💬']],
      ['Gardien du Seuil', '🚪']],
    ['Galerie des Reflets', { bg: 'radial-gradient(circle at 50% 20%, #2a3a3f 0%, #131c1f 60%, #06090a 100%)', type: 'ombre' },
      [['Reflet Hostile', '🪞'], ['Double Inversé', '👥'], ['Éclat Tranchant', '💠'], ['Ombre Portée', '🌑'], ['Verre Affamé', '🔷']],
      ['Ton Propre Reflet', '🪞']],
    ['Bibliothèque Muette', { bg: 'radial-gradient(circle at 50% 25%, #3a2f22 0%, #1c1710 55%, #0a0806 100%)', type: 'construct' },
      [['Grimoire Claquant', '📕'], ['Scribe Aveugle', '🧎'], ['Encre Vivante', '🖋️'], ['Page Volante', '📄'], ['Chandelier Rampant', '🕯️']],
      ['Bibliothécaire Sans Yeux', '📚']],
    ['Théâtre Vide', { bg: 'radial-gradient(circle at 50% 25%, #4a2a3a 0%, #221219 55%, #0d0609 100%)', type: 'ombre' },
      [['Masque Souriant', '🎭'], ['Marionnette Coupée', '🪆'], ['Applaudissement Seul', '👏'], ['Rideau Étrangleur', '🎪'], ['Souffleur Fantôme', '👻']],
      ['Le Premier Rôle', '🎭']],
    ['Nuit Absolue', { bg: 'radial-gradient(circle at 50% 30%, #1a1a2e 0%, #0d0d17 50%, #030308 100%)', type: 'ombre' },
      [['Absence', '⬛'], ['Faim Sans Forme', '🕳️'], ['Écho Retourné', '🔄'], ['Froid Vivant', '❄️'], ['Regard Inverse', '👁️']],
      ['Celle Qui Éteint', '🌑']],
  ],

  ecarlate: [
    ['Fleuve Vermeil', { bg: 'radial-gradient(circle at 50% 25%, #5a1a1a 0%, #2a0d0d 55%, #0d0404 100%)', type: 'bete' },
      [['Nageur Écorché', '🩸'], ['Piranha de Sang', '🐟'], ['Vague Carmin', '🌊'], ['Sangsue Reine', '🪱'], ['Noyé Furieux', '🧟']],
      ['Batelier Rouge', '🚣']],
    ['Arène des Suppliciés', { bg: 'radial-gradient(circle at 50% 20%, #6a2a1a 0%, #32140d 60%, #0f0604 100%)', type: 'bete' },
      [['Gladiateur Damné', '⚔️'], ['Fauve Affamé', '🦁'], ['Foule Assoiffée', '👥'], ['Filet Barbelé', '🕸️'], ['Trident Rouillé', '🔱']],
      ['Champion Invaincu', '🏆']],
    ['Forge de Chair', { bg: 'radial-gradient(circle at 50% 25%, #6a3a1a 0%, #32190d 55%, #0f0704 100%)', type: 'construct' },
      [['Enclume Battante', '🔨'], ['Soufflet Vivant', '💨'], ['Lame Inachevée', '🗡️'], ['Apprenti Fondu', '🫠'], ['Braise Hurlante', '🔥']],
      ['Maître Forgeron', '🔨']],
    ['Autel Palpitant', { bg: 'radial-gradient(circle at 50% 25%, #7a1a2a 0%, #3a0d14 55%, #0f0406 100%)', type: 'demon' },
      [['Officiant Rouge', '🧎'], ['Calice Débordant', '🍷'], ['Dague Rituelle', '🗡️'], ['Chœur Étouffé', '🎶'], ['Veine Battante', '🫀']],
      ['Grand Prêtre Écarlate', '🫀']],
    ['Cœur du Monde', { bg: 'radial-gradient(circle at 50% 30%, #8a0a1a 0%, #40050d 50%, #120103 100%)', type: 'demon' },
      [['Battement', '🫀'], ['Artère Vivante', '🩸'], ['Colosse de Chair', '🧍'], ['Cri Primal', '🗣️'], ['Instinct Nu', '🐾']],
      ['Le Cœur Lui-Même', '🫀']],
  ],

  neant: [
    ['Bord du Monde', { bg: 'radial-gradient(circle at 50% 25%, #1a1a1a 0%, #0d0d0d 55%, #020202 100%)', type: 'construct' },
      [['Fragment Errant', '🪨'], ['Vent de Rien', '💨'], ['Silhouette Effacée', '👤'], ['Poussière Ancienne', '✨'], ['Bord Coupant', '📐']],
      ['Dernier Gardien', '🗿']],
    ['Mer de Cendres', { bg: 'radial-gradient(circle at 50% 20%, #2a2a2a 0%, #141414 60%, #040404 100%)', type: 'construct' },
      [['Vague de Cendre', '🌫️'], ['Braise Morte', '🔥'], ['Nageur Gris', '👤'], ['Statue Fondue', '🗿'], ['Souffle Tiède', '💨']],
      ['Ce Qui Reste', '⚱️']],
    ['Horloge Brisée', { bg: 'radial-gradient(circle at 50% 25%, #2a2a3a 0%, #14141c 55%, #040406 100%)', type: 'construct' },
      [['Seconde Perdue', '⏳'], ['Rouage Nu', '⚙️'], ['Aiguille Folle', '🕰️'], ['Instant Répété', '🔁'], ['Poids Immobile', '⚖️']],
      ['Le Temps Arrêté', '🕰️']],
    ['Chœur du Vide', { bg: 'radial-gradient(circle at 50% 25%, #1a2a2a 0%, #0d1414 55%, #020404 100%)', type: 'ombre' },
      [['Note Sans Son', '🎵'], ['Bouche Cousue', '🤐'], ['Résonance Creuse', '🔊'], ['Chanteur Absent', '🎤'], ['Silence Épais', '🔇']],
      ['La Note Finale', '🎼']],
    ['Néant Pur', { bg: 'radial-gradient(circle at 50% 30%, #0a0a0a 0%, #050505 50%, #000000 100%)', type: 'ombre' },
      [['Rien', '⬛'], ['Moins Que Rien', '🕳️'], ['Oubli', '💭'], ['Fin', '🔚'], ['Zéro', '0️⃣']],
      ['Le Néant', '🕳️']],
  ],
}

// Assemble une zone à partir du barème commun et du bestiaire d'un biome. Les
// deux sources sont indexées de la même façon : le barème donne les nombres, le
// bestiaire les noms — impossible de désynchroniser une difficulté d'un décor.
function buildZone(themeIndex, biomeId) {
  const tpl = ZONE_TEMPLATE[themeIndex - 1]
  const bestiary = BIOME_BESTIARY[biomeId] ?? BIOME_BESTIARY.croisade
  const [name, visual, mobs, boss] = bestiary[themeIndex - 1]
  const { type, ...look } = visual
  return {
    name,
    ...look,
    type,
    waves: tpl.waves,
    // `type` vient de la zone : tous ses habitants le partagent, c'est ce qui
    // rend la consigne lisible (« ici, des morts-vivants → des soldats »).
    // `armor` vient du barème commun : c'est une valeur, pas un thème.
    mobs: mobs.map(([mobName, sprite, spriteKey], i) => ({
      name: mobName,
      sprite,
      spriteKey: spriteKey ?? null,
      hpMax: tpl.mobHp[i],
      gold: tpl.mobGold[i],
      type,
      armor: tpl.mobArmor,
    })),
    boss: {
      name: boss[0], sprite: boss[1], spriteKey: boss[2] ?? null,
      hpMax: tpl.bossHp, gold: tpl.bossGold,
      type, armor: tpl.bossArmor,
    },
  }
}

// Les 5 zones du biome de départ, conservées sous ce nom pour les tests et les
// outils qui n'ont pas besoin de connaître les biomes.
export const ZONES = Object.fromEntries(
  ZONE_TEMPLATE.map((_, i) => [i + 1, buildZone(i + 1, 'croisade')]),
)

export const BIOME_IDS = Object.keys(BIOME_BESTIARY)

// Catalogue de troupes. unlockZone 99 = pas encore débloquable (Chevalier/Champion).
export const BASE_DPS = 12
export const TROOPS = {
  paysan:    { name: 'Paysan',    spriteKey: 'paysan',    baseCost: 10,    dps: 2,    unlockZone: 1,  hint: '' },
  soldat:    { name: 'Soldat',    spriteKey: 'soldat',    baseCost: 100,   dps: 12,   unlockZone: 2,  hint: 'Bats le boss de la Forêt' },
  chevalier: { name: 'Chevalier', spriteKey: 'chevalier', baseCost: 1000,  dps: 150,  unlockZone: 3,  hint: 'Bats le boss des Ruines' },
  champion:  { name: 'Champion',  spriteKey: 'champion',   baseCost: 10000, dps: 2000, unlockZone: 1,  requiresMeta: 'champion', hint: 'Serment du Champion (Forge)' },
}
export const TROOP_ORDER = ['paysan', 'soldat', 'chevalier', 'champion']

// Résout les clés visuelles en URLs d'assets. Pur : renvoie une copie, laisse
// ZONES intact (le simulateur consomme la version sans sprites).
export function withSprites(zones, spriteUrls) {
  const out = {}
  for (const [id, z] of Object.entries(zones)) {
    out[id] = {
      ...z,
      bg: z.bgSprite ? `url(${spriteUrls[z.bgSprite]})` : z.bg,
      mobs: z.mobs.map(m => ({ ...m, spriteUrl: m.spriteKey ? spriteUrls[m.spriteKey] : null })),
      boss: { ...z.boss, spriteUrl: z.boss.spriteKey ? spriteUrls[z.boss.spriteKey] : null },
    }
  }
  return out
}

// Idem pour les troupes : la donnée d'équilibrage ne connaît que la clé.
export function troopsWithSprites(troops, spriteUrls) {
  const out = {}
  for (const [id, t] of Object.entries(troops)) {
    out[id] = { ...t, spriteUrl: spriteUrls[t.spriteKey] ?? null }
  }
  return out
}

// ---------- ZONES SANS FIN ----------
//
// Les 5 zones de ZONES sont des THÈMES. Au-delà de la 5e, on reboucle sur eux en
// montant d'un CYCLE : zone 6 = « Forêt Sombre II », zone 10 = « Enfer II »,
// zone 11 = « Forêt Sombre III »… Le contenu (mobs, boss, décor) est réutilisé,
// seules les valeurs sont mises à l'échelle.
//
// Pourquoi ce découpage et pas une génération libre : un thème est déjà l'unité
// que le joueur reconnaît (« je suis dans les Ruines »), et c'est la maille
// naturelle d'un futur regroupement en biomes — un biome = un thème, un cycle =
// une profondeur. Voir docs/plans/2026-07-27-006-*.md § Suite.
// Facteur par zone, relevé sur la progression écrite à la main des 5 premières
// (700 → 5 000 → 35 000 → 250 000 → 1 800 000, soit ×7,1 constant). Un cycle
// complet vaut donc ×7,1^5, ce qui enchaîne sans marche ni palier mou.
export const ZONE_SCALE = 7.1

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX']

// Au-delà de XX on écrit le nombre : « Enfer 27 » reste plus lisible que
// « Enfer XXVII » pour un joueur de 5 ans.
export function cycleLabel(cycle) {
  return ROMAN[cycle] ?? String(cycle)
}

export function themeIndexOf(zoneNumber) {
  return ((zoneNumber - 1) % THEME_COUNT) + 1
}

export function cycleOf(zoneNumber) {
  return Math.floor((zoneNumber - 1) / THEME_COUNT) + 1
}

export function zoneScaleAt(zoneNumber) {
  return Math.pow(ZONE_SCALE, THEME_COUNT * (cycleOf(zoneNumber) - 1))
}

function scaleEnemy(enemy, mult) {
  // type et armor traversent tels quels : la profondeur change les valeurs, pas
  // la nature de l'ennemi ni sa protection relative.
  return {
    ...enemy,
    hpMax: Math.round(enemy.hpMax * mult),
    gold: Math.round(enemy.gold * mult),
  }
}

// La zone effective au numéro `n`. Il y en a toujours une : le jeu ne se termine
// plus. Le premier cycle renvoie le thème tel quel (identité) — le début du jeu
// n'est pas touché par la mise à l'échelle.
export function zoneAt(n, biomeId = 'croisade', waveMult = 1) {
  const themeIndex = themeIndexOf(n)
  const theme = buildZone(themeIndex, biomeId)
  const cycle = cycleOf(n)
  // Le nombre de vagues est une règle de biome (« Profusion ») : on l'applique
  // ici, au même endroit que le reste de la composition d'une zone.
  const waves = Math.max(2, Math.round(theme.waves * waveMult))
  const base = { ...theme, waves, cycle, theme: themeIndex }
  if (cycle === 1) return base
  const mult = zoneScaleAt(n)
  return {
    ...base,
    name: `${theme.name} ${cycleLabel(cycle)}`,
    mobs: theme.mobs.map(m => scaleEnemy(m, mult)),
    boss: scaleEnemy(theme.boss, mult),
  }
}

