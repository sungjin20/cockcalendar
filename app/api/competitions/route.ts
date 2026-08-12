import { NextResponse } from "next/server";
import { dbQuery } from "../../../db/postgres";

const decodeHtmlEntities = (value: string) => value.replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'");

export async function GET(request: Request) {
  const url = new URL(request.url);
  const seoulToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const includePast = url.searchParams.get("includePast") === "true";
  const from = url.searchParams.get("from") || (includePast ? null : seoulToday);
  const to = url.searchParams.get("to");
  const platform = url.searchParams.get("platform");
  const query = url.searchParams.get("q")?.trim();
  const month = url.searchParams.get("month");
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const values: unknown[] = [];
  const bind = (value: unknown) => { values.push(value); return `$${values.length}`; };
  const filters: string[] = [];
  if (from) filters.push(`${to ? "COALESCE(c.end_date,c.start_date)" : "c.start_date"}>=${bind(from)}`);
  if (to) filters.push(`c.start_date<=${bind(to)}`);
  if (platform && platform !== "all") filters.push(`s.platform=${bind(platform)}`);
  if (query) filters.push(`(c.title ILIKE ${bind(`%${query}%`)} OR c.venue ILIKE $${values.length} OR c.region ILIKE $${values.length})`);
  if (month && month !== "all") filters.push(`to_char(c.start_date,'YYYY-MM')=${bind(month)}`);
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  try {
    const count = await dbQuery<{ total: number }>(`SELECT COUNT(*)::int AS total FROM competitions c JOIN competition_sources s ON s.competition_id=c.id ${where}`, values);
    const pageValues = [...values, limit, (page - 1) * limit];
    const result = await dbQuery(`SELECT c.id::text,c.title,c.venue,c.region,to_char(c.start_date,'YYYY-MM-DD') AS "startDate",to_char(COALESCE(c.end_date,c.start_date),'YYYY-MM-DD') AS "endDate",s.platform,(SELECT image_url FROM competition_images WHERE competition_id=c.id AND kind='poster' LIMIT 1) AS "posterUrl" FROM competitions c JOIN competition_sources s ON s.competition_id=c.id ${where} ORDER BY c.start_date ASC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, pageValues);
    const months = await dbQuery<{ month: string }>("SELECT DISTINCT to_char(start_date,'YYYY-MM') AS month FROM competitions WHERE start_date>=$1 ORDER BY month", [seoulToday]);
    const thisWeek = await dbQuery<{ total: number }>("SELECT COUNT(*)::int AS total FROM competitions WHERE start_date BETWEEN $1::date AND $1::date + (7 - EXTRACT(DOW FROM $1::date))::int", [seoulToday]);
    return NextResponse.json({ data: result.rows.map(row => ({ ...row, title: decodeHtmlEntities(row.title) })), total: count.rows[0]?.total || 0, page, limit, months: months.rows.map(row => row.month), thisWeekTotal: thisWeek.rows[0]?.total || 0, from, to, source: "postgres" });
  } catch (error) {
    return NextResponse.json({ data: [], total: 0, page, limit, months: [], from, to, source: "postgres", error: error instanceof Error ? error.message : "Database unavailable" });
  }
}
