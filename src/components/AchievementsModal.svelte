<!-- Le tableau des 200+ succès : obtenus, verrouillés, et le bonus cumulé. -->
<script>
  import { fade } from 'svelte/transition'
  import { ACHIEVEMENT_RARITIES } from '../lib/achievements.js'
  import { formatMult } from '../lib/format.js'

  export let rows = []
  export let count = { done: 0, total: 0 }
  export let bonus = []
  export let onClose = () => {}
</script>

<div class="modal-backdrop" transition:fade={{ duration: 200 }}>
  <div class="modal wide">
    <div class="modal-title display">🏅 Succès — {count.done} / {count.total}</div>

    <div class="achievement-bonus">
      {#if bonus.length}
        {#each bonus as b (b.label)}
          <span class="achievement-bonus-item">×{formatMult(b.v)} {b.label}</span>
        {/each}
      {:else}
        <span class="achievement-bonus-item muted">
          Aucun bonus encore — chaque succès en apporte un petit
        </span>
      {/if}
    </div>

    <div class="achievement-grid">
      {#each rows as a (a.id)}
        <div class="achievement" class:done={a.done} style:--ach-color={ACHIEVEMENT_RARITIES[a.rarity].color}>
          <span class="achievement-icon">{a.done ? a.sprite : '🔒'}</span>
          <span class="achievement-body">
            <span class="achievement-name">{a.name}</span>
            <span class="achievement-desc">{a.desc}</span>
            <span class="achievement-rarity">
              {ACHIEVEMENT_RARITIES[a.rarity].label}
              · ×{ACHIEVEMENT_RARITIES[a.rarity].mult.toFixed(3).replace('.', ',')}
            </span>
          </span>
        </div>
      {/each}
    </div>

    <div class="modal-actions">
      <button class="modal-btn ghost" on:click={onClose}>Fermer</button>
    </div>
  </div>
</div>

<style>
  .achievement-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(14rem, 100%), 1fr));
    gap: 0.5rem;
    max-height: 55vh;
    overflow-y: auto;
    padding-right: 0.25rem;
  }
  .achievement {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    padding: 0.5rem 0.6rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 0.4rem;
    opacity: 0.45;
  }
  .achievement.done {
    border-color: var(--ach-color, #d4af37);
    background: color-mix(in srgb, var(--ach-color, #d4af37) 10%, transparent);
    opacity: 1;
  }
  .achievement-icon { font-size: 1.5rem; flex: none; }
  .achievement-body { display: flex; flex-direction: column; min-width: 0; }
  .achievement-name { font-weight: bold; }
  .achievement-desc { font-size: 0.78rem; opacity: 0.8; }
  .achievement-rarity { font-size: 0.7rem; color: var(--ach-color, #d4af37); opacity: 0.9; }

  .achievement-bonus { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.6rem; }
  .achievement-bonus-item {
    padding: 0.2rem 0.5rem;
    border: 1px solid rgba(212, 175, 55, 0.4);
    border-radius: 999px;
    font-size: 0.8rem;
    color: var(--gold, #d4af37);
  }
  .achievement-bonus-item.muted { border-color: rgba(255, 255, 255, 0.15); color: inherit; opacity: 0.6; }

  @media (max-width: 560px) {
    .achievement-grid { grid-template-columns: 1fr; max-height: 50vh; }
  }
</style>
