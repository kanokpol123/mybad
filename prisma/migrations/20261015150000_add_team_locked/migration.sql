-- ล็อกคู่หู (กดสุ่มใหม่แล้วคู่ที่ล็อกไม่เปลี่ยน)
ALTER TABLE "Team" ADD COLUMN "locked" BOOLEAN NOT NULL DEFAULT false;
