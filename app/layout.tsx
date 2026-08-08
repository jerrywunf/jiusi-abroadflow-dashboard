import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { StudentProvider } from "@/components/student-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "玖肆留学 · 学生管理",
  description: "留学咨询团队的学生与申请进度工作台"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body className={inter.className}><StudentProvider>{children}</StudentProvider></body></html>;
}
