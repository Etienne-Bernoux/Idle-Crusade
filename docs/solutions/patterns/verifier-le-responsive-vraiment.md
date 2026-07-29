---
title: Vérifier le responsive pour de vrai (scrollWidth ne suffit pas)
category: patterns
date: 2026-07-29
tags: [css, responsive, mobile, test, playwright, faux-negatif]
project: idle-crusade
---

# `scrollWidth <= innerWidth` ne prouve rien

Pendant plusieurs US, chaque livraison portait un contrôle mobile qui passait :

```js
scrollWidth <= innerWidth   // ✅ à 375 px
```

Et pendant ce temps, le header devenait injouable. À 320 px, la barre de ressources
s'étendait de 143 à 695 px — **plus du double du viewport**.

## Pourquoi le contrôle mentait

`html, body { overflow-x: hidden }` était posé dans la media query mobile. Le contenu qui
déborde n'agrandit alors pas la page : **il est coupé**. `scrollWidth` reste égal à
`innerWidth`, l'assertion passe, et le contenu est simplement invisible et inatteignable.

`overflow-x: hidden` ne résout pas un débordement, **il le cache** — y compris au test.

## Ce qu'il faut mesurer

Quatre familles de défauts, aucune détectée par `scrollWidth` :

1. **Hors écran** — un élément dont la boîte sort du viewport, *sauf* s'il vit dans un
   ancêtre défilable qui peut l'y ramener. Sans cette nuance, tout contenu d'un cadre à
   défilement est un faux positif (l'Arbre de Gloire l'a déclenché).
2. **Cibles trop petites** — tout `button` / `[role=button]` sous ~40 px.
3. **Texte tronqué** — `el.scrollWidth > el.clientWidth` sur les libellés.
4. **Jouabilité** — peut-on *agir* ? Recruter, ouvrir chaque modale, voir les quatre
   actifs en même temps. Un écran peut être parfaitement contenu et inutilisable.

## Deux pièges CSS rencontrés au passage

- **Les media queries écrasées par la cascade.** Écrites avant les règles de base dans le
  fichier, elles perdent à spécificité égale. Les blocs étroits vont **en fin de feuille**.
- **La spécificité qui gagne malgré tout.** `.modal.wide { max-width: 560px }` (deux
  classes) bat `.modal { max-width: calc(100vw - 16px) }` quel que soit l'ordre : sur un
  écran de 320 px, la modale restait à 560. Il faut cibler `.modal, .modal.wide`.
- **`margin: 0 auto` sur un enfant plus large que son conteneur défilable** pousse le
  début du contenu *hors* de la zone atteignable. Le centrage doit sauter en étroit.

## Le réflexe

Ne jamais conclure « le mobile est bon » sur une assertion booléenne unique. Un audit
mobile **liste les éléments fautifs** — s'il ne peut rien nommer, c'est qu'il ne cherche
pas assez.
