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

  // Chỉ select các field cần thiết, không query lại family vì layout đã kiểm tra quyền
  const { data: family } = await supabase
    .from("families")
    .select("id, name, owner_id")
    .eq("id", familyId)
    .single();
  if (!family) redirect("/dashboard");

  const isOwner = family.owner_id === user.id;

  // Nếu không phải owner, kiểm tra share role có quyền post không (admin)
  let canPost = isOwner;
  if (!isOwner) {
    const { data: share } = await supabase
      .from("family_shares")
      .select("role")
      .eq("family_id", familyId)
      .eq("shared_with", user.id)
      .single();
    canPost = share?.role === "admin";
  }

  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, content, image_url, created_at, author_id")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <main className="flex-1 py-8 px-4">
      {/* Tiêu đề */}
      <div className="max-w-5xl mx-auto mb-6">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-0.5">Gia phả</p>
        <h1 className="text-2xl font-serif font-bold text-stone-800">{family.name}</h1>
      </div>

      {/* Layout 2 cột: Bảng tin (trái) + Danh mục sticky (phải) */}
      <div className="max-w-5xl mx-auto flex gap-6 items-start">
        {/* Cột trái: Bảng tin */}
        <div className="flex-1 min-w-0">
          <AnnouncementBoard
            familyId={familyId}
            isOwner={canPost}
            userId={user.id}
            initialAnnouncements={announcements ?? []}
          />
        </div>

        {/* Cột phải: Danh mục sticky — ẩn trên mobile */}
        <div className="hidden lg:block w-72 shrink-0 sticky top-24 self-start">
          <FamilyQuickLinks familyId={familyId} isOwner={isOwner} />
        </div>
      </div>

      {/* Danh mục hiện trên mobile (bên dưới bảng tin) */}
      <div className="lg:hidden max-w-5xl mx-auto mt-6">
        <FamilyQuickLinks familyId={familyId} isOwner={isOwner} />
      </div>
    </main>
  );
}
