#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  }
}

const expected = [
  {
    file: "scripts/migrations/2026-07-12-rate-limits.sql",
    table: "rate_limits",
    column: "window_start",
  },
  {
    file: "scripts/migrations/2026-07-13-iap-orders.sql",
    table: "iap_orders",
    column: "status",
  },
  {
    file: "scripts/migrations/2026-07-12-analytics.sql",
    table: "analytics_events",
    column: "props_json",
  },
  {
    file: "scripts/migrations/2026-11-26-account-deletions.sql",
    table: "account_deletions",
    column: "request_id",
  },
  { file: "scripts/migrations/2026-11-27-social-safety.sql", table: "user_blocks", column: "blocked_uid" },
  { file: "scripts/migrations/2026-11-27-social-safety.sql", table: "user_reports", column: "snapshot_json" },
  { file: "scripts/migrations/2026-11-27-social-safety.sql", table: "social_prefs", column: "dm_friends_only" },
];

for (const item of expected) {
  const full = path.join(root, item.file);
  assert(existsSync(full), `missing ${item.file}`);
  const sql = readFileSync(full, "utf8");
  assert(/CREATE TABLE IF NOT EXISTS/i.test(sql), `${item.file} has CREATE TABLE`);
  assert(sql.includes(item.table), `${item.file} mentions ${item.table}`);
  assert(sql.includes(item.column), `${item.file} mentions ${item.column}`);
}

// 加列 / 触发器（migrations/ 下编号的增量，各跑一次）
for (const [file, parts] of [
  ["migrations/008_rebirth_count.sql", ["ALTER TABLE scores ADD COLUMN rebirthCount"]],
  ["migrations/009_token_version.sql", ["ALTER TABLE users ADD COLUMN token_version", "ALTER TABLE sessions ADD COLUMN token_version"]],
  ["migrations/010_password_bumps_token_version.sql", ["CREATE TRIGGER IF NOT EXISTS", "AFTER UPDATE OF password_hash ON users"]],
]) {
  assert(existsSync(path.join(root, file)), `missing ${file}`);
  const sql = readFileSync(path.join(root, file), "utf8");
  for (const part of parts) assert(sql.includes(part), `${file} has ${part}`);
  assert(!/\bDROP\b/i.test(sql), `${file} drops nothing`);
}
// 基线与增量一致：新建的库不用再跑 009
{
  const schema = readFileSync(path.join(root, "d1_schema.sql"), "utf8").replace(/\r\n/g, "\n");
  for (const table of ["users", "sessions"]) assert(/token_version INTEGER/.test(new RegExp(`CREATE TABLE ${table} \\(([\\s\\S]*?)\\n\\);`).exec(schema)?.[1] ?? ""), `d1_schema.sql ${table} has token_version`);
}

if (failed) {
  console.error(`migrations-selfcheck: ${failed} failed`);
  process.exit(1);
}
console.log("migrations-selfcheck: OK");
