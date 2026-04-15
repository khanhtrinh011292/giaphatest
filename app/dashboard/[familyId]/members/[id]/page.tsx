import DeleteMemberButton from "@/components/DeleteMemberButton";
import MemberDetailContent from "@/components/MemberDetailContent";
import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ familyId: string; id: string }>;
}

export default async function MemberDetailPage({ params }: PageProps) {
  const { familyId, id } = await params;
  const profile = await getProfile();
  const isAdmin = profile?.role === "admin";
  const canEdit = profile?.role === "admin" || profile?.role === "editor";

  const supabase = await getSupabase();

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

  return (
    <div className="flex-1 w-full flex flex-col pb-8">
      <div className="w-full py-4 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/${familyId}`}
            className="p-2 -ml-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
            title="Quay lại"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="title">Chi Tiết Thành Viên</h1>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2.5">
            <Link
              href={`/dashboard/${familyId}/members/${id}/edit`}
              className="px-4 py-2 bg-stone-100/80 text-stone-700 rounded-lg hover:bg-stone-200 hover:text-stone-900 font-medium text-sm transition-all shadow-sm"
            >
              Chỉnh sửa
            </Link>
            <DeleteMemberButton memberId={id} familyId={familyId} />
          </div>
        )}
      </div>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 w-full flex-1">
        <div className="bg-white/60 rounded-2xl shadow-sm border border-stone-200/60 overflow-hidden hover:shadow-md transition-shadow duration-300">
          <MemberDetailContent
            person={person}
            privateData={privateData}
            isAdmin={isAdmin}
            canEdit={canEdit}
            familyId={familyId}
          />
        </div>
      </main>
    </div>
  );
}
