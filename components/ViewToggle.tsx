"use client";

import { motion } from "framer-motion";
import { Circle, Lightbulb, List, ListTree, Network } from "lucide-react";
import { useDashboard } from "./DashboardContext";

export type ViewMode = "list" | "tree" | "mindmap" | "bubble";

export default function ViewToggle() {
  const { view: currentView, setView, showSuggestions, setShowSuggestions } = useDashboard();

  const tabs = [
    { id: "list", label: "Danh sách", icon: <List className="size-6 sm:size-4" /> },
    { id: "tree", label: "Sơ đồ cây", icon: <Network className="size-6 sm:size-4" /> },
    { id: "mindmap", label: "Mindmap", icon: <ListTree className="size-6 sm:size-4" /> },
    { id: "bubble", label: "Bong bóng", icon: <Circle className="size-6 sm:size-4" /> },
  ] as const;

  return (
    <div className="flex items-center justify-center gap-2 mt-4 mb-2">
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

      {/* Suggestions toggle button */}
      <button
        onClick={() => setShowSuggestions(!showSuggestions)}
        title={showSuggestions ? "Tắt gợi ý quan hệ" : "Bật gợi ý quan hệ thông minh"}
        className={`relative flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-full border text-sm font-semibold transition-all duration-200 z-10 ${
          showSuggestions
            ? "bg-amber-100 border-amber-300 text-amber-700 shadow-sm shadow-amber-100"
            : "bg-stone-100 border-stone-200/60 text-stone-400 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200"
        }`}
      >
        <Lightbulb className="size-4 sm:size-4" />
        <span className="hidden sm:block">{showSuggestions ? "Gợi ý: Bật" : "Gợi ý"}</span>
        {showSuggestions && (
          <motion.div
            layoutId="suggestionGlow"
            className="absolute inset-0 rounded-full bg-amber-200/30"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </button>
    </div>
  );
}
