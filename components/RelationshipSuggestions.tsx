"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, ChevronDown, ChevronUp, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";

interface Person {
  id: string;
  full_name: string;
  birth_year: number | null;
  gender: string;
  is_deceased: boolean;
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
  reason: string;
  confidence: "high" | "medium" | "low";
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
}: {
  persons: Person[];
  relationships: Relationship[];
  onAddRelationship?: (parentId: string, childId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Build existing relationship set to avoid duplicates
  const existingPairs = useMemo(() => {
    const set = new Set<string>();
    for (const r of relationships) {
      set.add(`${r.person_a}-${r.person_b}`);
      set.add(`${r.person_b}-${r.person_a}`);
    }
    return set;
  }, [relationships]);

  // Persons with no parent
  const personParents = useMemo(() => {
    const childIds = new Set(
      relationships
        .filter((r) => r.type === "biological_child" || r.type === "adopted_child")
        .map((r) => r.person_b)
    );
    return childIds;
  }, [relationships]);

  const suggestions = useMemo(() => {
    const result: Suggestion[] = [];

    for (const candidate of persons) {
      // Skip if already has a parent
      if (personParents.has(candidate.id)) continue;

      for (const parent of persons) {
        if (parent.id === candidate.id) continue;
        if (existingPairs.has(`${parent.id}-${candidate.id}`)) continue;

        // Generation check
        const genDiff = (candidate.generation ?? 0) - (parent.generation ?? 0);
        if (genDiff !== 1) continue;

        // Birth year plausibility
        const yearDiff = (candidate.birth_year ?? 0) - (parent.birth_year ?? 0);
        if (candidate.birth_year && parent.birth_year) {
          if (yearDiff < 15 || yearDiff > 55) continue;
        }

        // Name similarity
        const candidateLast = getLastName(candidate.full_name);
        const parentLast = getLastName(parent.full_name);
        const parentMiddle = getMiddleName(parent.full_name);

        let confidence: "high" | "medium" | "low" = "low";
        let reason = "";

        if (
          candidateLast === parentLast &&
          candidate.birth_year && parent.birth_year
        ) {
          confidence = "high";
          reason = `Cùng họ "${candidateLast}", chênh ${yearDiff} tuổi, đời ${parent.generation} → ${candidate.generation}`;
        } else if (candidateLast === parentMiddle && parentMiddle) {
          confidence = "medium";
          reason = `Tên đệm "${parentMiddle}" khớp họ con, đời ${parent.generation} → ${candidate.generation}`;
        } else if (genDiff === 1 && yearDiff >= 18 && yearDiff <= 45) {
          confidence = "low";
          reason = `Đời liền kề (đời ${parent.generation} → ${candidate.generation}), chênh ${yearDiff ?? "?"} tuổi`;
        } else {
          continue;
        }

        result.push({ personA: parent, personB: candidate, reason, confidence });

        if (result.length >= 20) break;
      }
      if (result.length >= 20) break;
    }

    // Sort: high > medium > low
    const order = { high: 0, medium: 1, low: 2 };
    return result.sort((a, b) => order[a.confidence] - order[b.confidence]);
  }, [persons, relationships, existingPairs, personParents]);

  if (suggestions.length === 0) return null;

  const visible = expanded ? suggestions : suggestions.slice(0, 3);

  const confidenceBadge = (c: "high" | "medium" | "low") => {
    if (c === "high") return "bg-green-100 text-green-700";
    if (c === "medium") return "bg-amber-100 text-amber-700";
    return "bg-stone-100 text-stone-500";
  };
  const confidenceLabel = (c: "high" | "medium" | "low") => {
    if (c === "high") return "Khả năng cao";
    if (c === "medium") return "Có thể";
    return "Gợi ý";
  };

  return (
    <div className="bg-amber-50/60 border border-amber-200/60 rounded-3xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="size-5 text-amber-600 shrink-0" />
        <h3 className="font-semibold text-stone-800 text-sm">Gợi ý quan hệ</h3>
        <span className="ml-auto text-xs text-amber-600 bg-amber-100 rounded-full px-2 py-0.5 font-semibold">
          {suggestions.length} gợi ý
        </span>
      </div>
      <p className="text-xs text-stone-500">Dựa trên họ tên, năm sinh và thế hệ — xác nhận trước khi thêm.</p>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {visible.map((s, i) => (
            <motion.div
              key={`${s.personA.id}-${s.personB.id}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white/90 rounded-2xl border border-stone-200/60 p-3.5 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold text-stone-800 truncate">{s.personA.full_name}</span>
                  <span className="text-xs text-stone-400">→ con →</span>
                  <span className="text-sm font-semibold text-stone-800 truncate">{s.personB.full_name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${confidenceBadge(s.confidence)}`}>
                    {confidenceLabel(s.confidence)}
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">{s.reason}</p>
              </div>
              {onAddRelationship && (
                <button
                  onClick={() => onAddRelationship(s.personA.id, s.personB.id)}
                  className="shrink-0 size-8 flex items-center justify-center rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                  title="Thêm quan hệ này"
                >
                  <UserPlus className="size-4" />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {suggestions.length > 3 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors py-1"
        >
          {expanded ? <><ChevronUp className="size-3.5" /> Thu gọn</> : <><ChevronDown className="size-3.5" /> Xem thêm {suggestions.length - 3} gợi ý</>}
        </button>
      )}
    </div>
  );
}
