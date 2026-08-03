# Codex Agent View

> [Read in English](https://github.com/JunhoYoon95/codex-agent-view/blob/main/README.md)

Codex Agent View는 공식 Codex 앱을 위한 비공식 읽기 전용 companion plugin입니다. Codex가 처리하는 작업, 참여 중인 에이전트, 확인 가능한 할당 작업과 최근 관찰 활동을 보여줍니다. Hook 데이터는 이 기기의 제한된 process memory 안에만 유지되며, `@codex-agent-view` 한 번으로 운영체제 기본 브라우저에 실시간 화면을 엽니다.

Codex를 대체하거나 작업·에이전트를 제어하지 않으며, 외부 서버·telemetry·영구 작업 기록을 사용하지 않습니다.

## 설치

`0.5.2`는 현재 공개 배포 대상 버전입니다. 일반 터미널에서 다음을 실행합니다.

```bash
npm install --global codex-agent-view@0.5.2
codex-agent-view install
```

첫 번째 명령은 npm package를 설치하고, 두 번째 명령은 포함된 local Codex plugin을 명시적으로 등록합니다. `npm install`만으로는 Codex 설정을 바꾸지 않으며, 이 package에는 설정을 자동 변경하는 `postinstall` script가 없습니다.

설치 후에는 다음 순서를 따릅니다.

1. 설치 중 Codex 앱이 열려 있었다면 완전히 종료한 뒤 다시 엽니다.
2. Codex 앱의 **Plugins** 화면에서 **Codex Agent View**가 설치·활성화됐는지 확인합니다.
3. Hook 검토 화면이 나오면 `hooks/hooks.json`과 `node "${PLUGIN_ROOT}/scripts/send-hook.mjs"` 명령을 확인하고 현재 정의를 명시적으로 trust합니다. 앱이 hook 검토 화면을 제공하지 않을 때만 설치 과정에서 interactive Codex CLI의 `/hooks`를 사용합니다.
4. Codex 앱에서 새 작업을 만듭니다. 설치 전에 지나간 event는 재생되지 않습니다.

## 사용

Codex 앱의 작업 입력창에서 다음 plugin을 선택해 그대로 전송합니다.

```text
@codex-agent-view
```

일반 사용 명령은 이것뿐입니다. Plugin이 local monitor를 준비하거나 재사용하고 운영체제 기본 브라우저에 인증된 실시간 화면을 엽니다.

- 별도 `$show-agents` skill을 선택하지 않습니다.
- 터미널에서 monitor를 시작하지 않습니다.
- localhost 주소를 복사하거나 관리하지 않습니다.
- 브라우저 탭을 닫아도 Codex 작업은 중단되지 않습니다. 새 인증 탭이 필요하면 `@codex-agent-view`를 다시 실행합니다.

공개 Codex plugin API는 이 흐름을 위한 앱 sidebar나 in-app panel 자동 생성을 안정적으로 제공하지 않으므로, 운영체제 기본 브라우저가 지원하는 표시 화면입니다.

## 화면에 표시되는 정보

실시간 화면의 기본 언어는 영어이며 한국어와 스페인어도 선택할 수 있습니다. 에이전트 상세 내용을 접지 않은 상태로 2초마다 갱신합니다.

각 작업에는 짧게 정제된 요청 개요가 표시될 수 있습니다. 각 에이전트 카드에는 다음 정보가 표시될 수 있습니다.

- **할당 작업** — 검증된 spawn 후보 하나와 새 에이전트 하나를 모호함 없이 연결할 수 있을 때만 제한된 요약을 표시합니다. 현재 관찰한 공식 앱 payload에서는 보호된 spawn message가 불투명하므로 사람이 읽도록 안전하게 정리한 task label을 주 근거로 사용합니다. 동시 실행, 모호함, 만료 또는 보호된 값은 추측하거나 표시하지 않습니다.
- **현재 활동** — 파일 수정 진행 중이나 최근 터미널 작업 완료처럼 사람이 읽을 수 있는 문구입니다. 관찰된 tool lifecycle의 정확한 `turn_id`가 단 하나의 에이전트와 일치할 때만 표시합니다.

이 정보는 관찰 가능한 할당 및 tool lifecycle 신호이며 에이전트의 내부 생각이 아닙니다. Monitor는 원본 spawn message, 전체 prompt, 전체 tool input 또는 전체 tool output을 보관하거나 표시하지 않습니다. 정보가 없거나 연결이 모호하면 발생 시각으로 추측하지 않고 확인 불가로 둡니다.

## 재연결과 복구

열린 탭의 짧은 read-only access는 고정된 credential family 수명 안에서만 갱신됩니다.

- 이전에 인증된 같은 탭에서 일시적인 연결·접근 오류가 생기면 **다시 연결**을 사용합니다.
- 복구 정보는 `localStorage`가 아니라 탭 단위 `sessionStorage`에 있으므로 새 탭에는 인증이 전달되지 않습니다.
- 탭을 닫았거나 credential family가 만료됐거나 일회용 grant 교환 전에 monitor가 재시작됐다면 `@codex-agent-view`를 다시 실행합니다.

Private target과 credential은 browser launcher에 직접 전달되며 사용자가 복사하도록 출력하지 않습니다.

## 개인정보와 신뢰 경계

- Monitor는 IPv4 loopback(`127.0.0.1`)에만 연결되며 외부 telemetry, hosted backend, SQLite 또는 원격 event store가 없습니다.
- 실시간 운영 상태는 제한된 process memory에만 존재하고 monitor 재시작 시 초기화됩니다.
- Sender는 hook payload를 전달 전에 최소화합니다. 짧은 작업 개요는 로컬에서 가림 처리하고 길이를 제한하며, 정상 monitor 경로는 원본 prompt와 tool 내용을 보관하지 않습니다.
- Plugin은 읽기 전용입니다. 작업 중지, 메시지 전송, permission request 응답 또는 action 승인을 수행할 수 없습니다.
- Hook 명령은 사용자 계정 권한으로 로컬에서 실행됩니다. 사용 전에 정확한 hook 정의를 검토하고 명시적으로 trust해야 합니다.

전체 경계는 [개인정보 처리](docs/privacy.md), [보안](SECURITY.md), [이용 조건](docs/terms.md)을 확인하세요.

## 제거

터미널에서 명시적인 lifecycle 명령을 실행합니다.

```bash
codex-agent-view uninstall
```

이 명령은 Codex Agent View가 소유한 monitor만 인증해 종료한 뒤 plugin과 copied marketplace 등록을 제거합니다. 소유권을 확인하지 못하면 불확실한 파일을 삭제하거나 다른 loopback service를 종료하지 않고 실패합니다.

확인된 소유 runtime 데이터까지 안전하게 제거하려면 다음을 사용합니다.

```bash
codex-agent-view uninstall --purge
```

`--purge`도 형식을 알 수 없는 파일, 관련 없는 service, 비어 있지 않은 directory와 별도 opt-in diagnostic capture를 보존합니다. Capture가 있다면 정확한 경로를 확인해 따로 제거하고, 정리를 위해 넓은 Codex directory나 home directory를 삭제하지 마세요.

## 릴리스 및 프로젝트 문서

Package와 plugin manifest 버전은 `0.5.2`입니다. npm 공개, registry metadata와 digest, annotated tag, GitHub Release, CI와 public exact reinstall은 각 단계가 실제 성공한 뒤에만 검증 기록을 갱신합니다. npm 공개와 Universal Plugins Directory 제출은 별도 절차이며, 이 문서는 directory 검색 노출을 주장하지 않습니다.

- [배포 및 릴리스 증거](docs/distribution.md)
- [Plugin Directory 제출 상태](docs/plugin-submission.md)
- [기술 검증 결과](docs/phase-0-findings.md)
- [로드맵](ROADMAP.md)
- [지원](SUPPORT.md)

Copyright 2026 Junho Yoon. Apache License 2.0으로 배포합니다. [LICENSE](LICENSE)와 [NOTICE](NOTICE)를 확인하세요.
