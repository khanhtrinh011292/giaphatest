import { Lunar, Solar } from "lunar-javascript";

export type EventType = "birthday" | "death_anniversary" | "custom_event" | "lunar_festival" | "holiday";

export interface FamilyEvent {
  personId: string | null;
  personName: string;
  type: EventType;
  /** Solar date of the next occurrence */
  nextOccurrence: Date;
  /** Days until the next occurrence (negative = already passed this year) */
  daysUntil: number;
  /** Display label for the date of the event */
  eventDateLabel: string;
  /** The actual year of original event */
  originYear?: number | null;
  originMonth?: number | null;
  originDay?: number | null;
  /** Whether the person is deceased */
  isDeceased: boolean;
  /** Optional location for the event */
  location?: string | null;
  /** Optional content/description for the event */
  content?: string | null;
  /** Sub-label for lunar_festival: 'mung1' | 'ram' */
  festivalKind?: "mung1" | "ram";
}

export interface CustomEventRecord {
  id: string;
  name: string;
  content: string | null;
  event_date: string;
  location: string | null;
  created_by: string | null;
}

function nextSolarForLunar(
  lunarMonth: number,
  lunarDay: number,
  fromDate: Date,
): Date | null {
  const todaySolar = Solar.fromYmd(
    fromDate.getFullYear(),
    fromDate.getMonth() + 1,
    fromDate.getDate(),
  );
  const currentLunarYear = todaySolar.getLunar().getYear();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LunarClass = Lunar as any;
  for (let offset = 0; offset <= 2; offset++) {
    try {
      const l = LunarClass.fromYmd(currentLunarYear + offset, lunarMonth, lunarDay);
      const s = l.getSolar();
      const candidate = new Date(s.getYear(), s.getMonth() - 1, s.getDay());
      if (candidate >= fromDate) return candidate;
    } catch {
      // skip
    }
  }
  return null;
}

const LUNAR_HOLIDAYS = [
  { month: 1, day: 1, name: "Tết Nguyên Đán" },
  { month: 1, day: 15, name: "Tết Nguyên Tiêu" },
  { month: 3, day: 3, name: "Tết Hàn Thực" },
  { month: 3, day: 10, name: "Giỗ Tổ Hùng Vương" },
  { month: 4, day: 15, name: "Lễ Phật Đản" },
  { month: 5, day: 5, name: "Tết Đoan Ngọ" },
  { month: 7, day: 15, name: "Lễ Vu Lan" },
  { month: 8, day: 15, name: "Tết Trung Thu" },
  { month: 9, day: 9, name: "Tết Trùng Cửu" },
  { month: 10, day: 10, name: "Tết Thường Tân" },
  { month: 12, day: 23, name: "Lễ Ông Công Ông Táo" },
];

const SOLAR_HOLIDAYS = [
  { month: 1, day: 1, name: "Tết Dương Lịch" },
  { month: 2, day: 14, name: "Lễ Tình nhân (Valentine)" },
  { month: 3, day: 8, name: "Quốc tế Phụ nữ" },
  { month: 4, day: 30, name: "Giải phóng miền Nam" },
  { month: 5, day: 1, name: "Quốc tế Lao động" },
  { month: 9, day: 2, name: "Quốc khánh" },
  { month: 10, day: 20, name: "Ngày Phụ nữ Việt Nam" },
  { month: 11, day: 20, name: "Ngày Nhà giáo Việt Nam" },
  { month: 12, day: 24, name: "Lễ Giáng Sinh" },
];

/** Sinh ra các sự kiện mùng 1 và rằm cho 12 tháng âm tới */
function generateLunarFestivals(today: Date): FamilyEvent[] {
  const events: FamilyEvent[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LunarClass = Lunar as any;
  const todaySolar = Solar.fromYmd(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const currentLunarYear = todaySolar.getLunar().getYear();

  for (let yearOffset = 0; yearOffset <= 1; yearOffset++) {
    for (let lMonth = 1; lMonth <= 12; lMonth++) {
      for (const lDay of [1, 15]) {
        try {
          const l = LunarClass.fromYmd(currentLunarYear + yearOffset, lMonth, lDay);
          const s = l.getSolar();
          const solarDate = new Date(s.getYear(), s.getMonth() - 1, s.getDay());
          const daysUntil = Math.round((solarDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          // Chỉ lấy trong khoảng -7 → +365 ngày
          if (daysUntil < -7 || daysUntil > 365) continue;

          // Bỏ qua các ngày mùng 1 / rằm trùng với Lễ Tết lớn
          if (lDay === 1 && lMonth === 1) continue;
          if (lDay === 15 && [1, 4, 7, 8].includes(lMonth)) continue;

          const isMung1 = lDay === 1;
          events.push({
            personId: null,
            personName: isMung1
              ? `Mùng 1 tháng ${lMonth} Âm lịch`
              : `Rằm tháng ${lMonth} Âm lịch`,
            type: "lunar_festival",
            nextOccurrence: solarDate,
            daysUntil,
            eventDateLabel: `${String(lDay).padStart(2, "0")}/${String(lMonth).padStart(2, "0")} ÂL`,
            isDeceased: false,
            festivalKind: isMung1 ? "mung1" : "ram",
          });
        } catch {
          // skip
        }
      }
    }
  }
  return events;
}

/** Sinh ra các ngày lễ tết Việt Nam (Cả âm và dương) */
function generateHolidays(today: Date): FamilyEvent[] {
  const events: FamilyEvent[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LunarClass = Lunar as any;
  const todaySolar = Solar.fromYmd(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const currentLunarYear = todaySolar.getLunar().getYear();
  const currentSolarYear = today.getFullYear();

  // Âm lịch
  for (let yearOffset = 0; yearOffset <= 1; yearOffset++) {
    for (const h of LUNAR_HOLIDAYS) {
      try {
        const l = LunarClass.fromYmd(currentLunarYear + yearOffset, h.month, h.day);
        const s = l.getSolar();
        const solarDate = new Date(s.getYear(), s.getMonth() - 1, s.getDay());
        const daysUntil = Math.round((solarDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil >= -7 && daysUntil <= 365) {
          events.push({
            personId: null,
            personName: h.name,
            type: "holiday",
            nextOccurrence: solarDate,
            daysUntil,
            eventDateLabel: `${String(h.day).padStart(2, "0")}/${String(h.month).padStart(2, "0")} ÂL`,
            isDeceased: false,
          });
        }
      } catch {
        // skip
      }
    }
  }

  // Dương lịch
  for (let yearOffset = 0; yearOffset <= 1; yearOffset++) {
    for (const h of SOLAR_HOLIDAYS) {
      const solarDate = new Date(currentSolarYear + yearOffset, h.month - 1, h.day);
      const daysUntil = Math.round((solarDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil >= -7 && daysUntil <= 365) {
        events.push({
          personId: null,
          personName: h.name,
          type: "holiday",
          nextOccurrence: solarDate,
          daysUntil,
          eventDateLabel: `${String(h.day).padStart(2, "0")}/${String(h.month).padStart(2, "0")} Dương lịch`,
          isDeceased: false,
        });
      }
    }
  }

  return events;
}

export function computeEvents(
  persons: {
    id: string;
    full_name: string;
    birth_year: number | null;
    birth_month: number | null;
    birth_day: number | null;
    death_year: number | null;
    death_month: number | null;
    death_day: number | null;
    death_lunar_year: number | null;
    death_lunar_month: number | null;
    death_lunar_day: number | null;
    is_deceased: boolean;
  }[],
  customEvents: CustomEventRecord[] = [],
  includeLunarFestivals = false,
): FamilyEvent[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const events: FamilyEvent[] = [];

  for (const p of persons) {
    if (p.birth_month && p.birth_day) {
      const thisYear = today.getFullYear();
      const thisYearDate = new Date(thisYear, p.birth_month - 1, p.birth_day);
      const isUpcoming = thisYearDate >= today;
      const next = isUpcoming
        ? thisYearDate
        : new Date(thisYear + 1, p.birth_month - 1, p.birth_day);
      const daysUntil = Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const baseEvent: FamilyEvent = {
        personId: p.id,
        personName: p.full_name,
        type: "birthday",
        nextOccurrence: next,
        daysUntil,
        eventDateLabel: `${p.birth_day.toString().padStart(2, "0")}/${p.birth_month.toString().padStart(2, "0")}`,
        originYear: p.birth_year || null,
        originMonth: p.birth_month,
        originDay: p.birth_day,
        isDeceased: p.is_deceased,
      };
      events.push(baseEvent);
      if (!isUpcoming) {
        const pastDaysUntil = Math.round((thisYearDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        events.push({ ...baseEvent, nextOccurrence: thisYearDate, daysUntil: pastDaysUntil });
      }
    }

    if (p.is_deceased && ((p.death_lunar_month && p.death_lunar_day) || (p.death_month && p.death_day))) {
      try {
        let lMonth: number;
        let lDay: number;
        if (p.death_lunar_month && p.death_lunar_day) {
          lMonth = p.death_lunar_month;
          lDay = p.death_lunar_day;
        } else {
          const deathYear = p.death_year ?? new Date().getFullYear();
          const solar = Solar.fromYmd(deathYear, p.death_month as number, p.death_day as number);
          const lunar = solar.getLunar();
          lMonth = Math.abs(lunar.getMonth());
          lDay = lunar.getDay();
        }
        const next = nextSolarForLunar(lMonth, lDay, today);
        if (!next) continue;
        const daysUntil = Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const deathEvent: FamilyEvent = {
          personId: p.id,
          personName: p.full_name,
          type: "death_anniversary",
          nextOccurrence: next,
          daysUntil,
          eventDateLabel: `${lDay.toString().padStart(2, "0")}/${lMonth.toString().padStart(2, "0")} ÂL`,
          originYear: (p.death_lunar_year ?? p.death_year) || null,
          originMonth: p.death_lunar_month ?? p.death_month,
          originDay: p.death_lunar_day ?? p.death_day,
          isDeceased: p.is_deceased,
        };
        events.push(deathEvent);
        if (daysUntil > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const LunarClass = Lunar as any;
          const todaySolar = Solar.fromYmd(today.getFullYear(), today.getMonth() + 1, today.getDate());
          const currentLunarYear = todaySolar.getLunar().getYear();
          try {
            const pastLunar = LunarClass.fromYmd(currentLunarYear, lMonth, lDay);
            const pastSolar = pastLunar.getSolar();
            const pastDate = new Date(pastSolar.getYear(), pastSolar.getMonth() - 1, pastSolar.getDay());
            if (pastDate < today) {
              const pastDaysUntil = Math.round((pastDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              events.push({ ...deathEvent, nextOccurrence: pastDate, daysUntil: pastDaysUntil });
            }
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
    }
  }

  for (const ce of customEvents) {
    if (!ce.event_date) continue;
    const [y, m, d] = ce.event_date.split("-").map(Number);
    if (!y || !m || !d) continue;
    const next = new Date(y, m - 1, d);
    const daysUntil = Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    events.push({
      personId: ce.id,
      personName: ce.name,
      type: "custom_event",
      nextOccurrence: next,
      daysUntil,
      eventDateLabel: `${d.toString().padStart(2, "0")}/${m.toString().padStart(2, "0")}/${y}`,
      originYear: y,
      isDeceased: false,
      location: ce.location,
      content: ce.content,
    });
  }

  if (includeLunarFestivals) {
    events.push(...generateLunarFestivals(today));
    events.push(...generateHolidays(today));
  }

  events.sort((a, b) => a.daysUntil - b.daysUntil);
  return events;
}
