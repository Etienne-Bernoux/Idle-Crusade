# Rendre le jeu plus stratégique, plus vivant, plus beau

Pistes issues de la session de mesure US 27. **Rien ici n'est décidé** : c'est un
matériau de cadrage. Chaque piste porte ce qui la motive — quand c'est une mesure, elle est citée.

Le fil conducteur : le jeu a beaucoup de systèmes, et **presque aucun ne demande de décision au
joueur**. C'est le constat central de la session, et il est chiffré.

---

## Partie 1 — Stratégie : là où il n'y a pas encore de choix

### 1.1 L'Arbre de Gloire n'offre pas un choix, il offre un classement

**Mesuré** (5 cycles, Gloire enfermée dans une branche, 20 graines) :

| ⚔ Guerre | 🪙 Fortune | 💎 Reliques | 🏆 Croisade |
|---|---|---|---|
| ×0,67 | ×0,71 | ×0,77 | ×0,81 |

Un joueur qui optimise prend Guerre, toujours, à tous les horizons. Les trois autres branches sont
des façons plus lentes de faire la même chose. Ce n'est pas un arbre de choix, c'est un arbre de
patience.

**Ce qui rendrait le choix réel** — par ordre de préférence :

- **Rendre les branches situationnelles plutôt que comparables.** Le jeu a déjà des biomes avec des
  règles signature. Si le biome Disette d'or rend 🪙 Fortune décisive, et le Néant (zéro relique)
  rend 💎 Reliques inutile, alors la bonne branche dépend d'où l'on part — et le choix de biome au
  prestige devient un vrai choix couplé. **Recommandé** : aucun système nouveau, on relie deux
  systèmes existants qui s'ignorent aujourd'hui.
- **Un coût de redistribution.** Pouvoir désinvestir une branche contre une perte (30 % de la
  Gloire ?) transforme l'arbre en pari révisable plutôt qu'en engagement définitif.
- **Des exclusions.** Deux keystones incompatibles dans la même branche forcent une identité.

### 1.2 La composition d'armée est récompensée mais invisible

**Mesuré en US 24** : une composition pensée vaut ×2,06 contre ×1,30 pour un empilement d'un seul
tier. Le levier existe donc, et il est fort. Mais **rien à l'écran ne le dit** : le joueur voit un
dps global, pas ce que sa composition lui apporte ni ce qui manque.

- Un **encart de composition** : contribution de chaque rôle, et ce qu'un tier de plus changerait.
- Une **lecture de la faiblesse de l'ennemi** avant le combat (« ce boss est blindé à 55 % — la
  pénétration compte ici »). Aujourd'hui l'armure est affichée mais rien n'en tire la conséquence.
- Rendre le conseil **actionnable** : bouton « rééquilibrer » qui propose un achat.

### 1.3 Les actifs ne demandent aucune décision

Symptôme révélateur : dans le simulateur, la politique optimale est **« lancer chaque actif dès
qu'il est prêt »**. Quand le jeu optimal est un automatisme, il n'y a pas de stratégie — il y a du
clic.

- **Rendre le bon moment payant.** La Percée ignore l'armure : elle devrait valoir beaucoup contre
  un boss blindé et presque rien sur des mobs nus. Même logique pour la Ferveur (×3 or) qui devrait
  se garder pour une vague riche.
- **Une charge accumulable** (2 charges max) : garder un actif devient un pari.
- Contre-argument à peser : le jeu est un idle, et exiger de la présence contredit le pilier « 70 %
  de la progression vient du passif ». Une piste plus sûre est donc de rendre l'actif **meilleur**
  s'il est bien placé, sans le rendre **nécessaire**.

### 1.4 Les boss sont des sacs de PV

Un boss diffère d'un mob par ses PV, son armure et son type. Rien ne se passe pendant le combat.

- **Des phases** : à 50 % de PV le boss change de type ou gagne de l'armure — ce qui rend une autre
  affinité ou un autre actif pertinent en cours de combat. C'est le moyen le plus direct de créer
  une décision, et c'est très visible.
- **Un enjeu de temps** : un boss qui régénère si on ne le tue pas assez vite donne un mur franc
  au lieu d'un ralentissement diffus.

### 1.5 Chaque run se ressemble

Le biome est le seul paramètre qui change d'un run à l'autre.

- **Un tirage de 3 modificateurs au départ, on en choisit 1** (« +50 % d'or mais les boss ont
  +30 % de PV »). Peu de code, beaucoup de variété, et une décision immédiate à chaque Croisade.
- **Des objectifs optionnels par cycle de profondeur** (« clear la zone 7 sans perdre le Cri »)
  récompensés en Gloire.

---

## Partie 2 — Visuel : ce qui se verrait tout de suite

Priorité donnée à ce qui se voit sans explication — critère assumé du projet.

### 2.1 Le drop de relique mérite un moment

C'est la récompense principale du jeu et elle apparaît comme une ligne dans un panneau latéral. Avec
le nœud « Aubaine » livré cette session, il en tombe désormais **deux** d'un coup : l'occasion est là.

- Une **carte qui se retourne** au centre, teintée de la rareté, avant de rejoindre l'inventaire.
- Une **gerbe de particules** dont la densité suit la rareté (le flash légendaire existe déjà, il
  n'est pas gradué).

### 2.2 Un buff actif doit se voir sur l'armée, pas sur son bouton

Aujourd'hui seul le bouton change d'état. Pendant un Cri de Guerre, **l'armée** devrait le montrer :
aura rouge, cadence d'attaque visiblement plus rapide, chiffres de dégâts plus gros. C'est le lien
manquant entre l'action du joueur et ce qu'il voit à l'écran.

### 2.3 Les critiques ne se distinguent pas assez

Un critique triple les dégâts et ignore l'armure — c'est un événement. Il mérite un chiffre d'une
autre taille, d'une autre couleur, avec un léger arrêt sur image.

### 2.4 L'Arbre est un schéma, pas un objet désirable

Nœuds SVG portant leur coût. Pistes : traînée lumineuse le long des liens acquis, animation à
l'achat, branches qui prennent leur couleur en se remplissant, et un aperçu de ce que débloque le
nœud suivant.

### 2.5 Les biomes ne teintent pas assez le jeu

Chaque biome a son bestiaire et sa règle, mais l'écran change peu. Une palette par biome (fond,
couleur des barres, grain) rendrait le choix de départ **sensible** avant même d'être compris.

---

## Ce que je ferais en premier

1. **Phases de boss** (1.4) — crée une vraie décision en combat *et* c'est spectaculaire. Le meilleur
   rapport intérêt/visibilité, et ça sert les deux moitiés de la demande.
2. **Coupler biomes et branches** (1.1) — transforme l'arbre en choix sans ajouter de système.
3. **Le moment du drop** (2.1) — petit, immédiat, et la récompense principale du jeu le mérite.

À l'inverse, je **déconseille** d'ajouter des systèmes tant que la composition d'armée reste
invisible (1.2) : le jeu récompense déjà ×2,06 un levier que le joueur ne peut pas voir. Rendre
lisible l'existant vaut mieux qu'empiler du neuf — c'est exactement ce qui a produit les onze US
de cette semaine et l'écran de Croisade mort pendant quatre d'entre elles.
