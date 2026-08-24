import { dbConnect } from "@/lib/db/connect";
import FeatureFlag from "@/models/FeatureFlag";

const TTL_MS = 30_000;
const globalForFlags = globalThis;

if (!globalForFlags._iyfFlagCache) {
  globalForFlags._iyfFlagCache = { data: null, fetchedAt: 0, inflight: null };
}
const cache = globalForFlags._iyfFlagCache;

async function loadAll() {
  await dbConnect();
  const docs = await FeatureFlag.find({}).lean();
  const map = {};
  for (const doc of docs) map[doc.key] = doc;
  return map;
}

async function getAllFlags() {
  const isFresh = cache.data && Date.now() - cache.fetchedAt < TTL_MS;
  if (isFresh) return cache.data;

  if (!cache.inflight) {
    cache.inflight = loadAll()
      .then((data) => {
        cache.data = data;
        cache.fetchedAt = Date.now();
        cache.inflight = null;
        return data;
      })
      .catch((err) => {
        cache.inflight = null;
        throw err;
      });
  }

  return cache.inflight;
}

export async function getFlag(key, fallback = false) {
  try {
    const flags = await getAllFlags();
    return flags[key]?.enabled ?? fallback;
  } catch (err) {
    console.error(`[flags] failed to read "${key}", using fallback`, err);
    return fallback;
  }
}

export async function getAllFlagDocs() {
  await dbConnect();
  return FeatureFlag.find({}).sort({ key: 1 }).lean();
}

export async function setFlag(key, enabled, { updatedBy = "", note } = {}) {
  await dbConnect();
  const update = {
    enabled,
    "meta.updatedBy": updatedBy,
    "meta.updatedAt": new Date(),
  };
  if (note !== undefined) update["meta.note"] = note;

  const doc = await FeatureFlag.findOneAndUpdate(
    { key },
    { $set: update },
    { returnDocument: "after" }
  );
  cache.data = null;
  return doc;
}
