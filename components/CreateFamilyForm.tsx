"use client";

import { createFamily } from "@/app/actions/family";
import { Loader2, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function CreateFamilyForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Vui lòng nhập tên gia phả.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createFamily(name, description);
      if ("error" in result) {
        setError(result.error ?? null);
      } else {
        router.push(`/dashboard/${result.data.id}`);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden"
    >
      <div className="p-5 sm:p-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
            Tên gia phả <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Gia phả họ Phạm"
            className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-300 dark:placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition bg-stone-50/50 dark:bg-stone-800"
            disabled={isPending}
            maxLength={100}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
            Mô tả{" "}
            <span className="text-stone-300 dark:text-stone-600 font-normal normal-case">(tuỳ chọn)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ví dụ: Dòng họ Phạm tại Hồ Chí Minh"
            className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-300 dark:placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition bg-stone-50/50 dark:bg-stone-800"
            disabled={isPending}
            maxLength={200}
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>
      <div className="bg-stone-50 dark:bg-stone-800/50 border-t border-stone-100 dark:border-stone-800 px-5 sm:px-6 py-3 flex items-center justify-between">
        <p className="text-xs text-stone-400 dark:text-stone-500">Bạn có thể chỉnh sửa sau.</p>
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 dark:disabled:bg-amber-900/40 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:shadow-none"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <PlusIcon className="w-4 h-4" />
          )}
          {isPending ? "Đang tạo..." : "Tạo gia phả"}
        </button>
      </div>
    </form>
  );
}
