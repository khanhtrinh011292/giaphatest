import { Lunar, Solar } from "lunar-javascript";

export function formatDisplayDate(
  year: number | null,
  month: number | null,
  day: number | null,
): string {
  if (!year && !month && !day) return "Chưa rõ";

  const parts = [];
  if (day) parts.push(day.toString().padStart(2, "0"));
  if (month) parts.push(month.toString().padStart(2, "0"));
  if (year) parts.push(year.toString());

  return parts.join("/");
}

export function getLunarDateString(
  year: number | null,
  month: number | null,
  day: number | null,
): string | null {
  if (!year || !month || !day) return null;

  try {
    const solar = Solar.fromYmd(
      year,
      parseInt(month.toString()),
      parseInt(day.toString()),
    );
    const lunar = solar.getLunar();

    const lDay = lunar.getDay().toString().padStart(2, "0");
    const lMonthRaw = lunar.getMonth();
    const isLeap = lMonthRaw < 0;
    const lMonth = Math.abs(lMonthRaw).toString().padStart(2, "0");
    const lYear = lunar.getYear();

    return `${lDay}/${lMonth}${isLeap ? " nhuận" : ""}/${lYear}`;
  } catch (error) {
    console.error("Lunar conversion error:", error);
    return null;
  }
}

export function getSolarDateString(
  year: number | null,
  month: number | null,
  day: number | null,
): string | null {
  if (!year || !month || !day) return "Chưa rõ";

  try {
    const lunar = Lunar.fromYmd(
      year,
      parseInt(month.toString()),
      parseInt(day.toString()),
    );
    const solar = lunar.getSolar();

    const sDay = solar.getDay().toString().padStart(2, "0");
    const sMonthRaw = solar.getMonth();
    const sMonth = Math.abs(sMonthRaw).toString().padStart(2, "0");
    const sYear = solar.getYear();

    return `${sDay}/${sMonth}/${sYear}`;
  } catch (error) {
    console.error("Solar conversion error:", error);
    return null;
  }
}

export function calculateAge(
  birthYear: number | null,
  birthMonth: number | null,
  birthDay: number | null,
  deathYear: number | null,
  deathMonth: number | null,
  deathDay: number | null,
  isDeceased: boolean = false,
): { age: number; isDeceased: boolean } | null {
  if (!birthYear) return null;

  if (isDeceased || deathYear) {
    if (deathYear) {
      let age = deathYear - birthYear;
      if (birthMonth && birthDay && deathMonth && deathDay) {
        if (
          deathMonth < birthMonth ||
          (deathMonth === birthMonth && deathDay < birthDay)
        ) {
          age--;
        }
      }
      return { age, isDeceased: true };
    }
    return null;
  }

  const now = new Date();
  const vnTimeStr = now.toLocaleString("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const vnDate = new Date(vnTimeStr);
  const currentYear = vnDate.getFullYear();

  let age = currentYear - birthYear;

  if (birthMonth && birthDay) {
    const currentMonth = vnDate.getMonth() + 1;
    const currentDay = vnDate.getDate();
    if (
      currentMonth < birthMonth ||
      (currentMonth === birthMonth && currentDay < birthDay)
    ) {
      age--;
    }
  }

  return { age, isDeceased: false };
}

export function getZodiacSign(
  day: number | null,
  month: number | null,
): string | null {
  if (!day || !month) return null;
  const d = day;
  const m = month;

  if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return "Bạch Dương";
  if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return "Kim Ngưu";
  if ((m === 5 && d >= 21) || (m === 6 && d <= 21)) return "Song Tử";
  if ((m === 6 && d >= 22) || (m === 7 && d <= 22)) return "Cự Giải";
  if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return "Sư Tử";
  if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return "Xử Nữ";
  if ((m === 9 && d >= 23) || (m === 10 && d <= 23)) return "Thiên Bình";
  if ((m === 10 && d >= 24) || (m === 11 && d <= 21)) return "Thiên Yết";
  if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return "Nhân Mã";
  if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return "Ma Kết";
  if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return "Bảo Bình";
  if ((m === 2 && d >= 19) || (m === 3 && d <= 20)) return "Song Ngư";

  return null;
}

export function getZodiacAnimal(
  year: number | null,
  month: number | null = null,
  day: number | null = null,
): string | null {
  if (!year) return null;
  const animals = [
    "Thân",
    "Dậu",
    "Tuất",
    "Hợi",
    "Tý",
    "Sửu",
    "Dần",
    "Mão",
    "Thìn",
    "Tỵ",
    "Ngọ",
    "Mùi",
  ];

  let targetYear = year;

  if (month && day) {
    try {
      const solar = Solar.fromYmd(
        year,
        parseInt(month.toString()),
        parseInt(day.toString()),
      );
      targetYear = solar.getLunar().getYear();
    } catch (error) {
      console.error("Lunar conversion error in zodiac:", error);
    }
  }

  return animals[targetYear % 12];
}

/* ── Thiên Can & Địa Chi (Vietnamese Can Chi) ───────────────────────────────────────────────── */
const THIEN_CAN: Record<string, string> = {
  甲: "Giáp",
  乙: "Ất",
  丙: "Bính",
  丁: "Đinh",
  戊: "Mậu",
  己: "Kỷ",
  庚: "Canh",
  辛: "Tân",
  壬: "Nhâm",
  癸: "Quý",
};

const DIA_CHI: Record<string, string> = {
  子: "Tý",
  丑: "Sửu",
  寅: "Dần",
  卯: "Mão",
  辰: "Thìn",
  巳: "Tỵ",
  午: "Ngọ",
  未: "Mùi",
  申: "Thân",
  酉: "Dậu",
  戌: "Tuất",
  亥: "Hợi",
};

function ganZhiToVietnamese(ganZhi: string): string {
  if (!ganZhi || ganZhi.length < 2) return ganZhi;
  const can = THIEN_CAN[ganZhi[0]] ?? ganZhi[0];
  const chi = DIA_CHI[ganZhi[1]] ?? ganZhi[1];
  return `${can} ${chi}`;
}

export function getCanChi(
  year: number | null,
  month: number | null = null,
  day: number | null = null,
): string | null {
  if (!year) return null;
  let targetYear = year;
  if (month && day) {
    try {
      const solar = Solar.fromYmd(year, parseInt(month.toString()), parseInt(day.toString()));
      targetYear = solar.getLunar().getYear();
    } catch (_) {
      // fallback to solar year
    }
  }
  try {
    const lunar = Lunar.fromYmd(targetYear, 1, 1);
    const ganZhi = lunar.getYearInGanZhi();
    return ganZhiToVietnamese(ganZhi);
  } catch (_) {
    return null;
  }
}

// Ngũ hành mệnh theo Can Chi (60-year cycle)
const MENH_NGU_HANH: string[] = [
  "Kim",  // 0: Giáp Tý
  "Kim",  // 1: Ất Sửu
  "Hỏa",  // 2: Bính Dần
  "Hỏa",  // 3: Đinh Mão
  "Mộc",  // 4: Mậu Thìn
  "Mộc",  // 5: Kỷ Tỵ
  "Thổ",  // 6: Canh Ngọ
  "Thổ",  // 7: Tân Mùi
  "Kim",  // 8: Nhâm Thân
  "Kim",  // 9: Quý Dậu
  "Hỏa",  // 10: Giáp Tuất
  "Hỏa",  // 11: Ất Hợi
  "Mộc",  // 12: Bính Tý
  "Mộc",  // 13: Đinh Sửu
  "Hỏa",  // 14: Mậu Dần
  "Hỏa",  // 15: Kỷ Mão
  "Thổ",  // 16: Canh Thìn
  "Thổ",  // 17: Tân Tỵ
  "Mộc",  // 18: Nhâm Ngọ
  "Mộc",  // 19: Quý Mùi
  "Thủy", // 20: Giáp Thân
  "Thủy", // 21: Ất Dậu
  "Thổ",  // 22: Bính Tuất
  "Thổ",  // 23: Đinh Hợi
  "Thủy", // 24: Mậu Tý
  "Thủy", // 25: Kỷ Sửu
  "Thổ",  // 26: Canh Dần
  "Thổ",  // 27: Tân Mão
  "Kim",  // 28: Nhâm Thìn
  "Kim",  // 29: Quý Tỵ
  "Kim",  // 30: Giáp Ngọ
  "Kim",  // 31: Ất Mùi
  "Hỏa",  // 32: Bính Thân
  "Hỏa",  // 33: Đinh Dậu
  "Mộc",  // 34: Mậu Tuất
  "Mộc",  // 35: Kỷ Hợi
  "Thổ",  // 36: Canh Tý
  "Thổ",  // 37: Tân Sửu
  "Kim",  // 38: Nhâm Dần
  "Kim",  // 39: Quý Mão
  "Hỏa",  // 40: Giáp Thìn
  "Hỏa",  // 41: Ất Tỵ
  "Thủy", // 42: Bính Ngọ
  "Thủy", // 43: Đinh Mùi
  "Mộc",  // 44: Mậu Thân
  "Mộc",  // 45: Kỷ Dậu
  "Thổ",  // 46: Canh Tuất
  "Thổ",  // 47: Tân Hợi
  "Thủy", // 48: Nhâm Tý
  "Thủy", // 49: Quý Sửu
  "Kim",  // 50: Giáp Dần
  "Kim",  // 51: Ất Mão
  "Thủy", // 52: Bính Thìn
  "Thủy", // 53: Đinh Tỵ
  "Mộc",  // 54: Mậu Ngọ
  "Mộc",  // 55: Kỷ Mùi
  "Thổ",  // 56: Canh Thân
  "Thổ",  // 57: Tân Dậu
  "Mộc",  // 58: Nhâm Tuất
  "Mộc",  // 59: Quý Hợi
];

// Tên chi tiết của 60 mệnh (Nạp Âm)
const MENH_DETAIL: string[] = [
  "Hải Trung Kim",   // 0: Giáp Tý
  "Hải Trung Kim",   // 1: Ất Sửu
  "Lư Trung Hỏa",   // 2: Bính Dần
  "Lư Trung Hỏa",   // 3: Đinh Mão
  "Đại Lâm Mộc",    // 4: Mậu Thìn
  "Đại Lâm Mộc",    // 5: Kỷ Tỵ
  "Lộ Bàng Thổ",    // 6: Canh Ngọ
  "Lộ Bàng Thổ",    // 7: Tân Mùi
  "Kiếm Phong Kim",  // 8: Nhâm Thân
  "Kiếm Phong Kim",  // 9: Quý Dậu
  "Sơn Đầu Hỏa",    // 10: Giáp Tuất
  "Sơn Đầu Hỏa",    // 11: Ất Hợi
  "Giản Hạ Thủy",   // 12: Bính Tý — (Mộc gốc bảng cũ sai, đây là Thủy theo nạp âm)
  "Giản Hạ Thủy",   // 13: Đinh Sửu
  "Thành Đầu Thổ",  // 14: Mậu Dần
  "Thành Đầu Thổ",  // 15: Kỷ Mão
  "Bạch Lạp Kim",   // 16: Canh Thìn
  "Bạch Lạp Kim",   // 17: Tân Tỵ
  "Dương Liễu Mộc", // 18: Nhâm Ngọ
  "Dương Liễu Mộc", // 19: Quý Mùi
  "Tuyền Trung Thủy",// 20: Giáp Thân
  "Tuyền Trung Thủy",// 21: Ất Dậu
  "Ốc Thượng Thổ",  // 22: Bính Tuất
  "Ốc Thượng Thổ",  // 23: Đinh Hợi
  "Tích Lịch Hỏa",  // 24: Mậu Tý — (Thủy gốc sai)
  "Tích Lịch Hỏa",  // 25: Kỷ Sửu
  "Tùng Bách Mộc",  // 26: Canh Dần
  "Tùng Bách Mộc",  // 27: Tân Mão
  "Trường Lưu Thủy",// 28: Nhâm Thìn — (Kim gốc sai)
  "Trường Lưu Thủy",// 29: Quý Tỵ
  "Sa Trung Kim",   // 30: Giáp Ngọ
  "Sa Trung Kim",   // 31: Ất Mùi
  "Sơn Hạ Hỏa",    // 32: Bính Thân
  "Sơn Hạ Hỏa",    // 33: Đinh Dậu
  "Bình Địa Mộc",  // 34: Mậu Tuất
  "Bình Địa Mộc",  // 35: Kỷ Hợi
  "Bích Thượng Thổ",// 36: Canh Tý
  "Bích Thượng Thổ",// 37: Tân Sửu
  "Kim Bạch Kim",   // 38: Nhâm Dần
  "Kim Bạch Kim",   // 39: Quý Mão
  "Phúc Đăng Hỏa",  // 40: Giáp Thìn
  "Phúc Đăng Hỏa",  // 41: Ất Tỵ
  "Thiên Hà Thủy",  // 42: Bính Ngọ
  "Thiên Hà Thủy",  // 43: Đinh Mùi
  "Đại Trạch Thổ",  // 44: Mậu Thân — (Mộc gốc sai)
  "Đại Trạch Thổ",  // 45: Kỷ Dậu
  "Thoa Xuyến Kim", // 46: Canh Tuất — (Thổ gốc sai)
  "Thoa Xuyến Kim", // 47: Tân Hợi
  "Tang Đố Mộc",   // 48: Nhâm Tý — (Thủy gốc sai)
  "Tang Đố Mộc",   // 49: Quý Sửu
  "Đại Khê Thủy",  // 50: Giáp Dần — (Kim gốc sai)
  "Đại Khê Thủy",  // 51: Ất Mão
  "Sa Trung Thổ",  // 52: Bính Thìn — (Thủy gốc sai)
  "Sa Trung Thổ",  // 53: Đinh Tỵ
  "Thiên Thượng Hỏa",// 54: Mậu Ngọ — (Mộc gốc sai)
  "Thiên Thượng Hỏa",// 55: Kỷ Mùi
  "Thạch Lựu Mộc", // 56: Canh Thân — (Thổ gốc sai)
  "Thạch Lựu Mộc", // 57: Tân Dậu
  "Đại Hải Thủy",  // 58: Nhâm Tuất — (Mộc gốc sai)
  "Đại Hải Thủy",  // 59: Quý Hợi
];

export function getMenhNguHanh(
  year: number | null,
  month: number | null = null,
  day: number | null = null,
): string | null {
  if (!year) return null;
  let targetYear = year;
  if (month && day) {
    try {
      const solar = Solar.fromYmd(year, parseInt(month.toString()), parseInt(day.toString()));
      targetYear = solar.getLunar().getYear();
    } catch (_) {
      // fallback
    }
  }
  const idx = ((targetYear - 4) % 60 + 60) % 60;
  return MENH_NGU_HANH[idx] ?? null;
}

/**
 * Get detailed Menh name (Nạp Âm), e.g. "Kiếm Phong Kim", "Hải Trung Kim".
 */
export function getMenhDetail(
  year: number | null,
  month: number | null = null,
  day: number | null = null,
): string | null {
  if (!year) return null;
  let targetYear = year;
  if (month && day) {
    try {
      const solar = Solar.fromYmd(year, parseInt(month.toString()), parseInt(day.toString()));
      targetYear = solar.getLunar().getYear();
    } catch (_) {
      // fallback
    }
  }
  const idx = ((targetYear - 4) % 60 + 60) % 60;
  return MENH_DETAIL[idx] ?? null;
}

const MENH_COLOR: Record<string, string> = {
  Kim: "text-amber-600 bg-amber-50 border-amber-200",
  Mộc: "text-emerald-700 bg-emerald-50 border-emerald-200",
  Thủy: "text-blue-700 bg-blue-50 border-blue-200",
  Hỏa: "text-red-600 bg-red-50 border-red-200",
  Thổ: "text-yellow-700 bg-yellow-50 border-yellow-200",
};

export function getMenhColor(menh: string): string {
  return MENH_COLOR[menh] ?? "text-stone-600 bg-stone-50 border-stone-200";
}

export function getTodayLunar() {
  const now = new Date();
  const vnTimeStr = now.toLocaleString("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const vnDate = new Date(vnTimeStr);

  const solar = Solar.fromYmd(
    vnDate.getFullYear(),
    vnDate.getMonth() + 1,
    vnDate.getDate(),
  );
  const lunar = solar.getLunar();

  return {
    solarStr: vnDate.toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    lunarDay: lunar.getDay(),
    lunarMonth: Math.abs(lunar.getMonth()),
    lunarYear: ganZhiToVietnamese(lunar.getYearInGanZhi()),
    lunarDayStr: `${lunar.getDay()} tháng ${Math.abs(lunar.getMonth())}`,
  };
}
