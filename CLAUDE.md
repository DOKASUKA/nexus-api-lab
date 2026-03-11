# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

There are no root-level scripts. All commands run per-subproject.

### Cloudflare Workers (apis/{hello,summarize,translate}/)

```bash
npm run build    # TypeScript compilation (tsc)
npm run dev      # Local dev server (wrangler dev)
npm run deploy   # Deploy to Cloudflare Workers
```

### Zuplo Gateway (repo root)

```bash
npx @zuplo/cli build                                               # Validate locally
npx @zuplo/cli deploy --project nexus-api-lab --api-key $ZUPLO_API_KEY  # Deploy
```

## Architecture

This is a monorepo with three independent Cloudflare Workers behind a Zuplo API Gateway:

```
Internet → Zuplo Gateway (injects X-Shared-Secret header) → Cloudflare Workers
```

- **`apis/`** — Three standalone Workers, each with its own `wrangler.toml`, `tsconfig.json`, and `package.json`
  - `hello/` — GET, returns `{ message: "Hello from Nexus API Lab" }`
  - `summarize/` — POST, truncates input text to first 20 words
  - `translate/` — POST, word-level translation to Japanese/Spanish/French via hardcoded dictionary

- **`config/`** — Zuplo 6.x gateway config (managed-edge, project root)
  - `config/routes.oas.json` — OpenAPI 3.1 route definitions with Zuplo extensions; routes `/hello`, `/summarize`, `/translate` to their respective Workers
  - `config/policies.json` — Defines the `auth-workers` policy using `SetHeadersOutboundPolicy` to inject `X-Nexus-Shared-Secret: ${env.SHARED_SECRET_AUTH}` on outbound requests
- **`modules/`** — Custom TypeScript handlers (currently unused `upstreamProxy.ts`)

- **`openapi/`** — Individual OpenAPI YAML specs per API + `openapi.yaml` (aggregated gateway spec)

## Security Model

All Workers validate the `X-Nexus-Shared-Secret` header against `env.ZUPLO_SHARED_SECRET`, returning 401 if absent or invalid. The Zuplo gateway injects this secret via the `auth-workers` outbound policy using `env.SHARED_SECRET_AUTH`. These env vars must match.

## CI/CD

`.github/workflows/deploy.yml` triggers on push to `main` when `apis/**` or `gateway/zuplo-gateway/**` change. It runs two parallel jobs:
- **deploy-zuplo** — builds and deploys the gateway
- **deploy-workers** — matrix-deploys all three Workers in parallel

Required secrets: `ZUPLO_API_KEY`, `CLOUDFLARE_API_TOKEN`.


## TypeScript

All subprojects use strict TypeScript (ES2022 target). The gateway uses `moduleResolution: "bundler"` and `module: "ESNext"`. Workers use `@cloudflare/workers-types` for type support. There is no shared `tsconfig` inheritance — each subproject is independent.
