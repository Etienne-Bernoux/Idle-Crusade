<!--
  Les améliorations de troupes : payées en or, propres à un tier, perdues à la
  Croisade. Le bandeau de portée en tête n'est pas décoratif — c'est lui qui
  distingue cet écran de l'Arbre, qui lui est permanent.
-->
<script>
  import { fade } from 'svelte/transition'
  import { formatNumber, formatMult } from '../lib/format.js'

  export let rows = []
  export let gold = 0
  // Le héros n'est pas une troupe : il n'a ni compte, ni paliers, ni rôle. Il
  // vit donc en tête de cet écran, pas dans la liste.
  export let frappe = { niveau: 0, max: 0, degats: 0, prix: null }
  export let onFrappe = () => {}
  export let onBuy = () => {}
  export let onClose = () => {}
</script>

<div class="modal-backdrop" transition:fade={{ duration: 200 }}>
  <div class="modal wide">
    <div class="modal-title display">⚒ Améliorer les troupes</div>
    <div class="scope-note">
      Payé en <strong>or</strong> · propre à chaque tier · <strong>remis à zéro par la Croisade</strong>
    </div>
    <div class="forge-gloire">🪙 {formatNumber(gold)} disponible</div>

    <div class="barracks-frappe">
      <span class="barracks-frappe-icone">🗡️</span>
      <span class="barracks-frappe-corps">
        <span class="barracks-name">Frappe</span>
        <span class="barracks-frappe-degats">
          {formatNumber(Math.round(frappe.degats))} dégâts par clic · niveau {frappe.niveau}/{frappe.max}
        </span>
      </span>
      {#if frappe.prix !== null}
        <button class="barracks-buy barracks-frappe-buy" disabled={gold < frappe.prix} on:click={onFrappe}>
          <span class="barracks-kind-icon">⚒</span>
          <span class="barracks-kind-name">Aiguiser</span>
          <span class="barracks-kind-price">🪙 {formatNumber(frappe.prix)}</span>
        </button>
      {:else}
        <span class="barracks-frappe-max">⚔ Affûtée à fond</span>
      {/if}
    </div>

    <div class="barracks-list">
      {#each rows as t (t.id)}
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
                on:click={() => onBuy(t.id, k.id)}
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
      <button class="modal-btn ghost" on:click={() => onClose()}>Fermer</button>
    </div>
  </div>
</div>

<style>
  /* ---------- MODALE D'AMÉLIORATION DES TROUPES ---------- */
  .barracks-frappe {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
    padding: 10px;
    text-align: left;
    border: 1px solid var(--gold);
    border-radius: 4px;
    background: rgba(212, 175, 55, 0.08);
  }
  .barracks-frappe-icone { font-size: 1.6rem; }
  .barracks-frappe-corps { display: flex; flex-direction: column; gap: 2px; }
  .barracks-frappe-degats { font-size: 0.78rem; color: var(--parchment-dim); }
  .barracks-frappe-max { margin-left: auto; font-size: 0.8rem; color: var(--gold); }
  /* Le socle `.barracks-buy` est une colonne haute, calibrée pour une grille de
     quatre. Ici c'est un bouton unique en bout de ligne : on le remet à plat. */
  .barracks-frappe-buy {
    margin-left: auto;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    min-width: 170px;
  }
  .barracks-list { display: flex; flex-direction: column; gap: 12px; text-align: left; }
  .barracks-troop {
    padding: 10px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid var(--leather);
    border-radius: 3px;
  }
  .barracks-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .barracks-sprite { width: 32px; height: 32px; image-rendering: pixelated; }
  .barracks-name { font-family: 'Cinzel', serif; font-size: 0.95rem; }
  .barracks-mult {
    font-family: 'Cinzel', serif;
    font-weight: 700;
    color: var(--gold);
    text-shadow: 0 0 8px rgba(212, 175, 55, 0.5);
  }
  .barracks-count { margin-left: auto; font-size: 0.78rem; color: var(--parchment-dim); }
  .barracks-kinds { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .barracks-buy {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 7px 4px;
    font-family: 'EB Garamond', Georgia, serif;
    color: var(--parchment);
    background: linear-gradient(to bottom, var(--leather-light), var(--leather));
    border: 1px solid var(--gold);
    border-radius: 3px;
    cursor: pointer;
  }
  .barracks-buy:hover:not(:disabled) { filter: brightness(1.25); }
  .barracks-buy:disabled { opacity: 0.45; cursor: not-allowed; border-color: var(--leather-light); }
  .barracks-buy.maxed { opacity: 0.6; border-color: var(--parchment-dim); }
  .barracks-kind-icon { font-size: 1.1rem; }
  .barracks-kind-name { font-family: 'Cinzel', serif; font-size: 0.72rem; text-align: center; }
  .barracks-kind-level { font-size: 0.72rem; color: var(--parchment-dim); }
  .barracks-kind-price { font-size: 0.75rem; color: var(--gold); white-space: nowrap; }

  @media (max-width: 640px) {
    /* Le bouton à 170 px comprimait le libellé à trois lignes : sur téléphone
       il passe dessous, pleine largeur. */
    .barracks-frappe { flex-wrap: wrap; }
    .barracks-frappe-buy { margin-left: 0; flex-basis: 100%; justify-content: center; }
  }

  @media (max-width: 900px) {
    .barracks-kinds { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .barracks-count { font-size: 0.72rem; }
  }
</style>
