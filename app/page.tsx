"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CompetitionCalendar from "./CompetitionCalendar";
import { platformColors, platformLabels } from "../lib/platform-theme";

type Event = { id: string; title: string; venue: string; region: string; startDate: string; endDate: string; platform: string; posterUrl?: string };
const labels = platformLabels;
const monthKey = (v: string) => v.slice(0, 7);
const monthLabel = (v: string) => { const [y, m] = v.split("-"); return `${y}년 ${Number(m)}월`; };
const formatDate = (v: string) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? v.slice(5, 10).replace("-", ".") : new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "short", day: "numeric", weekday: "short" }).format(d).replace(/\s/g, ""); };

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]), [query, setQuery] = useState(""), [platform, setPlatform] = useState("all"), [month, setMonth] = useState("all"), [page, setPage] = useState(1);
  useEffect(() => { fetch("/api/competitions").then(r => r.json()).then(r => setEvents(r.data || [])); }, []);
  const months = useMemo(() => [...new Set(events.map(e => monthKey(e.startDate)).filter(Boolean))].sort(), [events]);
  const filtered = useMemo(() => events.filter(e => (month === "all" || monthKey(e.startDate) === month) && (platform === "all" || e.platform === platform) && `${e.title} ${e.venue} ${e.region}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => a.startDate.localeCompare(b.startDate)), [events, month, platform, query]);
  const thisWeekCount = useMemo(() => { const start = new Date(); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(start.getDate() + (7 - start.getDay())); return events.filter(e => { const d = new Date(e.startDate); return d >= start && d <= end; }).length; }, [events]);
  useEffect(() => setPage(1), [query, month, platform]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 8)), currentPage = Math.min(page, pageCount), visible = filtered.slice((currentPage - 1) * 8, currentPage * 8);
  return <main>
    <header className="site-header"><Link className="brand" href="/"><span>CockCalendar</span></Link><nav><a href="#calendar">대회 달력</a><a href="#competitions">대회 찾기</a><a href="#about">서비스 소개</a></nav><Link className="admin-link" href="/admin">관리자 <span>↗</span></Link></header>
    <section className="hero"><div className="hero-copy"><p className="eyebrow">BADMINTON EVENT FINDER</p><h1>다음 대회,<br /><em>여기서</em> 찾아보세요.</h1><p className="hero-description">여러 플랫폼의 배드민턴 대회 일정을 한곳에서 확인하고, 나에게 맞는 경기를 빠르게 찾아보세요.</p><a className="hero-link" href="#calendar">대회 일정 달력 보기 <span>↓</span></a></div><div className="hero-art" aria-hidden="true"><div className="sun" /><div className="court-line" /><div className="shuttle">✦</div><div className="hero-note">THIS WEEK <strong>{thisWeekCount}</strong> EVENTS</div></div></section>
    <CompetitionCalendar events={events} />
    <section className="content" id="competitions"><div className="section-heading"><div><p className="eyebrow">UPCOMING EVENTS</p><h2>다가오는 대회 <span>{filtered.length}</span></h2></div><p className="today-note">오늘 이후 개최되는 대회만 보여드려요.<br />원하는 조건으로 좁혀보세요.</p></div>
      <div className="filters"><label className="search-field"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="대회명, 장소 검색" /></label><select aria-label="개최 월" value={month} onChange={e => setMonth(e.target.value)}><option value="all">전체 일정</option>{months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}</select><select aria-label="운영 플랫폼" value={platform} onChange={e => setPlatform(e.target.value)}><option value="all">전체 플랫폼</option>{Object.entries(labels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      {visible.length ? <><div className="event-list">{visible.map(e => <Link className="event-card" href={`/competitions/${e.id}`} key={e.id}><div className="date-block"><strong>{formatDate(e.startDate)}</strong><span>{e.region || "전국"}</span></div><div className="event-main"><div className="event-topline"><span className="platform-chip" style={{ color: platformColors[e.platform] || "var(--ink)", background: `${platformColors[e.platform] || "#173b39"}14` }}>{labels[e.platform] || e.platform}</span></div><h3>{e.title}</h3><p>⌖ {e.venue || "장소 정보 준비 중"}</p></div>{e.posterUrl && <img className="event-poster" src={e.posterUrl} alt="" />}<span className="card-arrow">↗</span></Link>)}</div><div className="pagination"><button disabled={currentPage === 1} onClick={() => setPage(p => p - 1)}>이전</button><span>{currentPage} / {pageCount}</span><button disabled={currentPage === pageCount} onClick={() => setPage(p => p + 1)}>다음</button></div></> : <div className="empty-state"><span>⌕</span><h3>조건에 맞는 대회가 없어요.</h3><p>검색어나 필터를 바꿔 다시 찾아보세요.</p></div>}
    </section><section className="about" id="about"><p className="eyebrow">ONE PLACE, ALL MATCHES</p><h2>좋아하는 경기에<br /><em>더 가까이.</em></h2><p>흩어져 있던 배드민턴 대회 정보를 한눈에 모아, 코트로 향하는 시간을 더 쉽게 만듭니다.</p></section><footer><span>© 2026 CockCalendar</span><span>Find your next match.</span></footer>
  </main>;
}
