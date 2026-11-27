/**
 * JWT 鉴权白名单：精确 pathname，不含 query、不含尾斜杠。
 * /auth/account/delete 自己验凭证：注销成功后再次请求要能得到「已注销」，而全局钩子会因为账号不在了直接 401。
 * /admin/metrics 也自己验：不认玩家登录，只认 METRICS_ADMIN_KEY，没配或不对一律 404；/admin/chat-reports 同理，只认 REPORTS_ADMIN_KEY。
 */
export const PUBLIC_API_PATHS = new Set(["/health", "/content", "/auth/guest", "/auth/register", "/auth/login", "/auth/google", "/auth/account/delete", "/admin/metrics", "/admin/chat-reports", "/ws"]);

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
