import BackToBoardButton from "@/components/BackToBoardButton";
import { getFamilyShares } from "@/app/actions/family";
import ShareManager from "@/components/ShareManager";
import { getSupabase, getUser } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";

export default async function SharePage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;

  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await getSupabase();

  const { data: family } = await supabase
    .from("families")
    .select("id, owner_id")
    .eq("id", familyId)
    .single();
  if (!family) redirect("/dashboard");

  const isOwner = family.owner_id === user.id;
  let shareRole: string | null = null;

  if (!isOwner) {
    const { data: share } = await supabase
      .from("family_shares")
      .select("role")
      .eq("family_id", familyId)
      .eq("shared_with", user.id)
      .single();
    // viewer và member không được vào
    if (!share || share.role === "viewer" || share.role === "member") {
      redirect(`/dashboard/${familyId}/board`);
    }
    shareRole = share.role;
  }

  // owner và admin mới được chia sẻ qua email; editor chỉ tạo link
  const canShareEmail = isOwner || shareRole === "admin";

  const result = await getFamilyShares(familyId);
  if ("error" in result) redirect(`/dashboard/${familyId}/board`);

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
      <BackToBoardButton familyId={familyId} />
      <ShareManager
        familyId={familyId}
        initialShares={result.data}
        canShareEmail={canShareEmail}
      />
    </main>
  );
}
