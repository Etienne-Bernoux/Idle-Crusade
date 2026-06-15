---
date: 2026-06-15
topic: reliques-loot-boss
---

# Reliques (loot boss) + sauvegarde

## Problem Frame

Aujourd'hui, tuer un boss ne donne que de l'or. Il manque le hook de progression
long terme : **un boss tombe → un objet brillant tombe → je suis durablement plus fort**.
Audience = enfant de 5 ans : la satisfaction passe par le visuel (drop qui poppe, couleur
de rareté, stat qui monte) et par la collection. Mais une collection n'a de sens que si
elle **survit au reload** — d'où l'intégration de la sauvegarde dans cette même US.

## Requirements

- **R1.** Drop garanti d'une **relique** à chaque mort d'un boss de zone (en plus de l'or).
- **R2.** La relique est tirée d'un **pool pondéré par rareté** : commun / rare / légendaire.
  La rareté est **visible** (couleur) et module la force de l'effet.
- **R3.** Chaque relique appartient à un **slot** (Arme / Armure / Bannière / Amulette) et
  porte **un effet passif** parmi ceux qui existent : **+% dégâts globaux** ou **+% drop d'or**.
- **R4.** Un **inventaire** de reliques consultable (panneau dédié), affichant rareté, slot et effet.
- **R5.** **4 slots équipables** (Arme/Armure/Bannière/Amulette). **Clic** sur une relique de
  l'inventaire l'**équipe** dans son slot ; l'ancienne relique du slot retourne en inventaire.
- **R6.** Les effets des reliques **équipées** s'appliquent aux stats (dps, gains d'or) et l'effet
  est **visible immédiatement** (le dps affiché monte quand on équipe une relique de dégâts).
- **R7.** **Feedback visuel fort au drop** : pop / brillance teinté par la couleur de rareté
  (le moment "waouh" pour le petit), distinct du pop d'or existant.
- **R8.** **Sauvegarde localStorage** : autosave périodique + load au démarrage, **reload-safe**,
  **versionnée** (`saveVersion`). Persiste l'état de jeu pertinent : or, troupes (counts), zone
  courante / zonesUnlocked, **reliques en inventaire + reliques équipées**.

## Success Criteria

- Tuer un boss fait tomber une relique avec un feedback visuel clair (couleur de rareté).
- Équiper une relique fait **monter une stat visible** (ex. dps).
- **Recharger la page conserve** la progression ET les reliques (inventaire + équipées).
- Le fils comprend en <1 min : "j'ai gagné un objet, je clique, je suis plus fort".

## Scope Boundaries

- **Pas d'effet −% cooldown** : les actifs (Cri/Potion) n'existent pas encore → effets limités
  à +% dégâts et +% drop d'or pour cette US.
- **Pas de mécanique de prestige** (US V3) : mais le format de save doit être pensé pour
  accueillir plus tard la conservation des reliques au prestige.
- **Pas de drag & drop** (clic pour équiper uniquement).
- **Pas de vente / destruction / fusion** de reliques.
- **Pas de tooltip riche** obligatoire (nice-to-have si peu coûteux).
- **Pas de zones 3-5 ni tier Chevalier** (autre US).
- Taille exacte du pool, table de pondération et barème d'effets par rareté = **équilibrage**
  (tranché en plan / ajusté en jouant), pas un blocage produit.

## Key Decisions

- **4 slots équipables (SPEC complète)** plutôt que cumulatif simple : choix d'Etienne, on assume
  la richesse et un peu de gestion, fidèle à la vision.
- **Clic pour équiper** : agency sans la fragilité du drag tactile — adapté à 5 ans.
- **Sauvegarde intégrée à cette US** : sans persistance, une collection de reliques perd son sens
  (le petit perdrait ses trésors à chaque reload).
- **Une seule US (save + reliques)** : choix d'Etienne malgré le risque de big-bang. Mitigation :
  le plan **découpe en checkpoints vérifiables** (save d'abord vert, puis drop, puis équip, puis
  effets) même si tout part dans une seule PR.
- **Effets bornés à dégâts/or** : conséquence directe de l'absence d'actifs.

## Dependencies / Assumptions

- Catalogue `zones` (avec `boss` par zone) déjà en place (US 5) → point d'accroche du drop.
- Clé de save `croisade.save` en JSON sérialisé (cf. SPEC.md).
- Réactivité Svelte 4 : reliques équipées et `counts` réassignés (pas de mutation en place).

## Outstanding Questions

### Resolve Before Planning
- _(aucune — les décisions produit structurantes sont tranchées)_

### Deferred to Planning
- [Affects R8][Technical] Structure exacte du modèle de save sérialisé + stratégie de
  versionning/migration (`saveVersion`, fallback si corrompu).
- [Affects R3,R5][Technical] Où vit l'état reliques : catalogue `RELIQUES` + état `inventory` /
  `equipped` (par slot), et comment le `dps` / les gains d'or intègrent les multiplicateurs.
- [Affects R2,R3][Needs research] Pool initial (nombre de reliques), table de pondération des
  raretés, barème d'effets par rareté — contenu à équilibrer.
- [Affects R7][Technical] Forme du feedback de drop (réutiliser le système `pops` / overlays
  existant vs nouveau composant) — décision d'implémentation.

## Next Steps
→ `/ce:plan` for structured implementation planning
