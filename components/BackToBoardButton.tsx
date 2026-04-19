"use client";

import { LayoutDashboard } from "lucide-react";
import Link from "next/link";

export default function BackToBoardButton({ familyId }: { familyId: string }) {
  return (
    <Link
      href={`/dashboard/${familyId}/board`}
      className="inline-flex items-center gap-2 px-4 py-1.5 sm:py-2.5 text-sm font-semibold rounded-full border border-stone-200/60 bg-white shadow-sm text-stone-500 hover:text-amber-700 hover:border-amber-300 hover:bg-amber-50 transition-all duration-200 mb-4"
    >
      <LayoutDashboard className="size-4 sm:size-4 text-stone-400" />
      <span className="hidden sm:block tracking-wide">Trở về bảng tin</span>
    </Link>
  );
}
