# 배포 경로 조사

조사일: 2026-08-01

이 문서는 Codex Agent View `0.2.0`의 npm package와 Codex plugin 배포 경계를 정리한다. 코드·tarball 준비와 npm login은 완료됐지만 public publish는 계정 필수 2FA가 비활성화되어 E403으로 차단됐다. GitHub release와 Universal Directory publish는 npm과 별도 절차다.

## 현재 상태

- package 이름과 버전은 `codex-agent-view@0.2.0`이다.
- Node.js `>=18`을 요구하며 production dependency가 없다.
- `package.json`은 `codex-agent-view` executable을 `bin/codex-agent-view.mjs`로 노출한다.
- 배포 bundle에는 plugin manifest/catalog, logo assets, hooks, CLI, local runtime/server, static monitor UI, scripts, genuine Codex skill, README, LICENSE, NOTICE가 포함된다.
- `postinstall`과 다른 npm lifecycle installer는 없다. npm package를 받는 것만으로 Codex 설정을 바꾸지 않는다.
- 사용자가 `codex-agent-view install`을 명시적으로 실행할 때만 local marketplace bundle 복사, marketplace 등록, plugin 등록이 수행된다. Hook trust는 자동화하지 않는다.
- runtime은 `127.0.0.1`에만 bind하고 live 상태를 의도적으로 bounded process memory에 둔다. Reset-on-restart는 완성된 companion 설계이며 SQLite/영구 history는 release 누락 항목이 아니다. 외부 telemetry, 원격 server, task 제어 기능도 없다.
- `codex-agent-view@0.2.0` 코드와 tarball, maintainer `kyurasi` login은 준비됐다. `npm profile get`의 `tfa:false` 상태에서 publish가 E403으로 실패했으므로, 필수 2FA 활성화와 publish 성공 전에는 public npm 설치 경로가 아니다.

## CLI 표면

현재 package가 제공하는 command는 다음과 같다.

| Command | 동작 | 상태 변경 |
| --- | --- | --- |
| `codex-agent-view start [--port <port>] [--no-open]` | loopback monitor와 in-memory store를 foreground로 실행 | local runtime file 생성, 기본값은 browser 열기 |
| `codex-agent-view status [--json]` | 실행 중 monitor의 상태 조회 | 없음 |
| `codex-agent-view doctor [--json]` | Codex CLI, plugin 설치, monitor, runtime 경로 진단 | 없음 |
| `codex-agent-view install` | package를 local marketplace bundle로 복사하고 plugin 등록 | Codex plugin/marketplace 등록 변경 |
| `codex-agent-view uninstall [--purge]` | plugin과 marketplace bundle 제거 | Codex 등록 및 local files 변경 |
| `codex-agent-view --version` | package version 출력 | 없음 |

`start`는 장시간 실행되는 foreground command다. Browser를 자동으로 열지 않는 자동화나 진단에서는 `start --no-open`을 사용한다. `status`와 hook sender는 runtime file의 local bearer token으로 monitor API에 접근한다.

## 서로 다른 세 가지 배포 개념

| 경로 | 목적 | 검색 노출 |
| --- | --- | --- |
| Git/local marketplace | source checkout 또는 package가 복사한 local bundle에서 plugin 설치 | 해당 marketplace를 등록한 사용자에게만 표시 |
| npm-backed marketplace | marketplace catalog가 npm registry package를 source로 지정 | 해당 marketplace를 등록한 사용자에게만 표시 |
| Universal Plugins Directory | OpenAI 심사와 개발자 publish 후 ChatGPT와 Codex가 공유하는 directory에 공개 | 공개 directory 검색 대상 |

npm에 package를 publish하는 것만으로 Universal Plugins Directory에 등록되지는 않는다. 반대로 Directory 제출은 npm package 배포의 대체 절차가 아니다.

현재 `.agents/plugins/marketplace.json`은 repository 또는 copied package root를 가리키는 local source(`source.path: "./"`)다. `codex-agent-view install`은 npm으로 받은 package라도 이 local catalog를 `~/.codex-agent-view/marketplace` 아래에 복사한 뒤 Codex CLI로 등록한다. 이것은 catalog가 npm registry를 직접 resolve하는 “npm-backed marketplace source”와 구분해야 한다.

## Source 및 tarball 검증

Source checkout에서는 registry publish 없이 실제 CLI를 실행할 수 있다.

```bash
node bin/codex-agent-view.mjs --version
node bin/codex-agent-view.mjs doctor --json
node bin/codex-agent-view.mjs start --no-open
node bin/codex-agent-view.mjs status --json
```

`install`과 `uninstall`은 Codex 등록과 local files를 변경하므로 격리된 `CODEX_HOME`과 `CODEX_AGENT_VIEW_RUNTIME_DIR`에서 먼저 검증한다.

```bash
npm test
npm run validate:plugin
npm pack --dry-run --cache ./node_modules/.cache/npm
```

Release candidate 검증에서는 `npm pack`으로 만든 exact tarball을 임시 prefix에 설치하고, 설치된 executable에서 `--version`, `doctor`, `install`, `start --no-open`, `status --json`, `uninstall --purge` 순서의 smoke/E2E를 수행한다. Source checkout만 실행하고 tarball이 정상이라고 가정하지 않는다.

## Publish 성공 후 public npm 사용자 경로

다음 명령은 필수 2FA 활성화와 `codex-agent-view@0.2.0` publish 성공을 확인한 뒤에 유효하다. Mutable `latest`보다 문서와 함께 검증한 exact version을 우선한다.

일회성 실행:

```bash
npx --yes codex-agent-view@0.2.0 doctor
npx --yes codex-agent-view@0.2.0 install
npx --yes codex-agent-view@0.2.0 start --no-open
```

또는 명시적인 global install:

```bash
npm install --global codex-agent-view@0.2.0
codex-agent-view doctor
codex-agent-view install
codex-agent-view start
```

Publish 후에도 global install과 `npx`는 package download만으로 Codex 설정을 바꾸지 않는다. 사용자가 `install`을 명시적으로 실행할 때만 local plugin registration이 바뀌며, hook command와 trust boundary를 먼저 보여준다.

`codex-agent-view install`의 현재 동작은 다음과 같다.

1. runtime directory 아래 `marketplace`에 package bundle을 복사한다.
2. `codex plugin marketplace add`로 그 local marketplace를 등록한다.
3. `codex plugin add codex-agent-view@codex-agent-view`로 plugin을 등록한다.
4. 사용자가 hook을 검토하고 trust한 뒤 Codex를 재시작하고 새 task를 만들도록 안내한다.

Install command 자체는 별도 confirmation prompt를 제공하지 않는다. 따라서 사용자나 agent가 명시적으로 설치를 요청한 경우에만 실행한다. npm `postinstall`에서 이를 호출하지 않는다.

## 공식 npm marketplace source 후보

[공식 plugin packaging 문서](https://developers.openai.com/plugins/build/plugins)는 marketplace entry가 JavaScript package registry를 source로 사용할 수 있다고 설명한다. 별도 release marketplace가 registry package를 직접 설치하도록 전환한다면 후보 entry는 다음 형태다.

```json
{
  "name": "codex-agent-view",
  "source": {
    "source": "npm",
    "package": "codex-agent-view",
    "version": "^0.2.0",
    "registry": "https://registry.npmjs.org"
  },
  "policy": {
    "installation": "AVAILABLE",
    "authentication": "ON_INSTALL"
  },
  "category": "Productivity"
}
```

공식 문서에서 확인한 규칙은 다음과 같다.

- `package`는 필수이며 npm scope를 포함할 수 있다.
- `version`은 선택 사항이며 version, dist-tag, semver range를 받을 수 있지만 path나 URL selector는 받을 수 없다.
- `registry`는 선택 사항이다. 지정한다면 embedded credential, query, fragment가 없는 HTTPS URL이어야 한다.
- Codex host가 npm CLI를 사용해 package를 내려받고 registry 인증은 사용자의 npm configuration을 따른다.
- Codex는 npm package의 lifecycle script를 실행하지 않는다.

현재 local catalog를 이 npm source로 바꾸지 않는다. Package-owned installer와 npm-backed marketplace를 동시에 제공할지, 하나를 주 설치 경로로 삼을지는 실제 registry/App E2E 뒤에 결정한다.

## Hook trust와 공식 앱 활성화

어떤 배포 경로를 쓰더라도 다음 단계를 몰래 자동화하지 않는다.

1. 사용자가 설치 package와 hook source를 검토한다.
2. plugin을 명시적으로 enable한다.
3. CLI TUI의 `/hooks` 또는 공식 앱의 해당 UI에서 `hooks/hooks.json` command를 검토한다.
4. current hook definition의 exact hash를 사용자가 직접 trust한다.
5. 공식 앱을 완전히 재시작하고 새 task에서 hook → loopback runtime → UI 흐름을 확인한다.

## 제거와 복구

Package CLI의 기본 제거 경로는 다음과 같다.

```bash
codex-agent-view doctor
codex-agent-view uninstall
```

`uninstall`은 `codex-agent-view@codex-agent-view` plugin 등록, `codex-agent-view` marketplace 등록, copied marketplace bundle을 제거하지만 runtime directory의 나머지 data는 보존한다.

사용자가 runtime directory까지 제거하길 명시적으로 원할 때만 다음을 사용한다.

```bash
codex-agent-view doctor --json
codex-agent-view uninstall --purge
```

`--purge` 전에 `doctor`가 보고한 exact runtime directory가 안전한 대상인지 확인한다. 별도 `PLUGIN_DATA`, `CODEX_AGENT_VIEW_CAPTURE_DIR`, 또는 project working directory에 생성한 opt-in debug capture는 runtime directory 밖에 있을 수 있으므로 자동 정리됐다고 가정하지 않는다.

CLI를 사용할 수 없는 수동 복구에서는 먼저 `codex plugin list`와 `codex plugin marketplace list`로 정확한 ID를 확인한 뒤 plugin과 marketplace를 각각 제거한다.

```bash
codex plugin remove codex-agent-view@codex-agent-view
codex plugin marketplace remove codex-agent-view
```

## 외부 npm release 및 artifact 검증

아래는 완성된 local product에 대한 distribution artifact와 운영 절차 검증이다. In-memory 설계를 보완하는 제품 기능 checklist가 아니다.

- [x] maintainer npm `kyurasi` login 확인
- [x] `0.2.0` 코드와 publish tarball 준비 확인
- [ ] npm account 필수 2FA 활성화 확인 (`npm profile get` 현재 `tfa:false`)
- [ ] E403 차단 해소 후 `0.2.0` public registry publish 성공 확인
- [x] `npm pack --dry-run`에서 의도한 runtime files만 포함하고 test/dev capture는 제외
- [x] tarball 안에 executable, manifests/catalog, logo assets, hooks, sender/capture scripts, skill, UI/runtime, README, LICENSE, NOTICE 포함
- [ ] release repository에서 Privacy, Terms, Support, Security 문서의 public URL이 접근 가능
- [ ] actual tarball을 clean temporary prefix에 설치하고 executable bit와 `--version` 검증
- [ ] isolated Codex/runtime directories에서 `doctor` → `install` → `start --no-open` → hook event → `status --json` → `uninstall --purge` E2E
- [ ] monitor가 IPv4 loopback 외부에 bind하지 않고 API가 token을 요구하는지 검증
- [ ] npm install과 Codex npm-backed marketplace install에서 lifecycle script가 실행되지 않는지 관찰
- [ ] plugin enable 후 hook trust와 새 공식 앱 GUI task lifecycle E2E
- [ ] public npm registry에서 exact-version `npx` smoke test
- [ ] remove 후 hook source 비활성화와 opt-in capture 보존·정리 경로 확인

## 외부 배포 운영 상태

- [x] npm account login, package metadata, version, tarball을 확인했다.
- [ ] npm account 필수 2FA를 활성화하고 E403 차단을 해소한다.
- [ ] Package 이름 소유권과 visibility를 registry publish 성공으로 확인한다.
- [ ] Git tag/release와 npm artifact가 같은 source에서 만들어졌는지 확인한다.
- [ ] Public registry에서 package provenance와 exact-version global install/`npx` 동작을 확인한다.
- [ ] npm-backed marketplace catalog를 제공한다면 package, version range, registry와 authentication policy를 확정한다.
- [ ] 공식 앱/CLI에서 설치, hook trust, 새 task lifecycle, 제거를 실제 사용자 환경에서 검증한다.
- [ ] Universal Plugins Directory 제출은 npm release와 별도로 진행한다.

## 남은 미확인 사항

- npm-backed marketplace가 현재 공식 앱 GUI에서 local/Git source와 동일하게 hook trust UI까지 연결되는지
- no-account, local-only plugin에 가장 정확한 marketplace `policy.authentication` 값
- package-owned installer와 npm-backed marketplace 중 공개 릴리스의 주 설치 경로
- npm artifact와 Universal Plugins Directory listing을 연결하는 장기 release convention

## 공식 근거

- [Package your plugin](https://developers.openai.com/plugins/build/plugins)
- [Hooks](https://learn.chatgpt.com/docs/hooks)
- [Plugins overview](https://learn.chatgpt.com/docs/plugins)
