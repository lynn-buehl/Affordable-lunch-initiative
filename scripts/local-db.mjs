/**
 * Docker-free local Postgres for development. Data persists in .pgdata/
 * (gitignored) across restarts. If you'd rather use Docker, `docker-compose.yml`
 * gives you the same thing on the same port — use one or the other, not both.
 *
 * Usage: npm run db:local
 * Then: postgresql://ali:ali@localhost:5432/ali
 */
import EmbeddedPostgres from "embedded-postgres";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { existsSync } from "node:fs";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const pg = new EmbeddedPostgres({
  databaseDir: path.join(projectRoot, ".pgdata"),
  user: "ali",
  password: "ali",
  port: 5432,
  persistent: true,
});

// initdb refuses to run on an existing cluster, so only initialise once.
if (!existsSync(path.join(projectRoot, ".pgdata", "PG_VERSION"))) {
  await pg.initialise();
}
await pg.start();
await pg.createDatabase("ali").catch(() => {}); // already exists after first run

console.log("Postgres ready at postgresql://ali:ali@localhost:5432/ali");
console.log("Press Ctrl+C to stop.");

process.on("SIGINT", async () => {
  await pg.stop();
  process.exit(0);
});
