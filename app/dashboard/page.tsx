import { getFamilies } from "@/app/actions/family";
import config from "@/app/config";
import { getProfile, getUser } from "@/utils/supabase/queries";
import Link from "next/link";
import { redirect } from "next/navigation";
import CreateFamilyForm from "@/components/CreateFamilyForm";
import DeleteFamilyButton from "@/components/DeleteFamilyButton";
import Image from "next/image";
import {
  BookOpen,
  ChevronRight,
  PlusCircle,
  Share2,
  Users,
} from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  viewer: "Xem",
  editor: "Chỉnh sửa",
  admin: "Quản trị",
};

const ROLE_COLOR: Record<string, string> = {
  viewer: "bg-sky-50 text-sky-700 border-sky-200",
  editor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  admin: "bg-violet-50 text-violet-700 border-violet-200",
};

export default async function FamiliesPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const profile = await getProfile(user.id);
  const displayName = profile?.display_name || user.email?.split("@")[0] || "bạn";

  const result = await getFamilies();
  if ("error" in result) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <p className="text-red-600">{result.error}</p>
      </main>
    );
  }

  const { owned, shared } = result;
  const totalFamilies = owned.length + shared.length;

  return (
    <main className="flex-1 w-full">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-amber-50 via-stone-50 to-white border-b border-stone-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-stone-100 bg-white">
              <Image
                src="/icon.png"
                alt={config.siteName}
                width={56}
                height={56}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black tracking-tight text-stone-900 uppercase">
                {config.siteName}
              </p>
              <p className="text-stone-500 mt-0.5 text-sm sm:text-base">
                Chào, <span className="font-semibold text-stone-700">{displayName}</span>.
                {" "}
                {totalFamilies === 0
                  ? "Bắt đầu bằng cách tạo gia phả đầu tiên."
                  : `Bạn đang quản lý ${totalFamilies} gia phả.`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* Gia phả của tôi */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-amber-600" />
              <h2 className="text-base font-bold text-stone-800">Gia phả của tôi</h2>
              {owned.length > 0 && (
                <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  {owned.length}
                </span>
              )}
            </div>
          </div>

          {owned.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/50 p-10 text-center">
              <div className="size-14 bg-white border border-stone-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Users className="size-6 text-stone-400" />
              </div>
              <p className="text-sm font-medium text-stone-600 mb-1">Bạn chưa có gia phả nào</p>
              <p className="text-xs text-stone-400">Tạo gia phả đầu tiên bên dưới để bắt đầu lưu giữ ký ức dòng họ.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {owned.map((family) => (
                <div
                  key={family.id}
                  className="group flex items-center gap-3 bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-200 pr-3"
                >
                  {/* Link chiếm phần lớn */}
                  <Link
                    href={`/dashboard/${family.id}/board`}
                    className="flex items-center gap-4 flex-1 min-w-0 px-5 py-4"
                  >
                    <div className="size-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 flex items-center justify-center shrink-0 font-bold text-lg font-serif shadow-xs">
                      {family.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-stone-900 truncate group-hover:text-amber-700 transition-colors">
                        {family.name}
                      </p>
                      {family.description ? (
                        <p className="text-xs text-stone-400 truncate mt-0.5">{family.description}</p>
                      ) : (
                        <p className="text-xs text-stone-300 mt-0.5 italic">Chưa có mô tả</p>
                      )}
                    </div>
                    <ChevronRight className="size-4 text-stone-300 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>

                  {/* Badge + Delete — nằm trong flex row, không absolute */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full hidden sm:inline-flex items-center gap-1">
                      👑 Chủ sở hữu
                    </span>
                    <DeleteFamilyButton familyId={family.id} familyName={family.name} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Gia phả được chia sẻ */}
        {shared.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Share2 className="size-4 text-sky-500" />
              <h2 className="text-base font-bold text-stone-800">Được chia sẻ với tôi</h2>
              <span className="text-xs font-bold bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">
                {shared.length}
              </span>
            </div>
            <div className="grid gap-3">
              {shared.map((s) => (
                <Link
                  key={s.id}
                  href={`/dashboard/${s.family.id}/board`}
                  className="group flex items-center gap-4 bg-white rounded-2xl border border-stone-200 px-5 py-4 shadow-sm hover:shadow-md hover:border-sky-300 transition-all duration-200"
                >
                  <div className="size-10 rounded-xl bg-gradient-to-br from-sky-100 to-blue-100 text-sky-700 flex items-center justify-center shrink-0 font-bold text-lg font-serif shadow-xs">
                    {s.family.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-900 truncate group-hover:text-sky-700 transition-colors">
                      {s.family.name}
                    </p>
                    {s.family.description ? (
                      <p className="text-xs text-stone-400 truncate mt-0.5">{s.family.description}</p>
                    ) : (
                      <p className="text-xs text-stone-300 mt-0.5 italic">Chưa có mô tả</p>
                    )}
                  </div>
                  <span className={`text-[11px] font-bold border px-2.5 py-1 rounded-full shrink-0 hidden sm:inline-flex items-center ${
                    ROLE_COLOR[s.role] ?? "bg-stone-100 text-stone-600 border-stone-200"
                  }`}>
                    {ROLE_LABEL[s.role] ?? s.role}
                  </span>
                  <ChevronRight className="size-4 text-stone-300 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Tạo gia phả mới */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <PlusCircle className="size-4 text-stone-500" />
            <h2 className="text-base font-bold text-stone-800">Tạo gia phả mới</h2>
          </div>
          <CreateFamilyForm />
        </section>

      </div>
    </main>
  );
}
