import type { Metadata } from "next";
import "./globals.css";
import "./logo.css";
import { appUrl } from "../lib/url-prefix";

export const metadata: Metadata = {
  title: "콕캘린더 | 배드민턴 대회 일정",
  description: "전국 배드민턴 대회 일정을 한곳에서 확인하세요.",
  icons: { icon: appUrl("/cockcalendar-logo.png"), shortcut: appUrl("/cockcalendar-logo.png"), apple: appUrl("/cockcalendar-logo.png") },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const imageVariables = {
    "--logo-image": `url("${appUrl("/cockcalendar-logo.png")}")`,
    "--hero-image": `url("${appUrl("/badminton-calendar-kids.png")}")`,
  } as React.CSSProperties;
  return <html lang="ko" style={imageVariables}><body>{children}</body></html>;
}
