// ฟังก์ชันจัดรูปแบบข้อความสำหรับแสดงผล

/** แสดงวันที่แบบไทย เช่น "ส. 18 ต.ค. 69" */
export function formatThaiDate(date: Date): string {
  return date.toLocaleDateString("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "2-digit",
    // วันที่เก็บเป็น "วันล้วนๆ" (ไม่มีเวลา) ในรูป UTC จึงต้องแสดงแบบ UTC ไม่งั้นวันจะเลื่อน
    timeZone: "UTC",
  });
}

/** แปลง Date เป็น "YYYY-MM-DD" สำหรับใส่ใน <input type="date"> (ตามเวลาไทย) */
export function toDateInputValue(date: Date): string {
  return date.toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
}

/** ต่อชื่อผู้เล่นในทีม เช่น "บอส & เจ" */
export function teamName(players: { name: string }[]): string {
  return players.map((p) => p.name).join(" & ");
}

/** สรุปการจอง เช่น "18:00–20:00 • คอร์ท A6" (ไม่ได้กรอกส่วนไหนก็ข้ามส่วนนั้น) */
export function formatBooking(s: {
  startTime: string | null;
  endTime: string | null;
  courtName: string | null;
}): string | null {
  const time = s.startTime && s.endTime ? `${s.startTime}–${s.endTime}` : (s.startTime ?? s.endTime);
  const court = s.courtName ? `คอร์ท ${s.courtName}` : null;
  const parts = [time, court].filter(Boolean);
  return parts.length > 0 ? parts.join(" • ") : null;
}
