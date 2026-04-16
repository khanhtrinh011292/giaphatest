// ============================================================
// THÔNG THƯ ENGINE — Trạch Nhật, Phối Mệnh, Giờ Hoàng Đạo
// ============================================================
import { solarToLunar } from "./amlich";

// ── CAN CHI ──────────────────────────────────────────────────
export const THIEN_CAN = ["Giáp","Ất","Bính","Đinh","Mậu","Kỷ","Canh","Tân","Nhâm","Quý"];
export const DIA_CHI = ["Tý","Sửu","Dần","Mão","Thìn","Tỵ","Ngọ","Mùi","Thân","Dậu","Tuất","Hợi"];
export const NGU_HANH_CAN = ["Mộc","Mộc","Hỏa","Hỏa","Thổ","Thổ","Kim","Kim","Thủy","Thủy"];
export const NGU_HANH_CHI = ["Thủy","Thổ","Mộc","Mộc","Thổ","Hỏa","Hỏa","Thổ","Kim","Kim","Thổ","Thủy"];

export function getCanChi(year: number): { can: string; chi: string; canIdx: number; chiIdx: number } {
  const canIdx = (year - 4) % 10;
  const chiIdx = (year - 4) % 12;
  return {
    can: THIEN_CAN[(canIdx + 10) % 10],
    chi: DIA_CHI[(chiIdx + 12) % 12],
    canIdx: (canIdx + 10) % 10,
    chiIdx: (chiIdx + 12) % 12,
  };
}

// ── NGŨ HÀNH TƯƠNG SINH / TƯƠNG KHẮC ────────────────────────
const TUONG_SINH: Record<string, string> = {
  Mộc: "Hỏa", Hỏa: "Thổ", Thổ: "Kim", Kim: "Thủy", Thủy: "Mộc",
};
const TUONG_KHAC: Record<string, string> = {
  Mộc: "Thổ", Thổ: "Thủy", Thủy: "Hỏa", Hỏa: "Kim", Kim: "Mộc",
};

export function nguHanhRelation(
  e1: string,
  e2: string
): "sinh" | "khắc" | "bị khắc" | "hòa" {
  if (TUONG_SINH[e1] === e2) return "sinh";
  if (TUONG_KHAC[e1] === e2) return "khắc";
  if (TUONG_SINH[e2] === e1) return "sinh"; // e2 sinh e1 — cũng tốt
  if (TUONG_KHAC[e2] === e1) return "bị khắc";
  return "hòa";
}

// ── TAM HỢP / LỤC HỢP / TƯƠNG XUNG / TƯƠNG HẠI ─────────────
// Tam Hợp: Thân-Tý-Thìn(Thủy), Dần-Ngọ-Tuất(Hỏa), Hợi-Mão-Mùi(Mộc), Tỵ-Dậu-Sửu(Kim)
const TAM_HOP_GROUPS: number[][] = [
  [8, 0, 4],   // Thân-Tý-Thìn
  [2, 6, 10],  // Dần-Ngọ-Tuất
  [11, 3, 7],  // Hợi-Mão-Mùi
  [5, 9, 1],   // Tỵ-Dậu-Sửu
];
// Lục Hợp: Tý-Sửu, Dần-Hợi, Mão-Tuất, Thìn-Dậu, Tỵ-Thân, Ngọ-Mùi
const LUC_HOP_PAIRS: [number, number][] = [
  [0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7],
];
// Lục Xung: Tý-Ngọ, Sửu-Mùi, Dần-Thân, Mão-Dậu, Thìn-Tuất, Tỵ-Hợi
const LUC_XUNG_PAIRS: [number, number][] = [
  [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11],
];
// Lục Hại: Tý-Mùi, Sửu-Ngọ, Dần-Tỵ, Mão-Thìn, Thân-Hợi, Dậu-Tuất
const LUC_HAI_PAIRS: [number, number][] = [
  [0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10],
];

function chiPair(a: number, b: number, pairs: [number,number][]): boolean {
  return pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}
function chiGroup(a: number, b: number, groups: number[][]): boolean {
  return groups.some(g => g.includes(a) && g.includes(b));
}

export interface CompatResult {
  tamHop: boolean;
  lucHop: boolean;
  lucXung: boolean;
  lucHai: boolean;
  nguHanhNam: string;
  nguHanhNu: string;
  nguHanhRelation: string;
  score: number; // 0-100
  summary: string;
  detail: string[];
}

export function tinhHopTuoi(namNam: number, namNu: number): CompatResult {
  const nam = getCanChi(namNam);
  const nu = getCanChi(namNu);
  const nhNam = NGU_HANH_CAN[nam.canIdx];
  const nhNu = NGU_HANH_CAN[nu.canIdx];
  const rel = nguHanhRelation(nhNam, nhNu);
  const tamHop = chiGroup(nam.chiIdx, nu.chiIdx, TAM_HOP_GROUPS);
  const lucHop = chiPair(nam.chiIdx, nu.chiIdx, LUC_HOP_PAIRS);
  const lucXung = chiPair(nam.chiIdx, nu.chiIdx, LUC_XUNG_PAIRS);
  const lucHai = chiPair(nam.chiIdx, nu.chiIdx, LUC_HAI_PAIRS);

  const detail: string[] = [];
  let score = 50;

  if (tamHop) { score += 20; detail.push("✅ Tam Hợp — tuổi hợp theo nhóm Địa Chi, rất tốt"); }
  if (lucHop) { score += 15; detail.push("✅ Lục Hợp — Địa Chi kết hợp hài hòa"); }
  if (lucXung) { score -= 25; detail.push("⚠️ Lục Xung (Tương Xung) — Địa Chi đối xung, cần thêm nghi lễ hóa giải"); }
  if (lucHai) { score -= 15; detail.push("⚠️ Lục Hại — Địa Chi gây hại nhau, nên cẩn thận"); }

  if (rel === "sinh") { score += 15; detail.push(`✅ Ngũ Hành tương sinh (${nhNam} → ${nhNu} hoặc ngược lại)`); }
  else if (rel === "khắc") { score -= 20; detail.push(`⚠️ Ngũ Hành tương khắc (${nhNam} khắc ${nhNu}) — có thể làm lễ hóa giải`); }
  else if (rel === "bị khắc") { score -= 20; detail.push(`⚠️ Ngũ Hành tương khắc (${nhNu} khắc ${nhNam}) — có thể làm lễ hóa giải`); }
  else { detail.push(`ℹ️ Ngũ Hành hòa (${nhNam} & ${nhNu}) — bình thường`); }

  score = Math.max(0, Math.min(100, score));
  let summary: string;
  if (score >= 80) summary = "Rất hợp — đôi trời sinh";
  else if (score >= 65) summary = "Hợp tuổi — thuận lợi";
  else if (score >= 50) summary = "Bình thường — cần lưu ý";
  else summary = "Không hợp — nên hóa giải trước";

  return { tamHop, lucHop, lucXung, lucHai, nguHanhNam: nhNam, nguHanhNu: nhNu, nguHanhRelation: rel, score, summary, detail };
}

// ── THẬP NHỊ TRỰC ────────────────────────────────────────────
// Bắt đầu tháng 1 âm từ ngày 1 = Kiến, mỗi ngày +1 theo vòng 12
// Công thức: (chiTháng + chiNgày) % 12, chiTháng tháng 1=Dần(2), ...
const THAP_NHI_TRUC = ["Kiến","Trừ","Mãn","Bình","Định","Chấp","Phá","Nguy","Thành","Thu","Khai","Bế"];
const TRUC_TOT_HON = ["Thành","Khai","Định"]; // tốt cho hôn nhân
const TRUC_XAU = ["Phá","Nguy","Kiến"];

// chi tháng âm: tháng 1 = Dần(2), tháng 2 = Mão(3)...
function chiThang(lunarMonth: number): number {
  return (lunarMonth + 1) % 12; // tháng 1 → index 2 (Dần)
}

export function getThapNhiTruc(lunarDay: number, lunarMonth: number): string {
  const cT = chiThang(lunarMonth);
  // chi ngày: dùng can chi ngày cụ thể — đơn giản hóa: (cT + lunarDay - 1) % 12
  const idx = (cT + lunarDay - 1) % 12;
  return THAP_NHI_TRUC[idx];
}

// ── HOÀNG ĐẠO / HẮC ĐẠO ─────────────────────────────────────
// Dựa trên chi ngày và chi tháng theo Thông Thư
// 6 sao Hoàng Đạo: Thanh Long, Minh Đường, Kim Quỹ, Thiên Đức, Ngọc Đường, Tư Mệnh
// Mỗi tháng có pattern 12 ngày lặp lại theo chi ngày
const HOANG_DAO_PATTERN: Record<number, number[]> = {
  // key = chiTháng % 6, value = các index chi ngày là Hoàng Đạo
  0: [0, 1, 3, 4, 6, 10],   // Dần/Thân tháng
  1: [0, 2, 3, 5, 6, 8],   // Mão/Dậu tháng
  2: [1, 2, 4, 5, 7, 11],  // Thìn/Tuất tháng
  3: [0, 3, 4, 6, 7, 9],   // Tỵ/Hợi tháng
  4: [1, 2, 4, 5, 8, 10],  // Ngọ/Tý tháng
  5: [0, 2, 5, 6, 9, 11],  // Mùi/Sửu tháng
};

export function isHoangDao(lunarDay: number, lunarMonth: number): boolean {
  const cT = chiThang(lunarMonth) % 6;
  // chi ngày từ 1 (Tý=0): (chiNgayCanChi)
  // đơn giản: dùng (lunarDay - 1) % 12
  const chiNgay = (lunarDay - 1) % 12;
  const pattern = HOANG_DAO_PATTERN[cT] ?? [];
  return pattern.includes(chiNgay);
}

// ── TAM NƯƠNG SÁT ─────────────────────────────────────────────
// Các ngày âm lịch kiêng kỵ: 3,7,13,18,22,27
const TAM_NUONG_SAT_DAYS = [3, 7, 13, 18, 22, 27];
export function isTamNuongSat(lunarDay: number): boolean {
  return TAM_NUONG_SAT_DAYS.includes(lunarDay);
}

// ── NGUYỆT KỴ ─────────────────────────────────────────────────
// Ngày 5, 14, 23 âm lịch (tam tai nguyệt kỵ)
const NGUYET_KY_DAYS = [5, 14, 23];
export function isNguyetKy(lunarDay: number): boolean {
  return NGUYET_KY_DAYS.includes(lunarDay);
}

// ── DƯƠNG CÔNG KỴ NHẬT ─────────────────────────────────────────
// 13 ngày cố định theo lịch âm mỗi năm
const DUONG_CONG_KY: [number, number][] = [
  [1,13],[2,11],[3,9],[4,7],[5,5],[6,3],[7,1],[7,29],[8,27],[9,25],[10,23],[11,21],[12,19],
];
export function isDuongCongKy(lunarDay: number, lunarMonth: number): boolean {
  return DUONG_CONG_KY.some(([m, d]) => m === lunarMonth && d === lunarDay);
}

// ── ĐÁNH GIÁ TỔNG THỂ MỘT NGÀY ──────────────────────────────
export interface DayRating {
  solarDate: string; // "YYYY-MM-DD"
  lunarDay: number;
  lunarMonth: number;
  lunarYear: number;
  isLeapMonth: boolean;
  thapNhiTruc: string;
  isHoangDao: boolean;
  isTamNuongSat: boolean;
  isNguyetKy: boolean;
  isDuongCongKy: boolean;
  score: number; // 0-100
  label: string;
  reasons: string[];
}

export function rateDayForWedding(solarDateStr: string): DayRating {
  const [yStr, mStr, dStr] = solarDateStr.split("-");
  const yy = parseInt(yStr), mm = parseInt(mStr), dd = parseInt(dStr);
  const lunar = solarToLunar(dd, mm, yy);
  const truc = getThapNhiTruc(lunar.day, lunar.month);
  const hoangDao = isHoangDao(lunar.day, lunar.month);
  const tamNuong = isTamNuongSat(lunar.day);
  const nguyetKy = isNguyetKy(lunar.day);
  const duongCong = isDuongCongKy(lunar.day, lunar.month);

  let score = 50;
  const reasons: string[] = [];

  if (TRUC_TOT_HON.includes(truc)) { score += 20; reasons.push(`✅ Ngày ${truc} — tốt cho hôn nhân`); }
  else if (TRUC_XAU.includes(truc)) { score -= 15; reasons.push(`⚠️ Ngày ${truc} — kém`); }
  else { reasons.push(`ℹ️ Ngày ${truc}`); }

  if (hoangDao) { score += 20; reasons.push("✅ Ngày Hoàng Đạo"); }
  else { score -= 10; reasons.push("❌ Ngày Hắc Đạo"); }

  if (tamNuong) { score -= 30; reasons.push("❌ Tam Nương Sát — đại kỵ"); }
  if (nguyetKy) { score -= 20; reasons.push("❌ Nguyệt Kỵ (ngày 5-14-23 âm)"); }
  if (duongCong) { score -= 25; reasons.push("❌ Dương Công Kỵ Nhật"); }
  if (lunar.isLeapMonth) { score -= 10; reasons.push("⚠️ Tháng nhuận — nhiều sách khuyên tránh"); }

  score = Math.max(0, Math.min(100, score));
  let label: string;
  if (score >= 80) label = "Đại Cát";
  else if (score >= 65) label = "Tốt";
  else if (score >= 45) label = "Bình";
  else label = "Xấu";

  return {
    solarDate: solarDateStr,
    lunarDay: lunar.day,
    lunarMonth: lunar.month,
    lunarYear: lunar.year,
    isLeapMonth: lunar.isLeapMonth,
    thapNhiTruc: truc,
    isHoangDao: hoangDao,
    isTamNuongSat: tamNuong,
    isNguyetKy: nguyetKy,
    isDuongCongKy: duongCong,
    score,
    label,
    reasons,
  };
}

// ── GIỜ HOÀNG ĐẠO TRONG NGÀY ────────────────────────────────
// 12 giờ cổ, mỗi chi ngày xác định 6 giờ Hoàng Đạo theo bảng Thông Thư
const GIO_HOANG_DAO_BY_CHI_NGAY: Record<number, number[]> = {
  0:  [1,3,5,7,9,11],  // Tý ngày
  1:  [0,2,4,6,8,10],
  2:  [1,3,5,7,9,11],
  3:  [0,2,4,6,8,10],
  4:  [1,3,5,7,9,11],
  5:  [0,2,4,6,8,10],
  6:  [1,3,5,7,9,11],
  7:  [0,2,4,6,8,10],
  8:  [1,3,5,7,9,11],
  9:  [0,2,4,6,8,10],
  10: [1,3,5,7,9,11],
  11: [0,2,4,6,8,10],
};

const GIO_TEN = [
  { chi: "Tý",   time: "23:00–01:00" },
  { chi: "Sửu",  time: "01:00–03:00" },
  { chi: "Dần",  time: "03:00–05:00" },
  { chi: "Mão",  time: "05:00–07:00" },
  { chi: "Thìn", time: "07:00–09:00" },
  { chi: "Tỵ",   time: "09:00–11:00" },
  { chi: "Ngọ",  time: "11:00–13:00" },
  { chi: "Mùi",  time: "13:00–15:00" },
  { chi: "Thân", time: "15:00–17:00" },
  { chi: "Dậu",  time: "17:00–19:00" },
  { chi: "Tuất", time: "19:00–21:00" },
  { chi: "Hợi",  time: "21:00–23:00" },
];

export interface GioHoangDao {
  chi: string;
  time: string;
  isHoangDao: boolean;
}

export function getGioHoangDao(lunarDay: number): GioHoangDao[] {
  const chiNgay = (lunarDay - 1) % 12;
  const hdIdxs = GIO_HOANG_DAO_BY_CHI_NGAY[chiNgay] ?? [];
  return GIO_TEN.map((g, i) => ({
    ...g,
    isHoangDao: hdIdxs.includes(i),
  }));
}

// ── GỢI Ý NGÀY TRONG THÁNG ─────────────────────────────────
export function suggestDaysInMonth(
  year: number,
  month: number,
  minScore = 65
): DayRating[] {
  const results: DayRating[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const str = `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const rating = rateDayForWedding(str);
    if (rating.score >= minScore) results.push(rating);
  }
  return results.sort((a, b) => b.score - a.score);
}
