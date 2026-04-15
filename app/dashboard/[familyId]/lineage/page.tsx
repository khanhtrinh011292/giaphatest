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

  // Kiểm tra quyền admin của family
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="title">Th\u1ee9 t\u1ef1 gia ph\u1ea3</h1>
          <p className="text-stone-500 mt-2 text-sm sm:text-base max-w-2xl">
            T\u1ef1 \u0111\u1ed9ng t\u00ednh to\u00e1n v\u00e0 c\u1eadp nh\u1eadt{" "}
            <strong className="text-stone-700">th\u1ebf h\u1ec7</strong>,{" "}
            <strong className="text-stone-700">th\u1ee9 t\u1ef1 sinh</strong> v\u00e0{" "}
            <strong className="text-stone-700">tr\u1ea1ng th\u00e1i D\u00e2u/R\u1ec3</strong> cho
            t\u1ea5t c\u1ea3 th\u00e0nh vi\u00ean. Xem preview tr\u01b0\u1edbc khi \u00e1p d\u1ee5ng.
          </p>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white/80 rounded-2xl p-5 border border-stone-200/60 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="text-2xl">\uD83C\uDF33</span>
              <div>
                <h3 className="font-bold text-stone-800 text-sm mb-1">
                  Th\u1ebf h\u1ec7 (Generation)
                </h3>
                <p className="text-stone-500 text-xs leading-relaxed">
                  D\u00f9ng thu\u1eadt to\u00e1n BFS t\u1eeb c\u00e1c t\u1ed5 ti\u00ean g\u1ed1c (ng\u01b0\u1eddi ch\u01b0a c\u00f3 th\u00f4ng
                  tin b\u1ed1/m\u1eb9 trong h\u1ec7 th\u1ed1ng). T\u1ed5 ti\u00ean = \u0110\u1eddi 1, con = \u0110\u1eddi 2, ch\u00e1u
                  = \u0110\u1eddi 3... Con d\u00e2u/r\u1ec3 k\u1ebf th\u1eeba \u0111\u1eddi c\u1ee7a ng\u01b0\u1eddi b\u1ea1n \u0111\u1eddi.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white/80 rounded-2xl p-5 border border-stone-200/60 shadow-sm flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">\uD83D\uDC76</span>
              <div>
                <h3 className="font-bold text-stone-800 text-sm mb-1">
                  Th\u1ee9 t\u1ef1 sinh (Birth Order)
                </h3>
                <p className="text-stone-500 text-xs leading-relaxed">
                  Trong danh s\u00e1ch anh/ch\u1ecb/em c\u00f9ng cha, s\u1eafp x\u1ebfp theo n\u0103m sinh
                  t\u0103ng d\u1ea7n v\u00e0 g\u00e1n s\u1ed1 th\u1ee9 t\u1ef1 1, 2, 3... Con d\u00e2u/r\u1ec3 kh\u00f4ng \u0111\u01b0\u1ee3c
                  t\u00ednh th\u1ee9 t\u1ef1.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">\uD83D\uDC8D</span>
              <div>
                <h3 className="font-bold text-stone-800 text-sm mb-1">
                  D\u00e2u / R\u1ec3 (In-Law Status)
                </h3>
                <p className="text-stone-500 text-xs leading-relaxed">
                  T\u1ef1 \u0111\u1ed9ng x\u00e1c \u0111\u1ecbnh l\u00e0 d\u00e2u/r\u1ec3 n\u1ebfu th\u00e0nh vi\u00ean c\u00f3 v\u1ee3/ch\u1ed3ng trong h\u1ec7
                  th\u1ed1ng nh\u01b0ng kh\u00f4ng c\u00f3 th\u00f4ng tin b\u1ed1/m\u1eb9. Gi\u00fap hi\u1ec3n th\u1ecb \u0111\u00fang th\u1ebb
                  ph\u00e2n lo\u1ea1i ngo\u00e0i danh s\u00e1ch.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Manager */}
        <div className="bg-white/80 rounded-2xl border border-stone-200/60 shadow-sm p-5 sm:p-8">
          <LineageManager persons={persons} relationships={relationships} />
        </div>
      </div>
    </main>
  );
}
