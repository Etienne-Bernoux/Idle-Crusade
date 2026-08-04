<!--
  La Croisade : le prestige de premier niveau. On y choisit aussi où repartir
  (biome) et sous quel Vœu — deux décisions qui n'engagent que le run suivant,
  d'où les `pendingXxx` liés au parent plutôt qu'un état local.
-->
<script>
  import { fade } from 'svelte/transition'
  import { formatNumber } from '../lib/format.js'

  export let canPrestige = false
  export let pending = 0
  export let wavesCleared = 0
  export let zonesCleared = 0
  export let biomeInfo = {}
  export let gold = 0
  export let deepestEver = 0
  export let biomes = []
  export let voeuRows = []
  export let upcomingBiome = null
  export let biome = null
  export let pendingBiome = null
  export let pendingVoeu = null
  export let seuil = 0
  export let zoneSeuil = ''
  export let onPrestige = () => {}
  export let onClose = () => {}
</script>

<div class="modal-backdrop" transition:fade={{ duration: 200 }}>
  <div class="modal">
    <div class="modal-title display">⚔ Partir en Croisade ⚔</div>

    {#if canPrestige}
      <div class="crusade-gain">
        <span class="crusade-gain-value">+{formatNumber(pending)}</span>
        <span class="crusade-gain-label">🏆 Points de Gloire</span>
      </div>
      <div class="crusade-detail">
        Pour {formatNumber(wavesCleared)} vagues vaincues sur {zonesCleared} zone{zonesCleared > 1 ? 's' : ''}{#if biomeInfo.hpMult > 1}
        dans les {biomeInfo.name}{/if}.
        {#if pendingBiome !== biome}
          <em>Le biome choisi s'appliquera au prochain run.</em>
        {:else}
          Va plus loin pour en gagner plus.
        {/if}
      </div>
      <div class="crusade-columns">
        <div class="crusade-col lost">
          <div class="crusade-col-title">Tu perds</div>
          <ul>
            <li>🪙 Ton or ({formatNumber(gold)})</li>
            <li>⚔ Toutes tes troupes</li>
            <li>⚒ Les améliorations de troupes</li>
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
      <div class="biome-picker">
        <div class="biome-picker-title">Où repartir ?</div>
        {#each biomes as b (b.id)}
          <button
            class="biome-option"
            class:picked={b.picked}
            disabled={!b.unlocked}
            on:click={() => pendingBiome = b.id}
          >
            <span class="biome-option-icon">{b.sprite}</span>
            <span class="biome-option-body">
              <span class="biome-option-name">
                {b.name}
                {#if b.current}<span class="biome-option-tag">actuel</span>{/if}
              </span>
              {#if b.unlocked}
                <span class="biome-option-rule">{b.ruleName} — {b.ruleDesc}</span>
                <span class="biome-option-desc">{b.desc}</span>
              {:else}
                <span class="biome-option-desc">🔒 Atteins la zone {b.unlockAtZone} pour l'ouvrir</span>
              {/if}
            </span>
            {#if b.unlocked && b.rewardMult > 1}
              <span class="biome-option-gain">🏆 ×{String(b.rewardMult).replace('.', ',')}</span>
            {/if}
          </button>
        {/each}
        {#if voeuRows.some(v => v.unlocked)}
          <div class="biome-picker-title" style="margin-top:12px">
            Pierre de Vœu — une règle changée contre un renoncement
          </div>
          <button
            class="biome-option"
            class:picked={pendingVoeu === null}
            on:click={() => pendingVoeu = null}
          >
            <span class="biome-option-icon">·</span>
            <span class="biome-option-body">
              <span class="biome-option-name">Aucun Vœu</span>
              <span class="biome-option-desc">Le choix prudent.</span>
            </span>
          </button>
          {#each voeuRows.filter(v => v.unlocked) as v (v.id)}
            <button
              class="biome-option"
              class:picked={v.picked}
              on:click={() => pendingVoeu = v.id}
            >
              <span class="biome-option-icon">{v.sprite}</span>
              <span class="biome-option-body">
                <span class="biome-option-name">
                  {v.name}
                  {#if v.current}<span class="biome-option-tag">actuel</span>{/if}
                </span>
                <span class="biome-option-rule">✋ {v.renoncement}</span>
                <span class="biome-option-desc">✨ {v.contrepartie}</span>
              </span>
              <span class="biome-option-gain">🏆 ×1,5</span>
            </button>
          {/each}
        {/if}

        {#if upcomingBiome}
          <div class="biome-picker-next">
            Prochain : {upcomingBiome.sprite} {upcomingBiome.name} — zone {upcomingBiome.unlockAtZone}
            (record : {deepestEver})
          </div>
        {/if}
      </div>

      <div class="modal-actions">
        <button class="modal-btn ghost" on:click={() => onClose()}>Pas encore</button>
        <button class="modal-btn primary" on:click={onPrestige}>Partir en Croisade</button>
      </div>
    {:else}
      <div class="crusade-locked">
        <div class="crusade-locked-icon">🔒</div>
        <p>
          Bats le boss de <strong>{zoneSeuil}</strong> pour pouvoir partir en Croisade.
        </p>
        <div class="crusade-progress">
          Zones vaincues : <strong>{zonesCleared} / {seuil}</strong>
        </div>
      </div>
      <div class="modal-actions">
        <button class="modal-btn ghost" on:click={() => onClose()}>Fermer</button>
      </div>
    {/if}
  </div>
</div>
