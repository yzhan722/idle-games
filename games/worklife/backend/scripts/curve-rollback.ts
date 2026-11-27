/**
 * 回滚到换曲线之前的旧版本之前，先把存档的经验换回旧曲线。步骤见 docs/design/OWN_CURVES.md「回滚步骤」。
 * 必须先停掉服务，并先备份。默认只数不写，加 --apply 才写。
 *
 *   node --import tsx backend/scripts/curve-rollback.ts --file <memory-store.json> [--apply]
 *   DATABASE_URL=... node --import tsx backend/scripts/curve-rollback.ts --pg [--apply]
 *
 * 之后再升级回新版，不用做任何事：没有 curveVersion 的存档会在读档时自动再换算一次。
 */
import fs from "node:fs";
import { revertPlayerCurves } from "../src/curve_migration";
import { parseSnapshot } from "../src/memory_snapshot";
import type { EnhancedPlayerState } from "../src/types";

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const file = args.includes("--file") ? args[args.indexOf("--file") + 1] : undefined;
  if (file) {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    let changed = 0;
    for (const [, state] of parseSnapshot(raw).states) if (state && revertPlayerCurves(state)) changed += 1;
    delete raw.curveWriter;
    console.log(`${file}：${changed} 份存档要换回旧曲线`);
    if (apply && changed > 0) {
      // 已经有一份备份就另起名字：第二次执行不能把真正的原文件盖掉
      const plain = `${file}.before-curve-rollback`;
      const backup = fs.existsSync(plain) ? `${plain}.${Date.now()}` : plain;
      fs.copyFileSync(file, backup);
      fs.writeFileSync(file, JSON.stringify(raw), "utf8");
      console.log(`已写入，原文件留在 ${backup}（有账号注销时会连它一起清掉）`);
    }
    return;
  }
  if (args.includes("--pg")) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query("SELECT user_id, state_json FROM player_states WHERE state_json ? 'curveVersion' FOR UPDATE");
      let changed = 0;
      for (const row of rows) {
        const state = row.state_json as EnhancedPlayerState;
        if (!revertPlayerCurves(state)) continue;
        changed += 1;
        if (apply) {
          await client.query("UPDATE player_states SET state_json = $2, version = version + 1, updated_at = now() WHERE user_id = $1", [row.user_id, JSON.stringify(state)]);
        }
      }
      await client.query(apply ? "COMMIT" : "ROLLBACK");
      console.log(`player_states：${changed} 份存档${apply ? "已换回" : "要换回"}旧曲线`);
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw err;
    } finally {
      client.release();
      await pool.end();
    }
    return;
  }
  console.error("用法：--file <路径> 或 --pg，可加 --apply");
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
