import BackToBoardButton from "@/components/BackToBoardButton";
import DataImportExport from "@/components/DataImportExport";
import { getSupabase, getUser } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ familyId: string }>;
}

export default async function DataManagementPage({ params }: PageProps) {
  const { familyId } = await params;
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await getSupabase();

  const { data: family } = await supabase
    .from("families")
    .select("owner_id")
    .eq("id", familyId)
    .single();

  if (!family) redirect("/dashboard");

  const isOwner = family.owner_id === user.id;

  if (!isOwner) {
    const { data: share } = await supabase
      .from("family_shares")
      .select("role")
      .eq("family_id", familyId)
      .eq("shared_with", user.id)
      .single();
    if (share?.role !== "admin" && share?.role !== "editor") {
      redirect(`/dashboard/${familyId}`);
    }
  }

  return (
    <main className="flex-1 bg-stone-50/50 flex flex-col pt-8 w-full">
      <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full">
        <BackToBoardButton familyId={familyId} />
        <div className="mb-8">
          <h1 className="title">Sao lưu &amp; Phục hồi</h1>
          <p className="text-stone-500 mt-2 text-sm sm:text-base max-w-2xl">
            Quản lý dữ liệu an toàn. Tải xuống bản sao lưu hoặc phục hồi từ file
            đã lưu. Tính năng này chỉ dành cho Owner và Admin của gia phả.
          </p>
        </div>
        <DataImportExport familyId={familyId} />
      </div>
    </main>
  );
}
