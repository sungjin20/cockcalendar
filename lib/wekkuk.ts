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

function parseContestPage(html: string) {
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
  return { totalPages, items };
}

const CONTEST_PAGE_SIZE = 10;
let contestCache: { items: WekkukContest[]; expires: number } | undefined;
let contestRequest: Promise<WekkukContest[]> | undefined;
let contestRetryAfter = 0;
let contestError = "";
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function loadAllContests() {
  async function fetchPage(page: number) {
    for (let attempt = 0; attempt < 4; attempt++) {
      await wait(1000);
      const response = await wekkukFetch(`/contest_badminton/contest?page=${page}`);
      if (response.ok) return parseContestPage(await response.text());
      if (response.status !== 429) throw new Error("위꾹 대회 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      const retryAfter = response.headers.get("retry-after");
      await response.body?.cancel();
      const delay = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) * 1000 : retryAfter ? Date.parse(retryAfter) - Date.now() : 0;
      const backoff = Math.max(Number.isFinite(delay) ? delay : 0, 5000 * 2 ** attempt);
      if (attempt === 3 || backoff > 30000) {
        contestRetryAfter = Date.now() + Math.max(backoff, 60000);
        throw new Error("위꾹 서버의 요청 제한으로 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
      await wait(backoff);
    }
    throw new Error("대회 목록을 불러오지 못했습니다.");
  }
  const first = await fetchPage(1);
  const pages: WekkukContest[][] = [first.items];
  for (let page = 2; page <= first.totalPages; page++) {
    pages[page - 1] = (await fetchPage(page)).items;
  }
  return [...new Map(pages.flat().map(item => [item.id, item])).values()];
}

export async function getWekkukContests(page = 1) {
  if (!contestCache || contestCache.expires <= Date.now()) {
    if (Date.now() >= contestRetryAfter) {
      contestRequest ??= loadAllContests().then(items => {
        contestCache = { items, expires: Date.now() + 30 * 60 * 1000 };
        contestError = "";
        return items;
      }).catch(error => {
        contestRetryAfter = Math.max(contestRetryAfter, Date.now() + 60000);
        contestError = error instanceof Error ? error.message : "대회 목록을 불러오지 못했습니다.";
        throw error;
      }).finally(() => { contestRequest = undefined; });
      // Serve the previous complete list while refreshing it in the background.
      if (contestCache) void contestRequest.catch(() => {});
      else await contestRequest;
    } else if (!contestCache) {
      throw new Error(contestError || "잠시 후 대회 목록을 다시 조회해 주세요.");
    }
  }
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const items = (contestCache?.items || []).filter(item => {
    const date = item.date.match(/(20\d{2})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/);
    const startDate = date ? `${date[1]}-${date[2].padStart(2, "0")}-${date[3].padStart(2, "0")}` : "";
    return startDate >= today && !isExcludedWekkukOrganizer(item.organizer) && !isExcludedWekkukTitle(item.name);
  });
  const totalPages = Math.max(1, Math.ceil(items.length / CONTEST_PAGE_SIZE));
  const currentPage = Math.min(totalPages, Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1));
  return { page: currentPage, totalPages, warning: contestCache && contestCache.expires <= Date.now() ? "목록 갱신 중이거나 지연되어 이전 조회 결과를 표시합니다." : "", items: items.slice((currentPage - 1) * CONTEST_PAGE_SIZE, currentPage * CONTEST_PAGE_SIZE) };
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
