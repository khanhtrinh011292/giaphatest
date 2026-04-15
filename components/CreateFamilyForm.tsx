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
      setError("Vui l\u00f2ng nh\u1eadp t\u00ean gia ph\u1ea3.");
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
          T\u00ean gia ph\u1ea3 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="V\u00ed d\u1ee5: Gia ph\u1ea3 h\u1ecd Ph\u1ea1m"
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          disabled={isPending}
          maxLength={100}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          M\u00f4 t\u1ea3 <span className="text-stone-400 font-normal">(tu\u1ef3 ch\u1ecdn)</span>
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="V\u00ed d\u1ee5: D\u00f2ng h\u1ecd Ph\u1ea1m t\u1ea1i H\u1ed3 Ch\u00ed Minh"
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
        {isPending ? "\u0110ang t\u1ea1o..." : "T\u1ea1o gia ph\u1ea3"}
      </button>
    </form>
  );
}
