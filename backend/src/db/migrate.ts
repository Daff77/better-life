import {
  ensureDbReady,
  closeDatabase,
  resolveEffectiveDatabaseUrl,
  getDatabaseMetadata,
} from "./index.js";

async function main() {
  const targetUrl = resolveEffectiveDatabaseUrl();
  console.log(`[db:migrate] Connecting to ${targetUrl.replace(/:[^:@/]+@/, ":****@")} ...`);
  await ensureDbReady();
  const meta = getDatabaseMetadata();
  console.log(`[db:migrate] Safe migrations & reference seed completed (${meta.kind}).`);
  await closeDatabase();
}

main().catch((err) => {
  console.error("[db:migrate] Migration failed:", err);
  process.exit(1);
});
