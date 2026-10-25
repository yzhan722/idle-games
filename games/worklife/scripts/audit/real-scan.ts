import { monsters, stageOf } from "./lib";
import { CHAINS, PREV_ZONE } from "./zone-chains";
import { realBossFight } from "./real-fight";

const f = (r: { won: boolean; left: number }) => (r.won ? `${String(Math.round(r.left * 100)).padStart(3)}%` : "LOS");
async function main() {
  const id = process.argv[2];
  const [lo, hi] = [Number(process.argv[3]), Number(process.argv[4])];
  const m: any = monsters.find((x) => x.id === id);
  const z = stageOf.get(id)!;
  const rows: string[] = [];
  for (let atk = lo; atk <= hi; atk++) {
    const own = await realBossFight(CHAINS[z], m.level, id, atk);
    const prev = await realBossFight(CHAINS[PREV_ZONE[z]], m.level, id, atk);
    rows.push(`${atk}:${f(own)}/${f(prev)}`);
  }
  console.log(id, "own/prev", rows.join("  "));
}
main();
