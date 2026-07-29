import { NextResponse } from "next/server";

const prefix = process.env.NEXT_PUBLIC_URL_PREFIX?.replace(/\/$/, "") || "";

export async function POST(request: Request) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host;
  const protocol = host.includes("samsungsdscoe.com")
    ? "https"
    : request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "");
  const response = NextResponse.redirect(new URL(`${protocol}://${host}${prefix}/wekkuk`), 303);
  response.cookies.set("wekkuk_token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: prefix || "/",
    maxAge: 0,
  });
  return response;
}
