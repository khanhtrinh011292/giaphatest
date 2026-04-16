"use server";

import { getSupabase, getUser } from "@/utils/supabase/queries";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function deleteMemberProfile(memberId: string, familyId: string) {
  const user = await getUser();
  if (!user) return { error: "Vui lòng đăng nhập." };

  const supabase = await getSupabase();

  const { data: person, error: personError } = await supabase
    .from("persons")
    .select("id, family_id")
    .eq("id", memberId)
    .single();

  if (personError || !person)
    return { error: "Không tìm thấy thành viên này." };

  if (person.family_id !== familyId)
    return { error: "Dữ liệu không hợp lệ." };

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

    const canWrite = share?.role === "editor" || share?.role === "admin";
    if (!canWrite)
      return {
        error: "Từ chối truy cập. Chỉ Owner, Admin hoặc Editor của gia phả này mới có quyền xoá hồ sơ.",
      };
  }

  const { data: relationships, error: relationshipError } = await supabase
    .from("relationships")
    .select("id")
    .or(`person_a.eq.${memberId},person_b.eq.${memberId}`)
    .limit(1);

  if (relationshipError) return { error: "Lỗi kiểm tra mối quan hệ gia đình." };

  if (relationships && relationships.length > 0) {
    return {
      error: "Không thể xoá. Vui lòng xoá hết các mối quan hệ gia đình của người này trước.",
    };
  }

  const { error: deleteError } = await supabase
    .from("persons")
    .delete()
    .eq("id", memberId)
    .eq("family_id", familyId);

  if (deleteError) return { error: "Đã xảy ra lỗi khi xoá hồ sơ." };

  revalidatePath(`/dashboard/${familyId}`);
  revalidatePath(`/dashboard/${familyId}/members`);
  redirect(`/dashboard/${familyId}`);
}

// ── Xác nhận gợi ý quan hệ: thêm quan hệ cha/mẹ → con vào DB ──────────────
export async function confirmSuggestedRelationship(
  familyId: string,
  parentId: string,
  childId: string
) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };

  const supabase = await getSupabase();

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
    const canEdit = share?.role === "editor" || share?.role === "admin";
    if (!canEdit) return { error: "Bạn không có quyền chỉnh sửa gia phả này." };
  }

  const { data: persons } = await supabase
    .from("persons")
    .select("id")
    .eq("family_id", familyId)
    .in("id", [parentId, childId]);

  if (!persons || persons.length < 2)
    return { error: "Không tìm thấy thành viên trong gia phả." };

  const { data: existing } = await supabase
    .from("relationships")
    .select("id")
    .eq("family_id", familyId)
    .eq("person_a", parentId)
    .eq("person_b", childId)
    .maybeSingle();

  if (existing) return { error: "Quan hệ này đã tồn tại." };

  const { error: insertError } = await supabase
    .from("relationships")
    .insert({
      family_id: familyId,
      person_a: parentId,
      person_b: childId,
      type: "biological_child",
    });

  if (insertError) return { error: insertError.message };

  revalidatePath(`/dashboard/${familyId}`);
  return { success: true };
}
