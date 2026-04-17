"use client";

import { Person, Relationship } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

interface LineageManagerProps {
  persons: Person[];
  relationships: Relationship[];
}

interface ComputedUpdate {
  id: string;
  full_name: string;
  old_generation: number | null;
  new_generation: number | null;
  old_birth_order: number | null;
  new_birth_order: number | null;
  old_is_in_law: boolean;
  new_is_in_law: boolean;
  gender: string;
  changed: boolean;
}

// ─── Algorithm helpers ────────────────────────────────────────────────────────

function buildMaps(relationships: Relationship[]) {
  const childParents = new Map<string, string[]>(); // childId → [parentId]
  const parentChildren = new Map<string, string[]>(); // parentId → [childId]
  const spouseMap = new Map<string, Set<string>>(); // personId → Set<spouseId>

  for (const r of relationships) {
    if (r.type === "biological_child" || r.type === "adopted_child") {
      if (!childParents.has(r.person_b)) childParents.set(r.person_b, []);
      childParents.get(r.person_b)!.push(r.person_a);
      if (!parentChildren.has(r.person_a)) parentChildren.set(r.person_a, []);
      parentChildren.get(r.person_a)!.push(r.person_b);
    } else if (r.type === "marriage") {
      if (!spouseMap.has(r.person_a)) spouseMap.set(r.person_a, new Set());
      if (!spouseMap.has(r.person_b)) spouseMap.set(r.person_b, new Set());
      spouseMap.get(r.person_a)!.add(r.person_b);
      spouseMap.get(r.person_b)!.add(r.person_a);
    }
  }

  return { childParents, parentChildren, spouseMap };
}

/**
 * Tính generation bằng BFS chuẩn:
 * - Chỉ truyền generation xuống con (parent → child = gen + 1)
 * - Spouse kế thừa generation của bạn đời SAU khi bloodline đã được gán
 * - Dùng Kahn-style topological BFS: mỗi node chỉ được set 1 lần (giá trị nhỏ nhất / sớm nhất)
 * - Đối với gia phả truyền thống Việt Nam: cha đi trước, dùng generation của cha
 */
function computeGenerations(
  persons: Person[],
  relationships: Relationship[],
): Map<string, number> {
  const { childParents, parentChildren, spouseMap } = buildMaps(relationships);
  const genMap = new Map<string, number>();
  const inQueue = new Set<string>();

  // Roots = người không có cha/mẹ và không phải con dâu/rể (tức không có cha/mẹ và hoặc không có vợ/chồng, hoặc vợ/chồng cũng không có cha/mẹ)
  const queue: Array<{ id: string; gen: number }> = [];

  for (const p of persons) {
    if (childParents.has(p.id)) continue; // có cha/mẹ → không phải root
    const spouses = spouseMap.get(p.id) ?? new Set();
    const anySpouseHasParents = [...spouses].some((sid) => childParents.has(sid));
    if (anySpouseHasParents) continue; // đây là dâu/rể → sẽ được xử lý qua spouse
    // Chọn 1 người trong cặp vợ chồng không ai có cha/mẹ — tránh add cả hai
    let isAlreadyCoveredBySpouse = false;
    for (const sid of spouses) {
      if (!childParents.has(sid) && ![...spouseMap.get(sid) ?? []].some((x) => childParents.has(x))) {
        // cả hai đều không có cha/mẹ; chỉ add người có gender=male trước, nếu bằng nhau thì id nhỏ hơn
        const spousePerson = persons.find((x) => x.id === sid);
        const thisPerson = persons.find((x) => x.id === p.id);
        if (
          spousePerson &&
          thisPerson &&
          (spousePerson.gender === "male" && thisPerson.gender !== "male") ||
          (spousePerson?.gender === thisPerson?.gender && sid < p.id)
        ) {
          isAlreadyCoveredBySpouse = true;
          break;
        }
      }
    }
    if (isAlreadyCoveredBySpouse) continue;
    queue.push({ id: p.id, gen: 1 });
    inQueue.add(p.id);
  }

  // BFS: chỉ set generation 1 lần duy nhất cho mỗi node
  let head = 0;
  while (head < queue.length) {
    const { id, gen } = queue[head++];
    if (genMap.has(id)) continue; // đã được xử lý
    genMap.set(id, gen);

    // Spouse kế thừa cùng generation
    for (const spouseId of spouseMap.get(id) ?? []) {
      if (!genMap.has(spouseId) && !inQueue.has(spouseId)) {
        queue.push({ id: spouseId, gen });
        inQueue.add(spouseId);
      }
    }

    // Children được gán gen + 1
    for (const childId of parentChildren.get(id) ?? []) {
      if (!genMap.has(childId) && !inQueue.has(childId)) {
        queue.push({ id: childId, gen: gen + 1 });
        inQueue.add(childId);
      }
    }
  }

  // Fallback: các node chưa có generation (bỏ rời, không có cha/mẹ và không có vợ/chồng)
  // → thử kế thừa qua spouse trước
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of persons) {
      if (genMap.has(p.id)) continue;
      for (const sid of spouseMap.get(p.id) ?? []) {
        if (genMap.has(sid)) {
          genMap.set(p.id, genMap.get(sid)!);
          changed = true;
          break;
        }
      }
    }
  }

  return genMap;
}

/**
 * Xác định is_in_law:
 * - Có cha/mẹ trong hệ thống → không phải dâu/rể
 * - Không có cha/mẹ + không có vợ/chồng → Tổ (không phải dâu/rể)
 * - Không có cha/mẹ + có vợ/chồng có cha/mẹ → là dâu/rể
 * - Cả hai vợ chồng đều không có cha/mẹ → nam = không phải dâu/rể, nữ = dâu
 *   (thuận theo gia phả Việt Nam truyền thống: theo dòng cha)
 *   Trường hợp đặc biệt: 2 nam hoặc 2 nữ → giữ `is_in_law` cũ (tôn trọng người dùng đã cài)
 */
function computeInLaws(
  persons: Person[],
  relationships: Relationship[],
): Map<string, boolean> {
  const { childParents, spouseMap } = buildMaps(relationships);
  const inLawMap = new Map<string, boolean>();

  for (const p of persons) {
    const hasParents = childParents.has(p.id);
    if (hasParents) {
      inLawMap.set(p.id, false);
      continue;
    }

    const spouses = [...(spouseMap.get(p.id) ?? [])];
    if (spouses.length === 0) {
      // Tổ tiên độc lập
      inLawMap.set(p.id, false);
      continue;
    }

    const anySpouseHasParents = spouses.some((sid) => childParents.has(sid));
    if (anySpouseHasParents) {
      inLawMap.set(p.id, true);
      continue;
    }

    // Cả hai không có cha/mẹ — xác định theo giới tính
    const spousePersons = spouses.map((sid) => persons.find((x) => x.id === sid)).filter(Boolean) as Person[];
    const maleSpouses = spousePersons.filter((s) => s.gender === "male");
    const femaleSpouses = spousePersons.filter((s) => s.gender === "female");

    if (p.gender === "female" && maleSpouses.length > 0) {
      // Nữ + có chồng (nam) không có cha/mẹ → nàng dâu
      inLawMap.set(p.id, true);
    } else if (p.gender === "male" && femaleSpouses.length > 0 && maleSpouses.length === 0) {
      // Nam + vợ (nữ) không có cha/mẹ → đây là nam gia phả (không phải dâu/rể)
      inLawMap.set(p.id, false);
    } else {
      // Trường hợp không rõ (same gender couple, …) → giữ giá trị cũ
      inLawMap.set(p.id, p.is_in_law);
    }
  }

  return inLawMap;
}

/**
 * Tính thứ tự sinh:
 * - Nhóm anh/chị/em THEO CHA (person_a của biological/adopted_child)
 * - Chỉ tính cho con máu thịt (không phải dâu/rể)
 * - Sắp xếp theo birth_year tăng dần, gán 1,2,3...
 * - Nếu một đứa con xuất hiện trong cả danh sách của cha LẦN mẹ → nhóm theo CHA (person có cùng họ hoặc generation liền kề)
 * - Thực tế: một đứa con chỉ được gán 1 thứ tự duy nhất dựa trên nhóm anh/chị/em đầy đủ nhất (cha hoặc mẹ có nhiều con hơn)
 */
function computeBirthOrders(
  persons: Person[],
  relationships: Relationship[],
  inLawMap: Map<string, boolean>,
): Map<string, number> {
  const { parentChildren } = buildMaps(relationships);
  const personsById = new Map(persons.map((p) => [p.id, p]));
  const orderMap = new Map<string, number>();

  // Nhóm các con theo từng parent
  // mỗi child có thể nằm trong nhiều nhóm (của cha và của mẹ)
  // Ta chỉ xét nhóm có nhiều con nhất (= nhóm đầy đủ nhất)
  const groupsByChild = new Map<string, string[][]>(); // childId → list of sibling arrays

  for (const [parentId, childIds] of parentChildren) {
    const parent = personsById.get(parentId);
    if (!parent) continue;
    // Lọc bỏ dâu/rể khỏi nhóm
    const bloodlineChildren = Array.from(childIds).filter(
      (cid) => !(inLawMap.get(cid) ?? false)
    );
    if (bloodlineChildren.length === 0) continue;
    for (const cid of bloodlineChildren) {
      if (!groupsByChild.has(cid)) groupsByChild.set(cid, []);
      groupsByChild.get(cid)!.push(bloodlineChildren);
    }
  }

  // Với mỗi child: chọn nhóm đầy đủ nhất (nhiều anh/chị/em nhất) để xếp thứ tự
  const processed = new Map<string, { group: string[]; order: number }>();

  // xử lý từng nhóm riêng biệt, với sorted group
  const processedGroups = new Set<string>();

  for (const [, childIds] of parentChildren) {
    const bloodlineChildren = Array.from(childIds).filter(
      (cid) => !(inLawMap.get(cid) ?? false)
    );
    if (bloodlineChildren.length === 0) continue;

    const groupKey = [...bloodlineChildren].sort().join(",");
    if (processedGroups.has(groupKey)) continue;
    processedGroups.add(groupKey);

    const sorted = [...bloodlineChildren].sort((a, b) => {
      const pa = personsById.get(a);
      const pb = personsById.get(b);
      const aYear = pa?.birth_year ?? Infinity;
      const bYear = pb?.birth_year ?? Infinity;
      if (aYear !== bYear) return aYear - bYear;
      return (pa?.full_name ?? "").localeCompare(pb?.full_name ?? "", "vi");
    });

    sorted.forEach((cid, idx) => {
      const order = idx + 1;
      const existing = processed.get(cid);
      // Chọn nhóm lớn hơn (nhiều anh/chị/em hơn = chuẩn hơn)
      if (!existing || sorted.length > existing.group.length) {
        processed.set(cid, { group: sorted, order });
      }
    });
  }

  for (const [cid, { order }] of processed) {
    orderMap.set(cid, order);
  }

  return orderMap;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LineageManager({
  persons,
  relationships,
}: LineageManagerProps) {
  const supabase = createClient();

  const [updates, setUpdates] = useState<ComputedUpdate[] | null>(null);
  const [computing, setComputing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const handleCompute = () => {
    setComputing(true);
    setApplied(false);
    setError(null);

    try {
      const inLawMap = computeInLaws(persons, relationships);
      const genMap = computeGenerations(persons, relationships);
      const orderMap = computeBirthOrders(persons, relationships, inLawMap);

      const result: ComputedUpdate[] = persons.map((p) => {
        const newGen = genMap.has(p.id) ? genMap.get(p.id)! : null;
        const newOrder = inLawMap.get(p.id) ? null : (orderMap.has(p.id) ? orderMap.get(p.id)! : null);
        const newInLaw = inLawMap.get(p.id) ?? false;

        return {
          id: p.id,
          full_name: p.full_name,
          old_generation: p.generation,
          new_generation: newGen,
          old_birth_order: p.birth_order,
          new_birth_order: newOrder,
          old_is_in_law: p.is_in_law,
          new_is_in_law: newInLaw,
          gender: p.gender,
          changed:
            newGen !== p.generation ||
            newOrder !== p.birth_order ||
            newInLaw !== p.is_in_law,
        };
      });

      result.sort((a, b) => {
        if (a.changed !== b.changed) return a.changed ? -1 : 1;
        const gA = a.new_generation ?? 999;
        const gB = b.new_generation ?? 999;
        if (gA !== gB) return gA - gB;
        const oA = a.new_birth_order ?? 999;
        const oB = b.new_birth_order ?? 999;
        return oA - oB;
      });

      setUpdates(result);
    } catch (err) {
      setError((err as Error).message || "Lỗi tính toán.");
    } finally {
      setComputing(false);
    }
  };

  const handleApply = async () => {
    if (!updates) return;
    setApplying(true);
    setError(null);

    try {
      const changedOnly = updates.filter((u) => u.changed);
      const CHUNK = 20;
      for (let i = 0; i < changedOnly.length; i += CHUNK) {
        const chunk = changedOnly.slice(i, i + CHUNK);
        await Promise.all(
          chunk.map((u) =>
            supabase
              .from("persons")
              .update({
                generation: u.new_generation,
                birth_order: u.new_birth_order,
                is_in_law: u.new_is_in_law,
              })
              .eq("id", u.id),
          ),
        );
      }
      setApplied(true);
    } catch (err) {
      setError((err as Error).message || "Lỗi khi cập nhật dữ liệu.");
    } finally {
      setApplying(false);
    }
  };

  const changedCount = updates?.filter((u) => u.changed).length ?? 0;
  const displayedRows = showAll ? (updates ?? []) : (updates ?? []).slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={handleCompute} disabled={computing || applying} className="btn-secondary">
          {computing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {computing ? "Đang tính..." : "Tính toán"}
        </button>
        {updates && changedCount > 0 && !applied && (
          <button onClick={handleApply} disabled={applying} className="btn-primary">
            {applying ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {applying ? "Đang cập nhật..." : `Áp dụng (${changedCount} thay đổi)`}
          </button>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-3 bg-red-50 text-red-700 border border-red-200 rounded-xl p-4 text-sm font-medium">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />{error}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {applied && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl p-4 text-sm font-semibold">
            <CheckCircle2 className="size-5 shrink-0" />
            Đã áp dụng thành công {changedCount} thay đổi! Tải lại trang để xem kết quả.
          </motion.div>
        )}
      </AnimatePresence>

      {updates && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-stone-500 font-medium">
              <span className="text-stone-800 font-bold">{changedCount}</span> thành viên sẽ được cập nhật /&nbsp;
              <span className="text-stone-800 font-bold">{updates.length}</span> tổng
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200/80 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200/80">
                    <th className="text-left px-4 py-3 font-semibold text-stone-600 whitespace-nowrap">Tên</th>
                    <th className="text-center px-4 py-3 font-semibold text-stone-600 whitespace-nowrap">Thế hệ</th>
                    <th className="text-center px-4 py-3 font-semibold text-stone-600 whitespace-nowrap">Thứ tự</th>
                    <th className="text-center px-4 py-3 font-semibold text-stone-600 whitespace-nowrap">Dâu/Rể</th>
                    <th className="text-center px-4 py-3 font-semibold text-stone-600">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedRows.map((u, i) => (
                    <tr key={u.id} className={`border-b border-stone-100 last:border-0 transition-colors ${
                      u.changed ? "bg-amber-50/40" : i % 2 === 0 ? "bg-white" : "bg-stone-50/30"
                    }`}>
                      <td className="px-4 py-3 font-medium text-stone-800">{u.full_name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-stone-400">{u.old_generation ?? "—"}</span>
                        {u.old_generation !== u.new_generation && (
                          <><span className="mx-2 text-stone-300">→</span>
                          <span className="font-bold text-amber-700">{u.new_generation ?? "—"}</span></>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-stone-400">{u.old_birth_order ?? "—"}</span>
                        {u.old_birth_order !== u.new_birth_order && (
                          <><span className="mx-2 text-stone-300">→</span>
                          <span className="font-bold text-amber-700">{u.new_birth_order ?? "—"}</span></>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={u.old_is_in_law !== u.new_is_in_law ? "text-stone-400" : ""}>
                          {u.old_is_in_law ? (u.gender === "male" ? "Rể" : "Dâu") : "—"}
                        </span>
                        {u.old_is_in_law !== u.new_is_in_law && (
                          <><span className="mx-2 text-stone-300">→</span>
                          <span className="font-bold text-amber-700">
                            {u.new_is_in_law ? (u.gender === "male" ? "Rể" : "Dâu") : "Máu thịt"}
                          </span></>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.changed
                          ? <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200/60">Cập nhật</span>
                          : <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-stone-100 text-stone-400 border border-stone-200/60">Không đổi</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {updates.length > 20 && (
            <button onClick={() => setShowAll(!showAll)}
              className="mt-3 flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-amber-700 transition-colors mx-auto">
              {showAll
                ? <><ChevronUp className="size-4" /> Thu gọn</>
                : <><ChevronDown className="size-4" /> Xem tất cả {updates.length} thành viên</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
