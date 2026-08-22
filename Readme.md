# Umoja / UFP

Product, platform, and brand planning for **Umoja Freelance Platform (UFP)** — a pan-African technology talent network built by Africans, for Africa and the world.

## Planning package

- [Product and platform blueprint](docs/product-blueprint.md)
- [Brand system](docs/brand-system.md)
- [Codex kickstart playbook](docs/codex-kickstart-playbook.md)
- [Primary logo](public/brand/umoja-logo.svg)
- [Logo mark](public/brand/umoja-mark.svg)
- [Monochrome logo](public/brand/umoja-logo-mono.svg)

## Recommended build order

1. Validate governance, legal jurisdiction, commission rules, and platform terminology.
2. Build the public website, talent applications, project intake, and internal admin workspace.
3. Pilot real projects with Umoja Core and a small Extended cohort.
4. Add contracting, milestone payments, and broader marketplace discovery after the operating model is proven.

The blueprint deliberately separates the first useful release from later marketplace complexity.

## Local development

Prerequisites: Node.js 20.9 or newer and Corepack.

Run these exact commands from the repository root:

```sh
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install --frozen-lockfile
pnpm dev
```

Then open `http://localhost:3000`.

## Quality checks

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
