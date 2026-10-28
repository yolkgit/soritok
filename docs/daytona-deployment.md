# 데이토나 커밋·배포 경로

현재 페이지 https://daytona.soritok.com/racing/ 는 `yolkgit/soritok` 저장소를
통해서만 소스 변경을 커밋하고 서버에 배포합니다.

1. `services/daytona/`에서 필요한 소스를 변경하고 검사합니다.
2. 검토한 변경을 이 저장소에 커밋·푸시합니다.
3. 서버의 soritok 체크아웃에서 `bash deploy/daytona.sh`를 실행합니다.
4. `/healthz`의 `revision`이 soritok 커밋과 일치하는지 확인합니다.

GitHub push 자체가 자동 배포를 시작하는 구성은 아닙니다. 배포 스크립트가
이 저장소의 최신 커밋을 가져와 데이토나 컨테이너만 갱신합니다.
이전 단독 daytona 저장소와 이전 폴더의 compose 파일은 배포 기준으로 사용하지 않습니다.

Compose 프로젝트 이름과 서비스 이름은 기존 `daytona`를 유지하고 데이터 볼륨은
`external: true`로 명시합니다. 기록·댓글·작성자 정보를 이동하거나 초기화하지 않습니다.
게임 런타임 자산은 기존 비공개 폴더에서 읽으며 저장소에는 포함하지 않습니다.
현재 nginx의 도메인·TLS·3210 포트 연결은 변경하지 않습니다.

서버별 설정을 바꿀 때는 `DAYTONA_RUNTIME_ASSETS`, `DAYTONA_DATABASE_VOLUME`,
`DAYTONA_PUBLIC_ORIGIN` 환경변수를 사용합니다. 새 서버에는 해당 자산과 빈 영구
볼륨을 미리 준비해야 합니다. 기존 데이터가 있는 볼륨을 삭제하지 마세요.
