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
