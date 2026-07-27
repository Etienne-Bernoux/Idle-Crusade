# Roadmap

Side-project sans deadline. On ship une version quand sa Definition of Done est verte.

## Vision long terme

Un idle game médiéval qu'on peut lancer dans un onglet, oublier, revenir voir, et qui donne envie de prestige.

## Vue d'ensemble

| Version | Nom            | Objectif                                                   | DoD résumée                                            | État        |
|---------|----------------|------------------------------------------------------------|--------------------------------------------------------|-------------|
| V0      | Mockup         | Valider le feel visuel + cadrer la spec                    | Spec écrite + mockup statique en ligne                 | ✅ fait      |
| V1      | MVP jouable    | Une boucle complète et savable                             | 1 troupe, 1 zone, 1 boss, save, déployé                | ✅ fait      |
| V2      | Profondeur     | Étoffer le contenu et les mécaniques                       | 4 troupes, 5 zones, 2 actifs, reliques                 | 🟡 presque  |
| V3      | Prestige       | Ajouter le hook long terme                                 | Croisade, Gloire, meta-upgrades                        | ⬜ prochaine |
| V4      | Polish         | Lisser, sentir bon                                         | Anims, sons, achievements, équilibrage stable          | ⬜ à venir   |

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
- [ ] 2 actifs : **seul le Cri de Guerre est fonctionnel**. La Potion de Soin reste un bouton inerte → elle suppose des **PV d'armée qui n'existent pas** dans le modèle actuel : décision produit à trancher (cf. « Décisions à trancher » du SPEC)
- [x] UI revue — panneaux Caserne / Reliques (la **Forge** arrive avec V3, elle dépense la Gloire)
- [ ] Bouton Export / Import save — non fait
- [x] *hors cadrage initial* : layout responsive mobile, juice visuel (pulse boss, flash légendaire, shake)

**Definition of Done**
- [x] On peut atteindre la zone 5 et battre son boss
- [x] Pool de reliques : **8 définitions × 3 raretés** (commun / rare / légendaire) = 24 instances distinctes — l'esprit de la DoD est tenu, le compte de *noms* est de 8
- [ ] Les 2 actifs sont fonctionnels avec cooldowns visuels — 1/2 (cf. Potion ci-dessus)
- [ ] Une partie blind (sans guide) atteint la zone 3 en moins de 30 min — **jamais mesuré**, à faire avec le playtest V3

## V3 — Prestige ⬅ prochaine version

**Objectif** : ajouter le hook qui fait revenir.

> Découpage en tickets : [BACKLOG.md](BACKLOG.md) (V3-01 → V3-07). Formules de gain de Gloire
> et coûts des meta-upgrades : [DESIGN.md](DESIGN.md) § Prestige.

**Livrables**
- Mécanique de Croisade (reset + gain de Gloire)
- Tier Champion débloquable en Gloire
- 6-8 meta-upgrades dépensables en Gloire
- Écran de prestige (visualisation du gain estimé avant validation)
- Équilibrage de la courbe : un premier prestige ~1 h, le second ~30 min, etc.

**Definition of Done**
- [ ] Première Croisade jouable
- [ ] Boucle prestige cohérente : chaque cycle est plus rapide
- [ ] Pas de soft-lock connu sur les premiers cycles

## V4 — Polish

**Objectif** : ça brille.

**Livrables**
- Animations affinées (swing par classe, effets de particules sur boss)
- Sons et SFX (clic, recrutement, mort de boss, prestige)
- Achievements (15-20 jalons : "Recrute 100 paysans", "Prestige 5×", etc.)
- Équilibrage stable après tests
- Page d'accueil / pause / settings (volume, reset hard)

**Definition of Done**
- [ ] Au moins une session de tests joueurs externe
- [ ] Plus aucun bug bloquant
- [ ] Sons toggleables, settings persistées dans le save

## Idées V5+ (parking)

À reconsidérer après V4 stable. Pas d'engagement.

- Nouvelle couche de prestige (Légende ?)
- Skill tree alternatif aux meta-upgrades
- Events temporels (Halloween, Yule)
- Boss optionnels avec drop unique
- ~~Mobile-friendly (responsive)~~ — remonté et livré en V2 (US 8)
- Achievements liés à Steam si portage Tauri/Electron
- Mode New Game+ avec règles modifiées
- Compagnons / familiers passifs
- Localisation EN

## Hypothèses critiques

- Le jeu marche avec une boucle simple sans nécessiter de tactique
- localStorage est suffisant (pas besoin de sync cross-device en V1-V4)
- ~~Le tick à 10 Hz tient sur du mobile bas de gamme~~ — sans objet : le tick est à 800 ms, et le catch-up tick absorbe le throttling des onglets en arrière-plan
- GitHub Pages tient la charge (anonyme, peu de risque)

## Indicateurs de succès (subjectifs)

- Tu y joues toi-même volontiers, sans forcer.
- Un pote externe lance le jeu, comprend la boucle en moins de 2 min, joue 15 min.
- Le code reste lisible jusqu'en V4 (refactor possible mais pas requis).
