import { config } from "dotenv";
import { existsSync } from "fs";

for (const path of [".env.local", ".env"]) {
  if (existsSync(path)) {
    config({ path, override: false });
  }
}
