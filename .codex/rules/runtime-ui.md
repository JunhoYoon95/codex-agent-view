# Local runtime과 monitor UI 원칙

이 규칙은 hook transport, in-memory 상태 계산, 로컬 HTTP server, monitor UI를 변경할 때 적용한다. 사용자가 제공한 공통 backend/frontend/UI 원칙을 이 프로젝트의 로컬 read-only 구조에 맞게 구체화한다.

## 경계와 의존성

- 의존성은 `hook/CLI -> runtime server -> core reducer`와 `browser UI -> read-only HTTP API`의 단방향으로 유지한다.
- 외부 hook payload는 `unknown`으로 받고 runtime validation을 통과한 최소 metadata만 core로 전달한다.
- transport, 상태 계산, HTTP 표현, UI 렌더링 책임을 섞지 않는다.
- SQLite, 외부 서버, 외부 telemetry, 원격 제어를 추가하지 않는다.

## 상태와 멱등성

- hook event는 중복, 누락, 역순으로 도착할 수 있다.
- reducer는 동일 event의 재적용에 안전해야 하며, stop-before-start와 post-before-pre를 `unknown` 또는 degraded 상태로 표현한다.
- status는 의미가 드러나는 문자열을 사용하고 시간은 UTC Unix timestamp milliseconds의 `*_at_ms` 이름으로 통일한다.
- 메모리 사용량을 제한하고 오래된 session/activity를 결정적인 기준으로 정리한다.

## 로컬 transport 보안

- network listener는 IPv4 loopback `127.0.0.1`에만 bind한다.
- event ingest는 사용자 전용 권한으로 저장한 runtime token을 요구한다.
- request body, header, 연결 수와 timeout에 명시적인 상한을 둔다.
- 응답에 prompt, transcript path, cwd, 전체 tool input/output, secret을 포함하지 않는다.
- 외부 origin을 허용하는 CORS header를 보내지 않고, UI에는 엄격한 CSP와 보안 header를 적용한다.
- monitor 장애나 미실행 상태가 Codex hook을 오래 막지 않도록 sender timeout과 fail-open 동작을 유지한다.

## UI

- 사용자-facing 실행 시작 surface는 공식 Codex 앱의 `@codex-agent-view` 또는 plugin Quick start다. Plugin은 별도 `$show-agents` 선택 없이 내부 single skill capability로 live view 준비를 수행한다.
- Live UI 표시 surface는 OS 기본 외부 브라우저다. Plugin이 브라우저를 직접 열며, 사용자가 terminal에서 server를 띄우거나 localhost/tokenized/private URL을 복사·입력·관리하게 하지 않는다.
- `start`, `status`, `doctor` CLI는 자동화된 plugin 내부 동작 또는 maintainer 진단 경계로만 유지하고 정상 사용자 여정의 단계로 노출하지 않는다.
- Live UI의 일반 연결 오류에는 2초 자동 재시도와 명시적인 즉시 재시도 button을 함께 제공한다. 같은 탭에 유효한 read-only recovery credential이 있으면 실제 재연결 button을 제공한다.
- 인증 이력이 없는 새 탭이나 고정 family가 만료된 탭은 안전상 자격을 스스로 mint하지 않는다. 공식 Codex 앱에서 `@codex-agent-view`를 다시 실행하면 기본 브라우저에 새 인증 화면이 열린다고 안내한다.
- Bootstrap/access/recovery credential은 URL에서 즉시 제거하고 tab-scoped `sessionStorage`, read-only scope, absolute fixed-family expiry 경계를 유지한다. 편의를 이유로 localStorage, cookie, sliding family 만료로 완화하지 않는다.
- system font와 사전 정의한 spacing, color, typography token을 사용한다. 외부 font/CDN을 사용하지 않는다.
- 부모 task/session과 subagent 상태가 한 화면에서 구분되어야 한다.
- 연결 중, 연결됨, 연결 끊김, 빈 상태, 오류 상태를 각각 명확히 표시한다.
- 상태는 색만으로 구분하지 않고 text label과 accessible name을 함께 제공한다.
- 표준 button/input을 사용하고 keyboard focus, tab order, reduced motion, 충분한 hit area를 제공한다.
- 검색은 label이 있는 입력과 명시적인 실행/초기화 수단을 제공한다.
- read-only 제품이므로 승인, 중지, 메시지 전송처럼 Codex 상태를 바꾸는 control을 넣지 않는다.

## 테스트

- core는 malformed, missing, duplicate, out-of-order, unknown event와 memory bound를 단위 테스트한다.
- server는 loopback bind, token auth, body limit, security header, API/SSE lifecycle과 graceful shutdown을 통합 테스트한다.
- UI는 landmark, label, empty/error state, keyboard 접근성과 CSP-compatible asset 구성을 검사한다.
- 최종 QA는 실제 plugin hook -> local server -> reducer -> browser UI 전체 흐름으로 수행한다.
