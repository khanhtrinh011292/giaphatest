import BackToBoardButton from "@/components/BackToBoardButton";
import WeddingChooser from "@/components/WeddingChooser";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coi Ngày Cưới",
};

interface PageProps {
  params: Promise<{ familyId: string }>;
}

export default async function WeddingPage({ params }: PageProps) {
  const { familyId } = await params;

  return (
    <div className="flex-1 w-full flex flex-col pb-12">
      <div className="w-full py-6 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <BackToBoardButton familyId={familyId} />
        <h1 className="title">Coi Ngày Cưới</h1>
        <p className="text-stone-500 mt-1 text-sm">
          Chọn ngày cưới tốt theo Thông Thư — Trạch Nhật · Phối Mệnh · Giờ Hoàng Đạo
        </p>
      </div>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1">
        <WeddingChooser />
      </main>
    </div>
  );
}
