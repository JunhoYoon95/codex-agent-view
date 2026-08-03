# Plugin 안전성과 프라이버시 원칙

Codex hook, payload, 로컬 transport, 설치와 제거를 변경할 때 적용한다.

## 신뢰 경계

- hook payload와 환경변수는 신뢰하지 않는 외부 입력으로 취급한다.
- 파싱 실패나 알 수 없는 event는 Codex 실행을 방해하지 않도록 안전하게 실패시키되, 원인 진단이 가능해야 한다.
- shell command 문자열, 경로, prompt, tool input을 로그에 그대로 재출력하지 않는다.
- hook handler는 짧게 끝나야 하며, monitor 장애가 Codex task를 막지 않아야 한다.

## 최소 수집

- 기본 수집 대상은 lifecycle과 상태 표시에 필요한 최소 메타데이터다.
- 전체 prompt, 전체 tool input/output, 대화 본문, secret, token, credential은 기본 저장·전송하지 않는다.
- 실제 payload를 먼저 캡처하고, 필요한 필드와 redaction 정책을 근거와 함께 정한다.
- 원본 캡처는 Phase 0 검증용 임시 산출물로 취급하고 Git 및 npm package에서 제외한다.

## 로컬 전용

- 첫 릴리스는 외부 telemetry와 원격 서버를 사용하지 않는다.
- 프로세스 간 전달이 필요하면 localhost 또는 Unix socket으로 제한하고, 외부 인터페이스 bind를 금지한다.
- 별도 프로세스가 공식 Codex 앱의 메모리를 공유한다고 가정하지 않는다.
- hook event가 live state의 기준이며 App Server 정보는 보강 데이터로만 사용한다.

## 설치와 제거

- `postinstall`에서 사용자 Codex 설정을 추가·수정하지 않는다.
- hook 활성화는 사용자가 검토하고 명시적으로 수행하는 절차로 제공한다.
- 터미널은 npm 설치와 명시적 제거·진단 경계까지만 사용한다. 설치 후 실행 시작은 공식 Codex 앱의 `@codex-agent-view` 또는 plugin Quick start로 제공하고, 상태 UI는 OS 기본 외부 브라우저에 표시한다.
- 별도 `$show-agents` 선택이나 Codex in-app panel 열기를 정상 사용 단계로 요구하지 않는다. 내부 single skill은 plugin 실행을 구현하는 capability로만 유지한다.
- 일반 사용자 문서에 monitor process 실행, localhost 주소 입력, tokenized/private URL 복사를 필수 또는 권장 사용 단계로 넣지 않는다. Plugin이 자격을 사용자에게 노출하지 않고 기본 브라우저를 직접 연다.
- 설치 전에 실행될 command, 읽는 데이터, 기록 위치, 보관 기간을 알린다.
- 제거 절차는 plugin 파일뿐 아니라 등록된 hook과 로컬 임시 산출물을 각각 어떻게 정리하는지 설명한다.
- 배포 package에는 검증 fixture나 민감한 실제 캡처를 포함하지 않는다.

## 권한과 제어

- 첫 릴리스는 read-only다.
- 브라우저 access/recovery credential은 read-only scope와 고정된 family 만료를 유지하고 tab-scoped `sessionStorage` 밖에 저장하지 않는다.
- 같은 탭의 일시적 연결 오류나 유효한 recovery credential에는 실제 재시도·재연결 버튼을 제공한다. 인증 이력이 없는 새 탭 또는 만료된 family는 페이지가 새 자격을 발급하지 않으며 공식 Codex 앱에서 `@codex-agent-view`를 다시 실행하도록 안내한다.
- `PermissionRequest`를 관찰하더라도 자동 승인·거절하지 않는다.
- task 또는 subagent를 중단·재시작하거나 메시지를 보내는 기능은 별도 보안 검토 전 추가하지 않는다.
