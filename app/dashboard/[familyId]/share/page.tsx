import BackToBoardButton from "@/components/BackToBoardButton";
import ShareManager from "@/components/ShareManager";
import { getSupabase, getUser } from "@/utils/supabase/queries";
import { ShareRole } from "@/types";
import { redirect } from "next/navigation";

type ShareRow = {
  id: string;
  shared_with: string;
  shared_with_email: string;
  role: ShareRole;
  created_at: string;
};

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

  // Lấy danh sách share trực tiếp — tránh phụ thuộc vào getFamilyShares
  // chỉ owner và admin mới thấy danh sách; editor thấy mảng rỗng
  let initialShares: ShareRow[] = [];
  if (isOwner || shareRole === "admin") {
    const { data } = await supabase
      .from("family_shares_with_email")
      .select("id, shared_with, shared_with_email, role, created_at")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true });
    initialShares = (data ?? []) as ShareRow[];
  }

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">
      <BackToBoardButton familyId={familyId} />
      <ShareManager
        familyId={familyId}
        initialShares={initialShares}
        canShareEmail={canShareEmail}
      />
    </main>
  );
}
