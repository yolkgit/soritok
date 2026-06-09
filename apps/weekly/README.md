# 📅 위클리 페이퍼 - 아이 주간 계획표 & 보상 시스템

아이들과 부모님이 함께 사용하는 즐겁고 인터랙티브한 주간 계획표입니다. 일정을 관리하고, 포인트를 모으며, 좋은 습관을 게임처럼 길러보세요.

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

## ✨ 주요 기능

### 👤 사용자 및 가족 관리
- **안전한 인증**: 이메일 기반 회원가입 및 JWT 로그인 보안.
- **부모 모드**: 민감한 설정(포인트 지급, 자녀 관리 등)은 4~8자리 부모 비밀번호로 보호됩니다.
- **다자녀 지원**: 한 부모 계정에서 여러 자녀를 쉽게 관리할 수 있습니다.

### 🗓️ 스마트 주간 계획표
- **드래그 앤 드롭**: 학교, 학원, 공부, 휴식 등 활동 블록을 시간표에 쉽게 배치하세요.
- **활동 유형**: 다양한 카테고리별 맞춤 블록과 시각적인 색상 코딩.
- **PDF 내보내기**: 완성된 주간 계획표를 PDF나 이미지로 저장해 냉장고에 붙이세요.

### 🎮 게이미피케이션 & 보상
- **포인트 시스템**: 계획된 활동을 완료하면 아이 스스로 포인트를 적립합니다.
- **보상 상점**: 부모님이 설정한 보상(예: "게임 1시간" = 500포인트)으로 교환할 수 있습니다.
- **스티커 차트**: 매일의 성공 경험을 시각적인 스티커 차트로 확인하세요.

### 🤖 AI 코치 (Gemini)
- **AI 맞춤 제안**: 구글 Gemini AI가 아이의 루틴에 맞는 최적의 시간표와 육아 팁을 제안합니다.

---

## 🛠️ 기술 스택

### 프론트엔드 (Frontend)
- **프레임워크**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **언어**: [TypeScript](https://www.typescriptlang.org/)
- **스타일링**: [Tailwind CSS 4](https://tailwindcss.com/)
- **아이콘**: [Lucide React](https://lucide.dev/)
- **주요 라이브러리**: `uuid`, `html2canvas`, `jspdf`

### 백엔드 (Backend)
- **런타임**: [Node.js](https://nodejs.org/) (v20)
- **프레임워크**: [Express.js 5](https://expressjs.com/)
- **데이터베이스**: [MySQL 5.7](https://www.mysql.com/) (높은 호환성)
- **ORM**: [Prisma](https://www.prisma.io/)
- **보안**: `jsonwebtoken` (JWT), `bcryptjs`

### 인프라 및 배포
- **컨테이너**: [Docker](https://www.docker.com/) + Docker Compose
- **CI/CD**: GitHub Actions (SSH 자동 배포)
- **서버 OS**: Ubuntu Linux

---

## 🚀 시작하기

### 사전 준비사항
- Node.js v20 이상
- Docker 및 Docker Compose
- MySQL (Docker 없이 로컬 실행 시 필요)

### 로컬 개발 환경 설정

1. **저장소 클론 (Clone)**
   ```bash
   git clone https://github.com/yolkgit/weekly.git
   cd weekly/planner
   ```

2. **패키지 설치**
   ```bash
   npm install
   ```

3. **환경 변수 설정**
   `.env.example` 파일을 참고하여 `.env` 파일을 생성하세요:
   ```env
   DATABASE_URL="mysql://user:password@localhost:3306/weekly_paper"
   JWT_SECRET="your_secret_key"
   GEMINI_API_KEY="your_google_ai_key"
   ```

4. **로컬 실행**
   ```bash
   # 데이터베이스 실행 (로컬 MySQL이 없는 경우 권장)
   docker compose up db -d

   # 개발 서버 실행 (프론트엔드)
   npm run dev
   
   # 백엔드 서버 실행 (별도 터미널에서)
   npm run server
   ```

### 🐳 도커 배포 (권장)

1. **빌드 및 실행**
   ```bash
   docker compose up --build -d
   ```

2. **접속하기**
   웹 브라우저에서 `http://localhost:3100` (또는 서버 IP)로 접속하세요.

---

## 📂 프로젝트 구조

```
planner/
├── src/
│   ├── components/   # 재사용 가능한 UI 컴포넌트
│   ├── pages/        # 주요 화면 페이지
│   ├── context/      # React Context (인증 등 전역 상태)
│   └── services/     # API 통신 로직
├── prisma/           # 데이터베이스 스키마 및 마이그레이션
├── server.ts         # Express 백엔드 진입점
├── Dockerfile        # 프로덕션 빌드 설정
└── docker-compose.yml # 멀티 컨테이너 설정
```
