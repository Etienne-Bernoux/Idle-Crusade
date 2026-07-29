<!--
  Ce que les rôles rapportent RÉELLEMENT contre cet ennemi.

  On affiche un rapport vérifiable — dégâts avec rôles sur dégâts sans eux —
  jamais un score contre un optimum théorique, qui donnerait au joueur un
  objectif faux dès que l'hypothèse dérive.
-->
<script>
  import { formatNumber } from '../lib/format.js'

  export let ratio = 1
  export let rows = []
  export let advice = null
  export let up = false

  const deux = v => v.toFixed(2).replace('.', ',')
</script>

<div class="compo" class:up>
  <div class="compo-head">
    <span class="compo-label">⚖ Composition</span>
    <span class="compo-ratio">×{deux(ratio)}</span>
    <span class="compo-hint">grâce à tes rôles</span>
  </div>
  {#if rows.length}
    <div class="compo-rows">
      {#each rows as r (r.id)}
        <!-- Grisé quand le rôle ne rapporte rien : c'est l'info la plus utile. -->
        <span class="compo-row" class:dead={r.gain < 1.005} title="{r.role.name} — {r.role.desc}">
          <span class="compo-row-icon">{r.role.sprite}</span>
          <span class="compo-row-gain">×{deux(r.gain)}</span>
        </span>
      {/each}
    </div>
  {/if}
  {#if advice}
    <div class="compo-advice">
      {advice.sprite} encore <strong>{formatNumber(advice.missing)}</strong>
      {advice.tier}{advice.missing > 1 ? 's' : ''} → ×{deux(advice.ratio)}
    </div>
  {/if}
</div>

<style>
  .compo {
    margin-top: 0.5rem;
    padding: 0.45rem 0.6rem;
    border: 1px solid rgba(212, 175, 55, 0.28);
    border-radius: 0.4rem;
    background: rgba(212, 175, 55, 0.05);
    transition: box-shadow 0.25s ease, border-color 0.25s ease;
  }
  .compo.up { border-color: var(--gold, #d4af37); box-shadow: 0 0 18px rgba(212, 175, 55, 0.55); }
  .compo-head { display: flex; align-items: baseline; gap: 0.45rem; flex-wrap: wrap; }
  .compo-label { font-size: 0.82rem; opacity: 0.85; }
  .compo-ratio {
    font-size: 1.25rem;
    font-weight: bold;
    color: var(--gold, #d4af37);
    transition: transform 0.2s ease;
  }
  .compo.up .compo-ratio { transform: scale(1.25); }
  .compo-hint { font-size: 0.74rem; opacity: 0.6; }
  .compo-rows { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.35rem; }
  .compo-row {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    padding: 0.1rem 0.4rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    font-size: 0.78rem;
  }
  .compo-row.dead { opacity: 0.35; }
  .compo-row-gain { font-variant-numeric: tabular-nums; }
  .compo-advice { margin-top: 0.35rem; font-size: 0.78rem; opacity: 0.85; }

  @media (max-width: 560px) { .compo-rows { gap: 0.25rem; } }
  @media (max-width: 380px) { .compo-ratio { font-size: 1.1rem; } }
</style>
