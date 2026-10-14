/** หน้าจอ "กำลังโหลด..." แสดงระหว่างรอข้อมูลจากฐานข้อมูล */
export default function LoadingScreen() {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-slate-500">
      <span className="animate-bounce text-4xl">🏸</span>
      <p>กำลังโหลด...</p>
    </div>
  );
}
