"use server";

import { getProfile, getSupabase } from "@/utils/supabase/queries";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function deleteMemberProfile(memberId: string, familyId?: string) {
  const profile = await getProfile();
  const supabase = await getSupabase();

  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { error: "Từ chối truy cập. Chỉ Admin hoặc Editor mới có quyền xoá hồ sơ." };
  }

  const { data: relationships, error: relationshipError } = await supabase
    .from("relationships")
    .select("id")
    .or(`person_a.eq.${memberId},person_b.eq.${memberId}`)
    .limit(1);

  if (relationshipError) return { error: "Lỗi kiểm tra mối quan hệ gia đình." };

  if (relationships && relationships.length > 0) {
    return { error: "Không thể xoá. Vui lòng xoá hết các mối quan hệ gia đình của người này trước." };
  }

  const { error: deleteError } = await supabase
    .from("persons")
    .delete()
    .eq("id", memberId);

  if (deleteError) return { error: "Đã xảy ra lỗi khi xoá hồ sơ." };

  const redirectTo = familyId ? `/dashboard/${familyId}` : "/dashboard";
  revalidatePath(redirectTo);
  redirect(redirectTo);
}
