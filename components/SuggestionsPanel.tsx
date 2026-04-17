"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, useTransition } from "react";
import { confirmSuggestedRelationship } from "@/app/actions/member";
import RelationshipSuggestions from "./RelationshipSuggestions";
import { useDashboard } from "./DashboardContext";

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

export default function SuggestionsPanel({
  familyId,
  persons,
  relationships,
  canEdit = false,
}: {
  familyId: string;
  persons: Person[];
  relationships: Relationship[];
  canEdit?: boolean;
}) {
  const { showSuggestions } = useDashboard();
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  // Không hiển thị với viewer
  if (!canEdit) return null;

  const handleAdd = (parentId: string, childId: string) => {
    const key = `${parentId}-${childId}`;
    setLoadingKey(key);
    setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });

    startTransition(async () => {
      const result = await confirmSuggestedRelationship(familyId, parentId, childId);
      setLoadingKey(null);
      if (result?.error) {
        setErrors((prev) => ({ ...prev, [key]: result.error }));
      } else {
        setConfirmed((prev) => new Set([...prev, key]));
      }
    });
  };

  return (
    <AnimatePresence>
      {showSuggestions && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="overflow-hidden max-w-3xl mx-auto w-full px-4 pb-2"
        >
          <RelationshipSuggestions
            persons={persons}
            relationships={relationships}
            confirmedKeys={confirmed}
            errorKeys={errors}
            loadingKey={loadingKey}
            onAddRelationship={handleAdd}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
