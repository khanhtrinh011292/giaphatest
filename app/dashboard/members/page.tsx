import { redirect } from "next/navigation";

// Legacy route — redirect về trang chọn gia phả
export default function LegacyMembersPage() {
  redirect("/dashboard");
}
