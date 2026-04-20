"use client";

import {
  createShareLink,
  getShareLinks,
  revokeShare,
  revokeShareLink,
  shareFamily,
  updateShareRole,
} from "@/app/actions/family";
import { createClient } from "@/utils/supabase/client";
import { ShareRole } from "@/types";
import {
  ClipboardCopyIcon,
  GlobeIcon,
  MailIcon,
  ShieldIcon,
  Trash2Icon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type ShareRow = {
  id: string;
  shared_with: string;
  shared_with_email: string;
  role: ShareRole;
  created_at: string;
};

type ShareLink = {
  id: string;
  token: string;
  role: "viewer" | "editor";
  expires_at: string;
  created_at: string;
};

const ROLE_OPTIONS: { value: "viewer" | "editor"; label: string; desc: string }[] = [
  { value: "viewer", label: "Chỉ xem",   desc: "Xem sơ đồ và danh sách, không chỉnh sửa" },
  { value: "editor", label: "Chỉnh sửa", desc: "Thêm, sửa, xóa thành viên và quan hệ" },
];

function roleLabel(role: ShareRole) {
  return ROLE_OPTIONS.find((o) => o.value === role)?.label ?? (role as string === "admin" ? "Chỉnh sửa (Admin cũ)" : role);
}

function buildShareUrl(token: string, role: "viewer" | "editor"): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return role === "viewer"
    ? `${origin}/view/${token}`
    : `${origin}/join/${token}`;
}

// ── Tab: Chia sẻ cho thành viên ─────────────────────────────────────────────
function MemberShareTab({
  familyId,
  initialShares,
  showStatus,
}: {
  familyId: string;
  initialShares: ShareRow[];
  showStatus: (type: "ok" | "err", text: string) => void;
}) {
  const router = useRouter();
  const [shares, setShares] = useState<ShareRow[]>(initialShares);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("viewer");
  const [isPending, startTransition] = useTransition();

  async function reloadShares() {
    const supabase = createClient();
    const { data } = await supabase
      .from("family_shares_with_email")
      .select("id, shared_with, shared_with_email, role, created_at")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true });
    if (data) setShares(data as ShareRow[]);
  }

  function handleShare() {
    if (!email.trim()) { showStatus("err", "Vui lòng nhập email."); return; }
    startTransition(async () => {
      const res = await shareFamily(familyId, email, role);
      if ("error" in res) {
        showStatus("err", res.error ?? "Đã xảy ra lỗi.");
      } else {
        showStatus("ok", `Đã chia sẻ tới ${email} với quyền ${roleLabel(role)}.`);
        setEmail("");
        await reloadShares();
        router.refresh();
      }
    });
  }

  function handleRoleChange(shareId: string, newRole: "viewer" | "editor") {
    startTransition(async () => {
      const res = await updateShareRole(shareId, newRole);
      if ("error" in res) {
        showStatus("err", res.error ?? "Đã xảy ra lỗi.");
      } else {
        setShares((prev) => prev.map((s) => s.id === shareId ? { ...s, role: newRole } : s));
        showStatus("ok", "Đã cập nhật quyền.");
      }
    });
  }

  function handleRevoke(shareId: string, revokedEmail: string) {
    startTransition(async () => {
      const res = await revokeShare(shareId, familyId);
      if ("error" in res) {
        showStatus("err", res.error ?? "Đã xảy ra lỗi.");
      } else {
        setShares((prev) => prev.filter((s) => s.id !== shareId));
        showStatus("ok", `Đã thu hồi quyền của ${revokedEmail}.`);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-4">
        <h2 className="font-semibold text-stone-700 flex items-center gap-2">
          <UserPlusIcon className="w-4 h-4" /> Mời thành viên
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-stone-500 mb-1">Email</label>
            <div className="relative">
              <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleShare()}
                placeholder="email@example.com"
                className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                disabled={isPending}
              />
            </div>
          </div>
          <div className="sm:w-44">
            <label className="block text-xs font-medium text-stone-500 mb-1">Quyền</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "viewer" | "editor")}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              disabled={isPending}
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-stone-400">
          {ROLE_OPTIONS.find((o) => o.value === role)?.desc}
        </p>
        <button
          onClick={handleShare}
          disabled={isPending}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
        >
          <UserPlusIcon className="w-4 h-4" />
          {isPending ? "Đang xử lý..." : "Gửi lời mời"}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-700 flex items-center gap-2">
            <ShieldIcon className="w-4 h-4" />
            Thành viên hiện tại ({shares.length} người)
          </h2>
        </div>
        {shares.length === 0 ? (
          <div className="px-5 py-8 text-center text-stone-400 text-sm">
            Chưa chia sẻ với ai. Dùng form trên để mời thành viên.
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {shares.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{s.shared_with_email}</p>
                  <p className="text-xs text-stone-400">
                    Từ {new Date(s.created_at).toLocaleDateString("vi-VN")}
                  </p>
                </div>
                <select
                  value={s.role === "admin" ? "editor" : s.role}
                  onChange={(e) => handleRoleChange(s.id, e.target.value as "viewer" | "editor")}
                  disabled={isPending}
                  className="border border-stone-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60"
                >
                  {ROLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleRevoke(s.id, s.shared_with_email)}
                  disabled={isPending}
                  title="Thu hồi quyền"
                  className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  <Trash2Icon className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Tab: Chia sẻ công khai ────────────────────────────────────────────────────
function PublicShareTab({
  familyId,
  showStatus,
}: {
  familyId: string;
  showStatus: (type: "ok" | "err", text: string) => void;
}) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadLinks() {
    const result = await getShareLinks(familyId);
    if (result.data) setLinks(result.data as ShareLink[]);
  }

  async function handleCreate() {
    setLoading(true);
    const result = await createShareLink(familyId, "viewer");
    if (result.error) {
      showStatus("err", result.error);
    } else {
      showStatus("ok", "Đã tạo link công khai mới.");
      await loadLinks();
    }
    setLoading(false);
  }

  function handleRevoke(id: string) {
    startTransition(async () => {
      const res = await revokeShareLink(id);
      if (res.error) {
        showStatus("err", res.error);
      } else {
        setLinks((prev) => prev.filter((l) => l.id !== id));
        showStatus("ok", "Đã thu hồi link.");
      }
    });
  }

  function copyToClipboard(token: string, role: "viewer" | "editor") {
    const url = buildShareUrl(token, role);
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-4">
        <h2 className="font-semibold text-stone-700 flex items-center gap-2">
          <GlobeIcon className="w-4 h-4" /> Tạo link công khai
        </h2>
        <p className="text-xs text-stone-400">
          Link có hiệu lực trong 7 ngày. Bất kỳ ai có link đều có thể xem gia phả{" "}
          <strong>mà không cần đăng nhập</strong>.
        </p>
        <button
          onClick={handleCreate}
          disabled={loading}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
        >
          <GlobeIcon className="w-4 h-4" />
          {loading ? "Đang tạo..." : "+ Tạo link mới"}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-700 flex items-center gap-2">
            <GlobeIcon className="w-4 h-4" />
            Link đang hoạt động ({links.length})
          </h2>
        </div>
        {links.length === 0 ? (
          <div className="px-5 py-8 text-center text-stone-400 text-sm">
            Chưa có link nào. Tạo link để chia sẻ nhanh với người khác.
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {links.map((link) => (
              <li key={link.id} className="flex items-center gap-3 px-5 py-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-stone-500 truncate">
                    {buildShareUrl(link.token, link.role)}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Hết hạn: {new Date(link.expires_at).toLocaleDateString("vi-VN")}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                  Chỉ xem
                </span>
                <button
                  onClick={() => copyToClipboard(link.token, link.role)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  <ClipboardCopyIcon className="w-3.5 h-3.5" />
                  {copied === link.token ? "✓ Đã copy" : "Copy"}
                </button>
                <button
                  onClick={() => handleRevoke(link.id)}
                  disabled={isPending}
                  title="Thu hồi link"
                  className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  <Trash2Icon className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ShareManager({
  familyId,
  initialShares,
  canShareEmail = true,
}: {
  familyId: string;
  initialShares: ShareRow[];
  canShareEmail?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"email" | "link">(canShareEmail ? "email" : "link");
  const [statusMsg, setStatusMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function showStatus(type: "ok" | "err", text: string) {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-serif font-bold text-stone-800">Chia sẻ Gia phả</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          Mời người khác cùng xem hoặc chỉnh sửa gia phả của bạn.
        </p>
      </div>

      {statusMsg && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            statusMsg.type === "ok"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex border-b border-stone-200">
        {canShareEmail && (
          <button
            onClick={() => setActiveTab("email")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === "email"
                ? "border-amber-600 text-amber-700"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            <UsersIcon className="w-4 h-4" />
            Thành viên trong gia đình
          </button>
        )}
        <button
          onClick={() => setActiveTab("link")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === "link"
              ? "border-amber-600 text-amber-700"
              : "border-transparent text-stone-500 hover:text-stone-700"
          }`}
        >
          <GlobeIcon className="w-4 h-4" />
          Chia sẻ công khai
        </button>
      </div>

      {activeTab === "email" && canShareEmail && (
        <MemberShareTab
          familyId={familyId}
          initialShares={initialShares}
          showStatus={showStatus}
        />
      )}
      {activeTab === "link" && (
        <PublicShareTab
          familyId={familyId}
          showStatus={showStatus}
        />
      )}
    </div>
  );
}
