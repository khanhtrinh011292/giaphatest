"use client";

import { BookOpen, TreePine, Users } from "lucide-react";
import { Suspense } from "react";
import { DashboardProvider } from "@/components/DashboardContext";
import DashboardViews from "@/components/DashboardViews";
import ViewToggle from "@/components/ViewToggle";

interface Person {
  id: string;
  full_name: string;
  gender: string;
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  death_year: number | null;
  is_deceased: boolean;
  generation: number | null;
  birth_order: number | null;
  avatar_url: string | null;
  note: string | null;
  other_names: string | null;
}

interface Relationship {
  id: string;
  type: string;
  person_a: string;
  person_b: string;
}

interface Family {
  id: string;
  name: string;
  description: string | null;
}

interface Props {
  family: Family;
  persons: Person[];
  relationships: Relationship[];
  role: string;
  token: string;
}

export default function PublicFamilyView({ family, persons, relationships }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/60 to-stone-50 font-sans flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-stone-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <TreePine className="size-4 text-amber-700" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-stone-800 truncate text-base sm:text-lg">{family.name}</h1>
              <p className="text-xs text-stone-400 hidden sm:block">Chế độ xem công khai — chỉ đọc</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-400 shrink-0">
            <Users className="size-4" />
            <span>{persons.length} thành viên</span>
          </div>
        </div>
      </header>

      {/* Family description */}
      {family.description && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 w-full">
          <div className="bg-white/80 rounded-2xl border border-stone-200/60 p-5 flex gap-3">
            <BookOpen className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-stone-600 text-sm leading-relaxed">{family.description}</p>
          </div>
        </div>
      )}

      {/* ViewToggle toolbar — không có nút Gợi ý */}
      <Suspense>
        <DashboardProvider initialView="list">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-2 w-full flex items-center justify-between gap-4">
            <ViewToggle hideSuggestions />
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col">
            <DashboardViews
              persons={persons as any}
              relationships={relationships as any}
              canEdit={false}
            />
          </div>
        </DashboardProvider>
      </Suspense>

      <p className="text-center text-xs text-stone-400 py-6">
        Được chia sẻ qua link công khai &middot;{" "}
        <a href="/" className="hover:text-amber-600 transition-colors">GiaPhaOnline.vn</a>
      </p>
    </div>
  );
}
