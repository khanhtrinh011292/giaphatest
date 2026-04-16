import BackToBoardButton from "@/components/BackToBoardButton";
import { DashboardProvider } from "@/components/DashboardContext";
import EventsList from "@/components/EventsList";
import MemberDetailModal from "@/components/MemberDetailModal";
import { getEvents, getPersons } from "@/utils/supabase/queries";

export const metadata = { title: "Sự kiện gia phả" };

interface PageProps {
  params: Promise<{ familyId: string }>;
}

export default async function EventsPage({ params }: PageProps) {
  const { familyId } = await params;

  const [personsAll, customEvents] = await Promise.all([
    getPersons(familyId),
    getEvents(familyId),
  ]);

  const persons = personsAll.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    birth_year: p.birth_year,
    birth_month: p.birth_month,
    birth_day: p.birth_day,
    death_year: p.death_year,
    death_month: p.death_month,
    death_day: p.death_day,
    death_lunar_year: p.death_lunar_year,
    death_lunar_month: p.death_lunar_month,
    death_lunar_day: p.death_lunar_day,
    is_deceased: p.is_deceased,
    avatar_url: p.avatar_url,
  }));

  return (
    <DashboardProvider>
      <div className="flex-1 w-full flex flex-col pb-12">
        <div className="w-full py-6 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
          <BackToBoardButton familyId={familyId} />
          <h1 className="title">Sự kiện gia phả</h1>
          <p className="text-stone-500 mt-1 text-sm">
            Sinh nhật, ngày giỗ (âm lịch) và các sự kiện tuỳ chỉnh
          </p>
        </div>
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
          <EventsList persons={persons} customEvents={customEvents} familyId={familyId} />
        </main>
      </div>
      <MemberDetailModal familyId={familyId} />
    </DashboardProvider>
  );
}
