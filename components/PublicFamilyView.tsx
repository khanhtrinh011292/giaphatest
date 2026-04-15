"use client";

import { motion } from "framer-motion";
import { BookOpen, Calendar, Search, TreePine, Users } from "lucide-react";
import { useMemo, useState } from "react";

interface Person {
  id: string;
  full_name: string;
  gender: string;
  birth_year: number | null;
  birth_month: number | null;
  birth_day: number | null;
  death_year: number | null;
  is_deceased: boolean;
  generation: number | null;
  birth_order: number | null;
  avatar_url: string | null;
  note: string | null;
  other_names: string | null;
}

interface Relationship {
  id: string;
  type: string;
  person_a: string;
  person_b: string;
}

interface Family {
  id: string;
  name: string;
  description: string | null;
}

interface Props {
  family: Family;
  persons: Person[];
  relationships: Relationship[];
  role: string;
  token: string;
}

export default function PublicFamilyView({ family, persons, relationships, token }: Props) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return persons;
    return persons.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        (p.other_names ?? "").toLowerCase().includes(q),
    );
  }, [persons, search]);

  const selected = persons.find((p) => p.id === selectedId);

  const getParents = (personId: string) =>
    relationships
      .filter((r) => (r.type === "biological_child" || r.type === "adopted_child") && r.person_b === personId)
      .map((r) => persons.find((p) => p.id === r.person_a))
      .filter(Boolean) as Person[];

  const getChildren = (personId: string) =>
    relationships
      .filter((r) => (r.type === "biological_child" || r.type === "adopted_child") && r.person_a === personId)
      .map((r) => persons.find((p) => p.id === r.person_b))
      .filter(Boolean) as Person[];

  const getSpouses = (personId: string) =>
    relationships
      .filter((r) => r.type === "marriage" && (r.person_a === personId || r.person_b === personId))
      .map((r) => persons.find((p) => p.id === (r.person_a === personId ? r.person_b : r.person_a)))
      .filter(Boolean) as Person[];

  const generationMap = useMemo(() => {
    const map = new Map<number, Person[]>();
    for (const p of persons) {
      const g = p.generation ?? 0;
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(p);
    }
    return map;
  }, [persons]);

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/view/${token}` : "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/60 to-stone-50 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-stone-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <TreePine className="size-4 text-amber-700" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-stone-800 truncate text-base sm:text-lg">{family.name}</h1>
              <p className="text-xs text-stone-400 hidden sm:block">Chế độ xem công khai — chỉ đọc</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-400 shrink-0">
            <Users className="size-4" />
            <span>{persons.length} thành viên</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Family description */}
        {family.description && (
          <div className="bg-white/80 rounded-2xl border border-stone-200/60 p-5 flex gap-3">
            <BookOpen className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-stone-600 text-sm leading-relaxed">{family.description}</p>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm kiếm thành viên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-stone-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
          />
        </div>

        {/* Member detail panel */}
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-amber-200/60 shadow-md p-6 space-y-4"
          >
            <div className="flex items-start gap-4">
              <div className="size-14 rounded-2xl bg-amber-100 flex items-center justify-center text-2xl font-bold text-amber-700 shrink-0">
                {selected.full_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-stone-800">{selected.full_name}</h2>
                {selected.other_names && <p className="text-sm text-stone-400">{selected.other_names}</p>}
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-stone-500">
                  {selected.birth_year && (
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5" />
                      {selected.birth_year}{selected.is_deceased && selected.death_year ? ` – ${selected.death_year}` : ""}
                    </span>
                  )}
                  {selected.generation && <span className="text-xs px-2 py-0.5 bg-stone-100 rounded-lg">Đời {selected.generation}</span>}
                  {selected.is_deceased && <span className="text-xs px-2 py-0.5 bg-rose-50 text-rose-600 rounded-lg">Đã mất</span>}
                </div>
              </div>
              <button onClick={() => setSelectedId(null)} className="text-stone-300 hover:text-stone-500 text-xl leading-none">&times;</button>
            </div>

            {/* Relations */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {[{ label: "Cha/Mẹ", list: getParents(selected.id) }, { label: "Vợ/Chồng", list: getSpouses(selected.id) }, { label: "Con cái", list: getChildren(selected.id) }].map(({ label, list }) =>
                list.length > 0 ? (
                  <div key={label} className="bg-stone-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">{label}</p>
                    <div className="space-y-1">
                      {list.map((p) => (
                        <button key={p.id} onClick={() => setSelectedId(p.id)}
                          className="w-full text-left text-sm font-medium text-stone-700 hover:text-amber-700 transition-colors truncate block">
                          {p.full_name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </div>

            {selected.note && (
              <div className="text-sm text-stone-500 bg-stone-50 rounded-xl p-3 leading-relaxed">
                {selected.note}
              </div>
            )}
          </motion.div>
        )}

        {/* Members list */}
        {search ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map((p) => (
              <PersonCard key={p.id} person={p} onClick={() => setSelectedId(p.id)} selected={p.id === selectedId} />
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full text-center text-stone-400 py-10">Không tìm thấy thành viên nào</p>
            )}
          </div>
        ) : (
          // Group by generation
          <div className="space-y-6">
            {Array.from(generationMap.entries())
              .sort(([a], [b]) => a - b)
              .map(([gen, members]) => (
                <div key={gen}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                      {gen === 0 ? "Chưa xếp đời" : `Đời ${gen}`}
                    </span>
                    <div className="flex-1 h-px bg-stone-200" />
                    <span className="text-xs text-stone-400">{members.length} người</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {members.map((p) => (
                      <PersonCard key={p.id} person={p} onClick={() => setSelectedId(p.id)} selected={p.id === selectedId} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}

        <p className="text-center text-xs text-stone-400 pt-4">
          Được chia sẻ qua link công khai &middot; <a href="/" className="hover:text-amber-600 transition-colors">GiaPhaOnline.vn</a>
        </p>
      </main>
    </div>
  );
}

function PersonCard({ person, onClick, selected }: { person: Person; onClick: () => void; selected: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-2xl border transition-all hover:shadow-md active:scale-[0.98] ${
        selected ? "border-amber-400 bg-amber-50 shadow-sm" :
        person.is_deceased ? "border-stone-200/60 bg-stone-50/80" :
        "border-stone-200/60 bg-white/80 hover:border-amber-200"
      }`}
    >
      <div className="size-10 rounded-xl bg-amber-100 flex items-center justify-center font-bold text-amber-700 text-base mb-2">
        {person.full_name.charAt(0)}
      </div>
      <p className="text-sm font-semibold text-stone-800 leading-tight truncate">{person.full_name}</p>
      {person.birth_year && (
        <p className="text-xs text-stone-400 mt-0.5">
          {person.birth_year}{person.is_deceased && person.death_year ? ` – ${person.death_year}` : ""}
        </p>
      )}
      {person.is_deceased && <span className="text-[10px] text-rose-400">Đã mất</span>}
    </button>
  );
}
