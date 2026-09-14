"use client";

import { FormEvent, useEffect, useState } from "react";
import { appUrl } from "../../lib/url-prefix";
import type { WekkukContest } from "../../lib/wekkuk";
import TeamSummary from "./TeamSummary";

export type Player = {
  sex_play?: string;
  age?: string;
  level?: string;
  ply1_name?: string;
  ply1_affiliation?: string;
  ply1_birth?: string;
  ply1_gender?: string;
  ply1_tShirt?: string;
  ply2_name?: string;
  ply2_affiliation?: string;
  ply2_birth?: string;
  ply2_gender?: string;
  ply2_tShirt?: string;
};

type ContestOptions = { categories: Record<string, { ages: Record<string, string[]> }> };
const CUSTOM_VALUE = "__custom__";
const sexPlayLabel: Record<string, string> = { BD: "혼복", MD: "남복", FD: "여복", MS: "남단", FS: "여단" };

export default function WekkukClient({
  initialContests,
  initialListMessage,
  initialTotalPages,
  initialLoggedIn,
  initialPage,
  initialSelected,
  initialPlayers,
  initialSearchMessage,
}: {
  initialContests: WekkukContest[];
  initialListMessage: string;
  initialTotalPages: number;
  initialLoggedIn: boolean;
  initialPage: number;
  initialSelected: WekkukContest | null;
  initialPlayers: Player[];
  initialSearchMessage: string;
}) {
  const [token, setToken] = useState(initialLoggedIn ? "cookie-session" : "");
  const [uid, setUid] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const contests = initialContests;
  const page = initialPage;
  const totalPages = initialTotalPages;
  const listBusy = false;
  const [selected, setSelected] = useState<WekkukContest | null>(initialSelected);
  const [sexPlay, setSexPlay] = useState("BD");
  const [age, setAge] = useState("");
  const [level, setLevel] = useState("");
  const [sexPlaySelection, setSexPlaySelection] = useState(CUSTOM_VALUE);
  const [ageSelection, setAgeSelection] = useState(CUSTOM_VALUE);
  const [levelSelection, setLevelSelection] = useState(CUSTOM_VALUE);
  const [contestOptions, setContestOptions] = useState<ContestOptions>({ categories: {} });
  const [optionsOwner, setOptionsOwner] = useState("");
  const [optionsBusy, setOptionsBusy] = useState(false);
  const [optionsMessage, setOptionsMessage] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [searchMessage, setSearchMessage] = useState(initialSearchMessage);
  const [searchBusy, setSearchBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setToken(sessionStorage.getItem("wekkuk_token") || (initialLoggedIn ? "cookie-session" : ""));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialLoggedIn]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset dependent form state when the selected contest/session changes */
    if (!selected || !token) {
      setContestOptions({ categories: {} });
      setSexPlaySelection(CUSTOM_VALUE);
      setAgeSelection(CUSTOM_VALUE);
      setLevelSelection(CUSTOM_VALUE);
      setSexPlay("");
      setAge("");
      setLevel("");
      setOptionsBusy(false);
      setOptionsMessage(selected ? "종목 정보를 불러오려면 먼저 로그인해 주세요." : "");
      return;
    }
    const controller = new AbortController();
    setContestOptions({ categories: {} });
    setOptionsBusy(true);
    setOptionsMessage("");
    fetch(appUrl("/api/wekkuk/options"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token !== "cookie-session" ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ bct_id: selected.id }),
      signal: controller.signal,
    }).then(async response => {
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (!response.ok) throw new Error(data.error);
      const options = data as ContestOptions;
      setContestOptions(options);
      setOptionsOwner(`${selected.id}-${token}`);
      const firstSexPlay = Object.keys(options.categories)[0] || "";
      const firstAge = Object.keys(options.categories[firstSexPlay]?.ages || {})[0] || "";
      const firstLevel = options.categories[firstSexPlay]?.ages[firstAge]?.[0] || "";
      setSexPlaySelection(firstSexPlay || CUSTOM_VALUE);
      setAgeSelection(firstAge || CUSTOM_VALUE);
      setLevelSelection(firstLevel || CUSTOM_VALUE);
      setSexPlay(firstSexPlay);
      setAge(firstAge);
      setLevel(firstLevel);
      setOptionsMessage(firstSexPlay || firstAge || firstLevel ? "선택한 대회의 종목 정보를 불러왔습니다." : "등록된 종목 정보가 없어 직접입력을 사용해 주세요.");
    }).catch(error => {
      if (error.name !== "AbortError") {
        setContestOptions({ categories: {} });
        setSexPlaySelection(CUSTOM_VALUE);
        setAgeSelection(CUSTOM_VALUE);
        setLevelSelection(CUSTOM_VALUE);
        setOptionsMessage(error instanceof Error ? error.message : "종목 정보를 불러오지 못했습니다.");
      }
    }).finally(() => { if (!controller.signal.aborted) setOptionsBusy(false); });
    return () => controller.abort();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [selected, token]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthMessage("");
    try {
      const response = await fetch(appUrl("/api/wekkuk/login"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ uid, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      sessionStorage.setItem("wekkuk_token", data.token);
      setToken(data.token);
      setPassword("");
      setAuthMessage("로그인되었습니다. 이제 참가자를 조회할 수 있어요.");
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    } finally {
      setAuthBusy(false);
    }
  }

  function logout() {
    sessionStorage.removeItem("wekkuk_token");
    setToken("");
    setPlayers([]);
    setAuthMessage("이 브라우저 탭에서 로그아웃했습니다.");
  }

  async function searchPlayers(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      setSearchMessage("먼저 Wekkuk 계정으로 로그인해 주세요.");
      return;
    }
    if (!selected) {
      setSearchMessage("왼쪽 목록에서 대회를 선택해 주세요.");
      return;
    }
    setSearchBusy(true);
    setSearchMessage("");
    setPlayers([]);
    try {
      const response = await fetch(appUrl("/api/wekkuk/players"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token !== "cookie-session" ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          bct_id: selected.id,
          tem_sex_play: sexPlay,
          tem_age: age,
          tem_level: level,
          ply_affiliation: affiliation,
          ply_name: playerName,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          sessionStorage.removeItem("wekkuk_token");
          setToken("");
        }
        throw new Error(data.error);
      }
      setPlayers(data.items || []);
      setSearchMessage(`${data.items?.length || 0}개 팀을 찾았습니다.`);
    } catch (error) {
      setSearchMessage(error instanceof Error ? error.message : "참가자 조회에 실패했습니다.");
    } finally {
      setSearchBusy(false);
    }
  }

  const sexPlayOptions = Object.keys(contestOptions.categories);
  const ageOptions = sexPlaySelection === CUSTOM_VALUE ? [] : Object.keys(contestOptions.categories[sexPlaySelection]?.ages || {});
  const levelOptions = sexPlaySelection === CUSTOM_VALUE || ageSelection === CUSTOM_VALUE ? [] : contestOptions.categories[sexPlaySelection]?.ages[ageSelection] || [];
  function changeSexPlay(value: string) {
    setSexPlaySelection(value);
    setSexPlay(value === CUSTOM_VALUE ? "" : value);
    const nextAge = value === CUSTOM_VALUE ? "" : Object.keys(contestOptions.categories[value]?.ages || {})[0] || "";
    const nextLevel = nextAge ? contestOptions.categories[value].ages[nextAge]?.[0] || "" : "";
    setAgeSelection(nextAge || CUSTOM_VALUE);
    setAge(nextAge);
    setLevelSelection(nextLevel || CUSTOM_VALUE);
    setLevel(nextLevel);
  }
  function changeAge(value: string) {
    setAgeSelection(value);
    setAge(value === CUSTOM_VALUE ? "" : value);
    const nextLevel = value === CUSTOM_VALUE || sexPlaySelection === CUSTOM_VALUE ? "" : contestOptions.categories[sexPlaySelection]?.ages[value]?.[0] || "";
    setLevelSelection(nextLevel || CUSTOM_VALUE);
    setLevel(nextLevel);
  }

  return <main className="wk-page">
    <div className="hero">
      <h1>배드민턴 참가자 조회</h1>
      <p>좌측 대회 목록에서 원하는 대회를 선택하면 상세 정보가 표시되고, 같은 화면에서 참가자 조회를 이어서 진행할 수 있습니다.</p>
    </div>

    <div className="layout">
      <aside className="panel contest-sidebar">
        <div className="panel-head"><h2>대회 목록</h2><p>Wekkuk 대회 리스트에서 조회할 대회를 선택하세요.</p></div>
        <div className="contest-list-wrap">
            <div className="contest-list-status" role="status">{initialListMessage || (listBusy ? "목록을 불러오는 중입니다…" : `${contests.length}개의 대회를 불러왔습니다.`)}{initialListMessage && <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>다시 시도</button>}</div>
          <div className="contest-list">
            {contests.map((contest) => <a href={`${appUrl("/wekkuk")}?page=${page}&contest=${contest.id}`} key={contest.id} className={`contest-card ${selected?.id === contest.id ? "active" : ""}`} onClick={() => setSelected(contest)}>
              <div className="contest-card-meta">{contest.status && <span className="contest-badge">{contest.status}</span>}<span>{contest.date}</span></div>
              <h4>{contest.name}</h4>
              <div className="contest-sub">{contest.organizer || "주최/주관 정보 없음"}</div>
              <div className="contest-sub contest-id">대회 ID: {contest.id}</div>
            </a>)}
          </div>
          <div className="pagination">
            <div className="page-info">{page} / {totalPages} 페이지</div>
            <div className="btn-row">
              {page > 1 ? <a className="btn btn-secondary" href={`${appUrl("/wekkuk")}?page=${page - 1}`}>이전</a> : <span className="btn btn-secondary disabled">이전</span>}
              {page < totalPages ? <a className="btn btn-secondary" href={`${appUrl("/wekkuk")}?page=${page + 1}`}>다음</a> : <span className="btn btn-secondary disabled">다음</span>}
            </div>
          </div>
        </div>
      </aside>

      <div className="content-col">
        <section className="panel">
          <div className="panel-head"><h3>Wekkuk 로그인</h3><p>참가자 조회를 위해 Wekkuk 계정으로 로그인하세요.</p></div>
          <div className="form-body">
            {token ? <div className="login-complete"><span className="status success">로그인되었습니다.</span><form action={appUrl("/api/wekkuk/web-logout")} method="post"><button className="btn btn-secondary" type="submit" onClick={logout}>로그아웃</button></form></div> :
              <form action={appUrl("/api/wekkuk/web-login")} method="post" onSubmit={login}>
                <div className="grid">
                  <div><label htmlFor="uid">아이디</label><input id="uid" name="uid" autoComplete="username" value={uid} onChange={(event) => setUid(event.target.value)} placeholder="Wekkuk 아이디" /></div>
                  <div><label htmlFor="password">비밀번호</label><input id="password" name="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="비밀번호" /></div>
                </div>
                <div className="btn-row form-actions"><button className="btn btn-primary" disabled={authBusy}>{authBusy ? "로그인 중…" : "로그인"}</button></div>
              </form>}
            {authMessage && <div className="status">{authMessage}</div>}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h3>선택한 대회</h3><p>대회를 클릭하면 주요 정보가 표시됩니다.</p></div>
          <div className="selected-contest">
            {selected ? <><div className="selected-head"><div><h2>{selected.name}</h2><div className="selected-id">대회 ID: {selected.id}</div></div>{selected.status && <span className="contest-badge">{selected.status}</span>}</div>
              <div className="info-grid"><div className="info-item"><strong>대회 기간</strong><div>{selected.date || "-"}</div></div><div className="info-item"><strong>주최/주관</strong><div>{selected.organizer || "-"}</div></div></div></>
              : <div className="selected-empty">아직 선택된 대회가 없습니다. 좌측 목록에서 대회를 선택해 주세요.</div>}
          </div>
        </section>

        {selected && token && optionsOwner === `${selected.id}-${token}` && !optionsBusy && Object.keys(contestOptions.categories).length > 0 && <TeamSummary key={`${selected.id}-${token}`} contestId={selected.id} token={token} options={contestOptions} />}

        <section className="panel">
          <div className="panel-head"><h3>참가자 조회</h3><p>선택한 대회의 ID를 사용해 참가자 목록을 조회합니다.</p></div>
          <div className="form-body">
            <form action={appUrl("/wekkuk")} method="get" onSubmit={searchPlayers}>
              <input type="hidden" name="search" value="1" /><input type="hidden" name="page" value={page} /><input type="hidden" name="contest" value={selected?.id || ""} />
              <input type="hidden" name="tem_sex_play" value={sexPlay} /><input type="hidden" name="tem_age" value={age} /><input type="hidden" name="tem_level" value={level} />
              <div className="grid">
                <div><label>선택된 대회 ID</label><input value={selected?.id || ""} placeholder="대회를 선택하면 자동으로 채워집니다." readOnly /></div>
                <div className="option-field"><label>종목</label><select value={sexPlaySelection} disabled={optionsBusy} onChange={(event) => changeSexPlay(event.target.value)}>{sexPlayOptions.map(value => <option value={value} key={value}>{sexPlayLabel[value] || value}</option>)}<option value={CUSTOM_VALUE}>직접입력</option></select>{sexPlaySelection === CUSTOM_VALUE && <input value={sexPlay} onChange={(event) => setSexPlay(event.target.value)} placeholder="예: 남복 또는 MD" />}</div>
                <div className="option-field"><label>연령대</label><select value={ageSelection} disabled={optionsBusy || sexPlaySelection === CUSTOM_VALUE} onChange={(event) => changeAge(event.target.value)}>{ageOptions.map(value => <option value={value} key={value}>{value}</option>)}<option value={CUSTOM_VALUE}>직접입력</option></select>{ageSelection === CUSTOM_VALUE && <input value={age} onChange={(event) => setAge(event.target.value)} placeholder="예: 2030" />}</div>
                <div className="option-field"><label>등급</label><select value={levelSelection} disabled={optionsBusy || ageSelection === CUSTOM_VALUE} onChange={(event) => { const value = event.target.value; setLevelSelection(value); setLevel(value === CUSTOM_VALUE ? "" : value); }}>{levelOptions.map(value => <option value={value} key={value}>{value}</option>)}<option value={CUSTOM_VALUE}>직접입력</option></select>{levelSelection === CUSTOM_VALUE && <input value={level} onChange={(event) => setLevel(event.target.value)} placeholder="예: B" />}</div>
                <div><label>소속</label><input name="ply_affiliation" value={affiliation} onChange={(event) => setAffiliation(event.target.value)} placeholder="예: DNA" /></div>
                <div><label>선수명</label><input name="ply_name" value={playerName} onChange={(event) => setPlayerName(event.target.value)} placeholder="예: 홍길동" /></div>
              </div>
              {selected && <div className="status">{optionsBusy ? "선택한 대회의 종목 정보를 불러오는 중입니다…" : optionsMessage}</div>}
              <div className="btn-row form-actions"><button className="btn btn-primary" disabled={searchBusy || !selected}>{searchBusy ? "조회 중…" : "조회"}</button></div>
            </form>
            {searchMessage && <div className="status success">{searchMessage}</div>}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h3>조회 결과</h3><p>선택한 대회의 참가자 결과를 보여줍니다.</p></div>
          <div className="result-body">
            {!players.length ? <p className="empty-result">아직 조회 결과가 없습니다.</p> :
              <><div className="empty-result result-summary">선택 대회: <strong>{selected?.name}</strong> / 대회 ID: {selected?.id} / 총 {players.length}건</div>
                <table><thead><tr><th>#</th><th>복식</th><th>연령대</th><th>등급</th><th>선수1</th><th>소속1</th><th>생년</th><th>성별1</th><th>티셔츠</th><th>선수2</th><th>소속2</th><th>생년</th><th>성별2</th><th>티셔츠</th></tr></thead>
                  <tbody>{players.map((player, index) => <tr key={`${player.ply1_name}-${player.ply2_name}-${index}`}><td>{index + 1}</td><td>{player.sex_play}</td><td>{player.age}</td><td>{player.level}</td><td>{player.ply1_name}</td><td>{player.ply1_affiliation}</td><td>{player.ply1_birth}</td><td>{player.ply1_gender}</td><td>{player.ply1_tShirt}</td><td>{player.ply2_name}</td><td>{player.ply2_affiliation}</td><td>{player.ply2_birth}</td><td>{player.ply2_gender}</td><td>{player.ply2_tShirt}</td></tr>)}</tbody></table></>}
          </div>
        </section>
      </div>
    </div>
  </main>;
}
