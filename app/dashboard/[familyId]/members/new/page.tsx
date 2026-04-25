import MemberForm from "@/components/MemberForm";
import { getSupabase, getUser } from "@/utils/supabase/queries";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ familyId: string }>;
}

export default async function NewMemberPage({ params }: PageProps) {
  const { familyId } = await params;

  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await getSupabase();

  const { data: family } = await supabase
    .from("families")
    .select("owner_id")
    .eq("id", familyId)
    .single();

  if (!family) notFound();

  const isOwner = family.owner_id === user.id;

  let shareRole: string | null = null;
  if (!isOwner) {
    const { data: share } = await supabase
      .from("family_shares")
      .select("role")
      .eq("family_id", familyId)
      .eq("shared_with", user.id)
      .single();
    shareRole = share?.role ?? null;
  }

  const effectiveRole = shareRole === "admin" ? "editor" : shareRole;
  const isAdmin = isOwner;
  const canEdit = isOwner || effectiveRole === "editor";

  if (!canEdit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-stone-800">Truy cập bị từ chối</h1>
          <p className="text-stone-600 mt-2">Bạn không có quyền thêm thành viên.</p>
          <Link href={`/dashboard/${familyId}`} className="mt-4 inline-block text-amber-600 hover:underline">
            ← Quay lại
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full flex flex-col pb-8">
      <div className="w-full py-4 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/${familyId}`}
            className="p-2 -ml-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
            title="Quay lại"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="title">Thêm Thành Viên Mới</h1>
        </div>
        <Link
          href={`/dashboard/${familyId}`}
          className="px-4 py-2 bg-stone-100/80 text-stone-700 rounded-lg hover:bg-stone-200 font-medium text-sm transition-all shadow-sm"
        >
          Hủy
        </Link>
      </div>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 w-full flex-1">
        <MemberForm isAdmin={isAdmin} familyId={familyId} />
      </main>
    </div>
  );
}
