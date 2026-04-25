import { Family, Person, Profile, Relationship } from "@/types";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

/**
 * Trả về Supabase client cho server-side.
 * KHÔNG BAO GIỜ trả về null — nếu cookies() throw (xảy ra khi SSR navigate),
 * sẽ redirect về /login ngay lập tức để tránh crash .from() ở mọi page.
 */
export const getSupabase = cache(async () => {
  try {
    const cookieStore = await cookies();
    return createClient(cookieStore);
  } catch {
    redirect("/login");
  }
});

export const getUser = cache(async () => {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
});

export const getProfile = cache(async (userId?: string) => {
  try {
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
  } catch {
    return null;
  }
});

export const getIsAdmin = cache(async () => {
  try {
    const profile = await getProfile();
    return profile?.role === "admin" || profile?.role === "superadmin";
  } catch {
    return false;
  }
});

// ── Family queries ────────────────────────────────────────────────────────────

export const getFamily = cache(async (familyId: string) => {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("families")
      .select("*")
      .eq("id", familyId)
      .single();
    if (error) return null;
    return data as Family;
  } catch {
    return null;
  }
});

export const getPersons = cache(async (familyId: string) => {
  try {
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
  } catch {
    return [];
  }
});

export const getRelationships = cache(async (familyId: string) => {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("relationships")
      .select("*")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true });
    if (error) return [];
    return (data ?? []) as Relationship[];
  } catch {
    return [];
  }
});

export const getEvents = cache(async (familyId: string) => {
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from("custom_events")
      .select("*")
      .eq("family_id", familyId)
      .order("event_date", { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
});

export const getPersonPrivateDetails = cache(async (personId: string) => {
  try {
    const supabase = await getSupabase();
    const { data } = await supabase
      .from("person_details_private")
      .select("*")
      .eq("person_id", personId)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
});
