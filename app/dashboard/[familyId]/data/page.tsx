import DataImportExport from "@/components/DataImportExport";
import { getFamilyAccess } from "@/app/actions/data";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ familyId: string }>;
}

export default async function DataManagementPage({ params }: PageProps) {
  const { familyId } = await params;

  // Dùng getFamilyAccess để check quyền — nhất quán với action layer
  // Cả owner lẫn shared-admin đều được vào
  const access = await getFamilyAccess(familyId);

  if ("error" in access) {
    redirect(`/dashboard/${familyId}`);
  }

  if (!access.canImport) {
    redirect(`/dashboard/${familyId}`);
  }

  return (
    <main className="flex-1 bg-stone-50/50 flex flex-col pt-8 w-full">
      <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full">
        <div className="mb-8">
          <h1 className="title">Sao lưu &amp; Phục hồi</h1>
          <p className="text-stone-500 mt-2 text-sm sm:text-base max-w-2xl">
            Quản lý dữ liệu an toàn. Tải xuống bản sao lưu hoặc phục hồi từ
            file đã lưu. Tính năng này chỉ dành cho Owner và Admin của gia phả.
          </p>
        </div>
        <DataImportExport familyId={familyId} />
      </div>
    </main>
  );
}
