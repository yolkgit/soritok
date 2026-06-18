# 🪑 소리톡 (soritok) — 모노레포

여러 서비스를 한 리포에 모은 **npm workspaces** 모노레포입니다. 한 도메인(soritok.com)에서
경로로 각 서비스를 오갑니다.

| 경로 | 앱 | 설명 |
| --- | --- | --- |
| `/` | [`apps/hub`](apps/hub) | 책상 허브 — 사물을 클릭해 서비스로 이동 |
| `/weekly/` | [`apps/weekly`](apps/weekly) | 위클리 페이퍼 (React + Express/Prisma/MySQL 백엔드) |
| `/gnugo/` | [`apps/gnugo`](apps/gnugo) | 어린이 바둑교실 (React + WASM 바둑엔진) |
| `/games/` | [`apps/games`](apps/games) | 미니게임 5종 + 전역 리더보드 |
| `/study/` | [`apps/study`](apps/study) | 초/중/고 단원별 시험정리(수기노트) + Threads 자동수집 |
| `/api/` | `apps/weekly` 백엔드 | 위클리 Express 서버 (:4000) |

> 원본 리포 `yolkgit/weekly`, `yolkgit/gnugo` 는 그대로 남아 있으며, 여기에는 소스를 가져와
> 통합했습니다.

---

## 🔐 통합 로그인 (SSO)

한 번 로그인하면 세 앱 어디서나 같은 세션을 씁니다.

- **인증 서버**: weekly 백엔드(`/api/auth/*`, JWT 30일). 별도 인증 서버를 두지 않습니다.
- **공유 패키지**: [`packages/auth`](packages/auth) (`@soritok/auth`) — `AuthProvider`/`useAuth`,
  `<AccountBar/>`(우상단 로그인/계정 칩), `<LoginModal/>`, `authApi`. hub·gnugo 가 사용.
- **세션 공유 원리**: 토큰을 `localStorage`(`token`/`user`)에 저장하는데, 프로덕션은 **단일
  오리진**(soritok.com)이라 `/`·`/weekly/`·`/gnugo/` 가 같은 `localStorage` 를 공유합니다.
  → 한 앱에서 로그인하면 다른 앱이 즉시 같은 세션을 인식(`storage` 이벤트로 탭 간 동기화도).
- weekly 는 이미 동일한 키/엔드포인트를 쓰므로 **코드 변경 없이** 그대로 합류합니다.

> ⚠️ **개발 모드 한계**: `dev:*` 는 앱마다 포트(=오리진)가 달라 `localStorage` 가 공유되지
> 않습니다. SSO 는 **단일 오리진**(프로덕션/리버스프록시) 에서 동작합니다. 로컬에서 끝까지
> 확인하려면 빌드 후 아래 배포 예시처럼 한 도메인으로 서빙하세요. 실제 로그인은 weekly
> 백엔드(:4000) + MySQL 이 필요합니다.

---

## 📢 광고 시스템 (전 앱 공통)

weekly 의 config 기반 광고를 전 앱에 동일하게 적용합니다.

- **공유 패키지**: [`packages/ads`](packages/ads) (`@soritok/ads`) — `AdsProvider`/`useAds`,
  `<Ads/>`(데스크톱 좌·우 사이드바 + 모바일 하단 배너 자동), `<AdInterstitial/>`(타이머 전면 광고).
- **설정 출처**: weekly 백엔드 `GET /api/public/config`(AppConfig). 관리자가 `/api/admin/config`
  (ADMIN_PASSWORD)로 설정. 주요 키: `ADS_ENABLED`, `COUPANG_BANNER_HTML`/`ADSENSE_SLOT_ID`,
  `COUPANG_MOBILE_HTML`/`ADSENSE_MOBILE_ID`, `COUPANG_INTERSTITIAL_HTML`/`ADSENSE_INTERSTITIAL_ID`,
  `AD_SIDEBAR_*`, `AD_INTERSTITIAL_*`.
- **노출 규칙**: `ADS_ENABLED==='true'` **그리고** 비프리미엄 사용자에게만. 프리미엄(`/api/user/me`
  의 `isPremium`)은 광고 미노출. 설정/백엔드가 없으면 자동으로 광고 미노출(안전).
- hub·gnugo 는 `main.tsx` 에서 `<AdsProvider>` 로 감싸고 `<Ads/>` 를 배치해 상시 배너를 노출.
  전면 광고(`AdInterstitial`)는 export 만 되어 있고, 원하는 시점(예: 게임 시작)에 앱별로 연결.
- weekly 는 이미 같은 시스템을 `Dashboard` 에서 사용 중이라 **변경 없음**(동일 설정으로 일관 동작).

> ⚠️ dev(다른 포트) 및 백엔드 미가동 시 `/api/public/config` 호출 실패 → 광고 미노출.
> 실제 노출은 **단일 오리진 + weekly 백엔드** + 관리자 `ADS_ENABLED=true` 설정에서 동작합니다.

---

## 📚 교육 책장 · 시험정리 수기노트 + Threads 자동수집

[`apps/study`](apps/study) — 초/중/고 → 학년 → 1·2학기 → 과목 → 단원별 **시험정리**를
**색볼펜·형광펜으로 손으로 쓴 노트**처럼 보여줍니다. hub 교육 책장의 과목 책을 누르면
`/study/?subject=...` 로 진입.

- **수기 마크업**: `==형광펜==`, `**빨강볼펜**`, `__파랑볼펜__`, `# 제목`, `- 항목`.
  손글씨 폰트(Nanum Pen Script/Gaegu) + 줄노트 배경 + 빨간 여백선으로 렌더.
- **Threads 자동수집**: weekly 백엔드의 `threadsCollector.ts` 가 `THREADS_ACCESS_TOKEN`+
  `THREADS_USER_ID` 설정 시 본인 계정 글을 주기(`THREADS_POLL_MINUTES`, 기본 15분)로 가져와
  태그(`[고1][수학][1학기][3단원]` 또는 `#고1 #수학 #1학기 #3단원`)를 파싱 → `StudyNote` upsert.
  **새 글이 올라오면 다음 폴링에 자동 반영**. 토큰 없으면 수집기 비활성.
- **자동 갱신**: 단원 보기에서 `GET /api/study/notes` 를 ~20초마다 폴링 → 새/수정 노트 자동 표시.
- **수동 입력/봇 공용**: `POST /api/study/ingest` (ADMIN_PASSWORD 또는 로그인 토큰).
- 백엔드/토큰 없이도 **샘플 콘텐츠로 전체 UX 동작**(초6 수학·중2 과학·고1 국어 등).

> ⚠️ 실데이터 동작엔 weekly 백엔드(:4000)+MySQL + `prisma migrate`(StudyNote 테이블) +
> Threads 토큰이 필요합니다. (Threads API 는 본인 계정 글 읽기 기준 — 계정 접근 필요)

---

## 🎮 미니게임 + 경쟁(리더보드)

[`apps/games`](apps/games) 에 5종 게임(2048·스네이크·테트리스·플래피버드·두더지잡기)과
전역 랭킹이 들어 있습니다. 게임 추가 = [`apps/games/src/games.ts`](apps/games/src/games.ts)
배열에 항목 1개.

- **점수/랭킹**: 게임오버 시 점수를 weekly 백엔드에 제출(`POST /api/games/scores`, 로그인 필요),
  게임별 Top10 은 `GET /api/games/leaderboard?game=` 로 조회. 유저별 최고점만 집계.
- 로그인 사용자는 자동으로 전역 랭킹에 등록(SSO 연동). 비로그인은 로컬 최고점만 저장.
- 백엔드/로그인 없이도 **게임 플레이·로컬 최고점은 정상 동작**(리더보드는 빈 상태로 graceful).

> ⚠️ 리더보드 실제 동작엔 weekly 백엔드(:4000)+MySQL 가동 + **`GameScore` 테이블 생성**이
> 필요합니다: `npm --prefix apps/weekly exec prisma migrate dev` (또는 `prisma db push`).

---

## 🚀 개발

루트에서 한 번만 설치하면 모든 워크스페이스 의존성이 깔립니다.

```bash
npm install          # 전체 워크스페이스 설치 (weekly 는 prisma generate 까지)

npm run dev:hub      # 허브       → http://localhost:5173
npm run dev:gnugo    # 바둑        → http://localhost:3000/gnugo/
npm run dev:weekly   # 위클리 프론트 → http://localhost:3000/weekly/
npm run dev:weekly-server  # 위클리 백엔드(Express :4000)
```

각 앱은 자기 `base` 경로로 빌드됩니다(`/`, `/weekly/`, `/gnugo/`).

## 🏗️ 빌드

```bash
npm run build        # 세 앱 모두 빌드 → apps/*/dist
# 또는 개별: npm run build:hub | build:weekly | build:gnugo
```

## 🔑 환경변수

`.env.local` 에 넣고 커밋하지 마세요(`.env.example` 참고).

- `apps/weekly`: `DATABASE_URL`(MySQL), `JWT_SECRET`, `GEMINI_API_KEY`
- `apps/gnugo`: `GEMINI_API_KEY`

## 📁 구조

```
soritok/
├── package.json          # 워크스페이스 루트 + 통합 스크립트
├── apps/
│   ├── hub/              # 허브 (base '/')
│   ├── weekly/          # 위클리 페이퍼 (base '/weekly/', 백엔드 server.ts)
│   ├── gnugo/           # 어린이 바둑교실 (base '/gnugo/', WASM 워커)
│   ├── games/           # 미니게임 5종 (base '/games/', 전역 리더보드)
│   └── study/           # 시험정리 수기노트 (base '/study/', Threads 자동수집)
└── packages/
    ├── auth/             # @soritok/auth — 통합 로그인(AuthProvider/AccountBar/LoginModal)
    └── ads/              # @soritok/ads — 공통 광고(AdsProvider/Ads/AdInterstitial)
```

새 서비스를 허브 책상에 추가하려면 [`apps/hub/src/data/services.ts`](apps/hub/src/data/services.ts)
배열에 항목을 추가하세요. 자세한 내용은 [허브 README](apps/hub/README.md) 참고.

---

## 🌐 배포 (Docker, 단일 오리진)

서버(Docker 설치됨)에서 한 번에 띄웁니다. 두 컨테이너로 구성:
- **api** — weekly Express 백엔드(:4000, `apps/weekly/Dockerfile` 재사용). 시작 시 `prisma db push`로
  스키마(신규 `GameScore`·`StudyNote` 포함) 자동 반영. **호스트 MySQL** 사용.
- **web** — 5개 프론트 정적 + `/api` 프록시(nginx). 외부에는 **web 만** `WEB_PORT`(기본 8080)로 노출.

```bash
# 서버에서
git clone https://github.com/yolkgit/soritok.git && cd soritok
cp .env.example .env        # DATABASE_URL / JWT_SECRET / ADMIN_PASSWORD / GEMINI / THREADS_* 채우기
./deploy.sh                 # = git pull && docker compose down && build && up -d
# 접속: http://<서버IP>:8080  (모든 경로가 같은 오리진 → 통합 로그인 정상 동작)
```

이후 업데이트는 `./deploy.sh` 만 다시 실행하면 됩니다.

### MySQL
`.env` 의 `DATABASE_URL` 은 **호스트 MySQL**(weekly 와 동일 `weekly_paper` DB 재사용)을 가리킵니다
(`mysql://root:비번@host.docker.internal:3306/weekly_paper`). 컨테이너는 `host.docker.internal`로
호스트 MySQL 에 접속합니다. 신규 테이블은 api 컨테이너 시작 시 `prisma db push`로 생성됩니다.

### 도메인 + HTTPS (soritok.com)
처음엔 `http://<서버IP>:8080` 으로 동작 확인(단일 오리진이라 SSO·리더보드·시험정리 모두 정상).
도메인/SSL은 **호스트의 nginx/Caddy**가 `soritok.com → 127.0.0.1:8080` 으로 프록시 + 인증서 처리하도록
얹으면 됩니다. (web 컨테이너 내부 라우팅은 [`nginx.conf`](nginx.conf) 참고)
