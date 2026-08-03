# Sondes de vérification navigateur

Le projet vérifie sa **logique pure** par `npm test` (node:test, zéro dépendance) et son
**comportement UI dans le navigateur**. Ces sondes sont la seconde moitié : elles pilotent le vrai
jeu et vérifient ce qu'aucun test unitaire ne peut voir — qu'un pan d'UI est câblé, qu'un bouton est
atteignable au doigt, qu'un son part réellement.

## Pourquoi elles vivent ici, désormais

Elles ont d'abord vécu dans un répertoire temporaire. Il a été nettoyé, et **six suites accumulées
sur une semaine ont disparu d'un coup** — impossible de rejouer la non-régression le jour où ça
comptait. Une vérification qu'on ne peut pas relancer n'est pas une vérification, c'est un souvenir.

## Lancer

Playwright n'est **pas** une dépendance du projet. On l'emprunte à une installation existante, dont
le chemin se passe en argument.

```sh
npm run build
npx vite preview --port 4173 &
node scripts/verif/son.mjs 4173 /chemin/vers/node_modules/playwright/index.mjs
```

Les deux arguments sont optionnels : port `4173` par défaut, et un chemin par défaut vers
l'installation locale.

## Ce qu'une bonne sonde fait — appris à la dure

- Elle **nomme ce qui échoue**, elle ne renvoie pas un booléen. Un audit mobile qui répondait
  `scrollWidth <= innerWidth` est resté vert pendant que le header débordait du double de l'écran.
- Elle **attend une condition, jamais un délai**. Un `waitForTimeout` calibré sur une machine au
  repos échoue sous charge — trois sondes l'ont appris.
- Elle vérifie qu'on peut **agir**, pas seulement que rien ne déborde.
- Elle mesure une **preuve objective** : ici le nombre d'oscillateurs Web Audio créés, pas la
  présence d'un bouton « son ».
- Elle **ignore ce qu'un cadre défilable peut ramener à l'écran**, sinon tout contenu scrollable est
  un faux positif — trois itérations perdues à « corriger » un arbre qui allait bien.
