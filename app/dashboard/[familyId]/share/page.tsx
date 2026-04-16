import BackToBoardButton from "@/components/BackToBoardButton";
import { getFamilyShares } from "@/app/actions/family";
import ShareManager from "@/components/ShareManager";
import { redirect } from "next/navigation";

export default async function SharePage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;

  const result = await getFamilyShares(familyId);

  if ("error" in result) {
    redirect(`/dashboard/${familyId}`);
  }

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
      <BackToBoardButton familyId={familyId} />
      <ShareManager familyId={familyId} initialShares={result.data} />
    </main>
  );
}
