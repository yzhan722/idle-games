import { formatReport, runFirstHourSimulation } from "../backend/src/first_hour_sim";

async function main() {
  const report = await runFirstHourSimulation();
  console.log(formatReport(report));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
