# 🪑 소리톡 (soritok) — 모노레포

세 서비스를 한 리포에 모은 **npm workspaces** 모노레포입니다. 한 도메인(soritok.com)에서
경로로 각 서비스를 오갑니다.

| 경로 | 앱 | 설명 |
| --- | --- | --- |
| `/` | [`apps/hub`](apps/hub) | 책상 허브 — 사물을 클릭해 서비스로 이동 |
| `/weekly/` | [`apps/weekly`](apps/weekly) | 위클리 페이퍼 (React + Express/Prisma/MySQL 백엔드) |
| `/gnugo/` | [`apps/gnugo`](apps/gnugo) | 어린이 바둑교실 (React + WASM 바둑엔진) |
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
│   └── gnugo/           # 어린이 바둑교실 (base '/gnugo/', WASM 워커)
└── packages/
    ├── auth/             # @soritok/auth — 통합 로그인(AuthProvider/AccountBar/LoginModal)
    └── ads/              # @soritok/ads — 공통 광고(AdsProvider/Ads/AdInterstitial)
```

새 서비스를 허브 책상에 추가하려면 [`apps/hub/src/data/services.ts`](apps/hub/src/data/services.ts)
배열에 항목을 추가하세요. 자세한 내용은 [허브 README](apps/hub/README.md) 참고.

---

## 🌐 배포 (한 도메인 경로 분기)

정적 호스팅 + 리버스 프록시로 세 빌드 산출물과 백엔드를 한 도메인에 묶습니다. 예시(nginx):

```nginx
server {
  server_name soritok.com;

  location / { root /var/www/soritok/apps/hub/dist; try_files $uri /index.html; }
  location /weekly/ { alias /var/www/soritok/apps/weekly/dist/; try_files $uri /weekly/index.html; }
  location /gnugo/  { alias /var/www/soritok/apps/gnugo/dist/;  try_files $uri /gnugo/index.html; }
  location /api/ { proxy_pass http://127.0.0.1:4000; }
}
```

> 위클리 백엔드는 `npm run dev:weekly-server` (또는 PM2/도커)로 `:4000` 에서 실행하고
> MySQL 연결이 필요합니다.
