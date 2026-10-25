import { monsters, stageOf } from "./lib";
import { CHAINS, PREV_ZONE } from "./zone-chains";
import { realBossFight } from "./real-fight";

const pct = (r: { won: boolean; left: number; durationMs: number }) => (r.won ? `${String(Math.round(r.left * 100)).padStart(3)}% ${Math.round(r.durationMs / 1000)}s` : `LOSS ${Math.round(r.durationMs / 1000)}s`);

async function main() {
  for (const id of ["forest_boss", "mine_boss", "swamp_boss", "snow_boss", "volcano_boss"]) {
    const m: any = monsters.find((x) => x.id === id);
    const z = stageOf.get(id)!;
    const own = await realBossFight(CHAINS[z], m.level, id, m.atk);
    const prev = PREV_ZONE[z] ? await realBossFight(CHAINS[PREV_ZONE[z]], m.level, id, m.atk) : undefined;
    console.log(id.padEnd(13), "L", m.level, "atk", m.atk, "| own", pct(own), "| prev", prev ? pct(prev) : "-");
  }
}
main();
