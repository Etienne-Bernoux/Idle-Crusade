<!--
  L'Arbre de Gloire, rendu en SVG depuis US 19. Deux temps volontaires :
  sélectionner un nœud, puis l'acquérir — on ne lâche pas 750 Gloire sur une
  fausse manœuvre.
-->
<script>
  import { fade } from 'svelte/transition'
  import { formatNumber } from '../lib/format.js'

  export let gloire = 0
  export let colonnes = []
  export let edges = []
  export let noeuds = []
  export let largeur = 0
  export let hauteur = 0
  export let rayon = 18
  export let selected = null
  export let selectedReach = 0
  // Le parent garde la main sur le canevas : c'est lui qui recentre la vue à
  // l'ouverture.
  export let canvasEl = null
  export let onEcho = () => {}
  export let onSelect = () => {}
  export let onKeydown = () => {}
  export let onBuy = () => {}
  export let onClose = () => {}
</script>

<div class="modal-backdrop" transition:fade={{ duration: 200 }}>
  <div class="modal tree-modal">
    <div class="modal-title display">🏰 Arbre de Gloire</div>
    <div class="scope-note">
      Payé en <strong>Gloire</strong> · effets globaux · <strong>conservé à jamais</strong>
    </div>
    <div class="forge-gloire">🏆 {formatNumber(gloire)} à dépenser</div>

    <!-- Progression par branche + accès aux Échos une fois la branche complète -->
    <div class="branch-legend">
      {#each colonnes as col (col.id)}
        <div class="branch-chip" style:--branch-color={col.color}>
          <span class="branch-chip-icon">{col.sprite}</span>
          <span class="branch-chip-name">{col.name}</span>
          <span class="branch-chip-depth">{col.depth}/{col.total}</span>
          {#if col.complete}
            <button
              class="branch-echo"
              disabled={!col.echoAffordable}
              on:click={() => onEcho(col.id)}
            >∞ {col.echoLevel} · 🏆 {formatNumber(col.echoCost)}</button>
          {/if}
        </div>
      {/each}
    </div>

    <!-- L'arbre lui-même. Le conteneur scrolle (jamais la page). -->
    <div class="tree-canvas" bind:this={canvasEl}>
      <svg viewBox="0 0 {largeur} {hauteur}" width={largeur} height={hauteur} role="group" aria-label="Arbre de Gloire">
        {#each edges as e (e.from + '>' + e.to)}
          <line
            class="tree-edge"
            class:owned={e.owned}
            class:open={e.open}
            style:--edge-color={e.color}
            x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
          />
        {/each}

        {#each noeuds as n (n.id)}
          <g
            class="tree-node-g"
            class:owned={n.owned}
            class:open={n.unlockable}
            class:affordable={n.affordable}
            class:locked={n.locked}
            class:selected={n.selected}
            class:keystone={n.keystone}
            style:--node-color={n.color}
            transform="translate({n.cx},{n.cy})"
            role="button"
            tabindex="0"
            aria-label={n.name}
            on:click={() => onSelect(n.id)}
            on:keydown={(ev) => onKeydown(ev, n.id)}
          >
            <circle class="tree-node-halo" r={rayon + 6} />
            <circle class="tree-node-circle" r={rayon} />
            <text class="tree-node-glyph" text-anchor="middle" dominant-baseline="central">
              {#if n.owned}✓{:else if n.keystone}★{:else}{n.cost}{/if}
            </text>
          </g>
        {/each}
      </svg>
    </div>

    <!-- Détail : on sélectionne un nœud, on l'achète ensuite. Deux temps,
         pour ne pas lâcher 750 Gloire sur une fausse manœuvre. -->
    <div class="tree-detail">
      {#if selected}
        <div class="tree-detail-head" style:--node-color={selected.color}>
          <span class="tree-detail-name">{selected.name}</span>
          {#if selected.limbName}<span class="tree-detail-limb">{selected.limbName}</span>{/if}
        </div>
        <div class="tree-detail-desc">{selected.desc}</div>
        {#if selected.owned}
          <div class="tree-detail-state acquired">✓ Acquis</div>
        {:else if selected.unlockable}
          <button class="modal-btn primary" disabled={!selected.affordable} on:click={() => onBuy(selected.id)}>
            Acquérir · 🏆 {formatNumber(selected.cost)}
          </button>
        {:else}
          <div class="tree-detail-state">
            🔒 Verrouillé · 🏆 {formatNumber(selectedReach)} pour l'atteindre
          </div>
        {/if}
      {:else}
        <div class="tree-detail-hint">Touche un nœud pour voir ce qu'il apporte.</div>
      {/if}
    </div>

    <div class="modal-actions">
      <button class="modal-btn ghost" on:click={() => onClose()}>Fermer</button>
    </div>
  </div>
</div>

<style>
  .tree-modal { max-width: 1000px; }

  /* Légende : une pastille par branche, avec sa progression et son Écho. */
  .branch-legend { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 12px; }
  .branch-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    font-size: 0.78rem;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--branch-color);
    border-radius: 999px;
  }
  .branch-chip-icon { font-size: 1rem; }
  .branch-chip-name { font-family: 'Cinzel', serif; color: var(--branch-color); }
  .branch-chip-depth { color: var(--parchment-dim); }
  .branch-echo {
    padding: 2px 8px;
    font-family: 'Cinzel', serif;
    font-size: 0.72rem;
    color: var(--bg-deep);
    background: var(--gold);
    border: none;
    border-radius: 999px;
    cursor: pointer;
  }
  .branch-echo:disabled { opacity: 0.45; cursor: not-allowed; }

  /* Canevas : c'est LUI qui scrolle, jamais la page. */
  .tree-canvas {
    /* L'arbre est radial : sa forme d'ensemble EST l'information. On le fait donc
       tenir dans son cadre plutôt que de le faire défiler — voir un quart de
       mandala ne dit rien. */
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: auto;
    max-height: 58vh;
    padding: 4px;
    background: radial-gradient(ellipse at 50% 100%, rgba(212, 175, 55, 0.07), transparent 70%);
    border: 1px solid var(--leather);
    border-radius: 3px;
  }
  .tree-canvas svg { display: block; width: auto; height: auto; max-width: 100%; max-height: 58vh; }

  /* Arêtes : éteintes par défaut, colorées dès que le chemin est parcouru. */
  .tree-edge {
    stroke: rgba(90, 57, 32, 0.75);
    stroke-width: 2.5;
    stroke-linecap: round;
  }
  .tree-edge.owned {
    stroke: var(--edge-color);
    stroke-width: 3.5;
    filter: drop-shadow(0 0 4px var(--edge-color));
  }
  /* Arête vers un nœud accessible : pointillé, elle montre où aller. */
  .tree-edge.open {
    stroke: var(--edge-color);
    stroke-opacity: 0.55;
    stroke-dasharray: 5 5;
  }

  .tree-node-g { cursor: pointer; }
  .tree-node-g:focus { outline: none; }
  .tree-node-halo { fill: none; stroke: none; }
  .tree-node-circle {
    fill: #17110c;
    stroke: rgba(90, 57, 32, 0.9);
    stroke-width: 2;
    transition: stroke 0.15s, fill 0.15s;
  }
  .tree-node-glyph {
    font-family: 'Cinzel', serif;
    font-size: 0.72rem;
    fill: var(--parchment-dim);
    pointer-events: none;
  }

  /* Verrouillé : visible mais éteint — on doit pouvoir se projeter dans la suite. */
  .tree-node-g.locked .tree-node-circle { stroke: rgba(90, 57, 32, 0.55); }
  .tree-node-g.locked .tree-node-glyph { fill: rgba(184, 164, 122, 0.45); }

  /* Accessible : bordure de la branche. Finançable : halo pulsant. */
  .tree-node-g.open .tree-node-circle { stroke: var(--node-color); }
  .tree-node-g.open .tree-node-glyph { fill: var(--parchment); }
  .tree-node-g.affordable .tree-node-halo {
    stroke: var(--node-color);
    stroke-width: 2;
    stroke-opacity: 0.5;
    animation: nodePulse 1.8s ease-in-out infinite;
  }
  @keyframes nodePulse {
    0%, 100% { stroke-opacity: 0.15; }
    50% { stroke-opacity: 0.7; }
  }

  /* Acquis : rempli de la couleur de sa branche. */
  .tree-node-g.owned .tree-node-circle {
    fill: var(--node-color);
    stroke: var(--node-color);
    filter: drop-shadow(0 0 7px var(--node-color));
  }
  .tree-node-g.owned .tree-node-glyph { fill: #17110c; font-weight: 700; }

  /* Keystone (racine, clés de voûte, apex, couronne) : plus gros trait. */
  .tree-node-g.keystone .tree-node-circle { stroke-width: 3.5; }
  .tree-node-g.keystone .tree-node-glyph { font-size: 0.9rem; }

  .tree-node-g.selected .tree-node-halo {
    stroke: var(--parchment);
    stroke-width: 2;
    stroke-opacity: 0.9;
    animation: none;
  }

  /* Détail du nœud sélectionné. */
  .tree-detail {
    min-height: 92px;
    margin-top: 12px;
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid var(--leather);
    border-radius: 3px;
  }
  .tree-detail-head { display: flex; align-items: baseline; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .tree-detail-name { font-family: 'Cinzel', serif; font-size: 1rem; color: var(--node-color); }
  .tree-detail-limb { font-size: 0.75rem; color: var(--parchment-dim); font-style: italic; }
  .tree-detail-desc { margin: 4px 0 10px; font-size: 0.9rem; color: var(--parchment); }
  .tree-detail-state { font-size: 0.85rem; color: var(--parchment-dim); }
  .tree-detail-state.acquired { color: var(--gold); font-family: 'Cinzel', serif; }
  .tree-detail-hint { font-size: 0.85rem; color: var(--parchment-dim); font-style: italic; padding: 22px 0; }

  /* Arbitrage inverse du bureau. Mis à l'échelle pour tenir dans un écran
     étroit, les nœuds tombent à 12-22 px : intappables, et on n'achète pas un
     nœud qu'on ne peut pas viser. Sous 900 px — le seuil où la mise en page
     bascule déjà — la tapabilité passe donc avant la vue d'ensemble : taille
     réelle, on parcourt au doigt. Le centrage par marge auto doit sauter,
     sinon il pousse le début du contenu hors de la zone défilable. */
  @media (max-width: 900px) {
    .tree-canvas {
      display: block;
      max-width: 100%;
      max-height: 46vh;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
    }
    .tree-canvas svg { max-width: none; max-height: none; margin: 0; }
    .branch-chip { font-size: 0.7rem; padding: 4px 8px; }
    .branch-chip-name { display: none; }
  }
</style>
