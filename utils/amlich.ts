// Chuyển đổi Dương → Âm lịch (thuật toán Jean Meeus)
// Trả về { day, month, year, leap } trong lịch Việt/Trung

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  isLeapMonth: boolean;
}

function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jdn =
    dd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;
  if (jdn < 2299161) {
    jdn =
      dd +
      Math.floor((153 * m + 2) / 5) +
      365 * y +
      Math.floor(y / 4) -
      32083;
  }
  return jdn;
}

function jdToDate(jd: number): { dd: number; mm: number; yy: number } {
  let a: number, b: number, c: number;
  if (jd > 2299160) {
    a = jd + 32044;
    b = Math.floor((4 * a + 3) / 146097);
    c = a - Math.floor((b * 146097) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const dd = e - Math.floor((153 * m + 2) / 5) + 1;
  const mm = m + 3 - 12 * Math.floor(m / 10);
  const yy = b * 100 + d - 4800 + Math.floor(m / 10);
  return { dd, mm, yy };
}

function newMoonDay(k: number, timeZone: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180;
  let Jd1 =
    2415020.75933 +
    29.53058868 * k +
    0.0001178 * T2 -
    0.000000155 * T3;
  Jd1 +=
    0.00033 *
    Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M =
    359.2242 +
    29.10535608 * k -
    0.0000333 * T2 -
    0.00000347 * T3;
  const Mpr =
    306.0253 +
    385.81691806 * k +
    0.0107306 * T2 +
    0.00001236 * T3;
  const F =
    21.2964 +
    390.67050646 * k -
    0.0016528 * T2 -
    0.00000239 * T3;
  let C1 =
    (0.1734 - 0.000393 * T) * Math.sin(M * dr) +
    0.0021 * Math.sin(2 * dr * M);
  C1 -= 0.4068 * Math.sin(Mpr * dr);
  C1 += 0.0161 * Math.sin(2 * dr * Mpr);
  C1 -= 0.0004 * Math.sin(3 * dr * Mpr);
  C1 += 0.0104 * Math.sin(2 * dr * F);
  C1 -= 0.0051 * Math.sin((M + Mpr) * dr);
  C1 -= 0.0074 * Math.sin((M - Mpr) * dr);
  C1 += 0.0004 * Math.sin((2 * F + M) * dr);
  C1 -= 0.0004 * Math.sin((2 * F - M) * dr);
  C1 -= 0.0006 * Math.sin((2 * F + Mpr) * dr);
  C1 += 0.001 * Math.sin((2 * F - Mpr) * dr);
  C1 += 0.0005 * Math.sin((M + 2 * Mpr) * dr);
  const deltat =
    T < -11
      ? 0.001 +
        0.000839 * T +
        0.0002261 * T2 -
        0.00000845 * T3 -
        0.000000081 * T * T3
      : -0.000278 +
        0.000265 * T +
        0.000262 * T2;
  const JdNew = Jd1 + C1 - deltat;
  return Math.floor(JdNew + 0.5 + timeZone / 24);
}

function sunLongitude(jdn: number, timeZone: number): number {
  const T = (jdn - 2451545.5 - timeZone / 24) / 36525;
  const T2 = T * T;
  const dr = Math.PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T2;
  let DL =
    1.9146 - 0.004817 * T - 0.000014 * T2;
  DL =
    DL * Math.sin(dr * M) +
    (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) +
    0.00029 * Math.sin(dr * 3 * M);
  let L = L0 + DL;
  L -= 360 * Math.floor(L / 360);
  return Math.floor((L / 30));
}

function lunarMonth11(yy: number, timeZone: number): number {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = Math.floor(off / 29.530588853);
  let nm = newMoonDay(k, timeZone);
  const sunLong = sunLongitude(nm, timeZone);
  if (sunLong >= 9) nm = newMoonDay(k - 1, timeZone);
  return nm;
}

function leapMonthOffset(a11: number, timeZone: number): number {
  const k = Math.floor(
    (a11 - 2415021.076998695) / 29.530588853 + 0.5
  );
  let last = 0;
  let i = 1;
  let arc = sunLongitude(newMoonDay(k + i, timeZone), timeZone);
  do {
    last = arc;
    i++;
    arc = sunLongitude(newMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);
  return i - 1;
}

export function solarToLunar(
  dd: number,
  mm: number,
  yy: number,
  timeZone = 7
): LunarDate {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = newMoonDay(k + 1, timeZone);
  if (monthStart > dayNumber) monthStart = newMoonDay(k, timeZone);
  let a11 = lunarMonth11(yy, timeZone);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = lunarMonth11(yy - 1, timeZone);
  } else {
    lunarYear = yy + 1;
    b11 = lunarMonth11(yy + 1, timeZone);
  }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let isLeapMonth = false;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapOffset = leapMonthOffset(a11, timeZone);
    const leapMonth = leapOffset - 2;
    if (diff >= leapOffset - 1) {
      lunarMonth = diff + 10;
    }
    if (diff === leapOffset - 1) {
      isLeapMonth = true;
      lunarMonth = leapMonth <= 0 ? leapMonth + 12 : leapMonth;
    }
  }
  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
  return { day: lunarDay, month: lunarMonth, year: lunarYear, isLeapMonth };
}
