import Link from "next/link";

/** หัวข้อของแต่ละหน้า พร้อมปุ่มย้อนกลับ (ถ้ามี) */
export default function PageHeader({
  title,
  subtitle,
  backHref,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
}) {
  return (
    <header className="mb-6">
      {backHref && (
        <Link href={backHref} className="mb-2 inline-block text-sm text-slate-500">
          ← ย้อนกลับ
        </Link>
      )}
      <h1 className="text-2xl font-bold">{title}</h1>
      {subtitle && <p className="mt-1 text-slate-500">{subtitle}</p>}
    </header>
  );
}
