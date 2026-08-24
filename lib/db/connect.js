import mongoose from "mongoose";

const globalForDb = globalThis;

if (!globalForDb._iyfDb) {
  globalForDb._iyfDb = { conn: null, promise: null, memoryServer: null };
}
const cached = globalForDb._iyfDb;

async function resolveUri() {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }

  // mongodb-memory-server downloads and spawns a real mongod binary, caching it
  // under os.homedir(). Serverless hosts have a read-only filesystem and often no
  // home directory at all, so the fallback is strictly a local-dev convenience.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "MONGODB_URI is not set. The in-memory dev database cannot run in production — " +
        "set MONGODB_URI to a real MongoDB connection string in your hosting environment."
    );
  }

  if (!cached.memoryServer) {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    cached.memoryServer = await MongoMemoryServer.create({
      instance: { dbName: "iyfpatna" },
    });
    console.warn(
      "[db] MONGODB_URI not set — using an in-memory MongoDB for local dev. Data resets whenever the server restarts. Set MONGODB_URI in .env.local to use a real database."
    );
  }

  return cached.memoryServer.getUri("iyfpatna");
}

export async function dbConnect() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = resolveUri().then((uri) =>
      mongoose.connect(uri, { bufferCommands: false }).then((m) => m)
    );
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}
