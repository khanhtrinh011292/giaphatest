"use client";

import { FamilyEvent } from "@/utils/eventHelpers";
import { AnimatePresence, motion } from "framer-motion";
import { Cake, ChevronLeft, ChevronRight, Flower, Star, X } from "lucide-react";
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

  // Build a map: day -> events for current month/year
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
    // Also include events whose recurring anniversary falls this month
    // (already done above since computeEvents sets nextOccurrence)
    return map;
  }, [events, viewYear, viewMonth]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDow = getFirstDayOfWeek(viewYear, viewMonth);

  const isToday = (day: number) =>
    day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  const selectedEvents = selectedDay ? (eventsByDay.get(selectedDay) ?? []) : [];

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
        {/* Empty cells before month start */}
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-stone-50/40 min-h-[52px] sm:min-h-[64px]" />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const dayEvents = eventsByDay.get(day) ?? [];
          const hasBirthday = dayEvents.some(e => e.dot === "birthday");
          const hasDeath = dayEvents.some(e => e.dot === "death");
          const hasCustom = dayEvents.some(e => e.dot === "custom");
          const isSelected = selectedDay === day;
          const today_ = isToday(day);

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              className={`relative bg-white min-h-[52px] sm:min-h-[64px] flex flex-col items-center pt-2 pb-1.5 gap-1 transition-all hover:bg-amber-50/60 group ${
                isSelected ? "ring-2 ring-inset ring-amber-400 bg-amber-50/80" : ""
              }`}
            >
              <span className={`size-7 flex items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                today_ ? "bg-amber-500 text-white shadow-sm" :
                isSelected ? "text-amber-700" :
                "text-stone-700 group-hover:text-amber-700"
              }`}>
                {day}
              </span>

              {/* Dot indicators */}
              {dayEvents.length > 0 && (
                <div className="flex items-center gap-[3px] flex-wrap justify-center px-1">
                  {hasBirthday && <span className="size-1.5 rounded-full bg-blue-400" />}
                  {hasDeath && <span className="size-1.5 rounded-full bg-rose-400" />}
                  {hasCustom && <span className="size-1.5 rounded-full bg-purple-400" />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 py-3 border-t border-stone-100 flex-wrap">
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
        {selectedDay && selectedEvents.length > 0 && (
          <motion.div
            key={selectedDay}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="border-t border-stone-100 bg-stone-50/60 px-4 py-4"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-stone-700">
                Ngày {selectedDay}/{viewMonth + 1}/{viewYear} · {selectedEvents.length} sự kiện
              </p>
              <button onClick={() => setSelectedDay(null)}
                className="size-6 flex items-center justify-center rounded-full hover:bg-stone-200 text-stone-400 hover:text-stone-600 transition-colors">
                <X className="size-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              {selectedEvents.map((ev, i) => (
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
                    <p className="text-xs text-stone-500">
                      {ev.dot === "birthday" ? "Sinh nhật"
                       : ev.dot === "custom" ? "Sự kiện"
                       : `Ngày giỗ · ${ev.eventDateLabel}`}
                      {ev.originYear && ev.dot === "birthday" && (
                        <span className="ml-1 text-stone-400">· {new Date().getFullYear() - ev.originYear} tuổi</span>
                      )}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
