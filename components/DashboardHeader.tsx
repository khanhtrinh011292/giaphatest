import config from "@/app/config";
import HeaderMenu from "@/components/HeaderMenu";
import Image from "next/image";
import Link from "next/link";

// #1: Nhận familyName qua prop thay vì query lại Supabase
export default function DashboardHeader({
  familyId,
  familyName,
}: {
  familyId?: string;
  familyName?: string;
}) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 border-b border-stone-200 shadow-sm transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Logo + Family link */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link
            href="/dashboard"
            className="group flex items-center gap-2 sm:gap-3 shrink-0"
          >
            <div className="relative size-8 rounded-lg overflow-hidden shrink-0 border border-stone-200/50 transition-all">
              <Image
                src="/icon.png"
                alt="Logo"
                fill
                className="object-contain"
                sizes="32px"
              />
            </div>
            <h1 className="hidden sm:block text-xl sm:text-2xl font-serif font-bold text-stone-800 group-hover:text-amber-700 transition-colors">
              {config.siteName}
            </h1>
          </Link>

          {familyId && familyName && (
            <>
              <span className="text-stone-300 font-light hidden sm:block">/</span>
              <Link
                href={`/dashboard/${familyId}/board`}
                className="text-sm font-medium text-stone-600 hover:text-amber-700 transition-colors truncate max-w-[140px] sm:max-w-xs"
              >
                {familyName}
              </Link>
            </>
          )}
        </div>

        {/* Right: Menu */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <HeaderMenu familyId={familyId} />
        </div>
      </div>
    </header>
  );
}
