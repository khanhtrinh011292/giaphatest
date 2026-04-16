import type { Metadata } from "next";
import config from "@/app/config";
import WeddingChooser from "@/components/WeddingChooser";

export const metadata: Metadata = {
  title: `Coi ngày cưới | ${config.siteName}`,
  description: "Chọn ngày cưới tốt theo Thông Thư (Thúng Sing) — Trạch Nhật, Phối Mệnh, Giờ Hoàng Đạo.",
};

export default function WeddingPage() {
  return <WeddingChooser />;
}
