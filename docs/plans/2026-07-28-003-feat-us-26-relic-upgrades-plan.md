---
title: "feat: US 26 — Reliques : bonus visibles, forge et fusion"
type: feat
status: completed
date: 2026-07-28
---

# US 26 — Les reliques deviennent lisibles et améliorables

Retour d'Etienne : « c'est dommage que les reliques équipées ne montrent pas leur bonus et qu'elles ne
puissent pas être améliorées ». Les deux étaient vrais : un slot équipé n'affichait que son icône, et
`reliqueEffect` ne connaissait aucune notion de niveau.

## 1. Les bonus sont visibles

Chaque slot affiche désormais son contenu en clair : nom, niveau forgé, rareté, et **effet exact** —
« Bannière du Loup **+2** · Rare · +26% or ». Un slot vide se voit aussi (bordure pointillée).

Sous les slots, le **total cumulé par nature d'effet** : `+36% dégâts` · `+26% or` · `+2 pts crit`.
C'est la réponse directe à « qu'est-ce que mon équipement m'apporte ? », qu'aucun écran ne donnait.

L'inventaire affiche également le niveau et gère les trois natures d'effet (les reliques de critique
d'US 22 y affichaient encore « or »).

## 2. Deux voies d'amélioration, volontairement différentes

**🔨 Forger** — de l'or contre un niveau (+15% de l'effet), jusqu'au niveau 5. Progression continue,
disponible immédiatement. Le coût suit la rareté (2 000 / 12 000 / 80 000 de base, ×3 par niveau) : une
légendaire est chère à forger, ce qui évite de tout investir sur un commun.

**⚗️ Fusionner** — trois exemplaires identiques donnent une rareté supérieure (commun → rare →
légendaire). Progression par palier, et surtout : cela donne enfin **un usage aux doublons**, qui
n'étaient jusqu'ici que fondus en or par le cap d'inventaire.

Deux garde-fous pour ne jamais punir l'investissement :
- la fusion consomme d'abord les exemplaires **les moins forgés** ;
- le résultat hérite du **meilleur niveau parmi les consommés**.

Vérifié en jeu : avec quatre lames communes dont une niveau 3, la fusion consomme les trois niveau 0 et
la niveau 3 **survit**. Avec exactement trois exemplaires dont une niveau 3, le résultat est rare
niveau 3.

Effets de bord traités : le cap d'inventaire trie sur l'effet réel (niveaux compris), donc une commune
très forgée survit à une rare brute ; et la fonte rend davantage sur une relique forgée, pour que l'or
investi ne disparaisse pas entièrement.

## Équilibre

Une relique forgée à fond vaut exactement **×1,75** de ce qu'elle valait — un test le vérifie sur
chaque définition du pool. Ce n'est pas un ordre de grandeur, donc la courbe n'a pas besoin d'être
réétalonnée.

Second garde-fou, par **nature d'effet** : un même pourcentage ne pèse pas pareil selon ce qu'il
majore. Bornes testées : ≤ 70% de dégâts, ≤ 120% d'or, ≤ 35 points de critique par slot. C'est ce test
qui a corrigé ma première borne, posée à l'aveugle sur la valeur brute (l'Oriflamme atteint 105%, mais
c'est de l'or, pas des dégâts).

Le simulateur ne modélise pas les reliques (limite documentée depuis US 15) : l'équilibre repose donc
ici sur ces bornes analytiques, pas sur une mesure.

## Compatibilité

`level` est optionnel partout (`?? 0`) : une relique de save antérieure fonctionne et peut être forgée
immédiatement — vérifié au navigateur.

## Critères d'acceptation

- [x] **CA1** Chaque slot équipé montre nom, niveau, rareté et effet exact.
- [x] **CA2** Total cumulé par nature d'effet sous les slots.
- [x] **CA3** Forger : coût croissant par niveau et par rareté, plafonné.
- [x] **CA4** Fusionner : 3 identiques → rareté supérieure, arrêt à légendaire.
- [x] **CA5** La fusion protège l'investissement (moins forgées d'abord, meilleur niveau conservé).
- [x] **CA6** Le cap d'inventaire et la fonte tiennent compte des niveaux.
- [x] **CA7** Bornes d'équilibre testées : ×1,75 exact, et plafonds par nature d'effet.
- [x] **CA8** Une relique sans `level` (save ancienne) fonctionne.
- [x] **CA9** `npm test` vert (230), build OK, tout vérifié au navigateur.
