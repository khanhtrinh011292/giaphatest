import BackToBoardButton from "@/components/BackToBoardButton";
import FamilyStats from "@/components/FamilyStats";
import { getPersons, getRelationships } from "@/utils/supabase/queries";

export const metadata = { title: "Thống kê gia phả" };

interface PageProps {
  params: Promise<{ familyId: string }>;
}

export default async function StatsPage({ params }: PageProps) {
  const { familyId } = await params;

  const [persons, relationships] = await Promise.all([
    getPersons(familyId),
    getRelationships(familyId),
  ]);

  return (
    <div className="flex-1 w-full flex flex-col pb-12">
      <div className="w-full py-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <BackToBoardButton familyId={familyId} />
        <h1 className="title">Thống kê gia phả</h1>
        <p className="text-stone-500 mt-1 text-sm">
          Tổng quan số liệu về các thành viên trong dòng họ
        </p>
      </div>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        <FamilyStats persons={persons} relationships={relationships} />
      </main>
    </div>
  );
}
