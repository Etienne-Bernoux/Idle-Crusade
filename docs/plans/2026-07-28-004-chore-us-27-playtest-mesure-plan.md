# US 27 — Playtest mesuré et remise à plat des docs

**Date** : 2026-07-28
**Type** : mesure + documentation (pas de nouvelle mécanique)
**Branches** : `fix/prestige-screen-restored` (PR #33), `docs/roadmap-reality-check`

## Pourquoi cette tranche

Onze US se sont empilées en deux jours au-dessus de la V3. Trois angles morts s'étaient
accumulés :

1. **Aucune partie jouée de bout en bout.** La DoD V2 « une partie blind atteint la zone 3 en
   moins de 30 min » n'avait jamais été mesurée.
2. **Le simulateur ne voit ni les reliques ni les actifs** (limite documentée depuis US 15).
   L'US 26 s'est équilibrée sur des bornes analytiques faute de mesure de run.
3. **`ROADMAP.md` et `BACKLOG.md` annonçaient V3 comme « prochaine version »** alors que V3 était
   livrée et dépassée de 11 US. La carte du projet ne décrivait plus le projet.

## Ce que la tranche a trouvé avant même de jouer

Une **régression bloquante** : le bloc `{#if showPrestigeScreen}` avait été supprimé du template
par le merge d'US 23 (`a902e9a`). Le prestige et le choix de biome étaient **injouables depuis le
27/07**, pendant tout le développement des US 24, 25 et 26.

Détectée par une revue statique de code mort — `doPrestige()` défini et jamais appelé,
`biomeChoices` et `upcomingBiome` dérivés et jamais lus. Corrigée dans la PR #33, qui est sortie
séparément parce qu'un bug bloquant en production ne doit pas attendre derrière un exercice de
mesure.

**Leçon** : les 230 tests passaient. La logique pure était intacte ; c'est le câblage template qui
manquait. Aucun test unitaire de ce projet ne peut attraper ça, et le simulateur non plus — il
appelle les modules directement, sans jamais monter l'UI.

## Étapes

### CP1 — Restaurer l'écran de Croisade ✅

- Restauration du bloc depuis `0979fc7`, avec deux corrections contre le code actuel
  (améliorations de troupes dans « Tu perds », nom de zone dérivé du biome).
- Vérification navigateur Playwright : 23/23, dont un passage mobile 375 px.

### CP2 — Playtest mesuré ✅

Run complet depuis une save vierge, en **temps réel**, piloté par une politique de joueur
compétent : achat en mode max du tier le plus haut abordable, actifs lancés dès qu'ils sont prêts,
reliques équipées dès qu'un slot est libre, Gloire dépensée dans l'Arbre après chaque Croisade.

C'est précisément ce que le simulateur ne peut pas produire : reliques et actifs sont réellement
dans la boucle. Contrepartie assumée : temps réel, une seule graine, une seule politique.

### CP3 — Remettre les docs d'accord avec le jeu ✅

- `ROADMAP.md` : V3 marquée livrée, nouvelle section **V3+** récapitulant les US 14 et 16 → 26,
  V4 devient la prochaine version.
- `BACKLOG.md` : reliquats réellement ouverts remontés en tête, V2-14 (Potion) marqué **abandonné**
  et non « en attente », V3 marquée livrée autrement que décrite.

## Hors périmètre

- `GET /favicon.ico` renvoie 404 (le projet n'en fournit pas) — cosmétique, préexistant.
- Étendre le simulateur aux reliques et aux actifs : reste une limite documentée. Ce playtest la
  contourne pour une mesure ponctuelle, il ne la lève pas.
- Rendre la vérification navigateur permanente (harnais versionné) : à décider, cf. § ci-dessous.

## Question ouverte laissée à Etienne

La régression a survécu à quatre merges parce que **rien ne vérifie que l'UI est câblée**. Trois
options, par coût croissant : un garde-fou statique maison (greper les `$:` et fonctions jamais
référencés dans le template, ~30 lignes, zéro dépendance) ; un smoke test Playwright versionné
(rompt le « zéro dépendance » du projet) ; ne rien faire et s'appuyer sur la vérification
navigateur manuelle par US. Recommandation : le garde-fou statique, qui aurait attrapé ce bug
précis pour un coût quasi nul.
