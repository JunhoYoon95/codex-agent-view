# Codex Agent View Roadmap

이 로드맵은 장기 작업을 여러 Codex 대화로 안전하게 나누기 위한 기준이다. 한 대화에서는 원칙적으로 첫 번째 미완료 Phase 또는 그 안의 응집된 작업 하나만 다룬다.

## 제품 원칙

- 공식 Codex 앱을 대체하지 않는 companion monitor다.
- live 상태의 source of truth는 hook event다.
- 계층 정보는 필요할 때 App Server metadata로 보강하되 메모리 공유를 가정하지 않는다.
- 첫 릴리스는 로컬 전용, read-only, 외부 telemetry 없음이 기본이다.
- 전체 prompt와 tool input/output은 기본 수집하지 않는다.
- 설치·신뢰·제거 경로가 명확해야 한다.

## Phase 0 — 기술 검증과 프로젝트 기반

상태: 진행 중

목표는 공식 Codex 앱에서 실제 hook 동작과 payload를 확인하고, 다음 단계의 아키텍처를 결정할 만큼의 증거를 모으는 것이다. UI, SQLite, 원격 서버, 제어 기능은 만들지 않는다.

### 저장소와 문서

- [x] 기존 파일을 보존하며 Git 저장소 초기화 상태를 확인한다.
- [x] npm package metadata와 배포 대상 파일을 최소 범위로 구성한다.
- [x] `README.md`, `AGENTS.md`, `ROADMAP.md`를 현재 사실과 일치시킨다.
- [x] 생성물, 실제 payload 캡처, secret이 Git 및 npm package에서 제외되는지 확인한다.

### 공식 구조 조사

- [x] 현재 설치된 Codex 앱/CLI 버전을 근거와 함께 기록한다.
- [x] 공식 plugin 필수 구조와 manifest schema를 확인한다.
- [x] hooks 파일의 discovery 방식과 지원 event 목록을 공식 자료 또는 설치본에서 확인한다.
- [x] 공식 앱과 CLI에서 설정·실행·payload 차이를 확인 범위와 함께 구분한다.

### 최소 plugin PoC

- [x] `.codex-plugin/plugin.json`을 포함한 최소 scaffold를 만든다.
- [x] npm package에 필요한 `hooks/`와 `scripts/`만 포함한다.
- [x] Homebrew CLI와 앱 embedded CLI에서 plugin install/runtime을 검증한다.
- [x] CLI runtime에서 `SubagentStart` payload를 캡처한다.
- [x] CLI runtime에서 `SubagentStop` payload를 캡처한다.
- [x] CLI runtime에서 `PreToolUse`와 `PostToolUse` payload를 캡처한다.
- [ ] 새 공식 앱 GUI task에서 `SubagentStart`, `SubagentStop`, `PreToolUse`, `PostToolUse`를 캡처한다.
- [ ] 가능하면 `PermissionRequest` payload를 캡처한다.
- [x] CLI runtime에서 실제 subagent 실행으로 시작·종료 event 발생을 검증한다.
- [x] 캡처 전에 전체 prompt/tool input 및 secret 최소화·redaction을 적용한다.

### 결론과 검증

- [x] `docs/phase-0-findings.md`에 확인된 필드와 근거를 기록한다.
- [x] 공식 앱과 CLI의 확인된 차이, 미확인 사항, 기술적 한계를 분리한다.
- [x] 가능한 것과 불가능한 것, 다음 Phase 권장 아키텍처를 기록한다.
- [x] 추측한 payload field를 영구 데이터 모델로 고정하지 않았는지 검토한다.
- [x] 관련 단위 테스트를 통과한다. (`8/8`)
- [x] 프로젝트 내부 및 공식 plugin validation을 통과한다.
- [x] npm package dry-run에서 의도한 runtime file 7개만 포함되는지 확인한다.
- [ ] 팀장이 공식 앱 E2E QA를 직접 수행하고, 지적 사항이 없어질 때까지 재작업·재검증한다.

### Phase 0 완료 기준

- 실제 앱 캡처 증거로 `SubagentStart`와 `SubagentStop` 지원 여부를 판단할 수 있다.
- 선택 event는 성공, 미지원, 또는 검증 차단으로 명확히 분류되어 있다.
- 공식 plugin 구조와 현재 설치 버전이 재현 가능한 명령 또는 출처와 함께 기록되어 있다.
- 최소 scaffold, 테스트, validation, package dry-run 결과가 기록되어 있다.
- 다음 Phase가 추측한 payload schema가 아니라 관찰된 데이터에 기반해 시작할 수 있다.

## Phase 1 — 로컬 event core

착수 조건: Phase 0 완료.

- [ ] 관찰된 payload만으로 boundary schema와 versioning 전략을 정의한다.
- [ ] 입력 검증과 privacy redaction을 구현한다.
- [ ] 중복·누락·out-of-order event를 다루는 in-memory state reducer를 구현한다.
- [ ] 부모 task와 subagent의 최소 상태 모델을 정의한다.
- [ ] 종료 event 누락과 monitor 재시작 시의 degraded state를 설계한다.
- [ ] 단위·통합 테스트를 추가한다.

제외: SQLite, 원격 서버, 제어 기능, 완성형 UI.

## Phase 2 — 로컬 read-only monitor MVP

착수 조건: Phase 1의 state contract 안정화.

- [ ] localhost 또는 Unix socket 중 transport를 선택하고 위협 모델을 기록한다.
- [ ] 공식 앱 task와 subagent 계층, 상태, 최근 활동을 보여주는 최소 UI를 구현한다.
- [ ] 연결 끊김, 알 수 없는 상태, 빈 상태, 오류 상태를 구분한다.
- [ ] 접근성, 키보드 이동, 모바일·작은 창 레이아웃을 검증한다.
- [ ] 외부 bind와 telemetry가 없음을 테스트한다.
- [ ] 실제 공식 앱 흐름으로 E2E QA한다.

제외: task 제어, 승인 처리, 메시지 전송, 영구 저장.

## Phase 3 — 설치·제거와 npm 배포 준비

착수 조건: Phase 2 E2E 통과.

- [ ] package entrypoint와 지원 Node/Codex 버전을 확정한다.
- [ ] 사용자가 검토하는 명시적 hook 활성화 절차를 만든다.
- [ ] `postinstall`이 사용자 설정을 변경하지 않음을 검증한다.
- [ ] hook trust, 수집 필드, 로컬 기록 위치와 보관 정책을 문서화한다.
- [ ] 제거·복구 절차를 검증한다.
- [ ] `npm pack --dry-run`과 clean install smoke test를 통과한다.
- [ ] release checklist와 semantic versioning 정책을 만든다.

## Phase 4 — 선택적 보강

각 항목은 사용자 가치와 privacy 비용을 별도로 검토한 뒤 독립 작업으로 진행한다.

- [ ] App Server metadata 보강의 정확성과 장애 격리를 검증한다.
- [ ] 긴 세션의 메모리 제한과 event retention 정책을 설계한다.
- [ ] 명시적 opt-in 기반의 로컬 기록 필요성을 평가한다.
- [ ] 제어 기능은 별도 보안 설계와 사용자 승인 모델 없이는 착수하지 않는다.

SQLite나 외부 서비스는 기본 계획이 아니다. 필요성이 증명될 경우 별도 설계 결정 기록과 사용자 승인 후 로드맵에 추가한다.

## 대화 간 인수인계 규칙

각 작업을 마칠 때 다음을 갱신한다.

- 완료된 checkbox와 이를 입증하는 파일·명령
- 아직 확인되지 않은 가정과 재현 방법
- 실행한 테스트와 실행하지 못한 테스트
- 다음 대화에서 수행할 첫 번째 미완료 항목
- 사용자의 조치나 권한이 필요한 정확한 blocker
