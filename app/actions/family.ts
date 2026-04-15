"use server";

import { Family, FamilyShare, ShareRole } from "@/types";
import { getSupabase, getUser } from "@/utils/supabase/queries";
import { revalidatePath } from "next/cache";

// ─── Lấy tất cả gia phả của user (sở hữu + được share) ───────────────────────
export async function getFamilies(): Promise<
  | { owned: Family[]; shared: (FamilyShare & { family: Family })[] }
  | { error: string }
> {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  const { data: owned, error: ownedErr } = await supabase
    .from("families")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  if (ownedErr) return { error: ownedErr.message };

  const { data: shared, error: sharedErr } = await supabase
    .from("family_shares")
    .select("*, family:families(*)")
    .eq("shared_with", user.id)
    .order("created_at", { ascending: true });

  if (sharedErr) return { error: sharedErr.message };

  return {
    owned: (owned ?? []) as Family[],
    shared: (shared ?? []) as (FamilyShare & { family: Family })[],
  };
}

// ─── Lấy thông tin 1 family + quyền của user hiện tại ────────────────────────
export async function getFamilyWithRole(familyId: string) {
  const user = await getUser();
  if (!user) return null;
  const supabase = await getSupabase();

  const { data: family } = await supabase
    .from("families")
    .select("*")
    .eq("id", familyId)
    .single();

  if (!family) return null;

  const isOwner = family.owner_id === user.id;
  let shareRole: ShareRole | null = null;

  if (!isOwner) {
    const { data: share } = await supabase
      .from("family_shares")
      .select("role")
      .eq("family_id", familyId)
      .eq("shared_with", user.id)
      .single();
    if (!share) return null; // Không có quyền
    shareRole = share.role as ShareRole;
  }

  return {
    family: family as Family,
    myRole: (isOwner ? "owner" : shareRole) as ShareRole | "owner",
    canWrite: isOwner || ["editor", "admin"].includes(shareRole ?? ""),
    canAdmin: isOwner || shareRole === "admin",
    isOwner,
  };
}

// ─── Tạo gia phả mới ──────────────────────────────────────────────────────────
export async function createFamily(
  name: string,
  description?: string
): Promise<{ data: Family } | { error: string }> {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  if (!name.trim()) return { error: "Tên gia phả không được để trống." };

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

// ─── Cập nhật thông tin gia phả ───────────────────────────────────────────────
export async function updateFamily(
  familyId: string,
  updates: { name?: string; description?: string }
): Promise<{ success: true } | { error: string }> {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  const { error } = await supabase
    .from("families")
    .update(updates)
    .eq("id", familyId)
    .eq("owner_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/${familyId}`);
  return { success: true };
}

// ─── Xóa gia phả (chỉ owner) ─────────────────────────────────────────────────
export async function deleteFamily(
  familyId: string
): Promise<{ success: true } | { error: string }> {
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

// ─── Chia sẻ gia phả theo email ──────────────────────────────────────────────
export async function shareFamily(
  familyId: string,
  targetEmail: string,
  role: ShareRole
): Promise<{ success: true } | { error: string }> {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  // Kiểm tra quyền sở hữu
  const { data: family } = await supabase
    .from("families")
    .select("owner_id")
    .eq("id", familyId)
    .single();

  if (!family) return { error: "Không tìm thấy gia phả." };
  if (family.owner_id !== user.id)
    return { error: "Bạn không có quyền chia sẻ gia phả này." };

  // Tìm user theo email
  const { data: targetUserId, error: lookupErr } = await supabase.rpc(
    "get_user_id_by_email",
    { target_email: targetEmail.trim().toLowerCase() }
  );

  if (lookupErr || !targetUserId)
    return { error: "Không tìm thấy người dùng với email này trong hệ thống." };

  if (targetUserId === user.id)
    return { error: "Không thể chia sẻ gia phả với chính mình." };

  // Upsert share (nếu đã share rồi thì cập nhật role)
  const { error: shareErr } = await supabase.from("family_shares").upsert(
    {
      family_id: familyId,
      shared_by: user.id,
      shared_with: targetUserId,
      role,
    },
    { onConflict: "family_id,shared_with" }
  );

  if (shareErr) return { error: shareErr.message };
  revalidatePath(`/dashboard/${familyId}/share`);
  return { success: true };
}

// ─── Cập nhật quyền của người được share ─────────────────────────────────────
export async function updateShareRole(
  shareId: string,
  newRole: ShareRole
): Promise<{ success: true } | { error: string }> {
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

// ─── Thu hồi quyền chia sẻ ───────────────────────────────────────────────────
export async function revokeShare(
  shareId: string
): Promise<{ success: true } | { error: string }> {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  const { error } = await supabase
    .from("family_shares")
    .delete()
    .eq("id", shareId)
    .eq("shared_by", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Lấy danh sách người đang được share 1 family ────────────────────────────
export async function getFamilyShares(
  familyId: string
): Promise<FamilyShare[] | { error: string }> {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  // Chỉ owner mới xem được danh sách này
  const { data: family } = await supabase
    .from("families")
    .select("owner_id")
    .eq("id", familyId)
    .single();

  if (!family || family.owner_id !== user.id)
    return { error: "Bạn không có quyền xem danh sách chia sẻ." };

  const { data, error } = await supabase
    .from("family_shares")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });

  if (error) return { error: error.message };
  return (data ?? []) as FamilyShare[];
}
