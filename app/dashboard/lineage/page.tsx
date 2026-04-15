import { redirect } from "next/navigation";

// Trang n\u00e0y \u0111\u00e3 chuy\u1ec3n sang /dashboard/[familyId]/lineage
// \u0110\u1ecbnh h\u01b0\u1edbng v\u1ec1 dashboard
export default function LineageRedirect() {
  redirect("/dashboard");
}
