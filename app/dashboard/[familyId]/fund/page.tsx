import { redirect } from "next/navigation";
import { getSupabase, getUser } from "@/utils/supabase/queries";
import BackToBoardButton from "@/components/BackToBoardButton";
import FamilyFund from "@/components/FamilyFund";
import type { FundTransaction, FundPerson } from "@/components/FamilyFund";
import config from "@/app/config";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ familyId: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: `Quỹ gia phả | ${config.siteName}` };
}

export default async function FundPage({ params }: PageProps) {
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

  let canView = isOwner;
  if (!isOwner) {
    const { data: share } = await supabase
      .from("family_shares")
      .select("role")
      .eq("family_id", familyId)
      .eq("shared_with", user.id)
      .single();
    canView = !!share;
  }
  if (!canView) redirect(`/dashboard/${familyId}/board`);

  const [{ data: txData }, { data: personsData }] = await Promise.all([
    supabase
      .from("family_fund_transactions")
      .select("id, type, contributor_name, person_id, amount, note, transaction_date, created_at")
      .eq("family_id", familyId)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("persons")
      .select("id, full_name, birth_year, is_deceased")
      .eq("family_id", familyId)
      .order("full_name", { ascending: true }),
  ]);

  const fundTransactions = (txData ?? []) as FundTransaction[];
  const persons = (personsData ?? []) as FundPerson[];

  return (
    <div className="flex-1 w-full flex flex-col pb-12">
      <div className="w-full py-6 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <BackToBoardButton familyId={familyId} />
        <h1 className="title">Quỹ gia phả</h1>
        <p className="text-stone-500 mt-1 text-sm">
          Quản lý thu chi quỹ gia phả, theo dõi đóng góp của các thành viên
        </p>
      </div>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        <FamilyFund
          familyId={familyId}
          isOwner={isOwner}
          initialTransactions={fundTransactions}
          persons={persons}
        />
      </main>
    </div>
  );
}
