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
Internet → Zuplo Gateway (injects X-Nexus-Shared-Secret header) → Cloudflare Workers
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

`.github/workflows/deploy.yml` triggers on push to `main` when `config/**`, `zuplo.jsonc`, or `apis/**` change. It runs two parallel jobs:
- **deploy-zuplo** — builds and deploys the gateway from repo root
- **deploy-workers** — matrix-deploys all three Workers in parallel

Required secrets: `ZUPLO_API_KEY`, `CLOUDFLARE_API_TOKEN`.

## TypeScript

The gateway (`tsconfig.json` at repo root) requires exactly:
```json
"module": "ESNext",
"moduleResolution": "Bundler",
"lib": ["ESNext", "WebWorker", "Webworker.Iterable"]
```
> **⚠️ これ以外の設定（例: `module: ES2022`, `moduleResolution: node`）は Zuplo 6.x のビルドエラーになる。**

Workers は各 `apis/*/tsconfig.json` で独立管理。ルートの `tsconfig.json` は Zuplo 専用。

## Zuplo 統合の必要条件

> **今回の障害で判明した必須ルール。違反するとデプロイが 249/250 で失敗する。**

### 1. プロジェクト配置 ⚠️
`zuplo.jsonc` は**リポジトリルート**に置く。サブディレクトリ（例: `gateway/zuplo-gateway/`）に置くとポータルが "Invalid directory" エラーを出し、ポータル連携が機能しない。

### 2. ヘッダー名の統一 ⚠️
ゲートウェイが注入するヘッダーと Worker が検証するヘッダーは**完全一致**させる。

| 場所 | 設定値 |
|---|---|
| `config/policies.json` の送信ヘッダー | `X-Nexus-Shared-Secret` |
| `apis/*/src/index.ts` の検証ヘッダー | `X-Nexus-Shared-Secret` |

名前がずれると Worker は常に 401 を返し、ヘルスチェックが全滅する。

### 3. 環境変数の対応
| 変数 | 設定場所 |
|---|---|
| `SHARED_SECRET_AUTH` | Zuplo ポータル → Environment Variables |
| `ZUPLO_SHARED_SECRET` | Cloudflare Workers の環境変数（wrangler / ダッシュボード） |

両者の値は同一にする。

### 4. ポリシー形式（Zuplo 6.x）
`SetHeadersOutboundPolicy` を使う。旧形式（`upstream` 等）は動作しない。

```json
{
  "export": "SetHeadersOutboundPolicy",
  "module": "$import(@zuplo/runtime)"
}
```

### 5. ログ取得
`@zuplo/cli` v6.x に `logs` コマンドは**存在しない**。ログは Zuplo ポータルの **Logs** タブからのみ確認可能。
