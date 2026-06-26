<script>
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import { formatNumber } from './lib/format.js'
  import { loadSave, saveNow } from './lib/save.js'
  import { RELIQUES, RARITIES, RELIQUE_SLOTS, SLOT_LABELS, rollRelique, reliqueEffect, equipRelique, capInventory, meltValue } from './lib/reliques.js'
  import paysanSprite from './assets/sprites/paysan.webp'
  import soldatSprite from './assets/sprites/soldat.webp'
  import chevalierSprite from './assets/sprites/chevalier.webp'
  import championSprite from './assets/sprites/champion.webp'
  import gobelinSprite from './assets/sprites/gobelin.webp'
  import foretSprite from './assets/sprites/foret.webp'

  // Catalogue de zones. Lookup O(1) par numéro de zone (convention catalogues).
  // mobs : rotation cyclique (array). boss : ennemi unique de fin de zone.
  // bg : valeur CSS injectée dans --zone-bg (sprite zone 1, gradient pierre zone 2).
  const zones = {
    1: {
      name: 'Forêt Sombre',
      bg: `url(${foretSprite})`,
      waves: 10,
      mobs: [
        { name: 'Gobelin Maraudeur', sprite: '👹', spriteUrl: gobelinSprite, hpMax: 500, gold: 5 },
        { name: 'Squelette Croulant', sprite: '💀', spriteUrl: null, hpMax: 600, gold: 8 },
        { name: 'Loup Galeux', sprite: '🐺', spriteUrl: null, hpMax: 450, gold: 4 },
        { name: 'Orc Brute', sprite: '👺', spriteUrl: null, hpMax: 700, gold: 12 },
        { name: 'Rat Géant', sprite: '🐀', spriteUrl: null, hpMax: 350, gold: 3 },
      ],
      boss: { name: 'Roi Gobelin', sprite: '👑', spriteUrl: null, hpMax: 5000, gold: 200 },
    },
    2: {
      name: 'Ruines',
      bg: 'radial-gradient(circle at 50% 20%, #3b3f4a 0%, #1a1c22 60%, #0e0f13 100%)',
      waves: 12,
      mobs: [
        { name: 'Squelette Brisé', sprite: '💀', spriteUrl: null, hpMax: 2500, gold: 30 },
        { name: 'Chauve-souris Vorace', sprite: '🦇', spriteUrl: null, hpMax: 2000, gold: 25 },
        { name: 'Araignée Géante', sprite: '🕷️', spriteUrl: null, hpMax: 3200, gold: 40 },
        { name: 'Spectre Errant', sprite: '👻', spriteUrl: null, hpMax: 2800, gold: 35 },
        { name: 'Goule Affamée', sprite: '🧟', spriteUrl: null, hpMax: 3500, gold: 50 },
      ],
      boss: { name: 'Liche des Ruines', sprite: '💀', spriteUrl: null, hpMax: 25000, gold: 1200 },
    },
  }

  // Catalogue de troupes. unlockZone 99 = pas encore débloquable (Chevalier/Champion).
  const baseDps = 35
  const TROOPS = {
    paysan:    { name: 'Paysan',    spriteUrl: paysanSprite,    baseCost: 10,    dps: 1,    unlockZone: 1,  hint: '' },
    soldat:    { name: 'Soldat',    spriteUrl: soldatSprite,    baseCost: 100,   dps: 12,   unlockZone: 2,  hint: 'Bats le boss de la Forêt' },
    chevalier: { name: 'Chevalier', spriteUrl: chevalierSprite, baseCost: 1000,  dps: 150,  unlockZone: 99, hint: 'Bientôt…' },
    champion:  { name: 'Champion',  spriteUrl: championSprite,   baseCost: 10000, dps: 2000, unlockZone: 99, hint: 'Endgame' },
  }
  const TROOP_ORDER = ['paysan', 'soldat', 'chevalier', 'champion']

  // tickMs DOIT rester entier constant. lastTickAt += n * tickMs reste exact
  // tant que c'est entier ; un buff qui modifierait tickMs corromprait l'horloge.
  const tickMs = 800
  const autosaveMs = 10000
  const inventoryCap = 30

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
  function costOf(id) {
    return Math.floor(TROOPS[id].baseCost * Math.pow(1.15, counts[id]))
  }

  function recruit(id) {
    if (zonesUnlocked < TROOPS[id].unlockZone) return
    const cost = costOf(id)
    if (gold < cost) return
    gold -= cost
    counts = { ...counts, [id]: counts[id] + 1 }
  }

  // Ajoute des reliques à l'inventaire et applique le cap : les plus faibles
  // au-delà du cap sont fondues en or. withAnim = feedback live (sinon l'or est
  // absorbé par le pop welcome-back du catch-up, dérivé de gold).
  function addToInventory(relics, withAnim) {
    const { inventory: kept, melted } = capInventory([...inventory, ...relics], inventoryCap)
    inventory = kept
    if (melted.length) {
      const meltGold = melted.reduce((s, r) => s + meltValue(r.rarity), 0)
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
  $: relicDmgMult = 1 + relicEffects.filter(e => e.type === 'dmg').reduce((s, e) => s + e.pct / 100, 0)
  $: relicGoldMult = 1 + relicEffects.filter(e => e.type === 'gold').reduce((s, e) => s + e.pct / 100, 0)

  $: dps = (baseDps + TROOP_ORDER.reduce((s, id) => s + counts[id] * TROOPS[id].dps, 0)) * relicDmgMult
  $: zone = zones[currentZone]
  $: hpPercent = Math.max(0, enemyHp / enemy.hpMax * 100)
  $: troopRows = TROOP_ORDER.map(id => ({
    id,
    name: TROOPS[id].name,
    spriteUrl: TROOPS[id].spriteUrl,
    dps: TROOPS[id].dps,
    hint: TROOPS[id].hint,
    count: counts[id],
    cost: costOf(id),
    unlocked: zonesUnlocked >= TROOPS[id].unlockZone,
  }))

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
      const earned = Math.floor(enemy.gold * relicGoldMult)
      gold += earned
      // Décale le pop gold de 150 ms — laisse le pop damage du coup fatal
      // s'afficher seul une fraction de seconde, puis "tap → reward" se lit.
      // enemy ne mute qu'au respawn, donc enemy.gold reste valide à T+150.
      if (withAnim) later(() => pushPop('gold', earned), 150)

      if (isBoss) {
        // Drop garanti, AVANT toute logique de zone / return : sinon le boss
        // qui débloque une zone (return anticipé) ne dropperait jamais.
        // S'applique aux 2 paths ; le feedback visuel reste live-only.
        const drop = rollRelique()
        const relic = { uid: nextReliqueUid++, defId: drop.defId, rarity: drop.rarity }
        addToInventory([relic], withAnim)

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
    return { gold, counts, currentZone, wave, zonesUnlocked, inventory, equipped, nextReliqueUid }
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
        <span class="value">12</span>
      </div>
    </div>
  </header>

  <!-- LEFT — CASERNE -->
  <aside class="panel caserne">
    <div class="panel-title">⚔ Caserne</div>

    {#each troopRows as t (t.id)}
      <div
        class="unit"
        class:locked={!t.unlocked}
        class:insolvable={t.unlocked && gold < t.cost}
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
            <div class="unit-cost">🪙 {formatNumber(t.cost)}</div>
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
  <section class="combat" style:--zone-bg={zone.bg}>
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
          <span><span>{Math.max(0, Math.floor(enemyHp))}</span> / {enemy.hpMax}</span>
        </div>
        <div class="hp-bar">
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
    <button class="active-btn">
      <span class="icon">📯</span>
      <span class="label">Cri de Guerre</span>
      <span class="sub">×2 dégâts · 10s</span>
      <div class="cooldown-overlay"></div>
    </button>
    <button class="active-btn">
      <span class="icon">🧪</span>
      <span class="label">Potion de Soin</span>
      <span class="sub">Restaure les PV · 1 charge</span>
      <div class="cooldown-overlay"></div>
    </button>
  </div>
</div>
