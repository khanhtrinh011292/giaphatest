import { redirect } from "next/navigation";

// /members → trỏ thẳng về trang cây gia phả (trang gốc có 4 view)
export default async function MembersRedirectPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  redirect(`/dashboard/${familyId}?view=tree`);
}
