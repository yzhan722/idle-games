export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Proxy /api/* and /ws* to the WorkLife backend on yinosites.com origin
    if (
      url.pathname === "/api" ||
      url.pathname.startsWith("/api/") ||
      url.pathname === "/ws" ||
      url.pathname.startsWith("/ws/")
    ) {
      const subPath = url.pathname.startsWith("/api")
        ? url.pathname.replace(/^\/api/, "") || "/"
        : url.pathname;
      const targetUrl =
        "https://yinosites.com/previews/worklife-api" +
        (subPath.startsWith("/") ? subPath : "/" + subPath) +
        url.search;

      const headers = new Headers(request.headers);
      headers.set("X-Forwarded-Host", url.host);
      headers.set("X-Forwarded-Proto", url.protocol.replace(":", ""));

      const init = {
        method: request.method,
        headers,
        redirect: "manual",
      };
      if (request.method !== "GET" && request.method !== "HEAD") {
        init.body = request.body;
      }
      return fetch(targetUrl, init);
    }

    // 2. Serve frontend static assets from Cloudflare Edge
    if (env && env.ASSETS) {
      const assetResp = await env.ASSETS.fetch(request);
      if (assetResp.status !== 404) {
        return assetResp;
      }
      // SPA fallback to /index.html for navigation routes
      if (request.method === "GET" && !url.pathname.includes(".")) {
        const indexUrl = new URL("/index.html", url.origin);
        return env.ASSETS.fetch(new Request(indexUrl.toString(), request));
      }
      return assetResp;
    }

    return new Response("Not Found", { status: 404 });
  },
};
