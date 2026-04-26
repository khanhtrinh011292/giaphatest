"use client";

import { useState, useCallback } from "react";
import { RefreshCw, AlertTriangle, CheckCircle, Baby, Sparkles } from "lucide-react";

interface Suggestion {
  name: string;
  duplicate: boolean;
  duplicateWith?: string;
}

interface BabyNameSuggesterProps {
  familyId: string;
}

type SurnameMode = "father" | "combined";

export default function BabyNameSuggester({ familyId }: BabyNameSuggesterProps) {
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [surnameMode, setSurnameMode] = useState<SurnameMode>("father");
  const [current, setCurrent] = useState<Suggestion | null>(null);
  const [shownNames, setShownNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const fatherSurname = fatherName.trim().split(/\s+/)[0] || "";
  const motherSurname = motherName.trim().split(/\s+/)[0] || "";

  // Preview tên mẫu — luôn 3-4 từ
  const previewExample =
    surnameMode === "combined" && fatherSurname && motherSurname
      ? `${fatherSurname} ${motherSurname} Thanh Ngân` // 4 từ
      : fatherSurname
      ? `${fatherSurname} Thanh Ngân` // 3 từ
      : null;

  const fetchNextName = useCallback(async (currentShown: string[]) => {
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
            surname_mode: surnameMode,
            exclude_names: currentShown,
          }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const suggestion: Suggestion = data.suggestion;

      // Animation flip
      setIsAnimating(true);
      setTimeout(() => {
        setCurrent(suggestion);
        setIsAnimating(false);
        setHasSearched(true);

        // Nếu server reset (xem hết), xóa lịch sử và bắt đầu lại
        if (data.reset) {
          setShownNames([suggestion.name]);
        } else {
          setShownNames((prev) => [...prev, suggestion.name]);
        }
      }, 200);
    } catch {
      setError("Không thể tải gợi ý tên. Thử lại sau.");
    } finally {
      setLoading(false);
    }
  }, [familyId, fatherName, motherName, gender, surnameMode]);

  const handleReroll = () => {
    fetchNextName(shownNames);
  };

  // Reset khi đổi giới tính hoặc chế độ họ
  const handleGenderChange = (g: "male" | "female") => {
    setGender(g);
    setCurrent(null);
    setShownNames([]);
    setHasSearched(false);
  };

  const handleSurnameModeChange = (m: SurnameMode) => {
    setSurnameMode(m);
    setCurrent(null);
    setShownNames([]);
    setHasSearched(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 max-w-lg mx-auto">
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

      {/* Inputs bố / mẹ */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tên bố</label>
          <input
            type="text"
            value={fatherName}
            onChange={(e) => { setFatherName(e.target.value); setCurrent(null); setShownNames([]); setHasSearched(false); }}
            placeholder="VD: Nguyễn Văn An"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tên mẹ</label>
          <input
            type="text"
            value={motherName}
            onChange={(e) => { setMotherName(e.target.value); setCurrent(null); setShownNames([]); setHasSearched(false); }}
            placeholder="VD: Trần Thị Bình"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
        </div>
      </div>

      {/* Chọn họ */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">Họ của con</label>
        <div className="grid grid-cols-2 gap-3">
          {/* Họ bố — 3 từ */}
          <button
            onClick={() => handleSurnameModeChange("father")}
            className={`py-3 px-4 rounded-xl border text-left transition-all ${
              surnameMode === "father"
                ? "bg-amber-500 text-white border-amber-500 shadow-md"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:border-amber-300 hover:bg-amber-50"
            }`}
          >
            <span className="block text-sm font-semibold">Họ bố · 3 từ</span>
            <span className={`block text-xs mt-0.5 ${
              surnameMode === "father" ? "text-amber-100" : "text-gray-400"
            }`}>
              {fatherSurname ? `VD: ${fatherSurname} Thanh Ngân` : "VD: Nguyễn Thanh Ngân"}
            </span>
          </button>

          {/* Kết hợp họ bố + họ mẹ — 4 từ */}
          <button
            onClick={() => handleSurnameModeChange("combined")}
            className={`py-3 px-4 rounded-xl border text-left transition-all ${
              surnameMode === "combined"
                ? "bg-purple-500 text-white border-purple-500 shadow-md"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:border-purple-300 hover:bg-purple-50"
            }`}
          >
            <span className="block text-sm font-semibold">Họ bố + Mẹ · 4 từ</span>
            <span className={`block text-xs mt-0.5 ${
              surnameMode === "combined" ? "text-purple-100" : "text-gray-400"
            }`}>
              {fatherSurname && motherSurname
                ? `VD: ${fatherSurname} ${motherSurname} Ngọc Hân`
                : "VD: Phạm Trần Ngọc Hân"}
            </span>
          </button>
        </div>

        {/* Preview cấu trúc tên */}
        {previewExample && (
          <p className="mt-2 text-xs text-gray-500">
            Cấu trúc tên:{" "}
            <span className="font-semibold text-gray-700">{previewExample}</span>
            <span className="ml-1 text-gray-400">({surnameMode === "combined" ? "4 từ" : "3 từ"})</span>
          </p>
        )}
      </div>

      {/* Gender Toggle */}
      <div className="flex gap-3 mb-5">
        <button
          onClick={() => handleGenderChange("male")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            gender === "male"
              ? "bg-blue-500 text-white shadow-md"
              : "bg-gray-100 text-gray-500 hover:bg-blue-50"
          }`}
        >
          Con trai
        </button>
        <button
          onClick={() => handleGenderChange("female")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            gender === "female"
              ? "bg-pink-500 text-white shadow-md"
              : "bg-gray-100 text-gray-500 hover:bg-pink-50"
          }`}
        >
          Con gái
        </button>
      </div>

      {/* Hiển thị tên được gợi ý — 1 tên duy nhất */}
      {hasSearched && current && (
        <div
          className={`mb-5 transition-all duration-200 ${
            isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
          }`}
        >
          <div
            className={`relative flex flex-col items-center justify-center rounded-2xl py-8 px-6 border-2 ${
              current.duplicate
                ? "bg-orange-50 border-orange-300"
                : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-300"
            }`}
          >
            {/* Sparkle icon */}
            {!current.duplicate && (
              <Sparkles className="absolute top-3 right-3 w-5 h-5 text-green-400 opacity-60" />
            )}

            {/* Badge số thứ tự */}
            <span className="text-xs font-medium text-gray-400 mb-2">
              #{shownNames.length}
            </span>

            {/* Tên chính */}
            <p
              className={`text-3xl font-bold tracking-wide text-center ${
                current.duplicate ? "text-orange-700" : "text-gray-800"
              }`}
            >
              {current.name}
            </p>

            {/* Trạng thái */}
            <div className="mt-3 flex items-center gap-1.5">
              {current.duplicate ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-orange-600 font-medium">
                    Trùng với: <span className="font-bold">{current.duplicateWith}</span>
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600 font-medium">Chưa trùng trong dòng họ</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Generate / Reroll Button */}
      <button
        onClick={handleReroll}
        disabled={loading}
        className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-60"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        {loading
          ? "Đang tìm tên..."
          : hasSearched
          ? "Reroll — Đổi tên khác"
          : "Gợi ý tên"}
      </button>

      {error && (
        <p className="mt-3 text-sm text-red-500 text-center">{error}</p>
      )}

      {/* Đếm số tên đã xem */}
      {hasSearched && shownNames.length > 0 && (
        <p className="mt-3 text-xs text-gray-400 text-center">
          Đã xem {shownNames.length} tên • Bấm Reroll để xem tên tiếp theo
        </p>
      )}
    </div>
  );
}
