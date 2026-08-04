# Codex Agent View 작업 지침

이 파일은 이 저장소에서 사람과 AI가 항상 먼저 따르는 프로젝트 지침이다. 세부 원칙은 작업 성격에 맞춰 `.codex/rules/`에서 필요한 파일만 읽는다.

## 프로젝트 개요

- 제품: 공식 Codex 앱을 그대로 사용하는 read-only companion monitor
- 목표: 실행 중인 부모 task와 subagent 상태를 가볍게 시각화
- 배포 목표: npm package로 설치한 뒤 공식 Codex 앱에서 실행하고 OS 기본 브라우저에서 live 상태를 보는 Codex plugin
- 사용자 실행 surface: 설치 후 공식 Codex 앱에서 `@codex-agent-view` 자체를 선택·전송하면 internal single skill이 `open`을 실행하고, live UI는 OS 기본 외부 브라우저에 표시한다. Promptless plugin-card Quick start 제공 여부는 앱 UI에 달려 있으며 검증 전에는 제품 계약으로 주장하지 않는다.
- 로컬 monitor와 CLI는 plugin이 내부적으로 사용하는 구현·진단 수단이다. 일반 사용자에게 터미널 실행이나 localhost URL 관리를 제품 사용법으로 요구하지 않는다.
- 상태 설계: live companion 상태는 의도적으로 bounded process-local memory만 사용하며 재시작은 새 관찰 window를 시작한다. 이는 완성된 제품 경계다.
- 의도적 non-goal: 대체 Codex 클라이언트, 외부 서버, 외부 telemetry, 필수 SQLite/영구 event store, 원격 제어
- 영구 history는 누락된 요구가 아니다. 실제 사용자 가치가 입증될 때만 retention/deletion/privacy 비용을 포함한 별도 explicit opt-in 제안으로 검토한다.
- 현재 단계: public `0.5.5` npm/artifact/source-pack identity/exact reinstall/main·tag CI/annotated tag/GitHub Release 확인 완료. This-device global package와 CLI `0.5.5`, plugin installed/enabled, valid hook bundle 9종, registry/global 및 registry/marketplace install-entry 일치를 확인했다. Exact install 뒤 monitor는 stopped이고 hook trust는 CLI-unobservable `unknown`이다. 작업 상태 필터의 isolated browser E2E는 통과했지만 공식 Codex 앱 restart/new-task에서 public exact status-filter/assignment E2E는 pending이며 성공이나 실패로 단정하지 않는다. Assignment의 bounded/best-effort singleton correlation과 concurrent ambiguity fail-closed 경계를 유지한다. Public `0.5.4` evidence는 historical fact로 보존한다. Universal Plugins Directory validator·portal/reviewer·검색 노출과 promptless plugin-card Quick start는 별도 미확인 상태로 유지한다.

## 명령어

실제 `package.json`과 일치하지 않으면 명령어를 추측해 추가하지 말고 먼저 갱신한다.

```bash
npm test
npm run validate:plugin
npm run check
```

## 원칙 라우터

- 작업 분류가 애매하거나 공통 기준이 필요하면 `.codex/rules/kyurasi-principles.md`를 읽는다.
- hook, payload, 개인정보, 로컬 transport, 설치·제거 작업은 `.codex/rules/plugin-safety.md`를 읽는다.
- local runtime, in-memory reducer, monitor UI 작업은 `.codex/rules/runtime-ui.md`를 읽는다.
- 새 UI 범위 또는 사용자가 별도로 승인한 explicit opt-in history/DB 제안을 시작할 때만 관련 공통 원칙을 프로젝트 규칙으로 가져와 현재 구조에 맞게 구체화한다. 영구 DB를 기본 다음 단계로 가정하거나 미사용 규칙 전체를 복제하지 않는다.

## 작업 방식

- 변경 전 주변 코드, 공식 문서, 현재 설치 버전의 실제 동작을 확인한다.
- 모든 비단순 작업에는 명시적인 팀장 agent가 있어야 한다. 팀장은 작업 전에 작업 범위, 담당 작업자, 파일 소유 범위와 합격 기준을 정한다.
- 구현·문서·검증처럼 분리 가능한 작업은 팀원 agent에게 배정한다. 여러 독립 작업은 가능한 범위에서 병렬로 진행한다.
- 팀장은 결과를 단순 취합하거나 작업자의 자체 합격 판단을 그대로 채택하지 않는다. 변경 diff와 가정을 직접 리뷰하고 공식 Codex 앱 흐름을 포함한 E2E QA를 본인이 수행한다.
- QA에서 수정·누락·불명확성이 하나라도 나오면 담당 작업자에게 즉시 수정 또는 재작업을 요청한다. 팀장은 수정 결과를 다시 리뷰하고 같은 E2E를 재실행한다.
- 실행 가능한 지적 사항이 0개가 될 때까지 `작업자 구현 -> 팀장 리뷰/E2E -> 작업자 재작업 -> 팀장 재검증`을 반복한다. 중간 상태를 완료로 보고하지 않는다.
- 동시 agent 한도에 걸리면 기존 작업자를 재배정하거나 순차 실행하되 팀장과 작업자 역할 분리는 유지한다.
- 오탈자처럼 단일하고 위험이 매우 낮은 작업만 팀장이 직접 처리할 수 있다. 이 경우에도 변경 후 검증과 자기 리뷰를 생략하지 않는다.
- 요청 범위를 벗어난 리팩터링이나 기능 확장을 하지 않는다.
- 사용자 파일과 기존 변경을 보존하며, 삭제나 되돌리기 어려운 작업은 명시적 승인 없이 하지 않는다.
- 새 의존성, 새 추상화, 새 데이터 수집은 필요성과 제거 경로를 확인한 뒤 추가한다.
- 검증하지 못한 사실은 문서나 타입에서 확정하지 않는다. 관찰 결과, 추론, 미확인을 구분한다.

## 제품 가드레일

- 설치 후 실행 시작은 공식 Codex 앱에서 `@codex-agent-view` 자체를 선택·전송해 수행한다. 별도 `$show-agents` 선택이나 Quick start starter text를 요구하지 않으며, 내부 single skill은 `open` 실행 capability로만 유지한다. Plugin-level `interface.defaultPrompt`는 skill dispatch contract가 아닌 starter-prompt UI metadata다. `0.5.2`부터 current source `0.5.5`까지 starter text를 제공하지 않는다. Promptless plugin-card Quick start 제공 여부는 공식 앱에서 관찰하기 전까지 미확인으로 둔다.
- 사용자용 제품 문구는 `Open each view with one lightweight \`@codex-agent-view\` invocation. Once open, live monitoring runs locally with no additional model calls.`로 통일한다. 이어서 관찰 대상 task/subagent의 일반적인 model·token 사용은 계속됨을 명시한다.
- Live UI 표시 surface는 OS 기본 외부 브라우저다. 사용자는 열린 탭에서 상태를 확인하고 일반 연결 오류를 다시 시도한다.
- npm/터미널은 최초 설치, 명시적 제거, maintainer 진단에만 허용한다. `start`, `status`, `doctor`를 정상적인 사용자 사용 순서에 포함하지 않는다.
- live hook detail은 plugin이 healthy local monitor를 재사용하거나 필요 시 내부적으로 시작한 뒤 OS 기본 브라우저에서 연다. localhost 주소나 tokenized/private URL을 사용자에게 복사·입력·관리하게 하지 않는다.
- 같은 브라우저 탭의 유효한 read-only recovery credential은 명시적 재연결 버튼으로 복구한다. 인증 이력이 없는 새 탭이나 fixed family가 만료된 탭은 자격을 스스로 발급하지 않고 `@codex-agent-view` 재실행을 안내한다.
- 작업 상태 필터는 상위 작업 카드의 현재 상태만 기준으로 삼는다. 하위 agent 상태나 recent activity history를 OR 조건으로 사용해 다른 상태의 작업 카드를 섞지 않는다.
- Agent 할당 설명에는 공식 exact correlation ID/key가 확인되지 않았다. 제한된 시간창에 검증된 spawn candidate가 정확히 하나이고 새 agent도 정확히 하나일 때만 bounded/best-effort로 연결한다. 동시 spawn처럼 매핑이 모호하면 발생 시각이나 순서로 추측하지 않고 unavailable로 둔다.
- hook payload가 라이브 상태의 source of truth다.
- App Server의 `thread/list`, `parentThreadId`, `ancestorThreadId`는 계층과 메타데이터 보강 후보일 뿐이다.
- 별도 App Server가 공식 앱 프로세스의 in-memory 상태를 공유한다고 가정하지 않는다.
- 캡처 payload는 런타임에서 검증하기 전까지 `unknown`으로 취급한다. 추측한 필드를 영구 데이터 모델로 고정하지 않는다.
- 전체 prompt와 전체 tool input은 기본적으로 저장하지 않는다.
- 네트워크 transport가 필요해져도 localhost 또는 Unix socket만 고려한다.
- plugin은 read-only다. task 중지, 승인, 메시지 전송 등 제어 기능을 넣지 않는다.
- In-memory live state는 현재 제품의 최종 architecture다. SQLite/영구 history를 구현 완료 조건이나 release blocker로 취급하지 않는다.
- `postinstall`에서 Codex 설정이나 사용자 파일을 자동 변경하지 않는다.
- 설치 안내에는 hook trust boundary와 명시적인 제거·복구 절차를 포함한다.

## 검증과 기록

- 가장 작은 유효 검증부터 실행하고, 변경 영향에 맞춰 테스트 범위를 넓힌다.
- release 전 `npm test`, `npm run validate:plugin`, `npm run check`를 실행한다.
- 공식 Codex 앱에서 실제 hook event를 발생시켜 캡처를 확인한다. fixture만 통과한 결과로 앱 호환성을 주장하지 않는다.
- 실제 관찰 결과는 `docs/phase-0-findings.md`에 증거와 함께 기록한다.
- 검증하지 못한 항목은 실패가 아니라 `미확인` 또는 `차단됨`으로 기록하고 필요한 사용자 조치를 적는다.

## 우선순위

1. 사용자의 현재 요청
2. 이 `AGENTS.md`
3. `.codex/rules/*`
4. 저장소의 기존 패턴

충돌이 있으면 더 보수적이고 데이터 손실·정보 노출 위험이 낮은 방향을 택한다. 예외가 필요하면 결과에 이유를 남긴다.
