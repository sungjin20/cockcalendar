import Link from "next/link";
import { notFound } from "next/navigation";
import { dbQuery } from "../../../db/postgres";
import { platformColors, platformLabels } from "../../../lib/platform-theme";
import PosterLightbox from "./PosterLightbox";

function formatDate(value: unknown) {
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return <div className="detail-info-row"><span>{label}</span><strong>{value || "정보 없음"}</strong></div>;
}

export default async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let item: any;
  try {
    const result = await dbQuery(`SELECT c.id::text,c.title,c.venue,c.region,c.start_date AS "startDate",c.end_date AS "endDate",c.organizer,c.supervisor,c.sponsor,c.description,c.platform_metadata AS metadata,s.platform,(SELECT array_agg(image_url ORDER BY id) FROM competition_images WHERE competition_id=c.id AND kind='poster') AS "posterUrls",(SELECT file_url FROM competition_documents WHERE competition_id=c.id AND name='official' ORDER BY created_at DESC LIMIT 1) AS "officialUrl" FROM competitions c LEFT JOIN competition_sources s ON s.competition_id=c.id WHERE c.id=$1 LIMIT 1`, [id]);
    item = result.rows[0];
  } catch {}
  if (!item) notFound();
  const posters: string[] = item.posterUrls || [];
  const period = formatDate(item.startDate) === formatDate(item.endDate) ? formatDate(item.startDate) : `${formatDate(item.startDate)} ~ ${formatDate(item.endDate)}`;
  const color = platformColors[item.platform] || "var(--ink)";
  const label = platformLabels[item.platform] || item.platform;
  return <main className="detail-page">
    <header className="site-header"><Link className="brand" href="/">CockCalendar</Link><Link className="back-link" href="/">← 전체 대회 보기</Link></header>
    <section className="detail-hero"><div className="detail-poster-wrap">{posters[0] ? <PosterLightbox src={posters[0]} alt={`${item.title} 포스터`} /> : <div className="poster-placeholder">포스터 준비 중</div>}</div><div className="detail-intro"><div className="event-topline"><span className="platform-chip" style={{ color }}>{label}</span><span>BADMINTON EVENT</span></div><h1>{item.title}</h1><div className="detail-meta"><InfoRow label="대회기간" value={period} /><InfoRow label="대회지역" value={item.region} /><InfoRow label="대회장소" value={item.venue} /><InfoRow label="주최" value={item.organizer} /><InfoRow label="주관" value={item.supervisor} /><InfoRow label="후원" value={item.sponsor} /></div></div></section>
    <section className="detail-body"><article><p className="eyebrow">ABOUT THIS EVENT</p><h2>대회 안내</h2><p className="description" style={{ whiteSpace: "pre-line" }}>{item.description || "등록된 공지사항이나 안내문이 없습니다."}</p></article><aside><p className="eyebrow">DOCUMENT & CONTACT</p><h2>대회 자료</h2>{item.officialUrl ? <a className="source-button" href={item.officialUrl} target="_blank" rel="noreferrer">대회 요강 열기 ↗</a> : <p className="description">등록된 대회 요강이 없습니다.</p>}</aside></section>
    {posters.length > 1 && <section style={{ maxWidth: 1080, margin: "0 auto", padding: "60px 5vw" }}><p className="eyebrow">POSTERS</p><h2>대회 포스터</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 20 }}>{posters.slice(1).map((url, index) => <PosterLightbox key={url} src={url} alt={`${item.title} 포스터 ${index + 2}`} />)}</div></section>}
  </main>;
}
