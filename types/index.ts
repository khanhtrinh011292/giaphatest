export type Gender = "male" | "female" | "other";
export type RelationshipType =
  | "marriage"
  | "biological_child"
  | "adopted_child";
export type UserRole = "superadmin" | "admin" | "editor" | "member";
export type ShareRole = "viewer" | "editor" | "admin";
export type FamilyRole = ShareRole | "owner";

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminUserData {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

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
  // Joined fields
  family?: Family;
  shared_with_email?: string;
}

export interface FamilyContext {
  family: Family;
  myRole: FamilyRole;
  canWrite: boolean; // editor | admin | owner
  canAdmin: boolean; // admin | owner
  isOwner: boolean;
}

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

export interface PersonWithDetails extends Person {
  spouses?: Person[];
  children?: Person[];
  parents?: Person[];
}
