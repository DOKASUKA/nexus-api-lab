# Nexus API Lab Specification (v2.0 - Main Branch)

Nexus API Lab is a platform for hosting multiple APIs using a monorepo architecture, managed via the `main` branch.

## Tech Stack
* Cloudflare Workers (Runtime)
* Wrangler (CLI for Deployment)
* Zuplo API Gateway (Edge Gateway & Dev Portal)
* OpenAPI 3.0 (API Definition)
* GitHub Actions (CI/CD)
* TypeScript

## Monorepo Structure
The project must follow this directory structure:
/apis
  /hello       (Worker: nexus-hello-api)
  /summarize   (Worker: nexus-summarize-api)
  /translate   (Worker: nexus-translate-api)
/gateway
  /zuplo       (Zuplo Project Files)
/openapi       (API Specs: hello.yaml, summarize.yaml, translate.yaml)
/sdk           (Generated SDKs)
/.github/workflows (CI/CD Pipelines)

## CI/CD Requirements (GitHub Actions)
* **Trigger**: MUST trigger only on push to the `main` branch.
* **Matrix Deployment**: Use a matrix to deploy `hello`, `summarize`, and `translate` independently.
* **Working Directory**: Wrangler commands must run within each API's subdirectory (`apis/<name>`).
* **Secrets**: Load the following from GitHub Secrets:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
  - `ZUPLO_SHARED_SECRET` (For Worker protection)

## Security & Protection
1. **Shared Secret Verification**:
   - Each Worker MUST verify the `X-Nexus-Shared-Secret` header.
   - If the header does not match `env.ZUPLO_SHARED_SECRET`, return `401 Unauthorized`.
2. **Direct Access Guard**: Prohibit direct access to `*.workers.dev` without the secret.

## Zuplo Integration
- The `gateway/zuplo` directory must contain a valid Zuplo project (`zuplo.jsonc`, `package.json`).
- Environment: Linked to the `main` branch for Production.