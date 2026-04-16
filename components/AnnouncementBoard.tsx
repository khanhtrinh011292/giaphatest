"use client";

import { useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { ImagePlus, Send, Trash2, Loader2, Newspaper } from "lucide-react";

interface Announcement {
  id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  author_id: string;
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

export default function AnnouncementBoard({ familyId, isOwner, userId, initialAnnouncements }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handlePost() {
    if (!content.trim() && !imageFile) return;
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
        setAnnouncements((prev) => [data, ...prev]);
        setContent("");
        setImageFile(null);
        setImagePreview(null);
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

  return (
    <section className="space-y-3">
      {/* Header section */}
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
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-stone-50 border-t border-stone-100">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-xs font-medium text-stone-400 hover:text-amber-600 transition"
            >
              <ImagePlus className="w-4 h-4" />
              Thêm ảnh
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

            <button
              onClick={handlePost}
              disabled={posting || (!content.trim() && !imageFile)}
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
          <p className="text-2xl mb-2">\uD83D\uDCEC</p>
          <p className="text-sm text-stone-400">Chưa có thông báo nào</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <article key={a.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              {/* Ảnh đầy đủ chiều ngang */}
              {a.image_url && (
                <img
                  src={a.image_url}
                  alt=""
                  className="w-full max-h-72 object-cover"
                />
              )}

              <div className="px-4 py-3">
                {a.content && (
                  <p className="text-sm text-stone-800 whitespace-pre-wrap leading-relaxed">{a.content}</p>
                )}

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
