// ข้อมูลแอปสำหรับมือถือ: ตอนกด "เพิ่มไปยังหน้าจอโฮม" จะได้ไอคอน + ชื่อนี้
// และเปิดแบบเต็มจอเหมือนแอปจริง (ไม่มีแถบ URL ของเบราว์เซอร์)
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MyBad ก๊วนแบด",
    short_name: "MyBad",
    description: "สุ่มคู่ตีแบดมินตัน + นับแต้ม สำหรับก๊วนเพื่อน",
    start_url: "/",
    display: "standalone",
    background_color: "#f1f5f9",
    theme_color: "#059669",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
