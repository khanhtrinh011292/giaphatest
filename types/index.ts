export type Gender = "male" | "female" | "other";
export type RelationshipType =
  | "marriage"
  | "biological_child"
  | "adopted_child";
export type UserRole = "admin" | "editor" | "member";
export type ShareRole = "viewer" | "editor" | "admin";

// ─── Auth / User ─────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // legacy - kept for backward compat with existing dashboard/users page
  role?: UserRole;
}

export interface AdminUserData {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

// ─── Multi-Family ─────────────────────────────────────────────────────────────

export interface Family {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyShare {
  id: string;
  family_id: string;
  shared_by: string;
  shared_with: string;
  role: ShareRole;
  created_at: string;
  // Joined
  family?: Family;
  shared_with_email?: string;
}

/** Object truyền qua React Context cho mỗi trang trong /dashboard/[familyId]/ */
export interface FamilyContext {
  family: Family;
  myRole: ShareRole | "owner";
  canWrite: boolean;  // owner | editor | admin
  canAdmin: boolean;  // owner | admin
  isOwner: boolean;
}

// ─── Family data types ────────────────────────────────────────────────────────

export interface Person {
  id: string;
  family_id: string;
  full_name: string;
  gender: Gender;
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  death_year: number | null;
  death_month: number | null;
  death_day: number | null;
  avatar_url: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;

  // Private fields (optional)
  phone_number?: string | null;
  occupation?: string | null;
  current_residence?: string | null;

  // Lunar Date
  death_lunar_year: number | null;
  death_lunar_month: number | null;
  death_lunar_day: number | null;

  // Extra fields
  is_deceased: boolean;
  is_in_law: boolean;
  birth_order: number | null;
  generation: number | null;
  other_names: string | null;
}

export interface Relationship {
  id: string;
  family_id: string;
  type: RelationshipType;
  person_a: string;
  person_b: string;
  note?: string | null;
  created_at: string;
  updated_at: string;
}

// Helper types for UI
export interface PersonWithDetails extends Person {
  spouses?: Person[];
  children?: Person[];
  parents?: Person[];
}
