"use client";

import { deleteRelationship } from "@/app/actions/member";
import { DashboardContext, useDashboard } from "@/components/DashboardContext";
import { Person, RelationshipType } from "@/types";
import { getAvatarBg } from "@/utils/styleHelprs";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import DefaultAvatar from "./DefaultAvatar";
import SingleAddModal from "./relationship/SingleAddModal";
import BulkAddChildrenModal from "./relationship/BulkAddChildrenModal";
import QuickAddSpouseModal from "./relationship/QuickAddSpouseModal";

interface RelationshipManagerProps {
  person: Person;
  isAdmin: boolean;
  canEdit?: boolean;
  onStatsLoaded?: (stats: {
    biologicalChildren: number;
    maleBiologicalChildren: number;
    femaleBiologicalChildren: number;
    paternalGrandchildren: number;
    maternalGrandchildren: number;
    sonInLaw: number;
    daughterInLaw: number;
  }) => void;
}

interface EnrichedRelationship {
  id: string;
  type: RelationshipType;
  direction: "parent" | "child" | "spouse" | "child_in_law";
  targetPerson: Person;
  note: string | null;
}

export default function RelationshipManager({
  person,
  isAdmin,
  canEdit = false,
  onStatsLoaded,
}: RelationshipManagerProps) {
  const supabase = createClient();
  const dashboardContext = useContext(DashboardContext);
  const { setMemberModalId } = useDashboard();
  const router = useRouter();

  const personId = person.id;
  const personGender = person.gender;
  const familyId = person.family_id;

  // FIX #2: Stable ref for onStatsLoaded to prevent infinite re-render
  // when parent passes an inline arrow function.
  const onStatsLoadedRef = useRef(onStatsLoaded);
  useEffect(() => {
    onStatsLoadedRef.current = onStatsLoaded;
  }, [onStatsLoaded]);

  const handlePersonClick = (id: string) => {
    if (dashboardContext !== undefined) {
      setMemberModalId(id);
    } else {
      router.push(`/dashboard/members/${id}`);
    }
  };

  const [relationships, setRelationships] = useState<EnrichedRelationship[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAddingBulk, setIsAddingBulk] = useState(false);
  const [isAddingSpouse, setIsAddingSpouse] = useState(false);

  // FIX #1: Merged 4–5 separate Supabase round-trips into a single parallel fetch,
  // then process in-laws and grandchildren in JS. Reduces DB round-trips from 4–5 → 2.
  // FIX #2: Removed onStatsLoaded from deps array; use stable ref instead.
  const fetchRelationships = useCallback(async () => {
    try {
      // Single parallel fetch for all relationships involving this person
      const [{ data: relsA, error: errA }, { data: relsB, error: errB }] =
        await Promise.all([
          supabase
            .from("relationships")
            .select(`*, target:persons!person_b(*)`)
            .eq("person_a", personId),
          supabase
            .from("relationships")
            .select(`*, target:persons!person_a(*)`)
            .eq("person_b", personId),
        ]);

      if (errA || errB) throw errA || errB;

      const formattedRels: EnrichedRelationship[] = [];

      relsA?.forEach((r) => {
        let direction: "parent" | "child" | "spouse" = "spouse";
        if (r.type === "marriage") direction = "spouse";
        else if (r.type === "biological_child" || r.type === "adopted_child")
          direction = "child";

        formattedRels.push({
          id: r.id,
          type: r.type,
          direction,
          targetPerson: r.target,
          note: r.note,
        });
      });

      relsB?.forEach((r) => {
        let direction: "parent" | "child" | "spouse" = "spouse";
        if (r.type === "marriage") direction = "spouse";
        else if (r.type === "biological_child" || r.type === "adopted_child")
          direction = "parent";

        formattedRels.push({
          id: r.id,
          type: r.type,
          direction,
          targetPerson: r.target,
          note: r.note,
        });
      });

      const childrenIds = formattedRels
        .filter((r) => r.direction === "child")
        .map((r) => r.targetPerson.id);

      // Batch fetch in-laws AND grandchildren in a single parallel round-trip
      const [childrenMarriagesResult, grandchildrenResult] = await Promise.all([
        childrenIds.length > 0
          ? supabase
              .from("relationships")
              .select(
                `*, person_a_data:persons!person_a(*), person_b_data:persons!person_b(*)`,
              )
              .eq("type", "marriage")
              .or(
                `person_a.in.(${childrenIds.join(",")}),person_b.in.(${childrenIds.join(",")})`,
              )
          : Promise.resolve({ data: [], error: null }),
        childrenIds.length > 0
          ? supabase
              .from("relationships")
              .select("id, person_a")
              .in("type", ["biological_child", "adopted_child"])
              .in("person_a", childrenIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      // Process in-laws
      if (childrenMarriagesResult.data) {
        childrenMarriagesResult.data.forEach((m) => {
          const isAChild = childrenIds.includes(m.person_a);
          const childPerson = isAChild ? m.person_a_data : m.person_b_data;
          const spousePerson = isAChild ? m.person_b_data : m.person_a_data;

          if (spousePerson && childPerson) {
            const spouseGender = spousePerson.gender;
            let noteLabel = `Vợ/chồng của ${childPerson.full_name}`;
            if (spouseGender === "female")
              noteLabel = `Con dâu (vợ của ${childPerson.full_name})`;
            if (spouseGender === "male")
              noteLabel = `Con rể (chồng của ${childPerson.full_name})`;
            if (m.note) noteLabel += ` - ${m.note}`;

            formattedRels.push({
              id: m.id + "_inlaw",
              type: "marriage",
              direction: "child_in_law",
              targetPerson: spousePerson,
              note: noteLabel,
            });
          }
        });
      }

      // Process stats using already-fetched grandchildren data
      if (onStatsLoadedRef.current) {
        const biologicalChildrenList = formattedRels.filter(
          (r) => r.direction === "child" && r.type === "biological_child",
        );
        const biologicalChildren = biologicalChildrenList.length;
        const maleBiologicalChildren = biologicalChildrenList.filter(
          (c) => c.targetPerson.gender === "male",
        ).length;
        const femaleBiologicalChildren = biologicalChildrenList.filter(
          (c) => c.targetPerson.gender === "female",
        ).length;

        const daughterInLaw = formattedRels.filter(
          (r) =>
            r.direction === "child_in_law" &&
            r.targetPerson.gender === "female",
        ).length;
        const sonInLaw = formattedRels.filter(
          (r) =>
            r.direction === "child_in_law" && r.targetPerson.gender === "male",
        ).length;

        let paternalGrandchildren = 0;
        let maternalGrandchildren = 0;

        if (grandchildrenResult.data && grandchildrenResult.data.length > 0) {
          const maleChildrenIds = formattedRels
            .filter(
              (r) =>
                r.direction === "child" && r.targetPerson.gender === "male",
            )
            .map((r) => r.targetPerson.id);
          const femaleChildrenIds = formattedRels
            .filter(
              (r) =>
                r.direction === "child" && r.targetPerson.gender === "female",
            )
            .map((r) => r.targetPerson.id);

          paternalGrandchildren = grandchildrenResult.data.filter((g) =>
            maleChildrenIds.includes(g.person_a),
          ).length;
          maternalGrandchildren = grandchildrenResult.data.filter((g) =>
            femaleChildrenIds.includes(g.person_a),
          ).length;
        }

        onStatsLoadedRef.current({
          biologicalChildren,
          maleBiologicalChildren,
          femaleBiologicalChildren,
          paternalGrandchildren,
          maternalGrandchildren,
          sonInLaw,
          daughterInLaw,
        });
      }

      setRelationships(formattedRels);
    } catch (err) {
      console.error("Error fetching relationships:", err);
    } finally {
      setLoading(false);
    }
  // FIX #2: onStatsLoaded intentionally excluded — stable ref used instead
  }, [personId, supabase]);

  useEffect(() => {
    fetchRelationships();
  }, [fetchRelationships]);



  // FIX #5: Added canEdit guard — prevents non-editor from calling delete
  // even if the button is somehow rendered (defense-in-depth).
  const handleDelete = async (relId: string) => {
    if (!canEdit) return; // guard

    // Handle synthesized in-law IDs (e.g., "relId_inlaw")
    const actualRelId = relId.endsWith("_inlaw") ? relId.replace("_inlaw", "") : relId;

    if (!confirm("Bạn có chắc chắn muốn xóa mối quan hệ này?")) return;
    try {
      const result = await deleteRelationship(actualRelId, familyId);
      if (result.error) throw new Error(result.error);
      fetchRelationships();
      router.refresh();
    } catch (err: unknown) {
      const e = err as Error;
      setError("Không thể xóa: " + e.message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const groupByType = (type: string) =>
    relationships
      .filter((r) => r.direction === type)
      .sort((a, b) => {
        const yearA = a.targetPerson.birth_year;
        const yearB = b.targetPerson.birth_year;
        if (yearA == null && yearB == null) return 0;
        if (yearA == null) return 1;
        if (yearB == null) return -1;
        return yearA - yearB;
      });

  if (loading)
    return (
      <div className="text-stone-500 text-sm">
        Đang tải thông tin gia đình...
      </div>
    );

  return (
    <div className="space-y-6">
      {["parent", "spouse", "child", "child_in_law"].map((group) => {
        const items = groupByType(group);
        let title = "";
        if (group === "parent") title = "Bố / Mẹ";
        if (group === "spouse") title = "Vợ / Chồng";
        if (group === "child") title = "Con cái";
        if (group === "child_in_law") title = "Con dâu / Con rể";

        if (items.length === 0 && !isAdmin) return null;

        return (
          <div
            key={group}
            className="border-b border-stone-100 pb-4 last:border-0"
          >
            <h4 className="font-bold text-stone-700 mb-3 flex justify-between items-center text-sm uppercase tracking-wide">
              {title}
            </h4>
            {items.length > 0 ? (
              <ul className="space-y-3">
                {items.map((rel) => (
                  <li
                    key={rel.id}
                    className="flex items-center justify-between group"
                  >
                    <button
                      onClick={() => handlePersonClick(rel.targetPerson.id)}
                      className="flex items-center gap-3 hover:bg-stone-100 p-2.5 -mx-2.5 rounded-xl transition-all duration-200 flex-1 text-left"
                    >
                      <div
                        className={`size-8 rounded-full flex items-center justify-center text-xs text-white overflow-hidden
                            ${getAvatarBg(rel.targetPerson.gender)}`}
                      >
                        {rel.targetPerson.avatar_url ? (
                          <Image
                            unoptimized
                            src={rel.targetPerson.avatar_url}
                            alt={rel.targetPerson.full_name}
                            className="h-full w-full object-cover"
                            width={32}
                            height={32}
                          />
                        ) : (
                          <DefaultAvatar
                            gender={rel.targetPerson.gender}
                            size={32}
                          />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-stone-900 font-medium text-sm">
                          {rel.targetPerson.full_name}
                        </span>
                        {rel.note && (
                          <span className="text-xs text-amber-600 font-medium italic mt-0.5">
                            ({rel.note})
                          </span>
                        )}
                        {rel.type === "adopted_child" && (
                          <span className="text-xs text-stone-400 italic mt-0.5">
                            (Con nuôi)
                          </span>
                        )}
                      </div>
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => handleDelete(rel.id)}
                        className="text-stone-300 hover:text-red-500 hover:bg-red-50 p-2 sm:p-2.5 rounded-lg transition-colors flex items-center justify-center ml-2"
                        title="Xóa mối quan hệ"
                        aria-label="Xóa mối quan hệ"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          <line x1="10" x2="10" y1="11" y2="17" />
                          <line x1="14" x2="14" y1="11" y2="17" />
                        </svg>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-stone-400 italic">
                Chưa có thông tin.
              </p>
            )}
          </div>
        );
      })}

      {canEdit && !isAdding && !isAddingBulk && !isAddingSpouse && (
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <button
            onClick={() => setIsAdding(true)}
            className="flex-1 py-3 border-2 border-dashed border-stone-200 bg-stone-50/50 hover:bg-stone-50 rounded-xl sm:rounded-2xl text-stone-500 font-medium text-sm hover:border-amber-400 hover:text-amber-700 transition-all duration-200"
          >
            + Thêm Quan Hệ
          </button>

          <button
            onClick={() => setIsAddingBulk(true)}
            className="flex-1 py-3 border-2 border-dashed border-stone-200 bg-stone-50/50 hover:bg-stone-50 rounded-xl sm:rounded-2xl text-stone-500 font-medium text-sm hover:border-sky-400 hover:text-sky-700 transition-all duration-200"
          >
            + Thêm Con
          </button>

          <button
            onClick={() => setIsAddingSpouse(true)}
            className="flex-1 py-3 border-2 border-dashed border-stone-200 bg-stone-50/50 hover:bg-stone-50 rounded-xl sm:rounded-2xl text-stone-500 font-medium text-sm hover:border-rose-400 hover:text-rose-700 transition-all duration-200"
          >
            + Thêm Vợ/Chồng
          </button>
        </div>
      )}

      {error && !isAdding && !isAddingBulk && !isAddingSpouse && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 shrink-0 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 transition-colors p-1"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {canEdit && isAdding && (
        <SingleAddModal
          personId={personId}
          familyId={familyId}
          personGeneration={person.generation}
          onSuccess={() => {
            setIsAdding(false);
            fetchRelationships();
            router.refresh();
          }}
          onCancel={() => setIsAdding(false)}
        />
      )}

      {canEdit && isAddingBulk && (
        <BulkAddChildrenModal
          personId={personId}
          familyId={familyId}
          personGeneration={person.generation}
          spouses={groupByType("spouse").map(r => ({
            id: r.id,
            targetPerson: { id: r.targetPerson.id, full_name: r.targetPerson.full_name },
            note: r.note
          }))}
          onSuccess={() => {
            setIsAddingBulk(false);
            fetchRelationships();
            router.refresh();
          }}
          onCancel={() => setIsAddingBulk(false)}
        />
      )}

      {canEdit && isAddingSpouse && (
        <QuickAddSpouseModal
          personId={personId}
          familyId={familyId}
          personGender={personGender}
          personGeneration={person.generation}
          onSuccess={() => {
            setIsAddingSpouse(false);
            fetchRelationships();
            router.refresh();
          }}
          onCancel={() => setIsAddingSpouse(false)}
        />
      )}
    </div>
  );
}
