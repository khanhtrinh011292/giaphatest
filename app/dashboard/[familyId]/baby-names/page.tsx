import BackToBoardButton from "@/components/BackToBoardButton";
import BabyNameSuggester from "@/components/BabyNameSuggester";

export const metadata = { title: "Gợi ý tên cho con" };

export default async function BabyNamesPage({
  params,
}: {
  params: Promise<{ familyId: string }>;
}) {
  const { familyId } = await params;

  return (
    <main className="flex-1 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <BackToBoardButton familyId={familyId} />
        <div className="mb-6">
          <h1 className="text-2xl font-serif font-bold text-stone-800">Gợi ý tên cho con</h1>
          <p className="text-stone-500 text-sm mt-1">
            Nhập tên bố và mẹ để nhận 20 gợi ý tên đẹp (3–4 từ), tự động kiểm tra trùng với tên trong dòng họ.
          </p>
        </div>
        <BabyNameSuggester familyId={familyId} />
      </div>
    </main>
  );
}
