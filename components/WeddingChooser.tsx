"use client";

import { useState, useMemo } from "react";
import {
  tinhHopTuoi,
  suggestDaysInMonth,
  getGioHoangDao,
  rateDayForWedding,
  getCanChi,
  type DayRating,
  type CompatResult,
} from "@/utils/thongThu";
import { Heart, Calendar, Clock, Star, ChevronDown, ChevronUp, Info } from "lucide-react";

const MONTH_NAMES = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6",
  "Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 65 ? "bg-amber-400" : score >= 45 ? "bg-yellow-300" : "bg-red-400";
  return (
    <div className="w-full bg-stone-100 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${score}%` }} />
    </div>
  );
}

function DayCard({ day, onSelect, selected }: { day: DayRating; onSelect: (d: DayRating) => void; selected: boolean }) {
  const labelColor = day.label === "Đại Cát" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : day.label === "Tốt" ? "bg-amber-100 text-amber-700 border-amber-200"
    : "bg-stone-100 text-stone-600 border-stone-200";
  return (
    <button
      onClick={() => onSelect(day)}
      className={`w-full text-left rounded-2xl border p-4 transition-all ${
        selected ? "border-amber-400 bg-amber-50 shadow-md" : "border-stone-200 bg-white hover:border-amber-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-bold text-stone-900">
            {new Date(day.solarDate + "T00:00:00").toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric", year: "numeric" })}
          </p>
          <p className="text-xs text-stone-500 mt-0.5">
            {day.isLeapMonth ? "Nhuận " : ""}Ngày {day.lunarDay}/{day.lunarMonth} âm — {day.thapNhiTruc}
            {day.isHoangDao ? " · Hoàng Đạo" : " · Hắc Đạo"}
          </p>
        </div>
        <span className={`text-xs font-bold border px-2.5 py-1 rounded-full shrink-0 ${labelColor}`}>{day.label}</span>
      </div>
      <ScoreBar score={day.score} />
      <p className="text-xs text-stone-400 mt-1">{day.score}/100 điểm</p>
    </button>
  );
}

export default function WeddingChooser() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Phối Mệnh inputs
  const [groomYear, setGroomYear] = useState("");
  const [brideYear, setBrideYear] = useState("");
  const [compatResult, setCompatResult] = useState<CompatResult | null>(null);
  const [showCompatDetail, setShowCompatDetail] = useState(false);

  // Trạch Nhật inputs
  const [selYear, setSelYear] = useState(currentYear);
  const [selMonth, setSelMonth] = useState(currentMonth);
  const [selectedDay, setSelectedDay] = useState<DayRating | null>(null);

  const suggestedDays = useMemo(
    () => suggestDaysInMonth(selYear, selMonth, 65),
    [selYear, selMonth]
  );

  const gioHD = useMemo(
    () => selectedDay ? getGioHoangDao(selectedDay.lunarDay) : [],
    [selectedDay]
  );

  function handleCalcCompat() {
    const gy = parseInt(groomYear);
    const by = parseInt(brideYear);
    if (!gy || !by || gy < 1900 || gy > 2100 || by < 1900 || by > 2100) return;
    setCompatResult(tinhHopTuoi(gy, by));
  }

  const groomCC = groomYear && parseInt(groomYear) >= 1900 ? getCanChi(parseInt(groomYear)) : null;
  const brideCC = brideYear && parseInt(brideYear) >= 1900 ? getCanChi(parseInt(brideYear)) : null;

  return (
    <main className="flex-1 w-full">
      {/* Header */}
      <div className="bg-gradient-to-br from-rose-50 via-amber-50 to-white border-b border-stone-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <Heart className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-stone-900">Coi Ngày Cưới</h1>
              <p className="text-stone-500 text-sm mt-0.5">Theo Thông Thư (Thúng Sing) — Trạch Nhật · Phối Mệnh · Giờ Hoàng Đạo</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* ── PHẦN 1: Phối Mệnh ── */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <Star className="size-4 text-amber-500" />
            <h2 className="text-base font-bold text-stone-800">1. Hợp Tuổi (Phối Mệnh)</h2>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">Năm sinh Chú rể</label>
                <input
                  type="number"
                  min={1900} max={2100}
                  value={groomYear}
                  onChange={e => setGroomYear(e.target.value)}
                  placeholder="VD: 1995"
                  className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                {groomCC && (
                  <p className="text-xs text-amber-700 mt-1 font-medium">{groomCC.can} {groomCC.chi}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">Năm sinh Cô dâu</label>
                <input
                  type="number"
                  min={1900} max={2100}
                  value={brideYear}
                  onChange={e => setBrideYear(e.target.value)}
                  placeholder="VD: 1997"
                  className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                {brideCC && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{brideCC.can} {brideCC.chi}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleCalcCompat}
              disabled={!groomYear || !brideYear}
              className="w-full btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Tính hợp tuổi
            </button>

            {compatResult && (
              <div className="pt-3 border-t border-stone-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-stone-900 text-lg">{compatResult.summary}</p>
                    <p className="text-xs text-stone-400">{compatResult.score}/100 điểm tương hợp</p>
                  </div>
                  <div className={`size-14 rounded-2xl flex items-center justify-center font-black text-xl ${
                    compatResult.score >= 80 ? "bg-emerald-100 text-emerald-700"
                    : compatResult.score >= 65 ? "bg-amber-100 text-amber-700"
                    : compatResult.score >= 50 ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-600"
                  }`}>
                    {compatResult.score}
                  </div>
                </div>
                <ScoreBar score={compatResult.score} />
                <button
                  onClick={() => setShowCompatDetail(v => !v)}
                  className="mt-3 text-xs text-stone-500 flex items-center gap-1 hover:text-amber-600 transition-colors"
                >
                  {showCompatDetail ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                  {showCompatDetail ? "Ẩn chi tiết" : "Xem chi tiết phân tích"}
                </button>
                {showCompatDetail && (
                  <ul className="mt-3 space-y-1.5">
                    {compatResult.detail.map((d, i) => (
                      <li key={i} className="text-sm text-stone-700 bg-stone-50 rounded-xl px-3 py-2">{d}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── PHẦN 2: Trạch Nhật ── */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <Calendar className="size-4 text-amber-500" />
            <h2 className="text-base font-bold text-stone-800">2. Chọn Ngày Tốt (Trạch Nhật)</h2>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
            {/* Chọn tháng/năm */}
            <div className="flex items-center gap-3 mb-5">
              <select
                value={selMonth}
                onChange={e => { setSelMonth(parseInt(e.target.value)); setSelectedDay(null); }}
                className="rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={i} value={i+1}>{m}</option>
                ))}
              </select>
              <select
                value={selYear}
                onChange={e => { setSelYear(parseInt(e.target.value)); setSelectedDay(null); }}
                className="rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              >
                {Array.from({ length: 5 }, (_, i) => currentYear + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {suggestedDays.length === 0 ? (
              <div className="text-center py-8 text-stone-400">
                <p className="text-sm">Tháng này không có ngày tốt đủ điểm (≥65).</p>
                <p className="text-xs mt-1">Thử chọn tháng khác.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-stone-400 mb-3">
                  Tìm thấy <span className="font-semibold text-amber-600">{suggestedDays.length}</span> ngày tốt trong tháng — click để xem giờ Hoàng Đạo
                </p>
                {suggestedDays.map(day => (
                  <DayCard
                    key={day.solarDate}
                    day={day}
                    selected={selectedDay?.solarDate === day.solarDate}
                    onSelect={setSelectedDay}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── PHẦN 3: Giờ Hoàng Đạo ── */}
        {selectedDay && (
          <section>
            <div className="flex items-center gap-2 mb-5">
              <Clock className="size-4 text-amber-500" />
              <h2 className="text-base font-bold text-stone-800">3. Giờ Hoàng Đạo</h2>
            </div>
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
              <p className="text-sm text-stone-600 mb-4">
                Ngày <span className="font-semibold text-stone-900">
                  {new Date(selectedDay.solarDate + "T00:00:00").toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric", year: "numeric" })}
                </span> — Ngày {selectedDay.lunarDay}/{selectedDay.lunarMonth} âm
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {gioHD.map(g => (
                  <div
                    key={g.chi}
                    className={`rounded-xl border p-3 text-center ${
                      g.isHoangDao
                        ? "border-amber-300 bg-amber-50"
                        : "border-stone-200 bg-stone-50 opacity-50"
                    }`}
                  >
                    <p className={`font-bold text-sm ${ g.isHoangDao ? "text-amber-700" : "text-stone-400" }`}>
                      Giờ {g.chi}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">{g.time}</p>
                    {g.isHoangDao && (
                      <span className="inline-block mt-1 text-[10px] font-bold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full">Hoàng Đạo</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3">
                <Info className="size-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-700 space-y-1">
                  <p><strong>Ngày cúng ông bà / rước dâu:</strong> Chọn giờ Hoàng Đạo buổi sáng (Dần, Mão, Thìn) để làm lễ rước dâu.</p>
                  <p><strong>Đãi tiệc:</strong> Có thể chọn ngày hôm sau hoặc cùng ngày — ưu tiên giờ Hoàng Đạo buổi chiều (Ngọ, Mùi).</p>
                  <p><strong>Lưu ý:</strong> Kết quả mang tính tham khảo theo phong tục truyền thống. Nên hỏi thêm thầy coi số để được tư vấn chi tiết theo bát tự.</p>
                </div>
              </div>
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
