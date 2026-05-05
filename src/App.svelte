<div class="game">
  <header>
    <div class="title">⚔ IDLE CRUSADE</div>
    <div class="resources">
      <div class="resource gold">
        <span class="icon">🪙</span>
        <span class="display">Or</span>
        <span class="value">1 247</span>
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

    <div class="unit">
      <div class="unit-icon">🧑‍🌾</div>
      <div class="unit-info">
        <div class="unit-name">Paysan</div>
        <div class="unit-stats">+1 dps · ×1.15</div>
        <div class="unit-cost">🪙 47</div>
      </div>
      <div class="unit-count">23</div>
    </div>

    <div class="unit">
      <div class="unit-icon">🛡️</div>
      <div class="unit-info">
        <div class="unit-name">Soldat</div>
        <div class="unit-stats">+12 dps · ×1.15</div>
        <div class="unit-cost">🪙 320</div>
      </div>
      <div class="unit-count">5</div>
    </div>

    <div class="unit locked">
      <div class="unit-icon">🐎</div>
      <div class="unit-info">
        <div class="unit-name">Chevalier</div>
        <div class="unit-stats">Bat le boss zone 1</div>
        <div class="unit-cost">🔒 verrouillé</div>
      </div>
      <div class="unit-count">—</div>
    </div>

    <div class="unit locked">
      <div class="unit-icon">👑</div>
      <div class="unit-info">
        <div class="unit-name">Champion</div>
        <div class="unit-stats">Endgame</div>
        <div class="unit-cost">🔒 verrouillé</div>
      </div>
      <div class="unit-count">—</div>
    </div>
  </aside>

  <!-- CENTER — COMBAT -->
  <section class="combat">
    <div class="zone-header">
      <div class="zone-name display">Forêt Sombre</div>
      <div class="zone-progress">
        Vague 7 / 10 · Boss à
        <span class="display" style="color: var(--blood-bright)">3 vagues</span>
      </div>
    </div>

    <div class="enemy">
      <div class="enemy-sprite">👹</div>
      <div class="enemy-name display">Gobelin Maraudeur</div>
      <div class="hp-container">
        <div class="hp-label">
          <span>PV</span>
          <span><span>365</span> / 500</span>
        </div>
        <div class="hp-bar">
          <div class="hp-fill"></div>
        </div>
      </div>
      <div class="dps-readout">
        Ton armée frappe à <span class="dps-value">35 dps</span>
      </div>
    </div>
  </section>

  <!-- RIGHT — FORGE -->
  <aside class="panel forge">
    <div class="panel-title">⚒ Forge</div>

    <div class="upgrade">
      <div class="upgrade-name">
        <span>Lame Aiguisée</span>
        <span class="upgrade-level">Niv. 4</span>
      </div>
      <div class="upgrade-effect">+25% dégâts globaux</div>
      <div class="upgrade-cost">🪙 850</div>
    </div>

    <div class="upgrade">
      <div class="upgrade-name">
        <span>Bourse de Cuir</span>
        <span class="upgrade-level">Niv. 2</span>
      </div>
      <div class="upgrade-effect">+15% drop d'or</div>
      <div class="upgrade-cost">🪙 1 200</div>
    </div>

    <div class="upgrade">
      <div class="upgrade-name">
        <span>Cor de Guerre</span>
        <span class="upgrade-level">Niv. 1</span>
      </div>
      <div class="upgrade-effect">−5s cooldown des actifs</div>
      <div class="upgrade-cost">🪙 2 400</div>
    </div>

    <div class="upgrade">
      <div class="upgrade-name">
        <span>Étendard Royal</span>
        <span class="upgrade-level">Niv. 0</span>
      </div>
      <div class="upgrade-effect">+10% vitesse d'attaque</div>
      <div class="upgrade-cost">🪙 5 000</div>
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
