import { NextResponse } from "next/server";
import { wekkukFetch } from "../../../../lib/wekkuk";

export const dynamic = "force-dynamic";

type WekkukPlayer = { sex_play?: unknown; age?: unknown; level?: unknown };
type OptionTree = Record<string, { ages: Record<string, string[]> }>;
type ContestOptions = { categories: OptionTree };
type CategoryData = Record<string, { sub?: Record<string, { items?: { txt?: unknown }[] }> }>;

function optionsFromPlayers(items: WekkukPlayer[]): ContestOptions {
  const categories: OptionTree = {};
  for (const item of items) {
    const sexPlay = String(item.sex_play || "").trim(), age = String(item.age || "").trim(), level = String(item.level || "").trim();
    if (!sexPlay || !age || !level) continue;
    categories[sexPlay] ||= { ages: {} };
    categories[sexPlay].ages[age] ||= [];
    if (!categories[sexPlay].ages[age].includes(level)) categories[sexPlay].ages[age].push(level);
  }
  for (const category of Object.values(categories)) {
    category.ages = Object.fromEntries(Object.entries(category.ages).sort(([a], [b]) => a.localeCompare(b, "ko", { numeric: true })).map(([age, levels]) => [age, levels.sort((a, b) => a.localeCompare(b, "ko", { numeric: true }))]));
  }
  return { categories };
}

function decodeHtml(value: string) {
  return value.replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&#x27;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
}

function selectValues(html: string, fieldPattern: RegExp) {
  const values: string[] = [];
  for (const match of html.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)) {
    const identity = `${html.slice(Math.max(0, (match.index || 0) - 240), match.index)} ${match[1]} ${match[2].slice(0, 200)}`;
    if (!fieldPattern.test(identity)) continue;
    for (const option of match[2].matchAll(/<option\b[^>]*value=["']([^"']*)["'][^>]*>([\s\S]*?)<\/option>/gi)) {
      const value = decodeHtml(option[1]).trim();
      if (value && !/^(?:all|전체|선택)$/i.test(value)) values.push(value);
    }
  }
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "ko", { numeric: true }));
}

function optionsFromApplyPage(html: string): ContestOptions {
  const marker = html.match(/const\s+categoryData\s*=\s*/);
  if (marker?.index !== undefined) {
    const start = marker.index + marker[0].length;
    let depth = 0, quoted = false, escaped = false, end = -1;
    for (let index = start; index < html.length; index++) {
      const character = html[index];
      if (quoted) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') quoted = false;
      } else if (character === '"') quoted = true;
      else if (character === "{") depth++;
      else if (character === "}" && --depth === 0) { end = index + 1; break; }
    }
    if (end > start) try {
      const categories = JSON.parse(html.slice(start, end)) as CategoryData;
      return { categories: Object.fromEntries(Object.entries(categories).map(([sexPlay, category]) => [sexPlay, { ages: Object.fromEntries(Object.entries(category.sub || {}).map(([age, group]) => [age, [...new Set((group.items || []).map(item => String(item.txt || "").trim()).filter(Boolean))]])) }])) };
    } catch {}
  }
  const sexPlays = selectValues(html, /sex[_-]?play|복식|종목/i);
  const ages = selectValues(html, /(?:^|[^a-z])age|연령/i);
  const levels = selectValues(html, /level|grade|급수|등급/i);
  return { categories: Object.fromEntries(sexPlays.map(sexPlay => [sexPlay, { ages: Object.fromEntries(ages.map(age => [age, levels])) }])) };
}

export async function POST(request: Request) {
  const cookieToken = request.headers.get("cookie")?.match(/(?:^|;\s*)wekkuk_token=([^;]+)/)?.[1];
  const authorization = request.headers.get("authorization") || (cookieToken ? `Bearer ${decodeURIComponent(cookieToken)}` : null);
  if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let bctId = "";
  try {
    const input = await request.json() as { bct_id?: unknown };
    bctId = String(input.bct_id || "").trim();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  if (!bctId) return NextResponse.json({ error: "대회를 선택해 주세요." }, { status: 400 });

  try {
    const applyResponse = await wekkukFetch(`/contest_badminton/apply/${encodeURIComponent(bctId)}/teams`, {
      headers: { authorization },
    });
    if (applyResponse.ok) {
      const options = optionsFromApplyPage(await applyResponse.text());
      if (Object.keys(options.categories).length) {
        return NextResponse.json({ ...options, source: "apply" });
      }
    }

    const results = await Promise.allSettled(["BD", "MD", "FD"].map(async sexPlay => {
      const form = new URLSearchParams({
        CT: "", TI: "", AP: "", VR: "", LA: "", mode: "get_player", out_type: "O",
        bct_id: bctId, tem_sex_play: sexPlay, tem_age: "", tem_level: "", ply_affiliation: "", ply_name: "",
      });
      const response = await wekkukFetch("/contest_badminton/apply_check_get", {
        method: "POST",
        headers: { authorization, "content-type": "application/x-www-form-urlencoded" },
        body: form,
      });
      const data = JSON.parse(await response.text());
      return data.err === "N" ? (data.subItems || []) as WekkukPlayer[] : [];
    }));
    const items = results.flatMap(result => result.status === "fulfilled" ? result.value : []);
    return NextResponse.json({ ...optionsFromPlayers(items), source: "players" });
  } catch {
    return NextResponse.json({ categories: {}, source: "unavailable" });
  }
}
