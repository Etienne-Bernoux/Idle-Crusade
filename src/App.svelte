<script>
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import { formatNumber } from './lib/format.js'
  import { loadSave, saveNow } from './lib/save.js'
  import { RELIQUES, RARITIES, RELIQUE_SLOTS, SLOT_LABELS, rollRelique, reliqueEffect, equipRelique, capInventory, meltValue } from './lib/reliques.js'
  import { PRESTIGE_MIN_ZONES, gloireGain, rarityWeights } from './lib/prestige.js'
  import { BRANCHES, branchNodes, treeEffects, isUnlockable, buyNode, nodeById } from './lib/tree.js'
  import { BUY_MODES, DEFAULT_BUY_MODE, isBuyMode, plannedPurchase } from './lib/economy.js'
  import { ZONES, BASE_DPS, TROOPS as CONTENT_TROOPS, TROOP_ORDER, withSprites, troopsWithSprites } from './lib/content.js'
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
  const zones = withSprites(ZONES, SPRITE_URLS)
  const baseDps = BASE_DPS
  const TROOPS = troopsWithSprites(CONTENT_TROOPS, SPRITE_URLS)

  // tickMs DOIT rester entier constant. lastTickAt += n * tickMs reste exact
  // tant que c'est entier ; un buff qui modifierait tickMs corromprait l'horloge.
  const tickMs = 800
  const autosaveMs = 10000
  const BASE_INVENTORY_CAP = 30

  let gold = 0
  let counts = { paysan: 0, soldat: 0, chevalier: 0, champion: 0 }
  let currentZone = 1
  let wave = 1
  let zonesUnlocked = 1
  let mobIdx = 0
  let enemy = zones[1].mobs[0]
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
  let warCryActive = false   // fenêtre ×2 dégâts (10 s)
  let warCryReady = true     // cliquable (cooldown 25 s depuis le cast)

  // Prestige. zonesCleared = boss de zone battus dans le run courant (base du
  // gain de Gloire) ; les trois autres survivent à la Croisade.
  let zonesCleared = 0
  // Vagues vaincues dans le run courant : c'est la base du gain de Gloire
  // (zonesCleared plafonne à 5 et donnait un gain constant à vie).
  let wavesCleared = 0
  let gloire = 0
  let treeNodes = []          // ids des nœuds de l'Arbre de Gloire possédés
  let prestigeCount = 0
  let showPrestigeScreen = false
  let showForge = false
  let activeBranch = BRANCHES[0].id   // onglet mobile ; en desktop les 4 s'affichent

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
  const POP_LIFE_MS = { damage: 1100, gold: 1300, relic: 1700, melt: 1300 }

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
    return plannedPurchase(mode, TROOPS[id].baseCost, counts[id], gold, costMult)
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
  $: meta = treeEffects(treeNodes)
  // La qualité des drops est un palier (0-3) que l'arbre fait monter.
  $: dropWeights = rarityWeights(meta.qualityLevel)
  // L'Arbre agrandit la besace ; le cap reste une dérivée du primitif.
  $: inventoryCap = BASE_INVENTORY_CAP + meta.invCapBonus

  $: warCryMult = warCryActive ? 2 : 1
  $: dps = (baseDps + TROOP_ORDER.reduce((s, id) => s + counts[id] * TROOPS[id].dps, 0)) * relicDmgMult * warCryMult * meta.dmgMult
  $: zone = zones[currentZone]
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
    }
  })

  function spawnNextEnemy() {
    const z = zones[currentZone]
    if (wave === z.waves) {
      enemy = z.boss
      enemyHp = z.boss.hpMax
      isBoss = true
    } else {
      mobIdx = (mobIdx + 1) % z.mobs.length
      enemy = z.mobs[mobIdx]
      enemyHp = enemy.hpMax
      isBoss = false
    }
    isRespawning = false
  }

  // Compteur d'invocation pour annuler les timers d'une victoire précédente
  // si une nouvelle survient avant que les timers en cours ne firent.
  // Évite les états désync (flash off pendant qu'un nouveau flash devrait être on).
  let victoryInvocationId = 0
  function triggerVictory() {
    const myId = ++victoryInvocationId
    isFlashing = true
    later(() => { if (myId === victoryInvocationId) isFlashing = false }, 500)
    victoryMessage = `🏆 ${zones[currentZone].name.toUpperCase()} VAINCUES 🏆`
    showVictoryToast = true
    later(() => { if (myId === victoryInvocationId) showVictoryToast = false }, 3000)
  }

  // Transition cinématique entre zones (path live uniquement). Pause le combat
  // ~2 s, affiche l'écran "LES RUINES", puis bascule sur la zone suivante.
  let transitionInvocationId = 0
  function startZoneTransition(next, relic) {
    const myId = ++transitionInvocationId
    isFlashing = true
    later(() => { if (myId === transitionInvocationId) isFlashing = false }, 500)
    isTransitioning = true
    transitionZoneName = zones[next].name
    transitionRelic = relic
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
  let legendaryId = 0
  function triggerLegendaryFlash() {
    const my = ++legendaryId
    isLegendaryFlash = true
    later(() => { if (my === legendaryId) isLegendaryFlash = false }, 600)
  }

  // Cri de Guerre : ×2 dégâts 10 s, cooldown 25 s depuis le cast (actif temps réel),
  // raccourci par Discipline (Forge).
  const warCryDurationMs = 10000
  const warCryCooldownMs = 25000
  $: warCryCdMs = Math.round(warCryCooldownMs * meta.cooldownMult)
  $: warCryDurMs = Math.round(warCryDurationMs * meta.warCryDurationMult)
  let warCryId = 0
  function castWarCry() {
    if (!warCryReady) return
    warCryReady = false
    warCryActive = true
    const my = ++warCryId
    later(() => { if (my === warCryId) warCryActive = false }, warCryDurMs)
    later(() => { if (my === warCryId) warCryReady = true }, warCryCdMs)
  }

  // --- Croisade (prestige) ---
  $: canPrestige = zonesCleared >= PRESTIGE_MIN_ZONES
  $: pendingGloire = Math.floor(gloireGain(wavesCleared) * meta.gloireMult)

  // Reset du run. On reconstruit chaque champ explicitement (plutôt que de muter
  // au cas par cas) : un champ oublié se verrait tout de suite, et surtout on ne
  // touche pas à ce qui doit survivre — Gloire, Forge, reliques, compteur.
  function doPrestige() {
    if (!canPrestige) return
    gloire += pendingGloire
    prestigeCount += 1
    // Le départ du nouveau run est celui que l'Arbre a payé : or, paysans et
    // zones déjà conquises. Sans arbre, c'est un reset sec (0 / 0 / zone 1).
    gold = meta.startGold
    counts = { paysan: meta.startTroops, soldat: 0, chevalier: 0, champion: 0 }
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

  function buyTreeNode(id) {
    const res = buyNode(id, treeNodes, gloire)
    if (!res) return
    gloire = res.gloire
    treeNodes = res.owned
    saveNow(state())   // action utilisateur : persister tout de suite
  }

  // Une colonne par branche : chaque nœud sait s'il est pris, ouvert, ou hors budget.
  $: treeColumns = BRANCHES.map(b => ({
    ...b,
    nodes: branchNodes(b.id).map(n => {
      const owned = treeNodes.includes(n.id)
      const unlockable = isUnlockable(n.id, treeNodes)
      return {
        ...n,
        owned,
        unlockable,
        affordable: unlockable && gloire >= n.cost,
        // Verrouillé = même pas le prérequis : on montre le coût mais grisé.
        locked: !owned && !unlockable,
      }
    }),
    depth: branchNodes(b.id).filter(n => treeNodes.includes(n.id)).length,
  }))

  function applyOneTick(withAnim) {
    // Guard du path live uniquement : le catch-up ne lève jamais isRespawning.
    if (isRespawning) return

    // dps peut être flottant (multiplicateur reliques) → arrondir le coup pour
    // ne jamais afficher de décimales (pop dégâts).
    const dmg = Math.round(dps) + Math.floor(Math.random() * 9 - 4)
    enemyHp -= dmg

    if (withAnim) {
      pushPop('damage', dmg)
      isHit = true
      later(() => isHit = false, 200)
    }

    if (enemyHp <= 0) {
      const earned = Math.floor(enemy.gold * relicGoldMult * meta.goldMult)
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
        const drop = rollRelique(Math.random, dropWeights)
        const relic = { uid: nextReliqueUid++, defId: drop.defId, rarity: drop.rarity }
        addToInventory([relic], withAnim)
        if (withAnim) {
          triggerShake()
          if (relic.rarity === 'legendaire') triggerLegendaryFlash()
        }

        // Zones clear du run (base du gain de Gloire). `max`, pas `+1` : la
        // dernière zone boucle sur son boss, on ne farme pas de Gloire dessus.
        zonesCleared = Math.max(zonesCleared, currentZone)

        const next = currentZone + 1
        const hasNext = zones[next] !== undefined
        if (hasNext) {
          zonesUnlocked = Math.max(zonesUnlocked, next)
          if (withAnim) {
            // Live : écran de transition (révèle la relique, gère wave/zone/spawn).
            startZoneTransition(next, relic)
            saveNow(state())   // save sur kill boss : ne pas risquer de perdre la relique
            return
          }
          currentZone = next   // Catch-up : avance sèche, sans écran.
        }
        wave = 1
        if (withAnim && !hasNext) {
          triggerVictory()                              // dernière zone : flash + toast
          later(() => pushPop('relic', relic, 0), 450)  // pop dédié, après le pop d'or
        }
        if (withAnim) saveNow(state())
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
      zonesCleared, wavesCleared, gloire, treeNodes, prestigeCount, buyMode,
    }
  }

  // Réhydrate l'état champ par champ avec défauts : une save à laquelle il
  // manque des champs (ajout de contenu futur) ne casse pas.
  function hydrate(raw) {
    gold = raw.gold ?? 0
    counts = { paysan: 0, soldat: 0, chevalier: 0, champion: 0, ...(raw.counts ?? {}) }
    currentZone = zones[raw.currentZone] ? raw.currentZone : 1
    // Clamp défensif : wave dans [1, waves de la zone]. spawnNextEnemy (appelé
    // ensuite dans onMount) reconstruit l'ennemi cohérent (mob ou boss).
    wave = Math.min(Math.max(1, raw.wave ?? 1), zones[currentZone].waves)
    zonesUnlocked = raw.zonesUnlocked ?? 1
    nextReliqueUid = raw.nextReliqueUid ?? 0
    // Prestige : défauts pour les saves V2 qui n'ont aucun de ces champs.
    zonesCleared = raw.zonesCleared ?? 0
    wavesCleared = raw.wavesCleared ?? 0
    gloire = raw.gloire ?? 0
    // Les ids inconnus sont filtrés : un nœud retiré du catalogue ne doit pas
    // ressusciter en effet fantôme (même défense que les reliques).
    treeNodes = (raw.treeNodes ?? []).filter(id => nodeById(id))
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
      <div class="resource gloire">
        <span class="icon">🏆</span>
        <span class="display">Gloire</span>
        <span class="value">{formatNumber(gloire)}</span>
      </div>
      {#if prestigeCount > 0}
        <div class="resource croisades">
          <span class="icon">⚔</span>
          <span class="display">Croisade</span>
          <span class="value">#{prestigeCount}</span>
        </div>
      {/if}
    </div>
    <div class="header-actions">
      <button class="header-btn" on:click={() => showForge = true}>
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
            <div class="unit-stats">+{t.dps} dps · ×1.15</div>
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
        style:left="calc(50% + {pop.x}px)"
        style:color={pop.kind === 'relic' ? RARITIES[pop.value.rarity].color : null}
      >
        {#if pop.kind === 'gold'}+{pop.value} or
        {:else if pop.kind === 'relic'}{RELIQUES[pop.value.defId].sprite} {RELIQUES[pop.value.defId].name} !
        {:else if pop.kind === 'melt'}⚗️ relique fondue +{pop.value} or
        {:else}-{pop.value}{/if}
      </div>
    {/each}

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
    <button
      class="active-btn"
      class:active={warCryActive}
      class:cooling={!warCryReady}
      disabled={!warCryReady}
      style:--cd-duration="{warCryCdMs}ms"
      on:click={castWarCry}
    >
      <span class="icon">📯</span>
      <span class="label">Cri de Guerre</span>
      <span class="sub">×2 dégâts · 10s</span>
      {#if !warCryReady}<div class="cooldown-overlay"></div>{/if}
    </button>
    <button class="active-btn">
      <span class="icon">🧪</span>
      <span class="label">Potion de Soin</span>
      <span class="sub">Restaure les PV · 1 charge</span>
      <div class="cooldown-overlay"></div>
    </button>
  </div>

  {#if showPrestigeScreen}
    <div class="modal-backdrop" transition:fade={{ duration: 200 }}>
      <div class="modal">
        <div class="modal-title display">⚔ Partir en Croisade ⚔</div>

        {#if canPrestige}
          <div class="crusade-gain">
            <span class="crusade-gain-value">+{formatNumber(pendingGloire)}</span>
            <span class="crusade-gain-label">🏆 Points de Gloire</span>
          </div>
          <div class="crusade-detail">
            Pour {formatNumber(wavesCleared)} vagues vaincues sur {zonesCleared} zone{zonesCleared > 1 ? 's' : ''}.
            Reste dans l'Enfer pour en gagner plus.
          </div>
          <div class="crusade-columns">
            <div class="crusade-col lost">
              <div class="crusade-col-title">Tu perds</div>
              <ul>
                <li>🪙 Ton or ({formatNumber(gold)})</li>
                <li>⚔ Toutes tes troupes</li>
                <li>🗺️ Ta progression de zone</li>
              </ul>
            </div>
            <div class="crusade-col kept">
              <div class="crusade-col-title">Tu gardes</div>
              <ul>
                <li>🏆 Ta Gloire et la Forge</li>
                <li>💎 Tes reliques (équipées incluses)</li>
                <li>⚔ Le compte de tes Croisades</li>
              </ul>
            </div>
          </div>
          <div class="modal-actions">
            <button class="modal-btn ghost" on:click={() => showPrestigeScreen = false}>Pas encore</button>
            <button class="modal-btn primary" on:click={doPrestige}>Partir en Croisade</button>
          </div>
        {:else}
          <div class="crusade-locked">
            <div class="crusade-locked-icon">🔒</div>
            <p>
              Bats le boss de l'<strong>Enfer</strong> pour pouvoir partir en Croisade.
            </p>
            <div class="crusade-progress">
              Zones vaincues : <strong>{zonesCleared} / {PRESTIGE_MIN_ZONES}</strong>
            </div>
          </div>
          <div class="modal-actions">
            <button class="modal-btn ghost" on:click={() => showPrestigeScreen = false}>Fermer</button>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if showForge}
    <div class="modal-backdrop" transition:fade={{ duration: 200 }}>
      <div class="modal tree-modal">
        <div class="modal-title display">🏰 Arbre de Gloire</div>
        <div class="forge-gloire">🏆 {formatNumber(gloire)} Gloire à dépenser</div>

        <!-- Mobile : une branche à la fois. Desktop : les 4 côte à côte (CSS). -->
        <div class="branch-tabs">
          {#each treeColumns as col (col.id)}
            <button
              class="branch-tab"
              class:active={activeBranch === col.id}
              style:--branch-color={col.color}
              on:click={() => activeBranch = col.id}
            >
              <span class="branch-tab-icon">{col.sprite}</span>
              <span class="branch-tab-name">{col.name}</span>
              <span class="branch-tab-depth">{col.depth}/{col.nodes.length}</span>
            </button>
          {/each}
        </div>

        <div class="tree-grid">
          {#each treeColumns as col (col.id)}
            <div class="tree-branch" class:mobile-hidden={activeBranch !== col.id} style:--branch-color={col.color}>
              <div class="tree-branch-head">
                <span class="tree-branch-icon">{col.sprite}</span>
                <span class="tree-branch-name">{col.name}</span>
                <span class="tree-branch-desc">{col.desc}</span>
              </div>

              {#each col.nodes as n (n.id)}
                <div class="tree-link" class:filled={n.owned}></div>
                <button
                  class="tree-node"
                  class:owned={n.owned}
                  class:open={n.unlockable}
                  class:keystone={n.keystone}
                  disabled={!n.affordable}
                  on:click={() => buyTreeNode(n.id)}
                >
                  <span class="tree-node-tier">{n.tier}</span>
                  <span class="tree-node-body">
                    <span class="tree-node-name">{n.name}</span>
                    <span class="tree-node-desc">{n.desc}</span>
                  </span>
                  <span class="tree-node-cost">
                    {#if n.owned}✓{:else}🏆 {n.cost}{/if}
                  </span>
                </button>
              {/each}
            </div>
          {/each}
        </div>

        <div class="modal-actions">
          <button class="modal-btn ghost" on:click={() => showForge = false}>Fermer</button>
        </div>
      </div>
    </div>
  {/if}
</div>
