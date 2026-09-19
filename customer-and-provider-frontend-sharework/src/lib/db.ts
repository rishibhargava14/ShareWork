import mongoose from "mongoose";

declare global {
  var __shareworkDb: Promise<typeof mongoose> | undefined;
}

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = "27017";
const DEFAULT_DB = "sharework";

function buildUri(): string | null {
  const uri = process.env.MONGODB_URI;
  if (uri) return uri;
  const host = process.env.MONGODB_HOST;
  const port = process.env.MONGODB_PORT ?? DEFAULT_PORT;
  const db = process.env.MONGODB_DATABASE ?? DEFAULT_DB;
  if (host) return `mongodb://${host}:${port}/${db}`;
  return null;
}

/**
 * Connects to MongoDB (mongoose). Connection is determined in this order:
 *  1. MONGODB_URI (full connection string)
 *  2. MONGODB_HOST / MONGODB_PORT / MONGODB_DATABASE (individual components)
 *  3. In development: in-memory MongoDB via mongodb-memory-server
 *
 * No authentication is used — the database has auth disabled as configured
 * by the project environment.
 */
export async function connectDB(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) return mongoose;

  const uri = buildUri();

  if (!uri && process.env.NODE_ENV === "production") {
    throw new Error("MONGODB_URI (or MONGODB_HOST) is required in production.");
  }

  if (global.__shareworkDb) return global.__shareworkDb;

  const connect = async () => {
    if (uri || process.env.NODE_ENV === "production") {
      await mongoose.connect(uri ?? `mongodb://${DEFAULT_HOST}:${DEFAULT_PORT}/${DEFAULT_DB}`, {
        serverSelectionTimeoutMS: 5000,
      });
    } else {
      // Development fallback: in-memory MongoDB (no external service needed).
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      const memory = await MongoMemoryServer.create();
      const memoryUri = memory.getUri();
      console.log(`[db] Using in-memory MongoDB (${memoryUri.slice(0, 30)}…)`);
      await mongoose.connect(memoryUri, { serverSelectionTimeoutMS: 5000 });
    }
    console.log("[db] MongoDB connected");
    return mongoose;
  };

  global.__shareworkDb = connect().then(async (m) => {
    try {
      const { seed } = await import("@/lib/seed");
      await seed();
    } catch (e) {
      console.error("[db] Seed failed:", e);
    }
    return m;
  });
  return global.__shareworkDb;
}

export async function isDbConnected(): Promise<boolean> {
  return mongoose.connection.readyState === 1;
}