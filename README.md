# CockCalendar

여러 플랫폼에 흩어진 배드민턴 대회 일정을 한곳에서 확인할 수 있는 통합 캘린더입니다.
다가오는 대회를 월별 달력으로 살펴보고, 대회명·장소·개최 월·플랫폼 조건으로 원하는 대회를 빠르게 찾을 수 있습니다.

## 주요 기능

- 여러 배드민턴 플랫폼의 대회 일정 통합
- 월별 달력과 날짜별 대회 표시
- 대회명 및 장소 검색
- 개최 월과 플랫폼 필터
- 대회 상세 정보, 포스터 및 관련 문서 제공
- 다가오는 대회 중심의 목록과 페이지네이션
- PC와 모바일 환경을 지원하는 반응형 UI
- PostgreSQL 기반 데이터 저장
- 주기적으로 대회 정보를 갱신하는 수집 워커

## 기술 구성

- Next.js 16
- React 19
- TypeScript
- PostgreSQL
- Drizzle ORM
- vinext / Cloudflare Workers

## 시작하기

### 요구 사항

- Node.js 22.13.0 이상
- npm
- PostgreSQL

### 설치

```bash
git clone https://github.com/sungjin20/cockcalendar.git
cd cockcalendar
npm install
cp .env.example .env.local
```

`.env.local`의 `DATABASE_URL`을 사용할 PostgreSQL 환경에 맞게 수정합니다.

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/badminton_events
```

일부 외부 플랫폼의 데이터를 수집하려면 해당 계정 정보도 설정해야 합니다.

```dotenv
BADDY_TEL_NO=your-account-phone
BADDY_KAKAO_SNS_ID=your-kakao-sns-id
```

### 데이터베이스 초기화

PostgreSQL 서버가 실행 중인 상태에서 다음 명령을 실행합니다.

```bash
npm run db:init
```

명령은 데이터베이스가 없으면 생성하고 CockCalendar에서 필요한 테이블과 인덱스를 초기화합니다.

### 개발 서버 실행

```bash
npm run dev
```

개발 환경에서는 다음 두 프로세스가 함께 실행됩니다.

- 애플리케이션 서버: `http://localhost:3001`
- 개발 프록시: `http://localhost:3000`

일반적인 로컬 확인에는 `http://localhost:3000`을 사용합니다.

## 대회 정보 수집

수집 워커는 지원 플랫폼의 대회 정보를 가져와 PostgreSQL에 저장합니다. 기본 수집 주기는 데이터베이스 설정값을 따르며, 워커는 PostgreSQL advisory lock을 사용해 중복 실행을 방지합니다.

```bash
npm run worker
```

애플리케이션과 수집 워커를 함께 실행하려면 다음 명령을 사용합니다.

```bash
npm run start:all
```

## 공개 API

### 대회 목록

```http
GET /api/competitions
```

지원하는 쿼리 매개변수:

| 매개변수 | 설명 | 예시 |
| --- | --- | --- |
| `from` | 이 날짜 이후에 시작하는 대회 조회 | `2026-08-01` |
| `platform` | 특정 플랫폼의 대회만 조회 | `sponet` |

요청 예시:

```bash
curl "http://localhost:3000/api/competitions?from=2026-08-01"
```

### 대회 상세

```http
GET /api/competitions/:id
```

대회의 기본 정보와 출처, 포스터, 관련 문서를 반환합니다.

## 주요 명령

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 프록시와 Next.js 서버 실행 |
| `npm run dev:next` | Next.js 개발 서버만 실행 |
| `npm run dev:proxy` | 개발 프록시만 실행 |
| `npm run db:init` | PostgreSQL 데이터베이스 및 스키마 초기화 |
| `npm run db:generate` | Drizzle 마이그레이션 생성 |
| `npm run worker` | 대회 정보 수집 워커 실행 |
| `npm run build` | vinext 프로덕션 빌드 |
| `npm run start:cloudflare` | vinext 프로덕션 서버 실행 |
| `npm run lint` | ESLint 검사 |
| `npm test` | 빌드 및 렌더링 테스트 |

## 프로젝트 구조

```text
app/
├── api/                  # 공개 데이터 API
├── competitions/         # 대회 상세 화면
├── CompetitionCalendar.tsx
└── page.tsx              # 메인 대회 검색 화면
db/
├── postgres.ts           # PostgreSQL 연결
├── schema.sql            # 실행용 스키마
└── schema.ts             # 스키마 참조
lib/
├── collector.ts          # 플랫폼별 데이터 수집
└── platform-theme.ts     # 플랫폼 표시 정보
scripts/
├── db-init.mjs           # 데이터베이스 초기화
└── dev-proxy.mjs         # 로컬 개발 프록시
workers/
└── collector-worker.ts   # 주기적 수집 워커
```

## 배포

프로덕션 빌드는 vinext를 통해 생성합니다.

```bash
npm run build
npm run start:cloudflare
```

배포 환경에는 최소한 유효한 `DATABASE_URL`을 설정해야 합니다. 외부 데이터 수집을 운영할 경우 사용하는 플랫폼에 필요한 인증 정보도 함께 구성합니다.
