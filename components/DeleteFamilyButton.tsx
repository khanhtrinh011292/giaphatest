"use client";

import { deleteFamily } from "@/app/actions/family";
import { TrashIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function DeleteFamilyButton({
  familyId,
  familyName,
}: {
  familyId: string;
  familyName: string;
}) {
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 5000);
      return;
    }
    startTransition(async () => {
      const res = await deleteFamily(familyId);
      if (res && "error" in res) {
        setErrorMsg(res.error ?? "Đã xảy ra lỗi, vui lòng thử lại.");
        setConfirm(false);
        setTimeout(() => setErrorMsg(null), 5000);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="relative">
      {errorMsg && (
        <div className="absolute bottom-full right-0 mb-2 w-64 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 shadow-md z-10 whitespace-normal">
          ❌ {errorMsg}
        </div>
      )}
      <button
        onClick={handleClick}
        disabled={isPending}
        title={confirm ? "Nhấn lần nữa để xác nhận xóa" : `Xóa "${familyName}"`}
        aria-label={confirm ? "Xác nhận xóa gia phả" : `Xóa gia phả ${familyName}`}
        className={`p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${
          confirm
            ? "bg-red-100 text-red-600 hover:bg-red-200 opacity-100"
            : "text-stone-400 hover:text-red-500 hover:bg-red-50"
        } disabled:opacity-40`}
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
