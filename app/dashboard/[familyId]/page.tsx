import { DashboardProvider } from "@/components/DashboardContext";
import DashboardViews from "@/components/DashboardViews";
import MemberDetailModal from "@/components/MemberDetailModal";
import SuggestionsPanel from "@/components/SuggestionsPanel";
import ViewToggle, { ViewMode } from "@/components/ViewToggle";
import { getPersons, getRelationships, getSupabase, getUser } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ familyId: string }>;
  searchParams: Promise<{ view?: string; rootId?: string; avatar?: string }>;
}

export default async function FamilyDashboardPage({ params, searchParams }: PageProps) {
  const { familyId } = await params;
  const { view, rootId, avatar } = await searchParams;
  const initialView = view as ViewMode | undefined;
  const initialShowAvatar = avatar !== "hide";

  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await getSupabase();

  const { data: family } = await supabase
    .from("families")
    .select("owner_id")
    .eq("id", familyId)
    .single();

  let canEdit = false;
  if (family) {
    if (family.owner_id === user.id) {
      canEdit = true;
    } else {
      const { data: share } = await supabase
        .from("family_shares")
        .select("role")
        .eq("family_id", familyId)
        .eq("shared_with", user.id)
        .single();
      canEdit = share?.role === "editor" || share?.role === "admin";
    }
  }

  const [persons, relationships] = await Promise.all([
    getPersons(familyId),
    getRelationships(familyId),
  ]);

  const personsMap = new Map(persons.map((p) => [p.id, p]));
  const childIds = new Set(
    relationships
      .filter((r) => r.type === "biological_child" || r.type === "adopted_child")
      .map((r) => r.person_b),
  );

  let finalRootId = rootId;
  if (!finalRootId || !personsMap.has(finalRootId)) {
    const roots = persons.filter((p) => !childIds.has(p.id));
    finalRootId = roots[0]?.id ?? persons[0]?.id;
  }

  return (
    <DashboardProvider
      initialView={initialView}
      initialRootId={finalRootId}
      initialShowAvatar={initialShowAvatar}
    >
      <ViewToggle />
      <SuggestionsPanel
        familyId={familyId}
        persons={persons}
        relationships={relationships}
      />
      <DashboardViews
        persons={persons}
        relationships={relationships}
        canEdit={canEdit}
        familyId={familyId}
      />
      <MemberDetailModal familyId={familyId} />
    </DashboardProvider>
  );
}
