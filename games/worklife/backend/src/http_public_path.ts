/** JWT 鉴权白名单：精确 pathname，不含 query、不含尾斜杠。 */
export const PUBLIC_API_PATHS = new Set(["/health", "/content", "/auth/guest", "/auth/register", "/auth/login", "/auth/google", "/ws"]);

export function requestPathname(url: string): string {
  const raw = url.split("?", 1)[0] || "/";
  return raw.replace(/\/+$/, "") || "/";
}

export function isPublicApiPath(url: string): boolean {
  return PUBLIC_API_PATHS.has(requestPathname(url));
}

/** 限流豁免仅 /health 本身，避免 /health-evil 一类前缀绕过。 */
export function isRateLimitExempt(url: string): boolean {
  return requestPathname(url) === "/health";
}
