// Contenu du jeu : zones (vagues, mobs, boss) et tiers de troupes.
// Données PURES et sans dépendance à Vite : ce module doit rester importable par
// Node (tests d'équilibrage, simulateur `scripts/simulate.mjs`). Les visuels sont
// donc désignés par des clés (`spriteKey`, `bgSprite`) que l'UI résout en URLs
// d'assets via withSprites() — jamais d'`import ... from './assets/*.webp'` ici.

// Catalogue de zones. Lookup O(1) par numéro de zone (convention catalogues).
// mobs : rotation cyclique (array). boss : ennemi unique de fin de zone.
// bg : valeur CSS injectée dans --zone-bg (sprite zone 1, gradient pierre zone 2).
export const ZONES = {
  1: {
    name: 'Forêt Sombre',
    bgSprite: 'foret',
    waves: 10,
    mobs: [
      { name: 'Gobelin Maraudeur', sprite: '👹', spriteKey: 'gobelin', hpMax: 60, gold: 5 },
      { name: 'Squelette Croulant', sprite: '💀', spriteKey: null, hpMax: 75, gold: 7 },
      { name: 'Loup Galeux', sprite: '🐺', spriteKey: null, hpMax: 50, gold: 4 },
      { name: 'Orc Brute', sprite: '👺', spriteKey: null, hpMax: 95, gold: 10 },
      { name: 'Rat Géant', sprite: '🐀', spriteKey: null, hpMax: 40, gold: 3 },
    ],
    boss: { name: 'Roi Gobelin', sprite: '👑', spriteKey: null, hpMax: 700, gold: 120 },
  },
  2: {
    name: 'Ruines',
    bg: 'radial-gradient(circle at 50% 20%, #3b3f4a 0%, #1a1c22 60%, #0e0f13 100%)',
    waves: 12,
    mobs: [
      { name: 'Squelette Brisé', sprite: '💀', spriteKey: null, hpMax: 420, gold: 28 },
      { name: 'Chauve-souris Vorace', sprite: '🦇', spriteKey: null, hpMax: 360, gold: 22 },
      { name: 'Araignée Géante', sprite: '🕷️', spriteKey: null, hpMax: 560, gold: 40 },
      { name: 'Spectre Errant', sprite: '👻', spriteKey: null, hpMax: 480, gold: 34 },
      { name: 'Goule Affamée', sprite: '🧟', spriteKey: null, hpMax: 620, gold: 50 },
    ],
    boss: { name: 'Liche des Ruines', sprite: '💀', spriteKey: null, hpMax: 5000, gold: 1000 },
  },
  3: {
    name: 'Château Hanté',
    bg: 'radial-gradient(circle at 50% 25%, #3a2d4a 0%, #1a1422 55%, #0c0810 100%)',
    waves: 14,
    mobs: [
      { name: 'Armure Hantée', sprite: '🛡️', spriteKey: null, hpMax: 3000, gold: 180 },
      { name: 'Fantôme Hurlant', sprite: '👻', spriteKey: null, hpMax: 2600, gold: 150 },
      { name: 'Gargouille', sprite: '🗿', spriteKey: null, hpMax: 4000, gold: 260 },
      { name: 'Chauve-souris Géante', sprite: '🦇', spriteKey: null, hpMax: 2400, gold: 140 },
      { name: 'Corbeau Maudit', sprite: '🐦‍⬛', spriteKey: null, hpMax: 3200, gold: 200 },
    ],
    boss: { name: 'Comte Vampire', sprite: '🧛', spriteKey: null, hpMax: 35000, gold: 7000 },
  },
  4: {
    name: 'Cathédrale Profanée',
    bg: 'radial-gradient(circle at 50% 25%, #4a1f2a 0%, #1f0e14 55%, #0c0608 100%)',
    waves: 16,
    mobs: [
      { name: 'Cultiste Déchu', sprite: '🧎', spriteKey: null, hpMax: 20000, gold: 1100 },
      { name: 'Démon Mineur', sprite: '👿', spriteKey: null, hpMax: 17000, gold: 950 },
      { name: 'Gargouille de Pierre', sprite: '🗿', spriteKey: null, hpMax: 28000, gold: 1700 },
      { name: 'Spectre de Crypte', sprite: '👻', spriteKey: null, hpMax: 19000, gold: 1050 },
      { name: 'Chauve-souris Maudite', sprite: '🦇', spriteKey: null, hpMax: 16000, gold: 900 },
    ],
    boss: { name: 'Archidémon', sprite: '😈', spriteKey: null, hpMax: 250000, gold: 50000 },
  },
  5: {
    name: 'Enfer',
    bg: 'radial-gradient(circle at 50% 30%, #7a2410 0%, #3a0f06 50%, #0a0402 100%)',
    waves: 18,
    mobs: [
      { name: 'Diablotin', sprite: '👿', spriteKey: null, hpMax: 130000, gold: 8000 },
      { name: 'Chien des Enfers', sprite: '🐺', spriteKey: null, hpMax: 110000, gold: 7000 },
      { name: 'Âme Damnée', sprite: '👻', spriteKey: null, hpMax: 100000, gold: 6500 },
      { name: 'Golem de Lave', sprite: '🗿', spriteKey: null, hpMax: 180000, gold: 13000 },
      { name: 'Démon Ailé', sprite: '🦇', spriteKey: null, hpMax: 145000, gold: 9500 },
    ],
    boss: { name: 'Seigneur des Enfers', sprite: '👹', spriteKey: null, hpMax: 1800000, gold: 350000 },
  },
}

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
