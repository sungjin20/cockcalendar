import type { Metadata } from "next";
import "./globals.css";
import "./logo.css";

export const metadata: Metadata = {
  title: "콕캘린더 | 배드민턴 대회 일정",
  description: "전국 배드민턴 대회 일정을 한곳에서 확인하세요.",
  icons: { icon: "/cockcalendar-logo.png", shortcut: "/cockcalendar-logo.png", apple: "/cockcalendar-logo.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
