import { createFamily, deleteFamily, getFamilies } from "@/app/actions/family";
import config from "@/app/config";
import { getUser } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";
import FamilyList from "@/components/FamilyList";

export const metadata = { title: `Gia phả của tôi — ${config.siteName}` };

export default async function FamiliesPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const result = await getFamilies();
  if ("error" in result) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <p className="text-red-500 text-sm">{result.error}</p>
      </main>
    );
  }

  const { owned, shared } = result;

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10 sm:py-14">
      <FamilyList owned={owned} shared={shared} userEmail={user.email ?? ""} />
    </main>
  );
}
