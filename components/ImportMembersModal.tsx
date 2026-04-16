"use client";

import { Gender } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import * as XLSX from "xlsx";

interface ImportRow {
  rowIndex: number;
  ho_ten: string;
  gioi_tinh: Gender;
  nam_sinh: number | null;
  the_he: number | null;
  thu_tu_sinh: number | null;
  ghi_chu: string | null;
  stt_cha: string | null;
  stt_me: string | null;
  // internal tracking
  _rowId: string; // unique key per row (e.g. "1", "2", ...)
  _errors: string[];
}

interface ImportResult {
  success: number;
  failed: number;
  skipped: number;
  details: { name: string; status: "ok" | "error" | "skip"; message?: string }[];
}

const GENDER_MAP: Record<string, Gender> = {
  nam: "male",
  male: "male",
  m: "male",
  "0": "male",
  nữ: "female",
  nu: "female",
  female: "female",
  f: "female",
  "1": "female",
  khác: "other",
  khac: "other",
  other: "other",
};

const normalize = (s: unknown): string =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0111\u0110]/g, "d");

const toInt = (v: unknown): number | null => {
  const n = parseInt(String(v ?? ""));
  return isNaN(n) ? null : n;
};

const parseRows = (data: Record<string, unknown>[]): ImportRow[] => {
  return data
    .map((row, i) => {
      const errors: string[] = [];

      // Flexible column name matching
      const get = (keys: string[]): unknown => {
        for (const k of keys) {
          const found = Object.keys(row).find(
            (rk) => normalize(rk) === normalize(k),
          );
          if (found !== undefined) return row[found];
        }
        return undefined;
      };

      const ho_ten = String(get(["ho_ten", "ho ten", "ho va ten", "full_name", "ten", "name"]) ?? "").trim();
      const gioi_tinh_raw = normalize(get(["gioi_tinh", "gioi tinh", "gender", "giới tính"]));
      const gioi_tinh: Gender = GENDER_MAP[gioi_tinh_raw] ?? "male";
      const nam_sinh = toInt(get(["nam_sinh", "nam sinh", "birth_year", "năm sinh", "namsinh"]));
      const the_he = toInt(get(["the_he", "the he", "generation", "thế hệ", "doi", "đời"]));
      const thu_tu_sinh = toInt(get(["thu_tu_sinh", "thu tu sinh", "birth_order", "thứ tự", "stt"]));
      const ghi_chu = String(get(["ghi_chu", "ghi chu", "note", "ghi chú"]) ?? "").trim() || null;
      const stt_cha = String(get(["stt_cha", "ma_cha", "cha", "bo", "father_id", "father"]) ?? "").trim() || null;
      const stt_me = String(get(["stt_me", "ma_me", "me", "mother_id", "mother"]) ?? "").trim() || null;

      if (!ho_ten) errors.push("Thiếu Họ Tên");
      if (nam_sinh !== null && (nam_sinh < 1 || nam_sinh > 2100))
        errors.push("Năm sinh không hợp lệ");

      return {
        rowIndex: i + 2, // Excel row number (1=header)
        ho_ten,
        gioi_tinh,
        nam_sinh,
        the_he,
        thu_tu_sinh,
        ghi_chu,
        stt_cha,
        stt_me,
        _rowId: String(i + 1),
        _errors: errors,
      } satisfies ImportRow;
    })
    .filter((r) => r.ho_ten !== ""); // skip blank rows
};

interface Props {
  familyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportMembersModal({ familyId, onClose, onSuccess }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const processFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: "",
          raw: false,
        });
        const parsed = parseRows(json);
        setRows(parsed);
        setStep("preview");
      } catch {
        alert("Không thể đọc file. Vui lòng dùng file .xlsx hoặc .csv đúng định dạng.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const validRows = rows.filter((r) => r._errors.length === 0);
  const errorRows = rows.filter((r) => r._errors.length > 0);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["ho_ten", "gioi_tinh", "nam_sinh", "the_he", "thu_tu_sinh", "stt_cha", "stt_me", "ghi_chu"],
      ["Nguyễn Văn Tổ", "nam", "1920", "1", "1", "", "", "Tổ tiên khai lập"],
      ["Nguyễn Thị Tổ Mẫu", "nữ", "1925", "1", "", "", "", "Vợ cả"],
      ["Nguyễn Văn A", "nam", "1950", "2", "1", "1", "2", "Con trưởng"],
      ["Nguyễn Thị B", "nữ", "1955", "2", "2", "1", "2", "Con thứ hai"],
      ["Nguyễn Văn C", "nam", "1975", "3", "1", "3", "", "Cháu đích tôn"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GiaPha");
    XLSX.writeFile(wb, "mau_import_gia_pha.xlsx");
  };

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);

    const details: ImportResult["details"] = [];
    let successCount = 0;
    let failedCount = 0;

    // Map: _rowId → inserted DB person id (for relationship resolution)
    const rowIdToPersonId: Record<string, string> = {};

    // Phase 1: Insert all persons
    for (const row of validRows) {
      try {
        const payload: Record<string, unknown> = {
          family_id: familyId,
          full_name: row.ho_ten,
          gender: row.gioi_tinh,
          is_in_law: false,
          is_deceased: false,
        };
        if (row.nam_sinh !== null) payload.birth_year = row.nam_sinh;
        if (row.the_he !== null) payload.generation = row.the_he;
        if (row.thu_tu_sinh !== null) payload.birth_order = row.thu_tu_sinh;
        if (row.ghi_chu) payload.note = row.ghi_chu;

        const { data, error } = await supabase
          .from("persons")
          .insert(payload)
          .select("id")
          .single();

        if (error || !data) throw error ?? new Error("No data returned");

        rowIdToPersonId[row._rowId] = data.id;
        details.push({ name: row.ho_ten, status: "ok" });
        successCount++;
      } catch (err) {
        details.push({
          name: row.ho_ten,
          status: "error",
          message: (err as Error).message,
        });
        failedCount++;
      }
    }

    // Phase 2: Insert relationships (cha → con, mẹ → con)
    for (const row of validRows) {
      const childId = rowIdToPersonId[row._rowId];
      if (!childId) continue;

      const parents: { stt: string; label: string }[] = [];
      if (row.stt_cha) parents.push({ stt: row.stt_cha, label: "cha" });
      if (row.stt_me) parents.push({ stt: row.stt_me, label: "mẹ" });

      for (const { stt } of parents) {
        const parentId = rowIdToPersonId[stt];
        if (!parentId) continue; // parent not found in this import batch — skip silently

        const { error } = await supabase.from("relationships").insert({
          family_id: familyId,
          person_a: parentId,
          person_b: childId,
          type: "biological_child",
        });

        if (error) {
          // Non-critical — log to detail
          const detail = details.find((d) => d.name === row.ho_ten);
          if (detail) {
            detail.message = (detail.message ?? "") + ` (Quan hệ thất bại)`;
          }
        }
      }
    }

    setResult({ success: successCount, failed: failedCount, skipped: errorRows.length, details });
    setStep("done");
    setImporting(false);
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <FileSpreadsheet className="size-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-stone-800 text-lg">Import từ Excel / CSV</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {step === "upload" && "Tải lên file danh sách thành viên"}
                {step === "preview" && `Xem trước — ${rows.length} hàng tìm thấy (${validRows.length} hợp lệ)`}
                {step === "done" && "Hoàn tất import"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-xl transition-colors">
            <X className="size-5 text-stone-500" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-0 px-6 pt-4 pb-2 shrink-0">
          {(["upload", "preview", "done"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-0">
              <div className={`flex items-center justify-center size-6 rounded-full text-xs font-bold transition-colors
                ${
                  step === s
                    ? "bg-emerald-500 text-white"
                    : (step === "preview" && i === 0) || step === "done"
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-stone-100 text-stone-400"
                }`}>
                {((step === "preview" && i === 0) || step === "done") && i < (["upload", "preview", "done"].indexOf(step)) ? (
                  <CheckCircle2 className="size-4" />
                ) : (i + 1)}
              </div>
              <span className={`ml-1.5 text-xs font-medium hidden sm:inline ${
                step === s ? "text-stone-700" : "text-stone-400"
              }`}>
                {s === "upload" ? "Tải file" : s === "preview" ? "Xem trước" : "Kết quả"}
              </span>
              {i < 2 && <div className="mx-3 h-px w-8 bg-stone-200" />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">

            {/* ── STEP 1: Upload ── */}
            {step === "upload" && (
              <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Download template */}
                <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Tải file mẫu</p>
                    <p className="text-xs text-amber-700 mt-0.5">File mẫu .xlsx với đầy đủ cột và dữ liệu ví dụ</p>
                  </div>
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors shrink-0"
                  >
                    <Download className="size-4" /> Tải file mẫu
                  </button>
                </div>

                {/* Columns guide */}
                <div className="mb-5 bg-stone-50 border border-stone-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-stone-600 uppercase tracking-wide mb-3">Các cột trong file</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { col: "ho_ten", desc: "Họ và tên đầy đủ", required: true },
                      { col: "gioi_tinh", desc: 'nam / nữ / khác', required: false },
                      { col: "nam_sinh", desc: "Năm sinh (VD: 1990)", required: false },
                      { col: "the_he", desc: "Thuộc đời thứ (VD: 1, 2, 3...)", required: false },
                      { col: "thu_tu_sinh", desc: "Thứ tự trong gia đình", required: false },
                      { col: "stt_cha", desc: "STT hàng của người cha trong file", required: false },
                      { col: "stt_me", desc: "STT hàng của người mẹ trong file", required: false },
                      { col: "ghi_chu", desc: "Ghi chú tự do", required: false },
                    ].map(({ col, desc, required }) => (
                      <div key={col} className="flex items-start gap-2">
                        <code className={`text-xs px-1.5 py-0.5 rounded font-mono shrink-0 ${
                          required ? "bg-red-100 text-red-700" : "bg-stone-200 text-stone-600"
                        }`}>{col}</code>
                        <span className="text-xs text-stone-600">{desc} {required && <span className="text-red-500">*</span>}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-stone-500 italic">
                    * <code className="bg-stone-200 px-1 rounded">stt_cha</code> / <code className="bg-stone-200 px-1 rounded">stt_me</code>: điền số thứ tự hàng (không tính hàng tiêu đề) của bố/mẹ trong file. Ví dụ: nếu bố ở hàng 1 thì điền "1".
                  </p>
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${
                    dragOver
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-stone-300 bg-stone-50/50 hover:border-emerald-300 hover:bg-emerald-50/30"
                  }`}
                >
                  <Upload className={`size-10 mb-3 transition-colors ${
                    dragOver ? "text-emerald-500" : "text-stone-400"
                  }`} />
                  <p className="font-semibold text-stone-700 text-sm">Kéo thả file vào đây hoặc click để chọn</p>
                  <p className="text-xs text-stone-400 mt-1">Hỗ trợ .xlsx, .xls, .csv — tối đa 5MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </motion.div>
            )}

            {/* ── STEP 2: Preview ── */}
            {step === "preview" && (
              <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Summary bar */}
                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span className="text-sm font-semibold text-emerald-700">{validRows.length} hợp lệ</span>
                  </div>
                  {errorRows.length > 0 && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
                      <AlertCircle className="size-4 text-red-500" />
                      <span className="text-sm font-semibold text-red-700">{errorRows.length} lỗi (sẽ bỏ qua)</span>
                    </div>
                  )}
                  <div className="ml-auto">
                    <button
                      onClick={() => { setStep("upload"); setRows([]); }}
                      className="text-xs text-stone-500 hover:text-stone-700 underline"
                    >
                      Đổi file khác
                    </button>
                  </div>
                </div>

                {/* Error rows accordion */}
                {errorRows.length > 0 && (
                  <div className="mb-4">
                    <button
                      onClick={() => setShowErrors((v) => !v)}
                      className="flex items-center gap-2 text-xs font-semibold text-red-600 hover:text-red-700"
                    >
                      {showErrors ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                      {showErrors ? "Ẩn" : "Xem"} {errorRows.length} hàng bị lỗi
                    </button>
                    <AnimatePresence>
                      {showErrors && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden mt-2"
                        >
                          <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1.5">
                            {errorRows.map((r) => (
                              <div key={r._rowId} className="flex items-center gap-2 text-xs">
                                <span className="text-stone-500">Hàng {r.rowIndex}:</span>
                                <span className="font-medium text-stone-700">{r.ho_ten || "(trống)"}</span>
                                <span className="text-red-600">— {r._errors.join(", ")}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Preview table */}
                {validRows.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-stone-200">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-200">
                          <th className="text-left px-3 py-2.5 font-semibold text-stone-600 whitespace-nowrap">#</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-stone-600 whitespace-nowrap">Họ Tên</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-stone-600 whitespace-nowrap">Giới tính</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-stone-600 whitespace-nowrap">Năm sinh</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-stone-600 whitespace-nowrap">Đời</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-stone-600 whitespace-nowrap">STT</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-stone-600 whitespace-nowrap">Cha</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-stone-600 whitespace-nowrap">Mẹ</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-stone-600 whitespace-nowrap">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validRows.map((r) => (
                          <tr key={r._rowId} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                            <td className="px-3 py-2 text-stone-400">{r.rowIndex}</td>
                            <td className="px-3 py-2 font-medium text-stone-800 whitespace-nowrap">{r.ho_ten}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                r.gioi_tinh === "male" ? "bg-sky-100 text-sky-700" :
                                r.gioi_tinh === "female" ? "bg-rose-100 text-rose-700" :
                                "bg-stone-100 text-stone-600"
                              }`}>
                                {r.gioi_tinh === "male" ? "Nam" : r.gioi_tinh === "female" ? "Nữ" : "Khác"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-stone-600">{r.nam_sinh ?? "—"}</td>
                            <td className="px-3 py-2 text-stone-600">{r.the_he ?? "—"}</td>
                            <td className="px-3 py-2 text-stone-600">{r.thu_tu_sinh ?? "—"}</td>
                            <td className="px-3 py-2 text-stone-500">{r.stt_cha ?? "—"}</td>
                            <td className="px-3 py-2 text-stone-500">{r.stt_me ?? "—"}</td>
                            <td className="px-3 py-2 text-stone-500 max-w-[120px] truncate" title={r.ghi_chu ?? ""}>{r.ghi_chu ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {validRows.length === 0 && (
                  <div className="text-center py-10 text-stone-400">
                    <AlertCircle className="size-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Không có hàng hợp lệ nào để import.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── STEP 3: Done ── */}
            {step === "done" && result && (
              <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex flex-col items-center py-6 gap-4">
                  <div className={`p-4 rounded-full ${
                    result.failed === 0 ? "bg-emerald-50" : "bg-amber-50"
                  }`}>
                    <CheckCircle2 className={`size-12 ${
                      result.failed === 0 ? "text-emerald-500" : "text-amber-500"
                    }`} />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-stone-800">
                      {result.failed === 0 ? "Import thành công!" : "Import hoàn tất (có lỗi)"}
                    </p>
                    <div className="flex items-center justify-center gap-4 mt-3">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-emerald-600">{result.success}</p>
                        <p className="text-xs text-stone-500">Thành công</p>
                      </div>
                      {result.failed > 0 && (
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-500">{result.failed}</p>
                          <p className="text-xs text-stone-500">Thất bại</p>
                        </div>
                      )}
                      {result.skipped > 0 && (
                        <div className="text-center">
                          <p className="text-2xl font-bold text-stone-400">{result.skipped}</p>
                          <p className="text-xs text-stone-500">Bỏ qua</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {result.details.some((d) => d.status === "error") && (
                    <div className="w-full bg-red-50 border border-red-200 rounded-xl p-3 max-h-40 overflow-y-auto">
                      {result.details.filter((d) => d.status === "error").map((d, i) => (
                        <p key={i} className="text-xs text-red-700 flex gap-2">
                          <span className="font-medium shrink-0">{d.name}:</span>
                          <span>{d.message}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-stone-100 bg-stone-50/50 shrink-0">
          {step === "upload" && (
            <button onClick={onClose} className="btn">Đóng</button>
          )}
          {step === "preview" && (
            <>
              <button onClick={() => { setStep("upload"); setRows([]); }} className="btn">← Quay lại</button>
              <button
                onClick={handleImport}
                disabled={importing || validRows.length === 0}
                className="btn-primary"
              >
                {importing ? (
                  <><Loader2 className="size-4 animate-spin" /> Đang import...</>
                ) : (
                  <><Upload className="size-4" /> Import {validRows.length} thành viên</>
                )}
              </button>
            </>
          )}
          {step === "done" && (
            <>
              <button onClick={onClose} className="btn">Đóng</button>
              <button
                onClick={() => { onSuccess(); onClose(); }}
                className="btn-primary"
              >
                Xem danh sách thành viên
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
