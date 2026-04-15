"use client";

import {
  adminCreateUser,
  changeUserRole,
  deleteUser,
  toggleUserStatus,
} from "@/app/actions/user";
import config from "@/app/config";
import { AdminUserData } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Shield, Trash, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";

const SUPERADMIN_EMAIL = "khanhtrinh011292@gmail.com";

interface AdminUserListProps {
  initialUsers: AdminUserData[];
  currentUserId: string;
  currentUserEmail: string;
}

interface Notification {
  message: string;
  type: "success" | "error" | "info";
}

export default function AdminUserList({
  initialUsers,
  currentUserId,
  currentUserEmail,
}: AdminUserListProps) {
  const [users, setUsers] = useState<AdminUserData[]>(initialUsers);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  // Only Superadmin can add new admins
  const isSuperAdminSelf = currentUserEmail === SUPERADMIN_EMAIL;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDemo(window.location.hostname === config.demoDomain);
    }
  }, []);

  const showNotification = (
    message: string,
    type: "success" | "error" | "info" = "info",
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const isSuperAdmin = (user: AdminUserData) => user.email === SUPERADMIN_EMAIL;

  const handleRoleChange = async (userId: string, newRole: "admin" | "member") => {
    if (isDemo) {
      showNotification("Đây là tài khoản demo, vui lòng không thay đổi.", "info");
      return;
    }
    const target = users.find(u => u.id === userId);
    if (target && isSuperAdmin(target)) {
      showNotification("Không thể thay đổi vai trò của Superadmin.", "error");
      return;
    }
    try {
      setLoadingId(userId);
      const result = await changeUserRole(userId, newRole);
      if (result?.error) { showNotification(result.error, "error"); return; }
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showNotification("Đã cập nhật vai trò thành công.", "success");
    } catch (e: unknown) {
      showNotification(e instanceof Error ? e.message : "Lỗi không xác định", "error");
    } finally {
      setLoadingId(null);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: boolean) => {
    if (isDemo) {
      showNotification("Đây là tài khoản demo, vui lòng không thay đổi.", "info");
      return;
    }
    try {
      setLoadingId(userId);
      const result = await toggleUserStatus(userId, newStatus);
      if (result?.error) { showNotification(result.error, "error"); return; }
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: newStatus } : u));
      showNotification(`Đã ${newStatus ? "duyệt" : "khoá"} tài khoản thành công.`, "success");
    } catch (e: unknown) {
      showNotification(e instanceof Error ? e.message : "Lỗi không xác định", "error");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (userId: string) => {
    if (isDemo) {
      showNotification("Đây là tài khoản demo, vui lòng không thay đổi.", "info");
      return;
    }
    const target = users.find(u => u.id === userId);
    if (target && isSuperAdmin(target)) {
      showNotification("Không thể xóa tài khoản Superadmin.", "error");
      return;
    }
    if (!confirm("Bạn có chắc chắn muốn xóa tài khoản này vĩnh viễn không?")) return;
    try {
      setLoadingId(userId);
      const result = await deleteUser(userId);
      if (result?.error) { showNotification(result.error, "error"); return; }
      setUsers(users.filter(u => u.id !== userId));
      showNotification("Đã xóa tài khoản thành công.", "success");
    } catch (e: unknown) {
      showNotification(e instanceof Error ? e.message : "Lỗi không xác định", "error");
    } finally {
      setLoadingId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isDemo) {
      showNotification("Đây là trang demo, chức năng này bị hạn chế.", "info");
      setIsCreateModalOpen(false);
      return;
    }
    setIsCreating(true);
    const formData = new FormData(e.currentTarget);
    formData.set("role", "admin");
    formData.set("is_active", "true");
    try {
      const result = await adminCreateUser(formData);
      if (result?.error) { showNotification(result.error, "error"); return; }
      showNotification("Đã thêm admin mới thành công!", "success");
      setIsCreateModalOpen(false);
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: unknown) {
      showNotification(e instanceof Error ? e.message : "Lỗi không xác định", "error");
    } finally {
      setIsCreating(false);
    }
  };

  const roleBadge = (role: string, email: string) => {
    if (email === SUPERADMIN_EMAIL) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
          <Crown className="size-3" />
          Superadmin
        </span>
      );
    }
    if (role === "admin") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
          <Shield className="size-3" />
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200">
        Thành viên
      </span>
    );
  };

  return (
    <div className="space-y-6 relative">
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className={`fixed top-6 left-1/2 z-[100] px-6 py-3 rounded-xl shadow-lg border flex items-center gap-3 min-w-[320px] max-w-[90vw] ${
              notification.type === "success" ? "bg-emerald-50/90 border-emerald-200 text-emerald-800" :
              notification.type === "error" ? "bg-red-50/90 border-red-200 text-red-800" :
              "bg-amber-50/90 border-amber-200 text-amber-800"
            }`}
          >
            <p className="text-sm font-medium">{notification.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar — only Superadmin sees "Thêm Admin" button */}
      {isSuperAdminSelf && (
        <div className="flex justify-end">
          <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary flex items-center gap-2">
            <UserPlus className="size-4" />
            Thêm Admin
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-sm border border-stone-200/60 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="uppercase tracking-wider border-b border-stone-200/60 bg-stone-50/50">
              <tr>
                <th className="px-6 py-4 text-stone-500 font-semibold text-xs">Email</th>
                <th className="px-6 py-4 text-stone-500 font-semibold text-xs">Vai trò</th>
                <th className="px-6 py-4 text-stone-500 font-semibold text-xs">Trạng thái</th>
                <th className="px-6 py-4 text-stone-500 font-semibold text-xs">Ngày tạo</th>
                <th className="px-6 py-4 text-stone-500 font-semibold text-xs text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map((user) => {
                const superadmin = isSuperAdmin(user);
                const isCurrentUser = user.id === currentUserId;
                const canModify = !superadmin && !isCurrentUser;

                return (
                  <tr key={user.id} className={`hover:bg-stone-50/80 transition-colors ${
                    superadmin ? "bg-amber-50/30" : ""
                  }`}>
                    {/* Email */}
                    <td className="px-6 py-4 font-medium text-stone-900">
                      <div className="flex items-center gap-2">
                        {user.email}
                        {isCurrentUser && <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-md font-semibold">Bạn</span>}
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-4">
                      {!superadmin && !isCurrentUser ? (
                        <select
                          value={user.role === "admin" ? "admin" : "member"}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as "admin" | "member")}
                          disabled={loadingId === user.id}
                          className="bg-stone-50 text-stone-700 border border-stone-200 text-xs rounded-md focus:ring-amber-500 focus:border-amber-500 px-2 py-1 hover:border-stone-300 transition-colors disabled:opacity-50 outline-none"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Thành viên</option>
                        </select>
                      ) : (
                        roleBadge(user.role, user.email)
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <button
                        disabled={!canModify || loadingId === user.id}
                        onClick={() => canModify && handleStatusChange(user.id, !user.is_active)}
                        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                          user.is_active
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-stone-100 text-stone-800 border border-stone-200"
                        } ${
                          canModify ? "hover:opacity-80 cursor-pointer" : "opacity-50 cursor-not-allowed"
                        } disabled:opacity-50`}
                      >
                        {user.is_active ? "Đã duyệt" : "Chờ duyệt"}
                      </button>
                    </td>

                    {/* Created at */}
                    <td className="px-6 py-4 text-stone-500">
                      {new Date(user.created_at).toLocaleDateString("vi-VN")}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      {canModify ? (
                        <button
                          title="Xóa tài khoản"
                          disabled={loadingId === user.id}
                          onClick={() => handleDelete(user.id)}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                        >
                          <Trash className="size-4" />
                        </button>
                      ) : (
                        <span className="text-stone-300 text-xs">{superadmin ? "🔒" : "—"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-stone-500">
                    Không tìm thấy tài khoản nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Admin Modal — only visible to Superadmin */}
      {isSuperAdminSelf && isCreateModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-stone-200/60 w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-stone-100/80 flex justify-between items-center bg-stone-50/50">
              <h3 className="text-xl font-serif font-bold text-stone-800 flex items-center gap-2">
                <Shield className="size-5 text-rose-500" />
                Thêm Admin Mới
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 size-8 flex items-center justify-center hover:bg-stone-100 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6">
              <p className="text-sm text-stone-500 mb-5">
                Tài khoản mới sẽ có vai trò <strong className="text-rose-600">Admin</strong> và được kích hoạt ngay lập tức.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full px-3 py-2.5 bg-white text-stone-900 placeholder-stone-400 border border-stone-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="admin@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={6}
                    className="w-full px-3 py-2.5 bg-white text-stone-900 placeholder-stone-400 border border-stone-300 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="Ít nhất 6 ký tự"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="btn">Hủy</button>
                <button type="submit" disabled={isCreating} className="btn-primary flex items-center gap-2">
                  <UserPlus className="size-4" />
                  {isCreating ? "Đang tạo..." : "Thêm Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
