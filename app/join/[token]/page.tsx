import { joinByShareLink } from "@/app/actions/family";
import { getUser } from "@/utils/supabase/queries";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const user = await getUser();

  // Chưa đăng nhập → kiểm tra role của link
  if (!user) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { data: link } = await supabase
      .from("family_share_links")
      .select("role")
      .eq("token", token)
      .eq("is_active", true)
      .single();

    if (link?.role === "viewer") {
      // Viewer không cần đăng nhập → xem public view luôn
      redirect(`/view/${token}`);
    }

    // Editor/admin cần đăng nhập
    redirect(`/login?returnUrl=/join/${token}`);
  }

  // Đã đăng nhập → thử join vào family
  const result = await joinByShareLink(token);

  if (result.error) {
    // Nếu đã là owner hoặc đã là member → vào dashboard luôn
    if (
      result.error === "Đây là gia phả của bạn." ||
      result.error === "Bạn đã là thành viên của gia phả này."
    ) {
      // Lấy family_id từ token để redirect đúng
      const cookieStore = await cookies();
      const supabase = createClient(cookieStore);
      const { data: link } = await supabase
        .from("family_share_links")
        .select("family_id")
        .eq("token", token)
        .single();
      if (link?.family_id) redirect(`/dashboard/${link.family_id}`);
    }

    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl shadow-sm border border-stone-200 space-y-4">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-xl font-serif font-bold text-stone-800">Link không hợp lệ</h1>
          <p className="text-stone-500">{result.error}</p>
          <Link
            href="/dashboard"
            className="inline-block mt-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-colors"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  // Tham gia thành công → redirect đến gia phả vừa tham gia
  redirect(`/dashboard/${result.familyId}`);
}
