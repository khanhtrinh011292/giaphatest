"use client";

import ImportMembersModal from "@/components/ImportMembersModal";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  familyId: string;
  familyName: string;
}

export default function ImportPageClient({ familyId, familyName }: Props) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-4 py-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-stone-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="size-5 text-stone-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 rounded-xl">
                <FileSpreadsheet className="size-5 text-emerald-600" />
              </div>
              <div>
                <h1 className="font-serif font-bold text-stone-800 text-lg">
                  Import thành viên
                </h1>
                <p className="text-xs text-stone-500">{familyName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-page modal embedded */}
      <div className="relative">
        <ImportMembersModal
          familyId={familyId}
          onClose={() => router.push(`/dashboard/${familyId}/members`)}
          onSuccess={() => router.push(`/dashboard/${familyId}/members`)}
        />
      </div>
    </div>
  );
}
