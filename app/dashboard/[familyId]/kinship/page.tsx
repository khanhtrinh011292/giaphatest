import KinshipFinder from "@/components/KinshipFinder";
import { getPersons, getRelationships } from "@/utils/supabase/queries";

export const metadata = { title: "Tra cứu danh xưng" };

interface PageProps {
  params: Promise<{ familyId: string }>;
}

export default async function KinshipPage({ params }: PageProps) {
  const { familyId } = await params;

  const [persons, relationships] = await Promise.all([
    getPersons(familyId),
    getRelationships(familyId),
  ]);

  const personsMini = persons.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    gender: p.gender,
    birth_year: p.birth_year,
    birth_order: p.birth_order,
    generation: p.generation,
    is_in_law: p.is_in_law,
    avatar_url: p.avatar_url,
  }));

  const relsMini = relationships.map((r) => ({
    type: r.type,
    person_a: r.person_a,
    person_b: r.person_b,
  }));

  return (
    <div className="flex-1 w-full flex flex-col pb-12">
      <div className="w-full py-6 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <h1 className="title">Tra cứu danh xưng</h1>
        <p className="text-stone-500 mt-1 text-sm">
          Chọn hai thành viên để tự động tính cách gọi theo quan hệ gia phả
        </p>
      </div>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        <KinshipFinder persons={personsMini} relationships={relsMini} />
      </main>
    </div>
  );
}
