import { seedIfEmpty } from "../db/seed";

async function main() {
  await seedIfEmpty();
  console.log("Database ready at data/baseweight.sqlite");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
