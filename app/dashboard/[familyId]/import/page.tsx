import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ImportPageClient from "./ImportPageClient";

export default async function ImportPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: share } = await supabase
    .from("family_shares")
    .select("role")
    .eq("family_id", familyId)
    .eq("shared_with", user.id)
    .single();

  const { data: family } = await supabase
    .from("families")
    .select("id, name, owner_id")
    .eq("id", familyId)
    .single();

  if (!family) redirect("/dashboard");

  const isOwner = family.owner_id === user.id;
  const role = share?.role ?? (isOwner ? "owner" : null);
  const canWrite = ["editor", "admin", "owner"].includes(role ?? "");

  if (!canWrite) redirect(`/dashboard/${familyId}`);

  return <ImportPageClient familyId={familyId} familyName={family.name} />;
}
