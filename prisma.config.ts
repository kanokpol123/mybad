// ตั้งค่าให้คำสั่ง `prisma ...` (migrate, studio, generate) รู้ว่าจะต่อฐานข้อมูลไหน
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Neon ให้ URL มา 2 แบบ:
    //  - DATABASE_URL           = แบบ pooled ใช้กับตัวเว็บ
    //  - DATABASE_URL_UNPOOLED  = แบบต่อตรง เหมาะกับการ migrate
    // ถ้าไม่มีแบบ unpooled ก็ใช้ DATABASE_URL แทน
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  },
});
