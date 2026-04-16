import { redirect } from "next/navigation";

// /dashboard/[familyId]/members → trang cây gia phả chính
export default async function MembersRedirectPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  // Chuyển sang trang cây gia phả (view=tree)
  redirect(`/dashboard/${familyId}?view=tree`);
}
