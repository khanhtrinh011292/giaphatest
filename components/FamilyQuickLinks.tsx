"use client";

import Link from "next/link";
import {
  Network, GitMerge, BarChart2, CalendarDays,
  Baby, ClipboardList, Share2, Sparkles, Database, Map, Heart, Coins
} from "lucide-react";

interface QuickLink {
  href: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
}

function buildLinks(familyId: string, isOwner: boolean, isMemberOrEditor: boolean, shareRole: string | null): QuickLink[] {
  const canSeeFund = isOwner || isMemberOrEditor;
  // editor cũng thấy Chia sẻ (nhưng chỉ tab Link)
  const canShare = isOwner || shareRole === "admin" || shareRole === "editor";
  // Thứ tự gia phả chỉ owner và admin
  const canLineage = isOwner || shareRole === "admin";

  return [
    {
      href: `/dashboard/${familyId}?view=tree`,
      label: "Cây gia phả",
      sub: "Danh sách, Sơ đồ cây, Mindmap, Bong bóng",
      icon: <Network className="w-5 h-5" />,
      color: "text-amber-600",
      bg: "hover:bg-amber-50",
      border: "border-amber-100",
    },
    {
      href: `/dashboard/${familyId}/kinship`,
      label: "Tra cứu danh xưng",
      sub: "Xác định quan hệ họ hàng",
      icon: <GitMerge className="w-5 h-5" />,
      color: "text-blue-600",
      bg: "hover:bg-blue-50",
      border: "border-blue-100",
    },
    {
      href: `/dashboard/${familyId}/stats`,
      label: "Thống kê",
      sub: "Thống kê thành viên, phân bổ...",
      icon: <BarChart2 className="w-5 h-5" />,
      color: "text-purple-600",
      bg: "hover:bg-purple-50",
      border: "border-purple-100",
    },
    {
      href: `/dashboard/${familyId}/events`,
      label: "Lịch sự kiện",
      sub: "Giỗ, sinh nhật, rằm, mùng 1, lễ, tết,...",
      icon: <CalendarDays className="w-5 h-5" />,
      color: "text-rose-600",
      bg: "hover:bg-rose-50",
      border: "border-rose-100",
    },
    {
      href: `/dashboard/${familyId}/wedding`,
      label: "Coi Ngày Cưới",
      sub: "Trạch Nhật · Phối Mệnh · Giờ Hoàng Đạo",
      icon: <Heart className="w-5 h-5" />,
      color: "text-pink-600",
      bg: "hover:bg-pink-50",
      border: "border-pink-100",
    },
    {
      href: `/dashboard/${familyId}/baby-names`,
      label: "Chọn tên cho con",
      sub: "Tìm tên cho con theo gợi ý",
      icon: <Baby className="w-5 h-5" />,
      color: "text-pink-600",
      bg: "hover:bg-pink-50",
      border: "border-pink-100",
    },
    {
      href: `/dashboard/${familyId}/audit`,
      label: "Nhật ký thay đổi",
      sub: "Lịch sử chỉnh sửa dữ liệu",
      icon: <ClipboardList className="w-5 h-5" />,
      color: "text-orange-600",
      bg: "hover:bg-orange-50",
      border: "border-orange-100",
    },
    ...(canShare
      ? [{
        href: `/dashboard/${familyId}/share`,
        label: "Chia sẻ gia phả",
        sub: "Mời thành viên xem hoặc sửa",
        icon: <Share2 className="w-5 h-5" />,
        color: "text-green-600",
        bg: "hover:bg-green-50",
        border: "border-green-100",
      }]
      : []),
    ...(canLineage
      ? [{
        href: `/dashboard/${familyId}/lineage`,
        label: "Thứ tự gia phả",
        sub: "Xếp thứ bậc, đời gia phả",
        icon: <Sparkles className="w-5 h-5" />,
        color: "text-indigo-600",
        bg: "hover:bg-indigo-50",
        border: "border-indigo-100",
      }]
      : []),
    ...(canSeeFund
      ? [{
        href: `/dashboard/${familyId}/fund`,
        label: "Quỹ gia phả",
        sub: isOwner ? "Quản lý thu chi, đóng góp quỹ" : "Xem thông tin và nhật ký quỹ",
        icon: <Coins className="w-5 h-5" />,
        color: "text-amber-600",
        bg: "hover:bg-amber-50",
        border: "border-amber-100",
      }]
      : []),
    ...(isOwner
      ? [{
        href: `/dashboard/${familyId}/data`,
        label: "Sao lưu & Phục hồi",
        sub: "Xuất, nhập dữ liệu gia phả",
        icon: <Database className="w-5 h-5" />,
        color: "text-teal-600",
        bg: "hover:bg-teal-50",
        border: "border-teal-100",
      }]
      : []),
  ];
}

interface Props {
  familyId: string;
  isOwner: boolean;
  isMemberOrEditor?: boolean;
  shareRole?: string | null;
  fundBalance?: number | null;
}

export default function FamilyQuickLinks({
  familyId,
  isOwner,
  isMemberOrEditor = false,
  shareRole = null,
  fundBalance,
}: Props) {
  const links = buildLinks(familyId, isOwner, isMemberOrEditor, shareRole);
  const canSeeFund = isOwner || isMemberOrEditor;

  return (
    <section className="space-y-3 pb-8">
      {canSeeFund && fundBalance !== null && fundBalance !== undefined && (
        <Link
          href={`/dashboard/${familyId}/fund`}
          className="block rounded-2xl border border-stone-100 bg-white px-4 py-3 shadow-sm transition hover:bg-stone-50 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-amber-600 bg-white shadow-sm border border-amber-100">
              <Coins className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-800">Quỹ gia phả</p>
              <p className="text-xs text-stone-400">
                {isOwner ? "Nhấn để quản lý thu chi" : "Xem nhật ký thu chi"}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-bold ${fundBalance >= 0 ? "text-green-700" : "text-red-600"}`}>
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(fundBalance)}
              </p>
              <span className="text-stone-300 text-base">›</span>
            </div>
          </div>
        </Link>
      )}

      <div className="flex items-center gap-2">
        <Map className="w-4 h-4 text-stone-400" />
        <h2 className="text-sm font-bold text-stone-500 uppercase tracking-wider">
          Danh mục
        </h2>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        {links.map((link, i) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-4 px-4 py-3.5 transition-colors ${link.bg
              } ${i < links.length - 1 ? "border-b border-stone-50" : ""
              } group`}
          >
            <div
              className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${link.color} bg-white shadow-sm border ${link.border}`}
            >
              {link.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-stone-800">{link.label}</p>
              <p className="text-xs text-stone-400 truncate">{link.sub}</p>
            </div>
            <span className="text-stone-300 text-base group-hover:translate-x-0.5 transition-transform">›</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
