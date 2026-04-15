import AdminUserList from "@/components/AdminUserList";
import { AdminUserData } from "@/types";
import { getProfile, getSupabase, getUser } from "@/utils/supabase/queries";
import { redirect } from "next/navigation";
import { Users, BookOpen, Network, GitMerge, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function AdminUsersPage() {
  const profile = await getProfile();
  const isAdmin = profile?.role === "admin";

  if (!isAdmin) {
    redirect("/dashboard");
  }

  const user = await getUser();
  const supabase = await getSupabase();

  const { data: users, error } = await supabase.rpc("get_admin_users");
  if (error) console.error("Error fetching users:", error);
  const typedUsers = (users as AdminUserData[]) || [];

  const [{ count: totalFamilies }, { count: totalPersons }, { count: totalRelationships }] =
    await Promise.all([
      supabase.from("families").select("*", { count: "exact", head: true }).then(r => r),
      supabase.from("persons").select("*", { count: "exact", head: true }).then(r => r),
      supabase.from("relationships").select("*", { count: "exact", head: true }).then(r => r),
    ]);

  const totalUsers = typedUsers.length;
  const activeUsers = typedUsers.filter(u => u.is_active).length;
  const pendingUsers = typedUsers.filter(u => !u.is_active).length;

  const stats = [
    {
      label: "Tổng người dùng",
      value: totalUsers,
      sub: `${activeUsers} đã duyệt · ${pendingUsers} chờ duyệt`,
      icon: "users",
      color: "amber",
    },
    {
      label: "Gia phả",
      value: totalFamilies ?? 0,
      sub: "Tổng gia phả trong hệ thống",
      icon: "book",
      color: "emerald",
    },
    {
      label: "Thành viên gia phả",
      value: totalPersons ?? 0,
      sub: "Tổng hồ sơ đã tạo",
      icon: "network",
      color: "blue",
    },
    {
      label: "Mối quan hệ",
      value: totalRelationships ?? 0,
      sub: "Kết nối giữa các thành viên",
      icon: "git",
      color: "purple",
    },
  ];

  return (
    <main className="flex-1 overflow-auto bg-stone-50/50 flex flex-col pt-8 relative w-full">
      <div className="max-w-7xl mx-auto px-4 pb-8 sm:px-6 lg:px-8 w-full relative z-10">

        {/* Header with back button */}
        <div className="mb-8 flex items-start gap-4">
          <Link
            href="/dashboard"
            className="btn mt-1 shrink-0"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Quay lại</span>
          </Link>
          <div>
            <h1 className="title">Quản lý Website</h1>
            <p className="text-stone-500 mt-2 text-sm sm:text-base">
              Tổng quan hệ thống và quản lý tài khoản. Chỉ Admin mới xem được trang này.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-white/80 rounded-2xl p-5 border border-stone-200/60 shadow-sm flex flex-col gap-3"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                s.color === "amber" ? "bg-amber-100 text-amber-600" :
                s.color === "emerald" ? "bg-emerald-100 text-emerald-600" :
                s.color === "blue" ? "bg-blue-100 text-blue-600" :
                "bg-purple-100 text-purple-600"
              }`}>
                {s.icon === "users" && <Users className="size-5" />}
                {s.icon === "book" && <BookOpen className="size-5" />}
                {s.icon === "network" && <Network className="size-5" />}
                {s.icon === "git" && <GitMerge className="size-5" />}
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-900">{s.value.toLocaleString("vi-VN")}</p>
                <p className="text-xs font-semibold text-stone-700 mt-0.5">{s.label}</p>
                <p className="text-xs text-stone-400 mt-0.5">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* User list */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-stone-800">Danh sách tài khoản</h2>
          <p className="text-stone-500 text-sm mt-1">Quản lý vai trò và trạng thái người dùng.</p>
        </div>
        <AdminUserList
          initialUsers={typedUsers}
          currentUserId={profile.id}
          currentUserEmail={user?.email ?? ""}
        />
      </div>
    </main>
  );
}
