export interface Env {
  ZUPLO_SHARED_SECRET: string;
}

const translations: Record<string, Record<string, string>> = {
  ja: {
    hello: "こんにちは",
    world: "世界",
    goodbye: "さようなら",
  },
  es: {
    hello: "hola",
    world: "mundo",
    goodbye: "adiós",
  },
  fr: {
    hello: "bonjour",
    world: "monde",
    goodbye: "au revoir",
  },
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const secret = request.headers.get("X-Nexus-Shared-Secret");
    if (!secret || secret !== env.ZUPLO_SHARED_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const body = await request.json<{ text?: string; target_language?: string }>();
    if (!body.text || !body.target_language) {
      return Response.json(
        { error: "Missing required fields: text, target_language" },
        { status: 400 }
      );
    }

    const lang = body.target_language.toLowerCase();
    if (!translations[lang]) {
      return Response.json({ error: `Unsupported language: ${lang}` }, { status: 400 });
    }

    const translated = body.text
      .split(/\s+/)
      .map((word) => translations[lang][word.toLowerCase()] ?? word)
      .join(" ");

    return Response.json({ translated_text: translated, target_language: lang });
  },
};
