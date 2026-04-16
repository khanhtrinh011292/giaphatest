"use client";

import { FamilyContext } from "@/types";
import { createContext, useContext } from "react";

const FamilyCtx = createContext<FamilyContext | null>(null);

export function FamilyContextProvider({
  context,
  children,
}: {
  context: FamilyContext;
  children: React.ReactNode;
}) {
  return <FamilyCtx.Provider value={context}>{children}</FamilyCtx.Provider>;
}

export function useFamilyContext(): FamilyContext {
  const ctx = useContext(FamilyCtx);
  if (!ctx) throw new Error("useFamilyContext phải dùng bên trong FamilyContextProvider");
  return ctx;
}

/** Hook an toàn: trả về null nếu không có FamilyContextProvider bọc ngoài */
export function useFamilyContextOptional(): FamilyContext | null {
  return useContext(FamilyCtx);
}
