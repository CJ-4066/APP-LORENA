import { readdir, readFile, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { getPool, isDatabaseConfigured } from "./database.js";
import { getAppEnv } from "./env.js";

const migrationsDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../migrations",
);

async function resolveMigrationsDirectory(): Promise<string> {
  const candidates = [
    migrationsDirectory,
    resolve(process.cwd(), "migrations"),
    resolve(process.cwd(), "apps/api/migrations"),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Continue searching.
    }
  }

  return migrationsDirectory;
}

export async function runMigrations(): Promise<string[]> {
  if (!isDatabaseConfigured()) {
    return [];
  }

  const pool = getPool();
  const client = await pool.connect();
  const appliedNow: string[] = [];

  try {
    await client.query(`
      create table if not exists schema_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const resolvedMigrationsDirectory = await resolveMigrationsDirectory();
    const migrationFiles = (await readdir(resolvedMigrationsDirectory))
      .filter((file) => file.endsWith(".sql"))
      .sort((left, right) => left.localeCompare(right));

    for (const file of migrationFiles) {
      const alreadyApplied = await client.query<{ name: string }>(
        "select name from schema_migrations where name = $1",
        [file],
      );
      if (alreadyApplied.rowCount) {
        continue;
      }

      const sql = await readFile(resolve(resolvedMigrationsDirectory, file), "utf8");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "insert into schema_migrations (name) values ($1)",
          [file],
        );
        await client.query("COMMIT");
        appliedNow.push(file);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    return appliedNow;
  } finally {
    client.release();
  }
}

export async function ensurePersistenceReady(): Promise<{
  mode: "mock" | "database";
  appliedMigrations: string[];
}> {
  if (!isDatabaseConfigured()) {
    return {
      mode: "mock",
      appliedMigrations: [],
    };
  }

  try {
    const appliedMigrations = getAppEnv().autoMigrate ? await runMigrations() : [];

    return {
      mode: "database",
      appliedMigrations,
    };
  } catch (error) {
    const env = getAppEnv();
    if (env.nodeEnv === "production") {
      throw error;
    }

    process.env.FORCE_MOCK_DATA = "true";
    return {
      mode: "mock",
      appliedMigrations: [],
    };
  }
}

const maybeMainFile = process.argv[1] ?? "";
if (maybeMainFile.endsWith("migrate.ts") || maybeMainFile.endsWith("migrate.js")) {
  const result = await ensurePersistenceReady();
  console.log(
    JSON.stringify(
      {
        message: "Persistence ready",
        ...result,
      },
      null,
      2,
    ),
  );
}
