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
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build
```

Run all pull-request checks in sequence with `pnpm quality`. Use `pnpm format` to apply the
workspace formatting rules. Intentional visual changes require reviewing the browser output and
then running `pnpm test:e2e --update-snapshots`; never update screenshot baselines blindly.

## Appwrite development foundation

The repository can build and test without Appwrite secrets. To configure the development project,
copy the placeholder-only contract and follow the runbook:

```sh
cp .env.example apps/web/.env.local
pnpm appwrite:validate
pnpm appwrite:provision
pnpm appwrite:drift
pnpm appwrite:health
pnpm appwrite:integration
pnpm appwrite:seed
```

Provisioning requires a separately scoped bootstrap key and refuses a project whose verified name
is not `umoja-development`. See [the Appwrite operations runbook](docs/appwrite-runbook.md) before
creating keys or changing Cloud resources.

## Manual launch gates

Automated responsive tests cover the required width matrix, a 2560px sanity width, and phone and
tablet landscape variants. They deliberately do not use `deviceScaleFactor` as a substitute for
browser zoom.

Before launch, verify the supported interface at 200% zoom in a real browser and record successful
physical-device checks on at least one supported Android phone and one supported iPhone. These are
manual launch gates and cannot be satisfied by Playwright emulation.
