"use client";

import { useEffect, useRef, useState } from "react";
import { appUrl } from "../../lib/url-prefix";

type Options = { categories: Record<string, { ages: Record<string, string[]> }> };
type Row = { category: string; age: string; level: string; count?: number; error?: string };
const labels: Record<string, string> = { BD: "혼복", MD: "남복", FD: "여복", MS: "남단", FS: "여단" };

export default function TeamSummary({ contestId, token, options }: { contestId: string; token: string; options: Options }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState("");
  const successful = useRef(new Map<string, number>());
  const cooldown = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const combinations: Row[] = Object.entries(options.categories).flatMap(([category, value]) =>
      Object.entries(value.ages).flatMap(([age, levels]) => [...new Set(levels)].map(level => ({ category, age, level }))));
    let next = 0;
    let expired = false;
    const keyOf = (row: Row) => JSON.stringify([contestId, token, row.category, row.age, row.level]);
    const sleep = (ms: number) => new Promise<void>((resolve, reject) => {
      if (controller.signal.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
      const abort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
      const timer = setTimeout(() => { controller.signal.removeEventListener("abort", abort); resolve(); }, ms);
      controller.signal.addEventListener("abort", abort, { once: true });
    });
    async function run() {
      setRows(combinations.map(row => ({ ...row, count: successful.current.get(keyOf(row)) })));
      setBusy(true);
      setMessage("");
      async function worker() {
        while (next < combinations.length && !controller.signal.aborted && !expired) {
          const index = next++;
          const row = combinations[index];
          if (successful.current.has(keyOf(row))) continue;
          try {
            let response: Response | undefined;
            for (let retry = 0; retry < 3; retry++) {
              const delay = Math.max(2000, cooldown.current - Date.now());
              if (delay > 2000) setMessage(`위꾹 요청 제한으로 약 ${Math.ceil(delay / 1000)}초 대기 후 재시도합니다.`);
              await sleep(delay);
              response = await fetch(appUrl("/api/wekkuk/players"), {
              method: "POST",
              headers: { "content-type": "application/json", ...(token !== "cookie-session" ? { authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify({ bct_id: contestId, tem_sex_play: row.category, tem_age: row.age, tem_level: row.level, ply_affiliation: "", ply_name: "" }),
              signal: controller.signal,
              });
              if (response.status !== 429) break;
              const header = response.headers.get("retry-after");
              const requested = header && /^\d+$/.test(header) ? Number(header) * 1000 : header ? Date.parse(header) - Date.now() : 0;
              const waitMs = Math.max(Number.isFinite(requested) ? requested : 0, 60000 * 2 ** retry);
              cooldown.current = Date.now() + waitMs;
              await response.body?.cancel();
              if (retry === 2 || waitMs > 300000) {
                expired = true;
                setMessage(`요청 제한이 계속되어 집계를 중단했습니다. 약 ${Math.ceil(waitMs / 1000)}초 후 미완료 항목을 다시 조회해 주세요.`);
                throw new Error("요청 제한으로 조회 중단");
              }
            }
            if (!response || controller.signal.aborted) return;
            setMessage("");
            if (response.status === 401) {
              expired = true;
              if (!controller.signal.aborted) setMessage("로그인이 만료되어 집계를 중단했습니다. 다시 로그인해 주세요.");
            }
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "조회 실패");
            if (!Array.isArray(data.items)) throw new Error("응답 형식 오류");
            if (!controller.signal.aborted) {
              successful.current.set(keyOf(row), data.items.length);
              setRows(current => current.map((item, i) => i === index ? { ...item, count: data.items.length } : item));
            }
          } catch (error) {
            if (controller.signal.aborted) return;
            setRows(current => current.map((item, i) => i === index ? { ...item, error: error instanceof Error ? error.message : "조회 실패" } : item));
          }
        }
      }
      await worker();
      if (!controller.signal.aborted) setBusy(false);
    }
    void run();
    return () => controller.abort();
  }, [contestId, token, options, attempt]);

  const completed = rows.filter(row => row.count !== undefined || row.error).length;
  const complete = rows.length > 0 && rows.every(row => row.count !== undefined);
  const total = rows.reduce((sum, row) => sum + (row.count ?? 0), 0);
  const categories = [...new Set(rows.map(row => row.category))];

  return <section className="panel">
    <div className="panel-head"><h3>참가팀 현황</h3><p>종목·연령대·등급별 참가팀을 합산합니다. 여러 종목에 출전한 팀은 종목마다 계산합니다.</p></div>
    <div className="form-body">
      <div className="team-summary-totals">
        <div><span>{complete ? "총 참가팀" : "현재 확인된 참가팀"}</span><strong>{total.toLocaleString()}팀</strong></div>
        {categories.map(category => {
          const group = rows.filter(row => row.category === category);
          return <div key={category}><span>{labels[category] || category}{group.some(row => row.count === undefined) ? " (집계 미완료)" : ""}</span><strong>{group.reduce((sum, row) => sum + (row.count ?? 0), 0).toLocaleString()}팀</strong></div>;
        })}
      </div>
      <p role="status">{busy ? `조회 중: ${completed} / ${rows.length}개 조합` : complete ? `${rows.length}개 조합 집계 완료` : rows.length ? `집계 미완료: ${rows.filter(row => row.error).length}개 실패, ${rows.length - completed}개 미조회` : "집계할 종목 정보가 없습니다."}</p>
      {message && <p role="alert">{message}</p>}
      <button type="button" className="btn btn-secondary" disabled={busy || complete} onClick={() => setAttempt(value => value + 1)}>미완료 항목 다시 조회</button>
      {rows.length > 0 && <div className="team-summary-table"><table>
        <caption>종목·연령대·등급별 참가팀 수</caption>
        <thead><tr><th scope="col">종목</th><th scope="col">연령대</th><th scope="col">등급</th><th scope="col">참가팀</th></tr></thead>
        <tbody>{rows.map(row => <tr key={JSON.stringify([row.category, row.age, row.level])}><td>{labels[row.category] || row.category}</td><td>{row.age}</td><td>{row.level}</td><td>{row.error ? <span title={row.error}>조회 실패</span> : row.count === undefined ? busy ? "조회 대기" : "미조회" : `${row.count}팀`}</td></tr>)}</tbody>
      </table></div>}
    </div>
  </section>;
}
