"use server";
 
import { Relationship } from "@/types";
import { getSupabase, getUser } from "@/utils/supabase/queries";
import { revalidatePath } from "next/cache";
 
// ═══════════════════════════════════════════════════════════════════════════
// N1 FIX: Valid relationship types (must match Postgres enum relationship_type_enum)
// ═══════════════════════════════════════════════════════════════════════════
const VALID_RELATIONSHIP_TYPES = ["marriage", "biological_child", "adopted_child"] as const;
type ValidRelType = (typeof VALID_RELATIONSHIP_TYPES)[number];
 
function isValidRelType(type: unknown): type is ValidRelType {
  return typeof type === "string" && VALID_RELATIONSHIP_TYPES.includes(type as ValidRelType);
}
 
// ─── Types ────────────────────────────────────────────────────────────────────
 
interface PersonExport {
  id: string;
  full_name: string;
  gender: "male" | "female" | "other";
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  death_year: number | null;
  death_month: number | null;
  death_day: number | null;
  death_lunar_year: number | null;
  death_lunar_month: number | null;
  death_lunar_day: number | null;
  is_deceased: boolean;
  is_in_law: boolean;
  birth_order: number | null;
  generation: number | null;
  other_names: string | null;
  avatar_url: string | null;
  note: string | null;
  created_at?: string;
  updated_at?: string;
}
 
interface RelationshipExport {
  id?: string;
  type: string;
  person_a: string;
  person_b: string;
  note?: string | null;
  created_at?: string;
  updated_at?: string;
}
 
interface PersonDetailsPrivateExport {
  person_id: string;
  phone_number: string | null;
  occupation: string | null;
  current_residence: string | null;
}
 
interface CustomEventExport {
  id: string;
  name: string;
  content: string | null;
  event_date: string;
  location: string | null;
  created_by: string | null;
}
 
interface BackupPayload {
  version: number;
  timestamp: string;
  persons: PersonExport[];
  relationships: RelationshipExport[];
  person_details_private?: PersonDetailsPrivateExport[];
  custom_events?: CustomEventExport[];
}
 
// ─── Sanitized insert types ───────────────────────────────────────────────────
 
type PersonInsert = Omit<PersonExport, "created_at" | "updated_at"> & {
  family_id: string;
};
 
type RelationshipInsert = {
  family_id: string;
  type: ValidRelType;
  person_a: string;
  person_b: string;
  note: string | null;
};
 
type CustomEventInsert = Omit<CustomEventExport, "created_by"> & {
  family_id: string;
};
 
// ─── FamilyAccess return type (discriminated union) ──────────────────────────
 
type FamilyAccessError = { error: string };
type FamilyAccessOk = {
  supabase: Awaited<ReturnType<typeof import("@/utils/supabase/server").createClient>>;
  user: NonNullable<Awaited<ReturnType<typeof import("@/utils/supabase/queries").getUser>>>;
  family: { id: string; owner_id: string };
  canRead: true;
  canImport: boolean;
};
type FamilyAccessResult = FamilyAccessError | FamilyAccessOk;
 
// ─── Helpers ─────────────────────────────────────────────────────────────────
 
async function getFamilyAccess(familyId: string): Promise<FamilyAccessResult> {
  const user = await getUser();
  if (!user) return { error: "Vui lòng đăng nhập." };
 
  const supabase = await getSupabase();
 
  const { data: family, error: familyError } = await supabase
    .from("families")
    .select("id, owner_id")
    .eq("id", familyId)
    .single();
 
  if (familyError || !family)
    return { error: "Không tìm thấy gia phả." };
 
  if (family.owner_id === user.id)
    return { supabase, user, family, canRead: true, canImport: true };
 
  const { data: share } = await supabase
    .from("family_shares")
    .select("role")
    .eq("family_id", familyId)
    .eq("shared_with", user.id)
    .single();
 
  if (!share)
    return { error: "Bạn không có quyền truy cập gia phả này." };
 
  return {
    supabase,
    user,
    family,
    canRead: true,
    canImport: share.role === "admin",
  };
}
 
function sanitizePerson(familyId: string, p: PersonExport): PersonInsert {
  return {
    id: p.id,
    family_id: familyId,
    full_name: p.full_name,
    gender: p.gender,
    birth_year: p.birth_year ?? null,
    birth_month: p.birth_month ?? null,
    birth_day: p.birth_day ?? null,
    death_year: p.death_year ?? null,
    death_month: p.death_month ?? null,
    death_day: p.death_day ?? null,
    death_lunar_year: p.death_lunar_year ?? null,
    death_lunar_month: p.death_lunar_month ?? null,
    death_lunar_day: p.death_lunar_day ?? null,
    is_deceased: p.is_deceased ?? false,
    is_in_law: p.is_in_law ?? false,
    birth_order: p.birth_order ?? null,
    generation: p.generation ?? null,
    other_names: p.other_names ?? null,
    avatar_url: p.avatar_url ?? null,
    note: p.note ?? null,
  };
}
 
function sanitizeRelationship(
  familyId: string,
  r: RelationshipExport,
): RelationshipInsert {
  // N1 FIX: Validate type BEFORE insert (throw explicit error if invalid)
  if (!isValidRelType(r.type)) {
    throw new Error(
      `Loại quan hệ không hợp lệ: "${r.type}". Chỉ chấp nhận: ${VALID_RELATIONSHIP_TYPES.join(", ")}.`,
    );
  }
  return {
    family_id: familyId,
    type: r.type,
    person_a: r.person_a,
    person_b: r.person_b,
    note: r.note ?? null,
  };
}
 
function sanitizeCustomEvent(
  familyId: string,
  e: CustomEventExport,
): CustomEventInsert {
  return {
    id: e.id,
    family_id: familyId,
    name: e.name,
    content: e.content ?? null,
    event_date: e.event_date,
    location: e.location ?? null,
  };
}
 
// ─── Export ───────────────────────────────────────────────────────────────────
 
export async function exportData(
  familyId: string,
  exportRootId?: string,
): Promise<BackupPayload | { error: string }> {
  const access = await getFamilyAccess(familyId);
  if ("error" in access) return { error: access.error };
 
  const { supabase } = access;
 
  const { data: allPersons, error: personsError } = await supabase
    .from("persons")
    .select(
      "id, full_name, gender, birth_year, birth_month, birth_day, death_year, death_month, death_day, death_lunar_year, death_lunar_month, death_lunar_day, is_deceased, is_in_law, birth_order, generation, other_names, avatar_url, note, created_at, updated_at",
    )
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });
 
  if (personsError)
    return { error: "Lỗi tải dữ liệu persons: " + personsError.message };
 
  const { data: allRels, error: relationshipsError } = await supabase
    .from("relationships")
    .select("id, type, person_a, person_b, note, created_at, updated_at")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });
 
  if (relationshipsError)
    return {
      error: "Lỗi tải dữ liệu relationships: " + relationshipsError.message,
    };
 
  const personIds = (allPersons ?? []).map((p) => p.id);
  let allPrivateDetails: PersonDetailsPrivateExport[] = [];
  if (personIds.length > 0) {
    const { data, error: privateDetailsError } = await supabase
      .from("person_details_private")
      .select("person_id, phone_number, occupation, current_residence")
      .in("person_id", personIds);
 
    if (privateDetailsError)
      return {
        error:
          "Lỗi tải dữ liệu person_details_private: " +
          privateDetailsError.message,
      };
    allPrivateDetails = (data ?? []) as PersonDetailsPrivateExport[];
  }
 
  const { data: allCustomEvents, error: customEventsError } = await supabase
    .from("custom_events")
    .select("id, name, content, event_date, location, created_by")
    .eq("family_id", familyId)
    .order("event_date", { ascending: true });
 
  if (customEventsError)
    return {
      error: "Lỗi tải dữ liệu custom_events: " + customEventsError.message,
    };
 
  let exportPersons = (allPersons ?? []) as PersonExport[];
  let exportRels = (allRels ?? []) as RelationshipExport[];
  let exportPrivateDetails = allPrivateDetails;
  const exportCustomEvents = (allCustomEvents ?? []) as CustomEventExport[];
 
  if (exportRootId && exportPersons.some((p) => p.id === exportRootId)) {
    const includedPersonIds = new Set<string>([exportRootId]);
 
    const findDescendants = (parentId: string) => {
      exportRels
        .filter(
          (r) =>
            (r.type === "biological_child" || r.type === "adopted_child") &&
            r.person_a === parentId,
        )
        .forEach((r) => {
          if (!includedPersonIds.has(r.person_b)) {
            includedPersonIds.add(r.person_b);
            findDescendants(r.person_b);
          }
        });
    };
    findDescendants(exportRootId);
 
    const descendantsArray = Array.from(includedPersonIds);
    descendantsArray.forEach((personId) => {
      exportRels
        .filter(
          (r) =>
            r.type === "marriage" &&
            (r.person_a === personId || r.person_b === personId),
        )
        .forEach((r) => {
          const spouseId = r.person_a === personId ? r.person_b : r.person_a;
          includedPersonIds.add(spouseId);
        });
    });
 
    exportPersons = exportPersons.filter((p) => includedPersonIds.has(p.id));
    exportRels = exportRels.filter(
      (r) =>
        includedPersonIds.has(r.person_a) && includedPersonIds.has(r.person_b),
    );
    exportPrivateDetails = exportPrivateDetails.filter((d) =>
      includedPersonIds.has(d.person_id),
    );
  }
 
  return {
    version: 4,
    timestamp: new Date().toISOString(),
    persons: exportPersons,
    relationships: exportRels,
    person_details_private: exportPrivateDetails,
    custom_events: exportCustomEvents,
  };
}
 
// ─── Import ───────────────────────────────────────────────────────────────────
 
export async function importData(
  familyId: string,
  importPayload:
    | BackupPayload
    | {
        persons: PersonExport[];
        relationships: Relationship[];
        person_details_private?: PersonDetailsPrivateExport[];
        custom_events?: CustomEventExport[];
      },
) {
  const access = await getFamilyAccess(familyId);
  if ("error" in access) return { error: access.error };
 
  if (!access.canImport)
    return { error: "Bạn không có quyền import dữ liệu cho gia phả này." };
 
  const { supabase } = access;
 
  if (!importPayload?.persons || !importPayload?.relationships)
    return { error: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại file JSON." };
 
  if (importPayload.persons.length === 0)
    return { error: "File backup trống — không có thành viên nào để phục hồi." };
 
  // ═════════════════════════════════════════════════════════════════════════
  // N1 FIX: VALIDATE PAYLOAD BEFORE ANY DESTRUCTIVE OPERATION
  // Previously: DELETE → INSERT, so a bad chunk mid-way = data corruption
  //             with no rollback possible.
  // Now: Pre-validate everything, only then run DELETE → INSERT.
  // ═════════════════════════════════════════════════════════════════════════
 
  // Validate all relationship types
  const invalidRels = importPayload.relationships
    .map((r, idx) => ({ idx, type: r.type }))
    .filter(({ type }) => !isValidRelType(type));
 
  if (invalidRels.length > 0) {
    const preview = invalidRels
      .slice(0, 3)
      .map((r) => `dòng ${r.idx + 1}: "${r.type}"`)
      .join(", ");
    return {
      error: `File chứa ${invalidRels.length} quan hệ có loại không hợp lệ (${preview}${invalidRels.length > 3 ? "..." : ""}). Chỉ chấp nhận: ${VALID_RELATIONSHIP_TYPES.join(", ")}.`,
    };
  }
 
  // Validate all persons have required fields
  const invalidPersons = importPayload.persons
    .map((p, idx) => ({ idx, id: p.id, full_name: p.full_name, gender: p.gender }))
    .filter((p) => !p.id || !p.full_name || !["male", "female", "other"].includes(p.gender));
 
  if (invalidPersons.length > 0) {
    const preview = invalidPersons
      .slice(0, 3)
      .map((p) => `dòng ${p.idx + 1}: "${p.full_name ?? "(rỗng)"}"`)
      .join(", ");
    return {
      error: `File chứa ${invalidPersons.length} thành viên thiếu thông tin bắt buộc (${preview}${invalidPersons.length > 3 ? "..." : ""}).`,
    };
  }
 
  // Validate relationships reference existing persons in this payload
  const payloadPersonIds = new Set(importPayload.persons.map((p) => p.id));
  const danglingRels = importPayload.relationships.filter(
    (r) => !payloadPersonIds.has(r.person_a) || !payloadPersonIds.has(r.person_b),
  );
 
  if (danglingRels.length > 0) {
    return {
      error: `File chứa ${danglingRels.length} quan hệ tham chiếu đến thành viên không có trong file. Dữ liệu backup không nhất quán.`,
    };
  }
 
  // Pre-sanitize everything NOW — catches any errors before DELETE
  let sanitizedPersons: PersonInsert[];
  let sanitizedRels: RelationshipInsert[];
  let sanitizedEvents: CustomEventInsert[];
  try {
    sanitizedPersons = importPayload.persons.map((p) => sanitizePerson(familyId, p));
    sanitizedRels = importPayload.relationships
      .filter((r) => r.person_a !== r.person_b)
      .map((r) => sanitizeRelationship(familyId, r));
    sanitizedEvents = (importPayload.custom_events ?? []).map((e) =>
      sanitizeCustomEvent(familyId, e),
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `Lỗi khi xử lý dữ liệu: ${msg}` };
  }
 
  // ═════════════════════════════════════════════════════════════════════════
  // Validation passed — now safe to DELETE existing data and INSERT new
  // ═════════════════════════════════════════════════════════════════════════
 
  const { data: currentPersons, error: currentPersonsError } = await supabase
    .from("persons")
    .select("id")
    .eq("family_id", familyId);
 
  if (currentPersonsError)
    return {
      error:
        "Lỗi tải danh sách thành viên hiện tại: " + currentPersonsError.message,
    };
 
  const existingPersonIds = (currentPersons ?? []).map((p) => p.id);
  const CHUNK = 200;
 
  const { error: delEventsError } = await supabase
    .from("custom_events")
    .delete()
    .eq("family_id", familyId);
  if (delEventsError)
    return { error: "Lỗi khi xoá custom_events cũ: " + delEventsError.message };
 
  const { error: delRelError } = await supabase
    .from("relationships")
    .delete()
    .eq("family_id", familyId);
  if (delRelError)
    return { error: "Lỗi khi xoá relationships cũ: " + delRelError.message };
 
  if (existingPersonIds.length > 0) {
    const { error: delPrivateError } = await supabase
      .from("person_details_private")
      .delete()
      .in("person_id", existingPersonIds);
    if (delPrivateError)
      return {
        error:
          "Lỗi khi xoá person_details_private cũ: " + delPrivateError.message,
      };
  }
 
  const { error: delPersonsError } = await supabase
    .from("persons")
    .delete()
    .eq("family_id", familyId);
  if (delPersonsError)
    return { error: "Lỗi khi xoá persons cũ: " + delPersonsError.message };
 
  for (let i = 0; i < sanitizedPersons.length; i += CHUNK) {
    const { error } = await supabase
      .from("persons")
      .insert(sanitizedPersons.slice(i, i + CHUNK));
    if (error)
      return {
        error: `Lỗi khi import persons (chunk ${i / CHUNK + 1}): ${error.message}`,
      };
  }
 
  for (let i = 0; i < sanitizedRels.length; i += CHUNK) {
    const { error } = await supabase
      .from("relationships")
      .insert(sanitizedRels.slice(i, i + CHUNK));
    if (error)
      return {
        error: `Lỗi khi import relationships (chunk ${i / CHUNK + 1}): ${error.message}`,
      };
  }
 
  let privateDetailsCount = 0;
  const privateDetails = importPayload.person_details_private ?? [];
  if (privateDetails.length > 0) {
    for (let i = 0; i < privateDetails.length; i += CHUNK) {
      const { error } = await supabase
        .from("person_details_private")
        .insert(privateDetails.slice(i, i + CHUNK));
      if (error)
        return {
          error: `Lỗi khi import person_details_private (chunk ${i / CHUNK + 1}): ${error.message}`,
        };
    }
    privateDetailsCount = privateDetails.length;
  }
 
  let customEventsCount = 0;
  if (sanitizedEvents.length > 0) {
    for (let i = 0; i < sanitizedEvents.length; i += CHUNK) {
      const { error } = await supabase
        .from("custom_events")
        .insert(sanitizedEvents.slice(i, i + CHUNK));
      if (error)
        return {
          error: `Lỗi khi import custom_events (chunk ${i / CHUNK + 1}): ${error.message}`,
        };
    }
    customEventsCount = sanitizedEvents.length;
  }
 
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${familyId}`);
  revalidatePath(`/dashboard/${familyId}/members`);
  revalidatePath(`/dashboard/${familyId}/events`);
  revalidatePath(`/dashboard/${familyId}/data`);
  revalidatePath(`/dashboard/${familyId}/stats`);
 
  return {
    success: true,
    imported: {
      persons: sanitizedPersons.length,
      relationships: sanitizedRels.length,
      person_details_private: privateDetailsCount,
      custom_events: customEventsCount,
    },
  };
}
