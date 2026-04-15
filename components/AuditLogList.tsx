"use client";

import { motion } from "framer-motion";
import { GitMerge, Pencil, Plus, Search, Trash2, User } from "lucide-react";
import { useMemo, useState } from "react";

interface AuditLog {
  id: string;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_name: string | null;
  diff: Record<string, [unknown, unknown]> | null;
  created_at: string;
}

const FIELD_LABELS: Record<string, string> = {
  full_name: "Tên",
  birth_year: "Năm sinh",
  death_year: "Năm mất",
  is_deceased: "Đã mất",
  note: "Ghi chú",
  avatar_url: "Ảnh đại diện",
};

function ActionIcon({ action, type }: { action: string; type: string }) {
  if (action === "create") return <Plus className="size-3.5" />;
  if (action === "delete") return <Trash2 className="size-3.5" />;
  if (type === "relationship") return <GitMerge className="size-3.5" />;
  return <Pencil className="size-3.5" />;
}

function actionLabel(action: string, type: string) {
  if (action === "create" && type === "person") return "Thêm thành viên";
  if (action === "delete" && type === "person") return "Xóa thành viên";
  if (action === "update" && type === "person") return "Cập nhật thành viên";
  if (action === "create" && type === "relationship") return "Thêm quan hệ";
  if (action === "delete" && type === "relationship") return "Xóa quan hệ";
  return action;
}

function actionColor(action: string) {
  if (action === "create") return "bg-green-100 text-green-700";
  if (action === "delete") return "bg-rose-100 text-rose-700";
  return "bg-blue-100 text-blue-700";
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

export default function AuditLogList({ logs }: { logs: AuditLog[] }) {
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState<"all" | "create" | "update" | "delete">("all");

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (filterAction !== "all" && l.action !== filterAction) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (l.entity_name ?? "").toLowerCase().includes(q) ||
          (l.actor_name ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, search, filterAction]);

  if (logs.length === 0) {
    return (
      <div className="text-center py-20 text-stone-400">
        <User className="size-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Chưa có thay đổi nào được ghi lại</p>
        <p className="text-sm mt-1">Nhật ký sẽ tự động ghi khi thêm, sửa hoặc xóa thành viên</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm tên thành viên hoặc người thực hiện..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
          />
        </div>
        {(["all", "create", "update", "delete"] as const).map((a) => (
          <button key={a} onClick={() => setFilterAction(a)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              filterAction === a ? "bg-amber-500 text-white shadow-sm" : "bg-white border border-stone-200 text-stone-600 hover:border-amber-200"
            }`}>
            {a === "all" ? "Tất cả" : a === "create" ? "Thêm mới" : a === "update" ? "Cập nhật" : "Xóa"}
          </button>
        ))}
        <span className="text-xs text-stone-400 ml-auto">{filtered.length} mục</span>
      </div>

      {/* Log items */}
      <div className="space-y-2">
        {filtered.map((log, i) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02, duration: 0.25 }}
            className="bg-white/80 border border-stone-200/60 rounded-2xl p-4 flex items-start gap-3 hover:border-stone-300 transition-colors"
          >
            {/* Icon */}
            <div className={`size-8 rounded-xl flex items-center justify-center shrink-0 ${actionColor(log.action)}`}>
              <ActionIcon action={log.action} type={log.entity_type} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-sm font-semibold text-stone-800">
                  {actionLabel(log.action, log.entity_type)}
                </span>
                {log.entity_name && (
                  <span className="text-sm text-stone-600 font-medium">&ldquo;{log.entity_name}&rdquo;</span>
                )}
              </div>

              {/* Diff */}
              {log.diff && Object.keys(log.diff).length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {Object.entries(log.diff).map(([field, [oldVal, newVal]]) => (
                    <span key={field} className="text-[11px] bg-stone-100 text-stone-600 rounded-lg px-2 py-0.5">
                      {FIELD_LABELS[field] ?? field}:
                      <span className="line-through text-rose-400 mx-1">{String(oldVal ?? "—")}</span>
                      <span className="text-green-600">{String(newVal ?? "—")}</span>
                    </span>
                  ))}
                </div>
              )}

              <p className="text-xs text-stone-400 mt-1">
                {log.actor_name ?? "Ẩn danh"} &middot; {timeAgo(log.created_at)}
              </p>
            </div>

            {/* Time */}
            <span className="text-[11px] text-stone-400 shrink-0 hidden sm:block">
              {new Date(log.created_at).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </span>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-10 text-stone-400 text-sm">Không tìm thấy kết quả</div>
      )}
    </div>
  );
}
