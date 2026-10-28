# Daytona 작업 기준

사용자 지시: 이 페이지는 `yolkgit/soritok`을 거쳐 커밋·배포한다.

- 이 폴더를 데이토나 소스의 기준으로 사용한다. 별도 `yolkgit/daytona` 저장소나
  이전 Sites 체크아웃에 변경을 배포하지 않는다.
- 변경을 검사하고 soritok 저장소에 커밋·푸시한 뒤, 서버의 soritok 체크아웃에서
  `bash deploy/daytona.sh`로 배포한다. 공개 `/healthz`의 `revision`과 커밋을 확인한다.
- 기존 영구 DB 볼륨과 외부 런타임 자산 경로를 보존한다. ROM/WASM 팩, DB 파일,
  작성자 식별값, SSH 키·토큰을 Git에 추가하지 않는다.
- 게임 동작과 화면 검증은 실제 브라우저에서 수행한다.
