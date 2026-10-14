-- เก็บเวลาที่จบเกม (ใช้เรียงคิวผลัดกันลงสนาม)
ALTER TABLE "Match" ADD COLUMN "finishedAt" TIMESTAMP(3);
