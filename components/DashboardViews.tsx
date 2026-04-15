"use client";

import { useDashboard } from "@/components/DashboardContext";
import DashboardMemberList from "@/components/DashboardMemberList";
import RootSelector from "@/components/RootSelector";
import { Person, Relationship } from "@/types";
import { useMemo } from "react";
import dynamic from "next/dynamic";

const FamilyTree = dynamic(() => import("@/components/FamilyTree"));
const MindmapTree = dynamic(() => import("@/components/MindmapTree"));
const BubbleMapTree = dynamic(
  () => import("@/components/BubbleMapTree").catch(() => ({
    default: () => (
      <div className="flex absolute inset-0 items-center justify-center p-4 text-center bg-stone-50 rounded-2xl border border-stone-200/60 shadow-inner text-stone-500">
        Tính năng này không được hỗ trợ trên trình duyệt của bạn.
      </div>
    ),
  })),
  { ssr: false },
);

interface DashboardViewsProps {
  persons: Person[];
  relationships: Relationship[];
  canEdit?: boolean;
  familyId?: string;
}

export default function DashboardViews({
  persons,
  relationships,
  canEdit = false,
  familyId,
}: DashboardViewsProps) {
  const { view: currentView, rootId } = useDashboard();

  const { personsMap, roots, defaultRootId } = useMemo(() => {
    const pMap = new Map<string, Person>();
    persons.forEach((p) => pMap.set(p.id, p));

    const childIds = new Set(
      relationships
        .filter((r) => r.type === "biological_child" || r.type === "adopted_child")
        .map((r) => r.person_b),
    );

    let finalRootId = rootId;
    if (!finalRootId || !pMap.has(finalRootId)) {
      const rootsFallback = persons.filter((p) => !childIds.has(p.id));
      if (rootsFallback.length > 0) {
        const gen1 = rootsFallback.filter((p) => p.generation === 1);
        const sortByBirthYear = (a: Person, b: Person) => (a.birth_year ?? Infinity) - (b.birth_year ?? Infinity);
        finalRootId = (gen1.length > 0 ? gen1 : rootsFallback).sort(sortByBirthYear)[0].id;
      } else if (persons.length > 0) {
        finalRootId = persons[0].id;
      }
    }

    return {
      personsMap: pMap,
      roots: finalRootId && pMap.has(finalRootId) ? [pMap.get(finalRootId)!] : [],
      defaultRootId: finalRootId,
    };
  }, [persons, relationships, rootId]);

  const activeRootId = rootId || defaultRootId;

  return (
    <>
      <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col">
        {currentView !== "list" && persons.length > 0 && activeRootId && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 w-full flex flex-col sm:flex-row flex-wrap items-center sm:justify-between gap-4 relative z-20">
            <RootSelector persons={persons} currentRootId={activeRootId} />
            <div id="tree-toolbar-portal" className="flex items-center gap-2 flex-wrap justify-center" />
          </div>
        )}
        {currentView === "list" && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full relative z-10">
            <DashboardMemberList
              initialPersons={persons}
              relationships={relationships}
              canEdit={canEdit}
              familyId={familyId}
            />
          </div>
        )}
        <div className="flex-1 w-full relative z-10">
          {currentView === "tree" && <FamilyTree personsMap={personsMap} relationships={relationships} roots={roots} canEdit={canEdit} familyId={familyId} />}
          {currentView === "mindmap" && <MindmapTree personsMap={personsMap} relationships={relationships} roots={roots} canEdit={canEdit} familyId={familyId} />}
          {currentView === "bubble" && <BubbleMapTree personsMap={personsMap} relationships={relationships} roots={roots} canEdit={canEdit} familyId={familyId} />}
        </div>
      </main>
    </>
  );
}
