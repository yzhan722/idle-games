// 进程内 D1 替身：node:sqlite 内存库 + D1 的 prepare/bind/first/all/run/batch 形状。不开端口、不连真 D1。
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function loadSqlite() {
  try {
    return (await import("node:sqlite")).DatabaseSync;
  } catch {
    return null; // Node < 22.5
  }
}

export function createFakeD1(DatabaseSync, { migrations = [] } = {}) {
  const raw = new DatabaseSync(":memory:");
  raw.exec(readFileSync(path.join(root, "d1_schema.sql"), "utf8"));
  for (const rel of migrations) raw.exec(readFileSync(path.join(root, rel), "utf8"));

  // 真 D1 的报错长这样：「D1_ERROR: no such table: x: SQLITE_ERROR」，原文另放在 cause
  const d1 = (fn) => {
    try {
      return fn();
    } catch (e) {
      throw new Error(`D1_ERROR: ${e?.message || e}: SQLITE_ERROR`, { cause: e });
    }
  };
  const exec = (sql, binds) => {
    const r = raw.prepare(sql).run(...binds);
    return { success: true, meta: { last_row_id: Number(r.lastInsertRowid), changes: Number(r.changes) } };
  };
  const stmt = (sql, binds = []) => ({
    bind: (...next) => stmt(sql, next),
    first: async () => d1(() => raw.prepare(sql).get(...binds) ?? null),
    all: async () => d1(() => ({ results: raw.prepare(sql).all(...binds) })),
    run: async () => d1(() => exec(sql, binds)),
    _exec: () => exec(sql, binds),
  });
  return {
    raw,
    prepare: (sql) => stmt(sql),
    batch: async (stmts) => {
      raw.exec("BEGIN");
      try {
        const out = stmts.map((s) => s._exec());
        raw.exec("COMMIT");
        return out;
      } catch (e) {
        raw.exec("ROLLBACK");
        throw new Error(`D1_ERROR: ${e?.message || e}: SQLITE_ERROR`, { cause: e });
      }
    },
  };
}

export const ALL_MIGRATIONS = [
  "scripts/migrations/2026-07-12-rate-limits.sql",
  "scripts/migrations/2026-07-13-iap-orders.sql",
  "scripts/migrations/2026-07-12-analytics.sql",
  "scripts/migrations/2026-11-26-account-deletions.sql",
  "scripts/migrations/2026-11-27-social-safety.sql",
];

export function call(handler, db, { method = "POST", url = "https://test.invalid/api", token = "", body = null, headers = {}, env = {}, params = {} } = {}) {
  const h = { "Content-Type": "application/json", ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  const request = new Request(url, { method, headers: h, body: body == null ? undefined : JSON.stringify(body) });
  return handler({ request, env: { DB: db, ...env }, params });
}
