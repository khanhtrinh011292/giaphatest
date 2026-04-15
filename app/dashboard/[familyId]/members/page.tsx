import { redirect } from "next/navigation";

// /dashboard/[familyId]/members → redirect về trang chính của family
export default async function MembersRedirectPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  redirect(`/dashboard/${familyId}`);
}
