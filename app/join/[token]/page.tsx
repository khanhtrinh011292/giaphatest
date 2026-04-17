import { joinByShareLink } from "@/app/actions/family";
import config from "@/app/config";
import { getUser } from "@/utils/supabase/queries";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const user = await getUser();

  // Chưa đăng nhập → redirect đến login kèm returnUrl
  if (!user) {
    redirect(`/login?returnUrl=/join/${token}`);
  }

  const result = await joinByShareLink(token);

  if (result.error) {
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
