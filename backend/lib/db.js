import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

// Create the neon client
const sql = neon(process.env.DATABASE_URL);

// Create the drizzle instance
export const db = drizzle(sql);
