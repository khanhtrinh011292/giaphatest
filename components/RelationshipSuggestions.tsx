"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, UserPlus, XCircle, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Lightbulb } from "lucide-react";

interface Person {
  id: string;
  full_name: string;
  birth_year: number | null;
  gender: string;
  is_deceased: boolean;
  is_in_law: boolean;
  generation: number | null;
}

interface Relationship {
  type: string;
  person_a: string;
  person_b: string;
}

interface Suggestion {
  personA: Person;
  personB: Person;
  tags: string[];
  confidence: "high" | "medium";
}

const DISMISSED_KEY = "dismissed_suggestions";

function getDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveDismissed(set: Set<string>) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set])); } catch {}
}

function getLastName(name: string) {
  const parts = name.trim().split(" ");
  return parts[parts.length - 1].toLowerCase();
}

function getMiddleName(name: string) {
  const parts = name.trim().split(" ");
  return parts.length >= 3 ? parts[parts.length - 2].toLowerCase() : "";
}

export default function RelationshipSuggestions({
  persons,
  relationships,
  onAddRelationship,
  confirmedKeys = new Set(),
  errorKeys = {},
  loadingKey = null,
}: {
  persons: Person[];
  relationships: Relationship[];
  onAddRelationship?: (parentId: string, childId: string) => void;
  confirmedKeys?: Set<string>;
  errorKeys?: Record<string, string>;
  loadingKey?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => getDismissed());

  const dismiss = (key: string) => {
    setDismissed((prev) => {
      const next = new Set([...prev, key]);
      saveDismissed(next);
      return next;
    });
  };

  // Tập các cặp đã có quan hệ
  const existingPairs = useMemo(() => {
    const set = new Set<string>();
    for (const r of relationships) {
      set.add(`${r.person_a}-${r.person_b}`);
      set.add(`${r.person_b}-${r.person_a}`);
    }
    return set;
  }, [relationships]);

  // Map: childId → số cha/mẹ
  const parentCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of relationships) {
      if (r.type === "biological_child" || r.type === "adopted_child") {
        map.set(r.person_b, (map.get(r.person_b) ?? 0) + 1);
      }
    }
    return map;
  }, [relationships]);

  // Map: personId → Set vợ/chồng
  const spouseMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const r of relationships) {
      if (r.type === "marriage") {
        if (!map.has(r.person_a)) map.set(r.person_a, new Set());
        if (!map.has(r.person_b)) map.set(r.person_b, new Set());
        map.get(r.person_a)!.add(r.person_b);
        map.get(r.person_b)!.add(r.person_a);
      }
    }
    return map;
  }, [relationships]);

  // Map: parentId → Set các childId
  const childrenMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const r of relationships) {
      if (r.type === "biological_child" || r.type === "adopted_child") {
        if (!map.has(r.person_a)) map.set(r.person_a, new Set());
        map.get(r.person_a)!.add(r.person_b);
      }
    }
    return map;
  }, [relationships]);

  const suggestions = useMemo(() => {
    const result: Suggestion[] = [];
    const seen = new Set<string>(); // cặp đã xử lý
    const candidateSeen = new Set<string>(); // mỗi candidate chỉ 1 gợi ý tốt nhất

    // Sắp xếp: high confidence được xét trước
    const scored: Array<{ parent: Person; candidate: Person; confidence: "high" | "medium"; tags: string[] }> = [];

    for (const candidate of persons) {
      if (candidate.is_in_law) continue;
      if ((parentCountMap.get(candidate.id) ?? 0) >= 2) continue;
      if (candidate.generation === null) continue;
      if (!candidate.birth_year) continue;

      for (const parent of persons) {
        if (parent.id === candidate.id) continue;
        if (parent.is_in_law) continue;
        if (parent.generation === null) continue;
        if (!parent.birth_year) continue;
        if (existingPairs.has(`${parent.id}-${candidate.id}`)) continue;
        if (existingPairs.has(`${candidate.id}-${parent.id}`)) continue;

        const pairKey = `${parent.id}-${candidate.id}`;
        if (seen.has(pairKey)) continue;

        const genDiff = candidate.generation - parent.generation;
        if (genDiff !== 1) continue;

        const yearDiff = candidate.birth_year - parent.birth_year;
        if (yearDiff < 15 || yearDiff > 55) continue;

        // Kiểm tra con dâu/rể gán tiếp
        const parentChildren = childrenMap.get(parent.id) ?? new Set();
        const candidateSpouses = spouseMap.get(candidate.id) ?? new Set();
        const isInLawOfParent = [...parentChildren].some((cid) => candidateSpouses.has(cid));
        if (isInLawOfParent) continue;

        const candidateLast = getLastName(candidate.full_name);
        const parentLast = getLastName(parent.full_name);
        const parentMiddle = getMiddleName(parent.full_name);

        const tags: string[] = [];
        let confidence: "high" | "medium" | null = null;

        if (candidateLast === parentLast) {
          confidence = "high";
          tags.push(`🔤 Cùng họ "${candidateLast}"`);
        } else if (parentMiddle && candidateLast === parentMiddle) {
          confidence = "medium";
          tags.push(`🔤 Họ khớp tên đệm`);
        } else {
          // Bỏ qua low confidence hoàn toàn
          continue;
        }

        tags.push(`📅 Chênh ${yearDiff} tuổi`);
        tags.push(`🌳 Đời ${parent.generation} → ${candidate.generation}`);

        // Kiểm tra có anh/chị/em cùng parent đã tồn tại → tăng độ tin cậy
        const siblings = [...parentChildren].filter((cid) => {
          const sibling = persons.find((p) => p.id === cid);
          if (!sibling || !sibling.birth_year || !candidate.birth_year) return false;
          return (
            getLastName(sibling.full_name) === candidateLast &&
            Math.abs(sibling.birth_year - candidate.birth_year) <= 25
          );
        });
        if (siblings.length > 0) {
          confidence = "high";
          tags.push(`👨‍👩‍👦 Có ${siblings.length} anh/chị/em cùng họ`);
        }

        seen.add(pairKey);
        scored.push({ parent, candidate, confidence, tags });
      }
    }

    // Sắp xếp: high trước, rồi chứng năng hồ sơ nhất
    scored.sort((a, b) => (a.confidence === b.confidence ? 0 : a.confidence === "high" ? -1 : 1));

    // Giới hạn 1 gợi ý tốt nhất cho mỗi candidate
    for (const s of scored) {
      if (candidateSeen.has(s.candidate.id)) continue;
      candidateSeen.add(s.candidate.id);
      result.push({ personA: s.parent, personB: s.candidate, tags: s.tags, confidence: s.confidence });
      if (result.length >= 20) break;
    }

    return result;
  }, [persons, relationships, existingPairs, parentCountMap, spouseMap, childrenMap]);

  const visible = suggestions.filter((s) => {
    const key = `${s.personA.id}-${s.personB.id}`;
    return !confirmedKeys.has(key) && !dismissed.has(key);
  });
  const shown = expanded ? visible : visible.slice(0, 3);

  if (visible.length === 0) return (
    <div className="bg-green-50/60 border border-green-200/60 rounded-3xl p-5 flex items-center gap-3 text-green-700">
      <CheckCircle2 className="size-5 shrink-0" />
      <p className="text-sm font-semibold">Không có gợi ý nào phù hợp.</p>
    </div>
  );

  const confidenceBadge = (c: "high" | "medium") =>
    c === "high" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700";
  const confidenceLabel = (c: "high" | "medium") =>
    c === "high" ? "Khả năng cao" : "Có thể";

  return (
    <div className="bg-amber-50/60 border border-amber-200/60 rounded-3xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="size-5 text-amber-600 shrink-0" />
        <h3 className="font-semibold text-stone-800 text-sm">Gợi ý quan hệ</h3>
        <span className="ml-auto text-xs text-amber-600 bg-amber-100 rounded-full px-2 py-0.5 font-semibold">
          {visible.length} gợi ý
        </span>
      </div>
      <p className="text-xs text-stone-500">Dựa trên họ tên, năm sinh và thế hệ — xác nhận trước khi thêm.</p>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {shown.map((s) => {
            const key = `${s.personA.id}-${s.personB.id}`;
            const isLoading = loadingKey === key;
            const errMsg = errorKeys[key];

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white/90 rounded-2xl border border-stone-200/60 p-3.5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-stone-800">{s.personA.full_name}</span>
                      <span className="text-xs text-stone-400">→ con →</span>
                      <span className="text-sm font-semibold text-stone-800">{s.personB.full_name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${confidenceBadge(s.confidence)}`}>
                        {confidenceLabel(s.confidence)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {s.tags.map((tag) => (
                        <span key={tag} className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {onAddRelationship && (
                      <button
                        onClick={() => onAddRelationship(s.personA.id, s.personB.id)}
                        disabled={isLoading}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          isLoading
                            ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                            : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                        }`}
                      >
                        {isLoading ? (
                          <><Loader2 className="size-3.5 animate-spin" /> Đang thêm...</>
                        ) : (
                          <><UserPlus className="size-3.5" /> Xác nhận</>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => dismiss(key)}
                      title="Bỏ qua gợi ý này"
                      className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>

                {errMsg && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-red-500">
                    <XCircle className="size-3.5 shrink-0" />
                    {errMsg}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {visible.length > 3 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors py-1"
        >
          {expanded
            ? <><ChevronUp className="size-3.5" /> Thu gọn</>
            : <><ChevronDown className="size-3.5" /> Xem thêm {visible.length - 3} gợi ý</>}
        </button>
      )}
    </div>
  );
}
