import type { Metadata } from "next";
// Nhập bộ font Noto Serif chuyên dụng cho văn bản trang trọng và hỗ trợ tốt Tiếng Việt
import { Noto_Serif, Noto_Serif_Display } from "next/font/google";
import "./globals.css";

// Font cho nội dung văn bản thường
const notoSerif = Noto_Serif({
  subsets: ["vietnamese"],
  weight: ["400", "700"],
  variable: "--font-noto-serif",
  display: "swap",
});

// Font cho các tiêu đề lớn (Quốc hiệu, Tên bằng, Tên người)
const notoSerifDisplay = Noto_Serif_Display({
  subsets: ["vietnamese"],
  weight: ["700", "900"], // Chỉ lấy nét đậm và siêu đậm
  variable: "--font-noto-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hệ thống Văn bằng Số",
  description: "Xác thực văn bằng trên Blockchain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${notoSerif.variable} ${notoSerifDisplay.variable}`}
    >
      {/* Áp dụng font mặc định là Noto Serif cho toàn trang */}
      <body className="font-serif bg-gray-100">{children}</body>
    </html>
  );
}
