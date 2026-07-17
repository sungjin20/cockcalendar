"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { platformColors, platformLabels } from "../lib/platform-theme";

type Event = { id: string; title: string; startDate: string; endDate: string; platform: string };
const holidays = new Set([
  "2026-01-01", "2026-02-16", "2026-02-17", "2026-02-18", "2026-03-01", "2026-03-02",
  "2026-05-05", "2026-05-24", "2026-05-25", "2026-06-03", "2026-06-06", "2026-08-15",
  "2026-08-17", "2026-09-24", "2026-09-25", "2026-09-26", "2026-10-03", "2026-10-05",
  "2026-10-09", "2026-12-25",
]);
const navStyle = { height: 42, minWidth: 42, padding: "0 13px", border: "1px solid var(--line)", borderRadius: 7, background: "white", color: "var(--ink)", cursor: "pointer", fontWeight: 700 } as const;

export default function CompetitionCalendar({ events }: { events: Event[] }) {
  const now = new Date();
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [enabledPlatforms, setEnabledPlatforms] = useState<Set<string>>(() => new Set(["baddy", "wekkuk", "sponet"]));
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const years = Array.from({ length: 11 }, (_, index) => now.getFullYear() - 5 + index);
  const firstDay = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
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
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, i) => {
    const day = i - firstDay + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });
  const togglePlatform = (platform: string) => setEnabledPlatforms(current => {
    const next = new Set(current);
    if (next.has(platform)) next.delete(platform); else next.add(platform);
    return next;
  });

  return <section className="calendar-section" id="calendar" style={{ maxWidth: "none", width: "100%", margin: 0 }}>
    <div className="section-heading calendar-heading"><div><p className="eyebrow">EVENT CALENDAR</p><h2>{year}년 {month + 1}월</h2></div><div className="calendar-controls"><select aria-label="연도 선택" value={year} onChange={event => setCursor(new Date(Number(event.target.value), month, 1))}>{years.map(value => <option key={value} value={value}>{value}년</option>)}</select><select aria-label="월 선택" value={month} onChange={event => setCursor(new Date(year, Number(event.target.value), 1))}>{Array.from({ length: 12 }, (_, value) => <option key={value} value={value}>{value + 1}월</option>)}</select><button style={navStyle} onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="이전 달">←</button><button style={{ ...navStyle, minWidth: 70 }} onClick={() => setCursor(new Date(now.getFullYear(), now.getMonth(), 1))}>오늘</button><button style={navStyle} onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="다음 달">→</button></div></div>
    <div className="platform-legend" aria-label="플랫폼 일정 표시 설정">{Object.entries(platformLabels).map(([key, label]) => { const enabled = enabledPlatforms.has(key); const color = platformColors[key]; return <button type="button" key={key} aria-pressed={enabled} className={enabled ? "is-enabled" : "is-disabled"} style={{ borderColor: enabled ? color : undefined, background: enabled ? `${color}12` : undefined }} onClick={() => togglePlatform(key)}><i style={{ background: color }} /><strong>{label}</strong><small style={{ color: enabled ? color : undefined }}>{enabled ? "ON" : "OFF"}</small></button>; })}</div>
    <div className="calendar-grid"><div className="weekdays">{["일", "월", "화", "수", "목", "금", "토"].map((name, index) => <div key={name} className={index === 0 ? "sun-day" : index === 6 ? "sat-day" : ""}>{name}</div>)}</div><div className="days">{cells.map((day, index) => {
      const key = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
      const dayEvents = day ? (eventsByDay.get(key) || []).filter(event => enabledPlatforms.has(event.platform)) : [];
      const weekday = index % 7;
      const tone = holidays.has(key) || weekday === 0 ? "is-red-day" : weekday === 6 ? "is-blue-day" : "";
      return <div className={`day-cell ${key === today ? "is-today" : ""} ${tone}`} key={index}>{day && <><div className="day-number">{day}</div>{dayEvents.map(event => <Link key={event.id} href={`/competitions/${event.id}`} title={event.title} data-platform={event.platform} style={{ background: platformColors[event.platform] || "var(--ink)" }} className="calendar-event">{event.title}</Link>)}</>}</div>;
    })}</div></div>
  </section>;
}
