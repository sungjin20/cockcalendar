import { dbQuery } from "../db/postgres";

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

const CONTEST_PAGE_SIZE = 10;

export async function getWekkukContests(page = 1) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const result = await dbQuery<WekkukContest>(`
    SELECT s.source_id AS id, c.title AS name,
      COALESCE(c.organizer, '') AS organizer, ''::text AS status,
      CASE WHEN c.end_date > c.start_date
        THEN to_char(c.start_date, 'YYYY-MM-DD') || '~' || to_char(c.end_date, 'YYYY-MM-DD')
        ELSE to_char(c.start_date, 'YYYY-MM-DD')
      END AS date
    FROM competitions c
    JOIN competition_sources s ON s.competition_id = c.id
    WHERE s.platform = 'wekkuk' AND c.start_date >= $1::date
    ORDER BY c.start_date, c.title, s.source_id
  `, [today]);
  const items = result.rows.map(item => ({ ...item, name: decodeHtml(item.name) }));
  const totalPages = Math.max(1, Math.ceil(items.length / CONTEST_PAGE_SIZE));
  const currentPage = Math.min(totalPages, Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1));
  return { page: currentPage, totalPages, items: items.slice((currentPage - 1) * CONTEST_PAGE_SIZE, currentPage * CONTEST_PAGE_SIZE) };
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
