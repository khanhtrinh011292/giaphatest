"use client";

import { useState, useCallback } from "react";
import { RefreshCw, AlertTriangle, CheckCircle, Baby } from "lucide-react";

interface Suggestion {
  name: string;
  duplicate: boolean;
  duplicateWith?: string;
}

interface BabyNameSuggesterProps {
  familyId: string;
}

export default function BabyNameSuggester({ familyId }: BabyNameSuggesterProps) {
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    if (!fatherName.trim() && !motherName.trim()) {
      setError("Vui lòng nhập ít nhất tên bố hoặc mẹ");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        "https://akbpekyskdrpldqnputb.supabase.co/functions/v1/suggest-baby-names",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            family_id: familyId,
            father_name: fatherName,
            mother_name: motherName,
            gender,
          }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuggestions(data.suggestions);
      setHasSearched(true);
    } catch {
      setError("Không thể tải gợi ý tên. Thử lại sau.");
    } finally {
      setLoading(false);
    }
  }, [familyId, fatherName, motherName, gender]);

  const duplicateCount = suggestions.filter((s) => s.duplicate).length;
  const safeCount = suggestions.filter((s) => !s.duplicate).length;

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-pink-100 rounded-xl">
          <Baby className="w-6 h-6 text-pink-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Gợi ý tên cho con</h2>
          <p className="text-sm text-gray-500">Tự động kiểm tra trùng tên trong dòng họ</p>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tên bố</label>
          <input
            type="text"
            value={fatherName}
            onChange={(e) => setFatherName(e.target.value)}
            placeholder="VD: Nguyễn Văn An"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tên mẹ</label>
          <input
            type="text"
            value={motherName}
            onChange={(e) => setMotherName(e.target.value)}
            placeholder="VD: Trần Thị Bình"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
        </div>
      </div>

      {/* Gender Toggle */}
      <div className="flex gap-3 mb-5">
        <button
          onClick={() => setGender("male")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            gender === "male"
              ? "bg-blue-500 text-white shadow-md"
              : "bg-gray-100 text-gray-500 hover:bg-blue-50"
          }`}
        >
          Con trai
        </button>
        <button
          onClick={() => setGender("female")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            gender === "female"
              ? "bg-pink-500 text-white shadow-md"
              : "bg-gray-100 text-gray-500 hover:bg-pink-50"
          }`}
        >
          Con gái
        </button>
      </div>

      {/* Generate / Reroll Button */}
      <button
        onClick={fetchSuggestions}
        disabled={loading}
        className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-60"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Đang tạo gợi ý..." : hasSearched ? "Reroll — Đổi tên khác" : "Gợi ý tên"}
      </button>

      {error && (
        <p className="mt-3 text-sm text-red-500 text-center">{error}</p>
      )}

      {/* Stats */}
      {hasSearched && suggestions.length > 0 && (
        <div className="flex gap-3 mt-5">
          <div className="flex-1 bg-green-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{safeCount}</p>
            <p className="text-xs text-green-700">Tên chưa trùng</p>
          </div>
          <div className="flex-1 bg-orange-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-orange-500">{duplicateCount}</p>
            <p className="text-xs text-orange-600">Tên đã trùng</p>
          </div>
          <div className="flex-1 bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">20</p>
            <p className="text-xs text-blue-700">Tổng gợi ý</p>
          </div>
        </div>
      )}

      {/* Suggestions List */}
      {suggestions.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-semibold text-gray-600 mb-3">
            {gender === "male" ? "Gợi ý tên con trai:" : "Gợi ý tên con gái:"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {suggestions.map((s, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition ${
                  s.duplicate
                    ? "bg-orange-50 border-orange-200"
                    : "bg-green-50 border-green-200 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                  <span className={`text-sm font-medium ${
                    s.duplicate ? "text-orange-700" : "text-gray-800"
                  }`}>
                    {s.name}
                  </span>
                </div>
                {s.duplicate ? (
                  <div className="group relative">
                    <AlertTriangle className="w-4 h-4 text-orange-400 cursor-help shrink-0" />
                    <div className="absolute right-0 bottom-6 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition z-10 pointer-events-none">
                      Trùng với: {s.duplicateWith}
                    </div>
                  </div>
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
