import Link from "next/link";

// แสดงเมื่อเปิด URL ที่ไม่มีอยู่ หรือเรียก notFound() ในหน้าใดๆ
export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <span className="text-4xl">🤷</span>
      <h2 className="text-lg font-semibold">ไม่พบหน้านี้</h2>
      <Link href="/" className="text-brand underline">
        กลับหน้าแรก
      </Link>
    </div>
  );
}
