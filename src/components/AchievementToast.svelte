<!-- Notification d'un succès obtenu. Teintée par sa rareté. -->
<script>
  import { fade } from 'svelte/transition'
  import { ACHIEVEMENT_RARITIES } from '../lib/achievements.js'

  export let achievement
  $: rarity = ACHIEVEMENT_RARITIES[achievement.rarity]
</script>

<div class="achievement-toast" transition:fade={{ duration: 250 }} style:--ach-color={rarity.color}>
  <span class="achievement-toast-icon">{achievement.sprite}</span>
  <span class="achievement-toast-body">
    <span class="achievement-toast-title">{achievement.name}</span>
    <span class="achievement-toast-desc">{achievement.desc}</span>
    <span class="achievement-toast-gain">
      {rarity.label} · ×{rarity.mult.toFixed(3).replace('.', ',')}
    </span>
  </span>
</div>

<style>
  .achievement-toast {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    z-index: 60;
    display: flex;
    gap: 0.6rem;
    align-items: center;
    max-width: min(22rem, calc(100vw - 2rem));
    padding: 0.7rem 0.9rem;
    border: 2px solid var(--ach-color, #d4af37);
    border-radius: 0.5rem;
    background: rgba(20, 14, 8, 0.96);
    box-shadow: 0 0 18px color-mix(in srgb, var(--ach-color, #d4af37) 45%, transparent);
  }
  .achievement-toast-icon { font-size: 1.7rem; }
  .achievement-toast-body { display: flex; flex-direction: column; min-width: 0; }
  .achievement-toast-title { color: var(--ach-color, #d4af37); font-weight: bold; }
  .achievement-toast-desc { font-size: 0.8rem; opacity: 0.8; }
  .achievement-toast-gain { font-size: 0.72rem; opacity: 0.75; }
</style>
