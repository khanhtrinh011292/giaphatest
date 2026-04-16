import { redirect } from "next/navigation";
import { getSupabase, getUser } from "@/utils/supabase/queries";
import AnnouncementBoard from "@/components/AnnouncementBoard";
import FamilyQuickLinks from "@/components/FamilyQuickLinks";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ familyId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { familyId } = await params;
  const supabase = await getSupabase();
  const { data: family } = await supabase
    .from("families")
    .select("name")
    .eq("id", familyId)
    .single();
  return { title: family?.name ? `${family.name} — Bảng tin` : "Bảng tin" };
}

export default async function BoardPage({ params }: PageProps) {
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

  const isOwner = family.owner_id === user.id;

  // Admin cũng có quyền đăng bảng tin
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

      {/* Layout responsive: stack trên mobile, 2 cột trên desktop */}
      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-6 items-start">
        {/* Cột trái: Bảng tin */}
        <div className="flex-1 min-w-0 w-full">
          <AnnouncementBoard
            familyId={familyId}
            isOwner={canPost}
            userId={user.id}
            initialAnnouncements={announcements ?? []}
          />
        </div>

        {/* Cột phải: Danh mục — sticky trên desktop, bình thường trên mobile */}
        <div className="w-full lg:w-72 lg:shrink-0 lg:sticky lg:top-24 lg:self-start">
          <FamilyQuickLinks familyId={familyId} isOwner={isOwner} />
        </div>
      </div>
    </main>
  );
}
