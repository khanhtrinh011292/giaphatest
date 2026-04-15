"use client";

import {
  BarChart2,
  CalendarDays,
  ClipboardList,
  Database,
  GitMerge,
  Network,
  Share2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFamilyContext } from "./FamilyContextProvider";

const NAV_ITEMS = [
  { label: "Cây gia phả", icon: Network, path: "", exact: true, color: "amber" },
  { label: "Danh xưng", icon: GitMerge, path: "/kinship", color: "blue" },
  { label: "Sự kiện", icon: CalendarDays, path: "/events", color: "rose" },
  { label: "Thống kê", icon: BarChart2, path: "/stats", color: "purple" },
  { label: "Nhật ký", icon: ClipboardList, path: "/audit", color: "teal" },
  { label: "Chia sẻ", icon: Share2, path: "/share", color: "green" },
] as const;

const ADMIN_ITEMS = [
  { label: "Thứ tự", icon: Sparkles, path: "/lineage", color: "indigo" },
  { label: "Sao lưu", icon: Database, path: "/data", color: "stone" },
] as const;

const COLOR_MAP: Record<string, { active: string; hover: string; icon: string }> = {
  amber:  { active: "border-amber-500 text-amber-700",   hover: "hover:text-amber-700 hover:border-amber-300",  icon: "text-amber-500" },
  blue:   { active: "border-blue-500 text-blue-700",     hover: "hover:text-blue-700 hover:border-blue-300",    icon: "text-blue-500" },
  rose:   { active: "border-rose-500 text-rose-700",     hover: "hover:text-rose-700 hover:border-rose-300",    icon: "text-rose-500" },
  purple: { active: "border-purple-500 text-purple-700", hover: "hover:text-purple-700 hover:border-purple-300",icon: "text-purple-500" },
  teal:   { active: "border-teal-500 text-teal-700",     hover: "hover:text-teal-700 hover:border-teal-300",    icon: "text-teal-500" },
  green:  { active: "border-green-500 text-green-700",   hover: "hover:text-green-700 hover:border-green-300",  icon: "text-green-500" },
  indigo: { active: "border-indigo-500 text-indigo-700", hover: "hover:text-indigo-700 hover:border-indigo-300",icon: "text-indigo-500" },
  stone:  { active: "border-stone-500 text-stone-700",   hover: "hover:text-stone-600 hover:border-stone-300",  icon: "text-stone-500" },
};

export default function DashboardNav({ familyId }: { familyId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/${familyId}`;

  let canAdmin = false;
  let isOwner = false;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const ctx = useFamilyContext();
    canAdmin = ctx.canAdmin;
    isOwner  = ctx.isOwner;
  } catch {}

  const allItems = [
    ...NAV_ITEMS,
    ...(canAdmin ? [ADMIN_ITEMS[0]] : []),
    ...(isOwner  ? [ADMIN_ITEMS[1]] : []),
  ];

  return (
    <nav className="max-w-7xl mx-auto px-2 sm:px-6 overflow-x-auto scrollbar-none">
      <div className="flex items-end gap-0.5 sm:gap-1 min-w-max">
        {allItems.map(({ label, icon: Icon, path, color }) => {
          const href = `${base}${path}`;
          const isActive = path === ""
            ? pathname === base || pathname === `${base}/`
            : pathname.startsWith(href);
          const c = COLOR_MAP[color];
          return (
            <Link
              key={path}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? `${c.active} bg-transparent`
                  : `border-transparent text-stone-500 ${c.hover}`
              }`}
            >
              <Icon className={`size-3.5 sm:size-4 shrink-0 ${isActive ? c.icon : ""}`} />
              <span className="hidden xs:inline sm:inline">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
