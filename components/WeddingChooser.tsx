"use client";

import { useState, useMemo } from "react";
import {
  tinhHopTuoi,
  suggestDaysInMonth,
  getGioHoangDao,
  getCanChi,
  type DayRating,
  type CompatResult,
  type GioHoangDao,
} from "@/utils/thongThu";
import {
  Calendar, Clock, Star, ChevronDown, ChevronUp,
  Info, AlertTriangle, Heart,
} from "lucide-react";

const MONTH_NAMES = [
  "Th1","Th2","Th3","Th4","Th5","Th6",
  "Th7","Th8","Th9","Th10","Th11","Th12",
];
const NH = "Mộc,Mộc,Hỏa,Hỏa,Thổ,Thổ,Kim,Kim,Thủy,Thủy".split(",");

function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-emerald-500"
    : score >= 65 ? "bg-amber-400"
    : score >= 45 ? "bg-yellow-300"
    : "bg-red-400";
  return (
    <div className="w-full bg-stone-100 rounded-full h-1.5">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${score}%` }} />
    </div>
  );
}

function DayCard({
  day, onSelect, selected, hasAge,
}: {
  day: DayRating; onSelect: (d: DayRating) => void; selected: boolean; hasAge: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const labelColor =
    day.label === "Đại Cát" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : day.label === "Tốt" ? "bg-amber-100 text-amber-700 border-amber-200"
    : "bg-stone-100 text-stone-600 border-stone-200";
  const hasWarning = day.tuoiCheck && day.tuoiCheck.penalty > 0;

  return (
    <div className={`rounded-xl border transition-all text-left ${
      selected ? "border-amber-400 bg-amber-50 shadow" : "border-stone-200 bg-white hover:border-amber-300"
    }`}>
      <button onClick={() => onSelect(day)} className="w-full text-left px-3 pt-3 pb-2">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-stone-900 text-sm leading-tight">
                {new Date(day.solarDate + "T00:00:00").toLocaleDateString("vi-VN", {
                  weekday: "short", day: "numeric", month: "numeric",
                })}
              </p>
              {hasWarning && <AlertTriangle className="size-3 text-orange-500 shrink-0" />}
            </div>
            <p className="text-[11px] text-stone-400 mt-0.5">
              {day.isLeapMonth ? "Nhuận " : ""}Ngày {day.lunarDay}/{day.lunarMonth} âm
              {" · "}{day.thapNhiTruc}{" · "}{day.isHoangDao ? "Hoàng Đạo" : "Hắc Đạo"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[11px] font-bold border px-2 py-0.5 rounded-full ${labelColor}`}>{day.label}</span>
            <span className="text-[11px] text-stone-400">{day.score}đ</span>
          </div>
        </div>
        <ScoreBar score={day.score} />
      </button>
      <div className="px-3 pb-2">
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-[11px] text-stone-400 flex items-center gap-0.5 hover:text-amber-600 transition-colors"
        >
          {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          {expanded ? "Ẩn phân tích" : "Phân tích"}
          {!hasAge && <span className="text-orange-400 ml-1">— nhập tuổi để chính xác hơn</span>}
        </button>
        {expanded && (
          <ul className="mt-1.5 space-y-1">
            {day.reasons.map((r, i) => (
              <li key={i} className="text-[11px] text-stone-600 bg-stone-50 rounded px-2 py-1">{r}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function GioCard({ g }: { g: GioHoangDao }) {
  const xungHai = g.isXungGroom || g.isXungBride || g.isHaiGroom || g.isHaiBride;
  const base = !g.isHoangDao
    ? "border-stone-100 bg-stone-50/60 opacity-40"
    : xungHai ? "border-orange-200 bg-orange-50"
    : "border-amber-200 bg-amber-50";
  return (
    <div className={`rounded-lg border p-2 text-center ${base}`}>
      <p className={`font-bold text-xs ${
        !g.isHoangDao ? "text-stone-400" : xungHai ? "text-orange-700" : "text-amber-700"
      }`}>{g.chi}</p>
      <p className="text-[10px] text-stone-400 leading-tight">{g.time}</p>
      {g.isHoangDao && (
        <span className={`inline-block mt-0.5 text-[9px] font-bold px-1 py-0.5 rounded-full ${
          xungHai ? "bg-orange-200 text-orange-800" : "bg-amber-200 text-amber-800"
        }`}>
          {xungHai ? (g.isXungGroom || g.isXungBride ? "Xung" : "Hại") : "✔"}
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
  const [compatResult, setCompatResult] = useState<CompatResult | null>(null);
  const [showCompatDetail, setShowCompatDetail] = useState(false);
  const [showPhoi, setShowPhoi] = useState(false);

  const [selYear, setSelYear] = useState(currentYear);
  const [selMonth, setSelMonth] = useState(currentMonth);
  const [selectedDay, setSelectedDay] = useState<DayRating | null>(null);

  const groomY = groomYear ? parseInt(groomYear) : undefined;
  const brideY = brideYear ? parseInt(brideYear) : undefined;
  const hasAge = !!(groomY && brideY && groomY >= 1900 && brideY >= 1900);

  const suggestedDays = useMemo(
    () => suggestDaysInMonth(selYear, selMonth, 65, groomY, brideY),
    [selYear, selMonth, groomY, brideY]
  );

  const gioHD = useMemo((): GioHoangDao[] => {
    if (!selectedDay) return [];
    const [yStr, mStr, dStr] = selectedDay.solarDate.split("-");
    return getGioHoangDao(parseInt(dStr), parseInt(mStr), parseInt(yStr), groomY, brideY);
  }, [selectedDay, groomY, brideY]);

  function handleCalcCompat() {
    if (!hasAge) return;
    setCompatResult(tinhHopTuoi(groomY!, brideY!));
    setShowPhoi(true);
  }

  const groomCC = groomY && groomY >= 1900 ? getCanChi(groomY) : null;
  const brideCC = brideY && brideY >= 1900 ? getCanChi(brideY) : null;

  return (
    <div className="space-y-5 pb-12">

      {/* ── CARD 1: Tuổi + Phối Mệnh ── */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm">
        {/* Header row */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-stone-100">
          <Star className="size-4 text-amber-500 shrink-0" />
          <span className="text-sm font-bold text-stone-800">Tuổi cô dâu & chú rể</span>
          {hasAge && (
            <span className="ml-auto text-[11px] text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              ✅ Đã lọc theo tuổi
            </span>
          )}
        </div>

        <div className="px-4 py-3 space-y-3">
          {/* 2 input năm sinh */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-stone-400 mb-1">Chú rể</label>
              <input
                type="number" min={1900} max={2100}
                value={groomYear}
                onChange={e => { setGroomYear(e.target.value); setSelectedDay(null); setCompatResult(null); }}
                placeholder="1995"
                className="w-full rounded-lg border border-stone-200 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
              {groomCC && (
                <p className="text-[11px] text-amber-700 mt-0.5 font-medium">{groomCC.can} {groomCC.chi} — {NH[groomCC.canIdx]}</p>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-stone-400 mb-1">Cô dâu</label>
              <input
                type="number" min={1900} max={2100}
                value={brideYear}
                onChange={e => { setBrideYear(e.target.value); setSelectedDay(null); setCompatResult(null); }}
                placeholder="1997"
                className="w-full rounded-lg border border-stone-200 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
              {brideCC && (
                <p className="text-[11px] text-rose-600 mt-0.5 font-medium">{brideCC.can} {brideCC.chi} — {NH[brideCC.canIdx]}</p>
              )}
            </div>
          </div>

          {/* Nút Phối Mệnh */}
          <button
            onClick={handleCalcCompat}
            disabled={!hasAge}
            className="w-full btn-primary text-sm py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Heart className="size-3.5 inline mr-1.5" />
            Tính hợp tuổi (Phối Mệnh)
          </button>

          {/* Kết quả Phối Mệnh — accordion */}
          {compatResult && (
            <div className="border border-stone-100 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowPhoi(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-stone-50 hover:bg-stone-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className={`size-7 rounded-lg flex items-center justify-center font-black text-sm ${
                    compatResult.score >= 80 ? "bg-emerald-100 text-emerald-700"
                    : compatResult.score >= 65 ? "bg-amber-100 text-amber-700"
                    : compatResult.score >= 50 ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-600"
                  }`}>{compatResult.score}</span>
                  <span className="text-sm font-semibold text-stone-800">{compatResult.summary}</span>
                </div>
                {showPhoi ? <ChevronUp className="size-4 text-stone-400" /> : <ChevronDown className="size-4 text-stone-400" />}
              </button>
              {showPhoi && (
                <div className="px-3 py-3 space-y-2">
                  <ScoreBar score={compatResult.score} />
                  <button
                    onClick={() => setShowCompatDetail(v => !v)}
                    className="text-[11px] text-stone-400 flex items-center gap-0.5 hover:text-amber-600"
                  >
                    {showCompatDetail ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                    {showCompatDetail ? "Ẩn chi tiết" : "Xem phân tích"}
                  </button>
                  {showCompatDetail && (
                    <ul className="space-y-1">
                      {compatResult.detail.map((d, i) => (
                        <li key={i} className="text-[11px] text-stone-700 bg-stone-50 rounded px-2 py-1">{d}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── CARD 2: Trạch Nhật ── */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-stone-100">
          <Calendar className="size-4 text-amber-500 shrink-0" />
          <span className="text-sm font-bold text-stone-800">Trạch Nhật — Chọn ngày</span>
        </div>
        <div className="px-4 py-3">
          {/* Bộ chọn tháng/năm */}
          <div className="flex items-center gap-2 mb-3">
            <select
              value={selMonth}
              onChange={e => { setSelMonth(parseInt(e.target.value)); setSelectedDay(null); }}
              className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={i} value={i+1}>{m}</option>
              ))}
            </select>
            <select
              value={selYear}
              onChange={e => { setSelYear(parseInt(e.target.value)); setSelectedDay(null); }}
              className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            >
              {Array.from({ length: 5 }, (_, i) => currentYear + i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {suggestedDays.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-6">Không có ngày đủ điểm (≥65) — thử tháng khác.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-stone-400">
                <span className="font-semibold text-amber-600">{suggestedDays.length}</span> ngày tốt — click để xem giờ Hoàng Đạo
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
      </div>

      {/* ── CARD 3: Giờ Hoàng Đạo ── */}
      {selectedDay && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-stone-100">
            <Clock className="size-4 text-amber-500 shrink-0" />
            <span className="text-sm font-bold text-stone-800">Giờ Hoàng Đạo</span>
            <span className="ml-auto text-[11px] text-stone-500">
              Chi ngày: <span className="font-semibold">{selectedDay.chiNgay}</span>
            </span>
          </div>
          <div className="px-4 py-3">
            <p className="text-[11px] text-stone-500 mb-3">
              {new Date(selectedDay.solarDate + "T00:00:00").toLocaleDateString("vi-VN", {
                weekday: "long", day: "numeric", month: "numeric", year: "numeric",
              })}
              {" — Ngày "}{selectedDay.lunarDay}/{selectedDay.lunarMonth} âm
            </p>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
              {gioHD.map(g => <GioCard key={g.chi} g={g} />)}
            </div>

            {/* Chú giải */}
            <div className="flex flex-wrap gap-3 mb-3 text-[11px]">
              <div className="flex items-center gap-1">
                <div className="size-2.5 rounded-full bg-amber-400" />
                <span className="text-stone-500">Hoàng Đạo</span>
              </div>
              {hasAge && (
                <div className="flex items-center gap-1">
                  <div className="size-2.5 rounded-full bg-orange-400" />
                  <span className="text-stone-500">Hoàng Đạo bị xung/hại tuổi</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <div className="size-2.5 rounded-full bg-stone-300" />
                <span className="text-stone-500">Hắc Đạo</span>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex gap-2.5">
              <Info className="size-3.5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-rose-600 space-y-0.5">
                <p><strong>Rước dâu / Làm lễ:</strong> Giờ Hoàng Đạo buổi sáng (Dần, Mão, Thìn) không xung tuổi.</p>
                <p><strong>Đãi tiệc:</strong> Ngọ, Mùi, Thân.</p>
                <p><strong>Lưu ý:</strong> Mang tính tham khảo — nên xem thêm bát tự.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
