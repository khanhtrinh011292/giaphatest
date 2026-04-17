"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { BarChart2, Clock, CheckCircle2, Users, X } from "lucide-react";

interface PollOption {
  id: string;
  label: string;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  expires_at: string;
}

interface PollVote {
  option_id: string;
  user_id: string;
  display_name?: string;
}

interface Props {
  announcementId: string;
  userId: string;
}

function useCountdown(expiresAt: string) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    function update() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setIsExpired(true); setTimeLeft(""); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 0) setTimeLeft(`${h}g ${m}p`);
      else if (m > 0) setTimeLeft(`${m}p ${s}s`);
      else setTimeLeft(`${s}s`);
    }
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  return { timeLeft, isExpired };
}

// Popup danh sách người vote
function VoterPopup({
  optionLabel,
  voters,
  onClose,
  anchorRef,
}: {
  optionLabel: string;
  voters: PollVote[];
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        popupRef.current && !popupRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose, anchorRef]);

  return (
    <div
      ref={popupRef}
      className="absolute right-0 top-full mt-1.5 z-50 w-52 bg-white rounded-xl shadow-lg border border-stone-100 overflow-hidden"
    >
      <div className="flex items-center justify-between px-3 py-2 bg-amber-50 border-b border-amber-100">
        <span className="text-xs font-semibold text-amber-800 truncate max-w-[160px]">{optionLabel}</span>
        <button onClick={onClose} className="text-stone-400 hover:text-stone-600 ml-1 shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {voters.length === 0 ? (
        <p className="text-xs text-stone-400 text-center py-4">Chưa có ai chọn</p>
      ) : (
        <ul className="max-h-48 overflow-y-auto divide-y divide-stone-50">
          {voters.map((v) => (
            <li key={v.user_id} className="flex items-center gap-2 px-3 py-2">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-amber-600">
                  {(v.display_name || "?")[0].toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-stone-700 truncate">{v.display_name || "Thành viên"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PollCard({ announcementId, userId }: Props) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
  const [openPopup, setOpenPopup] = useState<string | null>(null);
  const popupAnchorRefs = useRef<Record<string, React.RefObject<HTMLElement | null>>>({});
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("polls")
      .select("id, question, options, expires_at")
      .eq("announcement_id", announcementId)
      .maybeSingle()
      .then(({ data }) => setPoll(data));
  }, [announcementId]);

  const fetchVotes = useCallback(async () => {
    if (!poll) return;
    // Join với profiles để lấy display_name
    const { data } = await supabase
      .from("poll_votes")
      .select("option_id, user_id, profiles(display_name)")
      .eq("poll_id", poll.id);
    const mapped: PollVote[] = (data || []).map((v: any) => ({
      option_id: v.option_id,
      user_id: v.user_id,
      display_name: v.profiles?.display_name ?? undefined,
    }));
    setVotes(mapped);
    setMyVote(mapped.find((v) => v.user_id === userId)?.option_id || null);
  }, [poll, userId]);

  useEffect(() => {
    if (!poll) return;
    fetchVotes();
    const channel = supabase
      .channel(`poll-${poll.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes", filter: `poll_id=eq.${poll.id}` }, fetchVotes)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [poll, fetchVotes]);

  const { timeLeft, isExpired } = useCountdown(poll?.expires_at ?? new Date().toISOString());

  async function handleVote(optionId: string) {
    if (!poll || isExpired || myVote || voting) return;
    setVoting(true);
    await supabase.from("poll_votes").insert({ poll_id: poll.id, user_id: userId, option_id: optionId });
    setVoting(false);
  }

  function getOrCreateRef(optId: string) {
    if (!popupAnchorRefs.current[optId]) {
      popupAnchorRefs.current[optId] = { current: null };
    }
    return popupAnchorRefs.current[optId];
  }

  if (!poll) return null;

  const totalVotes = votes.length;
  const showResults = isExpired || !!myVote;

  return (
    <div className="mt-3 bg-amber-50 border border-amber-100 rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <BarChart2 className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm font-semibold text-stone-800">{poll.question}</p>
        </div>
        <div className="shrink-0">
          {isExpired ? (
            <span className="flex items-center gap-1 text-xs font-medium text-stone-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Đã kết thúc
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
              <Clock className="w-3.5 h-3.5" /> {timeLeft}
            </span>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {poll.options.map((opt) => {
          const optVoters = votes.filter((v) => v.option_id === opt.id);
          const count = optVoters.length;
          const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isChosen = myVote === opt.id;
          const anchorRef = getOrCreateRef(opt.id);

          return (
            <div key={opt.id} className="relative">
              <button
                onClick={() => handleVote(opt.id)}
                disabled={isExpired || !!myVote || voting}
                className={`w-full text-left rounded-xl overflow-hidden relative transition
                  ${ !showResults ? "border border-amber-200 bg-white hover:border-amber-400 hover:bg-amber-50 active:scale-[.99]" : "border border-transparent" }
                  ${ isChosen ? "ring-2 ring-amber-400" : "" }
                `}
              >
                {/* Progress bar */}
                {showResults && (
                  <div
                    className={`absolute inset-y-0 left-0 rounded-xl transition-all duration-700 ${ isChosen ? "bg-amber-200" : "bg-stone-100" }`}
                    style={{ width: `${percent}%` }}
                  />
                )}
                <div className="relative z-10 flex items-center justify-between px-3 py-2">
                  <span className={`text-sm ${ isChosen ? "font-semibold text-amber-800" : "text-stone-700" }`}>
                    {isChosen && <span className="mr-1">✓</span>}{opt.label}
                  </span>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    {showResults && (
                      <span className={`text-xs font-bold ${ isChosen ? "text-amber-700" : "text-stone-400" }`}>
                        {percent}%
                      </span>
                    )}
                    {/* Nút xem người vote */}
                    {showResults && count > 0 && (
                      <button
                        ref={anchorRef as React.RefObject<HTMLButtonElement>}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenPopup(openPopup === opt.id ? null : opt.id);
                        }}
                        className="flex items-center gap-0.5 text-xs text-stone-400 hover:text-amber-600 transition"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{count}</span>
                      </button>
                    )}
                  </div>
                </div>
              </button>

              {/* Voter popup */}
              {openPopup === opt.id && (
                <VoterPopup
                  optionLabel={opt.label}
                  voters={optVoters}
                  onClose={() => setOpenPopup(null)}
                  anchorRef={anchorRef}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="text-xs text-stone-400 text-right">
        {totalVotes} phiếu bầu
        {!isExpired && !myVote && " · Chọn 1 đáp án"}
      </p>
    </div>
  );
}
