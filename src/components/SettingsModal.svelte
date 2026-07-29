<!--
  Écran de Réglages : pour l'instant l'export / import de save.

  Premier composant extrait d'App.svelte (US 35). Le CLAUDE.md prévoit que le
  CSS passe en `<style>` scopé « uniquement à l'éclatement » : c'est ici. Seuls
  les styles PROPRES à ce panneau descendent ; `.modal`, `.modal-btn` et
  compagnie restent dans app.css, ils servent partout.
-->
<script>
  import { fade } from 'svelte/transition'

  export let exportCode = ''
  export let importText = ''
  export let importError = ''
  export let importPreview = null
  export let copied = false
  // Callbacks plutôt qu'événements : le parent tient l'état, le composant ne
  // fait que l'afficher et signaler les intentions.
  export let onCopy = () => {}
  export let onCheck = () => {}
  export let onConfirm = () => {}
  export let onClose = () => {}
</script>

<div class="modal-backdrop" transition:fade={{ duration: 200 }}>
  <div class="modal">
    <div class="modal-title display">⚙ Réglages</div>

    <div class="settings-block">
      <div class="settings-title">📤 Sauvegarder cette partie</div>
      <p class="settings-hint">
        Copie ce code et garde-le. Il contient toute ta progression — c'est le seul
        moyen de la retrouver si ton navigateur efface ses données.
      </p>
      <textarea class="settings-code" readonly rows="3" value={exportCode}
        on:focus={(e) => e.target.select()}></textarea>
      <button class="modal-btn primary" on:click={onCopy}>
        {copied ? '✅ Copié' : 'Copier le code'}
      </button>
    </div>

    <div class="settings-block">
      <div class="settings-title">📥 Charger une partie</div>
      <p class="settings-hint">
        Colle un code ici. <strong>Ta partie actuelle sera remplacée.</strong>
      </p>
      <textarea class="settings-code" rows="3" placeholder="IDLECRUSADE1:…"
        bind:value={importText} on:input={onCheck}></textarea>
      {#if importError}
        <div class="settings-error">⚠️ {importError}</div>
      {/if}
      {#if importPreview}
        <div class="settings-preview">
          Zone {importPreview.zone} · record zone {importPreview.record} ·
          {importPreview.croisades} Croisade{importPreview.croisades > 1 ? 's' : ''} ·
          {importPreview.legendes} Légende{importPreview.legendes > 1 ? 's' : ''} ·
          {importPreview.succes} succès
        </div>
        <button class="modal-btn primary" on:click={onConfirm}>
          Remplacer ma partie par celle-ci
        </button>
      {/if}
    </div>

    <div class="modal-actions">
      <button class="modal-btn ghost" on:click={onClose}>Fermer</button>
    </div>
  </div>
</div>

<style>
  .settings-block {
    margin-bottom: 18px;
    padding: 12px;
    text-align: left;
    border: 1px solid var(--leather);
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.2);
  }
  .settings-title {
    margin-bottom: 6px;
    font-family: 'Cinzel', serif;
    color: var(--gold);
  }
  .settings-hint { margin-bottom: 8px; font-size: 0.8rem; opacity: 0.8; }
  .settings-code {
    width: 100%;
    margin-bottom: 8px;
    padding: 8px;
    font-family: ui-monospace, monospace;
    font-size: 0.72rem;
    color: var(--parchment);
    background: rgba(0, 0, 0, 0.45);
    border: 1px solid var(--leather);
    border-radius: 3px;
    resize: vertical;
    word-break: break-all;
  }
  .settings-error {
    margin-bottom: 8px;
    padding: 6px 8px;
    font-size: 0.8rem;
    color: #ff9d9d;
    background: rgba(196, 30, 58, 0.15);
    border-radius: 3px;
  }
  .settings-preview {
    margin-bottom: 8px;
    padding: 6px 8px;
    font-size: 0.8rem;
    color: var(--gold);
    background: rgba(212, 175, 55, 0.1);
    border-radius: 3px;
  }
</style>
