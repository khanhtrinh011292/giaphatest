"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export interface FundPerson {
  id: string;
  full_name: string;
  birth_year: number | null;
  is_deceased: boolean;
}

export interface FundTransaction {
  id: string;
  type: "thu" | "chi" | "cung_tien";
  contributor_name: string;
  person_id: string | null;
  amount: number;
  note: string | null;
  transaction_date: string;
  created_at: string;
}

interface Props {
  familyId: string;
  isOwner: boolean;
  initialTransactions: FundTransaction[];
  persons: FundPerson[];
}

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  thu: { label: "Thu", color: "text-green-700", bg: "bg-green-100" },
  chi: { label: "Chi", color: "text-red-600", bg: "bg-red-100" },
  cung_tien: { label: "Cúng tiến", color: "text-amber-700", bg: "bg-amber-100" },
};

// === Combobox tìm kiếm người ===
function PersonCombobox({
  persons,
  value,
  onChange,
  placeholder,
}: {
  persons: FundPerson[];
  value: string;
  onChange: (name: string, personId: string | null) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Sync nếu value bị reset từ ngoài
  useEffect(() => { setQuery(value); }, [value]);

  // Đóng khi click ra ngoài
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = query.trim() === ""
    ? persons
    : persons.filter((p) =>
        p.full_name.toLowerCase().includes(query.toLowerCase())
      );

  function select(p: FundPerson) {
    setQuery(p.full_name);
    setOpen(false);
    onChange(p.full_name, p.id);
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setOpen(true);
    // Nếu xóa hết thì reset person_id
    if (!e.target.value.trim()) onChange("", null);
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        autoComplete="off"
        className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        required
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-lg">
          {filtered.map((p) => (
            <li
              key={p.id}
              onMouseDown={() => select(p)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-amber-50 cursor-pointer border-b border-stone-50 last:border-b-0"
            >
              <span className="font-medium text-stone-800">{p.full_name}</span>
              {p.birth_year && (
                <span className="text-xs text-stone-400">
                  ({p.is_deceased ? "mất" : "sinh"} {p.birth_year})
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {open && query.trim() !== "" && filtered.length === 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-400 shadow-lg">
          Không tìm thấy trong gia phả
        </div>
      )}
    </div>
  );
}

export default function FamilyFund({
  familyId,
  isOwner,
  initialTransactions,
  persons,
}: Props) {
  const [transactions, setTransactions] = useState<FundTransaction[]>(initialTransactions);
  const [activeTab, setActiveTab] = useState<"fund" | "so_vang">("fund");

  // Form thu/chi
  const [type, setType] = useState<"thu" | "chi">("thu");
  const [name, setName] = useState("");
  const [personId, setPersonId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  // Form sổ vàng
  const [svName, setSvName] = useState("");
  const [svPersonId, setSvPersonId] = useState<string | null>(null);
  const [svAmount, setSvAmount] = useState("");
  const [svNote, setSvNote] = useState("");
  const [svDate, setSvDate] = useState(new Date().toISOString().split("T")[0]);

  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const supabase = createClient();

  const balance = transactions.reduce((acc, t) => {
    if (t.type === "chi") return acc - t.amount;
    return acc + t.amount;
  }, 0);

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
      setError("Vui lòng chọn người và nhập số tiền hợp lệ.");
      return;
    }
    startTransition(async () => {
      const { data, error: err } = await supabase
        .from("family_fund_transactions")
        .insert({
          family_id: familyId,
          type,
          contributor_name: name.trim(),
          person_id: personId,
          amount: parsedAmount,
          note: note.trim() || null,
          transaction_date: date,
        })
        .select()
        .single();
      if (err || !data) { setError(err?.message ?? "Lỗi không xác định."); return; }
      setTransactions((prev) => [data as FundTransaction, ...prev]);
      setName(""); setPersonId(null); setAmount(""); setNote("");
      setDate(new Date().toISOString().split("T")[0]);
    });
  }

  async function handleSubmitSoVang(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsedAmount = parseAmountInput(svAmount);
    if (!svName.trim() || parsedAmount <= 0) {
      setError("Vui lòng chọn người và nhập số tiền hợp lệ.");
      return;
    }
    startTransition(async () => {
      const { data, error: err } = await supabase
        .from("family_fund_transactions")
        .insert({
          family_id: familyId,
          type: "cung_tien",
          contributor_name: svName.trim(),
          person_id: svPersonId,
          amount: parsedAmount,
          note: svNote.trim() || null,
          transaction_date: svDate,
        })
        .select()
        .single();
      if (err || !data) { setError(err?.message ?? "Lỗi không xác định."); return; }
      setTransactions((prev) => [data as FundTransaction, ...prev]);
      setSvName(""); setSvPersonId(null); setSvAmount(""); setSvNote("");
      setSvDate(new Date().toISOString().split("T")[0]);
    });
  }

  async function handleResetAll() {
    if (!confirm("Bạn có chắc chắn muốn xóa TOÀN BỘ dữ liệu (Quỹ & Sổ Vàng) không? Hành động này không thể hoàn tác.")) return;
    
    const pwd = prompt("Vui lòng nhập mật khẩu tài khoản của bạn để xác nhận xóa toàn bộ:");
    if (!pwd) return;

    setError("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      setError("Không tìm thấy thông tin phiên đăng nhập.");
      return;
    }

    startTransition(async () => {
      // Xác thực lại bằng mật khẩu
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: pwd,
      });

      if (authError) {
        setError("Mật khẩu không chính xác hoặc xác thực thất bại.");
        return;
      }

      // Mật khẩu đúng, tiến hành xóa
      const { error: err } = await supabase
        .from("family_fund_transactions")
        .delete()
        .eq("family_id", familyId);

      if (!err) {
        setTransactions([]);
        alert("Đã đặt lại toàn bộ dữ liệu thành công.");
      } else {
        setError("Không thể xóa: " + err.message);
      }
    });
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

  const fundTxs = transactions.filter((t) => t.type !== "cung_tien");
  const soVangTxs = transactions.filter((t) => t.type === "cung_tien");

  return (
    <div className="mb-8 space-y-6">

      {/* === CARD THÔNG TIN QUỸ === */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-serif font-bold text-stone-800 mb-4">Thông tin Quỹ gia phả</h2>
        <div className="space-y-4 text-sm text-stone-600 leading-relaxed">
          <div>
            <p className="font-semibold text-stone-800 mb-1">1. Nguồn thu quỹ họ</p>
            <ul className="space-y-1 pl-4 list-disc">
              <li><span className="font-medium text-stone-700">Đóng góp theo định suất:</span> Mức đóng góp do toàn họ quyết định, thường thu theo chi, nhánh hoặc từng gia đình.</li>
              <li><span className="font-medium text-stone-700">Sự hảo tâm (Cung tiến):</span> Con cháu nội ngoại công đức, ủng hộ thêm để xây dựng, tôn tạo nhà thờ hoặc sửa chữa gia phả.</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-stone-800 mb-1">2. Mục đích sử dụng quỹ</p>
            <ul className="space-y-1 pl-4 list-disc">
              <li><span className="font-medium text-stone-700">Xây dựng và duy trì gia phả:</span> Chi phí cho việc tìm kiếm gốc tích, ghi chép, in ấn gia phả mới, bảo quản gia phả cũ.</li>
              <li><span className="font-medium text-stone-700">Tổ chức giỗ Tổ, lễ Tết:</span> Chi phí mua sắm lễ vật, tổ chức ăn uống, gặp mặt con cháu vào ngày giỗ Tổ hoặc mùng 1 Tết tại nhà thờ họ.</li>
              <li><span className="font-medium text-stone-700">Tương trợ, hiếu hỉ:</span> Thăm hỏi, phúng viếng khi thành viên trong họ ốm đau, qua đời.</li>
              <li><span className="font-medium text-stone-700">Khuyến học:</span> Khen thưởng con cháu có thành tích học tập tốt, hỗ trợ con cháu nghèo hiếu học.</li>
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

      {/* === CARD QUỸ + TABS === */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">

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
          {(["fund", "so_vang"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition ${
                activeTab === tab
                  ? "bg-white border border-b-white border-amber-200 text-amber-900 -mb-px"
                  : "text-amber-700 hover:text-amber-900"
              }`}>
              {tab === "fund" ? "Thu Chi Quỹ" : "Sổ Vàng Cúng Tiến"}
            </button>
          ))}
        </div>

        {/* === TAB: THU CHI === */}
        {activeTab === "fund" && (
          <>
            {isOwner && (
              <form onSubmit={handleSubmitFund}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 pb-6 border-b border-amber-200">
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
                    {type === "thu" ? "Người đóng góp" : "Người / mục chi"}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <PersonCombobox
                    persons={persons}
                    value={name}
                    placeholder={type === "thu" ? "Tìm tên trong gia phả..." : "Tìm tên người chi..."}
                    onChange={(n, pid) => { setName(n); setPersonId(pid); }}
                  />
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
                  <p className="sm:col-span-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                )}
                <div className="sm:col-span-2">
                  <button type="submit" disabled={isPending}
                    className="rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold px-6 py-2.5 transition disabled:opacity-50 disabled:cursor-not-allowed">
                    {isPending ? "Đang lưu..." : type === "thu" ? "Thêm khoản thu" : "Thêm khoản chi"}
                  </button>
                </div>
              </form>
            )}
            <AuditTable txs={fundTxs} isOwner={isOwner} onResetAll={handleResetAll} onDownload={handleDownload} />
          </>
        )}

        {/* === TAB: SỔ VÀNG === */}
        {activeTab === "so_vang" && (
          <>
            <div className="mb-4 rounded-xl bg-amber-100 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              Sổ vàng cúng tiến ghi nhận tấm lòng hảo tâm của con cháu nội ngoại đóng góp tự nguyện vượt ngoài định suất, được trân trọng ghi vào sổ riêng để lưu truyền cho đời sau.
            </div>
            {isOwner && (
              <form onSubmit={handleSubmitSoVang}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 pb-6 border-b border-amber-200">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-amber-800">
                    Người cúng tiến<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <PersonCombobox
                    persons={persons}
                    value={svName}
                    placeholder="Tìm tên trong gia phả..."
                    onChange={(n, pid) => { setSvName(n); setSvPersonId(pid); }}
                  />
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
                  <p className="sm:col-span-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                )}
                <div className="sm:col-span-2">
                  <button type="submit" disabled={isPending}
                    className="rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-sm font-semibold px-6 py-2.5 transition disabled:opacity-50 disabled:cursor-not-allowed">
                    {isPending ? "Đang lưu..." : "Ghi vào Sổ Vàng"}
                  </button>
                </div>
              </form>
            )}
            <AuditTable txs={soVangTxs} isOwner={isOwner} onResetAll={handleResetAll} onDownload={handleDownload} isSoVang />
          </>
        )}
      </div>
    </div>
  );
}

function AuditTable({
  txs, isOwner, onResetAll, onDownload, isSoVang = false,
}: {
  txs: FundTransaction[];
  isOwner: boolean;
  onResetAll: () => void;
  onDownload: () => void;
  isSoVang?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-amber-800 uppercase tracking-widest">
          {isSoVang ? "Danh sách cúng tiến" : "Nhật ký thu chi"}
        </h3>
        {(txs.length > 0 || isOwner) && (
          <div className="flex items-center gap-4">
            {txs.length > 0 && (
              <button onClick={onDownload}
                className="text-xs text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2 transition">
                Tải về CSV
              </button>
            )}
            {isOwner && (
              <button onClick={onResetAll}
                className="text-xs text-red-600 hover:text-red-700 font-medium underline underline-offset-2 transition">
                Xóa tất cả (Đặt lại)
              </button>
            )}
          </div>
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
