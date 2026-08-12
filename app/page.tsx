"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CompetitionCalendar from "./CompetitionCalendar";
import { platformColors, platformLabels } from "../lib/platform-theme";
import { readMainFilterState, readMainScroll, rememberMainScroll, writeMainFilterState } from "../lib/main-view-state";
import { appUrl } from "../lib/url-prefix";

type Event = { id: string; title: string; venue: string; region: string; startDate: string; endDate: string; platform: string; posterUrl?: string };
const labels = platformLabels;
const monthLabel = (v: string) => { const [y, m] = v.split("-"); return `${y}년 ${Number(m)}월`; };
const formatDate = (v: string) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? v.slice(5, 10).replace("-", ".") : new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "short", day: "numeric", weekday: "short" }).format(d).replace(/\s/g, ""); };

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [months, setMonths] = useState<string[]>([]);
  const [thisWeekCount, setThisWeekCount] = useState(0);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("all");
  const [month, setMonth] = useState("all");
  const [page, setPage] = useState(1);
  const [viewRestored, setViewRestored] = useState(false);
  const scrollRestored = useRef(false);
  const filtersInitialized = useRef(false);
  useEffect(() => {
    if (!viewRestored) return;
    const params = new URLSearchParams({ page: String(page), limit: "8" });
    if (query) params.set("q", query);
    if (platform !== "all") params.set("platform", platform);
    if (month !== "all") params.set("month", month);
    const controller = new AbortController();
    fetch(appUrl(`/api/competitions?${params}`), { signal: controller.signal })
      .then(r => r.json())
      .then(r => { setEvents(r.data || []); setTotal(r.total || 0); setMonths(r.months || []); setThisWeekCount(r.thisWeekTotal || 0); })
      .catch(error => { if (error.name !== "AbortError") setEvents([]); })
      .finally(() => setEventsLoaded(true));
    return () => controller.abort();
  }, [month, page, platform, query, viewRestored]);
  useEffect(() => {
    const saved = readMainFilterState();
    if (saved) {
      // Session restoration intentionally hydrates the independent filter controls together.
      /* eslint-disable react-hooks/set-state-in-effect */
      setQuery(saved.query || "");
      setPlatform(saved.platform || "all");
      setMonth(saved.month || "all");
      setPage(Math.max(1, saved.page || 1));
      /* eslint-enable react-hooks/set-state-in-effect */
    }
    setViewRestored(true);
  }, []);
  useEffect(() => {
    if (!viewRestored) return;
    writeMainFilterState({ query, platform, month, page });
  }, [month, page, platform, query, viewRestored]);
  useEffect(() => {
    if (!viewRestored || !eventsLoaded || scrollRestored.current) return;
    const savedScroll = readMainScroll();
    if (savedScroll === null) return;
    scrollRestored.current = true;
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: savedScroll, behavior: "auto" })));
  }, [eventsLoaded, viewRestored]);
  useEffect(() => {
    if (!viewRestored) return;
    if (!filtersInitialized.current) {
      filtersInitialized.current = true;
      return;
    }
    setPage(1);
  }, [query, month, platform, viewRestored]);
  const pageCount = Math.max(1, Math.ceil(total / 8)), currentPage = Math.min(page, pageCount), visible = events;
  return <main>
    <header className="site-header"><Link className="brand" href="/"><span>CockCalendar</span></Link><nav><a href="#calendar">대회 달력</a><a href="#competitions">대회 찾기</a><a href="#about">서비스 소개</a></nav><Link className="admin-link" href="/admin">관리자 <span>↗</span></Link></header>
    <section className="hero"><div className="hero-copy"><p className="eyebrow">BADMINTON EVENT FINDER</p><h1>다음 대회,<br /><em>여기서</em> 찾아보세요.</h1><p className="hero-description">여러 플랫폼의 배드민턴 대회 일정을 한곳에서 확인하고, 나에게 맞는 경기를 빠르게 찾아보세요.</p><a className="hero-link" href="#calendar">대회 일정 달력 보기 <span>↓</span></a></div><div className="hero-art" aria-hidden="true"><div className="sun" /><div className="court-line" /><div className="shuttle">✦</div><div className="hero-note">THIS WEEK <strong>{thisWeekCount}</strong> EVENTS</div></div></section>
    <CompetitionCalendar />
    <section className="content" id="competitions"><div className="section-heading"><div><p className="eyebrow">UPCOMING EVENTS</p><h2>다가오는 대회 <span>{total}</span></h2></div><p className="today-note">오늘 이후 개최되는 대회만 보여드려요.</p></div>
      <div className="filters"><div className="search-field"><span>⌕</span><input aria-label="대회명 또는 장소 검색" value={query} onChange={e => setQuery(e.target.value)} placeholder="대회명, 장소 검색" />{query && <button type="button" className="search-clear" onClick={() => setQuery("")} aria-label="검색어 초기화">초기화</button>}</div><select aria-label="개최 월" value={month} onChange={e => setMonth(e.target.value)}><option value="all">전체 일정</option>{months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}</select><select aria-label="운영 플랫폼" value={platform} onChange={e => setPlatform(e.target.value)}><option value="all">전체 플랫폼</option>{Object.entries(labels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      {visible.length ? <><div className="event-list">{visible.map(e => <Link className="event-card" href={`/competitions/${e.id}`} key={e.id} onClick={rememberMainScroll}><div className="date-block"><strong>{formatDate(e.startDate)}</strong><span>{e.region || "전국"}</span></div><div className="event-main"><div className="event-topline"><span className="platform-chip" style={{ color: platformColors[e.platform] || "var(--ink)", background: `${platformColors[e.platform] || "#173b39"}14` }}>{labels[e.platform] || e.platform}</span></div><h3>{e.title}</h3><p>⌖ {e.venue || "장소 정보 준비 중"}</p></div>{e.posterUrl ? <img className="event-poster" src={e.posterUrl} alt="" /> : <div className="event-poster event-poster-placeholder" aria-hidden="true">NO POSTER</div>}<span className="card-arrow">↗</span></Link>)}</div><div className="pagination"><button disabled={currentPage === 1} onClick={() => setPage(p => p - 1)}>이전</button><span>{currentPage} / {pageCount}</span><button disabled={currentPage === pageCount} onClick={() => setPage(p => p + 1)}>다음</button></div></> : <div className="empty-state"><span>⌕</span><h3>조건에 맞는 대회가 없어요.</h3><p>검색어나 필터를 바꿔 다시 찾아보세요.</p></div>}
    </section><section className="about" id="about"><p className="eyebrow">ONE PLACE, ALL MATCHES</p><h2>좋아하는 경기에<br /><em>더 가까이.</em></h2><p>흩어져 있던 배드민턴 대회 정보를 한눈에 모아, 코트로 향하는 시간을 더 쉽게 만듭니다.</p></section><footer><span>© 2026 CockCalendar</span><span>Find your next match.</span></footer>
  </main>;
}
