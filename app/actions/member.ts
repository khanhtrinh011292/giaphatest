"use server";

import { getSupabase, getUser } from "@/utils/supabase/queries";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ✅ Thêm helper validate ở đầu file
const VALID_RELATIONSHIP_TYPES = ["marriage", "biological_child", "adopted_child"] as const;
type RelationshipType = (typeof VALID_RELATIONSHIP_TYPES)[number];

function assertValidRelType(type: string): RelationshipType {
  if (!VALID_RELATIONSHIP_TYPES.includes(type as RelationshipType)) {
    throw new Error(`Loại quan hệ không hợp lệ: "${type}"`);
  }
  return type as RelationshipType;
}

// ─── 1. Quick Add Spouse ───────────────────────────────────────────────────
export async function quickAddSpouse(
  familyId: string,
  personId: string,
  spouseName: string,
  spouseGender: "male" | "female" | "other",
  spouseGeneration: number | null,
  birthYear: number | null,
  note: string | null,
  type: "marriage" = "marriage"
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
    person_a: personId,
    person_b: newPerson.id,
    type: assertValidRelType(type),
    note: note || null,
    family_id: familyId,
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
  }>,
  relationshipType: RelationshipType = "biological_child"
) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  let successCount = 0;
  const errors: string[] = [];

  for (const child of children) {
    if (!child.name.trim()) continue;

    try {
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

      if (insertError || !newChild) {
        errors.push(`Lỗi thêm ${child.name}: ${insertError?.message}`);
        continue;
      }

      const { error: relA } = await supabase.from("relationships").insert({
        person_a: personId,
        person_b: newChild.id,
        type: assertValidRelType(relationshipType),
        family_id: familyId,
      });

      if (relA) {
        await supabase.from("persons").delete().eq("id", newChild.id);
        errors.push(`Lỗi tạo quan hệ cho ${child.name}: ${relA.message}`);
        continue;
      }

      if (spousePersonId) {
        const { error: relSpouse } = await supabase.from("relationships").insert({
          family_id: familyId,
          person_a: spousePersonId,
          person_b: newChild.id,
          type: assertValidRelType(relationshipType),
        });
        if (relSpouse) {
          errors.push(`Lỗi tạo quan hệ (cha/mẹ thứ 2) cho ${child.name}: ${relSpouse.message}`);
        }
      }

      successCount++;
    } catch (e: any) {
      errors.push(`Lỗi không xác định với ${child.name}: ${e.message}`);
    }
  }

  revalidatePath(`/dashboard/${familyId}`);
  if (errors.length > 0 && successCount === 0) {
    return { error: errors.join(". ") };
  }
  return { success: true, count: successCount, partialErrors: errors.length > 0 ? errors : undefined };
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

  const sanitizedType = assertValidRelType(type);

  const { error: insertError } = await supabase.from("relationships").insert({
    person_a: personAId,
    person_b: personBId,
    type: sanitizedType,
    note: note || null,
    family_id: familyId,
  });

  if (insertError) return { error: insertError.message };

  if (targetGeneration === null) {
    const updates: Record<string, unknown> = {};
    if (personGeneration !== null) {
      if (direction === "child") {
        updates.generation = Number(personGeneration) + 1;
      } else if (direction === "parent") {
        updates.generation = Math.max(1, Number(personGeneration) - 1);
      } else if (direction === "spouse") {
        updates.generation = personGeneration;
      }
    }
    if (type === "marriage") {
      updates.is_in_law = true;
    }
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

// ─── 6. Delete Relationship ─────────────────────────────────────────────────
export async function deleteRelationship(relId: string, familyId: string) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  const { error } = await supabase
    .from("relationships")
    .delete()
    .eq("id", relId)
    .eq("family_id", familyId);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/${familyId}`);
  return { success: true };
}

// ─── 7. Save Member (Create/Update) ─────────────────────────────────────────
export async function saveMember(
  familyId: string,
  personData: any,
  privateData: {
    phone_number?: string | null;
    occupation?: string | null;
    current_residence?: string | null;
  } | null,
  personId?: string
) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  // 🛡️ Kiểm tra quyền: Owner, Admin hoặc Editor
  const { data: family } = await supabase.from("families").select("owner_id").eq("id", familyId).single();
  const isOwner = family?.owner_id === user.id;
  let hasPermission = isOwner;

  if (!isOwner) {
    const { data: share } = await supabase
      .from("family_shares")
      .select("role")
      .eq("family_id", familyId)
      .eq("shared_with", user.id)
      .single();
    const role = share?.role;
    hasPermission = role === "admin" || role === "editor";
  }

  if (!hasPermission) return { error: "Bạn không có quyền chỉnh sửa gia phả này." };

  let currentId = personId;

  if (!personId) {
    // Create
    const { data: newPerson, error: insertError } = await supabase
      .from("persons")
      .insert({ ...personData, family_id: familyId })
      .select("id")
      .single();

    if (insertError || !newPerson) return { error: insertError?.message ?? "Lỗi tạo người." };
    currentId = newPerson.id;
  } else {
    // Update
    const { error: updateError } = await supabase
      .from("persons")
      .update(personData)
      .eq("id", personId)
      .eq("family_id", familyId);

    if (updateError) return { error: updateError.message };
  }

  // ✅ FIX: Dùng delete + insert để đảm bảo luôn ghi đúng, không phụ thuộc unique constraint
  if (currentId && privateData) {
    const hasData =
      privateData.phone_number || privateData.occupation || privateData.current_residence;

    // Xóa row cũ trước (nếu có)
    await supabase.from("person_details_private").delete().eq("person_id", currentId);

    // Chỉ insert mới nếu có dữ liệu
    if (hasData) {
      const { error: privateError } = await supabase
        .from("person_details_private")
        .insert({ person_id: currentId, ...privateData });
      if (privateError) {
        console.warn("Private details save failed:", privateError.message);
      }
    }
  }

  revalidatePath(`/dashboard/${familyId}`);
  return { success: true, personId: currentId };
}

// ─── 8. Update Member Avatar ───────────────────────────────────────────────
export async function updateMemberAvatar(personId: string, familyId: string, avatarUrl: string) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  const { error } = await supabase
    .from("persons")
    .update({ avatar_url: avatarUrl })
    .eq("id", personId)
    .eq("family_id", familyId);

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/${familyId}`);
  return { success: true };
}

// ─── 9. Import Family Members ──────────────────────────────────────────────
export async function importFamilyMembers(
  familyId: string,
  members: any[]
) {
  const user = await getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const supabase = await getSupabase();

  const rowIdToPersonId: Record<string, string> = {};
  const details: { name: string; status: "ok" | "error"; message?: string }[] = [];
  let successCount = 0;
  let failedCount = 0;

  // Phase 1: Insert Persons
  for (const member of members) {
    const { error, data } = await supabase
      .from("persons")
      .insert({
        family_id: familyId,
        full_name: member.ho_ten,
        gender: member.gioi_tinh,
        birth_year: member.nam_sinh,
        generation: member.the_he,
        birth_order: member.thu_tu_sinh,
        note: member.ghi_chu,
        is_in_law: false,
        is_deceased: false,
      })
      .select("id")
      .single();

    if (error || !data) {
      failedCount++;
      details.push({ name: member.ho_ten, status: "error", message: error?.message });
    } else {
      successCount++;
      rowIdToPersonId[member._rowId] = data.id;
      details.push({ name: member.ho_ten, status: "ok" });
    }
  }

  // Phase 2: Insert Relationships
  for (const member of members) {
    const childId = rowIdToPersonId[member._rowId];
    if (!childId) continue;

    const parents = [];
    if (member.stt_cha) parents.push(member.stt_cha);
    if (member.stt_me) parents.push(member.stt_me);

    for (const parentStt of parents) {
      const parentId = rowIdToPersonId[parentStt];
      if (!parentId) continue;

      await supabase.from("relationships").insert({
        family_id: familyId,
        person_a: parentId,
        person_b: childId,
        type: "biological_child",
      });
    }
  }

  revalidatePath(`/dashboard/${familyId}`);
  return { success: true, count: successCount, failed: failedCount, details };
}
