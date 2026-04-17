"use client";

import { createClient } from "@/utils/supabase/client";
import { useState } from "react";

interface ExpectedSpouse {
  id: string;
  targetPerson: {
    id: string;
    full_name: string;
  };
  note: string | null;
}

interface BulkAddChildrenModalProps {
  personId: string;
  familyId: string;
  personGeneration: number | null;
  spouses: ExpectedSpouse[];
  onSuccess: () => void;
  onCancel: () => void;
}

export default function BulkAddChildrenModal({
  personId,
  familyId,
  personGeneration,
  spouses,
  onSuccess,
  onCancel,
}: BulkAddChildrenModalProps) {
  const supabase = createClient();
  const [selectedSpouseId, setSelectedSpouseId] = useState<string>("unknown");
  const [bulkChildren, setBulkChildren] = useState([
    {
      name: "",
      gender: "male",
      birthYear: "",
      birthOrder: "1",
      isProcessing: false,
    },
  ]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBulkAdd = async () => {
    const validChildren = bulkChildren.filter((c) => c.name.trim() !== "");
    if (validChildren.length === 0) {
      setError("Vui lòng nhập ít nhất tên của 1 người con.");
      setTimeout(() => setError(null), 5000);
      return;
    }

    setProcessing(true);
    setError(null);
    let successCount = 0;

    try {
      for (let i = 0; i < validChildren.length; i++) {
        const child = validChildren[i];

        const personPayload: {
          family_id: string;
          full_name: string;
          gender: "male" | "female" | "other";
          birth_year?: number;
          birth_order?: number;
          is_in_law?: boolean;
          generation?: number;
        } = {
          family_id: familyId,
          full_name: child.name.trim(),
          gender: child.gender as "male" | "female" | "other",
          is_in_law: false,
        };

        if (personGeneration != null) {
          personPayload.generation = personGeneration + 1;
        }
        if (child.birthYear.trim() !== "") {
          const year = parseInt(child.birthYear);
          if (!isNaN(year)) personPayload.birth_year = year;
        }
        if (child.birthOrder.trim() !== "") {
          const order = parseInt(child.birthOrder);
          if (!isNaN(order)) personPayload.birth_order = order;
        }

        const { data: newPersonData, error: insertError } = await supabase
          .from("persons")
          .insert(personPayload)
          .select("id")
          .single();

        if (insertError || !newPersonData) {
          continue;
        }

        const newChildId = newPersonData.id;

        const { error: relErrorA } = await supabase
          .from("relationships")
          .insert({
            family_id: familyId,
            person_a: personId,
            person_b: newChildId,
            type: "biological_child",
          });

        if (relErrorA) {
          await supabase.from("persons").delete().eq("id", newChildId);
          continue;
        }

        if (selectedSpouseId && selectedSpouseId !== "unknown") {
          const { error: relErrorB } = await supabase
            .from("relationships")
            .insert({
              family_id: familyId,
              person_a: selectedSpouseId,
              person_b: newChildId,
              type: "biological_child",
            });

          if (relErrorB) {
            console.error("Failed to insert second parent relationship", relErrorB);
          }
        }

        successCount++;
      }

      if (successCount === validChildren.length) {
        onSuccess();
      } else {
        setError(`Đã xảy ra lỗi. Chỉ lưu thành công ${successCount}/${validChildren.length} người.`);
        setTimeout(() => setError(null), 5000);
        onSuccess(); // Triggers a reload to fetch successfully inserted ones
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError("Không thể thêm danh sách con: " + e.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="mt-4 bg-sky-50/50 p-4 sm:p-5 rounded-xl border border-sky-200 shadow-sm">
      <h4 className="font-bold text-sky-800 mb-3 text-sm">Thêm Nhanh Nhiều Con</h4>

      <div className="space-y-4">
        <div>
          <label htmlFor="bulk-spouse" className="block text-xs font-medium text-stone-600 mb-1">
            Chọn người mẹ/cha còn lại
          </label>
          <select
            id="bulk-spouse"
            value={selectedSpouseId}
            onChange={(e) => setSelectedSpouseId(e.target.value)}
            className="bg-white text-stone-900 block w-full max-w-full text-sm rounded-lg border-stone-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 p-2 sm:p-2.5 border transition-colors"
          >
            <option value="unknown">Không rõ (hoặc Vợ/Chồng khác chưa thêm)</option>
            {spouses.map((rel) => (
              <option key={rel.id} value={rel.targetPerson.id}>
                {rel.targetPerson.full_name} {rel.note ? `(${rel.note})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-medium text-stone-600 mb-1">Danh sách các con</label>
          {bulkChildren.map((child, index) => (
            <div key={index} className="bg-white rounded-xl border border-stone-200/80 p-3 sm:p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md">Con thứ {index + 1}</span>
                <button
                  onClick={() => {
                    const newBulk = bulkChildren.filter((_, i) => i !== index);
                    if (newBulk.length === 0) {
                      newBulk.push({ name: "", gender: "male", birthYear: "", birthOrder: "1", isProcessing: false });
                    }
                    setBulkChildren(newBulk);
                  }}
                  className="text-stone-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors text-xs"
                  title="Xoá"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-wrap sm:flex-nowrap gap-2">
                <input
                  type="number"
                  placeholder="STT"
                  min="1"
                  value={child.birthOrder}
                  onChange={(e) => {
                    const newBulk = [...bulkChildren];
                    newBulk[index].birthOrder = e.target.value;
                    setBulkChildren(newBulk);
                  }}
                  className="w-14 shrink-0 text-center bg-stone-50 text-stone-900 placeholder-stone-400 text-sm rounded-lg border-stone-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 px-1 py-2 border transition-colors"
                />
                <input
                  type="text"
                  placeholder="Họ và tên *"
                  value={child.name}
                  onChange={(e) => {
                    const newBulk = [...bulkChildren];
                    newBulk[index].name = e.target.value;
                    setBulkChildren(newBulk);
                  }}
                  className="w-[calc(100%-4rem)] sm:w-auto sm:flex-1 min-w-0 bg-stone-50 text-stone-900 placeholder-stone-400 text-sm rounded-lg border-stone-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 px-3 py-2 border transition-colors"
                />
                <select
                  value={child.gender}
                  onChange={(e) => {
                    const newBulk = [...bulkChildren];
                    newBulk[index].gender = e.target.value;
                    setBulkChildren(newBulk);
                  }}
                  className="w-[calc(50%-0.25rem)] sm:w-24 shrink-0 bg-stone-50 text-stone-900 text-sm rounded-lg border-stone-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 px-2 py-2 border transition-colors"
                >
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
                <input
                  type="number"
                  placeholder="Năm sinh"
                  value={child.birthYear}
                  onChange={(e) => {
                    const newBulk = [...bulkChildren];
                    newBulk[index].birthYear = e.target.value;
                    setBulkChildren(newBulk);
                  }}
                  className="w-[calc(50%-0.25rem)] sm:w-24 shrink-0 bg-stone-50 text-stone-900 placeholder-stone-400 text-sm rounded-lg border-stone-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 px-2 py-2 border transition-colors"
                />
              </div>
            </div>
          ))}

          <button
            onClick={() => {
              const nextOrder = String(bulkChildren.length + 1);
              setBulkChildren([
                ...bulkChildren,
                { name: "", gender: "male", birthYear: "", birthOrder: nextOrder, isProcessing: false },
              ]);
            }}
            className="w-full py-2.5 border-2 border-dashed border-sky-200 bg-sky-50/50 hover:bg-sky-50 rounded-xl text-sky-600 text-xs font-semibold hover:border-sky-300 transition-all"
          >
            + Thêm dòng
          </button>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t border-stone-200">
          <button
            onClick={handleBulkAdd}
            disabled={processing || bulkChildren.every((c) => c.name.trim() === "")}
            className="flex-1 bg-sky-600 text-white py-2 sm:py-2.5 rounded-md sm:rounded-lg text-sm font-medium hover:bg-sky-700 disabled:opacity-50 transition-colors"
          >
            {processing ? "Đang lưu..." : "Lưu Tất Cả"}
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
