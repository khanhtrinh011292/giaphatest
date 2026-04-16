"use client";

import Link from "next/link";
import {
  Network, GitMerge, BarChart2, CalendarDays,
  Baby, ClipboardList, Share2, Sparkles, Database
} from "lucide-react";

interface QuickLink {
  href: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

function buildLinks(familyId: string, isOwner: boolean): QuickLink[] {
  const all: QuickLink[] = [
    {
      href: `/dashboard/${familyId}/members`,
      label: "Cây gia phả",
      sub: "Xem đầy đủ sơ đồ gia đình",
      icon: <Network className="w-5 h-5" />,
      color: "text-amber-600",
      bg: "bg-amber-50 hover:bg-amber-100",
    },
    {
      href: `/dashboard/${familyId}/kinship`,
      label: "Tra cứu danh xưng",
      sub: "Xác định quan hệ họ hàng",
      icon: <GitMerge className="w-5 h-5" />,
      color: "text-blue-600",
      bg: "bg-blue-50 hover:bg-blue-100",
    },
    {
      href: `/dashboard/${familyId}/stats`,
      label: "Thống kê",
      sub: "Số liệu thành viên, địa bàn...",
      icon: <BarChart2 className="w-5 h-5" />,
      color: "text-purple-600",
      bg: "bg-purple-50 hover:bg-purple-100",
    },
    {
      href: `/dashboard/${familyId}/events`,
      label: "Lịch sự kiện",
      sub: "Giỗ, sinh nhật, đám giỗ...",
      icon: <CalendarDays className="w-5 h-5" />,
      color: "text-rose-600",
      bg: "bg-rose-50 hover:bg-rose-100",
    },
    {
      href: `/dashboard/${familyId}/baby-names`,
      label: "Gợi ý tên cho con",
      sub: "Tạo tên theo dòng họ",
      icon: <Baby className="w-5 h-5" />,
      color: "text-pink-600",
      bg: "bg-pink-50 hover:bg-pink-100",
    },
    {
      href: `/dashboard/${familyId}/audit`,
      label: "Nhật ký thay đổi",
      sub: "Lịch sử chỉnh sửa dữ liệu",
      icon: <ClipboardList className="w-5 h-5" />,
      color: "text-orange-600",
      bg: "bg-orange-50 hover:bg-orange-100",
    },
    {
      href: `/dashboard/${familyId}/share`,
      label: "Chia sẻ gia phả",
      sub: "Mời thành viên xem hoặc sửa",
      icon: <Share2 className="w-5 h-5" />,
      color: "text-green-600",
      bg: "bg-green-50 hover:bg-green-100",
    },
    {
      href: `/dashboard/${familyId}/lineage`,
      label: "Thứ tự gia phả",
      sub: "Xếp thứ bẬ, đời gia phả",
      icon: <Sparkles className="w-5 h-5" />,
      color: "text-indigo-600",
      bg: "bg-indigo-50 hover:bg-indigo-100",
    },
    ...(isOwner ? [{
      href: `/dashboard/${familyId}/data`,
      label: "Sao lưu & Phục hồi",
      sub: "Xuất, nhập dữ liệu gia phả",
      icon: <Database className="w-5 h-5" />,
      color: "text-teal-600",
      bg: "bg-teal-50 hover:bg-teal-100",
    }] : []),
  ];
  return all;
}

export default function FamilyQuickLinks({
  familyId,
  isOwner,
}: {
  familyId: string;
  isOwner: boolean;
}) {
  const links = buildLinks(familyId, isOwner);

  return (
    <section className="space-y-3 pb-8">
      <div className="flex items-center gap-2">
        <span className="text-sm">\uD83D\uDDFA\uFE0F</span>
        <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wider">Danh mục</h2>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden divide-y divide-stone-50">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-4 px-4 py-3.5 transition-colors ${link.bg} group`}
          >
            <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${link.color} bg-white shadow-sm border border-stone-100`}>
              {link.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold text-stone-800 group-hover:${link.color} transition-colors`}>
                {link.label}
              </p>
              <p className="text-xs text-stone-400 truncate">{link.sub}</p>
            </div>
            <span className="text-stone-300 text-sm">›</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
