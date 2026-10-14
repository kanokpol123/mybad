"use client";

import { useFormStatus } from "react-dom";

type Props = {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  /** ถ้าใส่ จะถามยืนยันก่อนส่งฟอร์ม (เหมาะกับปุ่มลบ) */
  confirmMessage?: string;
  className?: string;
};

const VARIANTS = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
  danger: "bg-white text-red-600 border border-red-300 hover:bg-red-50",
};

/**
 * ปุ่มส่งฟอร์มที่ขึ้น "กำลังบันทึก..." ให้อัตโนมัติ
 * ใช้ภายใน <form action={...}> เท่านั้น
 */
export default function SubmitButton({ children, variant = "primary", confirmMessage, className = "" }: Props) {
  const { pending } = useFormStatus(); // true ระหว่างที่ฟอร์มกำลังส่ง

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (confirmMessage && !confirm(confirmMessage)) e.preventDefault();
      }}
      className={`rounded-xl px-4 py-2.5 font-medium transition disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    >
      {pending ? "กำลังบันทึก..." : children}
    </button>
  );
}
