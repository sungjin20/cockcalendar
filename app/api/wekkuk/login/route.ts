import { NextResponse } from "next/server";
import { cookieFrom, parseWekkukError, wekkukFetch } from "../../../../lib/wekkuk";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { uid?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const uid = body.uid?.trim();
  const password = body.password;
  if (!uid || !password) {
    return NextResponse.json({ error: "아이디와 비밀번호를 입력해 주세요." }, { status: 400 });
  }

  try {
    const loginPage = await wekkukFetch("/member/login");
    let cookie = cookieFrom(loginPage);

    const sessionResponse = await wekkukFetch("/member/set_session", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        ...(cookie ? { cookie } : {}),
      },
      body: new URLSearchParams({
        mode: "set_session",
        CT: "",
        TI: "",
        AP: "",
        VR: "",
        LA: "",
      }),
    });
    cookie = cookieFrom(sessionResponse, cookie);

    const form = new FormData();
    form.set("mode", "mb_login");
    form.set("uid", uid);
    form.set("pass", password);
    form.set("AP", "");
    form.set("TI", "");

    const loginResponse = await wekkukFetch("/member/login_act", {
      method: "POST",
      headers: cookie ? { cookie } : undefined,
      body: form,
    });
    const responseText = await loginResponse.text();
    const success = responseText.match(/shadow_ok\(\s*'([^']+)'\s*\)/);

    if (!success) {
      return NextResponse.json(
        { error: parseWekkukError(responseText) || "로그인에 실패했습니다." },
        { status: 401 },
      );
    }

    const [token, playerId = ""] = success[1].split("#@#");
    if (!token) {
      return NextResponse.json({ error: "로그인 토큰을 받지 못했습니다." }, { status: 502 });
    }

    return NextResponse.json({ token, playerId });
  } catch {
    return NextResponse.json(
      { error: "Wekkuk 로그인 서버에 연결하지 못했습니다." },
      { status: 502 },
    );
  }
}
