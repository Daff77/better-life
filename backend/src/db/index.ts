import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePg, NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite, PgliteDatabase } from "drizzle-orm/pglite";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import * as schema from "./schema.js";
import { INITIAL_RECIPES } from "../data/seedData.js";

const { Pool } = pg;

export type AppDatabase = NodePgDatabase<typeof schema> | PgliteDatabase<typeof schema>;

interface DatabaseRuntime {
  kind: "pg" | "pglite";
  url: string;
  db: AppDatabase;
  pool?: pg.Pool;
  pglite?: PGlite;
  execMultiSql: (sqlText: string) => Promise<void>;
  queryRows: <T = Record<string, unknown>>(
    sqlText: string,
    params?: unknown[]
  ) => Promise<T[]>;
  close: () => Promise<void>;
}

let runtime: DatabaseRuntime | null = null;
let initPromise: Promise<AppDatabase> | null = null;

function isTestProcess(): boolean {
  return (
    env.NODE_ENV === "test" ||
    process.env.NODE_ENV === "test" ||
    process.argv.some((arg) => arg.includes("test")) ||
    Boolean(process.env.NODE_TEST_CONTEXT)
  );
}

export function resolveEffectiveDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) {
    return process.env.TEST_DATABASE_URL.trim();
  }
  if (isTestProcess() && !process.env.FORCE_PERSISTENT_DB_IN_TEST) {
    return "pglite://memory";
  }
  return (process.env.DATABASE_URL || env.DATABASE_URL || "pglite://./data/postgres").trim();
}

function resolveMigrationsDir(): string {
  const candidateInCurrent = path.join(__dirname, "migrations");
  if (fs.existsSync(candidateInCurrent)) {
    return candidateInCurrent;
  }
  // Fallback when running from compiled dist/db/index.js
  const candidateInSrc = path.resolve(__dirname, "../../src/db/migrations");
  if (fs.existsSync(candidateInSrc)) {
    return candidateInSrc;
  }
  throw new Error(`Database migrations directory not found near ${__dirname}`);
}

async function createRuntime(connectionUrl: string): Promise<DatabaseRuntime> {
  if (connectionUrl.startsWith("pglite://")) {
    const rawTarget = connectionUrl.slice("pglite://".length).trim();
    let pglite: PGlite;

    if (!rawTarget || rawTarget === "memory" || rawTarget === ":memory:") {
      pglite = await PGlite.create();
    } else {
      const backendRoot = path.resolve(__dirname, "../..");
      const dataDir = path.isAbsolute(rawTarget)
        ? rawTarget
        : path.resolve(backendRoot, rawTarget);
      fs.mkdirSync(path.dirname(dataDir), { recursive: true });
      pglite = await PGlite.create(dataDir);
    }

    const db = drizzlePglite(pglite, { schema });
    return {
      kind: "pglite",
      url: connectionUrl,
      db,
      pglite,
      execMultiSql: async (sqlText: string) => {
        await pglite.exec(sqlText);
      },
      queryRows: async <T = Record<string, unknown>>(sqlText: string, params: unknown[] = []) => {
        const res = await pglite.query<T>(sqlText, params);
        return res.rows;
      },
      close: async () => {
        await pglite.close();
      },
    };
  }

  const pool = new Pool({
    connectionString: connectionUrl,
  });
  const db = drizzlePg(pool, { schema });

  return {
    kind: "pg",
    url: connectionUrl,
    db,
    pool,
    execMultiSql: async (sqlText: string) => {
      await pool.query(sqlText);
    },
    queryRows: async <T = Record<string, unknown>>(sqlText: string, params: unknown[] = []) => {
      const res = await pool.query(sqlText, params);
      return res.rows as T[];
    },
    close: async () => {
      await pool.end();
    },
  };
}

export async function runSafeMigrations(rt: DatabaseRuntime): Promise<{
  applied: string[];
  skipped: string[];
}> {
  await rt.execMultiSql(`
    CREATE TABLE IF NOT EXISTS "_schema_migrations" (
      "filename" text PRIMARY KEY NOT NULL,
      "applied_at" timestamp DEFAULT now() NOT NULL
    );
  `);

  const existingRows = await rt.queryRows<{ filename: string }>(
    `SELECT "filename" FROM "_schema_migrations" ORDER BY "filename" ASC`
  );
  const appliedSet = new Set(existingRows.map((r) => r.filename));

  const migrationsDir = resolveMigrationsDir();
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  const applied: string[] = [];
  const skipped: string[] = [];

  for (const filename of files) {
    if (appliedSet.has(filename)) {
      skipped.push(filename);
      continue;
    }

    const fullPath = path.join(migrationsDir, filename);
    const sqlContent = fs.readFileSync(fullPath, "utf8");

    await rt.execMultiSql("BEGIN;");
    try {
      await rt.execMultiSql(sqlContent);
      await rt.queryRows(
        `INSERT INTO "_schema_migrations" ("filename") VALUES ($1) ON CONFLICT ("filename") DO NOTHING`,
        [filename]
      );
      await rt.execMultiSql("COMMIT;");
      applied.push(filename);
    } catch (err) {
      await rt.execMultiSql("ROLLBACK;");
      throw err;
    }
  }

  return { applied, skipped };
}

async function seedReferenceData(dbInstance: AppDatabase): Promise<void> {
  // 1. Seed catalog recipes idempotently without deleting user data
  for (const r of INITIAL_RECIPES) {
    await (dbInstance as any)
      .insert(schema.recipes)
      .values({
        id: r.id,
        title: r.title,
        category: r.category,
        calories: r.calories,
        prepTimeMinutes: r.prepTimeMinutes,
        difficulty: r.difficulty,
        description: r.description,
        svgIcon: r.svgIcon,
        imageUrl: r.imageUrl ?? null,
        estimatedCostIdr: r.estimatedCostIdr ?? 0,
        isPremium: Boolean(r.isPremium),
        nutrition: r.nutrition,
        ingredients: r.ingredients,
        instructions: r.instructions,
        dietaryTags: r.dietaryTags ?? [],
        allergens: r.allergens ?? [],
      })
      .onConflictDoUpdate({
        target: schema.recipes.id,
        set: {
          title: r.title,
          category: r.category,
          calories: r.calories,
          prepTimeMinutes: r.prepTimeMinutes,
          difficulty: r.difficulty,
          description: r.description,
          svgIcon: r.svgIcon,
          imageUrl: r.imageUrl ?? null,
          estimatedCostIdr: r.estimatedCostIdr ?? 0,
          isPremium: Boolean(r.isPremium),
          nutrition: r.nutrition,
          ingredients: r.ingredients,
          instructions: r.instructions,
          dietaryTags: r.dietaryTags ?? [],
          allergens: r.allergens ?? [],
        },
      });
  }

  // 2. In non-production, seed baseline demo accounts only if they do not exist yet
  if (env.NODE_ENV !== "production") {
    const demoPasswordHash = await bcrypt.hash("password123", 10);

    await (dbInstance as any)
      .insert(schema.users)
      .values([
        {
          id: "user-1",
          name: "John Doe",
          email: "johndoe25@gmail.com",
          phone: "+62 812-3456-7890",
          passwordHash: demoPasswordHash,
        },
        {
          id: "user-daffa",
          name: "Daffa Pratama",
          email: "daffa@gmail.com",
          phone: "+62 812-3456-7890",
          passwordHash: demoPasswordHash,
        },
      ])
      .onConflictDoNothing();

    await (dbInstance as any)
      .insert(schema.profiles)
      .values([
        {
          id: "profile-user-1",
          userId: "user-1",
          goal: "Eat balanced",
          weight: 65,
          targetWeight: 62,
          height: 170,
          gender: "Female",
          birthDate: { day: 15, month: "June", year: 2000 },
          cookingSkill: "Middle",
          dietType: "Omnivore",
          allergies: ["Lactose"],
          targetCalories: 1950,
          onboardingCompleted: true,
        },
        {
          id: "profile-user-daffa",
          userId: "user-daffa",
          goal: "Eat balanced",
          weight: 68,
          targetWeight: 65,
          height: 172,
          gender: "Male",
          birthDate: { day: 15, month: "June", year: 2002 },
          cookingSkill: "Middle",
          dietType: "Omnivore",
          allergies: [],
          targetCalories: 2253,
          onboardingCompleted: true,
        },
      ])
      .onConflictDoNothing();
  }
}

export async function ensureDbReady(): Promise<AppDatabase> {
  if (runtime) {
    return runtime.db;
  }
  if (!initPromise) {
    initPromise = (async () => {
      const targetUrl = resolveEffectiveDatabaseUrl();
      const rt = await createRuntime(targetUrl);
      await runSafeMigrations(rt);
      await seedReferenceData(rt.db);
      runtime = rt;
      return rt.db;
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

export function getDatabaseMetadata(): { kind: string; initialized: boolean } {
  return {
    kind: runtime?.kind ?? (resolveEffectiveDatabaseUrl().startsWith("pglite://") ? "pglite" : "pg"),
    initialized: Boolean(runtime),
  };
}

export async function closeDatabase(): Promise<void> {
  const current = runtime;
  runtime = null;
  initPromise = null;
  if (current) {
    await current.close();
  }
}
