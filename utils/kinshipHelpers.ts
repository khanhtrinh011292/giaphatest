export interface KinshipResult {
  /** Person A gọi Person B là gì */
  aCallsB: string;
  /** Person B gọi Person A là gì */
  bCallsA: string;
  /** Mô tả chi tiết nhánh quan hệ */
  description: string;
  /** Số bậc cách nhau */
  distance: number;
  /** Các bước quan hệ chi tiết */
  pathLabels: string[];
}

export interface PersonNode {
  id: string;
  full_name: string;
  gender: "male" | "female" | "other";
  birth_year: number | null;
  birth_order: number | null;
  generation: number | null;
  is_in_law: boolean;
}

interface RelEdge {
  type: "marriage" | "biological_child" | "adopted_child" | string;
  person_a: string;
  person_b: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * So sánh thứ bậc giữa hai người
 * Ưu tiên: birth_order → birth_year → generation
 */
function compareSeniority(
  a: PersonNode,
  b: PersonNode,
): "senior" | "junior" | "equal" {
  if (a.id === b.id) return "equal";

  if (a.birth_order != null && b.birth_order != null) {
    if (a.birth_order < b.birth_order) return "senior";
    if (a.birth_order > b.birth_order) return "junior";
  }

  if (a.birth_year != null && b.birth_year != null) {
    if (a.birth_year < b.birth_year) return "senior";
    if (a.birth_year > b.birth_year) return "junior";
  }

  if (a.generation != null && b.generation != null) {
    if (a.generation < b.generation) return "senior";
    if (a.generation > b.generation) return "junior";
  }

  return "equal";
}

// ── Vietnamese Terminology Constants ──────────────────────────────────────

const ANCESTORS = [
  "",
  "Bố/Mẹ",
  "Ông/Bà",
  "Cụ",
  "Kỵ",
  "Sơ",
  "Tiệm",
  "Tiểu",
  "Di",
  "Diễn",
];

const DESCENDANTS = [
  "",
  "Con",
  "Cháu",
  "Chắt",
  "Chít",
  "Chút",
  "Chét",
  "Chót",
  "Chẹt",
];

/**
 * Lấy danh xưng trực hệ vế trên (Bố/Mẹ, Ông/Bà, Cụ...)
 */
function getDirectAncestorTerm(
  depth: number,
  gender: "male" | "female" | "other",
  isPaternal: boolean,
): string {
  if (depth === 1) return gender === "female" ? "Mẹ" : "Bố";
  if (depth === 2) {
    const base = gender === "female" ? "Bà" : "Ông";
    return `${base} ${isPaternal ? "nội" : "ngoại"}`;
  }
  if (depth === 3) {
    const base = gender === "female" ? "Cụ bà" : "Cụ ông";
    return `${base} ${isPaternal ? "nội" : "ngoại"}`;
  }
  if (depth === 4) {
    const base = gender === "female" ? "Kỵ bà" : "Kỵ ông";
    return `${base} ${isPaternal ? "nội" : "ngoại"}`;
  }
  return (ANCESTORS[depth] || `Tổ đời ${depth}`) + (isPaternal ? " nội" : " ngoại");
}

/**
 * Lấy danh xưng trực hệ vế dưới (Con, Cháu, Chắt...)
 */
function getDirectDescendantTerm(depth: number): string {
  return DESCENDANTS[depth] || `Cháu đời ${depth}`;
}

/**
 * Prefix cho quan hệ nhiều đời (Bác/Chú/Cô của Ông/Cụ...)
 * depthA = chiều sâu của A lên LCA (tức là B cách LCA 1 bước, A cách LCA depthA bước)
 * depth 2 = anh/em của bố/mẹ → Bác/Chú/Cô/Cậu/Dì
 * depth 3 = anh/em của ông/bà → Ông Bác / Bà Cô...
 * depth 4 = anh/em của cụ → Cụ Bác / Cụ Cô...
 */
function getDistantUnclePrefix(
  depthA: number,
  genderB: "male" | "female" | "other",
): string {
  if (depthA <= 2) return ""; // Không cần prefix
  if (depthA === 3) return genderB === "female" ? "Bà " : "Ông ";
  if (depthA === 4) return genderB === "female" ? "Cụ bà " : "Cụ ông ";
  const ancestorTitle = ANCESTORS[depthA - 1] || `Tổ đời ${depthA - 1}`;
  return ancestorTitle + " ";
}

// ── Core Blood Relationship Algorithm ──────────────────────────────────────────

/**
 * Giải quyết danh xưng huyết thống giữa A và B dựa vào LCA
 */
function resolveBloodTerms(
  depthA: number,
  depthB: number,
  personA: PersonNode,
  personB: PersonNode,
  pathA: PersonNode[], // Từ A lên tới LCA (không bao gồm LCA)
  pathB: PersonNode[], // Từ B lên tới LCA (không bao gồm LCA)
): [string, string, string] {
  const genderA = personA.gender;
  const genderB = personB.gender;

  // ── 1. QUAN HỆ TRỰC HỆ: B là con cháu của A (A = LCA) ──
  if (depthA === 0) {
    const firstChildOfA = pathB[pathB.length - 1];
    if (!firstChildOfA) return ["Hậu duệ", "Tiền bối", "Quan hệ Trực hệ"];
    const isPaternal = firstChildOfA.gender === "male";
    const bCallsA = getDirectAncestorTerm(depthB, genderA, isPaternal);
    const aCallsB = getDirectDescendantTerm(depthB);
    return [aCallsB, bCallsA, "Quan hệ Trực hệ"];
  }

  // ── 2. QUAN HỆ TRỰC HỆ: A là con cháu của B (B = LCA) ──
  if (depthB === 0) {
    const firstChildOfB = pathA[pathA.length - 1];
    if (!firstChildOfB) return ["Tiền bối", "Hậu duệ", "Quan hệ Trực hệ"];
    const isPaternal = firstChildOfB.gender === "male";
    const aCallsB = getDirectAncestorTerm(depthA, genderB, isPaternal);
    const bCallsA = getDirectDescendantTerm(depthA);
    return [aCallsB, bCallsA, "Quan hệ Trực hệ"];
  }

  // ── 3. QUAN HỆ NGANG / CHÉO ──
  const branchA = pathA[pathA.length - 1]; // Con trực tiếp của LCA phía A
  const branchB = pathB[pathB.length - 1]; // Con trực tiếp của LCA phía B

  if (!branchA || !branchB) return ["Họ hàng", "Họ hàng", "Quan hệ họ hàng"];

  // Thứ bậc so sánh giữa nhánh (để tính Bác/Chú)
  const branchSeniority = compareSeniority(branchA, branchB);
  // Thứ bậc của chính 2 người (để tính Anh/Em)
  const personSeniority = compareSeniority(personA, personB);

  // Vế Nội/Ngoại tính từ góc nhìn của A:
  // nếu nhánh A đi qua người nam (branchA là nam) → Bên Nội của A
  const isPaternalForA = branchA.gender === "male";
  const side = isPaternalForA ? "Nội" : "Ngoại";

  // ── 3a. ANH CHỊ EM RUỘT (cùng 1 bậc từ LCA) ──
  if (depthA === 1 && depthB === 1) {
    // FIX: dùng personSeniority (so sánh A vs B trực tiếp)
    if (personSeniority === "senior") {
      return [
        genderB === "female" ? "Em gái" : "Em trai",
        genderA === "female" ? "Chị gái" : "Anh trai",
        "Anh chị em ruột",
      ];
    } else if (personSeniority === "junior") {
      return [
        genderB === "female" ? "Chị gái" : "Anh trai",
        genderA === "female" ? "Em gái" : "Em trai",
        "Anh chị em ruột",
      ];
    } else {
      // Bằng tuổi / không rõ → trả chung chung
      return [
        genderB === "female" ? "Chị/Em gái" : "Anh/Em trai",
        genderA === "female" ? "Chị/Em gái" : "Anh/Em trai",
        "Anh chị em ruột",
      ];
    }
  }

  // ── 3b. CHÚ/BÁC/CÔ/CẬU/DÌ (A lệch vế dưới, B là anh/em của tổ tiên A) ──
  // depthA > 1: A cách LCA nhiều bậc; depthB = 1: B chỉ cách LCA 1 bậc
  if (depthA > 1 && depthB === 1) {
    let termForB = "";
    const prefix = getDistantUnclePrefix(depthA, genderB);

    if (isPaternalForA) {
      // Bên Nội: anh/em của bố (depthA=2), hoặc của ông (depthA=3)...
      if (genderB === "female") {
        // branchSeniority: branchB so với branchA
        // branchB "senior" nghĩa là B (hoặc tổ tiên B) lớn hơn nhánh A → B là Bác gái
        termForB = branchSeniority === "senior" ? "Bác" : "Cô";
      } else {
        termForB = branchSeniority === "senior" ? "Bác" : "Chú";
      }
    } else {
      // Bên Ngoại: anh/em của mẹ
      termForB = genderB === "female" ? "Dì" : "Cậu";
    }

    return [
      (prefix + termForB).trim(),
      getDirectDescendantTerm(depthA),
      `Bên ${side} (vế trên, cách ${depthA} đời)`,
    ];
  }

  // ── 3c. Ngược lại 3b: A là anh/em của tổ tiên B ──
  if (depthA === 1 && depthB > 1) {
    const [bCallsA, aCallsB, desc] = resolveBloodTerms(
      depthB,
      depthA,
      personB,
      personA,
      pathB,
      pathA,
    );
    return [aCallsB, bCallsA, desc];
  }

  // ── 3d. ANH EM HỌ (cả 2 đều cách LCA > 1 bậc) ──
  if (depthA > 1 && depthB > 1) {
    if (depthA === depthB) {
      // Cùng thế hệ → Anh em họ / Chị em họ
      // FIX: dùng personSeniority cho anh em họ cùng thế hệ
      if (personSeniority === "senior") {
        return [
          "Em họ",
          genderA === "female" ? "Chị họ" : "Anh họ",
          `Anh em họ Bên ${side} (cùng thế hệ)`,
        ];
      } else if (personSeniority === "junior") {
        return [
          genderB === "female" ? "Chị họ" : "Anh họ",
          "Em họ",
          `Anh em họ Bên ${side} (cùng thế hệ)`,
        ];
      } else {
        return [
          genderB === "female" ? "Chị/Em họ" : "Anh/Em họ",
          genderA === "female" ? "Chị/Em họ" : "Anh/Em họ",
          `Anh em họ Bên ${side} (cùng thế hệ)`,
        ];
      }
    }

    // Lệch thế hệ
    const genDiff = depthA - depthB;
    if (genDiff > 0) {
      // B ở vế trên so với A
      let termForB = "Họ hàng";
      const prefix = getDistantUnclePrefix(depthA, genderB);

      if (genDiff === 1) {
        if (isPaternalForA) {
          if (genderB === "female") {
            termForB = branchSeniority === "senior" ? "Bác họ" : "Cô họ";
          } else {
            termForB = branchSeniority === "senior" ? "Bác họ" : "Chú họ";
          }
        } else {
          termForB = genderB === "female" ? "Dì họ" : "Cậu họ";
        }
        return [termForB, "Cháu họ", `Họ hàng Bên ${side} (lệch 1 thế hệ)`];
      } else {
        termForB = (prefix + (genderB === "female" ? "Bà họ" : "Ông họ")).trim();
        return [termForB, "Cháu họ", `Họ hàng Bên ${side} (lệch ${genDiff} thế hệ)`];
      }
    } else {
      // A ở vế trên
      const [bCallsA, aCallsB, desc] = resolveBloodTerms(
        depthB,
        depthA,
        personB,
        personA,
        pathB,
        pathA,
      );
      return [aCallsB, bCallsA, desc];
    }
  }

  return ["Người trong họ", "Người trong họ", "Quan hệ họ hàng"];
}

// ── BFS Ancestry ──────────────────────────────────────────────────────────────

function getAncestryData(
  id: string,
  parentMap: Map<string, string[]>,
  personsMap: Map<string, PersonNode>,
) {
  const depths = new Map<string, { depth: number; path: PersonNode[] }>();
  const queue: { id: string; depth: number; path: PersonNode[] }[] = [
    { id, depth: 0, path: [] },
  ];

  while (queue.length > 0) {
    const { id: currentId, depth, path } = queue.shift()!;
    if (!depths.has(currentId)) {
      depths.set(currentId, { depth, path });

      const currentNode = personsMap.get(currentId);
      if (!currentNode) continue;

      const parents = parentMap.get(currentId) ?? [];
      for (const pId of parents) {
        const pNode = personsMap.get(pId);
        if (pNode && !depths.has(pId)) {
          queue.push({
            id: pId,
            depth: depth + 1,
            path: [...path, currentNode],
          });
        }
      }
    }
  }
  return depths;
}

function findBloodKinship(
  personA: PersonNode,
  personB: PersonNode,
  personsMap: Map<string, PersonNode>,
  parentMap: Map<string, string[]>,
): KinshipResult | null {
  const ancA = getAncestryData(personA.id, parentMap, personsMap);
  const ancB = getAncestryData(personB.id, parentMap, personsMap);

  // Tìm LCA tốt nhất: ưu tiên khoảng cách nhỏ nhất
  let lcaId: string | null = null;
  let minDistance = Infinity;

  for (const [id, dataA] of ancA) {
    if (ancB.has(id)) {
      const dist = dataA.depth + ancB.get(id)!.depth;
      if (dist < minDistance) {
        minDistance = dist;
        lcaId = id;
      }
    }
  }

  if (!lcaId) return null;

  const dataA = ancA.get(lcaId)!;
  const dataB = ancB.get(lcaId)!;

  const [aCallsB, bCallsA, description] = resolveBloodTerms(
    dataA.depth,
    dataB.depth,
    personA,
    personB,
    dataA.path,
    dataB.path,
  );

  const lcaName = personsMap.get(lcaId)?.full_name ?? "Tổ tiên chung";
  const pathParts: string[] = [];
  if (personA.id !== lcaId) {
    pathParts.push(
      `${personA.full_name} cách ${lcaName} ${dataA.depth} đời.`,
    );
  }
  if (personB.id !== lcaId) {
    pathParts.push(
      `${personB.full_name} cách ${lcaName} ${dataB.depth} đời.`,
    );
  }

  return {
    aCallsB,
    bCallsA,
    description: `${description} — Tổ tiên chung: ${lcaName}`,
    distance: minDistance,
    pathLabels: pathParts,
  };
}

// ── In-law (thông qua hôn nhân) helper ──────────────────────────────────────

/**
 * Chuyển đổi danh xưng từ góc nhìn huyết thống sang in-law
 * personRef: người trung gian (vợ/chồng)
 * direction: "A_calls_B" | "B_calls_A"
 */
function toInLawTerm(
  bloodTerm: string,
  spouseGender: "male" | "female" | "other",
  callerGender: "male" | "female" | "other",
): string {
  const suffix = spouseGender === "male" ? " chồng" : " vợ";

  // Tiền bối trực hệ → thêm suffix
  if (
    bloodTerm === "Bố" ||
    bloodTerm === "Mẹ" ||
    bloodTerm.startsWith("Ông") ||
    bloodTerm.startsWith("Bà") ||
    bloodTerm.startsWith("Cụ") ||
    bloodTerm.startsWith("Kỵ")
  ) {
    return bloodTerm + suffix;
  }

  // Dâu/Rể
  if (bloodTerm === "Con") {
    return callerGender === "male" ? "Con dâu" : "Con rể";
  }
  if (bloodTerm === "Cháu") {
    return callerGender === "male" ? "Cháu dâu" : "Cháu rể";
  }
  if (bloodTerm === "Chắt") {
    return callerGender === "male" ? "Chắt dâu" : "Chắt rể";
  }

  // Anh/Chị/Em ruột
  if (bloodTerm === "Anh trai") return callerGender === "male" ? "Anh rể" : "Chị dâu";
  if (bloodTerm === "Chị gái") return callerGender === "male" ? "Chị dâu" : "Anh rể"; // hiếm
  if (bloodTerm === "Em trai") return callerGender === "male" ? "Em rể" : "Em dâu";
  if (bloodTerm === "Em gái") return callerGender === "male" ? "Em dâu" : "Em rể"; // hiếm
  if (bloodTerm === "Anh/Em trai") return "Anh/Em rể";
  if (bloodTerm === "Chị/Em gái") return "Chị/Em dâu";

  // Anh/Chị/Em họ
  if (bloodTerm === "Anh họ") return callerGender === "male" ? "Anh rể (họ)" : "Chị dâu (họ)";
  if (bloodTerm === "Chị họ") return callerGender === "male" ? "Chị dâu (họ)" : "Anh rể (họ)";
  if (bloodTerm === "Em họ") return callerGender === "male" ? "Em dâu (họ)" : "Em rể (họ)";

  // Chú/Bác/Cô → Thím/Bác dâu/Chú rể
  if (bloodTerm === "Chú") return callerGender === "male" ? "Thím" : "Chú rể";
  if (bloodTerm === "Bác") return callerGender === "male" ? "Bác dâu" : "Bác rể";
  if (bloodTerm === "Cô") return callerGender === "male" ? "Dượng" : "Cô";
  if (bloodTerm === "Cậu") return callerGender === "male" ? "Mợ" : "Cậu";
  if (bloodTerm === "Dì") return callerGender === "male" ? "Dượng" : "Dì";

  // Chú họ / Cô họ...
  if (bloodTerm === "Chú họ") return "Thím họ";
  if (bloodTerm === "Bác họ") return "Bác dâu/rể (họ)";
  if (bloodTerm === "Cô họ") return "Dượng họ";
  if (bloodTerm === "Cậu họ") return "Mợ họ";
  if (bloodTerm === "Dì họ") return "Dượng họ";

  // Mặc định
  return (spouseGender === "male" ? "Chồng" : "Vợ") + " của " + bloodTerm;
}

/**
 * Chuyển đổi danh xưng người thân (họ hàng) gọi người đến (in-law)
 * tức là: bloodTerm là cách người thân gọi spouseRef → cần đổi thành cách gọi người in-law
 */
function relativeCallsInLaw(
  bloodTerm: string,
  inLawGender: "male" | "female" | "other",
): string {
  // Người thân gọi vợ/chồng của người thân khác
  if (bloodTerm === "Con") return inLawGender === "male" ? "Con rể" : "Con dâu";
  if (bloodTerm === "Cháu") return inLawGender === "male" ? "Cháu rể" : "Cháu dâu";
  if (bloodTerm === "Chắt") return inLawGender === "male" ? "Chắt rể" : "Chắt dâu";
  if (bloodTerm === "Anh trai" || bloodTerm === "Anh họ") return inLawGender === "female" ? "Chị dâu" : "Anh rể";
  if (bloodTerm === "Chị gái" || bloodTerm === "Chị họ") return inLawGender === "male" ? "Anh rể" : "Chị dâu";
  if (bloodTerm === "Em trai" || bloodTerm === "Em họ") return inLawGender === "female" ? "Em dâu" : "Em rể";
  if (bloodTerm === "Em gái") return inLawGender === "male" ? "Em rể" : "Em dâu";
  if (bloodTerm === "Chú") return "Thím";
  if (bloodTerm === "Bác" && inLawGender === "female") return "Bác";
  if (bloodTerm === "Bác" && inLawGender === "male") return "Bác";
  if (bloodTerm === "Cô") return inLawGender === "male" ? "Chú" : "Cô";
  if (bloodTerm === "Cậu") return inLawGender === "female" ? "Dì" : "Cậu";
  if (bloodTerm === "Dì") return inLawGender === "male" ? "Cậu" : "Dì";
  if (bloodTerm === "Ông Chú" || bloodTerm === "Ông Bác") return inLawGender === "female" ? "Bà Thím" : bloodTerm;
  if (bloodTerm === "Bà Cô") return inLawGender === "male" ? "Ông Dượng" : bloodTerm;
  return (inLawGender === "male" ? "Chồng" : "Vợ") + " của " + bloodTerm;
}

// ── Main Entry Point ──────────────────────────────────────────────────────────

export function computeKinship(
  personA: PersonNode,
  personB: PersonNode,
  persons: PersonNode[],
  relationships: RelEdge[],
): KinshipResult | null {
  if (personA.id === personB.id) return null;

  const personsMap = new Map(persons.map((p) => [p.id, p]));
  const parentMap = new Map<string, string[]>(); // child → parents[]
  const childrenMap = new Map<string, string[]>(); // parent → children[]
  const spouseMap = new Map<string, string[]>();

  for (const r of relationships) {
    if (r.type === "biological_child" || r.type === "adopted_child") {
      // person_a là cha/mẹ, person_b là con
      const parents = parentMap.get(r.person_b) ?? [];
      parents.push(r.person_a);
      parentMap.set(r.person_b, parents);

      const children = childrenMap.get(r.person_a) ?? [];
      children.push(r.person_b);
      childrenMap.set(r.person_a, children);
    } else if (r.type === "marriage") {
      const sA = spouseMap.get(r.person_a) ?? [];
      if (!sA.includes(r.person_b)) sA.push(r.person_b);
      spouseMap.set(r.person_a, sA);

      const sB = spouseMap.get(r.person_b) ?? [];
      if (!sB.includes(r.person_a)) sB.push(r.person_a);
      spouseMap.set(r.person_b, sB);
    }
  }

  // ── 0. Quan hệ hôn nhân trực tiếp ──
  const spousesA = spouseMap.get(personA.id) ?? [];
  if (spousesA.includes(personB.id)) {
    return {
      aCallsB: personB.gender === "female" ? "Vợ" : "Chồng",
      bCallsA: personA.gender === "female" ? "Vợ" : "Chồng",
      description: "Quan hệ Hôn nhân",
      distance: 0,
      pathLabels: [
        `${personA.full_name} và ${personB.full_name} là vợ chồng.`,
      ],
    };
  }

  // ── 1. Huyết thống trực tiếp ──
  const blood = findBloodKinship(personA, personB, personsMap, parentMap);
  if (blood) return blood;

  // ── 2. Thông qua hôn nhân của A (A gọi người thân của vợ/chồng mình) ──
  for (const sIdA of spousesA) {
    if (sIdA === personB.id) continue;
    const spouseA = personsMap.get(sIdA);
    if (!spouseA) continue;

    const res = findBloodKinship(spouseA, personB, personsMap, parentMap);
    if (res) {
      // res.aCallsB: cách spouseA gọi personB → chuyển sang cách A (dâu/rể) gọi
      // res.bCallsA: cách personB gọi spouseA → chuyển sang cách personB gọi A (in-law)
      const aCallsB = toInLawTerm(res.aCallsB, spouseA.gender, personA.gender);
      const bCallsA = relativeCallsInLaw(res.bCallsA, personA.gender);

      return {
        ...res,
        aCallsB,
        bCallsA,
        description: `Thông qua hôn nhân với ${spouseA.full_name}`,
        pathLabels: [
          `${personA.full_name} là ${personA.gender === "male" ? "chồng" : "vợ"} của ${spouseA.full_name}`,
          ...res.pathLabels,
        ],
      };
    }
  }

  // ── 3. Thông qua hôn nhân của B (B gọi người thân của vợ/chồng mình) ──
  const spousesB = spouseMap.get(personB.id) ?? [];
  for (const sIdB of spousesB) {
    const spouseB = personsMap.get(sIdB);
    if (!spouseB) continue;

    const res = findBloodKinship(personA, spouseB, personsMap, parentMap);
    if (res) {
      // res.aCallsB: cách A gọi spouseB → chuyển sang cách A gọi B (in-law của spouseB)
      // res.bCallsA: cách spouseB gọi A → chuyển sang cách B (dâu/rể) gọi A
      const aCallsB = relativeCallsInLaw(res.aCallsB, personB.gender);
      const bCallsA = toInLawTerm(res.bCallsA, spouseB.gender, personB.gender);

      return {
        ...res,
        aCallsB,
        bCallsA,
        description: `Thông qua hôn nhân với ${spouseB.full_name}`,
        pathLabels: [
          ...res.pathLabels,
          `${personB.full_name} là ${personB.gender === "male" ? "chồng" : "vợ"} của ${spouseB.full_name}`,
        ],
      };
    }
  }

  // ── 4. Thông qua hôn nhân của cả A và B (anh em cột chèo / chị em dâu) ──
  for (const sIdA of spousesA) {
    const spouseA = personsMap.get(sIdA);
    if (!spouseA) continue;
    for (const sIdB of spousesB) {
      if (sIdA === sIdB) continue;
      const spouseB = personsMap.get(sIdB);
      if (!spouseB) continue;

      const res = findBloodKinship(spouseA, spouseB, personsMap, parentMap);
      if (res) {
        let aCallsB: string;
        let bCallsA: string;

        // Anh em cột chèo
        if (
          res.description.includes("Anh chị em ruột") &&
          personA.gender === "male" &&
          personB.gender === "male"
        ) {
          aCallsB = "Anh em cột chèo";
          bCallsA = "Anh em cột chèo";
        } else if (
          res.description.includes("Anh chị em ruột") &&
          personA.gender === "female" &&
          personB.gender === "female"
        ) {
          aCallsB = "Chị em dâu";
          bCallsA = "Chị em dâu";
        } else {
          const prefixA = personA.gender === "male" ? "Chồng" : "Vợ";
          const prefixB = personB.gender === "male" ? "Chồng" : "Vợ";
          aCallsB = `${prefixB} của ${res.aCallsB}`;
          bCallsA = `${prefixA} của ${res.bCallsA}`;
        }

        return {
          ...res,
          aCallsB,
          bCallsA,
          description: `Thông qua hôn nhân của ${spouseA.full_name} và ${spouseB.full_name}`,
          pathLabels: [
            `${personA.full_name} là ${personA.gender === "male" ? "chồng" : "vợ"} của ${spouseA.full_name}`,
            ...res.pathLabels,
            `${personB.full_name} là ${personB.gender === "male" ? "chồng" : "vợ"} của ${spouseB.full_name}`,
          ],
        };
      }
    }
  }

  // ── 5. Quan hệ con dâu/rể trực tiếp:
  //    A là bố/mẹ của một người, người đó kết hôn với B
  const childrenOfA = childrenMap.get(personA.id) ?? [];
  for (const childId of childrenOfA) {
    const childSpouses = spouseMap.get(childId) ?? [];
    if (childSpouses.includes(personB.id)) {
      const child = personsMap.get(childId)!;
      return {
        aCallsB: personB.gender === "male" ? "Con rể" : "Con dâu",
        bCallsA:
          personA.gender === "female" ? "Mẹ chồng/vợ" : "Bố chồng/vợ",
        description: "Quan hệ Cha/Mẹ - Con dâu/Rể",
        distance: 2,
        pathLabels: [
          `${child.full_name} là con của ${personA.full_name}`,
          `${personB.full_name} là ${personB.gender === "male" ? "chồng" : "vợ"} của ${child.full_name}`,
        ],
      };
    }
  }

  // ── 6. Ngược lại: B là bố/mẹ của người kết hôn với A ──
  const childrenOfB = childrenMap.get(personB.id) ?? [];
  for (const childId of childrenOfB) {
    const childSpouses = spouseMap.get(childId) ?? [];
    if (childSpouses.includes(personA.id)) {
      const child = personsMap.get(childId)!;
      return {
        aCallsB:
          personB.gender === "female" ? "Mẹ chồng/vợ" : "Bố chồng/vợ",
        bCallsA: personA.gender === "male" ? "Con rể" : "Con dâu",
        description: "Quan hệ Cha/Mẹ - Con dâu/Rể",
        distance: 2,
        pathLabels: [
          `${child.full_name} là con của ${personB.full_name}`,
          `${personA.full_name} là ${personA.gender === "male" ? "chồng" : "vợ"} của ${child.full_name}`,
        ],
      };
    }
  }

  return {
    aCallsB: "Chưa xác định",
    bCallsA: "Chưa xác định",
    description: "Không tìm thấy quan hệ trong phạm vi dữ liệu",
    distance: -1,
    pathLabels: [],
  };
}
