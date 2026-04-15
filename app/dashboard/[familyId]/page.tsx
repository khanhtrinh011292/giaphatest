import { DashboardProvider } from "@/components/DashboardContext";
import DashboardViews from "@/components/DashboardViews";
import MemberDetailModal from "@/components/MemberDetailModal";
import ViewToggle, { ViewMode } from "@/components/ViewToggle";
import { getPersons, getProfile, getRelationships } from "@/utils/supabase/queries";

interface PageProps {
  params: Promise<{ familyId: string }>;
  searchParams: Promise<{ view?: string; rootId?: string; avatar?: string }>;
}

export default async function FamilyDashboardPage({ params, searchParams }: PageProps) {
  const { familyId } = await params;
  const { view, rootId, avatar } = await searchParams;
  const initialView = view as ViewMode | undefined;
  const initialShowAvatar = avatar !== "hide";

  const profile = await getProfile();
  const canEdit = profile?.role === "admin" || profile?.role === "editor";

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
