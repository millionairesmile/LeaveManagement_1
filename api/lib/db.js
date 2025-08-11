import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { users } from "../../../shared/schema"; // users 테이블 import 필요

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

// Create the neon client
const sql = neon(process.env.DATABASE_URL);

// Create the drizzle instance
export const db = drizzle(sql);

// 테스트용 admin 계정 생성 함수
export async function seedAdmin() {
  // 이미 admin 계정이 있는지 확인
  const existing = await db.select().from(users).where({ email: "admin@test.com" });
  if (existing.length === 0) {
    await db.insert(users).values({
      name: "Test Admin",
      email: "admin@test.com",
      password: "admin123", // 실제 서비스에서는 해시 필요
      role: "admin"
    });
    console.log("Test admin account created.");
  } else {
    console.log("Test admin account already exists.");
  }
}