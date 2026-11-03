import { spawn } from "node:child_process";

process.env.ART_CAPTURE = "1";
const child = spawn("npx", ["playwright", "test", "e2e/art-qa.spec.ts"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});
child.on("exit", (code) => process.exit(code ?? 1));
