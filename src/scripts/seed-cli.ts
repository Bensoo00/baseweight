import "./load-env";
import { seedIfEmpty } from "../db/seed";

async function main() {
  await seedIfEmpty();
  console.log("Postgres seed complete (empty tables filled).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
