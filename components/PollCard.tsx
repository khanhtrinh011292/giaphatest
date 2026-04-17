"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { BarChart2, Clock, CheckCircle2 } from "lucide-react";

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
      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft("");
        return;
      }
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

export default function PollCard({ announcementId, userId }: Props) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);
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
    const { data } = await supabase
      .from("poll_votes")
      .select("option_id, user_id")
      .eq("poll_id", poll.id);
    setVotes(data || []);
    setMyVote(data?.find((v) => v.user_id === userId)?.option_id || null);
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
          const count = votes.filter((v) => v.option_id === opt.id).length;
          const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isChosen = myVote === opt.id;

          return (
            <button
              key={opt.id}
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
                {showResults && (
                  <span className={`text-xs font-bold ml-2 shrink-0 ${ isChosen ? "text-amber-700" : "text-stone-400" }`}>
                    {percent}%
                  </span>
                )}
              </div>
            </button>
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
