"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/utils/supabase/client";

export interface FundTransaction {
  id: string;
  type: "thu" | "chi";
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

export default function FamilyFund({
  familyId,
  isOwner,
  initialTransactions,
}: Props) {
  const [transactions, setTransactions] =
    useState<FundTransaction[]>(initialTransactions);
  const [type, setType] = useState<"thu" | "chi">("thu");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const supabase = createClient();

  const balance = transactions.reduce((acc, t) => {
    return t.type === "thu" ? acc + t.amount : acc - t.amount;
  }, 0);

  function parseAmountInput(raw: string): number {
    return parseInt(raw.replace(/\D/g, ""), 10) || 0;
  }

  async function handleSubmit(e: React.FormEvent) {
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
      if (err || !data) {
        setError(err?.message ?? "Lỗi không xác định.");
        return;
      }
      setTransactions((prev) => [data as FundTransaction, ...prev]);
      setName("");
      setAmount("");
      setNote("");
      setDate(new Date().toISOString().split("T")[0]);
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Xoá giao dịch này?")) return;
    const { error: err } = await supabase
      .from("family_fund_transactions")
      .delete()
      .eq("id", id);
    if (!err) {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    }
  }

  function handleDownload() {
    const header =
      "Loại,Tên người đóng góp/chi,Số tiền (VNĐ),Ngày,Ghi chú\n";
    const rows = transactions
      .map((t) =>
        [
          t.type === "thu" ? "Thu" : "Chi",
          `"${t.contributor_name}"`,
          t.amount,
          t.transaction_date,
          `"${t.note ?? ""}"`,
        ].join(",")
      )
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quy-gia-pha-${familyId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-serif font-bold text-amber-900">
            🏦 Quỹ gia phả
          </h2>
          <p className="text-sm text-amber-700 mt-0.5">
            Số dư hiện tại:{" "}
            <span
              className={`font-bold ${
                balance >= 0 ? "text-green-700" : "text-red-600"
              }`}
            >
              {formatVND(balance)}
            </span>
          </p>
        </div>
      </div>

      {/* Form nhập thu/chi — chỉ owner */}
      {isOwner && (
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 pb-6 border-b border-amber-200"
        >
          {/* Loại giao dịch */}
          <div className="sm:col-span-2 flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="fund-type"
                value="thu"
                checked={type === "thu"}
                onChange={() => setType("thu")}
                className="accent-green-600"
              />
              <span className="text-sm font-semibold text-green-700">
                ➕ Thu vào quỹ
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="fund-type"
                value="chi"
                checked={type === "chi"}
                onChange={() => setType("chi")}
                className="accent-red-500"
              />
              <span className="text-sm font-semibold text-red-600">
                ➖ Chi ra khỏi quỹ
              </span>
            </label>
          </div>

          {/* Tên */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-amber-800">
              {type === "thu" ? "Tên người đóng góp" : "Tên người/mục chi"}
              <span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type="text"
              placeholder={type === "thu" ? "VD: Nguyễn Văn A" : "VD: Chi tổ chức giỗ"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              required
            />
          </div>

          {/* Số tiền */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-amber-800">
              Số tiền (VNĐ)<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: 500,000"
              value={amount}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "");
                setAmount(
                  raw ? parseInt(raw, 10).toLocaleString("vi-VN") : ""
                );
              }}
              className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              required
            />
          </div>

          {/* Ngày */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-amber-800">
              Ngày<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              required
            />
          </div>

          {/* Ghi chú */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-amber-800">Ghi chú</label>
            <input
              type="text"
              placeholder="Không bắt buộc"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {error && (
            <p className="sm:col-span-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
              ⚠️ {error}
            </p>
          )}

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold px-6 py-2.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending
                ? "Đang lưu..."
                : type === "thu"
                ? "➕ Thêm khoản thu"
                : "➖ Thêm khoản chi"}
            </button>
          </div>
        </form>
      )}

      {/* Audit Log */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-amber-800 uppercase tracking-widest">
            📋 Nhật ký thu chi
          </h3>
          {transactions.length > 0 && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2 transition"
            >
              ⬇ Tải về CSV
            </button>
          )}
        </div>

        {transactions.length === 0 ? (
          <p className="text-sm text-amber-600 italic py-4 text-center">
            Chưa có giao dịch nào.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-amber-200 bg-white">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-xs text-amber-700 border-b border-amber-100 bg-amber-50">
                  <th className="px-3 py-2 font-semibold">Ngày</th>
                  <th className="px-3 py-2 font-semibold">Loại</th>
                  <th className="px-3 py-2 font-semibold">Tên</th>
                  <th className="px-3 py-2 font-semibold text-right">Số tiền</th>
                  <th className="px-3 py-2 font-semibold">Ghi chú</th>
                  {isOwner && <th className="px-3 py-2"></th>}
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr
                    key={t.id}
                    className={`border-b border-amber-50 hover:bg-amber-50 transition ${
                      i === transactions.length - 1 ? "border-b-0" : ""
                    }`}
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap text-stone-500 text-xs">
                      {t.transaction_date}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          t.type === "thu"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {t.type === "thu" ? "Thu" : "Chi"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-stone-800 font-medium">
                      {t.contributor_name}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right font-semibold whitespace-nowrap ${
                        t.type === "thu" ? "text-green-700" : "text-red-600"
                      }`}
                    >
                      {t.type === "chi" ? "−" : "+"}
                      {formatVND(t.amount)}
                    </td>
                    <td className="px-3 py-2.5 text-stone-400 text-xs">
                      {t.note ?? "—"}
                    </td>
                    {isOwner && (
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="text-red-300 hover:text-red-500 transition text-xs font-bold"
                          title="Xoá giao dịch"
                        >
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
