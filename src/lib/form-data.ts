// ตัวช่วยอ่านค่าจาก <form> (FormData) ให้ได้ชนิดข้อมูลที่ถูกต้อง
// ทุกอย่างที่มาจากฟอร์มเป็น string เสมอ จึงต้องแปลงและตรวจสอบก่อนใช้

/** อ่านตัวเลขจำนวนเต็ม ถ้าไม่ใช่ตัวเลขหรือนอกช่วง min-max จะ throw error */
export function getInt(formData: FormData, key: string, min: number, max: number): number {
  const value = Number(formData.get(key));
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`ค่า ${key} ไม่ถูกต้อง`);
  }
  return value;
}

/** อ่านข้อความ ตัดช่องว่างหัวท้ายให้ */
export function getString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** อ่านรายการ id จาก checkbox หลายอันที่ชื่อเดียวกัน */
export function getIdList(formData: FormData, key: string): number[] {
  return formData
    .getAll(key)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
}
