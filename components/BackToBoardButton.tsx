"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function BackToBoardButton({ familyId }: { familyId: string }) {
  return (
    <Link
      href={`/dashboard/${familyId}/board`}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-amber-700 transition-colors group mb-4"
    >
      <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
      Trở về bảng tin
    </Link>
  );
}
