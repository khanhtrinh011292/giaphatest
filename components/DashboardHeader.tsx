import config from "@/app/config";
import DarkModeToggle from "@/components/DarkModeToggle";
import HeaderMenu from "@/components/HeaderMenu";
import Image from "next/image";
import Link from "next/link";

export default function DashboardHeader({ familyId }: { familyId?: string }) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-stone-950/90 backdrop-blur-sm border-b border-stone-200 dark:border-stone-800 shadow-sm transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Logo + Family link */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link
            href="/dashboard"
            className="group flex items-center gap-2 sm:gap-3 shrink-0"
          >
            <div className="relative size-8 rounded-lg overflow-hidden shrink-0 border border-stone-200/50 dark:border-stone-700 transition-all">
              <Image
                src="/icon.png"
                alt="Logo"
                fill
                className="object-contain"
                sizes="32px"
              />
            </div>
            <h1 className="hidden sm:block text-xl sm:text-2xl font-serif font-bold text-stone-800 dark:text-stone-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
              {config.siteName}
            </h1>
          </Link>

          {familyId && (
            <>
              <span className="text-stone-300 dark:text-stone-600 font-light hidden sm:block">/</span>
              <Link
                href={`/dashboard/${familyId}/board`}
                className="text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-amber-700 dark:hover:text-amber-400 transition-colors truncate max-w-[140px] sm:max-w-xs"
              >
                <FamilyName familyId={familyId} />
              </Link>
            </>
          )}
        </div>

        {/* Right: Dark mode toggle + Menu */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <DarkModeToggle />
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
