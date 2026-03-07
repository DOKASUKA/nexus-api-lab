# Nexus API Lab Specification

Nexus API Lab is a platform for hosting multiple APIs using a monorepo architecture.

## Tech Stack

* Cloudflare Workers
* Wrangler
* Zuplo API Gateway
* OpenAPI 3.0
* GitHub Actions
* TypeScript

## Monorepo Structure

/apis
/hello
/summarize
/translate

/gateway
/zuplo

/openapi

/sdk

/.github/workflows

Each API must run as an independent Cloudflare Worker.

Worker names:

* nexus-hello-api
* nexus-summarize-api
* nexus-translate-api

## API Requirements

Workers must return JSON responses.

Example:

GET /hello

Response:

{
"message": "Hello from Nexus API Lab"
}

## OpenAPI

Each API must have a specification:

openapi/hello.yaml
openapi/summarize.yaml
openapi/translate.yaml

## CI/CD

GitHub Actions must:

* trigger on push to main
* deploy workers using wrangler
* use matrix deployment

Workers:

hello
summarize
translate

Secrets must be loaded from GitHub Secrets.

Required secret:

CF_API_TOKEN

## Security

Never store secrets in the repository.

Use environment variables only.
