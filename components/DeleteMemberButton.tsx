"use client";

import { deleteMemberProfile } from "@/app/actions/member";
import { AlertCircle, Trash2, X } from "lucide-react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useState } from "react";

interface DeleteMemberButtonProps {
  memberId: string;
  familyId: string;
}

export default function DeleteMemberButton({
  memberId,
  familyId,
}: DeleteMemberButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Fix #5: Thay window.confirm bằng inline confirm để tương thích mobile/browser strict
  const [confirm, setConfirm] = useState(false);

  const handleClick = () => {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 5000);
      return;
    }
    handleDelete();
  };

  const handleDelete = async () => {
    setConfirm(false);
    setIsDeleting(true);
    setError(null);
    try {
      const result = await deleteMemberProfile(memberId, familyId);
      if (result?.error) {
        setError(result.error);
        setIsDeleting(false);
      }
    } catch (err) {
      if (isRedirectError(err)) throw err;
      setError(
        err instanceof Error ? err.message : "Đã xảy ra lỗi khi xoá hồ sơ.",
      );
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={isDeleting}
        aria-label={confirm ? "Nhấn lần nữa để xác nhận xoá hồ sơ" : "Xoá hồ sơ"}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          confirm
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-red-100 text-red-800 hover:bg-red-200"
        }`}
      >
        <Trash2 className="w-4 h-4" />
        {isDeleting ? "Đang xoá..." : confirm ? "Xác nhận xoá?" : "Xoá hồ sơ"}
      </button>
      {error && (
        <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg z-50">
          <div className="flex items-start gap-2 text-sm text-red-800">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 pr-4">{error}</div>
            <button
              onClick={() => setError(null)}
              aria-label="Đóng thông báo lỗi"
              className="absolute top-2 right-2 text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
