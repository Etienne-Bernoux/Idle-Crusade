# Idle Crusade

Idle game médiéval. Tu construis ton armée, elle se bat toute seule, tu pousses vers de nouvelles zones, tu pars en croisade pour reset et devenir plus fort.

> Site statique. Stack : **Vite + Svelte (JS pur)**. Persistance : `localStorage`. Déployé sur GitHub Pages à chaque push sur `main`.

## Démarrer en local

```bash
nvm use         # Node 20
npm install
npm run dev     # http://localhost:5173
```

## Build

```bash
npm run build      # produit ./dist
npm run preview    # sert ./dist en local pour tester
```

## Documents

- [SPEC.md](SPEC.md) — vision, mécaniques, jalons
- [docs/plans/](docs/plans/) — plans détaillés par US
- [CLAUDE.md](CLAUDE.md) — conventions et workflow Claude Code
- `mockup-v0.html` — maquette HTML statique d'origine (V0), gardée pour comparaison visuelle
