import { redirect } from "next/navigation";

// Legacy route — không có familyId, redirect về dashboard
export default function LegacyEditMemberPage() {
  redirect("/dashboard");
}
