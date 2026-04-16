"use client";

import { useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { Image as ImageIcon, Send, Trash2, Loader2 } from "lucide-react";

interface Announcement {
  id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  author_id: string;
}

interface Props {
  familyId: string;
  canEdit: boolean;
  userId: string;
  initialAnnouncements: Announcement[];
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

export default function AnnouncementBoard({ familyId, canEdit, userId, initialAnnouncements }: Props) {
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
    <div className="space-y-4">
      {/* Form đăng bài */}
      {canEdit && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4 space-y-3">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Bảng tin</p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Chia sẻ tin tức, thông báo với gia đình..."
            rows={3}
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
          />

          {imagePreview && (
            <div className="relative inline-block">
              <img src={imagePreview} alt="preview" className="max-h-48 rounded-xl object-cover border border-stone-200" />
              <button
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-amber-600 transition"
            >
              <ImageIcon className="w-4 h-4" />
              Thêm ảnh
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

            <button
              onClick={handlePost}
              disabled={posting || (!content.trim() && !imageFile)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition disabled:opacity-50"
            >
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Đăng
            </button>
          </div>
        </div>
      )}

      {/* Danh sách bài */}
      {announcements.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 text-center">
          <p className="text-stone-400 text-sm">Chưa có thông báo nào.</p>
          {canEdit && <p className="text-stone-300 text-xs mt-1">Hãy đăng bài đầu tiên!</p>}
        </div>
      ) : (
        announcements.map((a) => (
          <div key={a.id} className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                  {a.author_id.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-xs text-stone-400">{timeAgo(a.created_at)}</span>
              </div>
              {(canEdit || a.author_id === userId) && (
                <button
                  onClick={() => handleDelete(a.id)}
                  disabled={deletingId === a.id}
                  className="text-stone-300 hover:text-red-400 transition"
                >
                  {deletingId === a.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />}
                </button>
              )}
            </div>

            {a.image_url && (
              <img
                src={a.image_url}
                alt="announcement"
                className="w-full max-h-80 object-cover rounded-xl border border-stone-100"
              />
            )}
            {a.content && (
              <p className="text-sm text-stone-700 whitespace-pre-wrap">{a.content}</p>
            )}
          </div>
        ))
      )}
    </div>
  );
}
