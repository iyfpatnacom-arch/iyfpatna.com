export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV === "production") return; // never auto-seed a real database
  if (process.env.MONGODB_URI) return; // real database — seed explicitly via `npm run seed`

  const { runSeed } = await import("./lib/db/seedData.js");
  await runSeed({ log: (msg) => console.log(msg) }).catch((err) => {
    console.error("[instrumentation] in-memory dev DB seed failed", err);
  });
}
