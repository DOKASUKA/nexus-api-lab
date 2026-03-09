# Global API Services & Integration Hub

This repository serves as the central documentation and development hub for our global API export initiative. We provide high-performance, edge-computing based API solutions designed for the AI-driven workflow era.

## 🚀 Business Overview
We specialize in providing "Infrastructure as a Service" (IaaS) through lightweight, reliable API endpoints. Our goal is to bridge the gap between complex data processing and automated AI agents/workflows (n8n, Zapier, GitHub Actions).

### Current Service Focus:
- **Data Transformation APIs**: Converting complex web data into AI-readable structured formats.
- **Workflow Automation Tools**: Custom-built endpoints to streamline enterprise repetitive tasks.
- **Developer Utilities**: Essential tools for modern software development and CI/CD pipelines.

## Zuplo Gateway

The Zuplo API Gateway project root is located at:

```
gateway/zuplo-gateway/
```

When importing this repository into the Zuplo Dashboard, set **Project Root** to `gateway/zuplo-gateway`.

| Directory | Purpose |
|-----------|---------|
| `gateway/zuplo-gateway/config/routes.oas.json` | Route definitions (OpenAPI 3.1 + Zuplo extensions) |
| `gateway/zuplo-gateway/openapi/` | Per-API OpenAPI specs |
| `gateway/zuplo-gateway/modules/` | Custom Zuplo modules |
| `gateway/zuplo-gateway/schemas/` | JSON Schemas |

**Required environment variables in Zuplo Dashboard:**
- `HELLO_API_URL` — Cloudflare Worker URL for nexus-hello-api
- `SUMMARIZE_API_URL` — Cloudflare Worker URL for nexus-summarize-api
- `TRANSLATE_API_URL` — Cloudflare Worker URL for nexus-translate-api
- `ZUPLO_SHARED_SECRET` — Shared secret injected as `X-Nexus-Shared-Secret` header

## 🛠 Tech Stack
To ensure 99.9% availability and global low-latency, we utilize industry-leading technologies:
- **Edge Computing**: Cloudflare Workers
- **API Management**: Zuplo (SOC2 Compliant)
- **Financial Infrastructure**: Stripe & Wise
- **Contract Testing**: Ensuring API reliability and backward compatibility.

## 🌐 Compliance & Transparency
We are committed to international tax compliance and service transparency.
- **KYC/AML**: Fully integrated with Stripe Identity for secure merchant verification.
- **Data Privacy**: No sensitive user data is stored on our edge nodes; we prioritize "Privacy by Design."
- **Export Control**: All services are provided as digital software services, compliant with global trade regulations.

## 📬 Contact
For business inquiries or support, please use the following channel:
- **Official Inquiry**: [GitHub Issues](https://github.com/DOKASUKA/nexus-api-lab/issues)
- **Email**: Security-protected (Please contact via Issues for direct email address)
- **Location**: Tokyo, Japan

## ⚖️ Disclosure under the Specified Commercial Transactions Act
As a Japan-based service provider for Nexus API Lab, we comply with the Act on Specified Commercial Transactions.
- **Legal Name**: Nexus API Lab (Personal name available upon request)
- **Address**: Tokyo, Japan (Full address available upon request)
- **Phone Number**: Available upon request via the official inquiry channel.
- **Email Address**: Associated with the GitHub inquiry channel.
- **Operations Manager**: Hirokazu Katori
- **Additional Fees**: None (Data and communication costs are the responsibility of the user).
- **Return / Exchange Policy**: Due to the digital nature of the services, all sales are final and non-refundable. Subscriptions can be canceled via the Customer Portal at any time before the next billing cycle.
- **Delivery Time**: API keys are issued and activated immediately after the payment is confirmed.
- **Payment Methods**: Credit Cards (Visa, Mastercard, American Express, JCB).
- **Payment Period**: Credit card payments are processed immediately at the time of order.
- **Selling Price**: Displayed on each product page or Stripe Checkout screen (including tax).
