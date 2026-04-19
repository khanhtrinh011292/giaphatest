"use client";

import { addRelationship } from "@/app/actions/member";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { formatDisplayDate } from "@/utils/dateHelpers";
import { RelationshipType } from "@/types";
import { toast } from "sonner";

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
  const [newRelType, setNewRelType] = useState<RelationshipType>("marriage");
  const [newRelDirection, setNewRelDirection] = useState<"parent" | "child" | "spouse">("spouse");
  const [newRelNote, setNewRelNote] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; full_name: string; gender: string; birth_year: number; birth_month: number; birth_day: number; generation: number | null }[]>([]);
  const [recentMembers, setRecentMembers] = useState<{ id: string; full_name: string; gender: string; birth_year: number; birth_month: number; birth_day: number; generation: number | null }[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<{ id: string; full_name: string; generation: number | null } | null>(null);
  const [processing, setProcessing] = useState(false);

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
    if (!selectedTarget) {
      toast.error("Vui lòng chọn người thân.");
      return;
    }
    setProcessing(true);

    let personA = personId;
    let personB = selectedTarget.id;

    if (newRelDirection === "parent") {
      personA = selectedTarget.id;
      personB = personId;
    } else if (newRelDirection === "child") {
      personA = personId;
      personB = selectedTarget.id;
    }

    // ✅ FIX TRUẤT: Guard chặt chẽ nhất trước khi gọi server action
    let type: RelationshipType = "biological_child";
    if (newRelDirection === "spouse") {
      type = "marriage";
    } else if (newRelType === "adopted_child") {
      type = "adopted_child";
    } else {
      type = "biological_child";
    }

    const result = await addRelationship(
      familyId,
      personA,
      personB,
      type,
      newRelNote || null,
      selectedTarget.id,
      newRelDirection,
      selectedTarget.generation ?? null,
      personGeneration
    );

    setProcessing(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Đã thêm quan hệ.");
      onSuccess();
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
            onChange={(e) => {
              const dir = e.target.value as "parent" | "child" | "spouse";
              setNewRelDirection(dir);
            }}
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
              onChange={(e) => {
                const val = e.target.value as RelationshipType;
                if (val) setNewRelType(val);
              }}
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
          {(searchResults.length > 0 || (searchTerm.length === 0 && !selectedTarget && recentMembers.length > 0)) && (
            <div className="mt-2 bg-white border border-stone-200 rounded-md shadow-lg max-h-[250px] overflow-y-auto">
              <div className="px-3 py-1.5 bg-stone-100 text-[10px] font-bold text-stone-500 uppercase tracking-wide border-b border-stone-200 sticky top-0 z-10">
                {searchResults.length > 0 ? "Kết quả tìm kiếm" : "Thành viên vừa thêm gần đây"}
              </div>
              {(searchResults.length > 0 ? searchResults : recentMembers).map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedTarget({ id: p.id, full_name: p.full_name, generation: p.generation });
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
          {selectedTarget && (
            <p className="text-xs text-green-600 mt-1">Đã chọn: {selectedTarget.full_name}</p>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleAddRelationship}
            disabled={!selectedTarget || processing}
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
      </div>
    </div>
  );
}
