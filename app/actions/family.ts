"use server";

import { Family, FamilyShare, ShareRole } from "@/types";
import { getSupabase, getUser } from "@/utils/supabase/queries";
import { revalidatePath } from "next/cache";

// ── Lấy danh sách gia phả (sở hữu + được share) ────────────────────────────────────────────────────────
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

  if (ownedRes.error) return { error: ownedRes.error.message };
  if (sharedRes.error) return { error: sharedRes.error.message };

  return {
    owned: (ownedRes.data ?? []) as Family[],
    shared: (sharedRes.data ?? []) as (FamilyShare & { family: Family })[],
  };
}

// ── Tạo gia phả mới ──────────────────────────────────────────────────────────────────────────────────
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

// ── Cập nhật tên/mô tả gia phả ─────────────────────────────────────────────────────────────────────────────
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
  revalidatePath(`/dashboard/${familyId}`, "layout");
  return { success: true };
}

// ── Xóa gia phả (cascade xóa hết persons, relationships, ...) ───────────────────────────────────────
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
  revalidatePath(`/dashboard/${familyId}`, "layout");
  return { success: true };
}

// ── Lấy danh sách người được share trong 1 family ────────────────────────────────────────────────
// Owner và admin mới được xem danh sách; editor trả về mảng rỗng
export async function getFamilyShares(familyId: string) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  const { data: family } = await supabase
    .from("families")
    .select("owner_id")
    .eq("id", familyId)
    .single();

  if (!family) return { error: "Không tìm thấy gia phả." };

  const isOwner = family.owner_id === user.id;

  if (!isOwner) return { data: [] };

  const { data, error } = await supabase
    .from("family_shares")
    .select("*, profile:profiles!family_shares_shared_with_fkey(email)")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });

  if (error) return { error: error.message };
  
  // Chuyển đổi data sang format ShareRow
  const mappedData = (data || []).map((s: any) => ({
    id: s.id,
    shared_with: s.shared_with,
    shared_with_email: s.profile?.email || "N/A",
    role: s.role,
    created_at: s.created_at,
  }));

  return { data: mappedData };
}

// ── Chia sẻ gia phả theo email ─────────────────────────────────────────────────────────────────────────────
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

  const { data: family } = await supabase
    .from("families")
    .select("owner_id, name")
    .eq("id", familyId)
    .single();

  if (!family || family.owner_id !== user.id)
    return { error: "Bạn không có quyền chia sẻ gia phả này." };

  const { data: targetUserId, error: lookupError } = await supabase
    .rpc("get_user_id_by_email", { target_email: email });

  if (lookupError) return { error: "Lỗi tra cứu người dùng: " + lookupError.message };
  if (!targetUserId) return { error: "Không tìm thấy tài khoản với email này trong hệ thống." };
  if (targetUserId === user.id) return { error: "Không thể chia sẻ gia phả với chính mình." };

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

// ── Cập nhật quyền share ─────────────────────────────────────────────────────────────────────────────────────
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

// ── Thu hồi quyền chia sẻ ──────────────────────────────────────────────────────────────────────────────────────
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

// ── Rời khỏi gia phả được share (tự xóa bản thân) ────────────────────────────────────────────────
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

// ── Tạo share link mới ──────────────────────────────────────────────────────────────────────────────────────
export async function createShareLink(
  familyId: string,
  role: "viewer" | "editor" = "viewer"
) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  const { data: family } = await supabase
    .from("families")
    .select("owner_id")
    .eq("id", familyId)
    .single();
  if (!family) return { error: "Không tìm thấy gia phả." };

  const isOwner = family.owner_id === user.id;
  if (!isOwner) return { error: "Bạn không có quyền tạo link chia sẻ." };

  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  const token = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data, error } = await supabase
    .from("family_share_links")
    .insert({
      family_id: familyId,
      token,
      created_by: user.id,
      role,
      expires_at: expiresAt.toISOString(),
      is_active: true,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/${familyId}/share`);
  return { data };
}

// ── Lấy danh sách share links của một gia phả ────────────────────────────────────────────────────────
export async function getShareLinks(familyId: string) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("family_share_links")
    .select("*")
    .eq("family_id", familyId)
    .eq("is_active", true)
    // FIX: lọc bỏ link đã hết hạn (xử lý đúng cả trường hợp expires_at NULL = không hết hạn)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { data: data ?? [] };
}

// ── Thu hồi share link ───────────────────────────────────────────────────────────────────────────────────────
export async function revokeShareLink(linkId: string) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  const { error } = await supabase
    .from("family_share_links")
    .update({ is_active: false })
    .eq("id", linkId)
    .eq("created_by", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

// ── Tham gia gia phả bằng token ───────────────────────────────────────────────────────────────────────────────────
export async function joinByShareLink(token: string) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  const now = new Date().toISOString();
  // FIX: dùng .or() để xử lý đúng expires_at NULL (link không hết hạn) và expires_at > now
  const { data: link, error: linkError } = await supabase
    .from("family_share_links")
    .select("*")
    .eq("token", token)
    .eq("is_active", true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .single();

  if (linkError || !link) return { error: "Link không hợp lệ hoặc đã hết hạn." };

  const { data: existing } = await supabase
    .from("family_shares")
    .select("id")
    .eq("family_id", link.family_id)
    .eq("shared_with", user.id)
    .maybeSingle();

  if (existing) return { error: "Bạn đã là thành viên của gia phả này." };

  const { data: ownFamily } = await supabase
    .from("families")
    .select("id")
    .eq("id", link.family_id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (ownFamily) return { error: "Đây là gia phả của bạn." };

  const { error: shareError } = await supabase
    .from("family_shares")
    .insert({
      family_id: link.family_id,
      shared_with: user.id,
      role: link.role,
      shared_by: link.created_by,
    });

  if (shareError) return { error: shareError.message };
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${link.family_id}`, "layout");
  return { success: true, familyId: link.family_id };
}
