"use client";

import { createFamily } from "@/app/actions/family";
import { PlusIcon } from "lucide-react";
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
      className="bg-white rounded-xl border border-stone-200 p-5 shadow-sm space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Tên gia phả <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ví dụ: Gia phả họ Phạm"
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          disabled={isPending}
          maxLength={100}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Mô tả <span className="text-stone-400 font-normal">(tuỳ chọn)</span>
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ví dụ: Dòng họ Phạm tại Hồ Chí Minh"
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          disabled={isPending}
          maxLength={200}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
      >
        <PlusIcon className="w-4 h-4" />
        {isPending ? "Đang tạo..." : "Tạo gia phả"}
      </button>
    </form>
  );
}
