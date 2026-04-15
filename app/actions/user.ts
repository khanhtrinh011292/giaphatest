"use server";

import { getSupabase } from "@/utils/supabase/queries";
import { revalidatePath } from "next/cache";

const SUPERADMIN_EMAIL = "khanhtrinh011292@gmail.com";

export async function changeUserRole(userId: string, newRole: "admin" | "member") {
  const supabase = await getSupabase();

  // Guard: không cho đổi role superadmin
  const { data: target } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  if (target?.email === SUPERADMIN_EMAIL) {
    return { error: "Không thể thay đổi vai trò của Superadmin." };
  }

  const { error } = await supabase.rpc("set_user_role", {
    target_user_id: userId,
    new_role: newRole,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function deleteUser(userId: string) {
  const supabase = await getSupabase();

  // Guard: không cho xóa superadmin
  const { data: target } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  if (target?.email === SUPERADMIN_EMAIL) {
    return { error: "Không thể xóa tài khoản Superadmin." };
  }

  const { error } = await supabase.rpc("delete_user", {
    target_user_id: userId,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function adminCreateUser(formData: FormData) {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const role = "admin"; // Chỉ tạo admin từ trang này
  const isActive = true; // Admin luôn active ngay

  if (!email || !password) {
    return { error: "Email và mật khẩu là bắt buộc." };
  }

  const supabase = await getSupabase();
  const { error } = await supabase.rpc("admin_create_user", {
    new_email: email,
    new_password: password,
    new_role: role,
    new_active: isActive,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/users");
  return { success: true };
}

export async function toggleUserStatus(userId: string, newStatus: boolean) {
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("set_user_active_status", {
    target_user_id: userId,
    new_status: newStatus,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/users");
  return { success: true };
}
