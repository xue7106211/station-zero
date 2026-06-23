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
  const themeScript = `
try {
  var theme = localStorage.getItem('station-zero-theme');
  document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark';
} catch (_) {
  document.documentElement.dataset.theme = 'dark';
}`;

  return (
    <html lang="zh-CN" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
