"use client";

import { useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { ImagePlus, Send, Trash2, Loader2, Newspaper, BarChart2, Plus, Minus, X } from "lucide-react";
import PollCard from "./PollCard";

interface Announcement {
  id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  author_id: string;
}

interface PollDraft {
  question: string;
  options: string[];
  expiresHours: number;
}

interface Props {
  familyId: string;
  isOwner: boolean;
  userId: string;
  initialAnnouncements: Announcement[];
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const DEFAULT_POLL: PollDraft = { question: "", options: ["", ""], expiresHours: 24 };

export default function AnnouncementBoard({ familyId, isOwner, userId, initialAnnouncements }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showPollForm, setShowPollForm] = useState(false);
  const [poll, setPoll] = useState<PollDraft>(DEFAULT_POLL);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function updateOption(idx: number, val: string) {
    setPoll((p) => { const opts = [...p.options]; opts[idx] = val; return { ...p, options: opts }; });
  }

  function addOption() {
    if (poll.options.length >= 6) return;
    setPoll((p) => ({ ...p, options: [...p.options, ""] }));
  }

  function removeOption(idx: number) {
    if (poll.options.length <= 2) return;
    setPoll((p) => ({ ...p, options: p.options.filter((_, i) => i !== idx) }));
  }

  async function handlePost() {
    if (!content.trim() && !imageFile && !showPollForm) return;
    if (showPollForm && (!poll.question.trim() || poll.options.filter(Boolean).length < 2)) return;
    setPosting(true);
    try {
      let image_url: string | null = null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `announcements/${familyId}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("family-assets")
          .upload(path, imageFile, { upsert: true });
        if (!uploadErr) {
          const { data } = supabase.storage.from("family-assets").getPublicUrl(path);
          image_url = data.publicUrl;
        }
      }

      const { data, error } = await supabase
        .from("announcements")
        .insert({ family_id: familyId, author_id: userId, content: content.trim() || null, image_url })
        .select("id, content, image_url, created_at, author_id")
        .single();

      if (!error && data) {
        // Tạo poll nếu có
        if (showPollForm && poll.question.trim()) {
          const validOptions = poll.options
            .filter(Boolean)
            .map((label, i) => ({ id: `opt_${i + 1}`, label }));
          const expiresAt = new Date(Date.now() + poll.expiresHours * 3600 * 1000).toISOString();
          await supabase.from("polls").insert({
            announcement_id: data.id,
            family_id: familyId,
            question: poll.question.trim(),
            options: validOptions,
            expires_at: expiresAt,
          });
        }

        setAnnouncements((prev) => [data, ...prev]);
        setContent("");
        setImageFile(null);
        setImagePreview(null);
        setShowPollForm(false);
        setPoll(DEFAULT_POLL);
        if (fileRef.current) fileRef.current.value = "";
      }
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const { error } = await supabase.from("announcements").delete().eq("id", id);
    if (!error) setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    setDeletingId(null);
  }

  const canPost = content.trim() || imageFile || (showPollForm && poll.question.trim() && poll.options.filter(Boolean).length >= 2);

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Newspaper className="w-4 h-4 text-amber-500" />
        <h2 className="text-sm font-bold text-stone-700 uppercase tracking-wider">Bảng tin</h2>
      </div>

      {/* Form đăng — chỉ owner */}
      {isOwner && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-4 space-y-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Chia sẻ tin tức, thông báo với gia đình..."
              rows={3}
              className="w-full text-sm text-stone-800 placeholder:text-stone-300 resize-none focus:outline-none bg-transparent"
            />

            {/* Preview ảnh */}
            {imagePreview && (
              <div className="relative inline-block">
                <img src={imagePreview} alt="preview" className="max-h-52 rounded-xl object-cover border border-stone-100" />
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="absolute top-1.5 right-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Form tạo poll */}
            {showPollForm && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                    <BarChart2 className="w-3.5 h-3.5" /> Câu hỏi vote
                  </span>
                  <button onClick={() => { setShowPollForm(false); setPoll(DEFAULT_POLL); }} className="text-stone-400 hover:text-red-400 transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <input
                  value={poll.question}
                  onChange={(e) => setPoll((p) => ({ ...p, question: e.target.value }))}
                  placeholder="Nhập câu hỏi..."
                  className="w-full text-sm border border-amber-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
                />

                <div className="space-y-1.5">
                  {poll.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <input
                        value={opt}
                        onChange={(e) => updateOption(i, e.target.value)}
                        placeholder={`Lựa chọn ${i + 1}`}
                        className="flex-1 text-sm border border-amber-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
                      />
                      {poll.options.length > 2 && (
                        <button onClick={() => removeOption(i)} className="text-stone-300 hover:text-red-400 transition">
                          <Minus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {poll.options.length < 6 && (
                    <button onClick={addOption} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 transition">
                      <Plus className="w-3.5 h-3.5" /> Thêm lựa chọn
                    </button>
                  )}
                </div>

                {/* Thời gian hết hạn */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500 shrink-0">Hết hạn sau:</span>
                  <select
                    value={poll.expiresHours}
                    onChange={(e) => setPoll((p) => ({ ...p, expiresHours: Number(e.target.value) }))}
                    className="text-xs border border-amber-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
                  >
                    <option value={1}>1 giờ</option>
                    <option value={6}>6 giờ</option>
                    <option value={12}>12 giờ</option>
                    <option value={24}>1 ngày</option>
                    <option value={72}>3 ngày</option>
                    <option value={168}>7 ngày</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-stone-50 border-t border-stone-100">
            <div className="flex items-center gap-3">
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 text-xs font-medium text-stone-400 hover:text-amber-600 transition"
              >
                <ImagePlus className="w-4 h-4" />
                Thêm ảnh
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

              <button
                onClick={() => setShowPollForm((v) => !v)}
                className={`flex items-center gap-1.5 text-xs font-medium transition ${ showPollForm ? "text-amber-600" : "text-stone-400 hover:text-amber-600" }`}
              >
                <BarChart2 className="w-4 h-4" />
                Tạo vote
              </button>
            </div>

            <button
              onClick={handlePost}
              disabled={posting || !canPost}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition disabled:opacity-40"
            >
              {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Đăng
            </button>
          </div>
        </div>
      )}

      {/* Feed bài đăng */}
      {announcements.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 py-10 text-center">
          <p className="text-2xl mb-2">📭</p>
          <p className="text-sm text-stone-400">Chưa có thông báo nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <article key={a.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              {a.image_url && (
                <img src={a.image_url} alt="" className="w-full max-h-72 object-cover" />
              )}

              <div className="px-4 py-3">
                {a.content && (
                  <p className="text-sm text-stone-800 whitespace-pre-wrap leading-relaxed">{a.content}</p>
                )}

                {/* Poll card */}
                <PollCard announcementId={a.id} userId={userId} />

                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-stone-400">{timeAgo(a.created_at)}</span>
                  {(isOwner || a.author_id === userId) && (
                    <button
                      onClick={() => handleDelete(a.id)}
                      disabled={deletingId === a.id}
                      className="flex items-center gap-1 text-xs text-stone-300 hover:text-red-400 transition"
                    >
                      {deletingId === a.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
