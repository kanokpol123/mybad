-- อวตาร์ผู้เล่น (เก็บแค่รหัสสั้นๆ เช่น "boy-2")
ALTER TABLE "Player" ADD COLUMN "avatar" TEXT;

-- เวลาที่จอง + เลขคอร์ท ของแต่ละนัด
ALTER TABLE "Session" ADD COLUMN "startTime" TEXT,
ADD COLUMN "endTime" TEXT,
ADD COLUMN "courtName" TEXT;
