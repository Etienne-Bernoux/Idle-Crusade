<!--
  Le Conseil du retour : ce qui s'est passé pendant l'absence, et qu'il faut
  trancher. Deux gros boutons par carte, décidables en deux secondes — c'est le
  seul écran du jeu où un enfant peut choisir seul.
-->
<script>
  import { fade } from 'svelte/transition'
  import { CARTES, montants } from '../lib/conseil.js'
  import { formatNumber } from '../lib/format.js'

  export let cartes = []
  export let ctx = {}
  export let onChoisir = () => {}
  export let onClose = () => {}

  const libelle = (gain) => ({
    gold: 'or', gloire: 'Gloire', relique: 'relique', paysans: 'paysans',
  })[gain] ?? gain

  // « 1 relique » plutôt que « 1 relique(s) », et les gros nombres formatés.
  function texteGain(effet) {
    const [cle, valeur] = Object.entries(effet)[0] ?? []
    if (!cle) return ''
    if (cle === 'relique') return valeur > 1 ? `${valeur} reliques` : 'une relique'
    return `${formatNumber(valeur)} ${libelle(cle)}`
  }
</script>

<div class="modal-backdrop" transition:fade={{ duration: 200 }}>
  <div class="modal">
    <div class="modal-title display">🕯 Le Conseil</div>
    <p class="conseil-intro">
      Pendant ton absence, ton camp a dû attendre tes ordres.
    </p>

    {#each cartes as carte (carte.id)}
      {@const def = CARTES[carte.id]}
      {@const m = montants(carte.id, ctx)}
      <div class="conseil-carte">
        <div class="conseil-tete">
          <span class="conseil-sprite">{def.sprite}</span>
          <span class="conseil-titre">{def.titre}</span>
        </div>
        <p class="conseil-texte">{def.texte}</p>
        <div class="conseil-choix">
          <button class="modal-btn primary" on:click={() => onChoisir(carte.id, 'a')}>
            {def.a.sprite} {def.a.label}
            <span class="conseil-gain">{texteGain(m.a)}</span>
          </button>
          <button class="modal-btn primary" on:click={() => onChoisir(carte.id, 'b')}>
            {def.b.sprite} {def.b.label}
            <span class="conseil-gain">{texteGain(m.b)}</span>
          </button>
        </div>
      </div>
    {/each}

    <div class="modal-actions">
      <!-- On peut partir sans trancher : les cartes attendent 24 h. Forcer un
           choix ferait du retour une corvée. -->
      <button class="modal-btn ghost" on:click={onClose}>Plus tard</button>
    </div>
  </div>
</div>

<style>
  .conseil-intro { margin-bottom: 14px; font-size: 0.85rem; opacity: 0.8; }
  .conseil-carte {
    margin-bottom: 14px;
    padding: 12px;
    text-align: left;
    border: 1px solid var(--leather);
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.22);
  }
  .conseil-tete { display: flex; align-items: center; gap: 0.5rem; }
  .conseil-sprite { font-size: 1.6rem; }
  .conseil-titre { font-family: 'Cinzel', serif; color: var(--gold); }
  .conseil-texte { margin: 4px 0 10px; font-size: 0.82rem; opacity: 0.8; }
  .conseil-choix { display: flex; gap: 8px; }
  .conseil-choix :global(.modal-btn) {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-height: 52px;
  }
  .conseil-gain { font-size: 0.74rem; opacity: 0.85; }

  @media (max-width: 560px) {
    .conseil-choix { flex-direction: column; }
  }
</style>
