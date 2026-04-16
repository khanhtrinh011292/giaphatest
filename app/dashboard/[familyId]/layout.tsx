import config from "@/app/config";
import DashboardHeader from "@/components/DashboardHeader";
import { FamilyContextProvider } from "@/components/FamilyContextProvider";
import Footer from "@/components/Footer";
import LogoutButton from "@/components/LogoutButton";
import { FamilyContext } from "@/types";
import { getProfile, getSupabase, getUser } from "@/utils/supabase/queries";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import React from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ familyId: string }>;
}): Promise<Metadata> {
  const { familyId } = await params;
  const supabase = await getSupabase();
  const { data: family } = await supabase
    .from("families")
    .select("name")
    .eq("id", familyId)
    .single();
  return {
    title: family?.name ? `${family.name} | ${config.siteName}` : config.siteName,
  };
}

export default async function FamilyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;
  const user = await getUser();
  if (!user) redirect("/login");

  const profile = await getProfile(user.id);

  if (!profile?.is_active) {
    return (
      <div className="min-h-svh bg-stone-50 text-stone-900 flex flex-col font-sans">
        <header className="sticky top-0 z-30 bg-white/80 border-b border-stone-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="text-xl font-serif font-bold text-stone-800 hover:text-amber-700 transition-colors">
              {config.siteName}
            </Link>
            <div className="w-32"><LogoutButton /></div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md text-center bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
            <h2 className="text-2xl font-serif font-bold text-stone-800 mb-2">Tài khoản chờ duyệt</h2>
            <p className="text-stone-600">Vui lòng liên hệ quản trị viên để được kích hoạt tài khoản.</p>
          </div>
        </main>
        <Footer className="mt-auto bg-white border-t border-stone-200" />
      </div>
    );
  }

  // Dùng lại supabase client từ getSupabase() — được cache() nên chỉ tạo 1 lần/request
  const supabase = await getSupabase();

  const { data: family, error: familyError } = await supabase
    .from("families")
    .select("*")
    .eq("id", familyId)
    .single();

  if (familyError || !family) redirect("/dashboard");

  const isOwner = family.owner_id === user.id;
  let shareRole: string | null = null;

  if (!isOwner) {
    const { data: share } = await supabase
      .from("family_shares")
      .select("role")
      .eq("family_id", familyId)
      .eq("shared_with", user.id)
      .single();

    if (!share) redirect("/dashboard");
    shareRole = share.role;
  }

  const myRole = isOwner ? "owner" : (shareRole as "viewer" | "editor" | "admin");
  const canWrite = isOwner || shareRole === "editor" || shareRole === "admin";
  const canAdmin = isOwner || shareRole === "admin";

  const context: FamilyContext = {
    family,
    myRole,
    canWrite,
    canAdmin,
    isOwner,
  };

  return (
    <FamilyContextProvider context={context}>
      <div className="min-h-svh bg-stone-50 text-stone-900 flex flex-col font-sans">
        <DashboardHeader familyId={familyId} familyName={family.name} />
        {children}
        <Footer className="mt-auto bg-white border-t border-stone-200" showDisclaimer={true} />
      </div>
    </FamilyContextProvider>
  );
}
