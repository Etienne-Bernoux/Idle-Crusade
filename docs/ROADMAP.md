# Roadmap

Side-project sans deadline. On ship une version quand sa Definition of Done est verte.

## Vision long terme

Un idle game médiéval qu'on peut lancer dans un onglet, oublier, revenir voir, et qui donne envie de prestige.

## Vue d'ensemble

| Version | Nom            | Objectif                                                   | DoD résumée                                            | État        |
|---------|----------------|------------------------------------------------------------|--------------------------------------------------------|-------------|
| V0      | Mockup         | Valider le feel visuel + cadrer la spec                    | Spec écrite + mockup statique en ligne                 | ✅ fait      |
| V1      | MVP jouable    | Une boucle complète et savable                             | 1 troupe, 1 zone, 1 boss, save, déployé                | ✅ fait      |
| V2      | Profondeur     | Étoffer le contenu et les mécaniques                       | 4 troupes, 5 zones, 4 actifs, reliques                 | 🟡 presque  |
| V3      | Prestige       | Ajouter le hook long terme                                 | Croisade, Gloire, Arbre de Gloire                      | ✅ fait      |
| V3+     | Profondeur bis | Donner de la matière à la boucle de prestige               | Arbre en graphe, zones sans fin, biomes, combat, rôles | ✅ fait      |
| V4      | Polish         | Lisser, sentir bon                                         | Anims, sons, settings, équilibrage stable              | 🟡 en cours  |
| V5      | Décision       | Donner au joueur des choix qui comptent                    | Légende, boss télégraphiés, composition lisible        | 🟡 en cours  |

## V1 — MVP jouable

**Objectif** : prouver la boucle. Un joueur peut se loguer, recruter, voir son armée taper, débloquer le boss, le battre.

**Livrables**
- Setup Vite + Svelte — *livré en **JS pur**, TypeScript écarté (YAGNI)*
- 1 type de troupe : Paysan
- 1 zone : Forêt Sombre (10 vagues + boss)
- Tick de combat fonctionnel — *livré à **1 tick / 800 ms**, pas 10 Hz : un idle n'a pas besoin de 10 Hz, et le catch-up tick couvre les onglets throttlés*
- Affichage : armée + ennemi + HP + ressources
- Save / autosave en `localStorage`
- Déploiement GitHub Pages via GitHub Action

**Definition of Done**
- [x] Le jeu tourne en local sur `npm run dev`
- [x] On peut clear la zone 1 et battre le boss en moins de 10 min
- [x] Le save survit à un reload de page
- [x] Le jeu est en ligne — `etienne-bernoux.github.io/Idle-Crusade/` (le projet a été renommé Croisade → Idle Crusade)

**Risques**
- Boucle pas assez engageante avec une seule troupe → on accepte (c'est le but du V2)
- Performance du tick à 10 Hz sur de vieux navigateurs → bench tôt

## V2 — Profondeur

**Objectif** : on sent le jeu. Plusieurs choix, plusieurs zones, du loot.

**Livrables**
- [x] 4 tiers de troupes (Paysan, Soldat, Chevalier, Champion désactivé jusqu'en V3)
- [x] 5 zones avec progression linéaire
- [x] 5 boss — *sprites emoji, seule la zone 1 a des sprites pixel art dédiés*
- [x] Système de Reliques (drop boss + inventaire + 4 slots équipables) + borne d'inventaire avec fonte auto
- [x] Actifs : **4 livrés** (US 23), au-delà des 2 cadrés. La Potion de Soin a été **retirée** — elle supposait des PV d'armée qui n'existent pas — et remplacée par Potion de Rage, Percée et Ferveur
- [x] UI revue — panneaux Caserne / Reliques (la **Forge** arrive avec V3, elle dépense la Gloire)
- [ ] Bouton Export / Import save — non fait
- [x] *hors cadrage initial* : layout responsive mobile, juice visuel (pulse boss, flash légendaire, shake)

**Definition of Done**
- [x] On peut atteindre la zone 5 et battre son boss
- [x] Pool de reliques : **8 définitions × 3 raretés** (commun / rare / légendaire) = 24 instances distinctes — l'esprit de la DoD est tenu, le compte de *noms* est de 8
- [x] Les actifs sont fonctionnels avec cooldowns visuels — **4/4** (US 23)

## V3 — Prestige ✅ livrée

**Objectif** : ajouter le hook qui fait revenir.

> Livrée par les US 13 et 15. Formules de gain de Gloire et courbe mesurée :
> [DESIGN.md](DESIGN.md) § Prestige. Le découpage V3-01 → V3-07 du
> [BACKLOG.md](BACKLOG.md) n'a pas été suivi ticket par ticket — l'historique git fait foi.

**Livrables**
- [x] Mécanique de Croisade (reset + gain de Gloire) — US 13
- [x] Tier Champion débloquable en Gloire — US 13
- [x] Meta-upgrades dépensables en Gloire — livrés en **Arbre de Gloire** (US 16), pas en liste
      plate de 6-8 lignes, puis en **vrai graphe à embranchements** (US 19)
- [x] Écran de prestige avec gain estimé avant validation — US 13
- [x] Équilibrage de la courbe — US 15

**Definition of Done**
- [x] Première Croisade jouable
- [x] Boucle prestige cohérente : chaque cycle est plus rapide
- [x] Pas de soft-lock connu sur les premiers cycles

> ⚠️ **Régression corrigée le 28/07 (PR #33)** : l'écran de Croisade avait été supprimé du template
> par le merge d'US 23, rendant le prestige injouable pendant les US 24 à 26. Aucun test ne pouvait
> l'attraper — la logique pure était intacte, c'est le câblage qui manquait. C'est ce qui a motivé
> la vérification navigateur systématique de la boucle, et pas seulement de la logique.

## V3+ — Profondeur bis ✅ livrée

**Objectif** : donner de la matière à la boucle de prestige, une fois qu'elle tourne. Ces US ne
figuraient dans aucun cadrage : elles sont nées du constat qu'un prestige sans quoi dépenser ni où
repartir est un bouton, pas une boucle.

| US | Apport | Module |
|----|--------|--------|
| 14 | Achat groupé ×1 / ×10 / max | `economy.js` |
| 16 | Arbre de Gloire à 4 branches, remplace la Forge plate | `tree.js` |
| 17 | Paliers de troupe + améliorations payées en or | `upgrades.js` |
| 18 | **Zones sans fin** par cycles de profondeur + Échos (puits de Gloire infini) | `content.js` |
| 19 | Arbre reconstruit en vrai graphe (embranchements et fusions) | `tree.js` |
| 20 | **Biomes** au choix : difficulté contre récompense | `biomes.js` |
| 21 | Chaque biome a son bestiaire et sa règle signature | `biomes.js`, `content.js` |
| 22 | **Combat vivant** : types d'ennemis, affinités, armure, critiques | `combat.js` |
| 23 | 4 actifs distincts, retrait de la Potion de Soin | `actives.js` |
| 24 | **Rôles de troupes** : chaque tier apporte une capacité, pas juste du dps | `roles.js` |
| 25 | Critiques dans l'Arbre + séparation nette in-run / permanent | `tree.js`, `upgrades.js` |
| 26 | Forge et fusion de reliques | `reliques.js` |

**Ce que ça a changé structurellement** : la progression a désormais **deux niveaux distincts** —
l'Arbre (payé en Gloire, global, survit au prestige) et les améliorations de troupes (payées en or,
propres à un tier, perdues au prestige). Un test verrouille l'invariant : aucune ligne payée en or
n'a d'effet transverse. Détail dans [DESIGN.md](DESIGN.md) § US 25.

## V4 — Polish 🟡 en cours

**Objectif** : ça brille.

**Livrables**
- [ ] Animations affinées (swing par classe, particules sur boss) — *juice partiel livré :
      télégraphe pulsant, faille, flash de critique, composition qui monte*
- [x] **Sons et SFX** — synthétisés au Web Audio, zéro asset (US 39)
- [x] Achievements — **207 livrés** (US 29), très au-delà des 15-20 cadrés, avec raretés et
      multiplicateurs légers
- [ ] Équilibrage stable après tests — simulateur recalibré (US 27), mais Légende, succès et
      boss télégraphiés n'ont pas eu de passe complète
- [x] Écran de réglages — export / import de save (US 33), interrupteur son et volume (US 39)

**Definition of Done**
- [ ] Au moins une session de tests joueurs externe
- [ ] Plus aucun bug bloquant
- [x] Sons toggleables, settings persistées dans le save

## V5 — Décision ✅ livrée

**Objectif** : le jeu avait beaucoup de systèmes et presque aucun ne demandait une décision.
Constat mesuré, pas ressenti : la politique optimale des actifs était « lancer dès que prêt », la
composition valait ×2,06 sans que rien ne le dise, et l'Arbre classait ses branches au lieu
d'offrir un choix.

> Pistes et rejets argumentés : [ideation/2026-07-29-prochains-gros-morceaux.md](ideation/2026-07-29-prochains-gros-morceaux.md)

**Livrables**
- [x] **Légende** — 2ᵉ couche de prestige, casse le mur de progression (US 28)
- [x] **Arbre refondu** en spécialisations divergentes, sans reconvergence (US 28)
- [x] **Boss télégraphiés** — les actifs ont enfin une décision (US 30)
- [x] **Lecture de composition** — le ×2,06 devient visible (US 31)
- [x] **Pierres de Vœu** — une règle changée contre un renoncement (US 34)
- [x] **La Route** — un carrefour à chaque entrée de zone, trois voies sur cinq (US 41)
- [x] **Conseil du retour** — l'absence produit des décisions, pas du butin (US 37)
- [x] **La Frappe** — sans armée, on frappe à la main, et ça s'améliore (US 38)
- [x] **La Patine** — une relique portée mûrit ; la jeter coûte sa maturation (US 40)

**Definition of Done**
- [ ] Aucun système du jeu dont la politique optimale soit un automatisme
- [ ] Deux runs consécutifs se jouent différemment

## Idées V5+ (parking)

À reconsidérer après V4 stable. Pas d'engagement.

- Nouvelle couche de prestige (Légende ?)
- ~~Skill tree alternatif aux meta-upgrades~~ — remonté et livré : l'Arbre de Gloire **est** le
  système de meta-upgrades depuis l'US 16, en vrai graphe depuis l'US 19
- Events temporels (Halloween, Yule)
- Boss optionnels avec drop unique
- ~~Mobile-friendly (responsive)~~ — remonté et livré en V2 (US 8)
- Achievements liés à Steam si portage Tauri/Electron
- Mode New Game+ avec règles modifiées
- Compagnons / familiers passifs
- Localisation EN

## Hypothèses critiques

- ~~Le jeu marche avec une boucle simple sans nécessiter de tactique~~ — **révisée en cours de
  route** : les US 22 et 24 ont introduit affinités, armure et rôles, donc la composition de
  l'armée compte désormais. La mesure d'US 24 le chiffre : ×2,06 pour une composition pensée
  contre ×1,30 pour un empilement d'un seul tier. Ce n'est plus « sans tactique », c'est « la
  tactique est facultative mais récompensée »
- localStorage est suffisant (pas besoin de sync cross-device en V1-V4)
- ~~Le tick à 10 Hz tient sur du mobile bas de gamme~~ — sans objet : le tick est à 800 ms, et le catch-up tick absorbe le throttling des onglets en arrière-plan
- GitHub Pages tient la charge (anonyme, peu de risque)

## Indicateurs de succès (subjectifs)

- Tu y joues toi-même volontiers, sans forcer.
- Un pote externe lance le jeu, comprend la boucle en moins de 2 min, joue 15 min.
- Le code reste lisible jusqu'en V4 (refactor possible mais pas requis).

## Dette et hygiène

- [x] **Éclatement de l'UI terminé** (US 42) — les neuf écrans vivent dans `src/components/`,
      `App.svelte` retombe à 1 871 lignes. Frontière CSS documentée dans `CLAUDE.md`.
- [x] **Sondes navigateur versionnées** dans `scripts/verif/` — 113 contrôles sur cinq suites
      (`jeu`, `mobile`, `son`, `patine`, `route`). Elles avaient déjà été perdues une fois en
      vivant dans un répertoire temporaire.
- [ ] **Équilibrage de bout en bout** — le simulateur ne modélise ni les reliques, ni la Patine,
      ni les voies. Chacun est borné analytiquement et testé, mais aucune mesure de run complet
      ne les couvre ensemble.
- [ ] **Session de test joueur externe** — jamais faite.
