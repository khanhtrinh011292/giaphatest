"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Circle, Lightbulb, List, ListTree, Network } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboard } from "./DashboardContext";

export type ViewMode = "list" | "tree" | "mindmap" | "bubble";

export default function ViewToggle() {
  const { view: currentView, setView, showSuggestions, setShowSuggestions } = useDashboard();
  const pathname = usePathname();

  // Extract familyId from /dashboard/[familyId] or /dashboard/[familyId]/...
  const familyId = pathname?.split("/")[2] ?? null;
  const boardHref = familyId ? `/dashboard/${familyId}/board` : "/dashboard";

  const tabs = [
    { id: "list", label: "Danh sách", icon: <List className="size-6 sm:size-4" /> },
    { id: "tree", label: "Sơ đồ cây", icon: <Network className="size-6 sm:size-4" /> },
    { id: "mindmap", label: "Mindmap", icon: <ListTree className="size-6 sm:size-4" /> },
    { id: "bubble", label: "Bong bóng", icon: <Circle className="size-6 sm:size-4" /> },
  ] as const;

  return (
    <div className="flex flex-col items-center gap-2 mt-4 mb-2">
      {/* Nút trở về bảng tin */}
      <Link
        href={boardHref}
        className="flex items-center gap-1.5 text-xs font-semibold text-stone-400 hover:text-amber-600 transition-colors mb-1"
      >
        <ArrowLeft className="size-3.5" />
        Bảng tin
      </Link>

      {/* View tabs */}
      <div className="flex bg-stone-200/50 p-1.5 rounded-full shadow-inner w-fit relative border border-stone-200/60 backdrop-blur-sm z-10">
        {tabs.map((tab) => {
          const isActive = currentView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setView(tab.id as ViewMode)}
              className={`relative px-4 sm:px-6 py-1.5 sm:py-2.5 text-sm font-semibold rounded-full transition-colors duration-300 ease-in-out z-10 flex items-center gap-2 ${
                isActive ? "text-stone-900" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white rounded-full shadow-sm border border-stone-200/60 z-[-1]"
                  transition={{ type: "spring", stiffness: 450, damping: 30 }}
                />
              )}
              <span className={`transition-colors duration-300 ${isActive ? "text-amber-700" : "text-stone-400"}`}>
                {tab.icon}
              </span>
              <span className="hidden sm:block tracking-wide">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Suggestions toggle — hàng riêng bên dưới */}
      <button
        onClick={() => setShowSuggestions(!showSuggestions)}
        className={`relative flex items-center gap-2 px-5 py-2 rounded-full border text-sm font-semibold transition-all duration-200 z-10 ${
          showSuggestions
            ? "bg-amber-100 border-amber-300 text-amber-700 shadow-sm shadow-amber-100"
            : "bg-stone-100 border-stone-200/60 text-stone-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200"
        }`}
      >
        <Lightbulb className="size-4 shrink-0" />
        <span>Gợi ý quan hệ thông minh</span>
        {showSuggestions && (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="ml-1 text-[10px] font-bold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full"
          >
            Đang bật
          </motion.span>
        )}
      </button>
    </div>
  );
}
