# Accru AI Hub

The **Accru AI Hub** is the group's permanent, owned registry and distribution layer for AI assets — applications, agents, skills, prompts, and training — serving ~70 member firms across Norway, Sweden, Denmark and the UK from a single deployment behind Entra SSO.

It is deliberately **model- and vendor-agnostic**: build tools like Riff and Claude are replaceable surfaces, while the Hub is the compounding, IP-owning asset that outlives any single vendor. Employees log in to one trusted place to discover vetted, two-key-approved AI resources, ranked by relevance to their country and work but open by default so the group compounds across borders.

This repository holds the product specifications and an interactive design style guide for developer and stakeholder handoff.

## Interactive prototypes (live)

**Style guide → https://cwvedvik.github.io/accru-ai-hub/**

A live, buildless style guide rendering the real Accru brand tokens, typography, components, and patterns (v0.3). Tab through it to see the accessible focus treatment; click the scope-bar controls to see the signature pattern in action.

**Usage dashboard → https://cwvedvik.github.io/accru-ai-hub/usage-dashboard.html**

An interactive design prototype of the AI usage, spend and adoption dashboard, with Claude as the first data source. Switch persona in the top right to move between the group console (Head of AI), a member firm's own view, and an individual employee's view — the nav and scope controls change with the role. Every panel carries a "Data source and behaviour" disclosure naming the Claude Analytics endpoint behind it, and the **Handoff notes** page holds the URL contract, metric definitions, refresh cadence and attribution rules. All data is invented for design review.

## Specifications

| Document | Description |
|----------|-------------|
| [UX & interface spec](accru-ai-hub-ux-spec.md) | Design system, screens, flows, and interaction patterns (v0.3). |
| [Technical architecture](accru-ai-hub-technical-architecture.md) | Domain model, evaluation gate, AI/search layer, identity, security, stack, delivery phases (v0.2). |

## Repository structure

```
accru-ai-hub/
├── README.md                              # this file
├── accru-ai-hub-ux-spec.md                # UX & interface specification
├── accru-ai-hub-technical-architecture.md # technical architecture specification
└── docs/                                  # GitHub Pages site (source: main / docs)
    ├── index.html                         # interactive style guide
    ├── usage-dashboard.html               # usage & adoption dashboard prototype
    ├── usage-dashboard.data.js            # seeded mock data + endpoint provenance
    ├── usage-dashboard.views.js           # screen renderers
    ├── usage-dashboard.app.js             # chart theme, scope/URL state, controls
    └── .nojekyll                          # serve files as-is (no Jekyll build)
```

## Viewing locally

The style guide is a single self-contained HTML file — no build step required.

```bash
# either just open them
open docs/index.html
open docs/usage-dashboard.html

# or serve them (fonts, icons and the chart library load from CDN)
npx serve docs
```

Both pages are plain static files with no build step. The dashboard splits its JavaScript across three classic scripts (no ES modules) specifically so it still runs when opened straight from disk.

## Notes for maintainers

- **Visibility.** This repository is **public** because GitHub Pages is free only on public repositories. The specifications contain no secrets and no client data (the architecture explicitly scopes client data out of the Hub). To make it private, either move to a GitHub plan that supports Pages on private repos, or host the `docs/` site elsewhere (e.g. Vercel/Netlify) and set the repo private.
- **GitHub Pages** is configured to deploy from the `main` branch `/docs` folder. Edits to `docs/index.html` publish automatically on push.
- The style guide mirrors the v0.3 UX spec. When the spec's design system changes, update `docs/index.html` to match.

---

*Accru Partners Group · Head of AI · draft for review.*
