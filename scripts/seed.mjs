import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import mongoose from "mongoose";
import { runSeed } from "../lib/db/seedData.js";

runSeed()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error("[seed] failed", err);
    process.exit(1);
  });
