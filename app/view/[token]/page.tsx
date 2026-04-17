import { createServerClient } from "@supabase/ssr";
import { notFound } from "next/navigation";
import PublicFamilyView from "@/components/PublicFamilyView";

export const metadata = { title: "Xem gia phả" };

// Tạo Supabase client không có cookie → chạy với role anon
function getAnonClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    },
  );
}

export default async function PublicViewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = getAnonClient();

  // Tìm share link hợp lệ
  const { data: link } = await supabase
    .from("family_share_links")
    .select("family_id, role, expires_at")
    .eq("token", token)
    .eq("is_active", true)
    .single();

  if (!link) return notFound();
  if (link.expires_at && new Date(link.expires_at) < new Date()) return notFound();

  const [{ data: family }, { data: persons }, { data: relationships }] = await Promise.all([
    supabase.from("families").select("id, name, description").eq("id", link.family_id).single(),
    supabase
      .from("persons")
      .select("id, full_name, gender, birth_year, birth_month, birth_day, death_year, is_deceased, generation, birth_order, avatar_url, note, other_names")
      .eq("family_id", link.family_id)
      .order("generation")
      .order("birth_order"),
    supabase.from("relationships").select("id, type, person_a, person_b").eq("family_id", link.family_id),
  ]);

  if (!family) return notFound();

  return (
    <PublicFamilyView
      family={family}
      persons={persons ?? []}
      relationships={relationships ?? []}
      role={link.role}
      token={token}
    />
  );
}
