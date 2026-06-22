import type { Metadata } from "next";
import "@heroui/react/styles";
import "./globals.css";

export const metadata: Metadata = {
  title: "Station Zero 零号站｜高清观影决策系统",
  description:
    "判断一部片值不值得看、哪里能合法看、哪个高清版本最值得看。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
