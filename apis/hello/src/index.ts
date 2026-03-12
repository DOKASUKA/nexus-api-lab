export interface Env {
  ZUPLO_SHARED_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const allHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => { allHeaders[key] = value; });
    console.log("[DEBUG] incoming headers:", JSON.stringify(allHeaders));
    console.log("[DEBUG] env.ZUPLO_SHARED_SECRET defined:", env.ZUPLO_SHARED_SECRET !== undefined);

    const secret = request.headers.get("X-Nexus-Shared-Secret");
    if (!secret || secret !== env.ZUPLO_SHARED_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    return Response.json({ message: "Hello from Nexus API Lab" });
  },
};
