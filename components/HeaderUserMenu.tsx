"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Globe, Home, Info, UserCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import LogoutButton from "./LogoutButton";
import { useUser } from "./UserProvider";

export default function HeaderUserMenu({ familyId }: { familyId?: string }) {
  const { user, isAdmin, isSuperAdmin } = useUser();
  const userEmail = user?.email ?? "";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full hover:bg-stone-100 transition-all border border-transparent hover:border-stone-200"
      >
        <div className="size-7 rounded-full bg-gradient-to-br from-amber-200 to-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm shadow-sm ring-1 ring-amber-300/50">
          {userEmail ? userEmail.charAt(0).toUpperCase() : <UserCircle className="size-4" />}
        </div>
        <span className="hidden sm:block text-sm font-medium text-stone-700 max-w-[120px] truncate">
          {userEmail.split("@")[0]}
        </span>
        <ChevronDown className={`size-3.5 text-stone-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.13, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-stone-200/60 py-2 z-50 overflow-hidden"
          >
            {/* Account info */}
            <div className="px-4 py-3 border-b border-stone-100 bg-stone-50/60">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">Tài khoản</p>
              <p className="text-sm font-semibold text-stone-800 truncate">{userEmail}</p>
              {isSuperAdmin && <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Super Admin</span>}
            </div>

            <div className="py-1">
              <Link href="/dashboard" onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:text-amber-700 hover:bg-amber-50 transition-colors">
                <Home className="size-4" />
                Danh sách gia phả
              </Link>

              {isAdmin && (
                <>
                  <div className="px-4 py-1.5 mt-0.5">
                    <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                      {isSuperAdmin ? "Super Admin" : "Quản trị viên"}
                    </p>
                  </div>
                  <Link href="/dashboard/users" onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:text-rose-700 hover:bg-rose-50 transition-colors">
                    <Globe className="size-4" />
                    Quản lý Website
                  </Link>
                </>
              )}

              <div className="h-px bg-stone-100 my-1 mx-4" />
              <Link href="/about" onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors">
                <Info className="size-4" />
                Giới thiệu
              </Link>
              <LogoutButton />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
