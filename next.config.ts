import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bật standalone mode: tạo output gọn nhẹ, tối ưu cho Docker
  // Chỉ copy đúng những file cần thiết, giảm kích thước image đáng kể
  output: "standalone",
};

export default nextConfig;
