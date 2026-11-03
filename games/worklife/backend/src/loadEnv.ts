import path from "path";
import { config } from "dotenv";

export function loadBackendEnv() {
  config({ path: path.resolve(__dirname, "../.env") });
}

loadBackendEnv();
