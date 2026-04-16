"use client";

import MemberDetailContent from "@/components/MemberDetailContent";
import MemberForm from "@/components/MemberForm";
import { Person } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Edit2, ExternalLink, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDashboard } from "./DashboardContext";
import { useUser } from "./UserProvider";
import { useFamilyContextOptional } from "./FamilyContextProvider";

export default function MemberDetailModal({ familyId }: { familyId?: string }) {
  const { memberModalId: memberId, setMemberModalId, showCreateMember, setShowCreateMember } = useDashboard();
  const { isAdmin, supabase } = useUser();

  const familyCtx = useFamilyContextOptional();
  const canEdit = familyCtx ? familyCtx.canWrite : isAdmin;

  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [privateData, setPrivateData] = useState<Partial<Person> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const closeModal = () => { setMemberModalId(null); setShowCreateMember(false); setIsEditing(false); setConfirmDelete(false); };

  const fetchData = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data: personData, error: personError } = await supabase.from("persons").select("*").eq("id", id).single();
      if (personError || !personData) throw new Error("Không thể tải thông tin thành viên.");
      setPerson(personData);
      if (isAdmin) {
        const { data: privData } = await supabase.from("person_details_private").select("*").eq("person_id", id).single();
        setPrivateData(privData || {});
      } else {
        setPrivateData(null);
      }
    } catch (err) {
      setError((err as Error)?.message || "Đã xảy ra lỗi hệ thống.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, supabase]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    if (memberId) { setIsOpen(true); setIsEditing(false); fetchData(memberId); }
    else if (showCreateMember) { setIsOpen(true); setIsEditing(false); setPerson(null); setPrivateData(null); setError(null); }
    else {
      setIsOpen(false);
      timeoutId = setTimeout(() => { setPerson(null); setPrivateData(null); setError(null); setIsEditing(false); setConfirmDelete(false); }, 300);
    }
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, [memberId, showCreateMember, fetchData]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  const handleEditSuccess = (savedPersonId: string) => {
    setIsEditing(false); setPerson(null); setPrivateData(null);
    fetchData(savedPersonId);
    router.refresh();
  };

  const handleCreateSuccess = (savedPersonId: string) => {
    setShowCreateMember(false);
    setMemberModalId(savedPersonId);
    setTimeout(() => router.refresh(), 100);
  };

  const handleDelete = async () => {
    if (!person) return;
    setIsDeleting(true);
    try {
      const { error: delError } = await supabase.from("persons").delete().eq("id", person.id);
      if (delError) throw new Error(delError.message);
      closeModal();
      router.refresh();
    } catch (err) {
      setError((err as Error)?.message || "Xóa thất bại.");
    } finally {
      setIsDeleting(false);
    }
  };

  const formInitialData = person ? { ...person, ...(privateData ?? {}) } : undefined;
  const resolvedFamilyId = familyId ?? person?.family_id;
  const memberHref = person
    ? resolvedFamilyId
      ? `/dashboard/${resolvedFamilyId}/members/${person.id}`
      : `/dashboard/members/${person.id}`
    : "#";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-sm">
          {!isEditing && !showCreateMember && <div className="absolute inset-0 cursor-pointer" onClick={closeModal} />}
          <motion.div layout initial={{ scale: 0.96, opacity: 0, y: 15 }} animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 15 }} transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-stone-200">

            <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20 flex items-center gap-2">
              {isEditing ? (
                <button onClick={() => setIsEditing(false)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-stone-100/80 text-stone-700 rounded-full hover:bg-stone-200 font-semibold text-sm shadow-sm border border-stone-200/50 transition-colors">
                  <ArrowLeft className="size-4" /><span className="hidden sm:inline">Quay lại</span>
                </button>
              ) : (
                person && (
                  <>
                    <Link href={memberHref}
                      className="flex items-center gap-1.5 px-4 py-2 bg-stone-100/80 text-stone-700 rounded-full hover:bg-stone-200 font-semibold text-sm shadow-sm border border-stone-200/50 transition-colors">
                      <ExternalLink className="size-4" /><span className="hidden sm:inline">Xem</span>
                    </Link>
                    {canEdit && (
                      <button onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-amber-100/80 text-amber-800 rounded-full hover:bg-amber-200 font-semibold text-sm shadow-sm border border-amber-200/50 transition-colors">
                        <Edit2 className="size-4" /><span className="hidden sm:inline">Chỉnh sửa</span>
                      </button>
                    )}
                    {canEdit && (
                      confirmDelete ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-red-600 font-semibold hidden sm:inline">Xác nhận xóa?</span>
                          <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 font-semibold text-sm shadow-sm transition-colors disabled:opacity-60"
                          >
                            {isDeleting ? <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 className="size-4" />}
                            <span className="hidden sm:inline">Xóa</span>
                          </button>
                          <button
                            onClick={() => setConfirmDelete(false)}
                            className="px-3 py-2 bg-stone-100/80 text-stone-600 rounded-full hover:bg-stone-200 font-semibold text-sm shadow-sm border border-stone-200/50 transition-colors"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(true)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-50/80 text-red-700 rounded-full hover:bg-red-100 font-semibold text-sm shadow-sm border border-red-200/50 transition-colors"
                        >
                          <Trash2 className="size-4" /><span className="hidden sm:inline">Xóa</span>
                        </button>
                      )
                    )}
                  </>
                )
              )}
              <button onClick={closeModal}
                className="size-10 flex items-center justify-center bg-stone-100/80 text-stone-600 rounded-full hover:bg-stone-200 hover:text-stone-900 shadow-sm border border-stone-200/50 transition-colors">
                <X className="size-5" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex-1 min-h-[500px] flex items-center justify-center flex-col gap-4">
                  <div className="size-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-stone-500 font-medium">Đang tải...</p>
                </motion.div>
              ) : error ? (
                <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex-1 min-h-[400px] flex items-center justify-center flex-col gap-4 p-8 text-center">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2">
                    <AlertCircle className="size-8" />
                  </div>
                  <p className="text-red-600 font-medium text-lg">{error}</p>
                  <button onClick={closeModal} className="mt-2 px-6 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-full transition-colors">Đóng</button>
                </motion.div>
              ) : isEditing && formInitialData && resolvedFamilyId ? (
                <motion.div key="editing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-8 pt-16 pb-8">
                  <h2 className="text-xl font-serif font-bold text-stone-800 mb-6">Chỉnh sửa thành viên</h2>
                  <MemberForm
                    initialData={formInitialData as Parameters<typeof MemberForm>[0]["initialData"]}
                    isEditing={true} isAdmin={isAdmin} familyId={resolvedFamilyId}
                    onSuccess={handleEditSuccess} onCancel={() => setIsEditing(false)}
                  />
                </motion.div>
              ) : showCreateMember ? (
                <motion.div key="creating" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-8 pt-16 pb-8">
                  <h2 className="text-xl font-serif font-bold text-stone-800 mb-6">Thêm thành viên mới</h2>
                  {resolvedFamilyId ? (
                    <MemberForm isAdmin={isAdmin} familyId={resolvedFamilyId} onSuccess={handleCreateSuccess} onCancel={closeModal} />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                      <AlertCircle className="size-10 text-amber-400" />
                      <p className="text-stone-500 font-medium">Không xác định được gia phả.<br />Vui lòng thử lại từ trang gia phả.</p>
                      <button onClick={closeModal} className="mt-2 px-6 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-full transition-colors">Đóng</button>
                    </div>
                  )}
                </motion.div>
              ) : person ? (
                <motion.div key="details" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  className="flex-1 overflow-y-auto custom-scrollbar">
                  <MemberDetailContent person={person} privateData={privateData} isAdmin={isAdmin} canEdit={canEdit} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
