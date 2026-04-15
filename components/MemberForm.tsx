"use client";

import { Gender, Person } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { AnimatePresence, motion, Variants } from "framer-motion";
import {
  AlertCircle,
  Briefcase,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Phone,
  Settings2,
  Trash2,
  User,
} from "lucide-react";
import { Lunar, Solar } from "lunar-javascript";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface MemberFormProps {
  initialData?: Person;
  isEditing?: boolean;
  isAdmin?: boolean;
  familyId?: string;
  /** Called with the saved person's ID after a successful save. Overrides default router.push. */
  onSuccess?: (personId: string) => void;
  /** Called when user clicks Cancel. Overrides default router.back(). */
  onCancel?: () => void;
}

export default function MemberForm({
  initialData,
  isEditing = false,
  isAdmin = false,
  familyId,
  onSuccess,
  onCancel,
}: MemberFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(initialData?.full_name || "");
  const [otherNames, setOtherNames] = useState(initialData?.other_names || "");
  const [gender, setGender] = useState<Gender>(initialData?.gender || "male");
  const [birthYear, setBirthYear] = useState<number | "">(
    initialData?.birth_year || "",
  );
  const [birthMonth, setBirthMonth] = useState<number | "">(
    initialData?.birth_month || "",
  );
  const [birthDay, setBirthDay] = useState<number | "">(
    initialData?.birth_day || "",
  );
  const [deathYear, setDeathYear] = useState<number | "">(
    initialData?.death_year || "",
  );
  const [deathMonth, setDeathMonth] = useState<number | "">(
    initialData?.death_month || "",
  );
  const [deathDay, setDeathDay] = useState<number | "">(
    initialData?.death_day || "",
  );
  const [deathLunarYear, setDeathLunarYear] = useState<number | "">(
    initialData?.death_lunar_year || "",
  );
  const [deathLunarMonth, setDeathLunarMonth] = useState<number | "">(
    initialData?.death_lunar_month || "",
  );
  const [deathLunarDay, setDeathLunarDay] = useState<number | "">(
    initialData?.death_lunar_day || "",
  );
  const [isDeceased, setIsDeceased] = useState<boolean>(
    initialData?.is_deceased || false,
  );
  const [isInLaw, setIsInLaw] = useState<boolean>(
    initialData?.is_in_law || false,
  );
  const [birthOrder, setBirthOrder] = useState<number | "">(
    initialData?.birth_order || "",
  );
  const [generation, setGeneration] = useState<number | "">(
    initialData?.generation || "",
  );
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatar_url || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    initialData?.avatar_url || null,
  );
  const [note, setNote] = useState(initialData?.note || "");
  const [phoneNumber, setPhoneNumber] = useState(
    initialData?.phone_number ?? "",
  );
  const [occupation, setOccupation] = useState(initialData?.occupation ?? "");
  const [currentResidence, setCurrentResidence] = useState(
    initialData?.current_residence ?? "",
  );

  const slugify = (str: string) =>
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\u0111\u0110]/g, "d")
      .replace(/([^0-9a-z-\s])/g, "")
      .replace(/(\s+)/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

  const handleSolarDeathChange = (
    field: "day" | "month" | "year",
    val: string,
  ) => {
    const num = val ? Number(val) : "";
    let d = deathDay, m = deathMonth, y = deathYear;
    if (field === "day") { d = num; setDeathDay(num); }
    else if (field === "month") { m = num; setDeathMonth(num); }
    else if (field === "year") { y = num; setDeathYear(num); }
    if (d !== "" && m !== "" && y !== "" && y > 100) {
      try {
        const lunar = Solar.fromYmd(y, m, d).getLunar();
        setDeathLunarDay(lunar.getDay());
        setDeathLunarMonth(Math.abs(lunar.getMonth()));
        setDeathLunarYear(lunar.getYear());
      } catch {}
    }
  };

  const handleLunarDeathChange = (
    field: "day" | "month" | "year",
    val: string,
  ) => {
    const num = val ? Number(val) : "";
    let d = deathLunarDay, m = deathLunarMonth, y = deathLunarYear;
    if (field === "day") { d = num; setDeathLunarDay(num); }
    else if (field === "month") { m = num; setDeathLunarMonth(num); }
    else if (field === "year") { y = num; setDeathLunarYear(num); }
    if (d !== "" && m !== "" && y !== "" && y > 100) {
      try {
        const solar = Lunar.fromYmd(y, m, d).getSolar();
        setDeathDay(solar.getDay());
        setDeathMonth(solar.getMonth());
        setDeathYear(solar.getYear());
      } catch {}
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const isValidDate = (day: number | "", month: number | "", year: number | "") => {
      if (day !== "" && (day < 1 || day > 31)) return false;
      if (month !== "" && (month < 1 || month > 12)) return false;
      if (year !== "" && year < 1) return false;
      if (day !== "" && month !== "") {
        const currentYear = year !== "" ? year : 2000;
        if (day > new Date(currentYear, month, 0).getDate()) return false;
      }
      return true;
    };

    if (!isValidDate(birthDay, birthMonth, birthYear)) {
      setError("Ngày sinh không hợp lệ. Vui lòng kiểm tra lại.");
      setLoading(false);
      return;
    }

    let finalDeathDay = deathDay, finalDeathMonth = deathMonth, finalDeathYear = deathYear;
    let finalDeathLunarDay = deathLunarDay, finalDeathLunarMonth = deathLunarMonth, finalDeathLunarYear = deathLunarYear;

    if (isDeceased && deathLunarDay !== "" && deathLunarMonth !== "" && deathLunarYear !== "" &&
      (deathDay === "" || deathMonth === "" || deathYear === "")) {
      try {
        const solar = Lunar.fromYmd(deathLunarYear, deathLunarMonth, deathLunarDay).getSolar();
        finalDeathDay = solar.getDay();
        finalDeathMonth = solar.getMonth();
        finalDeathYear = solar.getYear();
      } catch {
        setError("Ngày âm lịch không hợp lệ."); setLoading(false); return;
      }
    } else if (isDeceased && deathDay !== "" && deathMonth !== "" && deathYear !== "" &&
      (deathLunarDay === "" || deathLunarMonth === "" || deathLunarYear === "")) {
      try {
        const lunar = Solar.fromYmd(deathYear, deathMonth, deathDay).getLunar();
        finalDeathLunarDay = lunar.getDay();
        finalDeathLunarMonth = Math.abs(lunar.getMonth());
        finalDeathLunarYear = lunar.getYear();
      } catch {}
    } else if (!isDeceased) {
      finalDeathDay = ""; finalDeathMonth = ""; finalDeathYear = "";
      finalDeathLunarDay = ""; finalDeathLunarMonth = ""; finalDeathLunarYear = "";
    }

    if (isDeceased && !isValidDate(finalDeathDay, finalDeathMonth, finalDeathYear)) {
      setError("Ngày mất không hợp lệ."); setLoading(false); return;
    }
    if (isDeceased && birthYear !== "" && finalDeathYear !== "" && finalDeathYear < birthYear) {
      setError("Năm mất phải lớn hơn hoặc bằng năm sinh."); setLoading(false); return;
    }

    try {
      let currentAvatarUrl = avatarUrl;

      const getPersonData = (url: string | null) => ({
        full_name: fullName,
        gender,
        birth_year: birthYear === "" ? null : Number(birthYear),
        birth_month: birthMonth === "" ? null : Number(birthMonth),
        birth_day: birthDay === "" ? null : Number(birthDay),
        death_year: isDeceased && finalDeathYear !== "" ? Number(finalDeathYear) : null,
        death_month: isDeceased && finalDeathMonth !== "" ? Number(finalDeathMonth) : null,
        death_day: isDeceased && finalDeathDay !== "" ? Number(finalDeathDay) : null,
        death_lunar_year: isDeceased && finalDeathLunarYear !== "" ? Number(finalDeathLunarYear) : null,
        death_lunar_month: isDeceased && finalDeathLunarMonth !== "" ? Number(finalDeathLunarMonth) : null,
        death_lunar_day: isDeceased && finalDeathLunarDay !== "" ? Number(finalDeathLunarDay) : null,
        is_deceased: isDeceased,
        is_in_law: isInLaw,
        birth_order: birthOrder === "" ? null : Number(birthOrder),
        generation: generation === "" ? null : Number(generation),
        other_names: otherNames || null,
        avatar_url: url,
        note: note || null,
        ...(familyId ? { family_id: familyId } : {}),
      });

      let currentPersonId = initialData?.id;

      if (!isEditing || !currentPersonId) {
        const { data: newPerson, error: createError } = await supabase
          .from("persons")
          .insert(getPersonData(currentAvatarUrl || null))
          .select()
          .single();
        if (createError) throw createError;
        currentPersonId = newPerson.id;
      } else {
        const { error: updateError } = await supabase
          .from("persons")
          .update(getPersonData(currentAvatarUrl || null))
          .eq("id", currentPersonId);
        if (updateError) throw updateError;
      }

      if (avatarFile && currentPersonId) {
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${currentPersonId}_${slugify(fullName)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
        currentAvatarUrl = publicUrl;
        await supabase.from("persons").update({ avatar_url: currentAvatarUrl }).eq("id", currentPersonId);
      }

      // Save private details for all users who can edit
      if (currentPersonId) {
        const normalizedData = {
          person_id: currentPersonId,
          phone_number: phoneNumber?.trim() || null,
          occupation: occupation?.trim() || null,
          current_residence: currentResidence?.trim() || null,
          ...(familyId ? { family_id: familyId } : {}),
        };
        const hasData = normalizedData.phone_number || normalizedData.occupation || normalizedData.current_residence;
        if (hasData) {
          await supabase.from("person_details_private").upsert(normalizedData);
        } else {
          await supabase.from("person_details_private").delete().eq("person_id", currentPersonId);
        }
      }

      if (!currentPersonId) throw new Error("Đồng bộ thất bại.");

      if (onSuccess) {
        onSuccess(currentPersonId);
      } else {
        const redirectUrl = familyId
          ? `/dashboard/${familyId}/members/${currentPersonId}`
          : `/dashboard/members/${currentPersonId}`;
        router.push(redirectUrl);
        router.refresh();
      }
    } catch (err) {
      console.error("Error saving member:", err);
      setError((err as Error).message || "Failed to save member");
    } finally {
      setLoading(false);
    }
  };

  const formSectionVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  const inputClasses =
    "bg-white text-stone-900 placeholder-stone-500 block w-full rounded-xl border border-stone-300 shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:bg-white text-sm px-4 py-3 transition-all outline-none!";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
      <motion.div variants={formSectionVariants} initial="hidden" animate="show"
        className="bg-white/80 p-5 sm:p-8 rounded-2xl shadow-sm border border-stone-200/80">
        <h3 className="text-lg sm:text-xl font-serif font-bold text-stone-800 mb-6 border-b border-stone-100 pb-4 flex items-center gap-2">
          <User className="size-5 text-amber-600" /> Thông tin chung
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Họ và Tên <span className="text-red-500">*</span></label>
            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClasses} placeholder="Nhập họ và tên..." />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Tên gọi khác</label>
            <input type="text" value={otherNames} onChange={(e) => setOtherNames(e.target.value)} className={inputClasses} placeholder="Nickname, tên thánh, bí danh..." />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Giới tính <span className="text-red-500">*</span></label>
            <div className="relative">
              <select value={gender} onChange={(e) => setGender(e.target.value as Gender)} className={`${inputClasses} appearance-none`}>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-stone-500">
                <Settings2 className="size-4" />
              </div>
            </div>
          </div>
          <div className="flex items-center sm:mt-7 mt-2">
            <label className="flex items-center gap-3 group">
              <div className="relative flex items-center">
                <input type="checkbox" checked={isInLaw} onChange={(e) => setIsInLaw(e.target.checked)} className="peer sr-only" />
                <div className="size-5 border-2 border-stone-300 rounded peer-checked:bg-amber-500 peer-checked:border-amber-500 transition-colors flex items-center justify-center">
                  <motion.svg initial={false} animate={{ opacity: isInLaw ? 1 : 0, scale: isInLaw ? 1 : 0.5 }}
                    className="size-3 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </motion.svg>
                </div>
              </div>
              <span className="text-sm font-semibold text-stone-700 group-hover:text-amber-700 transition-colors">Là con Dâu hoặc con Rể</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Thứ tự sinh trong gia đình</label>
            <input type="number" min="1" placeholder="Ví dụ: 1 (con trưởng), 2 (con thứ hai)..." value={birthOrder} onChange={(e) => setBirthOrder(e.target.value ? Number(e.target.value) : "")} className={inputClasses} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Thuộc đời thứ</label>
            <input type="number" min="1" placeholder="Ví dụ: 1, 2, 3..." value={generation} onChange={(e) => setGeneration(e.target.value ? Number(e.target.value) : "")} className={inputClasses} />
          </div>
          <div className="md:col-span-2 mt-2">
            <label className="block text-sm font-semibold text-stone-700 mb-2.5">Ảnh đại diện</label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 bg-stone-50/50 p-4 rounded-xl border border-stone-100">
              <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-xl font-bold text-white overflow-hidden shrink-0 shadow-md border-4 border-white
                ${!avatarPreview ? (gender === "male" ? "bg-linear-to-br from-sky-400 to-sky-700" : gender === "female" ? "bg-linear-to-br from-rose-400 to-rose-700" : "bg-linear-to-br from-stone-400 to-stone-600") : ""}`}>
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="opacity-90">{fullName ? fullName.charAt(0).toUpperCase() : "?"}</span>
                )}
              </div>
              <div className="flex-1 w-full">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <input type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); } }} className="absolute inset-0 w-full h-full opacity-0" />
                    <button type="button" className="flex items-center gap-2 text-sm font-medium px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200/50 hover:bg-amber-100 transition-colors rounded-lg">
                      <ImageIcon className="size-4" /> Chọn ảnh mới
                    </button>
                  </div>
                  {avatarPreview && (
                    <button type="button" onClick={async () => {
                      if (initialData?.avatar_url && avatarUrl === initialData.avatar_url) {
                        try {
                          const fileName = initialData.avatar_url.split("/").pop();
                          if (fileName) await supabase.storage.from("avatars").remove([fileName]);
                        } catch {}
                      }
                      setAvatarUrl(""); setAvatarFile(null); setAvatarPreview(null);
                    }} className="flex items-center gap-2 text-sm text-rose-600 font-medium px-4 py-2 border border-rose-200 rounded-lg bg-rose-50 hover:bg-rose-100 transition-colors">
                      <Trash2 className="size-4" /> Xóa ảnh
                    </button>
                  )}
                </div>
                <p className="mt-2.5 text-xs text-stone-500 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-stone-400" /> Hỗ trợ PNG, JPG, GIF tối đa 2MB.
                </p>
              </div>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Ngày sinh dương lịch</label>
            <div className="grid grid-cols-3 gap-3">
              <input type="number" placeholder="Ngày" min="1" max="31" value={birthDay} onChange={(e) => setBirthDay(e.target.value ? Number(e.target.value) : "")} className={inputClasses} />
              <input type="number" placeholder="Tháng" min="1" max="12" value={birthMonth} onChange={(e) => setBirthMonth(e.target.value ? Number(e.target.value) : "")} className={inputClasses} />
              <input type="number" placeholder="Năm" value={birthYear} onChange={(e) => setBirthYear(e.target.value ? Number(e.target.value) : "")} className={inputClasses} />
            </div>
          </div>
          <div className="md:col-span-2 bg-stone-50/50 p-5 rounded-2xl border border-stone-200/60 shadow-xs">
            <label className="flex items-center gap-3 group">
              <div className="relative flex items-center">
                <input type="checkbox" checked={isDeceased} onChange={(e) => { setIsDeceased(e.target.checked); if (!e.target.checked) { setDeathYear(""); setDeathMonth(""); setDeathDay(""); setDeathLunarYear(""); setDeathLunarMonth(""); setDeathLunarDay(""); } }} className="peer sr-only" />
                <div className="size-5 border-2 border-stone-300 rounded peer-checked:bg-stone-600 peer-checked:border-stone-600 transition-colors flex items-center justify-center">
                  <motion.svg initial={false} animate={{ opacity: isDeceased ? 1 : 0, scale: isDeceased ? 1 : 0.5 }}
                    className="size-3 text-white pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </motion.svg>
                </div>
              </div>
              <span className="text-sm font-semibold text-stone-700">Đã mất</span>
            </label>
            <AnimatePresence>
              {isDeceased && (
                <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: "auto", marginTop: 20 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} className="overflow-hidden">
                  <p className="text-[13px] text-stone-500 mb-4 italic">* Nhập Ngày Dương lịch hoặc Ngày Âm lịch. Hệ thống sẽ tự động tính toán phần còn lại.</p>
                  <div className="flex flex-col gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-stone-700 mb-2">Ngày mất (Âm lịch)</label>
                      <div className="grid grid-cols-3 gap-3">
                        <input type="number" placeholder="Ngày" min="1" max="31" value={deathLunarDay} onChange={(e) => handleLunarDeathChange("day", e.target.value)} className={inputClasses} />
                        <input type="number" placeholder="Tháng" min="1" max="12" value={deathLunarMonth} onChange={(e) => handleLunarDeathChange("month", e.target.value)} className={inputClasses} />
                        <input type="number" placeholder="Năm" value={deathLunarYear} onChange={(e) => handleLunarDeathChange("year", e.target.value)} className={inputClasses} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-stone-700 mb-2">Ngày mất (Dương lịch)</label>
                      <div className="grid grid-cols-3 gap-3">
                        <input type="number" placeholder="Ngày" min="1" max="31" value={deathDay} onChange={(e) => handleSolarDeathChange("day", e.target.value)} className={inputClasses} />
                        <input type="number" placeholder="Tháng" min="1" max="12" value={deathMonth} onChange={(e) => handleSolarDeathChange("month", e.target.value)} className={inputClasses} />
                        <input type="number" placeholder="Năm" value={deathYear} onChange={(e) => handleSolarDeathChange("year", e.target.value)} className={inputClasses} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-stone-700 mb-1.5">Ghi chú</label>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Thêm thông tin bổ sung, tiểu sử..." className={`${inputClasses} resize-none`} />
          </div>
        </div>
      </motion.div>

      {/* Thông tin bổ sung — mở cho tất cả người dùng có quyền chỉnh sửa */}
      <motion.div variants={formSectionVariants} initial="hidden" animate="show" transition={{ delay: 0.1 }}
        className="bg-white/80 p-5 sm:p-8 rounded-2xl shadow-sm border border-stone-200/80">
        <h3 className="text-lg sm:text-xl font-serif font-bold text-stone-800 mb-6 border-b border-stone-100 pb-4 flex items-center gap-2">
          <Phone className="size-5 text-amber-600" /> Thông tin liên hệ
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-stone-700 mb-1.5"><Phone className="size-4" /> Số điện thoại</label>
            <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} disabled={isDeceased} placeholder="Ví dụ: 0912345678" className={`${inputClasses} disabled:bg-stone-100 disabled:text-stone-400 disabled:cursor-not-allowed`} />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-stone-700 mb-1.5"><Briefcase className="size-4" /> Nghề nghiệp</label>
            <input type="text" value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="Ví dụ: Kỹ sư, Bác sĩ..." className={inputClasses} />
          </div>
          <div className="md:col-span-2">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-stone-700 mb-1.5"><MapPin className="size-4" /> Nơi ở hiện tại</label>
            <input type="text" value={currentResidence} onChange={(e) => setCurrentResidence(e.target.value)} placeholder="Địa chỉ cư trú..." className={inputClasses} />
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="text-rose-700 text-sm font-medium bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start gap-3 shadow-sm">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={formSectionVariants} initial="hidden" animate="show" transition={{ delay: 0.2 }}
        className="flex justify-end gap-3 sm:gap-4 pt-6">
        <button type="button" onClick={() => (onCancel ? onCancel() : router.back())} className="btn">Hủy bỏ</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading && <Loader2 className="size-4 animate-spin" />}
          {loading ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Thêm thành viên"}
        </button>
      </motion.div>
    </form>
  );
}
