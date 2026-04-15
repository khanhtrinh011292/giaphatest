import MemberForm from "@/components/MemberForm";
import { getSupabase, getUser } from "@/utils/supabase/queries";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ familyId: string; id: string }>;
}

export default async function EditMemberPage({ params }: PageProps) {
  const { familyId, id } = await params;

  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await getSupabase();

  // Lấy family để biết owner
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

  const isAdmin = isOwner || shareRole === "admin";
  const canEdit = isOwner || shareRole === "admin" || shareRole === "editor";

  if (!canEdit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-stone-800">
            Truy cập bị từ chối
          </h1>
          <p className="text-stone-600 mt-2">
            Bạn không có quyền chỉnh sửa thành viên.
          </p>
          <Link
            href={`/dashboard/${familyId}`}
            className="mt-4 inline-block text-amber-600 hover:underline"
          >
            ← Quay lại
          </Link>
        </div>
      </div>
    );
  }

  const { data: person, error } = await supabase
    .from("persons")
    .select("*")
    .eq("id", id)
    .eq("family_id", familyId)
    .single();

  if (error || !person) notFound();

  let privateData = null;
  if (isAdmin) {
    const { data } = await supabase
      .from("person_details_private")
      .select("*")
      .eq("person_id", id)
      .single();
    privateData = data;
  }

  const initialData = isAdmin ? { ...person, ...privateData } : { ...person };

  return (
    <div className="flex-1 w-full flex flex-col pb-8">
      <div className="w-full py-4 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto flex items-center gap-3">
        <Link
          href={`/dashboard/${familyId}/members/${id}`}
          className="p-2 -ml-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
          title="Quay lại"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="title">Chỉnh Sửa Thành Viên</h1>
      </div>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 w-full flex-1">
        <MemberForm
          initialData={initialData}
          isEditing={true}
          isAdmin={isAdmin}
          familyId={familyId}
        />
      </main>
    </div>
  );
}
