"use client";

import { FamilyEvent } from "@/utils/eventHelpers";
import { AnimatePresence, motion } from "framer-motion";
import { Cake, ChevronLeft, ChevronRight, Flower, Star, X } from "lucide-react";
import { Solar } from "lunar-javascript";
import { useMemo, useState } from "react";
import { useDashboard } from "./DashboardContext";

interface EventCalendarProps {
  events: FamilyEvent[];
}

const MONTH_NAMES = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4",
  "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8",
  "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];
const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

/** Chuyển ngày dương sang âm lịch, trả về { lunarDay, lunarMonth, isLeap } */
function solarToLunar(year: number, month: number, day: number): { lunarDay: number; lunarMonth: number; isLeap: boolean } | null {
  try {
    const solar = Solar.fromYmd(year, month, day);
    const lunar = solar.getLunar();
    const rawMonth = lunar.getMonth();
    return {
      lunarDay: lunar.getDay(),
      lunarMonth: Math.abs(rawMonth),
      isLeap: rawMonth < 0,
    };
  } catch {
    return null;
  }
}

type DayEvent = FamilyEvent & { dot: "birthday" | "death" | "custom" };

export default function EventCalendar({ events }: EventCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const { setMemberModalId } = useDashboard();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDay(null);
  };
  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDay(today.getDate());
  };

  // Tính âm lịch cho tất cả ngày trong tháng hiện tại
  const lunarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const result: Array<{ lunarDay: number; lunarMonth: number; isLeap: boolean } | null> = [];
    for (let d = 1; d <= daysInMonth; d++) {
      result.push(solarToLunar(viewYear, viewMonth + 1, d));
    }
    return result;
  }, [viewYear, viewMonth]);

  const eventsByDay = useMemo(() => {
    const map = new Map<number, DayEvent[]>();
    for (const ev of events) {
      const d = ev.nextOccurrence;
      if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
        const day = d.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push({
          ...ev,
          dot: ev.type === "birthday" ? "birthday" : ev.type === "custom_event" ? "custom" : "death",
        });
      }
    }
    return map;
  }, [events, viewYear, viewMonth]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDow = getFirstDayOfWeek(viewYear, viewMonth);

  const isToday = (day: number) =>
    day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  const selectedEvents = selectedDay ? (eventsByDay.get(selectedDay) ?? []) : [];
  const selectedLunar = selectedDay ? lunarDays[selectedDay - 1] : null;

  return (
    <div className="bg-white/80 border border-stone-200/60 rounded-3xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="size-8 flex items-center justify-center rounded-xl hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors">
            <ChevronLeft className="size-4" />
          </button>
          <h2 className="text-base font-bold text-stone-800 min-w-[130px] text-center">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h2>
          <button onClick={nextMonth} className="size-8 flex items-center justify-center rounded-xl hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors">
            <ChevronRight className="size-4" />
          </button>
        </div>
        <button onClick={goToday} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60 hover:bg-amber-100 transition-colors">
          Hôm nay
        </button>
      </div>

      {/* Day of week labels */}
      <div className="grid grid-cols-7 px-3 pb-1">
        {DAY_LABELS.map((d, i) => (
          <div key={d} className={`text-center text-[11px] font-bold py-1 ${
            i === 0 ? "text-rose-400" : i === 6 ? "text-blue-400" : "text-stone-400"
          }`}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-stone-100/60 border-t border-stone-100">
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-stone-50/40 min-h-[60px] sm:min-h-[72px]" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const dayEvents = eventsByDay.get(day) ?? [];
          const hasBirthday = dayEvents.some(e => e.dot === "birthday");
          const hasDeath = dayEvents.some(e => e.dot === "death");
          const hasCustom = dayEvents.some(e => e.dot === "custom");
          const isSelected = selectedDay === day;
          const today_ = isToday(day);
          const lunar = lunarDays[idx];
          const isMung1 = lunar?.lunarDay === 1;
          const isRam = lunar?.lunarDay === 15;
          const isLunarSpecial = isMung1 || isRam;

          // Label ngày âm ngắn
          const lunarLabel = (() => {
            if (!lunar) return null;
            if (isMung1) return `M.${lunar.lunarMonth}${lunar.isLeap ? " n" : ""}`; // Mồng 1 kèm số tháng
            if (isRam) return "Rằm";
            return lunar.lunarDay.toString();
          })();

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`relative bg-white min-h-[60px] sm:min-h-[72px] flex flex-col items-center pt-1.5 pb-1 gap-0.5 transition-all hover:bg-amber-50/60 group ${
                isSelected ? "ring-2 ring-inset ring-amber-400 bg-amber-50/80" : ""
              } ${
                isLunarSpecial && !today_ ? "bg-amber-50/30" : ""
              }`}
            >
              {/* Số ngày dương */}
              <span className={`size-7 flex items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                today_ ? "bg-amber-500 text-white shadow-sm" :
                isSelected ? "text-amber-700" :
                "text-stone-700 group-hover:text-amber-700"
              }`}>
                {day}
              </span>

              {/* Ngày âm lịch */}
              {lunarLabel && (
                <span className={`text-[9px] sm:text-[10px] leading-none font-medium px-1 rounded ${
                  isMung1
                    ? "text-amber-700 font-bold"
                    : isRam
                    ? "text-amber-600 font-bold"
                    : "text-stone-400"
                }`}>
                  {lunarLabel}
                </span>
              )}

              {/* Dots sự kiện + chấm mùng1/rằm */}
              <div className="flex items-center gap-[3px] flex-wrap justify-center px-0.5 mt-auto pb-0.5">
                {isLunarSpecial && (
                  <span className={`size-1.5 rounded-full ${
                    isMung1 ? "bg-amber-400" : "bg-yellow-400"
                  }`} />
                )}
                {hasBirthday && <span className="size-1.5 rounded-full bg-blue-400" />}
                {hasDeath && <span className="size-1.5 rounded-full bg-rose-400" />}
                {hasCustom && <span className="size-1.5 rounded-full bg-purple-400" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-5 py-3 border-t border-stone-100 flex-wrap">
        <span className="flex items-center gap-1.5 text-[11px] text-stone-500 font-medium">
          <span className="size-2 rounded-full bg-amber-400 shrink-0" /> Mùng 1
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-stone-500 font-medium">
          <span className="size-2 rounded-full bg-yellow-400 shrink-0" /> Rằm
        </span>
        <span className="w-px h-3 bg-stone-200" />
        <span className="flex items-center gap-1.5 text-[11px] text-stone-500 font-medium">
          <span className="size-2 rounded-full bg-blue-400 shrink-0" /> Sinh nhật
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-stone-500 font-medium">
          <span className="size-2 rounded-full bg-rose-400 shrink-0" /> Ngày giỗ
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-stone-500 font-medium">
          <span className="size-2 rounded-full bg-purple-400 shrink-0" /> Sự kiện tuỳ chỉnh
        </span>
      </div>

      {/* Selected day popup */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="border-t border-stone-100 bg-stone-50/60 px-4 py-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-stone-700">
                  Ngày {selectedDay}/{viewMonth + 1}/{viewYear}
                  {selectedEvents.length > 0 && (
                    <span className="ml-1 text-stone-500 font-normal">· {selectedEvents.length} sự kiện</span>
                  )}
                </p>
                {selectedLunar && (
                  <p className={`text-xs mt-0.5 font-semibold ${
                    selectedLunar.lunarDay === 1 || selectedLunar.lunarDay === 15
                      ? "text-amber-600"
                      : "text-stone-400"
                  }`}>
                    🌙 {selectedLunar.lunarDay === 1
                      ? `Mùng 1 tháng ${selectedLunar.lunarMonth}${selectedLunar.isLeap ? " nhuận" : ""}  Âm lịch`
                      : selectedLunar.lunarDay === 15
                      ? `Rằm tháng ${selectedLunar.lunarMonth}${selectedLunar.isLeap ? " nhuận" : ""}  Âm lịch`
                      : `${selectedLunar.lunarDay}/${selectedLunar.lunarMonth}${selectedLunar.isLeap ? " nhuận" : ""} Âm lịch`
                    }
                  </p>
                )}
              </div>
              <button onClick={() => setSelectedDay(null)}
                className="size-6 flex items-center justify-center rounded-full hover:bg-stone-200 text-stone-400 hover:text-stone-600 transition-colors">
                <X className="size-3.5" />
              </button>
            </div>

            {selectedEvents.length > 0 ? (
              <div className="space-y-2">
                {selectedEvents.map((ev, i) => {
                  const d = ev.nextOccurrence;
                  const solarLabel = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
                  return (
                    <button
                      key={i}
                      onClick={() => { if (ev.personId && ev.type !== "custom_event") setMemberModalId(ev.personId); }}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                        ev.dot === "birthday"
                          ? "bg-blue-50 border-blue-100 hover:border-blue-300"
                          : ev.dot === "custom"
                            ? "bg-purple-50 border-purple-100 hover:border-purple-300"
                            : "bg-rose-50 border-rose-100 hover:border-rose-300"
                      }`}
                    >
                      <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                        ev.dot === "birthday" ? "bg-blue-100 text-blue-500" :
                        ev.dot === "custom" ? "bg-purple-100 text-purple-500" :
                        "bg-rose-100 text-rose-500"
                      }`}>
                        {ev.dot === "birthday" ? <Cake className="size-4" /> :
                         ev.dot === "custom" ? <Star className="size-4" /> :
                         <Flower className="size-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-800 truncate">{ev.personName}</p>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          {ev.dot === "death" ? (
                            <>
                              <p className="text-xs text-stone-500">Ngày giỗ · {solarLabel}</p>
                              <p className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                                <span>🌙</span>
                                <span>{ev.eventDateLabel}</span>
                                {ev.originYear && (
                                  <span className="font-normal text-stone-400 ml-1">· {new Date().getFullYear() - ev.originYear} năm</span>
                                )}
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-stone-500">
                              {ev.dot === "birthday" ? "Sinh nhật" : "Sự kiện"}
                              {ev.originYear && ev.dot === "birthday" && (
                                <span className="ml-1 text-stone-400">· {new Date().getFullYear() - ev.originYear} tuổi</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Ngày không có sự kiện — vẫn hiện âm lịch */
              <p className="text-xs text-stone-400 text-center py-2">Không có sự kiện nào trong ngày này</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
