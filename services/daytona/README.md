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

## 키보드 후진

S/↓ 또는 R을 누르면 제동하고, 정차 후 약 0.35초 계속 누르면 저속 후진합니다.
키를 놓거나 W/↑를 누르면 후진 속도를 줄여 정지하며, 이후 W/↑로 전진합니다.
Space는 후진 진입 없이 제동만 합니다. 코스/변속 선택과 롤링 스타트에서는
후진이 작동하지 않습니다. 수동 변속의 원작 4단 롤링 스타트 절차는 유지합니다.

이 기능은 웹 버전의 확장입니다. `native/reverse.h`의 정차/속도 제한과
세 곳의 검증된 쓰기 훅으로 원작 차량 적분에 음수 속도를 전달합니다.
단독/온라인 모두 로컬 물리 차량 포인터를 사용하며, 차량 좌표·카메라를 옮기지 않습니다. 원작 지면·조향·충돌 처리로 이동합니다.
원작이 없는 후진 HUD 속도는 양의 크기로 표시합니다.

기존 비공개 재컴파일 작업 폴더와 고정 upstream 소스를 준비한 경우:

```sh
python native/build-extension.py --runtime /private/rom-runtime \
  --upstream /private/daytona-arcade-recomp --output /private/new-runtime
# 메모리 관찰 수출은 --debug 빌드에서만 켭니다.
ROM_WEB_ARTIFACTS=/private/runtime node scripts/test-reverse-core.mjs /private/debug/core.mjs
ROM_WEB_ARTIFACTS=/private/runtime node scripts/test-reverse-link.mjs /private/debug/core.mjs
```

생성된 게임 번역 소스/오브젝트는 비공개 출력 폴더에만 둡니다. 릴리스 core 두
파일은 별도 자산 경로로 전달하고, `build-manifest.json`의 크기·SHA-256을
같은 soritok 커밋에서 갱신합니다. `--debug` 자산은 배포하지 않습니다.

## 모바일 몰입 모드

모바일에서 솔로 시작 또는 ⤢를 누르면 게임만 화면 전체에 표시합니다. 터치
기기는 지원할 때 브라우저 전체화면과 가로 방향 잠금을 요청하며, 지원하지
않으면 CSS 확대 모드로 표시합니다. 16:9 시야와 2046×1152 내부 해상도를
유지하고 화면을 잘라 채우지 않습니다.

- 왼쪽 아날로그 패드: 작은 움직임은 미세 조향, 크게 움직이면 큰 조향.
- 오른쪽 페달: 누르면 최대 입력, 누른 채 아래로 끌면 강도를 줄입니다.
- 조향과 두 페달은 각기 다른 터치를 추적합니다. 브레이크가 가속보다 우선합니다.
- 브레이크를 충분히 누른 채 정차하면 후진합니다. 손을 떼면 후진을 멈춥니다.
- 왼쪽 위에서 메뉴 복귀, 일시정지, 시점 변경, 선택/시작을 조작합니다.
- 수동 변속 선택 시 화면 아래에 기어 올리기/내리기가 나타납니다.
- 터치 취소·포커스 이탈·화면 회전·전체화면 종료 때 모든 터치 입력을 해제합니다.

`node scripts/test-mobile-controls.mjs`로 동시 접촉, 연속 ADC 입력, 제동 우선,
입력 해제, 전체화면 미지원/거절/종료와 키보드 회귀를 검사합니다. 실제 모바일
브라우저의 OS 전체화면/방향 잠금 제공 범위는 브라우저에 따릅니다.
