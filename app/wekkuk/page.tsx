import WekkukClient from "./WekkukClient";
import type { Player } from "./WekkukClient";
import { getWekkukContests, wekkukFetch } from "../../lib/wekkuk";
import type { WekkukContest } from "../../lib/wekkuk";
import { cookies } from "next/headers";
import "./wekkuk.css";

export const dynamic = "force-dynamic";

function value(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] || "" : input || "";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const token = (await cookies()).get("wekkuk_token")?.value || "";
  const loggedIn = Boolean(token);
  const requestedPage = Math.max(1, Number(value(params.page)) || 1);
  let initialContests: WekkukContest[] = [];
  let initialTotalPages = 1;
  let initialPage = 1;
  let initialListMessage = "";
  let initialPlayers: Player[] = [];
  let initialSearchMessage = "";
  try {
    const data = await getWekkukContests(requestedPage);
    initialContests = data.items;
    initialTotalPages = data.totalPages;
    initialPage = data.page;
    initialListMessage = data.warning;
  } catch (error) {
    initialListMessage = error instanceof Error ? error.message : "대회 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }
  const initialSelected = initialContests.find((contest) => contest.id === value(params.contest)) || null;
  if (value(params.search) === "1") {
    if (!token) initialSearchMessage = "먼저 Wekkuk 계정으로 로그인해 주세요.";
    else if (!initialSelected) initialSearchMessage = "대회를 선택해 주세요.";
    else {
      const form = new URLSearchParams({
        CT: "", TI: "", AP: "", VR: "", LA: "", mode: "get_player", out_type: "O",
        bct_id: initialSelected.id,
        tem_sex_play: value(params.tem_sex_play) || "BD",
        tem_age: value(params.tem_age),
        tem_level: value(params.tem_level),
        ply_affiliation: value(params.ply_affiliation),
        ply_name: value(params.ply_name),
      });
      try {
        const response = await wekkukFetch("/contest_badminton/apply_check_get", {
          method: "POST",
          headers: { authorization: `Bearer ${token}`, "content-type": "application/x-www-form-urlencoded" },
          body: form,
        });
        const data = await response.json();
        if (data.err !== "N") initialSearchMessage = data.err_msg || "참가자 조회에 실패했습니다.";
        else {
          initialPlayers = data.subItems || [];
          initialSearchMessage = `${initialPlayers.length}개 팀을 찾았습니다.`;
        }
      } catch {
        initialSearchMessage = "참가자 조회 서버에 연결하지 못했습니다.";
      }
    }
  }
  return <WekkukClient
    initialContests={initialContests}
    initialListMessage={initialListMessage}
    initialTotalPages={initialTotalPages}
    initialLoggedIn={loggedIn}
    initialPage={initialPage}
    initialSelected={initialSelected}
    initialPlayers={initialPlayers}
    initialSearchMessage={initialSearchMessage}
  />;
}
