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

/**
 * Can Chi của một ngày dương lịch.
 * Công thức chuẩn: JDN mod 60 → can (mod 10), chi (mod 12)
 * Ngày JDN=0 (01/01/4713 BC Julian) = Giáp Tý
 */
export function getCanChiNgay(dd: number, mm: number, yy: number): { canIdx: number; chiIdx: number; can: string; chi: string } {
  // JDN (Julian Day Number)
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jdn = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  // offset: JDN 2299161 (15/10/1582) đổi lịch Gregory
  // Giáp Tý = JDN 0 mod 60 = 0, nhưng offset thực tế: ngày 01/01/1900 là Giáp Tý
  // JDN của 31/01/1900 = 2415079, can chi = Giáp Tý (0,0)
  // Kiểm tra: (2415079 - offset) mod 60 = 0 ⇒ offset = 2415079 mod 60 = 19
  const OFFSET_CAN = (2415079) % 10; // = 9... Nhâm
  const OFFSET_CHI = (2415079) % 12; // = 7... Mùi
  // Ngày 31/01/1900 = Nhâm Dậu? Không đúng — cần calibrate chính xác
  // Calibration: ngày 01/01/2000 = Giáp Tý theo nhiều nguồn? Không.
  // Calibration chính xác: 01/01/2000 dương = ngày Nhâm Tý (can=8, chi=0)
  // JDN(01/01/2000) = 2451545
  // (2451545 - canOffset) % 10 = 8 ⇒ canOffset = (2451545 - 8) % 10 = 2451537 % 10 = 7
  // (2451545 - chiOffset) % 12 = 0 ⇒ chiOffset = 2451545 % 12 = 1 (vì 2451545 mod 12 = 1)
  const canIdx = ((jdn - 7) % 10 + 10) % 10;
  const chiIdx = ((jdn - 1) % 12 + 12) % 12;
  return { canIdx, chiIdx, can: THIEN_CAN[canIdx], chi: DIA_CHI[chiIdx] };
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
  if (TUONG_SINH[e2] === e1) return "sinh";
  if (TUONG_KHAC[e2] === e1) return "bị khắc";
  return "hòa";
}

// ── TAM HỢP / LỤC HỢP / LỤC XUNG / LỤC HẠI ────────────────────
const TAM_HOP_GROUPS: number[][] = [
  [8, 0, 4],
  [2, 6, 10],
  [11, 3, 7],
  [5, 9, 1],
];
const LUC_HOP_PAIRS: [number, number][] = [
  [0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7],
];
const LUC_XUNG_PAIRS: [number, number][] = [
  [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11],
];
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
  score: number;
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
  if (lucXung) { score -= 25; detail.push("⚠️ Lục Xung (Địa Chi đối xung) — cần thêm nghi lễ hóa giải"); }
  if (lucHai) { score -= 15; detail.push("⚠️ Lục Hại — Địa Chi gây hại nhau, nên cẩn thận"); }

  if (rel === "sinh") { score += 15; detail.push(`✅ Ngũ Hành tương sinh (${nhNam} → ${nhNu} hoặc ngược lại)`); }
  else if (rel === "khắc") { score -= 20; detail.push(`⚠️ Ngũ Hành tương khắc (${nhNam} khắc ${nhNu})`); }
  else if (rel === "bị khắc") { score -= 20; detail.push(`⚠️ Ngũ Hành tương khắc (${nhNu} khắc ${nhNam})`); }
  else { detail.push(`ℹ️ Ngũ Hành hòa (${nhNam} & ${nhNu})`); }

  score = Math.max(0, Math.min(100, score));
  let summary: string;
  if (score >= 80) summary = "Rất hợp — đôi trời sinh";
  else if (score >= 65) summary = "Hợp tuổi — thuận lợi";
  else if (score >= 50) summary = "Bình thường — cần lưu ý";
  else summary = "Không hợp — nên hóa giải trước";

  return { tamHop, lucHop, lucXung, lucHai, nguHanhNam: nhNam, nguHanhNu: nhNu, nguHanhRelation: rel, score, summary, detail };
}

// ── THẬP NHỊ TRỰC ────────────────────────────────────────────
const THAP_NHI_TRUC = ["Kiến","Trừ","Mãn","Bình","Định","Chấp","Phá","Nguy","Thành","Thu","Khai","Bế"];
export const TRUC_TOT_HON = ["Thành","Khai","Định"];
const TRUC_XAU = ["Phá","Nguy","Kiến"];

function chiThang(lunarMonth: number): number {
  // Tháng 1 âm = Dần (index 2), tháng 2 = Mão (3)...
  return (lunarMonth + 1) % 12;
}

export function getThapNhiTruc(lunarDay: number, lunarMonth: number): string {
  const cT = chiThang(lunarMonth);
  const idx = (cT + lunarDay - 1) % 12;
  return THAP_NHI_TRUC[idx];
}

// ── HOÀNG ĐẠO / HẮC ĐẠO ─────────────────────────────────────
// Bảng Thông Thư: key = chi ngày (0=Tý..11=Hợi), value = các index giờ Hoàng Đạo
// Nguồn: bảng 12 ngày x 6 giờ Hoàng Đạo chuẩn Thông Thư Việt Nam
const HOANG_DAO_BY_CHI_NGAY: Record<number, number[]> = {
  0:  [1, 3, 4, 6, 8, 11],  // Tý: Sửu, Mão, Thìn, Ngọ, Thân, Hợi
  1:  [0, 2, 5, 6, 9, 10],  // Sửu: Tý, Dần, Tỵ, Ngọ, Dậu, Tuất  -- cạnh Tý
  2:  [1, 3, 4, 7, 9, 10],  // Dần: Sửu, Mão, Thìn, Mùi, Dậu, Tuất
  3:  [0, 2, 5, 6, 8, 11],  // Mão
  4:  [1, 3, 4, 7, 9, 10],  // Thìn
  5:  [0, 2, 5, 6, 8, 11],  // Tỵ
  6:  [1, 3, 4, 7, 9, 10],  // Ngọ
  7:  [0, 2, 5, 6, 8, 11],  // Mùi
  8:  [1, 3, 4, 7, 9, 10],  // Thân
  9:  [0, 2, 5, 6, 8, 11],  // Dậu
  10: [1, 3, 4, 7, 9, 10],  // Tuất
  11: [0, 2, 5, 6, 8, 11],  // Hợi
};

// isHoangDao cho ngày: dùng can chi ngày thực
export function isHoangDaoNgay(dd: number, mm: number, yy: number): boolean {
  // Ngày Hoàng Đạo theo lịch cổ: thuận/nghịch
  // Đơn giản hóa: dùng can chi ngày + tháng âm
  const lunar = solarToLunar(dd, mm, yy);
  const { chiIdx } = getCanChiNgay(dd, mm, yy);
  // bảng chiếu theo chi ngày x chi tháng (6 nhóm)
  const cT = chiThang(lunar.month) % 6;
  const PATTERN: Record<number, number[]> = {
    0: [0, 1, 3, 4, 6, 10],
    1: [0, 2, 3, 5, 6, 8],
    2: [1, 2, 4, 5, 7, 11],
    3: [0, 3, 4, 6, 7, 9],
    4: [1, 2, 4, 5, 8, 10],
    5: [0, 2, 5, 6, 9, 11],
  };
  return (PATTERN[cT] ?? []).includes(chiIdx);
}

// ── KIỂM TRA NGÀY XUNG / HẠI VỚI TUỔI ──────────────────────────
/**
 * Kiểm tra chi ngày cưới có xung/hại với chi tuổi cô dâu hoặc chú rể không.
 * Đây là yếu tố rất quan trọng trong Thông Thư:
 * - Ngày xung tuổi: chịu đực lực xung không tốt, nên tránh
 * - Ngày hại tuổi: nhẹ hơn xung nhưng vẫn ảnh hưởng
 */
export interface TuoiCheck {
  isXungGroom: boolean;
  isHaiGroom: boolean;
  isXungBride: boolean;
  isHaiBride: boolean;
  warnings: string[];
  penalty: number;
}

export function checkNgayVoiTuoi(
  chiNgayIdx: number,
  groomChiIdx: number,
  brideChiIdx: number
): TuoiCheck {
  const isXungGroom = chiPair(chiNgayIdx, groomChiIdx, LUC_XUNG_PAIRS);
  const isHaiGroom  = chiPair(chiNgayIdx, groomChiIdx, LUC_HAI_PAIRS);
  const isXungBride = chiPair(chiNgayIdx, brideChiIdx, LUC_XUNG_PAIRS);
  const isHaiBride  = chiPair(chiNgayIdx, brideChiIdx, LUC_HAI_PAIRS);

  const warnings: string[] = [];
  let penalty = 0;

  if (isXungGroom) { penalty += 30; warnings.push(`❌ Ngày xung tuổi Chú rể (${DIA_CHI[chiNgayIdx]} xung ${DIA_CHI[groomChiIdx]})`); }
  if (isHaiGroom)  { penalty += 15; warnings.push(`⚠️ Ngày hại tuổi Chú rể (${DIA_CHI[chiNgayIdx]} hại ${DIA_CHI[groomChiIdx]})`); }
  if (isXungBride) { penalty += 30; warnings.push(`❌ Ngày xung tuổi Cô dâu (${DIA_CHI[chiNgayIdx]} xung ${DIA_CHI[brideChiIdx]})`); }
  if (isHaiBride)  { penalty += 15; warnings.push(`⚠️ Ngày hại tuổi Cô dâu (${DIA_CHI[chiNgayIdx]} hại ${DIA_CHI[brideChiIdx]})`); }

  return { isXungGroom, isHaiGroom, isXungBride, isHaiBride, warnings, penalty };
}

// ── TAM NƯƠNG SÁT ─────────────────────────────────────────────
const TAM_NUONG_SAT_DAYS = [3, 7, 13, 18, 22, 27];
export function isTamNuongSat(lunarDay: number): boolean {
  return TAM_NUONG_SAT_DAYS.includes(lunarDay);
}

// ── NGUYỆT KỴ ─────────────────────────────────────────────────
const NGUYET_KY_DAYS = [5, 14, 23];
export function isNguyetKy(lunarDay: number): boolean {
  return NGUYET_KY_DAYS.includes(lunarDay);
}

// ── DƯƠNG CÔNG KỴ NHẬT ─────────────────────────────────────────
const DUONG_CONG_KY: [number, number][] = [
  [1,13],[2,11],[3,9],[4,7],[5,5],[6,3],[7,1],[7,29],[8,27],[9,25],[10,23],[11,21],[12,19],
];
export function isDuongCongKy(lunarDay: number, lunarMonth: number): boolean {
  return DUONG_CONG_KY.some(([m, d]) => m === lunarMonth && d === lunarDay);
}

// ── ĐÁNH GIÁ TỔNG THỂ MỘT NGÀY (có hỗ trợ tuổi) ───────────────
export interface DayRating {
  solarDate: string;
  lunarDay: number;
  lunarMonth: number;
  lunarYear: number;
  isLeapMonth: boolean;
  thapNhiTruc: string;
  isHoangDao: boolean;
  isTamNuongSat: boolean;
  isNguyetKy: boolean;
  isDuongCongKy: boolean;
  tuoiCheck: TuoiCheck | null; // null nếu chưa có tuổi input
  chiNgay: string;
  score: number;
  label: string;
  reasons: string[];
}

export function rateDayForWedding(
  solarDateStr: string,
  groomBirthYear?: number,
  brideBirthYear?: number
): DayRating {
  const [yStr, mStr, dStr] = solarDateStr.split("-");
  const yy = parseInt(yStr), mm = parseInt(mStr), dd = parseInt(dStr);
  const lunar = solarToLunar(dd, mm, yy);
  const truc = getThapNhiTruc(lunar.day, lunar.month);
  const hoangDao = isHoangDaoNgay(dd, mm, yy);
  const tamNuong = isTamNuongSat(lunar.day);
  const nguyetKy = isNguyetKy(lunar.day);
  const duongCong = isDuongCongKy(lunar.day, lunar.month);
  const { chiIdx: chiNgayIdx, chi: chiNgayStr } = getCanChiNgay(dd, mm, yy);

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
  if (lunar.isLeapMonth) { score -= 10; reasons.push("⚠️ Tháng nhuận"); }

  // ── Kiểm tra xung hại với tuổi ──
  let tuoiCheck: TuoiCheck | null = null;
  if (groomBirthYear && brideBirthYear) {
    const groomCC = getCanChi(groomBirthYear);
    const brideCC = getCanChi(brideBirthYear);
    tuoiCheck = checkNgayVoiTuoi(chiNgayIdx, groomCC.chiIdx, brideCC.chiIdx);
    score -= tuoiCheck.penalty;
    tuoiCheck.warnings.forEach(w => reasons.push(w));
  }

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
    tuoiCheck,
    chiNgay: chiNgayStr,
    score,
    label,
    reasons,
  };
}

export function suggestDaysInMonth(
  year: number,
  month: number,
  minScore = 65,
  groomBirthYear?: number,
  brideBirthYear?: number
): DayRating[] {
  const results: DayRating[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const str = `${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const rating = rateDayForWedding(str, groomBirthYear, brideBirthYear);
    if (rating.score >= minScore) results.push(rating);
  }
  return results.sort((a, b) => b.score - a.score);
}

// ── GIỜ HOÀNG ĐẠO TRONG NGÀY (dùng can chi ngày thực) ────────────
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
  isXungGroom?: boolean;
  isHaiGroom?: boolean;
  isXungBride?: boolean;
  isHaiBride?: boolean;
}

/**
 * Giờ Hoàng Đạo theo can chi ngày thực (dương lịch) + lọc theo tuổi nếu có
 */
export function getGioHoangDao(
  dd: number,
  mm: number,
  yy: number,
  groomBirthYear?: number,
  brideBirthYear?: number
): GioHoangDao[] {
  const { chiIdx: chiNgay } = getCanChiNgay(dd, mm, yy);
  const hdIdxs = HOANG_DAO_BY_CHI_NGAY[chiNgay] ?? [];

  const groomCC = groomBirthYear ? getCanChi(groomBirthYear) : null;
  const brideCC = brideBirthYear ? getCanChi(brideBirthYear) : null;

  return GIO_TEN.map((g, i) => {
    const isXungGroom = groomCC ? chiPair(i, groomCC.chiIdx, LUC_XUNG_PAIRS) : false;
    const isHaiGroom  = groomCC ? chiPair(i, groomCC.chiIdx, LUC_HAI_PAIRS)  : false;
    const isXungBride = brideCC ? chiPair(i, brideCC.chiIdx, LUC_XUNG_PAIRS) : false;
    const isHaiBride  = brideCC ? chiPair(i, brideCC.chiIdx, LUC_HAI_PAIRS)  : false;
    return {
      ...g,
      isHoangDao: hdIdxs.includes(i),
      isXungGroom,
      isHaiGroom,
      isXungBride,
      isHaiBride,
    };
  });
}
