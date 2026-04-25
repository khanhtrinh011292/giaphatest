import { Family, Person, Profile, Relationship } from "@/types";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { cache } from "react";

// Hàm này được cache lại để đảm bảo chỉ tạo 1 Supabase Client duy nhất cho mỗi request
export const getSupabase = cache(async () => {
  const cookieStore = await cookies();
  return createClient(cookieStore);
});

export const getUser = cache(async () => {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getProfile = cache(async (userId?: string) => {
  let id = userId;
  if (!id) {
    const user = await getUser();
    if (!user) return null;
    id = user.id;
  }
  const supabase = await getSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();
  return profile as Profile | null;
});

export const getIsAdmin = cache(async () => {
  const profile = await getProfile();
  return profile?.role === "admin" || profile?.role === "superadmin";
});

// ── Family queries ───────────────────────────────────────────────────────────────────

/**
 * Lấy thông tin 1 family. RLS sẽ tự động kiểm tra quyền truy cập.
 */
export const getFamily = cache(async (familyId: string) => {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("families")
    .select("*")
    .eq("id", familyId)
    .single();
  if (error) return null;
  return data as Family;
});

/**
 * Lấy danh sách thành viên thuộc 1 family. Sắp xếp theo generation rồi birth_order.
 */
export const getPersons = cache(async (familyId: string) => {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("persons")
    .select("*")
    .eq("family_id", familyId)
    .order("generation", { ascending: true, nullsFirst: false })
    .order("birth_order", { ascending: true, nullsFirst: false })
    .order("birth_year", { ascending: true, nullsFirst: false })
    .order("full_name", { ascending: true });
  if (error) return [];
  return (data ?? []) as Person[];
});

/**
 * Lấy danh sách quan hệ thuộc 1 family.
 */
export const getRelationships = cache(async (familyId: string) => {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("relationships")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data ?? []) as Relationship[];
});

/**
 * Lấy tất cả sự kiện của 1 family.
 */
export const getEvents = cache(async (familyId: string) => {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("custom_events")
    .select("*")
    .eq("family_id", familyId)
    .order("event_date", { ascending: true });
  if (error) return [];
  return data ?? [];
});

/**
 * Lấy chi tiết private của 1 thành viên (phone, occupation, address).
 * Chỉ Owner và Editor mới xem được (RLS kiểm soát qua can_view_person_private).
 */
export const getPersonPrivateDetails = cache(
  async (personId: string) => {
    const supabase = await getSupabase();
    const { data } = await supabase
      .from("person_details_private")
      .select("*")
      .eq("person_id", personId)
      .maybeSingle();
    return data ?? null;
  }
);
