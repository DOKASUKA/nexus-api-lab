export interface Env {
  // Polar auth (new path)
  POLAR_ACCESS_TOKEN: string;
  POLAR_ORG_ID: string;
  POLAR_WEBHOOK_SECRET: string;
  LICENSE_CACHE: KVNamespace;
  QUOTA_COUNTER: DurableObjectNamespace;
  QUOTA_LIMIT_DEFAULT: string;
  // Legacy Zuplo shared-secret (backward compat — remove after DNS switch)
  ZUPLO_SHARED_SECRET: string;
}

interface CachedLicense {
  status: string;
  quota_limit: number;
  cached_at: number;
}

interface PolarValidateResponse {
  status: string;
  limit_usage: number | null;
  [key: string]: unknown;
}

// Adapter: single place to update if Polar API changes
function isLicenseValid(data: PolarValidateResponse): boolean {
  return data.status === "granted";
}

async function validateWithPolar(
  key: string,
  orgId: string,
  token: string
): Promise<PolarValidateResponse | null> {
  try {
    const res = await fetch("https://api.polar.sh/v1/license-keys/validate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key,
        organization_id: orgId,
        activation_id: null,
        benefit_id: null,
        customer_id: null,
        increment_usage: 0,
      }),
    });
    if (!res.ok) return null;
    return res.json<PolarValidateResponse>();
  } catch {
    return null;
  }
}

// ─── Durable Object: per-key monthly quota counter ───────────────────────────

export class QuotaCounter {
  state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/increment") {
      const limit = parseInt(url.searchParams.get("limit") ?? "50");
      const count = (await this.state.storage.get<number>("count")) ?? 0;

      if (count >= limit) {
        return Response.json({ allowed: false, count }, { status: 429 });
      }

      await this.state.storage.put("count", count + 1);

      // Schedule monthly reset alarm on first use
      const alarm = await this.state.storage.getAlarm();
      if (!alarm) {
        const nextReset = new Date();
        nextReset.setUTCMonth(nextReset.getUTCMonth() + 1);
        nextReset.setUTCDate(1);
        nextReset.setUTCHours(0, 0, 0, 0);
        await this.state.storage.setAlarm(nextReset.getTime());
      }

      return Response.json({ allowed: true, count: count + 1 });
    }

    return new Response("Not found", { status: 404 });
  }

  async alarm(): Promise<void> {
    // Monthly reset
    await this.state.storage.put("count", 0);

    // Schedule next month
    const nextReset = new Date();
    nextReset.setUTCMonth(nextReset.getUTCMonth() + 1);
    nextReset.setUTCDate(1);
    nextReset.setUTCHours(0, 0, 0, 0);
    await this.state.storage.setAlarm(nextReset.getTime());
  }
}

// ─── Webhook signature verification ───────────────────────────────────────────

async function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyBuffer = encoder.encode(secret);
  const msgBuffer = encoder.encode(body);

  const key = await crypto.subtle.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, msgBuffer);
  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedSignature === signature.toLowerCase();
}

interface PolarWebhookPayload {
  type: string;
  data: {
    id: string;
    license_key?: {
      key: string;
      status: string;
      limit_usage?: number;
    };
    [key: string]: unknown;
  };
}

// ─── Main fetch handler ───────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ── POST /webhooks/polar: Webhook receiver ──
    if (request.method === "POST" && url.pathname === "/webhooks/polar") {
      const signature = request.headers.get("X-Polar-Signature");
      if (!signature) {
        return Response.json({ error: "Missing signature" }, { status: 400 });
      }

      const body = await request.text();
      const isValid = await verifyWebhookSignature(body, signature, env.POLAR_WEBHOOK_SECRET);

      if (!isValid) {
        return Response.json({ error: "Invalid signature" }, { status: 401 });
      }

      let payload: PolarWebhookPayload;
      try {
        payload = JSON.parse(body);
      } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
      }

      // Process order.created event
      if (payload.type === "order.created" && payload.data.license_key) {
        const licenseKey = payload.data.license_key.key;
        const cacheData = {
          status: payload.data.license_key.status,
          quota_limit: payload.data.license_key.limit_usage ?? 1000,
          cached_at: Date.now(),
        };
        await env.LICENSE_CACHE.put(`license:${licenseKey}`, JSON.stringify(cacheData), {
          expirationTtl: 3600,
        });
        return Response.json({ status: "ok" });
      }

      return Response.json({ status: "ok" });
    }

    // ── GET /success: Purchase success page ──
    if (request.method === "GET" && url.pathname === "/success") {
      const checkoutId = url.searchParams.get("id");
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Purchase Successful</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 600px; margin: 100px auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; }
    h1 { color: #333; margin: 0 0 20px 0; }
    .checkmark { font-size: 60px; color: #4CAF50; margin: 20px 0; }
    p { color: #666; font-size: 16px; line-height: 1.6; }
    .checkout-id { font-family: monospace; background: #f0f0f0; padding: 10px; border-radius: 4px; margin: 20px 0; }
    a { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="checkmark">✓</div>
    <h1>Purchase Successful!</h1>
    <p>Thank you for your purchase. Your API license key will be sent to your email shortly.</p>
    ${checkoutId ? `<div class="checkout-id">Checkout ID: ${checkoutId}</div>` : ""}
    <p>You can now use your license key to access the API.</p>
    <a href="https://api.nexus-api-lab.com/hello">Return to API</a>
  </div>
</body>
</html>
      `;
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // ── GET / or GET /hello: API endpoint (existing auth logic) ──
    const authHeader = request.headers.get("Authorization");
    const sharedSecret = request.headers.get("X-Nexus-Shared-Secret");

    // ── Legacy path: Zuplo shared-secret (bypass quota until DNS switch) ──
    if (sharedSecret) {
      if (!env.ZUPLO_SHARED_SECRET || sharedSecret !== env.ZUPLO_SHARED_SECRET) {
        return Response.json({ error: "Unauthorized", message: "Invalid shared secret" }, { status: 401 });
      }
      return Response.json({ message: "Hello from Nexus API Lab" });
    }

    // ── Polar path: Authorization: Bearer <license-key> ──
    const licenseKey = authHeader?.replace(/^Bearer\s+/i, "");
    if (!licenseKey) {
      return Response.json(
        { error: "Unauthorized", message: "Missing Authorization header" },
        { status: 401 }
      );
    }

    // Check KV cache (TTL = 1h, set at write time)
    const cacheKey = `license:${licenseKey}`;
    let cached = await env.LICENSE_CACHE.get<CachedLicense>(cacheKey, "json");

    if (!cached) {
      // First call for this key: validate with Polar
      const polarData = await validateWithPolar(licenseKey, env.POLAR_ORG_ID, env.POLAR_ACCESS_TOKEN);

      if (!polarData || !isLicenseValid(polarData)) {
        return Response.json(
          { error: "Unauthorized", message: "Invalid or inactive license key" },
          { status: 401 }
        );
      }

      const defaultLimit = parseInt(env.QUOTA_LIMIT_DEFAULT ?? "50");
      cached = {
        status: polarData.status,
        quota_limit: polarData.limit_usage ?? defaultLimit,
        cached_at: Date.now(),
      };
      await env.LICENSE_CACHE.put(cacheKey, JSON.stringify(cached), {
        expirationTtl: 3600,
      });
    } else if (!isLicenseValid({ status: cached.status } as PolarValidateResponse)) {
      return Response.json(
        { error: "Unauthorized", message: "License key is not active" },
        { status: 401 }
      );
    }

    // Check per-key monthly quota
    const quotaId = env.QUOTA_COUNTER.idFromName(licenseKey);
    const quotaObj = env.QUOTA_COUNTER.get(quotaId);
    const quotaRes = await quotaObj.fetch(
      new Request(`https://quota/increment?limit=${cached.quota_limit}`)
    );

    if (quotaRes.status === 429) {
      return Response.json(
        { error: "Too Many Requests", message: "Monthly quota exceeded" },
        { status: 429 }
      );
    }

    return Response.json({ message: "Hello from Nexus API Lab" });
  },
};
