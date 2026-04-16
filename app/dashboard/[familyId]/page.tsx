import { redirect } from "next/navigation";

export default async function FamilyRootPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  redirect(`/dashboard/${familyId}/board`);
}
