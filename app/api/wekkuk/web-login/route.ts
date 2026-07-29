import { NextResponse } from "next/server";
import { loginWekkuk } from "../../../../lib/wekkuk";

const prefix = process.env.NEXT_PUBLIC_URL_PREFIX?.replace(/\/$/, "") || "";

export async function POST(request: Request) {
  const form = await request.formData();
  const uid = String(form.get("uid") || "").trim();
  const password = String(form.get("password") || "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host;
  const protocol = host.includes("samsungsdscoe.com")
    ? "https"
    : request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "");
  const redirect = new URL(`${protocol}://${host}${prefix}/wekkuk`);
  if (!uid || !password) {
    redirect.searchParams.set("login", "missing");
    return NextResponse.redirect(redirect, 303);
  }
  try {
    const result = await loginWekkuk(uid, password);
    redirect.searchParams.set("login", "success");
    const response = NextResponse.redirect(redirect, 303);
    response.cookies.set("wekkuk_token", result.token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: prefix || "/",
      maxAge: 60 * 60 * 8,
    });
    return response;
  } catch {
    redirect.searchParams.set("login", "failed");
    return NextResponse.redirect(redirect, 303);
  }
}
