export interface Env {
  ZUPLO_SHARED_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const secret = request.headers.get("X-Nexus-Shared-Secret");
    if (!secret || secret !== env.ZUPLO_SHARED_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await request.json<{ text?: string }>();
    if (!body.text) {
      return Response.json({ error: "Missing required field: text" }, { status: 400 });
    }

    const words = body.text.trim().split(/\s+/);
    const summary = words.slice(0, 20).join(" ") + (words.length > 20 ? "..." : "");

    return Response.json({ summary });
  },
};
