<script>
  import { onMount, tick as nextRender } from 'svelte'   // alias : tick() est déjà le tick de combat
  import { fade } from 'svelte/transition'
  import { formatNumber, formatMult } from './lib/format.js'
  import { loadSave, saveNow } from './lib/save.js'
  import { RELIQUES, RARITIES, RELIQUE_SLOTS, SLOT_LABELS, rollRelique, reliqueEffect, equipRelique, capInventory, meltValue } from './lib/reliques.js'
  import { PRESTIGE_MIN_ZONES, gloireGain, rarityWeights } from './lib/prestige.js'
  import { TREE, EDGES, BRANCHES, treeEffects, isUnlockable, buyNode, nodeById, costToReach,
    isBranchComplete, echoCost, buyEcho, sanitizeEchoes, ECHO_PCT, branchNodes } from './lib/tree.js'
  import { ENEMY_TYPES, affinityMult, affinityLabel, computeHit, averageHit, BASE_CRIT_CHANCE, BASE_CRIT_MULT } from './lib/combat.js'
  import { ROLES, roleEffects, roleProgress } from './lib/roles.js'
  import { ACTIVES, activeTimings, activeEffects, freshActiveState, isActiveUnlocked } from './lib/actives.js'
  import { BIOMES, DEFAULT_BIOME, biomeById, biomeEffects, isBiomeUnlocked, resolveBiome, nextBiome } from './lib/biomes.js'
  import { UPGRADE_KINDS, milestoneMult, nextMilestone, upgradePrice, levelOf, buyTroopUpgrade, troopDmgMult, globalEffects, sanitizeTroopUpgrades } from './lib/upgrades.js'
  import { BUY_MODES, DEFAULT_BUY_MODE, isBuyMode, plannedPurchase } from './lib/economy.js'
  import { BASE_DPS, TROOPS as CONTENT_TROOPS, TROOP_ORDER, withSprites, troopsWithSprites, zoneAt, cycleOf, cycleLabel } from './lib/content.js'
  import paysanSprite from './assets/sprites/paysan.webp'
  import soldatSprite from './assets/sprites/soldat.webp'
  import chevalierSprite from './assets/sprites/chevalier.webp'
  import championSprite from './assets/sprites/champion.webp'
  import gobelinSprite from './assets/sprites/gobelin.webp'
  import foretSprite from './assets/sprites/foret.webp'

  // Contenu (zones, troupes) : données pures dans src/lib/content.js, résolues
  // ici avec les URLs d'assets Vite. Voir withSprites().
  const SPRITE_URLS = {
    paysan: paysanSprite,
    soldat: soldatSprite,
    chevalier: chevalierSprite,
    champion: championSprite,
    gobelin: gobelinSprite,
    foret: foretSprite,
  }
  // Les zones ne sont plus une map figée : elles sont générées à la demande et
  // il y en a toujours une de plus (zoneAt). Cache mémoïsé — une zone est
  // immuable, la recalculer à chaque render serait du gaspillage.
  // Cache mémoïsé : une zone est immuable POUR UN BIOME DONNÉ. La clé inclut donc
  // le biome et son multiplicateur de vagues — sans ça, changer de biome
  // continuerait de servir le bestiaire du précédent.
  const zoneCache = new Map()
  // `biomeId` est un ARGUMENT et pas seulement lu depuis le scope : les dérivés
  // qui appellent zoneOf doivent passer `biome` explicitement, sinon Svelte ne
  // voit pas la dépendance et ne recalcule jamais (le nom de la zone et son
  // nombre de vagues restaient ceux du biome précédent, alors que les ennemis
  // — spawnés impérativement — étaient corrects).
  function zoneOf(n, biomeId = biome) {
    const { waveMult } = biomeEffects(biomeId)
    const key = `${biomeId}:${waveMult}:${n}`
    if (!zoneCache.has(key)) {
      zoneCache.set(key, withSprites({ [n]: zoneAt(n, biomeId, waveMult) }, SPRITE_URLS)[n])
    }
    return zoneCache.get(key)
  }
  const baseDps = BASE_DPS
  const TROOPS = troopsWithSprites(CONTENT_TROOPS, SPRITE_URLS)

  // tickMs DOIT rester entier constant. lastTickAt += n * tickMs reste exact
  // tant que c'est entier ; un buff qui modifierait tickMs corromprait l'horloge.
  const tickMs = 800
  const autosaveMs = 10000
  const BASE_INVENTORY_CAP = 30

  // Déclaré AVANT le reste du state : zoneOf() lit `biome` pour choisir le
  // bestiaire, et il est appelé dès l'initialisation de `enemy` ci-dessous.
  // Biome choisi pour le run courant, et record de profondeur JAMAIS remis à
  // zéro (c'est lui qui débloque les biomes, pas la progression du run).
  let biome = DEFAULT_BIOME
  let deepestEver = 0
  let pendingBiome = DEFAULT_BIOME   // biome choisi dans l'écran de Croisade

  let gold = 0
  let counts = { paysan: 0, soldat: 0, chevalier: 0, champion: 0 }
  let currentZone = 1
  let wave = 1
  let zonesUnlocked = 1
  let mobIdx = 0
  let enemy = zoneOf(1).mobs[0]
  let enemyHp = enemy.hpMax
  let isBoss = false
  let isHit = false
  let isRespawning = false
  let isFlashing = false
  let showVictoryToast = false
  let victoryMessage = ''
  let isTransitioning = false
  let transitionZoneName = ''
  let transitionRelic = null
  let isShaking = false
  let isLegendaryFlash = false
  // Un état { active, ready } par actif. Jamais persisté : voir freshActiveState.
  let activeState = freshActiveState()

  // Prestige. zonesCleared = boss de zone battus dans le run courant (base du
  // gain de Gloire) ; les trois autres survivent à la Croisade.
  let zonesCleared = 0
  // Vagues vaincues dans le run courant : c'est la base du gain de Gloire
  // (zonesCleared plafonne à 5 et donnait un gain constant à vie).
  let wavesCleared = 0
  let gloire = 0
  let treeNodes = []          // ids des nœuds de l'Arbre de Gloire possédés
  let echoes = {}             // niveaux d'Échos par branche (puits sans fin)
  // Améliorations de troupes, payées en or : { paysan: { entrainement: 2 }, … }.
  // Remises à zéro par la Croisade, comme les troupes qu'elles améliorent.
  let troopUpgrades = {}
  let prestigeCount = 0
  let showPrestigeScreen = false
  let showForge = false
  let showBarracks = false   // modale des améliorations de troupes
  let selectedNodeId = null   // nœud mis en avant dans le panneau de détail

  // Mode d'achat (×1 / ×10 / MAX). Persisté : c'est une préférence, la
  // redemander à chaque session serait la friction qu'on vient de supprimer.
  let buyMode = DEFAULT_BUY_MODE

  let inventory = []
  let equipped = { arme: null, armure: null, banniere: null, amulette: null }
  let nextReliqueUid = 0
  // Machinerie interne du catch-up. Initialisé dans onMount (performance.now()
  // n'a de sens qu'au mount).
  let lastTickAt = 0

  let pops = []
  let nextPopId = 0

  // Track tous les setTimeout pour cleanup au unmount/HMR.
  const pendingTimeouts = new Set()
  function later(fn, ms) {
    const id = setTimeout(() => {
      pendingTimeouts.delete(id)
      fn()
    }, ms)
    pendingTimeouts.add(id)
  }

  // Marge sur le cleanup vs animation CSS (animation: 1s damage, 1.2s gold).
  // 100 ms de plus pour éviter un micro-flash si le main thread est chargé
  // au moment de la dernière frame de l'animation.
  const POP_LIFE_MS = { damage: 1100, crit: 1400, gold: 1300, relic: 1700, melt: 1300 }

  function pushPop(kind, value, x = Math.random() * 80 - 40) {
    const id = nextPopId++
    pops = [...pops, { id, kind, value, x }]
    later(() => pops = pops.filter(p => p.id !== id), POP_LIFE_MS[kind])
  }

  // Coût recalculé depuis le primitif (convention US 3 : ne pas lire la dérivée —
  // robuste si un futur buff mute counts entre le render et le click).
  // costMult et mode passés en arguments (et non lus depuis le dérivé `meta`) :
  // sinon la dépendance à metaLevels/buyMode serait invisible pour Svelte, et
  // `troopRows` ne se recalculerait pas à l'achat d'Intendance.
  function purchaseOf(id, mode, costMult) {
    // Le coût du biome se compose avec celui de l'Arbre (Intendance).
    return plannedPurchase(mode, TROOPS[id].baseCost, counts[id], gold, costMult * currentBiomeFx().troopCostMult)
  }

  function recruit(id) {
    if (!isTroopUnlocked(id)) return
    // Recalculé depuis le primitif au moment du clic, jamais lu depuis la
    // dérivée affichée : l'or a pu bouger entre le render et le clic.
    const { count, cost } = purchaseOf(id, buyMode, meta.costMult)
    if (count === 0) return
    gold -= cost
    counts = { ...counts, [id]: counts[id] + count }
  }

  // Ajoute des reliques à l'inventaire et applique le cap : les plus faibles
  // au-delà du cap sont fondues en or. withAnim = feedback live (sinon l'or est
  // absorbé par le pop welcome-back du catch-up, dérivé de gold).
  function addToInventory(relics, withAnim) {
    const { inventory: kept, melted } = capInventory([...inventory, ...relics], inventoryCap)
    inventory = kept
    if (melted.length) {
      const meltGold = Math.floor(melted.reduce((s, r) => s + meltValue(r.rarity), 0) * meta.meltMult)
      gold += meltGold
      // Après le pop de drop (gold +150, relic +450) et en x non centré : la
      // narration se lit "trouvée → fondue", sans chevaucher les pops centrés.
      if (withAnim) later(() => pushPop('melt', meltGold), 700)
    }
  }

  function equip(relic) {
    const next = equipRelique(inventory, equipped, relic)
    equipped = next.equipped
    inventory = next.inventory
    // Le swap renvoie l'ancienne relique en inventaire → ne caper que si ça dépasse.
    if (inventory.length > inventoryCap) addToInventory([], true)
    saveNow(state())           // action utilisateur : persister tout de suite
  }

  // Multiplicateurs des reliques équipées, recalculés depuis le primitif
  // (equipped + catalogue), jamais depuis la dérivée dps.
  $: relicEffects = RELIQUE_SLOTS
    .map(s => equipped[s])
    .filter(Boolean)
    .map(r => reliqueEffect(r.defId, r.rarity))
    .filter(Boolean)
  $: relicDmgMult = 1 + relicEffects.filter(e => e.type === 'dmg').reduce((s, e) => s + e.pct / 100, 0) * meta.relicEffectMult
  $: relicGoldMult = 1 + relicEffects.filter(e => e.type === 'gold').reduce((s, e) => s + e.pct / 100, 0) * meta.relicEffectMult

  // Effets de l'Arbre de Gloire, dérivés des nœuds possédés (primitif durable).
  $: meta = treeEffects(treeNodes, echoes)
  // Le biome durcit les ennemis et bonifie tout ce qu'ils rapportent. On le lit
  // TOUJOURS depuis le primitif `biome` et jamais depuis un dérivé : `doPrestige`
  // et `hydrate` changent `biome` puis appellent `spawnNextEnemy()` dans le même
  // tour synchrone, où un `$:` n'est pas encore recalculé (le premier ennemi
  // sortait alors avec les PV du biome précédent).
  function currentBiomeFx() {
    return biomeEffects(biome)
  }
  // Dérivé réservé à l'AFFICHAGE, qui n'a pas cette contrainte de timing.
  $: biomeInfo = biomeById(biome)
  // La qualité des drops est un palier (0-3) que l'arbre fait monter.
  $: dropWeights = rarityWeights(meta.qualityLevel + biomeEffects(biome).qualityBonus)
  // L'Arbre agrandit la besace ; le cap reste une dérivée du primitif.
  $: inventoryCap = BASE_INVENTORY_CAP + meta.invCapBonus

  $: activeFx = activeEffects(activeState)
  // Ce que la COMPOSITION apporte, en plus du dps : chance de critique
  // (paysans), dégâts d'armée (soldats), pénétration (chevaliers),
  // multiplicateur de critique (champions).
  $: roleFx = roleEffects(counts)
  // Bonus transverses des Bannières / Pillages (toutes troupes confondues).
  $: troopGlobal = globalEffects(troopUpgrades)
  // Le dps de chaque tier passe par SON multiplicateur (paliers + améliorations),
  // les bonus globaux et l'Arbre s'appliquent ensuite sur le total.
  // dps PAR TIER : les affinités se calculent tier par tier, une somme globale
  // ne permettrait pas de dire « tes paysans sont faibles ici ».
  $: troopDpsByTier = TROOP_ORDER.reduce((acc, id) => ({
    ...acc,
    [id]: counts[id] * TROOPS[id].dps * troopDmgMult(troopUpgrades, id, counts[id]),
  }), {})

  // Multiplicateur global : tout ce qui ne dépend pas du tier ni de la cible.
  $: globalDmgMult = relicDmgMult * activeFx.dmgMult * meta.dmgMult * troopGlobal.dmgMult
    * (1 + roleFx.armyDmgPct / 100)

  // Chance de critique : base + points apportés par les reliques équipées.
  $: critChance = BASE_CRIT_CHANCE
    + relicEffects.filter(e => e.type === 'crit').reduce((s, e) => s + e.pct, 0)
    + activeFx.critBonus
    + roleFx.critChance

  // Le dps AFFICHÉ est une moyenne (crit et armure compris) et pas le dernier
  // tirage : un joueur veut une valeur stable pour comparer ses achats.
  $: critMult = BASE_CRIT_MULT + roleFx.critMultBonus

  $: dps = averageHit({
    heroDps: baseDps,
    troopDps: troopDpsByTier,
    enemyType: enemy?.type ?? null,
    armorPct: enemy?.armor ?? 0,
    critChancePct: critChance,
    critMult,
    ignoreArmor: activeFx.ignoreArmor,
    armorPen: roleFx.armorPen,
    globalMult: globalDmgMult,
  })
  $: zone = zoneOf(currentZone, biome)
  $: hpPercent = Math.max(0, enemyHp / enemy.hpMax * 100)
  // Déblocage : donnée, pas branche. Une troupe demande une zone (`unlockZone`)
  // et éventuellement un achat de Forge (`requiresMeta`).
  function isTroopUnlocked(id, championUnlocked = meta.championUnlocked) {
    const t = TROOPS[id]
    if (zonesUnlocked < t.unlockZone) return false
    return !t.requiresMeta || championUnlocked
  }

  $: troopRows = TROOP_ORDER.map(id => {
    const plan = purchaseOf(id, buyMode, meta.costMult)
    return {
      id,
      name: TROOPS[id].name,
      spriteUrl: TROOPS[id].spriteUrl,
      dps: TROOPS[id].dps,
      hint: TROOPS[id].hint,
      count: counts[id],
      cost: plan.displayCost,
      buyCount: plan.count,
      buyQty: plan.displayQty,
      unlocked: isTroopUnlocked(id, meta.championUnlocked),
      mult: troopDmgMult(troopUpgrades, id, counts[id]),
      affinity: affinityLabel(id, enemy?.type ?? null),
      role: ROLES[id],
      roleProgress: roleProgress(id, counts[id]),
      nextAt: nextMilestone(counts[id]),
    }
  })

  // Le biome s'applique ICI, une fois, au moment du spawn : l'ennemi porte déjà
  // ses PV définitifs, donc tout le reste du combat (dégâts, barre de vie,
  // catch-up) n'a pas à connaître le biome.
  function scaledEnemy(base) {
    const { hpMult } = currentBiomeFx()
    return hpMult === 1 ? base : { ...base, hpMax: Math.round(base.hpMax * hpMult) }
  }

  function spawnNextEnemy() {
    const z = zoneOf(currentZone)
    if (wave === z.waves) {
      enemy = scaledEnemy(z.boss)
      isBoss = true
    } else {
      mobIdx = (mobIdx + 1) % z.mobs.length
      enemy = scaledEnemy(z.mobs[mobIdx])
      isBoss = false
    }
    enemyHp = enemy.hpMax
    isRespawning = false
  }

  // Jalon de profondeur : entrer dans un nouveau cycle de thèmes (la Forêt
  // Sombre II après l'Enfer) est le vrai moment fort maintenant que le jeu n'a
  // plus de fin. Reprend la mécanique de l'ancien écran de victoire finale.
  // invocationId : annule les timers du jalon précédent s'il en reste (états désync).
  let depthInvocationId = 0
  function triggerDepthMilestone(cycle) {
    const myId = ++depthInvocationId
    isFlashing = true
    later(() => { if (myId === depthInvocationId) isFlashing = false }, 500)
    victoryMessage = `⚔ PROFONDEUR ${cycleLabel(cycle)} ⚔`
    showVictoryToast = true
    later(() => { if (myId === depthInvocationId) showVictoryToast = false }, 3000)
  }

  // Transition cinématique entre zones (path live uniquement). Pause le combat
  // ~2 s, affiche l'écran "LES RUINES", puis bascule sur la zone suivante.
  let transitionInvocationId = 0
  function startZoneTransition(next, relic) {
    const myId = ++transitionInvocationId
    isFlashing = true
    later(() => { if (myId === transitionInvocationId) isFlashing = false }, 500)
    isTransitioning = true
    transitionZoneName = zoneOf(next).name
    transitionRelic = relic
    if (cycleOf(next) > cycleOf(next - 1)) triggerDepthMilestone(cycleOf(next))
    // Avance la zone DURABLEMENT tout de suite (l'écran la couvre) : un saveNow
    // ou un reload pendant les 2 s reflète la nouvelle zone, pas l'ancien boss
    // (sinon : re-spawn du boss au reload → drop dupliqué).
    currentZone = next
    wave = 1
    isRespawning = true   // pause le tick (guard existant) + masque le sprite jusqu'au reveal
    later(() => {
      if (myId !== transitionInvocationId) return
      isTransitioning = false
      spawnNextEnemy()    // lève isRespawning
    }, 2000)
  }

  // Juice visuel (live only), invocationId-gardé comme les overlays.
  let shakeId = 0
  function triggerShake() {
    const my = ++shakeId
    isShaking = true
    later(() => { if (my === shakeId) isShaking = false }, 400)
  }
  // Flash bref sur critique : le retour visuel qui rend le hasard satisfaisant.
  let isCritFlash = false
  let critFlashId = 0
  function triggerCritFlash() {
    const my = ++critFlashId
    isCritFlash = true
    later(() => { if (my === critFlashId) isCritFlash = false }, 220)
  }

  let legendaryId = 0
  function triggerLegendaryFlash() {
    const my = ++legendaryId
    isLegendaryFlash = true
    later(() => { if (my === legendaryId) isLegendaryFlash = false }, 600)
  }

  // Durées et cooldowns effectifs, une entrée par actif. L'Arbre réduit le
  // cooldown de TOUS les actifs ; les bonus de durée du Cri ne touchent que lui
  // (fidélité aux libellés — voir activeTimings).
  $: activeTiming = ACTIVES.reduce((acc, a) => ({
    ...acc,
    [a.id]: activeTimings(a.id, {
      cooldownMult: meta.cooldownMult,
      warCryDurationMult: meta.warCryDurationMult,
      biomeWarCryDurMult: biomeEffects(biome).warCryDurMult,
      biomeWarCryCdMult: biomeEffects(biome).warCryCdMult,
    }),
  }), {})

  // Un invocationId par actif : deux actifs différents ne doivent pas annuler
  // les timers l'un de l'autre.
  const activeInvocations = {}
  function castActive(id) {
    if (!activeState[id]?.ready) return
    const { durationMs, cooldownMs } = activeTiming[id]
    const my = (activeInvocations[id] = (activeInvocations[id] ?? 0) + 1)
    // Réassignation (et non mutation) : Svelte ne suit pas les objets imbriqués.
    activeState = { ...activeState, [id]: { active: true, ready: false } }
    later(() => {
      if (my !== activeInvocations[id]) return
      activeState = { ...activeState, [id]: { ...activeState[id], active: false } }
    }, durationMs)
    later(() => {
      if (my !== activeInvocations[id]) return
      activeState = { ...activeState, [id]: { ...activeState[id], ready: true } }
    }, cooldownMs)
  }

  // Les actifs présentables : débloqués, avec leur état et leur minuterie.
  $: activeRows = ACTIVES
    .filter(a => isActiveUnlocked(a.id, zonesUnlocked))
    .map(a => ({
      ...a,
      active: activeState[a.id]?.active ?? false,
      ready: activeState[a.id]?.ready ?? true,
      cdMs: activeTiming[a.id]?.cooldownMs ?? a.cooldownMs,
      durSec: Math.round((activeTiming[a.id]?.durationMs ?? a.durationMs) / 1000),
    }))

  // --- Croisade (prestige) ---
  $: canPrestige = zonesCleared >= PRESTIGE_MIN_ZONES
  $: pendingGloire = Math.floor(gloireGain(wavesCleared, zonesCleared) * meta.gloireMult * biomeEffects(biome).rewardMult * biomeEffects(biome).gloireMult)

  // Reset du run. On reconstruit chaque champ explicitement (plutôt que de muter
  // au cas par cas) : un champ oublié se verrait tout de suite, et surtout on ne
  // touche pas à ce qui doit survivre — Gloire, Forge, reliques, compteur.
  function doPrestige() {
    if (!canPrestige) return
    gloire += pendingGloire
    prestigeCount += 1
    // Le biome retenu dans l'écran de Croisade prend effet maintenant.
    biome = resolveBiome(pendingBiome, deepestEver)
    // Le départ du nouveau run est celui que l'Arbre a payé : or, paysans et
    // zones déjà conquises. Sans arbre, c'est un reset sec (0 / 0 / zone 1).
    gold = meta.startGold
    counts = { paysan: meta.startTroops, soldat: 0, chevalier: 0, champion: 0 }
    troopUpgrades = {}   // payées en or : elles partent avec le run
    // Les actifs repartent prêts : un buff du run précédent n'a plus d'objet.
    ACTIVES.forEach(a => { activeInvocations[a.id] = (activeInvocations[a.id] ?? 0) + 1 })
    activeState = freshActiveState()
    currentZone = 1
    wave = 1
    zonesUnlocked = 1
    zonesCleared = 0
    wavesCleared = 0
    mobIdx = 0
    showPrestigeScreen = false
    // Invalide une transition de zone encore en vol : sans ça son timer lèverait
    // isTransitioning/isRespawning sur le nouveau run (overlay fantôme).
    transitionInvocationId++
    isTransitioning = false
    spawnNextEnemy()
    // L'horloge du catch-up repart d'ici : sinon les ticks accumulés pendant que
    // l'écran de prestige était ouvert s'appliqueraient au nouveau run.
    lastTickAt = performance.now()
    triggerCrusadeToast()
    saveNow(state())
  }

  let crusadeToastId = 0
  function triggerCrusadeToast() {
    const my = ++crusadeToastId
    victoryMessage = `⚔ CROISADE #${prestigeCount} ⚔`
    showVictoryToast = true
    isFlashing = true
    later(() => { if (my === crusadeToastId) isFlashing = false }, 500)
    later(() => { if (my === crusadeToastId) showVictoryToast = false }, 3000)
  }

  function buyUnitUpgrade(troopId, kindId) {
    const res = buyTroopUpgrade(troopUpgrades, troopId, kindId, gold, TROOPS[troopId].baseCost)
    if (!res) return
    gold = res.gold
    troopUpgrades = res.troopUpgrades
    saveNow(state())   // action utilisateur : persister tout de suite
  }

  // Référence au canevas, pour l'amener sur la progression du joueur.
  let treeCanvasEl = null

  // L'arbre pousse de bas en haut : la racine est en bas, la couronne en haut.
  // À l'ouverture on cadre donc sur la FRONTIÈRE du joueur (le nœud acquis le
  // plus haut) — sinon on tombe sur la couronne, hors de portée, et la racine
  // reste invisible sous le pli.
  async function openForge() {
    showForge = true
    await nextRender()
    if (!treeCanvasEl) return
    const frontierY = treeNodes.length
      ? Math.max(...treeNodes.map(id => nodeById(id)?.y ?? 0))
      : 0
    treeCanvasEl.scrollTop = Math.max(0, svgY(frontierY) - treeCanvasEl.clientHeight / 2)
    treeCanvasEl.scrollLeft = (treeCanvasEl.scrollWidth - treeCanvasEl.clientWidth) / 2
  }

  function selectNode(id) {
    selectedNodeId = id
  }

  // Espace et Entrée activent un nœud focalisé : le SVG n'a pas de <button>, on
  // recrée le contrat clavier à la main.
  function onNodeKeydown(event, id) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      selectNode(id)
    }
  }

  function buyBranchEcho(branchId) {
    const res = buyEcho(branchId, treeNodes, echoes, gloire)
    if (!res) return
    gloire = res.gloire
    echoes = res.echoes
    saveNow(state())
  }

  function buyTreeNode(id) {
    const res = buyNode(id, treeNodes, gloire)
    if (!res) return
    gloire = res.gloire
    treeNodes = res.owned
    saveNow(state())   // action utilisateur : persister tout de suite
  }

  // Lignes d'amélioration par tier débloqué, avec prix et solvabilité.
  $: barracksRows = TROOP_ORDER.filter(id => isTroopUnlocked(id, meta.championUnlocked)).map(id => ({
    id,
    name: TROOPS[id].name,
    spriteUrl: TROOPS[id].spriteUrl,
    count: counts[id],
    mult: troopDmgMult(troopUpgrades, id, counts[id]),
    nextAt: nextMilestone(counts[id]),
    kinds: UPGRADE_KINDS.map(k => {
      const level = levelOf(troopUpgrades, id, k.id)
      const price = upgradePrice(k.id, level, TROOPS[id].baseCost)
      return {
        ...k,
        level,
        price,
        maxed: price === null,
        affordable: price !== null && gold >= price,
      }
    }),
  }))

  // Choix de biome offert dans l'écran de Croisade, avec ce qui reste à débloquer.
  $: biomeChoices = BIOMES.map(b => ({
    ...b,
    unlocked: isBiomeUnlocked(b.id, deepestEver),
    current: b.id === biome,
    picked: b.id === pendingBiome,
  }))
  $: upcomingBiome = nextBiome(deepestEver)

  // --- Géométrie de l'Arbre pour le rendu SVG ---
  // La grille du catalogue (x centré sur 0, y de bas en haut) est projetée en
  // pixels SVG (y inversé, marges incluses). Les constantes vivent ici parce que
  // c'est du rendu, pas de la donnée de jeu.
  const NODE_GAP_X = 116
  const NODE_GAP_Y = 74
  const NODE_R = 21
  const TREE_PAD = 46
  const treeMinX = Math.min(...TREE.map(n => n.x))
  const treeMaxX = Math.max(...TREE.map(n => n.x))
  const treeMaxY = Math.max(...TREE.map(n => n.y))
  const treeWidth = (treeMaxX - treeMinX) * NODE_GAP_X + TREE_PAD * 2
  const treeHeight = treeMaxY * NODE_GAP_Y + TREE_PAD * 2
  const svgX = (x) => (x - treeMinX) * NODE_GAP_X + TREE_PAD
  const svgY = (y) => (treeMaxY - y) * NODE_GAP_Y + TREE_PAD

  const branchColor = (branchId) => BRANCHES.find(b => b.id === branchId)?.color ?? '#d4af37'

  // Un nœud rendu = sa position, son état, et de quoi l'afficher.
  $: treeNodes_view = TREE.map(n => {
    const owned = treeNodes.includes(n.id)
    const unlockable = isUnlockable(n.id, treeNodes)
    return {
      ...n,
      cx: svgX(n.x),
      cy: svgY(n.y),
      color: branchColor(n.branch),
      owned,
      unlockable,
      affordable: unlockable && gloire >= n.cost,
      locked: !owned && !unlockable,
      selected: selectedNodeId === n.id,
    }
  })
  $: nodeStates = treeNodes_view.reduce((acc, n) => ({ ...acc, [n.id]: n }), {})

  // Une arête est « acquise » quand ses deux extrémités le sont : c'est ce qui
  // dessine visuellement le chemin parcouru dans l'arbre.
  $: treeEdges_view = EDGES.map(e => {
    const from = nodeStates[e.from]
    const to = nodeStates[e.to]
    return {
      ...e,
      x1: from.cx, y1: from.cy, x2: to.cx, y2: to.cy,
      owned: from.owned && to.owned,
      open: from.owned && !to.owned,
      color: branchColor(to.branch ?? from.branch),
    }
  })

  // Détail du nœud sélectionné, avec ce qu'il manque pour l'atteindre.
  $: selected = selectedNodeId ? nodeStates[selectedNodeId] : null
  $: selectedReach = selected && !selected.owned ? costToReach(selected.id, treeNodes) : 0

  // Progression par branche, pour l'en-tête et l'accès aux Échos.
  $: treeColumns = BRANCHES.map(b => ({
    ...b,
    total: branchNodes(b.id).length,
    depth: branchNodes(b.id).filter(n => treeNodes.includes(n.id)).length,
    // Écho : ouvert seulement quand la branche est complète, puis sans limite.
    complete: isBranchComplete(b.id, treeNodes),
    echoLevel: echoes[b.id] ?? 0,
    echoCost: echoCost(echoes[b.id] ?? 0),
    echoAffordable: isBranchComplete(b.id, treeNodes) && gloire >= echoCost(echoes[b.id] ?? 0),
  }))

  function applyOneTick(withAnim) {
    // Guard du path live uniquement : le catch-up ne lève jamais isRespawning.
    if (isRespawning) return

    // dps peut être flottant (multiplicateur reliques) → arrondir le coup pour
    // ne jamais afficher de décimales (pop dégâts).
    // Tirage réel : l'affinité de chaque tier, l'armure de la cible, et la
    // chance de critique (qui perce l'armure). Plus de variance décorative ±4 :
    // le hasard du jeu, c'est le critique, et il est visible.
    const hit = computeHit({
      heroDps: baseDps,
      troopDps: troopDpsByTier,
      enemyType: enemy.type,
      armorPct: enemy.armor,
      critChancePct: critChance,
      critMult,
      ignoreArmor: activeFx.ignoreArmor,
      armorPen: roleFx.armorPen,
      globalMult: globalDmgMult,
    })
    const dmg = hit.damage
    enemyHp -= dmg

    if (withAnim) {
      pushPop(hit.crit ? 'crit' : 'damage', dmg)
      if (hit.crit) triggerCritFlash()
      isHit = true
      later(() => isHit = false, 200)
    }

    if (enemyHp <= 0) {
      const bio = currentBiomeFx()
      const earned = Math.floor(enemy.gold * relicGoldMult * meta.goldMult * troopGlobal.goldMult * bio.rewardMult * bio.goldMult * activeFx.goldMult)
      gold += earned
      wavesCleared += 1
      // Décale le pop gold de 150 ms — laisse le pop damage du coup fatal
      // s'afficher seul une fraction de seconde, puis "tap → reward" se lit.
      // enemy ne mute qu'au respawn, donc enemy.gold reste valide à T+150.
      if (withAnim) later(() => pushPop('gold', earned), 150)

      if (isBoss) {
        // Drop garanti, AVANT toute logique de zone / return : sinon le boss
        // qui débloque une zone (return anticipé) ne dropperait jamais.
        // S'applique aux 2 paths ; le feedback visuel reste live-only.
        // Nombre de reliques dicté par le biome : 2 en Profusion, 0 dans le Néant.
        const drops = []
        for (let d = 0; d < bio.relicDrops; d++) {
          const roll = rollRelique(Math.random, dropWeights)
          drops.push({ uid: nextReliqueUid++, defId: roll.defId, rarity: roll.rarity })
        }
        const relic = drops[0] ?? null
        if (drops.length) addToInventory(drops, withAnim)
        if (withAnim) {
          triggerShake()
          if (drops.some(r => r.rarity === 'legendaire')) triggerLegendaryFlash()
        }

        // Zones clear du run (base du gain de Gloire). `max`, pas `+1` : la
        // dernière zone boucle sur son boss, on ne farme pas de Gloire dessus.
        zonesCleared = Math.max(zonesCleared, currentZone)
        deepestEver = Math.max(deepestEver, currentZone)   // record permanent

        // Il y a toujours une zone suivante (zones sans fin) : plus de branche
        // « dernière zone », donc plus d'écran de victoire finale.
        const next = currentZone + 1
        zonesUnlocked = Math.max(zonesUnlocked, next)
        if (withAnim) {
          // Live : écran de transition (révèle la relique, gère wave/zone/spawn).
          startZoneTransition(next, relic)
          saveNow(state())   // save sur kill boss : ne pas risquer de perdre la relique
          return
        }
        currentZone = next   // Catch-up : avance sèche, sans écran.
        wave = 1
      } else {
        wave += 1
      }

      if (withAnim) {
        isRespawning = true
        later(spawnNextEnemy, 250)
      } else {
        // Catch-up : spawn instantané, pas de popup, pas de flash/toast.
        spawnNextEnemy()
      }
    }
  }

  // Catch-up : applique tous les ticks dus depuis lastTickAt.
  // Empêche les idle games de "perdre" le temps quand l'onglet est en background
  // (Chrome throttle setInterval à ~1×/min après 5 min d'arrière-plan).
  function tick() {
    const now = performance.now()
    const elapsed = now - lastTickAt
    const n = Math.floor(elapsed / tickMs)
    if (n <= 0) return
    lastTickAt += n * tickMs

    if (n === 1) {
      applyOneTick(true)
    } else {
      // Catch-up : on simule sec, puis un seul popup "welcome back" centré
      // résume le gain. Sinon le compteur d'or saute "magiquement" et le joueur
      // (5 ans) prend ça pour un bug.
      const goldBefore = gold
      for (let i = 0; i < n; i++) applyOneTick(false)
      const gained = gold - goldBefore
      if (gained > 0) pushPop('gold', gained, 0)
    }
  }

  // Snapshot de l'état durable pour la sauvegarde (primitifs uniquement —
  // jamais les dérivés ni les transients comme enemy/pops/lastTickAt).
  function state() {
    return {
      gold, counts, currentZone, wave, zonesUnlocked, inventory, equipped, nextReliqueUid,
      zonesCleared, wavesCleared, gloire, treeNodes, echoes, prestigeCount, buyMode, troopUpgrades,
      biome, deepestEver,
    }
  }

  // Réhydrate l'état champ par champ avec défauts : une save à laquelle il
  // manque des champs (ajout de contenu futur) ne casse pas.
  function hydrate(raw) {
    gold = raw.gold ?? 0
    counts = { paysan: 0, soldat: 0, chevalier: 0, champion: 0, ...(raw.counts ?? {}) }
    currentZone = Number.isFinite(raw.currentZone) && raw.currentZone >= 1 ? Math.floor(raw.currentZone) : 1
    // Clamp défensif : wave dans [1, waves de la zone]. spawnNextEnemy (appelé
    // ensuite dans onMount) reconstruit l'ennemi cohérent (mob ou boss).
    wave = Math.min(Math.max(1, raw.wave ?? 1), zoneOf(currentZone).waves)
    zonesUnlocked = raw.zonesUnlocked ?? 1
    nextReliqueUid = raw.nextReliqueUid ?? 0
    // Prestige : défauts pour les saves V2 qui n'ont aucun de ces champs.
    zonesCleared = raw.zonesCleared ?? 0
    wavesCleared = raw.wavesCleared ?? 0
    gloire = raw.gloire ?? 0
    // Les ids inconnus sont filtrés : un nœud retiré du catalogue ne doit pas
    // ressusciter en effet fantôme (même défense que les reliques).
    treeNodes = (raw.treeNodes ?? []).filter(id => nodeById(id))
    echoes = sanitizeEchoes(raw.echoes)
    deepestEver = Math.max(0, Math.floor(raw.deepestEver ?? raw.zonesCleared ?? 0))
    biome = resolveBiome(raw.biome, deepestEver)
    pendingBiome = biome
    troopUpgrades = sanitizeTroopUpgrades(raw.troopUpgrades, TROOP_ORDER)
    prestigeCount = raw.prestigeCount ?? 0
    buyMode = isBuyMode(raw.buyMode) ? raw.buyMode : DEFAULT_BUY_MODE
    // Filtrer les instances dont le defId a disparu du catalogue (relique fantôme).
    const known = (r) => r && RELIQUES[r.defId]
    inventory = (raw.inventory ?? []).filter(known)
    equipped = { arme: null, armure: null, banniere: null, amulette: null }
    const rawEq = raw.equipped ?? {}
    for (const slot of RELIQUE_SLOTS) {
      if (known(rawEq[slot])) equipped[slot] = rawEq[slot]
    }
  }

  onMount(() => {
    // Ordre critique : charger AVANT de démarrer le moteur, sinon le premier
    // tick s'applique sur l'état par défaut (flash d'or à 0, mauvais mob).
    const saved = loadSave()
    if (saved) hydrate(saved)
    // Une save migrée doit être réécrite immédiatement : tant que l'ancien
    // format traîne en localStorage, un rechargement rejouerait la migration.
    if (saved?.migrated) saveNow(state())
    spawnNextEnemy()                 // ennemi cohérent avec currentZone/wave
    lastTickAt = performance.now()   // après hydrate (pas d'offline-progress : voulu)
    const intervalId = setInterval(tick, tickMs)
    const autosaveId = setInterval(() => saveNow(state()), autosaveMs)
    const onUnload = () => saveNow(state())
    window.addEventListener('beforeunload', onUnload)
    return () => {
      clearInterval(intervalId)
      clearInterval(autosaveId)
      window.removeEventListener('beforeunload', onUnload)
      pendingTimeouts.forEach(clearTimeout)
      pendingTimeouts.clear()
    }
  })
</script>

<div class="game">
  <header>
    <div class="title">⚔ IDLE CRUSADE</div>
    <div class="resources">
      <div class="resource gold">
        <span class="icon">🪙</span>
        <span class="display">Or</span>
        <span class="value">{formatNumber(gold)}</span>
      </div>
      <div class="resource crit" title="Un critique triple les dégâts et ignore l'armure">
        <span class="icon">💥</span>
        <span class="display">Critique</span>
        <span class="value">{Math.round(critChance)}% ×{formatMult(critMult)}</span>
      </div>
      <div class="resource gloire">
        <span class="icon">🏆</span>
        <span class="display">Gloire</span>
        <span class="value">{formatNumber(gloire)}</span>
      </div>
      {#if biomeInfo.hpMult > 1}
        <div class="resource biome" title={biomeInfo.ruleDesc}>
          <span class="icon">{biomeInfo.sprite}</span>
          <span class="display">{biomeInfo.ruleName}</span>
          <span class="value">×{String(biomeInfo.rewardMult).replace('.', ',')}</span>
        </div>
      {/if}
      {#if prestigeCount > 0}
        <div class="resource croisades">
          <span class="icon">⚔</span>
          <span class="display">Croisade</span>
          <span class="value">#{prestigeCount}</span>
        </div>
      {/if}
    </div>
    <div class="header-actions">
      <button class="header-btn" on:click={() => showBarracks = true}>
        <span class="icon">⚒</span>
        <span class="label">Améliorer</span>
      </button>
      <button class="header-btn" on:click={openForge}>
        <span class="icon">🏰</span>
        <span class="label">Forge</span>
      </button>
      <button
        class="header-btn crusade"
        class:ready={canPrestige}
        on:click={() => showPrestigeScreen = true}
      >
        <span class="icon">⚔</span>
        <span class="label">Croisade</span>
        {#if canPrestige}<span class="badge">+{pendingGloire}</span>{/if}
      </button>
    </div>
  </header>

  <!-- LEFT — CASERNE -->
  <aside class="panel caserne">
    <div class="panel-title">⚔ Caserne</div>

    <div class="buy-modes">
      {#each BUY_MODES as m (m.id)}
        <button
          class="buy-mode"
          class:active={buyMode === m.id}
          on:click={() => { buyMode = m.id; saveNow(state()) }}
        >{m.label}</button>
      {/each}
    </div>

    {#each troopRows as t (t.id)}
      <div
        class="unit"
        class:locked={!t.unlocked}
        class:insolvable={t.unlocked && t.buyCount === 0}
        on:click={() => t.unlocked && recruit(t.id)}
        on:keydown={(e) => t.unlocked && (e.key === 'Enter' || e.key === ' ') && recruit(t.id)}
        role="button"
        tabindex={t.unlocked ? 0 : -1}
      >
        <div class="unit-icon">
          <img src={t.spriteUrl} alt={t.name} class="unit-icon-img" />
        </div>
        <div class="unit-info">
          <div class="unit-name">{t.name}</div>
          {#if t.unlocked}
            <div class="unit-stats">
              +{formatNumber(t.dps * t.mult)} dps
              {#if t.mult > 1}<span class="unit-mult">×{formatMult(t.mult)}</span>{/if}
              {#if t.affinity === 'strong'}
                <span class="unit-affinity strong" title="Fort contre cet ennemi">⚔️ +50%</span>
              {:else if t.affinity === 'faible'}
                <span class="unit-affinity faible" title="Faible contre cet ennemi">🛡️ −30%</span>
              {/if}
            </div>
            {#if t.nextAt}
              <div class="unit-milestone">encore {t.nextAt - t.count} pour ×2</div>
            {/if}
            {#if t.role}
              <div class="unit-role" title={t.role.desc}>
                <span class="unit-role-icon">{t.role.sprite}</span>
                <span class="unit-role-name">{t.role.name}</span>
                {#if t.roleProgress.current > 0}
                  <span class="unit-role-value">+{formatMult(t.roleProgress.current)} {t.role.unit}</span>
                {:else if t.roleProgress.next !== null}
                  <span class="unit-role-next">encore {t.roleProgress.missing}</span>
                {/if}
              </div>
            {/if}
            <div class="unit-cost">
              {#if t.buyQty > 1}<span class="unit-qty">×{t.buyQty}</span>{/if}
              🪙 {formatNumber(t.cost)}
            </div>
          {:else}
            <div class="unit-stats">{t.hint}</div>
            <div class="unit-cost">🔒 verrouillé</div>
          {/if}
        </div>
        <div class="unit-count">{t.unlocked ? t.count : '—'}</div>
      </div>
    {/each}
  </aside>

  <!-- CENTER — COMBAT -->
  <section class="combat" class:shake={isShaking} style:--zone-bg={zone.bg}>
    <div class="zone-header">
      <div class="zone-name display">{zone.name}</div>
      <div class="zone-progress">
        {#if isBoss}
          👑 <span class="display" style="color: var(--blood-bright)">BOSS · {enemy.name}</span>
        {:else}
          Vague {wave} / {zone.waves} · Boss à
          <span class="display" style="color: var(--blood-bright)">
            {zone.waves - wave} vague{zone.waves - wave > 1 ? 's' : ''}
          </span>
        {/if}
      </div>
    </div>

    <div class="enemy">
      <div
        class="enemy-sprite"
        class:hit={isHit}
        class:boss={isBoss}
        style="opacity: {isRespawning ? 0 : 1}"
      >
        {#if enemy.spriteUrl}
          <img src={enemy.spriteUrl} alt={enemy.name} class="sprite-img" />
        {:else}
          {enemy.sprite}
        {/if}
      </div>
      <div class="enemy-name display">{enemy.name}</div>
      <div class="enemy-traits">
        {#if enemy.type}
          <span class="enemy-type">{ENEMY_TYPES[enemy.type].sprite} {ENEMY_TYPES[enemy.type].name}</span>
        {/if}
        {#if enemy.armor > 0}
          <span class="enemy-armor" title="Réduit les dégâts non critiques">
            🛡️ {Math.max(0, enemy.armor - roleFx.armorPen)}%
            {#if roleFx.armorPen > 0}
              <span class="enemy-armor-pen">(−{roleFx.armorPen} percés)</span>
            {/if}
          </span>
        {/if}
      </div>
      <div class="hp-container">
        <div class="hp-label">
          <span>PV</span>
          <span><span>{formatNumber(Math.max(0, enemyHp))}</span> / {formatNumber(enemy.hpMax)}</span>
        </div>
        <div class="hp-bar" class:low={isBoss && hpPercent < 25}>
          <div class="hp-fill" style="width: {hpPercent}%"></div>
        </div>
      </div>
      <div class="dps-readout">
        Ton armée frappe à <span class="dps-value">{formatNumber(dps)} dps</span>
      </div>
    </div>

    {#each pops as pop (pop.id)}
      <div
        class="pop"
        class:gold-pop={pop.kind === 'gold'}
        class:relic-pop={pop.kind === 'relic'}
        class:melt-pop={pop.kind === 'melt'}
        class:crit-pop={pop.kind === 'crit'}
        style:left="calc(50% + {pop.x}px)"
        style:color={pop.kind === 'relic' ? RARITIES[pop.value.rarity].color : null}
      >
        {#if pop.kind === 'crit'}CRITIQUE ! -{formatNumber(pop.value)}
        {:else if pop.kind === 'gold'}+{pop.value} or
        {:else if pop.kind === 'relic'}{RELIQUES[pop.value.defId].sprite} {RELIQUES[pop.value.defId].name} !
        {:else if pop.kind === 'melt'}⚗️ relique fondue +{pop.value} or
        {:else}-{pop.value}{/if}
      </div>
    {/each}

    {#if isCritFlash}
      <div class="crit-flash"></div>
    {/if}
    {#if isLegendaryFlash}
      <div class="legendary-flash"></div>
    {/if}
    {#if isFlashing}
      <div class="victory-flash"></div>
    {/if}
    {#if showVictoryToast}
      <div
        class="victory-toast"
        transition:fade={{ duration: 300 }}
      >
        {victoryMessage}
      </div>
    {/if}
    {#if isTransitioning}
      <div class="zone-transition" transition:fade={{ duration: 350 }}>
        <div class="zone-transition-label">⚔ {transitionZoneName.toUpperCase()} ⚔</div>
        {#if transitionRelic}
          <div class="zone-transition-relic" style="color: {RARITIES[transitionRelic.rarity].color}">
            Tu as trouvé : {RELIQUES[transitionRelic.defId].sprite} {RELIQUES[transitionRelic.defId].name}
            <span class="relic-rarity">({RARITIES[transitionRelic.rarity].label})</span>
          </div>
        {/if}
      </div>
    {/if}
  </section>

  <!-- RIGHT — FORGE -->
  <aside class="panel reliques">
    <div class="panel-title">💎 Reliques</div>

    <div class="relic-slots">
      {#each RELIQUE_SLOTS as slot}
        <div class="relic-slot" class:filled={equipped[slot]}>
          {#if equipped[slot]}
            <span class="relic-slot-icon" style:color={RARITIES[equipped[slot].rarity].color}>
              {RELIQUES[equipped[slot].defId].sprite}
            </span>
          {/if}
          <span class="relic-slot-label">{SLOT_LABELS[slot]}</span>
        </div>
      {/each}
    </div>

    <div class="relic-inventory">
      {#if inventory.length === 0}
        <div class="relic-empty">Tue des boss pour trouver des reliques 💀</div>
      {:else}
        {#each inventory as r (r.uid)}
          <button class="relic-item" on:click={() => equip(r)} style:border-color={RARITIES[r.rarity].color}>
            <span class="relic-item-icon">{RELIQUES[r.defId].sprite}</span>
            <span class="relic-item-info">
              <span class="relic-item-name">{RELIQUES[r.defId].name}</span>
              <span class="relic-item-effect" style:color={RARITIES[r.rarity].color}>
                +{Math.round(reliqueEffect(r.defId, r.rarity).pct)}% {reliqueEffect(r.defId, r.rarity).type === 'dmg' ? 'dégâts' : 'or'}
              </span>
            </span>
          </button>
        {/each}
      {/if}
    </div>
  </aside>

  <!-- BOTTOM — ACTIVES -->
  <div class="actives">
    {#each activeRows as a (a.id)}
      <button
        class="active-btn"
        class:active={a.active}
        class:cooling={!a.ready}
        disabled={!a.ready}
        style:--cd-duration="{a.cdMs}ms"
        title={a.desc}
        on:click={() => castActive(a.id)}
      >
        <span class="icon">{a.sprite}</span>
        <span class="label">{a.name}</span>
        <span class="sub">{a.desc} · {a.durSec}s</span>
        {#if !a.ready}<div class="cooldown-overlay"></div>{/if}
      </button>
    {/each}
  </div>

  {#if showBarracks}
    <div class="modal-backdrop" transition:fade={{ duration: 200 }}>
      <div class="modal wide">
        <div class="modal-title display">⚒ Améliorer les troupes</div>
        <div class="forge-gloire">🪙 {formatNumber(gold)} or · les paliers de recrutement doublent le dps</div>

        <div class="barracks-list">
          {#each barracksRows as t (t.id)}
            <div class="barracks-troop">
              <div class="barracks-head">
                <img src={t.spriteUrl} alt={t.name} class="barracks-sprite" />
                <span class="barracks-name">{t.name}</span>
                <span class="barracks-mult">×{formatMult(t.mult)}</span>
                <span class="barracks-count">{t.count} recrutés{#if t.nextAt}&nbsp;· ×2 à {t.nextAt}{/if}</span>
              </div>
              <div class="barracks-kinds">
                {#each t.kinds as k (k.id)}
                  <button
                    class="barracks-buy"
                    class:maxed={k.maxed}
                    disabled={!k.affordable}
                    on:click={() => buyUnitUpgrade(t.id, k.id)}
                  >
                    <span class="barracks-kind-icon">{k.sprite}</span>
                    <span class="barracks-kind-name">{k.name}</span>
                    <span class="barracks-kind-level">{k.level}/{k.maxLevel}</span>
                    <span class="barracks-kind-price">
                      {#if k.maxed}max{:else}🪙 {formatNumber(k.price)}{/if}
                    </span>
                  </button>
                {/each}
              </div>
            </div>
          {/each}
        </div>

        <div class="modal-actions">
          <button class="modal-btn ghost" on:click={() => showBarracks = false}>Fermer</button>
        </div>
      </div>
    </div>
  {/if}

  {#if showForge}
    <div class="modal-backdrop" transition:fade={{ duration: 200 }}>
      <div class="modal tree-modal">
        <div class="modal-title display">🏰 Arbre de Gloire</div>
        <div class="forge-gloire">🏆 {formatNumber(gloire)} Gloire à dépenser</div>

        <!-- Progression par branche + accès aux Échos une fois la branche complète -->
        <div class="branch-legend">
          {#each treeColumns as col (col.id)}
            <div class="branch-chip" style:--branch-color={col.color}>
              <span class="branch-chip-icon">{col.sprite}</span>
              <span class="branch-chip-name">{col.name}</span>
              <span class="branch-chip-depth">{col.depth}/{col.total}</span>
              {#if col.complete}
                <button
                  class="branch-echo"
                  disabled={!col.echoAffordable}
                  on:click={() => buyBranchEcho(col.id)}
                >∞ {col.echoLevel} · 🏆 {formatNumber(col.echoCost)}</button>
              {/if}
            </div>
          {/each}
        </div>

        <!-- L'arbre lui-même. Le conteneur scrolle (jamais la page). -->
        <div class="tree-canvas" bind:this={treeCanvasEl}>
          <svg viewBox="0 0 {treeWidth} {treeHeight}" width={treeWidth} height={treeHeight} role="group" aria-label="Arbre de Gloire">
            {#each treeEdges_view as e (e.from + '>' + e.to)}
              <line
                class="tree-edge"
                class:owned={e.owned}
                class:open={e.open}
                style:--edge-color={e.color}
                x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              />
            {/each}

            {#each treeNodes_view as n (n.id)}
              <g
                class="tree-node-g"
                class:owned={n.owned}
                class:open={n.unlockable}
                class:affordable={n.affordable}
                class:locked={n.locked}
                class:selected={n.selected}
                class:keystone={n.keystone}
                style:--node-color={n.color}
                transform="translate({n.cx},{n.cy})"
                role="button"
                tabindex="0"
                aria-label={n.name}
                on:click={() => selectNode(n.id)}
                on:keydown={(ev) => onNodeKeydown(ev, n.id)}
              >
                <circle class="tree-node-halo" r={NODE_R + 6} />
                <circle class="tree-node-circle" r={NODE_R} />
                <text class="tree-node-glyph" text-anchor="middle" dominant-baseline="central">
                  {#if n.owned}✓{:else if n.keystone}★{:else}{n.cost}{/if}
                </text>
              </g>
            {/each}
          </svg>
        </div>

        <!-- Détail : on sélectionne un nœud, on l'achète ensuite. Deux temps,
             pour ne pas lâcher 750 Gloire sur une fausse manœuvre. -->
        <div class="tree-detail">
          {#if selected}
            <div class="tree-detail-head" style:--node-color={selected.color}>
              <span class="tree-detail-name">{selected.name}</span>
              {#if selected.limbName}<span class="tree-detail-limb">{selected.limbName}</span>{/if}
            </div>
            <div class="tree-detail-desc">{selected.desc}</div>
            {#if selected.owned}
              <div class="tree-detail-state acquired">✓ Acquis</div>
            {:else if selected.unlockable}
              <button class="modal-btn primary" disabled={!selected.affordable} on:click={() => buyTreeNode(selected.id)}>
                Acquérir · 🏆 {formatNumber(selected.cost)}
              </button>
            {:else}
              <div class="tree-detail-state">
                🔒 Verrouillé · 🏆 {formatNumber(selectedReach)} pour l'atteindre
              </div>
            {/if}
          {:else}
            <div class="tree-detail-hint">Touche un nœud pour voir ce qu'il apporte.</div>
          {/if}
        </div>

        <div class="modal-actions">
          <button class="modal-btn ghost" on:click={() => showForge = false}>Fermer</button>
        </div>
      </div>
    </div>
  {/if}
</div>
