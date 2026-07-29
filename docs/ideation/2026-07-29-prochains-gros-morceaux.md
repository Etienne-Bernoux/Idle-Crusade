# Idéation — les prochains gros morceaux

**Date** : 2026-07-29 · **Méthode** : `/ce:ideate`, 5 frames divergentes en parallèle
(douleur · inversion · levier · analogie inter-domaines · rupture d'hypothèse + inversion de
contrainte), puis filtrage adverse.

**Adaptation assumée** : le scan de codebase et la recherche de learnings ont été sautés — la
session venait de mesurer ce repo de bout en bout, redispatcher des agents pour le raconter aurait
été du gaspillage. 5 agents au lieu de 13. Les frames et la critique ont été gardées, c'est là
qu'est la valeur.

**Axes du sujet** : décision en combat · décision de méta-progression · lisibilité et feedback ·
rythme et retour · contenu et variété.

## Le fil unique

Toutes les frames, sans se concerter, ont convergé sur le même diagnostic déjà mesuré : **le jeu a
beaucoup de systèmes et presque aucun ne demande une décision.** Les trois preuves dures :

- la politique optimale des actifs est « lancer dès que prêt » — un automatisme, pas une stratégie ;
- la composition vaut **×2,06** et rien à l'écran ne le dit ;
- l'Arbre **classe** les branches (Guerre ×0,67 toujours devant) au lieu d'offrir un choix.

Une frame a produit l'analyse la plus profonde de la session, et elle disqualifie la correction
évidente : **tous les nœuds de l'Arbre parlent la même monnaie — un multiplicateur — donc ils se
classent toujours.** Aucun rééquilibrage ne corrigera ça ; seuls des effets *non commensurables* le
peuvent. Cela invalide « rendre les branches plus chères l'une après l'autre », qui était l'idée
spontanée d'une autre frame.

Une autre a repéré un piège que le code confirme : engager une troupe à ×0,7 **ajoute quand même
des dégâts positifs**. Donc toute idée « choisis ta composition » est fausse tant que rester au
front ne coûte rien.

## Les survivants, par force de conviction

### 1. Le boss télégraphie, l'actif répond ⭐ retenu

Le boss cesse d'être une barre de PV : à des paliers (75/50/25 %) il annonce une action par une
grosse icône clignotante, et **un actif précis la contre** — Percée contre le blindage, Rage contre
l'enrage, Ferveur contre la fuite au butin. Rater ne fait jamais perdre : ça coûte du temps et du
butin.

**Base** : convergence de **quatre frames sur cinq**, arrivées là indépendamment. Répare deux
constats mesurés d'un coup en connectant deux systèmes déjà livrés qui s'ignorent (US 22 armure et
types, US 23 les quatre actifs). Art antérieur cité : *Into the Breach* (information parfaite à
l'avance, donc puzzle et non réflexe), phases de boss de raid, *Vampire Survivors* pour la lisibilité
de l'escalade.

**Pourquoi c'est le plus impactant** : c'est la seule idée qui (a) est trouvée par presque toutes les
frames, (b) corrige le grief le plus explicitement mesuré, (c) n'ajoute **aucun** système — elle fait
parler ceux qui existent, (d) est du pur jeu d'appariement icône↔bouton, donc jouable par un enfant
de 5 ans sans savoir lire, et (e) débloque les idées plus lourdes : les Gambits n'ont rien à
automatiser tant qu'elle n'existe pas.

### 2. Rendre visible le ×2,06 déjà payé

Un encart de composition : contribution de chaque rôle, tier manquant nommé, et la lecture de la
faiblesse de l'ennemi (« blindé à 55 % — la pénétration compte ici »). Variante marchande : afficher
chaque achat en **temps de retour**, et proposer « jusqu'au prochain palier de rôle » comme achat de
première classe, parce que les paliers rendent la rentabilité non monotone.

**Base** : trouvé par quatre frames. `affinityLabel()` et `roleProgress()` existent déjà et leur
résultat est calculé à chaque tick puis jeté. Coût quasi nul, zéro risque d'équilibrage.

### 3. Des nœuds non commensurables (Pierres de Vœu)

Un nœud terminal par branche qui ne donne pas un pourcentage mais **supprime une règle** : Vœu de
Pauvreté (plus d'or, mais un cran de rareté par zone), Vœu de Silence (plus d'actifs, mais leurs
effets permanents à 25 %), Vœu du Nombre (Champions interdits, plafonds de rôle doublés).

**Base** : *Path of Exile*, les keystones. C'est la seule réponse **structurelle** au classement des
branches, et la plomberie existe déjà — `biomeEffects` est exactement ça : un objet de règles à
valeurs neutres par défaut.

### 4. Faire diverger les runs — route et clauses

Deux formes du même levier : proposer **2 ou 3 zones au même palier** après chaque boss (*Slay the
Spire*), ou **drafter 3 clauses parmi 6** au départ, chacune avec son multiplicateur de récompense
(*Pacte de Châtiment* de Hades). Les règles signature des biomes sont déjà écrites comme des règles
indépendantes et contrebalancées : il n'y a qu'à les dégrouper. 6 clauses = 20 combinaisons contre
5 biomes.

### 5. L'absence produit des décisions

L'axe le plus vide du jeu. Deux formes : un **Conseil du retour** (au plus 3 cartes à deux boutons
qui expirent en 24 h — *Crusader Kings* pour le fond, *Reigns* pour la forme), ou une **Expédition**
(détacher des troupes avant de fermer l'onglet, elles ne combattent plus, on parie sur une durée).

### 6. La Patine des reliques

Une relique équipée gagne +2 % de son effet par heure **réelle**, plafonné à ×2 ; la déséquiper
remet à zéro. Le drop d'une relique meilleure devient une question au lieu d'un tri automatique.

**Base** : *EVE Online*, la file de compétences — la progression avance à l'horloge murale, donc
l'engagement n'est pas « jouer plus » mais « avoir bien choisi avant de partir ». C'est la seule
idée qui récompense littéralement le fait de fermer l'onglet.

## Rejetés, avec le motif

| Idée | Motif du rejet |
|---|---|
| Coût croissant par branche dans l'Arbre | Patch numérique sur un problème structurel : tant que tous les nœuds parlent en multiplicateurs, ils se classeront. |
| Anti-dominance dans le Panthéon | Corrige par analogie un système livré il y a une heure, sans une seule donnée de jeu réel. Prématuré. |
| Cadence musicale de l'armée | La plus élégante du lot, mais son bénéfice est perceptuel et non décisionnel. Son propre auteur la place en dernier. |
| Gambits (politique d'actifs écrite à l'avance) | Excellente, mais n'a **rien à automatiser** tant que le boss télégraphié n'existe pas. Dépendante, donc pas première. |
| Sacrifice de troupes | Un bouton dont l'usage optimal est parfois « non » est un piège ; dans un jeu joué par un enfant de 5 ans, un piège est un bug. |
| Croisade automatique | Automatiser une décision la tue. À ne faire que sur une politique prouvée constante — pas maintenant. |
| Mode 60 secondes | Bonne intuition de session courte, mais crée une seconde surface de jeu à équilibrer contre la première. |
| Adaptation façon Nemesis | Devient un mur tant qu'il n'existe pas de builds alternatives (donc après les Pierres de Vœu). |

## Le choix, et son coût

**Je retiens le boss télégraphié.** Convergence maximale, répare le constat le plus mesuré, ne crée
aucun système, et c'est de loin le plus spectaculaire à l'écran.

**Ce qu'il coûte, et il faut le dire** : `SPEC.md` pilier 2 dit « pas de tactique ». Un boss qui
ouvre une fenêtre à contrer *est* de la tactique. Mais ce pilier a déjà été révisé de fait — la
ROADMAP l'acte depuis les US 22 et 24 : « la tactique est facultative mais récompensée ». Le boss
télégraphié reste dans ce cadre tant que **rater ne fait jamais perdre** : ça coûte du temps et du
butin, jamais la partie. Le pilier « on ne peut pas perdre » est intouché.

## Ordre recommandé

`boss télégraphié` → `composition visible` → `Pierres de Vœu` → `route ou clauses` → `Conseil du
retour`. Les deux premiers sont indépendants et immédiatement visibles ; les Pierres conditionnent
l'adaptation ennemie ; le Conseil couvre l'axe le plus vide.

> Hors idéation : les **207 succès à multiplicateurs** livrés en parallèle (US 29) viennent d'une
> demande directe d'Etienne, pas de ce document. Une frame les avait d'ailleurs explicitement
> écartés (« transforme 21 objets décoratifs en 21 lignes de tableur ») — la mesure a tranché
> autrement : ×0,97 au début, ×0,87 en milieu de partie, la pente reste plate.
