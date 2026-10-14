// แสดงระหว่างรอโหลดข้อมูลจากฐานข้อมูล (ใช้กับทุกหน้าโดยอัตโนมัติ)
export default function Loading() {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-slate-500">
      <span className="animate-bounce text-4xl">🏸</span>
      <p>กำลังโหลด...</p>
    </div>
  );
}
