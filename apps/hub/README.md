# 🪑 소리톡 (soritok)

> 책상 앞에 앉아, 책상 위에 놓인 **사물**을 골라 서비스를 여는 허브 사이트.

첫 화면은 **원근감 있는 실사풍 책상**이에요. 벽에는 보드판과 책장이 걸려 있고,
책상 위에는 사물들이 놓여 있어요. 각 서비스는 어울리는 사물로 표현됩니다 —
보드판에 핀으로 붙인 **위클리 페이퍼**, 책상에 올려둔 **바둑판**, **어항**, **게임기**,
그리고 **책장**에 꽂힌 과목별 교육 책처럼요. 사물을 클릭하면 소개 카드가 열립니다.

현재 사물:

| 사물 | 서비스 | 표현(kind) | 상태 |
| --- | --- | --- | --- |
| 📋 벽 보드판 + 종이 | 위클리 페이퍼 ([weekly](https://github.com/yolkgit/weekly)) | `board` | 이용 가능 |
| ⚫ 책상 위 바둑판 | 어린이 바둑교실 ([gnugo](https://github.com/yolkgit/gnugo)) | `goban` | 이용 가능 |
| 🐠 어항 | 관상어 도감 | `aquarium` | 준비중 |
| 🎮 휴대용 게임기 | 미니 게임 | `arcade` | 준비중 |
| 📚 책장 | 영어·수학·과학·사회 교육 | `book` ×4 | 준비중 |
| ✨ 포스트잇 | 다음 서비스 자리 | `note` | 준비중 |

> `kind:'book'` 서비스는 자동으로 한 **책장**에 모여 꽂힙니다. 과목을 추가하려면
> `book` 항목을 하나 더 넣으면 책이 한 권 더 꽂혀요.

---

## 🚀 실행

```bash
npm install
npm run dev      # 개발 서버 (http://localhost:5173)
npm run build    # 프로덕션 빌드 → dist/
npm run preview  # 빌드 결과 미리보기
```

## 🧩 기술 스택

- React 19 + Vite 6 + TypeScript
- Tailwind CSS 4 (`@tailwindcss/vite`)
- 책상·보드판·바둑판·소품은 **순수 CSS/SVG**로 그립니다 — 이미지 에셋 없이 가볍습니다.

---

## ➕ 서비스 추가하는 법

새 서비스를 책상에 올리려면 [`src/data/services.ts`](src/data/services.ts) 배열에
객체 하나를 추가하세요. `kind` 로 어떤 사물로 표현할지 정합니다.

```ts
{
  id: 'order',                       // 영문 소문자 고유 id
  kind: 'note',                      // 아래 표현 종류 중 하나
  title: '오더 시스템',               // 이름표
  subtitle: '매장 주문 관리',          // 한 줄 설명
  description: '...',                 // 모달 상세 소개
  url: 'https://order.soritok.com',  // 실제 서비스 주소
  color: '#3B73B9',                  // 강조색
  emoji: '🧾',                        // 모달 아이콘
  status: 'active',                  // 'active' | 'coming-soon'
}
```

- `kind: 'board'` → 벽에 거는 보드판 (위클리 페이퍼 형태)
- `kind: 'goban'` → 책상에 올리는 바둑판
- `kind: 'aquarium'` → 책상 위 어항
- `kind: 'arcade'` → 휴대용 게임기
- `kind: 'book'` → 책장에 꽂히는 책 (여러 권이 한 책장에 자동으로 모임)
- `kind: 'note'` → 책상 위 포스트잇 (가벼운/준비중 서비스 기본값)

전혀 다른 사물(예: 달력, 액자, 시계)이 필요하면 `ServiceKind` 에 종류를 추가하고
`src/components/` 에 대응 컴포넌트를 만든 뒤 `Scene.tsx` 의 `renderDeskItem` 에 연결하면 됩니다.

### 서비스 연결 방식

소리톡 허브는 각 서비스로 **링크**만 연결하는 독립 사이트예요.
서비스들은 각자 배포되고( weekly·gnugo 모두 자체 백엔드 보유 ) `url` 값으로 이어집니다.
권장 구조는 서브도메인입니다:

- `soritok.com` → 이 허브(책상)
- `weekly.soritok.com` → 위클리 페이퍼
- `gnugo.soritok.com` → 어린이 바둑교실

> 서브도메인을 아직 안 만들었다면 각 앱의 배포 주소(예: 서버 IP:포트)를 `url` 에
> 임시로 넣어두고 나중에 도메인만 바꿔주면 됩니다.

---

## 📁 구조

```
soritok/
├── index.html
├── public/desk.svg            # 파비콘
└── src/
    ├── App.tsx                # 장면 조립 + 모달 상태
    ├── index.css              # 책상/보드판/바둑판/소품 전체 스타일
    ├── types.ts               # Service 타입 (kind 포함)
    ├── data/services.ts       # ⭐ 서비스 목록 (여기만 고치면 됨)
    └── components/
        ├── Header.tsx
        ├── Scene.tsx          # kind 별로 사물 배치 (벽/원근감 책상)
        ├── WeeklyBoard.tsx    # 보드판 + 핀으로 붙인 주간 계획표
        ├── Bookcase.tsx       # 교육 책장 (Spine 들을 담음)
        ├── Spine.tsx          # 책장에 꽂히는 책 한 권
        ├── GoBoard.tsx        # 바둑판(SVG 격자·돌)
        ├── Aquarium.tsx       # 어항(물고기·물풀·기포)
        ├── GameConsole.tsx    # 휴대용 게임기
        ├── StickyNote.tsx     # 포스트잇(준비중)
        ├── ServiceModal.tsx   # 서비스 소개 카드
        └── Footer.tsx
```
