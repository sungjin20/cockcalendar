import { isExcludedWekkukOrganizer, isExcludedWekkukTitle } from "./wekkuk-filters";

const WEKKUK_BASE = "https://app2.wekkuk.com/v2";
export const WEKKUK_USER_AGENT = "Mozilla/5.0 Android Wekkuk";

export function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&nbsp;/gi, " ");
}

export function htmlText(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

export function cookieFrom(response: Response, fallback = "") {
  const raw = response.headers.get("set-cookie");
  const match = raw?.match(/(?:^|,\s*)(ci_wekkuk=[^;,\s]+)/i);
  return match?.[1] || fallback;
}

export async function wekkukFetch(path: string, init?: RequestInit) {
  return fetch(`${WEKKUK_BASE}${path}`, {
    ...init,
    headers: {
      "user-agent": WEKKUK_USER_AGENT,
      ...init?.headers,
    },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
}

export function parseWekkukError(html: string) {
  const message =
    html.match(/modal_alert\(\s*'((?:\\'|[^'])*)'/)?.[1] ||
    html.match(/alert\(\s*'((?:\\'|[^'])*)'/)?.[1] ||
    html.match(/alert\(\s*"((?:\\"|[^"])*)"/)?.[1];
  return message ? decodeHtml(message.replace(/\\(['"])/g, "$1")) : "";
}

export type WekkukContest = {
  id: string;
  name: string;
  organizer: string;
  status: string;
  date: string;
};

export async function getWekkukContests(page = 1) {
  const response = await wekkukFetch(`/contest_badminton/contest?page=${page}`);
  if (!response.ok) throw new Error("대회 목록을 불러오지 못했습니다.");
  const html = await response.text();
  const pattern = /<div class="gm-top"[\s\S]*?goto_contest_view\((\d+),\s*"([^"]+)"\)'>([\s\S]*?)<\/div>\s*<\/div>/g;
  const items: WekkukContest[] = [...html.matchAll(pattern)].map((match) => {
    const block = match[3];
    return {
      id: match[1],
      name: htmlText(match[2]),
      organizer: htmlText(block.match(/<p class="gm-name">([\s\S]*?)<\/p>/)?.[1] || "").replace(/^\(|\)$/g, ""),
      status: htmlText(block.match(/<span class="gm-color2">\[([\s\S]*?)\]<\/span>/)?.[1] || ""),
      date: htmlText(block.match(/<p class="gm-time">([\s\S]*?)<\/p>/)?.[1] || ""),
    };
  });
  const totalPages = Math.max(
    1,
    ...[...html.matchAll(/toPage\('(\d+)'/g)].map((match) => Number(match[1])),
  );
  return {
    page,
    totalPages,
    items: items.filter(item => !isExcludedWekkukOrganizer(item.organizer) && !isExcludedWekkukTitle(item.name)),
  };
}

export async function loginWekkuk(uid: string, password: string) {
  const loginPage = await wekkukFetch("/member/login");
  let cookie = cookieFrom(loginPage);
  const sessionResponse = await wekkukFetch("/member/set_session", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", ...(cookie ? { cookie } : {}) },
    body: new URLSearchParams({ mode: "set_session", CT: "", TI: "", AP: "", VR: "", LA: "" }),
  });
  cookie = cookieFrom(sessionResponse, cookie);
  const form = new FormData();
  form.set("mode", "mb_login");
  form.set("uid", uid);
  form.set("pass", password);
  form.set("AP", "");
  form.set("TI", "");
  const response = await wekkukFetch("/member/login_act", {
    method: "POST",
    headers: cookie ? { cookie } : undefined,
    body: form,
  });
  const text = await response.text();
  const success = text.match(/shadow_ok\(\s*'([^']+)'\s*\)/);
  if (!success) throw new Error(parseWekkukError(text) || "로그인에 실패했습니다.");
  const [token, playerId = ""] = success[1].split("#@#");
  if (!token) throw new Error("로그인 토큰을 받지 못했습니다.");
  return { token, playerId };
}
