"use client";

import Link from "next/link";
import { type MouseEvent, useEffect, useMemo, useState } from "react";
import { readCalendarViewState, rememberMainScroll, writeCalendarViewState } from "../lib/main-view-state";
import { platformColors, platformLabels } from "../lib/platform-theme";
import { appUrl } from "../lib/url-prefix";

type Event = { id: string; title: string; startDate: string; endDate: string; platform: string };
const holidays = new Set(["2026-01-01", "2026-02-16", "2026-02-17", "2026-02-18", "2026-03-01", "2026-03-02", "2026-05-05", "2026-05-24", "2026-05-25", "2026-06-03", "2026-06-06", "2026-08-15", "2026-08-17", "2026-09-24", "2026-09-25", "2026-09-26", "2026-10-03", "2026-10-05", "2026-10-09", "2026-12-25"]);
const platformOrder = ["baddy", "sponet", "wekkuk", "facecock"];
const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];
const summaryWeekdays = [0, 6];
const getSeoulToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
const getInitialMonth = (today: string) => {
  const seoulToday = new Date(`${today}T00:00:00`);
  const endOfWeek = new Date(seoulToday);
  endOfWeek.setDate(seoulToday.getDate() + (6 - seoulToday.getDay()));
  const initialMonth = endOfWeek.getMonth() !== seoulToday.getMonth() ? endOfWeek : seoulToday;
  return new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1);
};

export default function CompetitionCalendar() {
  // Keep time-dependent highlighting out of prerendered HTML. Otherwise the date
  // at deployment can remain marked as today for the lifetime of the page cache.
  const [today, setToday] = useState("");
  const [events, setEvents] = useState<Event[]>([]);
  const [visibleMonth, setVisibleMonth] = useState(() => getInitialMonth(getSeoulToday()));
  const [focusedDate, setFocusedDate] = useState("");
  const [enabledPlatforms, setEnabledPlatforms] = useState<Set<string>>(() => new Set(platformOrder));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"calendar" | "summary">("calendar");
  const [calendarRestored, setCalendarRestored] = useState(false);
  const year = visibleMonth.getFullYear(), month = visibleMonth.getMonth();
  const currentYear = today ? Number(today.slice(0, 4)) : visibleMonth.getFullYear();
  const years = Array.from({ length: 11 }, (_, index) => currentYear - 5 + index);
  const firstDay = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month + 1, 0).getDate();
  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const event of events) {
      let day = new Date(`${event.startDate.slice(0, 10)}T00:00:00Z`);
      const last = new Date(`${(event.endDate || event.startDate).slice(0, 10)}T00:00:00Z`);
      for (let i = 0; i < 31 && day <= last; i++, day = new Date(day.getTime() + 86400000)) {
        const key = day.toISOString().slice(0, 10);
        map.set(key, [...(map.get(key) || []), event]);
      }
    }
    return map;
  }, [events]);
  const visibleEventsByDay = useMemo(() => new Map([...eventsByDay].map(([key, value]) => [key, value.filter(event => enabledPlatforms.has(event.platform)).sort((a, b) => {
    const orderDifference = platformOrder.indexOf(a.platform) - platformOrder.indexOf(b.platform);
    return orderDifference || a.title.localeCompare(b.title, "ko");
  })])), [eventsByDay, enabledPlatforms]);
  const selectedEvents = selectedDate ? visibleEventsByDay.get(selectedDate) || [] : [];
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => {
    const date = new Date(year, month, index - firstDay + 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { date, key, isCurrentMonth: date.getMonth() === month };
  });
  const weeks = Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
  const calendarFrom = cells[0]?.key;
  const calendarTo = cells.at(-1)?.key;
  useEffect(() => {
    const controller = new AbortController();
    if (calendarFrom && calendarTo) fetch(appUrl(`/api/competitions?includePast=true&from=${calendarFrom}&to=${calendarTo}&limit=500`), { signal: controller.signal })
      .then(response => response.json())
      .then(body => setEvents(body.data || []))
      .catch(error => { if (error.name !== "AbortError") setEvents([]); });
    return () => controller.abort();
  }, [calendarFrom, calendarTo]);
  useEffect(() => {
    // Client-only initialization deliberately replaces values omitted from prerendered HTML.
    /* eslint-disable react-hooks/set-state-in-effect */
    const clientToday = getSeoulToday();
    setToday(clientToday);
    const saved = readCalendarViewState();
    if (saved) {
      // Session restoration intentionally hydrates the independent calendar controls together.
      const restoredMonth = new Date(`${saved.visibleMonth}-01T00:00:00`);
      if (!Number.isNaN(restoredMonth.getTime())) {
        setVisibleMonth(new Date(restoredMonth.getFullYear(), restoredMonth.getMonth(), 1));
        setFocusedDate(`${saved.visibleMonth}-01`);
      }
      const restoredPlatforms = saved.enabledPlatforms.filter(platform => platformOrder.includes(platform));
      setEnabledPlatforms(new Set(restoredPlatforms));
      setMobileView(saved.mobileView === "summary" ? "summary" : "calendar");
    } else {
      setVisibleMonth(getInitialMonth(clientToday));
      setFocusedDate(clientToday);
    }
    setCalendarRestored(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  useEffect(() => {
    if (!calendarRestored) return;
    writeCalendarViewState({
      visibleMonth: `${year}-${String(month + 1).padStart(2, "0")}`,
      enabledPlatforms: [...enabledPlatforms],
      mobileView,
    });
  }, [calendarRestored, enabledPlatforms, mobileView, month, year]);
  const togglePlatform = (platform: string) => setEnabledPlatforms(current => {
    const next = new Set(current);
    if (next.has(platform)) next.delete(platform); else next.add(platform);
    return next;
  });
  const moveMonth = (offset: number) => {
    const next = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + offset, 1);
    setVisibleMonth(next);
    setFocusedDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`);
    setSelectedDate(null);
  };
  const formatSelectedDate = (value: string) => {
    const date = new Date(`${value}T00:00:00`);
    return new Intl.DateTimeFormat("ko-KR", { dateStyle: "full" }).format(date);
  };
  const handleEventLinkClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
    rememberMainScroll();
  };

  return <section className="calendar-section" id="calendar" style={{ maxWidth: "none", width: "100%", margin: 0 }}>
    <div className="section-heading calendar-heading"><div><p className="eyebrow">EVENT CALENDAR</p><h2>{year}년 {month + 1}월</h2></div><div className="calendar-controls"><button type="button" className="calendar-nav" aria-label="이전 달" title="이전 달" onClick={() => moveMonth(-1)}>‹</button><select className="calendar-select" aria-label="연도 선택" value={year} onChange={event => { const next = new Date(Number(event.target.value), month, 1); setVisibleMonth(next); setFocusedDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`); }}>{years.map(value => <option key={value} value={value}>{value}년</option>)}</select><select className="calendar-select" aria-label="월 선택" value={month} onChange={event => { const next = new Date(year, Number(event.target.value), 1); setVisibleMonth(next); setFocusedDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`); }}>{Array.from({ length: 12 }, (_, value) => <option key={value} value={value}>{value + 1}월</option>)}</select><button type="button" className="calendar-today" onClick={() => { const date = new Date(`${today}T00:00:00`); setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1)); setFocusedDate(today); }}>오늘</button><button type="button" className="calendar-nav" aria-label="다음 달" title="다음 달" onClick={() => moveMonth(1)}>›</button></div></div>
    <div className="platform-legend" aria-label="플랫폼별 일정 표시 설정">{Object.entries(platformLabels).map(([key, label]) => { const enabled = enabledPlatforms.has(key); const color = platformColors[key]; return <button type="button" key={key} aria-pressed={enabled} className={enabled ? "is-enabled" : "is-disabled"} style={{ borderColor: enabled ? color : undefined, background: enabled ? `${color}12` : undefined }} onClick={() => togglePlatform(key)}><i style={{ background: color }} /><strong>{label}</strong><small style={{ color: enabled ? color : undefined }}>{enabled ? "ON" : "OFF"}</small></button>; })}</div>
    <div className="mobile-calendar-view-switch" aria-label="모바일 달력 보기 방식">
      <button type="button" className={mobileView === "calendar" ? "is-active" : ""} aria-pressed={mobileView === "calendar"} onClick={() => setMobileView("calendar")}>달력 모드</button>
      <button type="button" className={mobileView === "summary" ? "is-active" : ""} aria-pressed={mobileView === "summary"} onClick={() => setMobileView("summary")}>요약 모드</button>
    </div>
    <div className={`calendar-grid ${mobileView === "summary" ? "is-mobile-hidden" : ""}`}><div className="weekdays">{weekdayLabels.map((name, index) => <div key={name} className={index === 0 ? "sun-day" : index === 6 ? "sat-day" : ""}>{name}</div>)}</div><div className="days">{cells.map(({ date, key, isCurrentMonth }, index) => {
      const dayEvents = visibleEventsByDay.get(key) || [];
      const weekday = index % 7;
      const tone = holidays.has(key) || weekday === 0 ? "is-red-day" : weekday === 6 ? "is-blue-day" : "";
      return <div className={`day-cell ${isCurrentMonth ? "" : "is-outside-month"} ${key === today ? "is-today" : ""} ${key < today ? "is-past-day" : ""} ${tone} ${dayEvents.length ? "has-events" : ""}`} key={key} role="button" tabIndex={key === focusedDate ? 0 : -1} aria-label={`${key} 대회 ${dayEvents.length}개`} onFocus={() => setFocusedDate(key)} onClick={() => { setFocusedDate(key); setSelectedDate(key); }} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedDate(key); } }}><div className="day-number">{date.getDate()}</div><div className="day-event-count">{dayEvents.length ? `${dayEvents.length}개` : ""}</div>{dayEvents.slice(0, 2).map(event => <Link key={event.id} href={`/competitions/${event.id}`} title={event.title} data-platform={event.platform} style={{ background: platformColors[event.platform] || "var(--ink)" }} className="calendar-event" onClick={handleEventLinkClick}>{event.title}</Link>)}{dayEvents.length > 2 && <span className="more-events">+{dayEvents.length - 2}개 더보기</span>}</div>;
    })}</div></div>
    <section className={`calendar-summary ${mobileView === "summary" ? "is-mobile-visible" : ""}`} aria-label={`${year}년 ${month + 1}월 대회 요약 달력`}>
      {summaryWeekdays.length > 0 ? <div className="calendar-summary-grid" style={{ "--summary-columns": summaryWeekdays.length } as React.CSSProperties}>
        <div className="calendar-summary-weekdays">{summaryWeekdays.map(weekday => <strong key={weekday} className={weekday === 0 ? "is-sunday" : weekday === 6 ? "is-saturday" : ""}>{weekdayLabels[weekday]}요일</strong>)}</div>
        {weeks.map((week, weekIndex) => <div className="calendar-summary-week" key={weekIndex}>{summaryWeekdays.map(weekday => {
          const cell = week.find(({ date }) => date.getDay() === weekday);
          if (!cell || !cell.isCurrentMonth) return <div className="calendar-summary-day is-empty" key={weekday} aria-hidden="true" />;
          const dayEvents = visibleEventsByDay.get(cell.key) || [];
          return <div className={`calendar-summary-day ${weekday === 0 ? "is-sunday" : weekday === 6 ? "is-saturday" : ""}`} key={weekday}>
            <div className="calendar-summary-date"><strong>{cell.date.getDate()}</strong></div>
            <div className="calendar-summary-events">{dayEvents.map(event => <Link href={`/competitions/${event.id}`} className="calendar-summary-event" key={event.id} style={{ "--event-color": platformColors[event.platform] || "var(--ink)" } as React.CSSProperties} onClick={handleEventLinkClick}><small>{platformLabels[event.platform] || event.platform}</small><span>{event.title}</span></Link>)}</div>
          </div>;
        })}</div>)}
      </div> : <div className="calendar-summary-empty">현재 조건에 등록된 대회가 없습니다.</div>}
    </section>
    {selectedDate && <div className="calendar-modal-backdrop" role="presentation" onClick={() => setSelectedDate(null)}><section className="calendar-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-modal-title" onClick={event => event.stopPropagation()}><button className="calendar-modal-close" type="button" aria-label="팝업 닫기" onClick={() => setSelectedDate(null)}>×</button><p className="eyebrow">SELECTED DATE</p><h3 id="calendar-modal-title">{formatSelectedDate(selectedDate)}</h3>{selectedEvents.length ? <div className="calendar-modal-events">{selectedEvents.map(event => <Link key={event.id} href={`/competitions/${event.id}`} className="calendar-modal-event" onClick={handleEventLinkClick}><span style={{ background: platformColors[event.platform] || "var(--ink)" }} />{event.title}<b>›</b></Link>)}</div> : <p className="calendar-modal-empty">이 날짜에 열리는 대회가 없습니다.</p>}</section></div>}
  </section>;
}
