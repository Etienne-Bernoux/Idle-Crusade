---
title: "feat: US 10 — Cri de Guerre (actif) + équilibrage early game"
type: feat
status: completed
date: 2026-06-16
---

# US 10 — Cri de Guerre + équilibrage early game

Deux volets liés :
1. **Cri de Guerre** : rendre vrai le 1er bouton d'actif (factice jusqu'ici). ×2 dégâts pendant 10 s, **cooldown court ~25 s** (décision : fun pour un enfant qui re-clique souvent), cooldown visuel.
2. **Équilibrage early game** : le démarrage traîne. Cause : la **zone 1 a été gonflée ~10× la SPEC** (mobs 350-700 / boss 5000 vs SPEC 50/500) et le **Paysan (+1 dps) est négligeable** face à `baseDps 35`. On rend le début snappy et les paysans utiles, en gardant un saut zone 1→2 cohérent.

## Décisions (tranchées)
- Cri de Guerre : ×2 / 10 s, **CD 25 s** (depuis le cast). Pas d'effet relique −cooldown encore (hors scope).
- Équilibrage ciblé sur le **démarrage** (priorité choisie). Potion de Soin reste factice (pas de PV d'armée).

## Critères d'acceptation

### Cri de Guerre
- [ ] **CA1** Clic sur Cri de Guerre (si prêt) → ×2 dégâts pendant 10 s, puis indisponible jusqu'à 25 s après le cast.
- [ ] **CA2** Pendant l'effet : `dps` affiché et dégâts réels **doublés** (chiffres plus gros). Visuel "actif" sur le bouton.
- [ ] **CA3** **Cooldown visuel** sur le bouton (balayage ~25 s) + bouton non-cliquable tant que pas prêt.
- [ ] **CA4** Ré-entrance gardée (invocationId) ; timers via `later()` (cleanup HMR). Effet **live** (le multiplicateur ne s'applique pas au catch-up — c'est un actif temps réel).
- [ ] **CA5** Le ×2 se compose proprement avec le multiplicateur reliques (`dps = base * relicDmgMult * warCryMult`).

### Équilibrage early game
- [ ] **CA6** Clear zone 1 (départ, 0 troupe) en **~1 min** (pas ~3,5 min) ; recruter des paysans **accélère visiblement** (chaque paysan = boost relatif notable).
- [ ] **CA7** Saut zone 1→2 **lissé** : zone 2 ≈ ×6-8 sur PV/or vs la nouvelle zone 1 (pas le mur actuel).
- [ ] **CA8** Le Soldat reste un upgrade net sur le Paysan ; coûts cohérents avec les gains d'or.
- [ ] **CA9** Pas de soft-lock (toujours pouvoir progresser) ; pas de régression (save, reliques, fonte, transition).

## Décisions techniques

### Cri de Guerre (`src/App.svelte`)
```js
let warCryActive = false   // fenêtre ×2 (10 s)
let warCryReady = true     // cliquable
let warCryId = 0
function castWarCry() {
  if (!warCryReady) return
  warCryReady = false
  warCryActive = true
  const my = ++warCryId
  later(() => { if (my === warCryId) warCryActive = false }, 10000)
  later(() => { if (my === warCryId) warCryReady = true }, 25000)
}
$: warCryMult = warCryActive ? 2 : 1
$: dps = (baseDps + Σ troupes) * relicDmgMult * warCryMult
```
- **Markup** : le 1er `.active-btn` → `on:click={castWarCry}`, `class:active={warCryActive}`, `class:cooling={!warCryReady}`, `disabled={!warCryReady}`. La `.cooldown-overlay` s'anime (balayage 25 s) via `class:cooling`.
- **CSS** : `.active-btn.cooling .cooldown-overlay { animation: cooldownSweep 25s linear forwards }` (ex. `transform: scaleY(1)→0` depuis le haut, `transform-origin: top`). `.active-btn.active { glow doré }`. Bouton `disabled` → `pointer-events:none; opacity baissée` sur l'overlay seulement.
- **Pas de nouveau pop kind**. Le ×2 rend les chiffres de dégâts plus gros naturellement.

### Équilibrage (catalogues `zones` + `TROOPS`)
Rééchelonnage cohérent (chiffres cibles, à affiner en jouant) :
- `baseDps` 35 → **10** (l'armée se construit en recrutant ; les paysans comptent).
- Paysan : dps 1 → **2**, baseCost 10 → **10** (chaque paysan ≈ +20% au début).
- **Zone 1 (Forêt)** : mobs 350-700 → **~50-110**, boss 5000 → **~700**, or mobs ~3-12 → **~5-15**, or boss 200 → **~120**.
- **Zone 2 (Ruines)** : ≈ ×6-8 sur zone 1 → mobs **~400-750**, boss **~5000**, or **~30-60 / 700**.
- Soldat : dps 12 → **15-20** (net upgrade), baseCost 100 (revu si besoin). Unlock inchangé (zone 2).
- Fonte (`MELT_GOLD`) / effets reliques : revérifier qu'ils restent proportionnés au nouvel or.

> Tout ça vit dans les **catalogues** (données) — aucun changement de logique. Les multiplicateurs (reliques, Cri de Guerre) sont pris en compte : viser un démarrage snappy **sans** actif/relique.

## Étapes (test au fur et à mesure)
1. **CP1 — Cri de Guerre** : state + `castWarCry` + `warCryMult` dans la chaîne dps ; markup bouton + cooldown ; CSS. Vérif navigateur : clic → dps ×2 → effet 10 s → cooldown 25 s → re-prêt ; bouton non-cliquable pendant CD ; **desktop + mobile**.
2. **CP2 — Équilibrage** : ajuster les constantes des catalogues. **Play-test** : chronométrer clear zone 1 départ (~1 min cible), vérifier que recruter accélère, vérifier le saut zone 1→2, pas de soft-lock. Itérer les chiffres avec Etienne (ressenti). Booster constante pour atteindre les paliers vite si besoin (revert).
3. Commit (branche `claude/us-10-war-cry-balance`), review, compound.

## Hors scope
- Potion de Soin (pas de PV d'armée), effet relique −cooldown, sons.
- Équilibrage fin de la courbe long terme / prestige (pas de prestige).

## Gotchas
- **Cri de Guerre = temps réel** : `warCryMult` s'applique au `dps` dérivé (live). En catch-up, `warCryActive` est false (pas de ×2 rétroactif) — voulu.
- **CD depuis le cast** (pas après l'effet) : `warCryReady` repasse true à 25 s, l'effet s'arrête à 10 s.
- **invocationId** : un 2e cast impossible avant 25 s (garde `warCryReady`), mais garder l'id par cohérence si on raccourcit le CD un jour.
- **Équilibrage = données** : ne pas éparpiller de `if` ; tout dans les catalogues. Rejouer les **deux** chemins (live + catch-up) après réglage.
- **Multiplicateurs composés** : viser la courbe **sans** Cri/relique, sinon on sur-nerf (le ×2 ponctuel et les reliques sont des bonus).

## Sources
- SPEC : [SPEC.md](../../SPEC.md) (Actifs, Zones — échelle d'origine)
- Patterns : [docs/solutions/patterns/idle-game-tick-and-popups.md](../solutions/patterns/idle-game-tick-and-popups.md) (overlays + invocationId)
- Code : [src/App.svelte](../../src/App.svelte) (chaîne `dps`, actives markup), [src/app.css](../../src/app.css) (`.active-btn`, `.cooldown-overlay`)
