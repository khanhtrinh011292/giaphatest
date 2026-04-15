"use client";

import { AnimatePresence, motion } from "framer-motion";
import RelationshipSuggestions from "./RelationshipSuggestions";
import { useDashboard } from "./DashboardContext";

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

export default function SuggestionsPanel({
  persons,
  relationships,
}: {
  persons: Person[];
  relationships: Relationship[];
}) {
  const { showSuggestions } = useDashboard();

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
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
