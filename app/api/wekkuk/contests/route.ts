import { NextResponse } from "next/server";
import { getWekkukContests } from "../../../../lib/wekkuk";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestedPage = Number(new URL(request.url).searchParams.get("page") || "1");
  const page = Number.isFinite(requestedPage) ? Math.max(1, Math.floor(requestedPage)) : 1;

  try {
    return NextResponse.json(await getWekkukContests(page));
  } catch (error) {
    console.error("Wekkuk contest database query failed", error);
    return NextResponse.json({ error: "대회 목록을 불러오지 못했습니다." }, { status: 503 });
  }
}
