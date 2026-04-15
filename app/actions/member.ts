"use server";

import { getSupabase, getUser } from "@/utils/supabase/queries";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function deleteMemberProfile(memberId: string, familyId: string) {
  const user = await getUser();
  if (!user) return { error: "Vui lòng đăng nhập." };

  const supabase = await getSupabase();

  // Lấy thông tin person để biết family_id
  const { data: person, error: personError } = await supabase
    .from("persons")
    .select("id, family_id")
    .eq("id", memberId)
    .single();

  if (personError || !person)
    return { error: "Không tìm thấy thành viên này." };

  // Đảm bảo familyId khớp với person.family_id
  if (person.family_id !== familyId)
    return { error: "Dữ liệu không hợp lệ." };

  // Kiểm tra quyền: owner hoặc family-admin mới được xóa
  const { data: family } = await supabase
    .from("families")
    .select("owner_id")
    .eq("id", familyId)
    .single();

  const isOwner = family?.owner_id === user.id;

  if (!isOwner) {
    const { data: share } = await supabase
      .from("family_shares")
      .select("role")
      .eq("family_id", familyId)
      .eq("shared_with", user.id)
      .single();

    const canWrite =
      share?.role === "editor" || share?.role === "admin";

    if (!canWrite)
      return {
        error:
          "Từ chối truy cập. Chỉ Owner, Admin hoặc Editor của gia phả này mới có quyền xoá hồ sơ.",
      };
  }

  // Kiểm tra quan hệ gia đình còn tồn tại không
  const { data: relationships, error: relationshipError } = await supabase
    .from("relationships")
    .select("id")
    .or(`person_a.eq.${memberId},person_b.eq.${memberId}`)
    .limit(1);

  if (relationshipError) return { error: "Lỗi kiểm tra mối quan hệ gia đình." };

  if (relationships && relationships.length > 0) {
    return {
      error:
        "Không thể xoá. Vui lòng xoá hết các mối quan hệ gia đình của người này trước.",
    };
  }

  const { error: deleteError } = await supabase
    .from("persons")
    .delete()
    .eq("id", memberId)
    .eq("family_id", familyId); // double-check isolation

  if (deleteError) return { error: "Đã xảy ra lỗi khi xoá hồ sơ." };

  revalidatePath(`/dashboard/${familyId}`);
  revalidatePath(`/dashboard/${familyId}/members`);
  redirect(`/dashboard/${familyId}`);
}
