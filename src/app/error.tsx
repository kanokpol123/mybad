"use client"; // หน้า error ต้องเป็น Client Component เสมอ

// แสดงเมื่อเกิดข้อผิดพลาด เช่น ต่อฐานข้อมูลไม่ได้
export default function Error({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <span className="text-4xl">😵</span>
      <h2 className="text-lg font-semibold">เกิดข้อผิดพลาด</h2>
      <p className="text-sm text-slate-500">{error.message}</p>
      <button onClick={() => retry()} className="rounded-xl bg-brand px-5 py-2 text-white">
        ลองใหม่
      </button>
    </div>
  );
}
