"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  tinhHopTuoi,
  suggestDaysInMonth,
  getGioHoangDao,
  getCanChi,
  type DayRating,
  type CompatResult,
  type GioHoangDao,
} from "@/utils/thongThu";
import { Calendar, Clock, Star, ChevronDown, ChevronUp, Info, AlertTriangle, Check, CheckCircle2 } from "lucide-react";

const MONTH_NAMES = [
  "Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6",
  "Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12",
];

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-emerald-500"
    : score >= 65 ? "bg-amber-400"
    : score >= 45 ? "bg-yellow-300"
    : "bg-red-400";
  return (
    <div className="w-full bg-stone-100 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${score}%` }} />
    </div>
  );
}

function DayCard({
  day,
  onSelect,
  selected,
  hasAge,
}: {
  day: DayRating;
  onSelect: (d: DayRating) => void;
  selected: boolean;
  hasAge: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const labelColor =
    day.label === "Đại Cát" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : day.label === "Tốt" ? "bg-amber-100 text-amber-700 border-amber-200"
    : "bg-stone-100 text-stone-600 border-stone-200";

  const hasWarning = day.tuoiCheck && day.tuoiCheck.penalty > 0;

  return (
    <div
      className={`rounded-2xl border transition-all ${
        selected ? "border-amber-400 bg-amber-50 shadow-md" : "border-stone-200 bg-white hover:border-amber-300 hover:shadow-sm"
      }`}
    >
      <button
        onClick={() => onSelect(day)}
        className="w-full text-left p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-stone-900">
                {new Date(day.solarDate + "T00:00:00").toLocaleDateString("vi-VN", {
                  weekday: "long", day: "numeric", month: "numeric", year: "numeric",
                })}
              </p>
              {hasWarning && (
                <AlertTriangle className="size-3.5 text-orange-500 shrink-0" />
              )}
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              {day.isLeapMonth ? "Nhuận " : ""}Ngày {day.lunarDay}/{day.lunarMonth} âm
              {" · "}{day.thapNhiTruc}
              {" · "}{day.isHoangDao ? "Hoàng Đạo" : "Hắc Đạo"}
              {" · "}Chi ngày: {day.chiNgay}
            </p>
          </div>
          <span className={`ml-3 text-xs font-bold border px-2.5 py-1 rounded-full shrink-0 ${labelColor}`}>
            {day.label}
          </span>
        </div>
        <ScoreBar score={day.score} />
        <p className="text-xs text-stone-400 mt-1">{day.score}/100 điểm</p>
      </button>

      <div className="px-4 pb-3">
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-xs text-stone-400 flex items-center gap-1 hover:text-amber-600 transition-colors"
        >
          {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          {expanded ? "Ẩn phân tích" : "Xem phân tích"}
          {!hasAge && <span className="text-orange-400 ml-1">(nhập tuổi để có kết quả chính xác hơn)</span>}
        </button>
        {expanded && (
          <ul className="mt-2 space-y-1">
            {day.reasons.map((r, i) => (
              <li key={i} className="text-xs text-stone-700 bg-stone-50 rounded-lg px-2.5 py-1.5">{r}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function GioCard({ g }: { g: GioHoangDao }) {
  const xungHai = g.isXungGroom || g.isXungBride || g.isHaiGroom || g.isHaiBride;
  const bgClass = !g.isHoangDao
    ? "border-stone-200 bg-stone-50 opacity-40"
    : xungHai
    ? "border-orange-300 bg-orange-50"
    : "border-amber-300 bg-amber-50";

  return (
    <div className={`rounded-xl border p-3 text-center ${bgClass}`}>
      <p className={`font-bold text-sm ${
        !g.isHoangDao ? "text-stone-400"
        : xungHai ? "text-orange-700"
        : "text-amber-700"
      }`}>
        Giờ {g.chi}
      </p>
      <p className="text-xs text-stone-500 mt-0.5">{g.time}</p>
      {g.isHoangDao && !xungHai && (
        <span className="inline-flex items-center gap-0.5 mt-1 text-[10px] font-bold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full">
          <Check className="size-2.5" />Hoàng Đạo
        </span>
      )}
      {g.isHoangDao && xungHai && (
        <span className="inline-block mt-1 text-[10px] font-bold bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded-full">
          {g.isXungGroom || g.isXungBride ? "Xung tuổi" : "Hại tuổi"}
        </span>
      )}
    </div>
  );
}

export default function WeddingChooser() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [groomYear, setGroomYear] = useState("");
  const [brideYear, setBrideYear] = useState("");
  const [showCompatDetail, setShowCompatDetail] = useState(false);

  const [selYear, setSelYear] = useState(currentYear);
  const [selMonth, setSelMonth] = useState(currentMonth);
  const [selectedDay, setSelectedDay] = useState<DayRating | null>(null);

  const gioRef = useRef<HTMLElement>(null);

  const groomY = groomYear ? parseInt(groomYear) : undefined;
  const brideY = brideYear ? parseInt(brideYear) : undefined;
  const hasAge = !!(groomY && brideY && groomY >= 1900 && brideY >= 1900);

  const compatResult = useMemo<CompatResult | null>(
    () => hasAge ? tinhHopTuoi(groomY!, brideY!) : null,
    [groomY, brideY, hasAge]
  );

  const suggestedDays = useMemo(
    () => suggestDaysInMonth(selYear, selMonth, 65, groomY, brideY),
    [selYear, selMonth, groomY, brideY]
  );

  const gioHD = useMemo((): GioHoangDao[] => {
    if (!selectedDay) return [];
    const [yStr, mStr, dStr] = selectedDay.solarDate.split("-");
    return getGioHoangDao(
      parseInt(dStr), parseInt(mStr), parseInt(yStr),
      groomY, brideY
    );
  }, [selectedDay, groomY, brideY]);

  useEffect(() => {
    if (selectedDay && gioRef.current) {
      setTimeout(() => {
        gioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [selectedDay]);

  const groomCC = groomY && groomY >= 1900 ? getCanChi(groomY) : null;
  const brideCC = brideY && brideY >= 1900 ? getCanChi(brideY) : null;

  return (
    <main className="flex-1 w-full">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* ── PHẦN 1: Nhập tuổi ── */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <Star className="size-4 text-amber-500" />
            <h2 className="text-base font-bold text-stone-800">1. Nhập tuổi cô dâu & chú rể</h2>
          </div>
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">Năm sinh Chú rể</label>
                <input
                  type="number" min={1900} max={2100}
                  value={groomYear}
                  onChange={e => { setGroomYear(e.target.value); setSelectedDay(null); }}
                  placeholder="VD: 1995"
                  className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                {groomCC && (
                  <p className="text-xs text-amber-700 mt-1 font-medium">{groomCC.can} {groomCC.chi} — Ngũ Hành: {"Mộc,Mộc,Hỏa,Hỏa,Thổ,Thổ,Kim,Kim,Thủy,Thủy".split(",")[groomCC.canIdx]}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">Năm sinh Cô dâu</label>
                <input
                  type="number" min={1900} max={2100}
                  value={brideYear}
                  onChange={e => { setBrideYear(e.target.value); setSelectedDay(null); }}
                  placeholder="VD: 1997"
                  className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
                {brideCC && (
                  <p className="text-xs text-rose-600 mt-1 font-medium">{brideCC.can} {brideCC.chi} — Ngũ Hành: {"Mộc,Mộc,Hỏa,Hỏa,Thổ,Thổ,Kim,Kim,Thủy,Thủy".split(",")[brideCC.canIdx]}</p>
                )}
              </div>
            </div>

            {!hasAge && (
              <p className="text-xs text-stone-400 text-center flex items-center justify-center gap-1">
                <Info className="size-3.5 shrink-0" />
                Nhập năm sinh để kết quả chọn ngày & giờ tự động lọc theo tuổi
              </p>
            )}

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
              {hasAge && (
                <span className="text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" />Đã lọc theo tuổi
                </span>
              )}
            </div>

            {suggestedDays.length === 0 ? (
              <div className="text-center py-8 text-stone-400">
                <p className="text-sm">Không có ngày đủ điểm (≥65) trong tháng này.</p>
                <p className="text-xs mt-1">Thử chọn tháng khác.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-stone-400 mb-3">
                  Tìm thấy{" "}
                  <span className="font-semibold text-amber-600">{suggestedDays.length}</span>{" "}
                  ngày tốt — click để xem giờ Hoàng Đạo
                </p>
                {suggestedDays.map(day => (
                  <DayCard
                    key={day.solarDate}
                    day={day}
                    selected={selectedDay?.solarDate === day.solarDate}
                    onSelect={setSelectedDay}
                    hasAge={hasAge}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── PHẦN 3: Giờ Hoàng Đạo ── */}
        {selectedDay && (
          <section ref={gioRef}>
            <div className="flex items-center gap-2 mb-5">
              <Clock className="size-4 text-amber-500" />
              <h2 className="text-base font-bold text-stone-800">3. Giờ Hoàng Đạo</h2>
            </div>
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
              <p className="text-sm text-stone-600 mb-4">
                Ngày{" "}
                <span className="font-semibold text-stone-900">
                  {new Date(selectedDay.solarDate + "T00:00:00").toLocaleDateString("vi-VN", {
                    weekday: "long", day: "numeric", month: "numeric", year: "numeric",
                  })}
                </span>
                {" "}— Ngày {selectedDay.lunarDay}/{selectedDay.lunarMonth} âm
                {" · Chi ngày: "}<span className="font-semibold">{selectedDay.chiNgay}</span>
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {gioHD.map(g => <GioCard key={g.chi} g={g} />)}
              </div>

              <div className="flex flex-wrap gap-3 mb-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="size-3 rounded-full bg-amber-400" />
                  <span className="text-stone-500">Hoàng Đạo</span>
                </div>
                {hasAge && (
                  <div className="flex items-center gap-1.5">
                    <div className="size-3 rounded-full bg-orange-400" />
                    <span className="text-stone-500">Hoàng Đạo nhưng xung/hại tuổi</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <div className="size-3 rounded-full bg-stone-300" />
                  <span className="text-stone-500">Hắc Đạo — tránh</span>
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3">
                <Info className="size-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-700 space-y-1">
                  <p><strong>Rước dâu / Làm lễ:</strong> Chọn giờ Hoàng Đạo buổi sáng (Dần 03–05h, Mão 05–07h, Thìn 07–09h) không bị xung tuổi.</p>
                  <p><strong>Đãi tiệc:</strong> Ưu tiên giờ Hoàng Đạo buổi trưa – chiều (Ngọ, Mùi, Thân).</p>
                  <p><strong>Lưu ý:</strong> Kết quả mang tính tham khảo theo phong tục truyền thống. Nên tư vấn thêm thầy coi số để xét bát tự.</p>
                </div>
              </div>
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
