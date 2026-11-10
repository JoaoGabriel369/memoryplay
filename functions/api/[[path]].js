export async function onRequest(context) {
  const { request, env } = context;
  const origin = env.API_ORIGIN;
  if (!origin) {
    return new Response(JSON.stringify({ error: "API_ORIGIN não configurada no Cloudflare Pages." }), {
      status: 503,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }

  const incoming = new URL(request.url);
  const upstream = new URL(origin);
  upstream.pathname = incoming.pathname;
  upstream.search = incoming.search;

  const headers = new Headers(request.headers);
  headers.set("x-forwarded-host", incoming.host);
  headers.set("x-forwarded-proto", incoming.protocol.slice(0, -1));

  const init = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  try {
    const response = await fetch(new Request(upstream, init));
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("cache-control", "no-store");
    responseHeaders.delete("content-length");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch {
    return new Response(JSON.stringify({ error: "Não foi possível conectar ao servidor do MemoryPlay." }), {
      status: 502,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }
}
