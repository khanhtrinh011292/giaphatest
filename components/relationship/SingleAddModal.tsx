"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { formatDisplayDate } from "@/utils/dateHelpers";
import { RelationshipType } from "@/types";

interface SingleAddModalProps {
  personId: string;
  familyId: string;
  personGeneration: number | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SingleAddModal({
  personId,
  familyId,
  personGeneration,
  onSuccess,
  onCancel,
}: SingleAddModalProps) {
  const supabase = createClient();
  const [newRelType, setNewRelType] = useState<RelationshipType>("biological_child");
  const [newRelDirection, setNewRelDirection] = useState<"parent" | "child" | "spouse">("parent");
  const [newRelNote, setNewRelNote] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; full_name: string; gender: string; birth_year: number; birth_month: number; birth_day: number }[]>([]);
  const [recentMembers, setRecentMembers] = useState<{ id: string; full_name: string; gender: string; birth_year: number; birth_month: number; birth_day: number }[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchPeople = async () => {
      if (searchTerm.length < 2) {
        setSearchResults([]);
        return;
      }

      const { data } = await supabase
        .from("persons")
        .select("*")
        .eq("family_id", familyId)
        .ilike("full_name", `%${searchTerm}%`)
        .neq("id", personId)
        .limit(5);

      if (data) setSearchResults(data);
    };

    const timeoutId = setTimeout(searchPeople, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, personId, familyId, supabase]);

  useEffect(() => {
    if (recentMembers.length === 0) {
      const fetchRecent = async () => {
        const { data } = await supabase
          .from("persons")
          .select("*")
          .eq("family_id", familyId)
          .neq("id", personId)
          .order("created_at", { ascending: false })
          .limit(10);
        if (data) setRecentMembers(data);
      };
      fetchRecent();
    }
  }, [personId, familyId, supabase, recentMembers.length]);

  const handleAddRelationship = async () => {
    if (!selectedTargetId) return;
    setProcessing(true);
    setError(null);

    try {
      let personA = personId;
      let personB = selectedTargetId;

      if (newRelDirection === "parent") {
        personA = selectedTargetId;
        personB = personId;
      } else if (newRelDirection === "child") {
        personA = personId;
        personB = selectedTargetId;
      }

      let type: RelationshipType = "biological_child";
      if (newRelDirection === "spouse") type = "marriage";
      else if (newRelType === "adopted_child") type = "adopted_child";

      const { error: insertError } = await supabase.from("relationships").insert({
        family_id: familyId,
        person_a: personA,
        person_b: personB,
        type: type,
        note: newRelNote ? newRelNote : null,
      });

      if (insertError) throw insertError;

      try {
        const { data: targetPerson } = await supabase
          .from("persons")
          .select("generation, is_in_law")
          .eq("id", selectedTargetId)
          .single();

        if (targetPerson && (targetPerson.generation == null || targetPerson.is_in_law == null)) {
          const updates: { generation?: number; is_in_law?: boolean } = {};

          if (targetPerson.generation == null && personGeneration != null) {
            if (newRelDirection === "child") updates.generation = personGeneration + 1;
            else if (newRelDirection === "parent") updates.generation = personGeneration - 1;
            else if (newRelDirection === "spouse") updates.generation = personGeneration;
          }

          if (targetPerson.is_in_law == null) {
            if (newRelDirection === "child" || newRelDirection === "parent") {
              updates.is_in_law = false;
            } else if (newRelDirection === "spouse") {
              updates.is_in_law = true;
            }
          }

          if (Object.keys(updates).length > 0) {
            await supabase.from("persons").update(updates).eq("id", selectedTargetId);
          }
        }
      } catch (err) {
        console.error("Failed to auto-update target person properties", err);
      }

      onSuccess();
    } catch (err: unknown) {
      const e = err as Error;
      setError("Không thể thêm mối quan hệ: " + e.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="mt-4 bg-stone-50/50 p-4 sm:p-5 rounded-xl border border-stone-200 shadow-sm">
      <h4 className="font-bold text-stone-800 mb-3 text-sm">Thêm Quan Hệ Mới</h4>

      <div className="space-y-3">
        <div>
          <label htmlFor="rel-note" className="block text-xs font-medium text-stone-600 mb-1">
            Ghi chú mối quan hệ (tuỳ chọn)
          </label>
          <input
            id="rel-note"
            type="text"
            placeholder="VD: Vợ cả, Vợ hai, Chồng trước..."
            value={newRelNote}
            onChange={(e) => setNewRelNote(e.target.value)}
            className="bg-white text-stone-900 placeholder-stone-400 block w-full text-sm rounded-lg border-stone-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 sm:p-2.5 border mb-3 transition-colors"
          />
        </div>

        <div>
          <label htmlFor="rel-direction" className="block text-xs font-medium text-stone-600 mb-1">
            Loại quan hệ
          </label>
          <select
            id="rel-direction"
            value={newRelDirection}
            onChange={(e) => setNewRelDirection(e.target.value as "parent" | "child" | "spouse")}
            className="bg-white text-stone-900 block w-full max-w-full text-sm rounded-lg border-stone-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 sm:p-2.5 border transition-colors"
          >
            <option value="parent">Người này là Con của...</option>
            <option value="spouse">Người này là Vợ/Chồng của...</option>
            <option value="child">Người này là Bố/Mẹ của...</option>
          </select>
        </div>

        {(newRelDirection === "child" || newRelDirection === "parent") && (
          <div>
            <label htmlFor="rel-type" className="block text-xs font-medium text-stone-600 mb-1">
              Chi tiết
            </label>
            <select
              id="rel-type"
              value={newRelType}
              onChange={(e) => setNewRelType(e.target.value as RelationshipType)}
              className="bg-white text-stone-900 block w-full max-w-full text-sm rounded-lg border-stone-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 sm:p-2.5 border transition-colors"
            >
              <option value="biological_child">Con ruột</option>
              <option value="adopted_child">Con nuôi</option>
            </select>
          </div>
        )}

        <div>
          <label htmlFor="rel-search" className="block text-xs font-medium text-stone-600 mb-1">
            Tìm người thân
          </label>
          <input
            id="rel-search"
            type="text"
            placeholder="Nhập tên để tìm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white text-stone-900 placeholder-stone-400 block w-full text-sm rounded-lg border-stone-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 sm:p-2.5 border transition-colors"
          />
          {(searchResults.length > 0 || (searchTerm.length === 0 && !selectedTargetId && recentMembers.length > 0)) && (
            <div className="mt-2 bg-white border border-stone-200 rounded-md shadow-lg max-h-[250px] overflow-y-auto">
              <div className="px-3 py-1.5 bg-stone-100 text-[10px] font-bold text-stone-500 uppercase tracking-wide border-b border-stone-200 sticky top-0 z-10">
                {searchResults.length > 0 ? "Kết quả tìm kiếm" : "Thành viên vừa thêm gần đây"}
              </div>
              {(searchResults.length > 0 ? searchResults : recentMembers).map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedTargetId(p.id);
                    setSearchTerm(p.full_name);
                    setSearchResults([]);
                  }}
                  className="w-full px-3 py-2 hover:bg-amber-50 text-sm flex items-center justify-between border-b border-stone-100 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex items-center justify-center text-[8px] font-bold size-3 rounded-full text-white shrink-0
                           ${
                             p.gender === "male"
                               ? "bg-sky-500"
                               : p.gender === "female"
                                 ? "bg-rose-500"
                                 : "bg-stone-400"
                           }`}
                    >
                      {p.gender === "male" ? "♂" : p.gender === "female" ? "♀" : "?"}
                    </span>
                    <span className="font-medium text-stone-800">{p.full_name}</span>
                  </div>
                  <span className="text-[10px] text-stone-400">
                    {formatDisplayDate(p.birth_year, p.birth_month, p.birth_day)}
                  </span>
                </button>
              ))}
            </div>
          )}
          {selectedTargetId && (
            <p className="text-xs text-green-600 mt-1">Đã chọn: {searchTerm}</p>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleAddRelationship}
            disabled={!selectedTargetId || processing}
            className="flex-1 bg-amber-700 text-white py-2 sm:py-2.5 rounded-md sm:rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50 transition-colors"
          >
            {processing ? "Đang lưu..." : "Lưu"}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 sm:py-2.5 bg-white border border-stone-300 text-stone-700 rounded-md sm:rounded-lg text-sm hover:bg-stone-50 transition-colors"
          >
            Hủy
          </button>
        </div>
        
        {error && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
