"use client";

import { createFamily, deleteFamily } from "@/app/actions/family";
import config from "@/app/config";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  Loader2,
  Plus,
  Share2,
  Trash2,
  TreePine,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";

interface Family {
  id: string;
  name: string;
  description?: string | null;
}

interface SharedFamily {
  id: string;
  role: string;
  family: Family;
}

const ROLE_LABEL: Record<string, string> = {
  viewer: "Xem",
  editor: "Chỉnh sửa",
  admin: "Quản trị",
};

const ROLE_COLOR: Record<string, string> = {
  viewer: "bg-blue-50 text-blue-600 ring-1 ring-blue-200/60",
  editor: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60",
  admin: "bg-rose-50 text-rose-600 ring-1 ring-rose-200/60",
};

export default function FamilyList({
  owned,
  shared,
  userEmail,
}: {
  owned: Family[];
  shared: SharedFamily[];
  userEmail: string;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Xóa gia phả “${name}”? Hành động này không thể hoàn tác.`)) return;
    setDeletingId(id);
    startTransition(async () => {
      await deleteFamily(id);
      setDeletingId(null);
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = nameRef.current?.value.trim();
    if (!name) return;
    const fd = new FormData();
    fd.append("name", name);
    if (descRef.current?.value) fd.append("description", descRef.current.value);
    startTransition(async () => {
      await createFamily(fd);
      formRef.current?.reset();
      setShowCreate(false);
    });
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-800 leading-tight">
            {config.siteName}
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            {userEmail}
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreate((v) => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all shadow-sm ${
            showCreate
              ? "bg-stone-100 text-stone-600 hover:bg-stone-200"
              : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200"
          }`}
        >
          <Plus className={`size-4 transition-transform duration-200 ${showCreate ? "rotate-45" : ""}`} />
          Tạo mới
        </motion.button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.form
            ref={formRef}
            onSubmit={handleCreate}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="bg-white/80 border border-stone-200/60 rounded-3xl p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-stone-700 flex items-center gap-2">
                <TreePine className="size-4 text-amber-600" />
                Tạo gia phả mới
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wide">
                    Tên gia phả <span className="text-rose-400">*</span>
                  </label>
                  <input
                    ref={nameRef}
                    type="text"
                    required
                    placeholder="VD: Họ Nguyễn Thành Nam"
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1.5 uppercase tracking-wide">
                    Mô tả (tùy chọn)
                  </label>
                  <textarea
                    ref={descRef}
                    rows={2}
                    placeholder="Ghi chú về gia tộc..."
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-stone-500 hover:bg-stone-100 transition">
                  Hủy
                </button>
                <button type="submit" disabled={isPending}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold shadow-sm transition disabled:opacity-60">
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  Tạo gia phả
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Owned families */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <TreePine className="size-4 text-amber-600 shrink-0" />
          <h2 className="text-sm font-bold text-stone-500 uppercase tracking-wider">Gia phả của tôi</h2>
          <div className="flex-1 h-px bg-stone-200" />
          <span className="text-xs text-stone-400">{owned.length}</span>
        </div>

        {owned.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-3xl border-2 border-dashed border-stone-200 p-10 text-center text-stone-400"
          >
            <TreePine className="size-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Chưa có gia phả nào</p>
            <p className="text-xs mt-1">Bấm “Tạo mới” ở trên để bắt đầu</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {owned.map((f, i) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ delay: i * 0.05, duration: 0.25 }}
                  className="group bg-white/80 border border-stone-200/60 rounded-2xl px-5 py-4 shadow-sm hover:shadow-md hover:border-amber-300/70 transition-all flex items-center gap-4"
                >
                  {/* Icon */}
                  <div className="size-10 rounded-xl bg-amber-50 ring-1 ring-amber-200/60 flex items-center justify-center shrink-0">
                    <TreePine className="size-5 text-amber-600" />
                  </div>

                  {/* Info */}
                  <Link href={`/dashboard/${f.id}`} className="flex-1 min-w-0 group/link">
                    <p className="font-semibold text-stone-800 truncate group-hover/link:text-amber-700 transition-colors">{f.name}</p>
                    {f.description ? (
                      <p className="text-xs text-stone-400 truncate mt-0.5">{f.description}</p>
                    ) : (
                      <p className="text-xs text-stone-300 mt-0.5">Chưa có mô tả</p>
                    )}
                  </Link>

                  {/* Badge */}
                  <span className="text-[11px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-200/60 px-2.5 py-1 rounded-full shrink-0 hidden sm:block">
                    Chủ sở hữu
                  </span>

                  {/* Arrow */}
                  <ChevronRight className="size-4 text-stone-300 group-hover:text-amber-500 transition-colors shrink-0" />

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(f.id, f.name)}
                    disabled={deletingId === f.id}
                    className="size-8 flex items-center justify-center rounded-xl text-stone-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                    title="Xóa gia phả"
                  >
                    {deletingId === f.id
                      ? <Loader2 className="size-4 animate-spin" />
                      : <Trash2 className="size-4" />}
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Shared families */}
      {shared.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <Share2 className="size-4 text-blue-500 shrink-0" />
            <h2 className="text-sm font-bold text-stone-500 uppercase tracking-wider">Chia sẻ với tôi</h2>
            <div className="flex-1 h-px bg-stone-200" />
            <span className="text-xs text-stone-400">{shared.length}</span>
          </div>
          <div className="space-y-2">
            {shared.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.25 }}
                className="group bg-white/80 border border-stone-200/60 rounded-2xl px-5 py-4 shadow-sm hover:shadow-md hover:border-blue-200/70 transition-all flex items-center gap-4"
              >
                <div className="size-10 rounded-xl bg-blue-50 ring-1 ring-blue-200/60 flex items-center justify-center shrink-0">
                  <Users className="size-5 text-blue-500" />
                </div>
                <Link href={`/dashboard/${s.family.id}`} className="flex-1 min-w-0 group/link">
                  <p className="font-semibold text-stone-800 truncate group-hover/link:text-blue-600 transition-colors">{s.family.name}</p>
                  {s.family.description ? (
                    <p className="text-xs text-stone-400 truncate mt-0.5">{s.family.description}</p>
                  ) : (
                    <p className="text-xs text-stone-300 mt-0.5">Chưa có mô tả</p>
                  )}
                </Link>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 hidden sm:block ${ROLE_COLOR[s.role] ?? "bg-stone-100 text-stone-500"}`}>
                  {ROLE_LABEL[s.role] ?? s.role}
                </span>
                <ChevronRight className="size-4 text-stone-300 group-hover:text-blue-400 transition-colors shrink-0" />
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
