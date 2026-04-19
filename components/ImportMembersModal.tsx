"use client";

import { importFamilyMembers } from "@/app/actions/member";
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
  _rowId: string;
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
  "n\u1eef": "female",
  nu: "female",
  female: "female",
  f: "female",
  "1": "female",
  "kh\u00e1c": "other",
  khac: "other",
  other: "other",
};

const STEPS = ["upload", "preview", "done"] as const;
type Step = (typeof STEPS)[number];

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

      const get = (keys: string[]): unknown => {
        for (const k of keys) {
          const found = Object.keys(row).find(
            (rk) => normalize(rk) === normalize(k),
          );
          if (found !== undefined) return row[found];
        }
        return undefined;
      };

      const ho_ten = String(
        get(["ho_ten", "ho ten", "ho va ten", "full_name", "ten", "name"]) ?? "",
      ).trim();
      const gioi_tinh_raw = normalize(
        get(["gioi_tinh", "gioi tinh", "gender", "gi\u1edbi t\u00ednh"]),
      );
      const gioi_tinh: Gender = GENDER_MAP[gioi_tinh_raw] ?? "male";
      const nam_sinh = toInt(
        get(["nam_sinh", "nam sinh", "birth_year", "n\u0103m sinh", "namsinh"]),
      );
      const the_he = toInt(
        get(["the_he", "the he", "generation", "th\u1ebf h\u1ec7", "doi", "\u0111\u1eddi"]),
      );
      const thu_tu_sinh = toInt(
        get(["thu_tu_sinh", "thu tu sinh", "birth_order", "th\u1ee9 t\u1ef1", "stt"]),
      );
      const ghi_chu =
        String(
          get(["ghi_chu", "ghi chu", "note", "ghi ch\u00fa"]) ?? "",
        ).trim() || null;
      const stt_cha =
        String(
          get(["stt_cha", "ma_cha", "cha", "bo", "father_id", "father"]) ?? "",
        ).trim() || null;
      const stt_me =
        String(
          get(["stt_me", "ma_me", "me", "mother_id", "mother"]) ?? "",
        ).trim() || null;

      if (!ho_ten) errors.push("Thi\u1ebfu H\u1ecd T\u00ean");
      if (nam_sinh !== null && (nam_sinh < 1 || nam_sinh > 2100))
        errors.push("N\u0103m sinh kh\u00f4ng h\u1ee3p l\u1ec7");

      return {
        rowIndex: i + 2,
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
    .filter((r) => r.ho_ten !== "");
};

interface Props {
  familyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportMembersModal({
  familyId,
  onClose,
  onSuccess,
}: Props) {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const processFile = useCallback((file: File) => {
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
        alert(
          "Kh\u00f4ng th\u1ec3 \u0111\u1ecdc file. Vui l\u00f2ng d\u00f9ng file .xlsx ho\u1eb7c .csv \u0111\u00fang \u0111\u1ecbnh d\u1ea1ng.",
        );
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
      [
        "ho_ten",
        "gioi_tinh",
        "nam_sinh",
        "the_he",
        "thu_tu_sinh",
        "stt_cha",
        "stt_me",
        "ghi_chu",
      ],
      ["Nguy\u1ec5n V\u0103n T\u1ed5", "nam", "1920", "1", "1", "", "", "T\u1ed5 ti\u00ean khai l\u1eadp"],
      ["Nguy\u1ec5n Th\u1ecb T\u1ed5 M\u1eabu", "n\u1eef", "1925", "1", "", "", "", "V\u1ee3 c\u1ea3"],
      ["Nguy\u1ec5n V\u0103n A", "nam", "1950", "2", "1", "1", "2", "Con tr\u01b0\u1edfng"],
      ["Nguy\u1ec5n Th\u1ecb B", "n\u1eef", "1955", "2", "2", "1", "2", "Con th\u1ee9 hai"],
      ["Nguy\u1ec5n V\u0103n C", "nam", "1975", "3", "1", "3", "", "Ch\u00e1u \u0111\u00edch t\u00f4n"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GiaPha");
    XLSX.writeFile(wb, "mau_import_gia_pha.xlsx");
  };

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);

    const result = await importFamilyMembers(familyId, validRows);

    if (result.error) {
      alert("Lỗi import: " + result.error);
    } else {
      setResult({
        success: result.count!,
        failed: result.failed!,
        skipped: errorRows.length,
        details: result.details || [],
      });
      setStep("done");
      router.refresh();
    }
    setImporting(false);
  };

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

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
              <h2 className="font-serif font-bold text-stone-800 text-lg">
                Import t\u1eeb Excel / CSV
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {step === "upload" &&
                  "T\u1ea3i l\u00ean file danh s\u00e1ch th\u00e0nh vi\u00ean"}
                {step === "preview" &&
                  `Xem tr\u01b0\u1edbc \u2014 ${rows.length} h\u00e0ng (${validRows.length} h\u1ee3p l\u1ec7)`}
                {step === "done" && "Ho\u00e0n t\u1ea5t import"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-xl transition-colors"
          >
            <X className="size-5 text-stone-500" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center px-6 pt-4 pb-2 shrink-0">
          {STEPS.map((s, i) => {
            const isActive = step === s;
            const isDone = i < stepIndex;
            return (
              <div key={s} className="flex items-center">
                <div
                  className={`flex items-center justify-center size-6 rounded-full text-xs font-bold transition-colors ${
                    isActive
                      ? "bg-emerald-500 text-white"
                      : isDone
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-stone-100 text-stone-400"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="size-4" /> : i + 1}
                </div>
                <span
                  className={`ml-1.5 text-xs font-medium hidden sm:inline ${
                    isActive ? "text-stone-700" : "text-stone-400"
                  }`}
                >
                  {s === "upload"
                    ? "T\u1ea3i file"
                    : s === "preview"
                      ? "Xem tr\u01b0\u1edbc"
                      : "K\u1ebft qu\u1ea3"}
                </span>
                {i < STEPS.length - 1 && (
                  <div className="mx-3 h-px w-8 bg-stone-200" />
                )}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            {/* STEP 1: Upload */}
            {step === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      T\u1ea3i file m\u1eabu
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      File m\u1eabu .xlsx v\u1edbi \u0111\u1ea7y \u0111\u1ee7 c\u1ed9t v\u00e0 d\u1eef li\u1ec7u v\u00ed d\u1ee5
                    </p>
                  </div>
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors shrink-0"
                  >
                    <Download className="size-4" /> T\u1ea3i file m\u1eabu
                  </button>
                </div>

                <div className="mb-5 bg-stone-50 border border-stone-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-stone-600 uppercase tracking-wide mb-3">
                    C\u00e1c c\u1ed9t trong file
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {([
                      {
                        col: "ho_ten",
                        desc: "H\u1ecd v\u00e0 t\u00ean \u0111\u1ea7y \u0111\u1ee7",
                        required: true,
                      },
                      {
                        col: "gioi_tinh",
                        desc: "nam / n\u1eef / kh\u00e1c",
                        required: false,
                      },
                      {
                        col: "nam_sinh",
                        desc: "N\u0103m sinh (VD: 1990)",
                        required: false,
                      },
                      {
                        col: "the_he",
                        desc: "Thu\u1ed9c \u0111\u1eddi th\u1ee9 (VD: 1, 2, 3...)",
                        required: false,
                      },
                      {
                        col: "thu_tu_sinh",
                        desc: "Th\u1ee9 t\u1ef1 trong gia \u0111\u00ecnh",
                        required: false,
                      },
                      {
                        col: "stt_cha",
                        desc: "STT h\u00e0ng c\u1ee7a ng\u01b0\u1eddi cha",
                        required: false,
                      },
                      {
                        col: "stt_me",
                        desc: "STT h\u00e0ng c\u1ee7a ng\u01b0\u1eddi m\u1eb9",
                        required: false,
                      },
                      {
                        col: "ghi_chu",
                        desc: "Ghi ch\u00fa t\u1ef1 do",
                        required: false,
                      },
                    ] as { col: string; desc: string; required: boolean }[]).map(
                      ({ col, desc, required }) => (
                        <div key={col} className="flex items-start gap-2">
                          <code
                            className={`text-xs px-1.5 py-0.5 rounded font-mono shrink-0 ${
                              required
                                ? "bg-red-100 text-red-700"
                                : "bg-stone-200 text-stone-600"
                            }`}
                          >
                            {col}
                          </code>
                          <span className="text-xs text-stone-600">
                            {desc}{" "}
                            {required && (
                              <span className="text-red-500">*</span>
                            )}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                  <p className="mt-3 text-xs text-stone-500 italic">
                    *{" "}
                    <code className="bg-stone-200 px-1 rounded">stt_cha</code> /{" "}
                    <code className="bg-stone-200 px-1 rounded">stt_me</code>:
                    \u0111i\u1ec1n s\u1ed1 th\u1ee9 t\u1ef1 h\u00e0ng (kh\u00f4ng t\u00ednh h\u00e0ng ti\u00eau \u0111\u1ec1) c\u1ee7a b\u1ed1/m\u1eb9
                    trong file.
                  </p>
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${
                    dragOver
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-stone-300 bg-stone-50/50 hover:border-emerald-300 hover:bg-emerald-50/30"
                  }`}
                >
                  <Upload
                    className={`size-10 mb-3 transition-colors ${
                      dragOver ? "text-emerald-500" : "text-stone-400"
                    }`}
                  />
                  <p className="font-semibold text-stone-700 text-sm">
                    K\u00e9o th\u1ea3 file v\u00e0o \u0111\u00e2y ho\u1eb7c click \u0111\u1ec3 ch\u1ecdn
                  </p>
                  <p className="text-xs text-stone-400 mt-1">
                    H\u1ed7 tr\u1ee3 .xlsx, .xls, .csv \u2014 t\u1ed1i \u0111a 5MB
                  </p>
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

            {/* STEP 2: Preview */}
            {step === "preview" && (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span className="text-sm font-semibold text-emerald-700">
                      {validRows.length} h\u1ee3p l\u1ec7
                    </span>
                  </div>
                  {errorRows.length > 0 && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
                      <AlertCircle className="size-4 text-red-500" />
                      <span className="text-sm font-semibold text-red-700">
                        {errorRows.length} l\u1ed7i (s\u1ebd b\u1ecf qua)
                      </span>
                    </div>
                  )}
                  <div className="ml-auto">
                    <button
                      onClick={() => {
                        setStep("upload");
                        setRows([]);
                      }}
                      className="text-xs text-stone-500 hover:text-stone-700 underline"
                    >
                      \u0110\u1ed5i file kh\u00e1c
                    </button>
                  </div>
                </div>

                {errorRows.length > 0 && (
                  <div className="mb-4">
                    <button
                      onClick={() => setShowErrors((v) => !v)}
                      className="flex items-center gap-2 text-xs font-semibold text-red-600 hover:text-red-700"
                    >
                      {showErrors ? (
                        <ChevronUp className="size-3.5" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      )}
                      {showErrors ? "\u1ea8n" : "Xem"} {errorRows.length} h\u00e0ng b\u1ecb l\u1ed7i
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
                              <div
                                key={r._rowId}
                                className="flex items-center gap-2 text-xs"
                              >
                                <span className="text-stone-500">
                                  H\u00e0ng {r.rowIndex}:
                                </span>
                                <span className="font-medium text-stone-700">
                                  {r.ho_ten || "(tr\u1ed1ng)"}
                                </span>
                                <span className="text-red-600">
                                  \u2014 {r._errors.join(", ")}
                                </span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {validRows.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-stone-200">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-200">
                          {[
                            "#",
                            "H\u1ecd T\u00ean",
                            "Gi\u1edbi t\u00ednh",
                            "N\u0103m sinh",
                            "\u0110\u1eddi",
                            "STT",
                            "Cha",
                            "M\u1eb9",
                            "Ghi ch\u00fa",
                          ].map((h) => (
                            <th
                              key={h}
                              className="text-left px-3 py-2.5 font-semibold text-stone-600 whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {validRows.map((r) => (
                          <tr
                            key={r._rowId}
                            className="border-b border-stone-100 hover:bg-stone-50 transition-colors"
                          >
                            <td className="px-3 py-2 text-stone-400">
                              {r.rowIndex}
                            </td>
                            <td className="px-3 py-2 font-medium text-stone-800 whitespace-nowrap">
                              {r.ho_ten}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  r.gioi_tinh === "male"
                                    ? "bg-sky-100 text-sky-700"
                                    : r.gioi_tinh === "female"
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-stone-100 text-stone-600"
                                }`}
                              >
                                {r.gioi_tinh === "male"
                                  ? "Nam"
                                  : r.gioi_tinh === "female"
                                    ? "N\u1eef"
                                    : "Kh\u00e1c"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-stone-600">
                              {r.nam_sinh ?? "\u2014"}
                            </td>
                            <td className="px-3 py-2 text-stone-600">
                              {r.the_he ?? "\u2014"}
                            </td>
                            <td className="px-3 py-2 text-stone-600">
                              {r.thu_tu_sinh ?? "\u2014"}
                            </td>
                            <td className="px-3 py-2 text-stone-500">
                              {r.stt_cha ?? "\u2014"}
                            </td>
                            <td className="px-3 py-2 text-stone-500">
                              {r.stt_me ?? "\u2014"}
                            </td>
                            <td
                              className="px-3 py-2 text-stone-500 max-w-[120px] truncate"
                              title={r.ghi_chu ?? ""}
                            >
                              {r.ghi_chu ?? "\u2014"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10 text-stone-400">
                    <AlertCircle className="size-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">
                      Kh\u00f4ng c\u00f3 h\u00e0ng h\u1ee3p l\u1ec7 n\u00e0o \u0111\u1ec3 import.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 3: Done */}
            {step === "done" && result && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex flex-col items-center py-6 gap-4">
                  <div
                    className={`p-4 rounded-full ${
                      result.failed === 0 ? "bg-emerald-50" : "bg-amber-50"
                    }`}
                  >
                    <CheckCircle2
                      className={`size-12 ${
                        result.failed === 0
                          ? "text-emerald-500"
                          : "text-amber-500"
                      }`}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-stone-800">
                      {result.failed === 0
                        ? "Import th\u00e0nh c\u00f4ng!"
                        : "Import ho\u00e0n t\u1ea5t (c\u00f3 l\u1ed7i)"}
                    </p>
                    <div className="flex items-center justify-center gap-4 mt-3">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-emerald-600">
                          {result.success}
                        </p>
                        <p className="text-xs text-stone-500">Th\u00e0nh c\u00f4ng</p>
                      </div>
                      {result.failed > 0 && (
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-500">
                            {result.failed}
                          </p>
                          <p className="text-xs text-stone-500">Th\u1ea5t b\u1ea1i</p>
                        </div>
                      )}
                      {result.skipped > 0 && (
                        <div className="text-center">
                          <p className="text-2xl font-bold text-stone-400">
                            {result.skipped}
                          </p>
                          <p className="text-xs text-stone-500">B\u1ecf qua</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {result.details.some((d) => d.status === "error") && (
                    <div className="w-full bg-red-50 border border-red-200 rounded-xl p-3 max-h-40 overflow-y-auto">
                      {result.details
                        .filter((d) => d.status === "error")
                        .map((d, i) => (
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
            <button onClick={onClose} className="btn">
              \u0110\u00f3ng
            </button>
          )}
          {step === "preview" && (
            <>
              <button
                onClick={() => {
                  setStep("upload");
                  setRows([]);
                }}
                className="btn"
              >
                \u2190 Quay l\u1ea1i
              </button>
              <button
                onClick={handleImport}
                disabled={importing || validRows.length === 0}
                className="btn-primary"
              >
                {importing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> \u0110ang
                    import...
                  </>
                ) : (
                  <>
                    <Upload className="size-4" /> Import {validRows.length}{" "}
                    th\u00e0nh vi\u00ean
                  </>
                )}
              </button>
            </>
          )}
          {step === "done" && (
            <>
              <button onClick={onClose} className="btn">
                \u0110\u00f3ng
              </button>
              <button
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="btn-primary"
              >
                Xem danh s\u00e1ch th\u00e0nh vi\u00ean
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
