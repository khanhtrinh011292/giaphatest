"use server";

import { getSupabase, getUser } from "@/utils/supabase/queries";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ─── 1. Quick Add Spouse ───────────────────────────────────────────────────
export async function quickAddSpouse(
  familyId: string,
  personId: string,
  spouseName: string,
  spouseGender: "male" | "female" | "other",
  spouseGeneration: number | null,
  birthYear: number | null,
  note: string | null
) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  const payload: Record<string, unknown> = {
    family_id: familyId,
    full_name: spouseName.trim(),
    gender: spouseGender,
    is_in_law: true,
  };
  if (spouseGeneration != null) payload.generation = spouseGeneration;
  if (birthYear != null) payload.birth_year = birthYear;

  const { data: newPerson, error: insertError } = await supabase
    .from("persons")
    .insert(payload)
    .select("id")
    .single();

  if (insertError || !newPerson) return { error: insertError?.message ?? "Lỗi tạo người." };

  const { error: relError } = await supabase.from("relationships").insert({
    family_id: familyId,
    person_a: personId,
    person_b: newPerson.id,
    type: "marriage",
    note: note || null,
  });

  if (relError) {
    await supabase.from("persons").delete().eq("id", newPerson.id);
    return { error: relError.message };
  }

  revalidatePath(`/dashboard/${familyId}`);
  return { success: true };
}

// ─── 2. Bulk Add Children ──────────────────────────────────────────────────
export async function bulkAddChildren(
  familyId: string,
  personId: string,
  spousePersonId: string | null,
  children: Array<{
    name: string;
    gender: "male" | "female" | "other";
    birthYear: number | null;
    birthOrder: number | null;
    generation: number | null;
  }>
) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  let successCount = 0;
  for (const child of children) {
    if (!child.name.trim()) continue;

    const payload: Record<string, unknown> = {
      family_id: familyId,
      full_name: child.name.trim(),
      gender: child.gender,
      is_in_law: false,
    };
    if (child.generation != null) payload.generation = child.generation;
    if (child.birthYear != null) payload.birth_year = child.birthYear;
    if (child.birthOrder != null) payload.birth_order = child.birthOrder;

    const { data: newChild, error: insertError } = await supabase
      .from("persons")
      .insert(payload)
      .select("id")
      .single();

    if (insertError || !newChild) continue;

    const { error: relA } = await supabase.from("relationships").insert({
      family_id: familyId,
      person_a: personId,
      person_b: newChild.id,
      type: "biological_child",
    });

    if (relA) {
      await supabase.from("persons").delete().eq("id", newChild.id);
      continue;
    }

    if (spousePersonId) {
      await supabase.from("relationships").insert({
        family_id: familyId,
        person_a: spousePersonId,
        person_b: newChild.id,
        type: "biological_child",
      });
    }

    successCount++;
  }

  revalidatePath(`/dashboard/${familyId}`);
  return { success: true, count: successCount };
}

// ─── 3. Add Relationship (Single) ─────────────────────────────────────────
export async function addRelationship(
  familyId: string,
  personAId: string,
  personBId: string,
  type: "biological_child" | "adopted_child" | "marriage",
  note: string | null,
  targetPersonId: string,
  direction: "parent" | "child" | "spouse",
  targetGeneration: number | null,
  personGeneration: number | null
) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  const { error: insertError } = await supabase.from("relationships").insert({
    family_id: familyId,
    person_a: personAId,
    person_b: personBId,
    type,
    note: note || null,
  });

  if (insertError) return { error: insertError.message };

  if (targetGeneration == null) {
    const updates: Record<string, unknown> = {};
    if (personGeneration != null) {
      if (direction === "child")       updates.generation = personGeneration + 1;
      else if (direction === "parent") updates.generation = personGeneration - 1;
      else                             updates.generation = personGeneration;
    }
    updates.is_in_law = direction === "spouse";

    if (Object.keys(updates).length > 0) {
      await supabase.from("persons").update(updates).eq("id", targetPersonId);
    }
  }

  revalidatePath(`/dashboard/${familyId}`);
  return { success: true };
}

// ─── 4. Delete Member Profile ─────────────────────────────────────────────
export async function deleteMemberProfile(memberId: string, familyId: string) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  const { error: relError } = await supabase
    .from("relationships")
    .delete()
    .eq("family_id", familyId)
    .or(`person_a.eq.${memberId},person_b.eq.${memberId}`);

  if (relError) return { error: relError.message };

  const { error: personError } = await supabase
    .from("persons")
    .delete()
    .eq("id", memberId)
    .eq("family_id", familyId);

  if (personError) return { error: personError.message };

  revalidatePath(`/dashboard/${familyId}`);
  redirect(`/dashboard/${familyId}`);
}

// ─── 5. Confirm Suggested Relationship ──────────────────────────────────
export async function confirmSuggestedRelationship(
  familyId: string,
  parentId: string,
  childId: string
) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  const { error } = await supabase.from("relationships").insert({
    family_id: familyId,
    person_a: parentId,
    person_b: childId,
    type: "biological_child",
  });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/${familyId}`);
  return { success: true };
}
