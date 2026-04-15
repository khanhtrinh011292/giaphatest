import config from "@/app/config";
import DashboardNav from "@/components/DashboardNav";
import HeaderUserMenu from "@/components/HeaderUserMenu";
import Image from "next/image";
import Link from "next/link";
import { getSupabase } from "@/utils/supabase/queries";

export default async function DashboardHeader({ familyId }: { familyId?: string }) {
  let familyName = "Gia phả";
  if (familyId) {
    try {
      const supabase = await getSupabase();
      const { data } = await supabase.from("families").select("name").eq("id", familyId).single();
      if (data?.name) familyName = data.name;
    } catch {}
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-stone-200 shadow-sm">
      {/* Top bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Logo */}
        <Link href="/dashboard" className="group flex items-center gap-2.5 shrink-0">
          <div className="relative size-7 rounded-lg overflow-hidden border border-stone-200/60">
            <Image src="/icon.png" alt="Logo" fill className="object-contain" sizes="28px" />
          </div>
          <span className="hidden sm:block font-serif font-bold text-stone-800 text-lg group-hover:text-amber-700 transition-colors">
            {config.siteName}
          </span>
        </Link>

        {/* Center: Family name breadcrumb */}
        {familyId && (
          <div className="flex items-center gap-2 min-w-0 flex-1 justify-center sm:justify-start">
            <span className="text-stone-300 hidden sm:block">/</span>
            <span className="text-sm font-semibold text-stone-700 truncate max-w-[160px] sm:max-w-xs">
              {familyName}
            </span>
          </div>
        )}

        {/* Right: User avatar menu */}
        <HeaderUserMenu familyId={familyId} />
      </div>

      {/* Bottom nav tabs (only when inside a family) */}
      {familyId && <DashboardNav familyId={familyId} />}
    </header>
  );
}
