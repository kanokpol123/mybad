// ===============================================================
//  ตัวการ์ตูนอวตาร์ที่ให้เลือก (ชาย 4 แบบ / หญิง 4 แบบ)
// ---------------------------------------------------------------
//  ฐานข้อมูลเก็บแค่ "id" เช่น "girl-3" ส่วนสีและทรงผมอยู่ในไฟล์นี้
//  อยากเพิ่มแบบใหม่ ก็เพิ่มบรรทัดในรายการด้านล่างได้เลย
// ===============================================================

export type AvatarPreset = {
  id: string;
  gender: "boy" | "girl";
  hair: string; // สีผม
  shirt: string; // สีเสื้อ
  bg: string; // สีพื้นหลัง
};

export const AVATARS: AvatarPreset[] = [
  { id: "boy-1", gender: "boy", hair: "#3f2a1d", shirt: "#2563eb", bg: "#dbeafe" },
  { id: "boy-2", gender: "boy", hair: "#111827", shirt: "#059669", bg: "#d1fae5" },
  { id: "boy-3", gender: "boy", hair: "#c2410c", shirt: "#f59e0b", bg: "#fef3c7" },
  { id: "boy-4", gender: "boy", hair: "#6b7280", shirt: "#7c3aed", bg: "#ede9fe" },
  { id: "girl-1", gender: "girl", hair: "#3f2a1d", shirt: "#ec4899", bg: "#fce7f3" },
  { id: "girl-2", gender: "girl", hair: "#111827", shirt: "#e11d48", bg: "#ffe4e6" },
  { id: "girl-3", gender: "girl", hair: "#d97706", shirt: "#14b8a6", bg: "#ccfbf1" },
  { id: "girl-4", gender: "girl", hair: "#9a3412", shirt: "#8b5cf6", bg: "#f3e8ff" },
];

export function findAvatar(id: string | null | undefined): AvatarPreset | undefined {
  return AVATARS.find((a) => a.id === id);
}
