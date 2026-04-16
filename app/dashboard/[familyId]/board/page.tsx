import { redirect } from "next/navigation";
import { getSupabase, getUser } from "@/utils/supabase/queries";
import AnnouncementBoard from "@/components/AnnouncementBoard";

export const metadata = { title: "Bảng tin" };

const QUICK_LINKS = [
  { href: "members",   label: "Cây gia phả",          icon: "\uD83C\uDF33" },
  { href: "kinship",   label: "Tra cứu danh xưng",    icon: "\uD83D\uDD0D" },
  { href: "stats",     label: "Thống kê",             icon: "\uD83D\uDCCA" },
  { href: "events",    label: "Lịch sự kiện",         icon: "\uD83D\uDCC5" },
  { href: "baby-names",label: "Gợi ý tên cho con",   icon: "\uD83D\uDC76" },
  { href: "audit",     label: "Nhật ký thay đổi",    icon: "\uD83D\uDCCB" },
  { href: "share",     label: "Chia sẻ gia phả",     icon: "\uD83D\uDD17" },
  { href: "lineage",   label: "Thứ tự gia phả",      icon: "\u2728" },
  { href: "data",      label: "Sao lưu & Phục hồi",  icon: "\uD83D\uDDAB" },
];

export default async function BoardPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await getSupabase();

  // Kiểm tra quyền truy cập
  const { data: family } = await supabase
    .from("families")
    .select("id, name, owner_id")
    .eq("id", familyId)
    .single();
  if (!family) redirect("/dashboard");

  let canEdit = false;
  if (family.owner_id === user.id) {
    canEdit = true;
  } else {
    const { data: share } = await supabase
      .from("family_shares")
      .select("role")
      .eq("family_id", familyId)
      .eq("shared_with", user.id)
      .single();
    canEdit = share?.role === "editor" || share?.role === "admin";
  }

  // Lấy bài đăng và thông tin tác giả
  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, content, image_url, created_at, author_id")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <main className="flex-1 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Tiêu đề */}
        <div>
          <h1 className="text-2xl font-serif font-bold text-stone-800">{family.name}</h1>
          <p className="text-stone-500 text-sm mt-0.5">Bảng tin gia phả</p>
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Truy cập nhanh</p>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_LINKS.map((link) => (
              <a
                key={link.href}
                href={`/dashboard/${familyId}/${link.href}`}
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-stone-50 hover:bg-amber-50 hover:border-amber-200 border border-transparent transition-all text-center group"
              >
                <span className="text-xl">{link.icon}</span>
                <span className="text-[11px] font-medium text-stone-600 group-hover:text-amber-700 leading-tight">
                  {link.label}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Bảng tin */}
        <AnnouncementBoard
          familyId={familyId}
          canEdit={canEdit}
          userId={user.id}
          initialAnnouncements={announcements ?? []}
        />
      </div>
    </main>
  );
}
