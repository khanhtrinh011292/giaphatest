"use client";

import { createClient } from "@/utils/supabase/client";
import { useState } from "react";

interface QuickAddSpouseModalProps {
  personId: string;
  familyId: string;
  personGender: "male" | "female" | "other";
  personGeneration: number | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function QuickAddSpouseModal({
  personId,
  familyId,
  personGender,
  personGeneration,
  onSuccess,
  onCancel,
}: QuickAddSpouseModalProps) {
  const supabase = createClient();
  const [newSpouseName, setNewSpouseName] = useState("");
  const [newSpouseBirthYear, setNewSpouseBirthYear] = useState("");
  const [newSpouseNote, setNewSpouseNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickAddSpouse = async () => {
    if (!newSpouseName.trim()) {
      setError("Vui lòng nhập tên Vợ/Chồng.");
      setTimeout(() => setError(null), 5000);
      return;
    }

    setProcessing(true);
    setError(null);
    let newSpouseId: string | null = null; // track for rollback

    try {
      const newSpouseGender =
        personGender === "male"
          ? "female"
          : personGender === "female"
          ? "male"
          : "female";

      const personPayload: {
        family_id: string;
        full_name: string;
        gender: "male" | "female" | "other";
        birth_year?: number;
        is_in_law?: boolean;
        generation?: number;
      } = {
        family_id: familyId,
        full_name: newSpouseName.trim(),
        gender: newSpouseGender,
        is_in_law: true,
      };

      if (personGeneration != null) {
        personPayload.generation = personGeneration;
      }

      if (newSpouseBirthYear.trim() !== "") {
        const year = parseInt(newSpouseBirthYear);
        if (!isNaN(year)) personPayload.birth_year = year;
      }

      const { data: newPersonData, error: insertError } = await supabase
        .from("persons")
        .insert(personPayload)
        .select("id")
        .single();

      if (insertError || !newPersonData) throw insertError;

      newSpouseId = newPersonData.id;

      const { error: relError } = await supabase.from("relationships").insert({
        family_id: familyId,
        person_a: personId,
        person_b: newSpouseId,
        type: "marriage",
        note: newSpouseNote.trim() || null,
      });

      if (relError) {
        await supabase.from("persons").delete().eq("id", newSpouseId);
        throw relError;
      }

      onSuccess();
    } catch (err: unknown) {
      const e = err as Error;
      setError("Không thể thêm vợ/chồng: " + e.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="mt-4 bg-rose-50/50 p-4 sm:p-5 rounded-xl border border-rose-200 shadow-sm">
      <h4 className="font-bold text-rose-800 mb-3 text-sm">Thêm Nhanh Vợ/Chồng</h4>

      <div className="space-y-3">
        <div>
          <label htmlFor="spouse-name" className="block text-xs font-medium text-stone-600 mb-1">
            Họ và Tên <span className="text-red-500">*</span>
          </label>
          <input
            id="spouse-name"
            type="text"
            placeholder="Nhập họ và tên..."
            value={newSpouseName}
            onChange={(e) => setNewSpouseName(e.target.value)}
            className="bg-white text-stone-900 placeholder-stone-400 block w-full text-sm rounded-lg border-stone-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 sm:p-2.5 border transition-colors"
          />
        </div>

        <div>
          <label htmlFor="spouse-birth-year" className="block text-xs font-medium text-stone-600 mb-1">
            Năm sinh (Tuỳ chọn)
          </label>
          <input
            id="spouse-birth-year"
            type="number"
            placeholder="VD: 1980"
            value={newSpouseBirthYear}
            onChange={(e) => setNewSpouseBirthYear(e.target.value)}
            className="bg-white text-stone-900 placeholder-stone-400 block w-full text-sm rounded-lg border-stone-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 sm:p-2.5 border transition-colors"
          />
        </div>

        <div>
          <label htmlFor="spouse-note" className="block text-xs font-medium text-stone-600 mb-1">
            Ghi chú mối quan hệ (Ví dụ: Vợ cả, Chồng thứ...)
          </label>
          <input
            id="spouse-note"
            type="text"
            placeholder="Tuỳ chọn..."
            value={newSpouseNote}
            onChange={(e) => setNewSpouseNote(e.target.value)}
            className="bg-white text-stone-900 placeholder-stone-400 block w-full text-sm rounded-lg border-stone-300 shadow-sm focus:border-rose-500 focus:ring-rose-500 p-2 sm:p-2.5 border transition-colors"
          />
        </div>

        <p className="text-xs text-stone-500 italic mt-1">
          * Giới tính sẽ tự động gán là {personGender === "male" ? "Nữ" : personGender === "female" ? "Nam" : "Nữ"} (dựa theo giới tính người hiện tại).
        </p>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleQuickAddSpouse}
            disabled={!newSpouseName.trim() || processing}
            className="flex-1 bg-rose-600 text-white py-2 sm:py-2.5 rounded-md sm:rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors"
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
          <div className="mt-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
