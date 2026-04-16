import { createFamily, deleteFamily, getFamilies } from "@/app/actions/family";
import config from "@/app/config";
import { getUser } from "@/utils/supabase/queries";
import { UsersIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import CreateFamilyForm from "@/components/CreateFamilyForm";
import DeleteFamilyButton from "@/components/DeleteFamilyButton";

export default async function FamiliesPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const result = await getFamilies();
  if ("error" in result) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <p className="text-red-600">{result.error}</p>
      </main>
    );
  }

  const { owned, shared } = result;

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-stone-800">
          {config.siteName}
        </h1>
        <p className="text-stone-500 mt-1 text-sm">
          Chọn gia phả để xem, hoặc tạo gia phả mới.
        </p>
      </div>

      {/* Gia phả của tôi */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-stone-700">Gia phả của tôi</h2>
        </div>

        {owned.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-stone-200 p-8 text-center text-stone-400">
            <UsersIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Bạn chưa có gia phả nào. Hãy tạo mới bên dưới.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {owned.map((family) => (
              <li key={family.id} className="group flex items-center gap-3 bg-white rounded-xl border border-stone-200 px-4 py-3 shadow-sm hover:border-amber-300 transition-colors">
                <Link
                  href={`/dashboard/${family.id}/board`}
                  className="flex-1 min-w-0"
                >
                  <p className="font-medium text-stone-800 truncate">{family.name}</p>
                  {family.description && (
                    <p className="text-xs text-stone-400 truncate mt-0.5">{family.description}</p>
                  )}
                </Link>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                  Chủ sở hữu
                </span>
                <DeleteFamilyButton familyId={family.id} familyName={family.name} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Gia phả được chia sẻ */}
      {shared.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-stone-700 mb-3">
            Được chia sẻ với tôi
          </h2>
          <ul className="space-y-2">
            {shared.map((s) => (
              <li key={s.id} className="flex items-center gap-3 bg-white rounded-xl border border-stone-200 px-4 py-3 shadow-sm hover:border-blue-300 transition-colors">
                <Link href={`/dashboard/${s.family.id}/board`} className="flex-1 min-w-0">
                  <p className="font-medium text-stone-800 truncate">{s.family.name}</p>
                  {s.family.description && (
                    <p className="text-xs text-stone-400 truncate mt-0.5">{s.family.description}</p>
                  )}
                </Link>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium shrink-0 capitalize">
                  {s.role === "viewer" ? "Xem" : s.role === "editor" ? "Chỉnh sửa" : "Quản trị"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Form tạo gia phả mới */}
      <section>
        <h2 className="text-lg font-semibold text-stone-700 mb-3">Tạo gia phả mới</h2>
        <CreateFamilyForm />
      </section>
    </main>
  );
}
