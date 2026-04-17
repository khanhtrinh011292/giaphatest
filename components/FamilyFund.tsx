"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/utils/supabase/client";

export interface FundTransaction {
  id: string;
  type: "thu" | "chi" | "cung_tien";
  contributor_name: string;
  amount: number;
  note: string | null;
  transaction_date: string;
  created_at: string;
}

interface Props {
  familyId: string;
  isOwner: boolean;
  initialTransactions: FundTransaction[];
}

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  thu: { label: "Thu", color: "text-green-700", bg: "bg-green-100" },
  chi: { label: "Chi", color: "text-red-600", bg: "bg-red-100" },
  cung_tien: { label: "Cúng tiến", color: "text-amber-700", bg: "bg-amber-100" },
};

export default function FamilyFund({
  familyId,
  isOwner,
  initialTransactions,
}: Props) {
  const [transactions, setTransactions] =
    useState<FundTransaction[]>(initialTransactions);

  // Tab: "fund" | "so_vang"
  const [activeTab, setActiveTab] = useState<"fund" | "so_vang">("fund");

  // Form thu/chi
  const [type, setType] = useState<"thu" | "chi">("thu");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Form sổ vàng
  const [svName, setSvName] = useState("");
  const [svAmount, setSvAmount] = useState("");
  const [svNote, setSvNote] = useState("");
  const [svDate, setSvDate] = useState(new Date().toISOString().split("T")[0]);

  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const supabase = createClient();

  // Số dư = thu + cung_tien - chi
  const balance = transactions.reduce((acc, t) => {
    if (t.type === "chi") return acc - t.amount;
    return acc + t.amount;
  }, 0);

  // Tổng cúng tiến
  const totalCungTien = transactions
    .filter((t) => t.type === "cung_tien")
    .reduce((acc, t) => acc + t.amount, 0);

  function parseAmountInput(raw: string): number {
    return parseInt(raw.replace(/\D/g, ""), 10) || 0;
  }

  async function handleSubmitFund(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsedAmount = parseAmountInput(amount);
    if (!name.trim() || parsedAmount <= 0) {
      setError("Vui lòng nhập đầy đủ tên và số tiền hợp lệ.");
      return;
    }
    startTransition(async () => {
      const { data, error: err } = await supabase
        .from("family_fund_transactions")
        .insert({
          family_id: familyId,
          type,
          contributor_name: name.trim(),
          amount: parsedAmount,
          note: note.trim() || null,
          transaction_date: date,
        })
        .select()
        .single();
      if (err || !data) { setError(err?.message ?? "Lỗi không xác định."); return; }
      setTransactions((prev) => [data as FundTransaction, ...prev]);
      setName(""); setAmount(""); setNote("");
      setDate(new Date().toISOString().split("T")[0]);
    });
  }

  async function handleSubmitSoVang(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsedAmount = parseAmountInput(svAmount);
    if (!svName.trim() || parsedAmount <= 0) {
      setError("Vui lòng nhập đầy đủ tên và số tiền hợp lệ.");
      return;
    }
    startTransition(async () => {
      const { data, error: err } = await supabase
        .from("family_fund_transactions")
        .insert({
          family_id: familyId,
          type: "cung_tien",
          contributor_name: svName.trim(),
          amount: parsedAmount,
          note: svNote.trim() || null,
          transaction_date: svDate,
        })
        .select()
        .single();
      if (err || !data) { setError(err?.message ?? "Lỗi không xác định."); return; }
      setTransactions((prev) => [data as FundTransaction, ...prev]);
      setSvName(""); setSvAmount(""); setSvNote("");
      setSvDate(new Date().toISOString().split("T")[0]);
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Xoá giao dịch này?")) return;
    const { error: err } = await supabase
      .from("family_fund_transactions")
      .delete()
      .eq("id", id);
    if (!err) setTransactions((prev) => prev.filter((t) => t.id !== id));
  }

  function handleDownload() {
    const header = "Loại,Tên,Số tiền (VNĐ),Ngày,Ghi chú\n";
    const rows = transactions
      .map((t) =>
        [
          TYPE_LABELS[t.type]?.label ?? t.type,
          `"${t.contributor_name}"`,
          t.amount,
          t.transaction_date,
          `"${t.note ?? ""}"`,
        ].join(",")
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quy-gia-pha-${familyId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Lọc giao dịch theo tab
  const fundTxs = transactions.filter((t) => t.type !== "cung_tien");
  const soVangTxs = transactions.filter((t) => t.type === "cung_tien");
  const auditTxs = activeTab === "fund" ? fundTxs : soVangTxs;

  return (
    <div className="mb-8 space-y-6">

      {/* === CARD THÔNG TIN QUỸ === */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-serif font-bold text-stone-800 mb-4">
          Thông tin Quỹ gia phả
        </h2>

        <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
          <div>
            <p className="font-semibold text-stone-800 mb-1">1. Nguồn thu quỹ họ</p>
            <ul className="space-y-1 pl-4 list-disc">
              <li>
                <span className="font-medium text-stone-700">Đóng góp theo định suất:</span>{" "}
                Mức đóng góp do toàn họ quyết định, thường thu theo chi, nhánh hoặc từng gia đình.
              </li>
              <li>
                <span className="font-medium text-stone-700">Sự hảo tâm (Cung tiến):</span>{" "}
                Con cháu nội ngoại công đức, ủng hộ thêm để xây dựng, tôn tạo nhà thờ hoặc sửa chữa gia phả.
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-stone-800 mb-1">2. Mục đích sử dụng quỹ</p>
            <ul className="space-y-1 pl-4 list-disc">
              <li>
                <span className="font-medium text-stone-700">Xây dựng và duy trì gia phả:</span>{" "}
                Chi phí cho việc tìm kiếm gốc tích, ghi chép, in ấn gia phả mới, bảo quản gia phả cũ.
              </li>
              <li>
                <span className="font-medium text-stone-700">Tổ chức giỗ Tổ, lễ Tết:</span>{" "}
                Chi phí mua sắm lễ vật, tổ chức ăn uống, gặp mặt con cháu vào ngày giỗ Tổ hoặc mùng 1 Tết tại nhà thờ họ.
              </li>
              <li>
                <span className="font-medium text-stone-700">Tương trợ, hiếu hỉ:</span>{" "}
                Thăm hỏi, phúng viếng khi thành viên trong họ ốm đau, qua đời.
              </li>
              <li>
                <span className="font-medium text-stone-700">Khuyến học:</span>{" "}
                Khen thưởng con cháu có thành tích học tập tốt, hỗ trợ con cháu nghèo hiếu học.
              </li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-stone-800 mb-1">3. Quy định đóng góp</p>
            <ul className="space-y-1 pl-4 list-disc">
              <li>Thường quy định đóng góp đầy đủ, đúng thời hạn cho trưởng chi họ hoặc hội đồng gia tộc.</li>
              <li>Con gái (đã xuất giá) thường không bắt buộc góp quỹ nhưng nếu tự nguyện thì hoan nghênh và ghi vào <span className="italic">“sổ vàng cúng tiến”</span>.</li>
              <li>Con cháu nghèo khó có thể được miễn hoặc giảm, nhưng được khuyến khích tương trợ.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* === CARD SỐ DƯ + TABS === */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">

        {/* Header số dư */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-base font-serif font-bold text-amber-900">Quỹ gia phả</h2>
            <p className="text-sm text-amber-700 mt-0.5">
              Số dư hiện tại:{" "}
              <span className={`font-bold ${balance >= 0 ? "text-green-700" : "text-red-600"}`}>
                {formatVND(balance)}
              </span>
            </p>
          </div>
          {totalCungTien > 0 && (
            <div className="text-right">
              <p className="text-xs text-amber-700 font-medium">Tổng cúng tiến</p>
              <p className="text-sm font-bold text-amber-800">{formatVND(totalCungTien)}</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-amber-200">
          <button
            onClick={() => setActiveTab("fund")}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition ${
              activeTab === "fund"
                ? "bg-white border border-b-white border-amber-200 text-amber-900 -mb-px"
                : "text-amber-700 hover:text-amber-900"
            }`}
          >
            Thu Chi Quỹ
          </button>
          <button
            onClick={() => setActiveTab("so_vang")}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition ${
              activeTab === "so_vang"
                ? "bg-white border border-b-white border-amber-200 text-amber-900 -mb-px"
                : "text-amber-700 hover:text-amber-900"
            }`}
          >
            Sổ Vàng Cúng Tiến
          </button>
        </div>

        {/* === TAB: THU CHI QUỸ === */}
        {activeTab === "fund" && (
          <>
            {isOwner && (
              <form
                onSubmit={handleSubmitFund}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 pb-6 border-b border-amber-200"
              >
                <div className="sm:col-span-2 flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="fund-type" value="thu" checked={type === "thu"}
                      onChange={() => setType("thu")} className="accent-green-600" />
                    <span className="text-sm font-semibold text-green-700">Thu vào quỹ</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="fund-type" value="chi" checked={type === "chi"}
                      onChange={() => setType("chi")} className="accent-red-500" />
                    <span className="text-sm font-semibold text-red-600">Chi ra khỏi quỹ</span>
                  </label>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-amber-800">
                    {type === "thu" ? "Tên người đóng góp" : "Tên người/mục chi"}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input type="text"
                    placeholder={type === "thu" ? "VD: Nguyễn Văn A" : "VD: Chi tổ chức giỗ"}
                    value={name} onChange={(e) => setName(e.target.value)}
                    className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" required />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-amber-800">
                    Số tiền (VNĐ)<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input type="text" placeholder="VD: 500.000"
                    value={amount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setAmount(raw ? parseInt(raw, 10).toLocaleString("vi-VN") : "");
                    }}
                    className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" required />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-amber-800">
                    Ngày<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" required />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-amber-800">Ghi chú</label>
                  <input type="text" placeholder="Không bắt buộc"
                    value={note} onChange={(e) => setNote(e.target.value)}
                    className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>

                {error && (
                  <p className="sm:col-span-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="sm:col-span-2">
                  <button type="submit" disabled={isPending}
                    className="rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold px-6 py-2.5 transition disabled:opacity-50 disabled:cursor-not-allowed">
                    {isPending ? "Đang lưu..." : type === "thu" ? "Thêm khoản thu" : "Thêm khoản chi"}
                  </button>
                </div>
              </form>
            )}
            <AuditTable txs={fundTxs} isOwner={isOwner} onDelete={handleDelete} onDownload={handleDownload} />
          </>
        )}

        {/* === TAB: SỔ VÀNG CÚNG TIẼN === */}
        {activeTab === "so_vang" && (
          <>
            <div className="mb-4 rounded-xl bg-amber-100 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              Sổ vàng cúng tiến ghi nhận tấm lòng hảo tâm của con cháu nội ngoại đóng góp tự nguyện vượt ngoài định suất, được trân trọng ghi vào sổ riêng để lưu truyền cho đời sau.
            </div>

            {isOwner && (
              <form
                onSubmit={handleSubmitSoVang}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 pb-6 border-b border-amber-200"
              >
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-amber-800">
                    Tên người cúng tiến<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input type="text" placeholder="VD: Nguyễn Thị B"
                    value={svName} onChange={(e) => setSvName(e.target.value)}
                    className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" required />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-amber-800">
                    Số tiền cúng tiến (VNĐ)<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input type="text" placeholder="VD: 2.000.000"
                    value={svAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setSvAmount(raw ? parseInt(raw, 10).toLocaleString("vi-VN") : "");
                    }}
                    className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" required />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-amber-800">
                    Ngày cúng tiến<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input type="date" value={svDate} onChange={(e) => setSvDate(e.target.value)}
                    className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" required />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-amber-800">Mục đích cúng tiến</label>
                  <input type="text" placeholder="VD: Xây dựng nhà thờ họ"
                    value={svNote} onChange={(e) => setSvNote(e.target.value)}
                    className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                </div>

                {error && (
                  <p className="sm:col-span-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <div className="sm:col-span-2">
                  <button type="submit" disabled={isPending}
                    className="rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold px-6 py-2.5 transition disabled:opacity-50 disabled:cursor-not-allowed">
                    {isPending ? "Đang lưu..." : "Ghi vào Sổ Vàng"}
                  </button>
                </div>
              </form>
            )}
            <AuditTable txs={soVangTxs} isOwner={isOwner} onDelete={handleDelete} onDownload={handleDownload} isSoVang />
          </>
        )}
      </div>
    </div>
  );
}

// === Sub-component bảng audit log ===
function AuditTable({
  txs,
  isOwner,
  onDelete,
  onDownload,
  isSoVang = false,
}: {
  txs: FundTransaction[];
  isOwner: boolean;
  onDelete: (id: string) => void;
  onDownload: () => void;
  isSoVang?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-amber-800 uppercase tracking-widest">
          {isSoVang ? "Danh sách cúng tiến" : "Nhật ký thu chi"}
        </h3>
        {txs.length > 0 && (
          <button onClick={onDownload}
            className="text-xs text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2 transition">
            Tải về CSV
          </button>
        )}
      </div>

      {txs.length === 0 ? (
        <p className="text-sm text-amber-600 italic py-4 text-center">
          {isSoVang ? "Chưa có ghi chép cúng tiến nào." : "Chưa có giao dịch nào."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-amber-200 bg-white">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-xs text-amber-700 border-b border-amber-100 bg-amber-50">
                <th className="px-3 py-2 font-semibold">Ngày</th>
                {!isSoVang && <th className="px-3 py-2 font-semibold">Loại</th>}
                <th className="px-3 py-2 font-semibold">{isSoVang ? "Người cúng tiến" : "Tên"}</th>
                <th className="px-3 py-2 font-semibold text-right">Số tiền</th>
                <th className="px-3 py-2 font-semibold">{isSoVang ? "Mục đích" : "Ghi chú"}</th>
                {isOwner && <th className="px-3 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {txs.map((t, i) => {
                const meta = TYPE_LABELS[t.type] ?? { label: t.type, color: "text-stone-600", bg: "bg-stone-100" };
                return (
                  <tr key={t.id}
                    className={`border-b border-amber-50 hover:bg-amber-50 transition ${
                      i === txs.length - 1 ? "border-b-0" : ""
                    }`}>
                    <td className="px-3 py-2.5 whitespace-nowrap text-stone-500 text-xs">{t.transaction_date}</td>
                    {!isSoVang && (
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${meta.bg} ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-stone-800 font-medium">{t.contributor_name}</td>
                    <td className={`px-3 py-2.5 text-right font-semibold whitespace-nowrap ${
                      t.type === "chi" ? "text-red-600" : "text-green-700"
                    }`}>
                      {t.type === "chi" ? "−" : "+"}{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(t.amount)}
                    </td>
                    <td className="px-3 py-2.5 text-stone-400 text-xs">{t.note ?? "—"}</td>
                    {isOwner && (
                      <td className="px-3 py-2.5">
                        <button onClick={() => onDelete(t.id)}
                          className="text-red-300 hover:text-red-500 transition text-xs font-bold" title="Xoá">
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
