import { redirect } from "next/navigation";
import { getSupabase, getUser } from "@/utils/supabase/queries";
import AnnouncementBoard from "@/components/AnnouncementBoard";
import FamilyQuickLinks from "@/components/FamilyQuickLinks";

export const metadata = { title: "Bảng tin" };

export default async function BoardPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await getSupabase();

  const { data: family } = await supabase
    .from("families")
    .select("id, name, owner_id")
    .eq("id", familyId)
    .single();
  if (!family) redirect("/dashboard");

  // Chỉ chủ sở hữu mới đăng được bảng tin
  const isOwner = family.owner_id === user.id;

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, content, image_url, created_at, author_id")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <main className="flex-1 py-8 px-4">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Tiêu đề */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-0.5">Gia phả</p>
            <h1 className="text-2xl font-serif font-bold text-stone-800">{family.name}</h1>
          </div>
        </div>

        {/* ============ BẢNG TIN ============ */}
        <AnnouncementBoard
          familyId={familyId}
          isOwner={isOwner}
          userId={user.id}
          initialAnnouncements={announcements ?? []}
        />

        {/* ============ TRUY CỬ P NHANH ============ */}
        <FamilyQuickLinks familyId={familyId} isOwner={isOwner} />

      </div>
    </main>
  );
}
