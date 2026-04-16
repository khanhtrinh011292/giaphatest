import config from "@/app/config";
import HeaderMenu from "@/components/HeaderMenu";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { headers } from "next/headers";

export default async function DashboardHeader({ familyId }: { familyId?: string }) {
  // Kiểm tra xem đang ở trang con (không phải /board và không phải trang gốc)
  let showBackToBoard = false;
  if (familyId) {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") ?? headersList.get("x-invoke-path") ?? "";
    // Hiện nút trở về khi: có familyId và KHÔNG phải /board và KHÔNG phải trang gốc
    const isBoard = pathname.endsWith("/board") || pathname.endsWith("/board/");
    const isRoot = pathname === `/dashboard/${familyId}` || pathname === `/dashboard/${familyId}/`;
    const hasQuery = pathname.includes("?");
    showBackToBoard = !isBoard && !isRoot && !hasQuery;
  }

  return (
    <header className="sticky top-0 z-30 bg-white/80 border-b border-stone-200 shadow-sm transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Logo + breadcrumb + back button */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link
            href="/dashboard"
            className="group flex items-center gap-2 sm:gap-3 shrink-0"
          >
            <div className="relative size-8 rounded-lg overflow-hidden shrink-0 border border-stone-200/50 transition-all">
              <Image src="/icon.png" alt="Logo" fill className="object-contain" sizes="32px" />
            </div>
            <h1 className="hidden sm:block text-xl sm:text-2xl font-serif font-bold text-stone-800 group-hover:text-amber-700 transition-colors">
              {config.siteName}
            </h1>
          </Link>

          {familyId && (
            <>
              <span className="text-stone-300 font-light hidden sm:block">/</span>
              <Link
                href={`/dashboard/${familyId}/board`}
                className="text-sm font-medium text-stone-600 hover:text-amber-700 transition-colors truncate max-w-[120px] sm:max-w-xs"
              >
                <FamilyName familyId={familyId} />
              </Link>
            </>
          )}

          {/* Nút ← Trở về Bảng tin — hiện khi đang trong trang con của danh mục */}
          {showBackToBoard && familyId && (
            <Link
              href={`/dashboard/${familyId}/board`}
              className="hidden sm:flex items-center gap-1.5 ml-1 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold border border-amber-200/60 transition-all"
            >
              <ArrowLeft className="size-3.5" />
              Bảng tin
            </Link>
          )}
        </div>

        {/* Right: back button (mobile) + menu */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {showBackToBoard && familyId && (
            <Link
              href={`/dashboard/${familyId}/board`}
              className="sm:hidden flex items-center justify-center size-8 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200/60 transition-all"
              title="Trở về Bảng tin"
            >
              <ArrowLeft className="size-4" />
            </Link>
          )}
          <HeaderMenu familyId={familyId} />
        </div>
      </div>
    </header>
  );
}

async function FamilyName({ familyId }: { familyId: string }) {
  try {
    const { getSupabase } = await import("@/utils/supabase/queries");
    const supabase = await getSupabase();
    const { data } = await supabase
      .from("families")
      .select("name")
      .eq("id", familyId)
      .single();
    return <>{data?.name ?? "Gia phả"}</>;
  } catch {
    return <>Gia phả</>;
  }
}
