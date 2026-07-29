import { NextResponse } from "next/server";
import { wekkukFetch } from "../../../../lib/wekkuk";

export const dynamic = "force-dynamic";

const allowedFields = [
  "bct_id",
  "tem_sex_play",
  "tem_age",
  "tem_level",
  "ply_affiliation",
  "ply_name",
] as const;

export async function POST(request: Request) {
  const cookieToken = request.headers.get("cookie")?.match(/(?:^|;\s*)wekkuk_token=([^;]+)/)?.[1];
  const authorization = request.headers.get("authorization") || (cookieToken ? `Bearer ${decodeURIComponent(cookieToken)}` : null);
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const form = new URLSearchParams({
    CT: "",
    TI: "",
    AP: "",
    VR: "",
    LA: "",
    mode: "get_player",
    out_type: "O",
  });
  for (const field of allowedFields) form.set(field, String(input[field] || "").trim());

  if (!form.get("bct_id")) {
    return NextResponse.json({ error: "대회를 선택해 주세요." }, { status: 400 });
  }

  try {
    const response = await wekkukFetch("/contest_badminton/apply_check_get", {
      method: "POST",
      headers: {
        authorization,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    const text = await response.text();
    const data = JSON.parse(text);
    if (data.err !== "N") {
      const status = /로그인/.test(data.err_msg || "") ? 401 : 400;
      return NextResponse.json({ error: data.err_msg || "참가자 조회에 실패했습니다." }, { status });
    }
    return NextResponse.json({ items: data.subItems || [] });
  } catch {
    return NextResponse.json({ error: "참가자 조회 서버에 연결하지 못했습니다." }, { status: 502 });
  }
}
