# 데이토나 웹 서비스

데이토나 페이지의 관리·커밋·배포 기준은 **yolkgit/soritok**입니다.
게임 프런트엔드, 한국어 메뉴, 키보드 조작, 온라인 방과 기록 API를 이 폴더에서
함께 관리합니다. Node 24와 SQLite를 사용하는 독립 서비스로,
기존 프런트엔드 앱의 Node 20 빌드와 npm 워크스페이스에는 영향을 주지 않습니다.

- 공개 페이지: https://daytona.soritok.com/racing/
- 서버 배포 명령: 저장소 루트에서 `bash deploy/daytona.sh`
- 배포 구성: `deploy/daytona.compose.yaml`
- 실행 커밋 확인: `https://daytona.soritok.com/healthz`의 `revision`

배포는 soritok 저장소를 fast-forward로 갱신한 후 해당 커밋을 Docker 이미지에
기록하고, 건강 검사를 통과할 때까지 기다립니다. 다른 소리톡 서비스는 재시작하지 않습니다.

기존 `daytona_daytona-data` 영구 볼륨과 별도 런타임 자산 폴더를 그대로 마운트합니다.
기록 DB를 새로 만들거나 복사·내보내지 않습니다. 원본 ZIP, WASM/ROM 팩,
데이터베이스, 키·토큰은 GitHub에 커밋하지 않습니다. 렌더러·원본 프로그램의
출처 및 정확도 한계는 `ROM_PORT.md`를 참고하세요.

## 로컬 실행과 회귀 검사

```sh
# 승인된 실행 자산이 있는 경로를 지정
ROM_WEB_ARTIFACTS=/path/to/private-runtime npm run build
npm run test:server
npm start
```

각 명령은 이 폴더에서 실행합니다. 자산은 `rom-web/build-manifest.json`의
SHA-256·크기로 검증됩니다. 방·출석·댓글 API는 영구 SQLite 볼륨을 사용하며,
WebRTC는 STUN 직접 연결 방식입니다.
