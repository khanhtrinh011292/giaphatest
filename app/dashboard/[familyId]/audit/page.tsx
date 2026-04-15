import AuditLogList from "@/components/AuditLogList";
import { getSupabase } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";

export const metadata = { title: "Nhật ký thay đổi" };

export default async function AuditPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  const supabase = await getSupabase();

  const { data: logs, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) redirect(`/dashboard/${familyId}`);

  return (
    <div className="flex-1 w-full flex flex-col pb-12">
      <div className="w-full py-6 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <h1 className="title">Nhật ký thay đổi</h1>
        <p className="text-stone-500 mt-1 text-sm">Lịch sử mọi thay đổi thành viên và quan hệ trong gia phả</p>
      </div>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        <AuditLogList logs={logs ?? []} />
      </main>
    </div>
  );
}
