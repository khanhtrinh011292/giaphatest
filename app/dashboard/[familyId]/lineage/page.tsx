import BackToBoardButton from "@/components/BackToBoardButton";
import LineageManager from "@/components/LineageManager";
import { getSupabase, getUser } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";

export default async function LineagePage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
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

  let canAdmin = family.owner_id === user.id;
  if (!canAdmin) {
    const { data: share } = await supabase
      .from("family_shares")
      .select("role")
      .eq("family_id", familyId)
      .eq("shared_with", user.id)
      .single();
    canAdmin = share?.role === "admin";
  }

  if (!canAdmin) redirect(`/dashboard/${familyId}`);

  const { data: personsData } = await supabase
    .from("persons")
    .select("*")
    .eq("family_id", familyId)
    .order("birth_year", { ascending: true, nullsFirst: false });

  const { data: relsData } = await supabase
    .from("relationships")
    .select("*")
    .eq("family_id", familyId);

  const persons = personsData || [];
  const relationships = relsData || [];

  return (
    <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full">
      <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full relative z-10">
        <BackToBoardButton familyId={familyId} />
        <div className="mb-8">
          <h1 className="title">Thứ tự gia phả</h1>
          <p className="text-stone-500 mt-2 text-sm sm:text-base max-w-2xl">
            Tự động tính toán và cập nhật{" "}
            <strong className="text-stone-700">thế hệ</strong>,{" "}
            <strong className="text-stone-700">thứ tự sinh</strong> và{" "}
            <strong className="text-stone-700">trạng thái Dâu/Rể</strong> cho
            tất cả thành viên. Xem preview trước khi áp dụng.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white/80 rounded-2xl p-5 border border-stone-200/60 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🌳</span>
              <div>
                <h3 className="font-bold text-stone-800 text-sm mb-1">Thế hệ (Generation)</h3>
                <p className="text-stone-500 text-xs leading-relaxed">
                  Dùng thuật toán BFS từ các tổ tiên gốc (người chưa có thông tin bố/mẹ trong hệ thống). Tổ tiên = Đời 1, con = Đời 2, cháu = Đời 3... Con dâu/rể kế thừa đời của người bạn đời.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white/80 rounded-2xl p-5 border border-stone-200/60 shadow-sm flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">👶</span>
              <div>
                <h3 className="font-bold text-stone-800 text-sm mb-1">Thứ tự sinh (Birth Order)</h3>
                <p className="text-stone-500 text-xs leading-relaxed">
                  Trong danh sách anh/chị/em cùng cha, sắp xếp theo năm sinh tăng dần và gán số thứ tự 1, 2, 3... Con dâu/rể không được tính thứ tự.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">💍</span>
              <div>
                <h3 className="font-bold text-stone-800 text-sm mb-1">Dâu / Rể (In-Law Status)</h3>
                <p className="text-stone-500 text-xs leading-relaxed">
                  Tự động xác định là dâu/rể nếu thành viên có vợ/chồng trong hệ thống nhưng không có thông tin bố/mẹ. Giúp hiển thị đúng thẻ phân loại ngoài danh sách.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white/80 rounded-2xl border border-stone-200/60 shadow-sm p-5 sm:p-8">
          <LineageManager persons={persons} relationships={relationships} />
        </div>
      </div>
    </main>
  );
}
