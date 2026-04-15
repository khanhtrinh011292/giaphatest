"use client";

import { revokeShare, shareFamily, updateShareRole } from "@/app/actions/family";
import { ShareRole } from "@/types";
import { ArrowLeftIcon, MailIcon, ShieldIcon, Trash2Icon, UserPlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type ShareRow = {
  id: string;
  shared_with: string;
  shared_with_email: string;
  role: ShareRole;
  created_at: string;
};

const ROLE_OPTIONS: { value: ShareRole; label: string; desc: string }[] = [
  { value: "viewer",  label: "\ud83d\udc41\ufe0f Ch\u1ec9 xem",    desc: "Xem s\u01a1 \u0111\u1ed3 v\u00e0 danh s\u00e1ch, kh\u00f4ng ch\u1ec9nh s\u1eeda" },
  { value: "editor",  label: "\u270f\ufe0f Ch\u1ec9nh s\u1eeda",  desc: "Th\u00eam, s\u1eeda, x\u00f3a th\u00e0nh vi\u00ean v\u00e0 quan h\u1ec7" },
  { value: "admin",   label: "\u2699\ufe0f Qu\u1ea3n tr\u1ecb",   desc: "To\u00e0n quy\u1ec1n, bao g\u1ed3m qu\u1ea3n l\u00fd chia s\u1ebb" },
];

function roleLabel(role: ShareRole) {
  return ROLE_OPTIONS.find((o) => o.value === role)?.label ?? role;
}

export default function ShareManager({
  familyId,
  initialShares,
}: {
  familyId: string;
  initialShares: ShareRow[];
}) {
  const router = useRouter();
  const [shares, setShares] = useState<ShareRow[]>(initialShares);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("viewer");
  const [statusMsg, setStatusMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function showStatus(type: "ok" | "err", text: string) {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  }

  function handleShare() {
    if (!email.trim()) { showStatus("err", "Vui l\u00f2ng nh\u1eadp email."); return; }
    startTransition(async () => {
      const res = await shareFamily(familyId, email, role);
      if ("error" in res) {
        showStatus("err", res.error ?? "\u0110\u00e3 x\u1ea3y ra l\u1ed7i.");
      } else {
        showStatus("ok", `\u0110\u00e3 chia s\u1ebb t\u1edbi ${email} v\u1edbi quy\u1ec1n ${roleLabel(role)}.`);
        setEmail("");
        router.refresh();
      }
    });
  }

  function handleRoleChange(shareId: string, newRole: ShareRole) {
    startTransition(async () => {
      const res = await updateShareRole(shareId, newRole);
      if ("error" in res) {
        showStatus("err", res.error ?? "\u0110\u00e3 x\u1ea3y ra l\u1ed7i.");
      } else {
        setShares((prev) => prev.map((s) => s.id === shareId ? { ...s, role: newRole } : s));
        showStatus("ok", "\u0110\u00e3 c\u1eadp nh\u1eadt quy\u1ec1n.");
      }
    });
  }

  function handleRevoke(shareId: string, revokedEmail: string) {
    startTransition(async () => {
      const res = await revokeShare(shareId, familyId);
      if ("error" in res) {
        showStatus("err", res.error ?? "\u0110\u00e3 x\u1ea3y ra l\u1ed7i.");
      } else {
        setShares((prev) => prev.filter((s) => s.id !== shareId));
        showStatus("ok", `\u0110\u00e3 thu h\u1ed3i quy\u1ec1n c\u1ee7a ${revokedEmail}.`);
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/${familyId}`}
          className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-800">Chia s\u1ebb Gia ph\u1ea3</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            M\u1eddi ng\u01b0\u1eddi kh\u00e1c c\u00f9ng xem ho\u1eb7c ch\u1ec9nh s\u1eeda gia ph\u1ea3 c\u1ee7a b\u1ea1n.
          </p>
        </div>
      </div>

      {/* Status */}
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

      {/* Form m\u1eddi */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-4">
        <h2 className="font-semibold text-stone-700 flex items-center gap-2">
          <UserPlusIcon className="w-4 h-4" /> M\u1eddi ng\u01b0\u1eddi d\u00f9ng
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
            <label className="block text-xs font-medium text-stone-500 mb-1">Quy\u1ec1n</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as ShareRole)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              disabled={isPending}
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* M\u00f4 t\u1ea3 quy\u1ec1n \u0111\u01b0\u1ee3c ch\u1ecdn */}
        <p className="text-xs text-stone-400">
          {ROLE_OPTIONS.find((o) => o.value === role)?.desc}
        </p>

        <button
          onClick={handleShare}
          disabled={isPending}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
        >
          <UserPlusIcon className="w-4 h-4" />
          {isPending ? "\u0110ang x\u1eed l\u00fd..." : "G\u1eedi l\u1eddi m\u1eddi"}
        </button>
      </div>

      {/* Danh s\u00e1ch \u0111\u00e3 chia s\u1ebb */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-700 flex items-center gap-2">
            <ShieldIcon className="w-4 h-4" />
            \u0110ang chia s\u1ebb ({shares.length} ng\u01b0\u1eddi)
          </h2>
        </div>

        {shares.length === 0 ? (
          <div className="px-5 py-8 text-center text-stone-400 text-sm">
            Ch\u01b0a chia s\u1ebb v\u1edbi ai. D\u00f9ng form tr\u00ean \u0111\u1ec3 m\u1eddi ng\u01b0\u1eddi d\u00f9ng.
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {shares.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{s.shared_with_email}</p>
                  <p className="text-xs text-stone-400">
                    T\u1eeb {new Date(s.created_at).toLocaleDateString("vi-VN")}
                  </p>
                </div>
                <select
                  value={s.role}
                  onChange={(e) => handleRoleChange(s.id, e.target.value as ShareRole)}
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
                  title="Thu h\u1ed3i quy\u1ec1n"
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
