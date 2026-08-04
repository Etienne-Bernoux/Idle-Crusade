<!--
  La Légende : la deuxième couche de prestige. Elle rase la première (Gloire,
  Arbre, Échos) et rend des points multiplicatifs, la seule puissance du jeu
  qui n'a pas de plafond.
-->
<script>
  import { fade } from 'svelte/transition'
  import { formatNumber, formatMult } from '../lib/format.js'

  export let canLegende = false
  export let pending = 0
  export let legendeDeepest = 0
  export let legendePoints = 0
  export let seuil = 0
  export let rows = []
  export let onVoie = () => {}
  export let onLegende = () => {}
  export let onClose = () => {}
</script>

<div class="modal-backdrop" transition:fade={{ duration: 200 }}>
  <div class="modal">
    <div class="modal-title display">✨ Entrer dans la Légende ✨</div>

    {#if canLegende}
      <div class="crusade-gain">
        <span class="crusade-gain-value">+{formatNumber(pending)}</span>
        <span class="crusade-gain-label">✨ Points de Légende</span>
      </div>
      <div class="crusade-detail">
        Pour être descendu jusqu'à la zone {legendeDeepest}. Chaque point est un
        <strong>multiplicateur</strong> — c'est la seule puissance qui n'a pas de plafond.
      </div>
      <div class="crusade-columns">
        <div class="crusade-col lost">
          <div class="crusade-col-title">Tu perds</div>
          <ul>
            <li>🏆 Ta Gloire, l'Arbre et les Échos</li>
            <li>⚔ Tes troupes et leurs améliorations</li>
            <li>🗺️ Ta progression de zone</li>
          </ul>
        </div>
        <div class="crusade-col kept">
          <div class="crusade-col-title">Tu gardes</div>
          <ul>
            <li>💎 Toutes tes reliques</li>
            <li>✨ Ton Panthéon et tes points</li>
            <li>🗺️ Ton record de profondeur</li>
          </ul>
        </div>
      </div>
    {:else}
      <div class="crusade-locked">
        <div class="crusade-locked-icon">🔒</div>
        <p>Atteins la <strong>zone {seuil}</strong> pour entrer dans la Légende.</p>
        <div class="crusade-progress">
          Plus profond atteint : <strong>{legendeDeepest} / {seuil}</strong>
        </div>
      </div>
    {/if}

    <div class="biome-picker">
      <div class="biome-picker-title">
        Panthéon — {formatNumber(legendePoints)} point{legendePoints > 1 ? 's' : ''} à placer
      </div>
      {#each rows as v (v.id)}
        <button
          class="biome-option"
          disabled={legendePoints < 1}
          on:click={() => onVoie(v.id)}
        >
          <span class="biome-option-icon">{v.sprite}</span>
          <span class="biome-option-body">
            <span class="biome-option-name">
              {v.name}
              {#if v.level > 0}<span class="biome-option-tag">niv. {v.level}</span>{/if}
            </span>
            <span class="biome-option-desc">×{formatMult(v.mult)} {v.desc}</span>
          </span>
          <span class="biome-option-gain">+1 ✨</span>
        </button>
      {/each}
      <div class="biome-picker-next">
        Se concentrer sur une voie bat le contenu ; s'éparpiller ne suffit pas.
      </div>
    </div>

    <div class="modal-actions">
      <button class="modal-btn ghost" on:click={() => onClose()}>Fermer</button>
      {#if canLegende}
        <button class="modal-btn primary" on:click={onLegende}>Entrer dans la Légende</button>
      {/if}
    </div>
  </div>
</div>
