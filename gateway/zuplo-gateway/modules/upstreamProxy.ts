import { ZuploContext, ZuploRequest } from "@zuplo/runtime";

interface ProxyOptions {
  upstreamUrl: string;
}

export default async function upstreamProxy(
  request: ZuploRequest,
  context: ZuploContext,
  options: ProxyOptions
): Promise<Response> {
  const secret = context.env.ZUPLO_SHARED_SECRET as string;

  const headers = new Headers(request.headers);
  headers.set("X-Nexus-Shared-Secret", secret);

  return fetch(options.upstreamUrl, {
    method: request.method,
    headers,
    body: request.body,
  });
}
