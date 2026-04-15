"use server";

import { Family, FamilyShare, ShareRole } from "@/types";
import { getSupabase, getUser } from "@/utils/supabase/queries";
import { revalidatePath } from "next/cache";

// ── Lấy danh sách gia phả (sở hữu + được share) ─────────────────────────────
export async function getFamilies(): Promise<
  { owned: Family[]; shared: (FamilyShare & { family: Family })[] } | { error: string }
> {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  const [ownedRes, sharedRes] = await Promise.all([
    supabase
      .from("families")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("family_shares")
      .select("*, family:families(*)")
      .eq("shared_with", user.id)
      .order("created_at", { ascending: true }),
  ]);

  return {
    owned: (ownedRes.data ?? []) as Family[],
    shared: (sharedRes.data ?? []) as (FamilyShare & { family: Family })[],
  };
}

// ── Tạo gia phả mới ──────────────────────────────────────────────────────────
export async function createFamily(name: string, description?: string) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  if (!name?.trim()) return { error: "Tên gia phả không được để trống." };

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("families")
    .insert({ name: name.trim(), description: description?.trim() ?? null, owner_id: user.id })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { data: data as Family };
}

// ── Cập nhật tên/mô tả gia phả ───────────────────────────────────────────────
export async function updateFamily(
  familyId: string,
  updates: { name?: string; description?: string }
) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  const { error } = await supabase
    .from("families")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", familyId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${familyId}`);
  return { success: true };
}

// ── Xóa gia phả (cascade xóa hết persons, relationships, ...) ────────────────
export async function deleteFamily(familyId: string) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  const { error } = await supabase
    .from("families")
    .delete()
    .eq("id", familyId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

// ── Lấy danh sách người được share trong 1 family ───────────────────────────
export async function getFamilyShares(familyId: string) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  // Chỉ owner mới xem được danh sách share
  const { data: family } = await supabase
    .from("families")
    .select("owner_id")
    .eq("id", familyId)
    .single();

  if (!family || family.owner_id !== user.id)
    return { error: "Bạn không có quyền xem danh sách chia sẻ." };

  const { data, error } = await supabase
    .from("family_shares_with_email") // view được tạo trong SQL migration
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

// ── Chia sẻ gia phả theo email ───────────────────────────────────────────────
export async function shareFamily(
  familyId: string,
  targetEmail: string,
  role: ShareRole
) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const email = targetEmail.trim().toLowerCase();
  if (!email) return { error: "Email không hợp lệ." };

  const supabase = await getSupabase();

  // Kiểm tra ownership
  const { data: family } = await supabase
    .from("families")
    .select("owner_id, name")
    .eq("id", familyId)
    .single();

  if (!family || family.owner_id !== user.id)
    return { error: "Bạn không có quyền chia sẻ gia phả này." };

  // Tìm user theo email qua SQL function
  const { data: targetUserId, error: lookupError } = await supabase
    .rpc("get_user_id_by_email", { target_email: email });

  if (lookupError) return { error: "Lỗi tra cứu người dùng: " + lookupError.message };
  if (!targetUserId) return { error: "Không tìm thấy tài khoản với email này trong hệ thống." };
  if (targetUserId === user.id) return { error: "Không thể chia sẻ gia phả với chính mình." };

  // Upsert share (nếu đã share rồi thì cập nhật quyền)
  const { error: shareError } = await supabase
    .from("family_shares")
    .upsert(
      { family_id: familyId, shared_by: user.id, shared_with: targetUserId, role },
      { onConflict: "family_id,shared_with" }
    );

  if (shareError) return { error: shareError.message };
  revalidatePath(`/dashboard/${familyId}/share`);
  return { success: true };
}

// ── Cập nhật quyền share ─────────────────────────────────────────────────────
export async function updateShareRole(shareId: string, newRole: ShareRole) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  const { error } = await supabase
    .from("family_shares")
    .update({ role: newRole })
    .eq("id", shareId)
    .eq("shared_by", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

// ── Thu hồi quyền chia sẻ ────────────────────────────────────────────────────
export async function revokeShare(shareId: string, familyId: string) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  const { error } = await supabase
    .from("family_shares")
    .delete()
    .eq("id", shareId)
    .eq("shared_by", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/${familyId}/share`);
  return { success: true };
}

// ── Rời khỏi gia phả được share (tự xóa bản thân) ───────────────────────────
export async function leaveFamily(familyId: string) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  const { error } = await supabase
    .from("family_shares")
    .delete()
    .eq("family_id", familyId)
    .eq("shared_with", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}
