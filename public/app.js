const API_STATE_URL = "/api/state";
const POLL_INTERVAL_MS = 2_000;
const SESSION_TOKEN_KEY = "codex-agent-view-access-token";
const EXCLUDED_SESSION_KEY = "codex-agent-view-excluded-session";
const LANGUAGE_KEY = "codex-agent-view-language";
const SUPPORTED_LANGUAGES = new Set(["en", "ko", "es"]);
const KNOWN_STATUSES = new Set(["running", "waiting", "completed", "unknown"]);
const VIEWER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const CANONICAL_SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const MESSAGES = Object.freeze({
  en: Object.freeze({
    metaDescription: "A clear, live view of Codex work and the agents moving it forward.",
    skipToContent: "Skip to content",
    brandHome: "Codex Agent View home",
    brandSubtitle: "Live work overview",
    languageLabel: "Language",
    connectionConnecting: "Connecting to local status",
    connectionConnected: "Local monitor connected",
    connectionRetrying: "Disconnected · retrying",
    authenticationRequired: "Live view authentication required",
    heroEyebrow: "LIVE CODEX WORK",
    heroTitle: "See active work at a glance",
    heroCopy: "See what Codex is working on, which agents are involved, and how each part is progressing—all in one place.",
    freshnessAria: "Refresh information",
    lastUpdatedLabel: "Last updated",
    notYet: "Not yet",
    refreshIntervalLabel: "Refresh interval",
    twoSeconds: "2 seconds",
    metricsAria: "Task status summary",
    parentTasks: "Work items",
    currentlyObserved: "Currently observed",
    runningAgents: "Active agents",
    workingNow: "Working now",
    waitingStatus: "Waiting",
    waitingExplanation: "Waiting for input or the next step",
    completedAgents: "Completed agents",
    currentView: "In the current view",
    liveWork: "LIVE WORK",
    sessionsHeading: "Work and participating agents",
    loadingState: "Loading status.",
    toolbarAria: "Filter automatically observed work and participating agents",
    searchLabel: "Filter list (optional)",
    searchPlaceholder: "Find work or an agent",
    statusFilterLabel: "Status filter (optional)",
    statusAll: "All statuses",
    statusRunning: "Running",
    statusWaiting: "Waiting",
    statusCompleted: "Completed",
    statusUnknown: "Unknown",
    connectingCopy: "Connecting to the Codex app's local status.",
    sessionListAria: "Codex work list",
    privacyPrompt: "This view shows only a shortened request summary; it never displays the full request or tool inputs.",
    privacyLocal: "Data is read only from the local monitor on this device.",
    timeUnknown: "Time unavailable",
    startedUnknown: "Start time unavailable",
    noReceivedActivity: "No activity received",
    parentTask: "WORK",
    projectUnknown: "Project unavailable",
    taskSummary: "Request",
    taskSummaryUnavailable: "A short request summary is not available yet.",
    recentActivity: "Recent activity",
    recent: "Recent",
    subagentsCount: "Participating agents · {count}",
    subagentName: "Agent {ordinal}",
    agentProfile: "Role/profile · {profile}",
    agentProfileNote: "Codex currently provides each agent's role, but not its full assignment description.",
    noSubagents: "No participating agents have been observed for this work item.",
    noRecentActivity: "No recent activity to display.",
    technicalInfo: "Technical information",
    agentId: "Agent ID",
    rawProfile: "Raw role/profile",
    rawEvent: "Raw event",
    rawTool: "Raw tool",
    retry: "Retry connection",
    retryAuthentication: "Try this tab again",
    checkAuthentication: "Check authentication again",
    recoveryTitle: "Open a newly authenticated view",
    recoveryStep: "In the Codex app, select @codex-agent-view in the composer, then choose the actual $show-agents skill from the skill picker.",
    recoveryNote: "The skill opens a new live view with fresh authentication. No terminal command or external browser is needed.",
    resultsFiltered: "Showing {visible} of {total}",
    resultsTotal: "{count} work items",
    searchEmptyTitle: "No matching results.",
    searchEmptyCopy: "Try changing the search term or status filter.",
    emptyWithDiagnosticsTitle: "No work can be displayed.",
    emptyWithDiagnosticsCopy: "The local monitor received {count} activity records but could not apply them to displayable work items.",
    emptyTitle: "No task activity has been received in this observation window.",
    emptyCopy: "The local monitor is connected. This result alone does not mean that Codex has no active work or participating agents.",
    emptyGuidanceTitle: "If work does not appear",
    automaticTracking: "You do not need to enter or register task IDs. Activity from trusted hooks is added automatically.",
    emptyStep1: "After installing the plugin, fully restart the official Codex app.",
    emptyStep2: "In a new task, review and explicitly trust the Codex Agent View hook command.",
    emptyStep3: "After trusting it, start new work and run agents. New activity is added automatically.",
    observationBoundary: "Observation starts with the first trusted hook event. Earlier activity and activity missed while local collection was stopped cannot be replayed; restarting collection opens a new observation window.",
    diagnosticsCount: "Validation information · {count}",
    diagnosticOccurrences: "{count} occurrences",
    disconnectedTitle: "Local status disconnected; retrying.",
    authTitle: "This live view cannot be authenticated.",
    retryWithState: "Reconnecting automatically every 2 seconds while keeping the last good state visible.",
    retryWithoutState: "Reconnecting automatically every 2 seconds. You can leave this view open in the Codex app.",
    missingToken: "This tab does not have the authentication needed to display live work.",
    expiredToken: "This tab's live-view authentication was rejected or is no longer valid.",
    requestFailed: "Status request failed ({status})",
    unknownConnectionError: "An unknown connection error occurred.",
    offline: "This device is offline.",
    invalidState: "The status response format is invalid.",
    durationSeconds: "{count}s",
    durationMinutes: "{count}m",
    durationHours: "{count}h",
    durationHoursMinutes: "{hours}h {minutes}m",
    toolFallback: "Tool · {name}",
    activityFallback: "Activity · {name}",
    nameUnknown: "Unknown name",
    activityUnknown: "Unknown",
    approvalRequest: "{tool} approval requested",
    agentStarted: "Agent {ordinal} started",
    agentStopped: "Agent {ordinal} completed",
    activitySessionStarted: "Observation started",
    activitySessionEnded: "Observation ended",
    activityTurnStarted: "Work started",
    activityTurnStopped: "Work response completed",
    activitySubagentStarted: "Agent started",
    activitySubagentStopped: "Agent completed",
    activityToolStarted: "Tool activity",
    activityToolCompleted: "Tool activity",
    activityPermissionRequested: "User approval requested",
    toolApplyPatch: "File edit",
    toolBash: "Terminal activity",
    toolFollowup: "Agent follow-up requested",
    toolInterrupt: "Agent interruption requested",
    toolList: "Agent status checked",
    toolMessage: "Message sent to agent",
    toolSpawn: "Agent started",
    toolWaitAgent: "Waiting for agent",
    toolExec: "Terminal activity",
    toolUserInput: "User input requested",
    toolWait: "Waiting for completion",
    toolStdin: "Terminal input",
    roleExplorer: "Research",
    roleReviewer: "Review",
    roleWorker: "Implementation",
    roleDefault: "General agent",
    roleUnknown: "Not reported",
  }),
  ko: Object.freeze({
    metaDescription: "Codex가 수행 중인 작업과 참여 에이전트의 진행 상황을 한눈에 확인합니다.",
    skipToContent: "본문으로 건너뛰기",
    brandHome: "Codex Agent View 홈",
    brandSubtitle: "실시간 작업 현황",
    languageLabel: "언어",
    connectionConnecting: "로컬 상태 연결 중",
    connectionConnected: "로컬 모니터 연결됨",
    connectionRetrying: "연결 끊김 · 재시도 중",
    authenticationRequired: "실시간 화면 인증 필요",
    heroEyebrow: "CODEX 작업 현황",
    heroTitle: "작업 흐름을 한눈에",
    heroCopy: "Codex가 어떤 요청을 처리하고 있는지, 어떤 에이전트가 참여하는지, 각 단계가 어디까지 왔는지 한 화면에서 확인하세요.",
    freshnessAria: "상태 갱신 정보",
    lastUpdatedLabel: "마지막 갱신",
    notYet: "아직 없음",
    refreshIntervalLabel: "갱신 주기",
    twoSeconds: "2초",
    metricsAria: "작업 상태 요약",
    parentTasks: "작업",
    currentlyObserved: "현재 관찰 중",
    runningAgents: "실행 중 에이전트",
    workingNow: "작업 수행 중",
    waitingStatus: "대기 상태",
    waitingExplanation: "사용자 응답 또는 다음 작업 대기",
    completedAgents: "완료 에이전트",
    currentView: "현재 화면 기준",
    liveWork: "실시간 작업",
    sessionsHeading: "작업과 참여 에이전트",
    loadingState: "상태를 불러오는 중입니다.",
    toolbarAria: "자동 수신된 작업과 참여 에이전트 목록 필터",
    searchLabel: "목록 필터 (선택)",
    searchPlaceholder: "작업 또는 에이전트 찾기",
    statusFilterLabel: "상태 필터 (선택)",
    statusAll: "모든 상태",
    statusRunning: "실행 중",
    statusWaiting: "대기",
    statusCompleted: "완료",
    statusUnknown: "알 수 없음",
    connectingCopy: "Codex 앱의 로컬 상태에 연결하고 있습니다.",
    sessionListAria: "Codex 작업 목록",
    privacyPrompt: "이 화면은 짧게 줄인 요청 요약만 표시하며, 전체 요청이나 도구 입력은 표시하지 않습니다.",
    privacyLocal: "데이터는 이 기기의 로컬 모니터에서만 읽습니다.",
    timeUnknown: "시간 정보 없음",
    startedUnknown: "시작 시간 없음",
    noReceivedActivity: "수신된 활동 없음",
    parentTask: "작업",
    projectUnknown: "프로젝트 정보 없음",
    taskSummary: "요청 내용",
    taskSummaryUnavailable: "요청 내용을 요약할 수 있는 정보가 아직 없습니다.",
    recentActivity: "최근 활동",
    recent: "최근",
    subagentsCount: "참여 에이전트 · {count}",
    subagentName: "에이전트 {ordinal}",
    agentProfile: "역할/프로필 · {profile}",
    agentProfileNote: "Codex는 현재 각 에이전트의 역할을 제공하지만, 구체적인 할당 내용 전체는 제공하지 않습니다.",
    noSubagents: "이 작업에 참여한 에이전트가 아직 관찰되지 않았습니다.",
    noRecentActivity: "표시할 최근 활동이 없습니다.",
    technicalInfo: "기술 정보",
    agentId: "에이전트 ID",
    rawProfile: "원본 역할/프로필",
    rawEvent: "원본 이벤트",
    rawTool: "원본 도구",
    retry: "연결 다시 시도",
    retryAuthentication: "이 탭에서 다시 시도",
    checkAuthentication: "인증 정보 다시 확인",
    recoveryTitle: "새 인증 화면 열기",
    recoveryStep: "Codex 앱 입력창에서 @codex-agent-view를 선택한 다음, 스킬 선택기에서 실제 $show-agents 스킬을 선택하세요.",
    recoveryNote: "새 인증이 적용된 실시간 화면이 열립니다. 터미널 명령이나 외부 브라우저는 필요하지 않습니다.",
    resultsFiltered: "전체 {total}개 중 {visible}개 표시",
    resultsTotal: "작업 {count}개",
    searchEmptyTitle: "검색 결과가 없습니다.",
    searchEmptyCopy: "검색어나 상태 필터를 바꿔 보세요.",
    emptyWithDiagnosticsTitle: "표시 가능한 작업이 없습니다.",
    emptyWithDiagnosticsCopy: "로컬 모니터가 활동 정보 {count}건을 받았지만 표시 가능한 작업으로 적용하지 못했습니다.",
    emptyTitle: "이 관찰 화면에서 수신된 작업 활동이 없습니다.",
    emptyCopy: "로컬 모니터 연결은 정상입니다. 이 결과만으로 Codex에 진행 중인 작업이나 참여 에이전트가 없다고 판단할 수 없습니다.",
    emptyGuidanceTitle: "표시되지 않을 때 확인 순서",
    automaticTracking: "작업 ID를 입력하거나 작업별로 등록할 필요가 없습니다. 신뢰한 hook의 작업 활동이 이 목록에 자동으로 추가됩니다.",
    emptyStep1: "플러그인을 설치한 뒤 공식 Codex 앱을 완전히 재시작했는지 확인합니다.",
    emptyStep2: "새 작업에서 표시되는 Codex Agent View hook 명령을 검토하고 직접 신뢰합니다.",
    emptyStep3: "신뢰 설정 후 새 작업을 시작해 에이전트를 실행합니다. 새 활동은 이 목록에 자동으로 추가됩니다.",
    observationBoundary: "관찰 화면은 첫 번째로 신뢰한 hook을 받은 시점부터 시작합니다. 그 전에 이미 지나간 활동과 로컬 상태 수집이 중단된 동안의 활동은 재생되지 않으며, 수집이 다시 시작되면 새 관찰 화면이 열립니다.",
    diagnosticsCount: "검증 정보 · {count}건",
    diagnosticOccurrences: "{count}건",
    disconnectedTitle: "로컬 상태 연결이 끊겨 다시 시도 중입니다.",
    authTitle: "이 실시간 화면을 인증할 수 없습니다.",
    retryWithState: "2초마다 자동으로 다시 연결합니다. 마지막 정상 상태를 계속 표시합니다.",
    retryWithoutState: "2초마다 자동으로 다시 연결합니다. Codex 앱에서 이 화면을 그대로 두어도 됩니다.",
    missingToken: "이 탭에는 실시간 작업을 표시하는 데 필요한 인증 정보가 없습니다.",
    expiredToken: "이 탭의 실시간 화면 인증이 거부되었거나 더 이상 유효하지 않습니다.",
    requestFailed: "상태 요청 실패 ({status})",
    unknownConnectionError: "알 수 없는 연결 오류가 발생했습니다.",
    offline: "이 기기가 오프라인입니다.",
    invalidState: "상태 응답 형식이 올바르지 않습니다.",
    durationSeconds: "{count}초",
    durationMinutes: "{count}분",
    durationHours: "{count}시간",
    durationHoursMinutes: "{hours}시간 {minutes}분",
    toolFallback: "도구 · {name}",
    activityFallback: "활동 · {name}",
    nameUnknown: "이름 미상",
    activityUnknown: "알 수 없음",
    approvalRequest: "{tool} 승인 요청",
    agentStarted: "에이전트 {ordinal} 시작",
    agentStopped: "에이전트 {ordinal} 완료",
    activitySessionStarted: "관찰 시작",
    activitySessionEnded: "관찰 종료",
    activityTurnStarted: "작업 시작",
    activityTurnStopped: "작업 응답 완료",
    activitySubagentStarted: "에이전트 시작",
    activitySubagentStopped: "에이전트 완료",
    activityToolStarted: "도구 작업",
    activityToolCompleted: "도구 작업",
    activityPermissionRequested: "사용자 승인 요청",
    toolApplyPatch: "파일 수정",
    toolBash: "터미널 작업",
    toolFollowup: "에이전트 후속 작업 요청",
    toolInterrupt: "에이전트 작업 중단 요청",
    toolList: "에이전트 상태 확인",
    toolMessage: "에이전트에게 메시지 전달",
    toolSpawn: "에이전트 시작",
    toolWaitAgent: "에이전트 응답 대기",
    toolExec: "터미널 작업",
    toolUserInput: "사용자 입력 요청",
    toolWait: "작업 완료 대기",
    toolStdin: "터미널 입력",
    roleExplorer: "조사",
    roleReviewer: "검토",
    roleWorker: "구현",
    roleDefault: "일반 에이전트",
    roleUnknown: "보고되지 않음",
  }),
  es: Object.freeze({
    metaDescription: "Una vista clara del trabajo de Codex y de los agentes que lo hacen avanzar.",
    skipToContent: "Saltar al contenido",
    brandHome: "Inicio de Codex Agent View",
    brandSubtitle: "Resumen del trabajo en vivo",
    languageLabel: "Idioma",
    connectionConnecting: "Conectando al estado local",
    connectionConnected: "Monitor local conectado",
    connectionRetrying: "Desconectado · reintentando",
    authenticationRequired: "Se requiere autenticar la vista",
    heroEyebrow: "TRABAJO ACTIVO EN CODEX",
    heroTitle: "Observa el trabajo activo de un vistazo",
    heroCopy: "Consulta qué está haciendo Codex, qué agentes participan y cómo avanza cada parte, todo en un solo lugar.",
    freshnessAria: "Información de actualización",
    lastUpdatedLabel: "Última actualización",
    notYet: "Aún no",
    refreshIntervalLabel: "Intervalo de actualización",
    twoSeconds: "2 segundos",
    metricsAria: "Resumen del estado de las tareas",
    parentTasks: "Trabajos",
    currentlyObserved: "En observación",
    runningAgents: "Agentes activos",
    workingNow: "Trabajando ahora",
    waitingStatus: "En espera",
    waitingExplanation: "Esperando una respuesta o el siguiente paso",
    completedAgents: "Agentes que terminaron",
    currentView: "En la vista actual",
    liveWork: "TRABAJO EN VIVO",
    sessionsHeading: "Trabajos y agentes participantes",
    loadingState: "Cargando el estado.",
    toolbarAria: "Filtrar trabajos y agentes participantes observados automáticamente",
    searchLabel: "Filtrar lista (opcional)",
    searchPlaceholder: "Buscar un trabajo o agente",
    statusFilterLabel: "Filtrar por estado (opcional)",
    statusAll: "Todos los estados",
    statusRunning: "En ejecución",
    statusWaiting: "En espera",
    statusCompleted: "Completado",
    statusUnknown: "Desconocido",
    connectingCopy: "Conectando al estado local de la aplicación Codex.",
    sessionListAria: "Lista de trabajos de Codex",
    privacyPrompt: "Esta vista solo muestra un resumen abreviado de la solicitud; nunca muestra la solicitud completa ni las entradas de herramientas.",
    privacyLocal: "Los datos se leen únicamente del monitor local de este dispositivo.",
    timeUnknown: "Hora no disponible",
    startedUnknown: "Hora de inicio no disponible",
    noReceivedActivity: "No se recibió actividad",
    parentTask: "TRABAJO",
    projectUnknown: "Proyecto no disponible",
    taskSummary: "Solicitud",
    taskSummaryUnavailable: "Todavía no hay información para resumir esta solicitud.",
    recentActivity: "Actividad reciente",
    recent: "Reciente",
    subagentsCount: "Agentes participantes · {count}",
    subagentName: "Agente {ordinal}",
    agentProfile: "Rol/perfil · {profile}",
    agentProfileNote: "Codex proporciona el rol de cada agente, pero no la descripción completa de su asignación.",
    noSubagents: "Todavía no se observaron agentes participantes en este trabajo.",
    noRecentActivity: "No hay actividad reciente que mostrar.",
    technicalInfo: "Información técnica",
    agentId: "ID del agente",
    rawProfile: "Rol/perfil original",
    rawEvent: "Evento original",
    rawTool: "Herramienta original",
    retry: "Reintentar conexión",
    retryAuthentication: "Reintentar en esta pestaña",
    checkAuthentication: "Volver a comprobar la autenticación",
    recoveryTitle: "Abrir una vista con autenticación nueva",
    recoveryStep: "En el cuadro de texto de Codex, selecciona @codex-agent-view y luego elige la skill real $show-agents en el selector de skills.",
    recoveryNote: "La skill abre una vista en vivo nueva con autenticación actualizada. No necesitas la terminal ni un navegador externo.",
    resultsFiltered: "Mostrando {visible} de {total}",
    resultsTotal: "{count} trabajos",
    searchEmptyTitle: "No hay resultados.",
    searchEmptyCopy: "Prueba otra búsqueda o filtro de estado.",
    emptyWithDiagnosticsTitle: "No hay trabajos que mostrar.",
    emptyWithDiagnosticsCopy: "El monitor local recibió {count} registros de actividad, pero no pudo aplicarlos a trabajos visibles.",
    emptyTitle: "No se recibió actividad en esta ventana de observación.",
    emptyCopy: "El monitor local está conectado. Este resultado no implica por sí solo que Codex no tenga trabajos o agentes activos.",
    emptyGuidanceTitle: "Si el trabajo no aparece",
    automaticTracking: "No es necesario introducir ni registrar IDs de tareas. La actividad de hooks confiables se añade automáticamente.",
    emptyStep1: "Tras instalar el plugin, reinicia por completo la aplicación oficial de Codex.",
    emptyStep2: "En una tarea nueva, revisa y autoriza explícitamente el comando hook de Codex Agent View.",
    emptyStep3: "Después, inicia un trabajo nuevo y ejecuta agentes. La actividad se añadirá automáticamente.",
    observationBoundary: "La observación comienza con el primer evento de un hook autorizado. La actividad anterior o perdida mientras la recopilación local estuvo detenida no se puede reproducir; al reiniciarla se abre una ventana nueva.",
    diagnosticsCount: "Información de validación · {count}",
    diagnosticOccurrences: "{count} apariciones",
    disconnectedTitle: "Se perdió la conexión local; reintentando.",
    authTitle: "No se puede autenticar esta vista en vivo.",
    retryWithState: "Se reconecta automáticamente cada 2 segundos y mantiene visible el último estado válido.",
    retryWithoutState: "Se reconecta automáticamente cada 2 segundos. Puedes dejar esta vista abierta en Codex.",
    missingToken: "Esta pestaña no tiene la autenticación necesaria para mostrar el trabajo en vivo.",
    expiredToken: "La autenticación de esta pestaña fue rechazada o ya no es válida.",
    requestFailed: "Falló la solicitud de estado ({status})",
    unknownConnectionError: "Se produjo un error de conexión desconocido.",
    offline: "Este dispositivo está sin conexión.",
    invalidState: "El formato de la respuesta de estado no es válido.",
    durationSeconds: "{count} s",
    durationMinutes: "{count} min",
    durationHours: "{count} h",
    durationHoursMinutes: "{hours} h {minutes} min",
    toolFallback: "Herramienta · {name}",
    activityFallback: "Actividad · {name}",
    nameUnknown: "Nombre desconocido",
    activityUnknown: "Desconocida",
    approvalRequest: "Se solicitó aprobación para {tool}",
    agentStarted: "Agente {ordinal} iniciado",
    agentStopped: "Agente {ordinal} completado",
    activitySessionStarted: "Observación iniciada",
    activitySessionEnded: "Observación finalizada",
    activityTurnStarted: "Trabajo iniciado",
    activityTurnStopped: "Respuesta del trabajo completada",
    activitySubagentStarted: "Agente iniciado",
    activitySubagentStopped: "Agente completado",
    activityToolStarted: "Actividad de herramienta",
    activityToolCompleted: "Actividad de herramienta",
    activityPermissionRequested: "Se solicitó aprobación",
    toolApplyPatch: "Edición de archivo",
    toolBash: "Actividad de terminal",
    toolFollowup: "Seguimiento del agente solicitado",
    toolInterrupt: "Interrupción del agente solicitada",
    toolList: "Estado de agentes consultado",
    toolMessage: "Mensaje enviado al agente",
    toolSpawn: "Agente iniciado",
    toolWaitAgent: "Esperando al agente",
    toolExec: "Actividad de terminal",
    toolUserInput: "Se solicitó entrada del usuario",
    toolWait: "Esperando finalización",
    toolStdin: "Entrada de terminal",
    roleExplorer: "Investigación",
    roleReviewer: "Revisión",
    roleWorker: "Implementación",
    roleDefault: "Agente general",
    roleUnknown: "No informado",
  }),
});

const STATUS_KEYS = Object.freeze({
  running: "statusRunning",
  waiting: "statusWaiting",
  completed: "statusCompleted",
  unknown: "statusUnknown",
});

const STATUS_ORDER = Object.freeze({
  running: 0,
  waiting: 1,
  unknown: 2,
  completed: 3,
});

const ACTIVITY_KEYS = Object.freeze({
  session_started: "activitySessionStarted",
  session_ended: "activitySessionEnded",
  turn_started: "activityTurnStarted",
  turn_stopped: "activityTurnStopped",
  subagent_started: "activitySubagentStarted",
  subagent_stopped: "activitySubagentStopped",
  tool_started: "activityToolStarted",
  tool_completed: "activityToolCompleted",
  permission_requested: "activityPermissionRequested",
});

const TOOL_KEYS = Object.freeze({
  apply_patch: "toolApplyPatch",
  bash: "toolBash",
  collaborationfollowup_task: "toolFollowup",
  collaborationinterrupt_agent: "toolInterrupt",
  collaborationlist_agents: "toolList",
  collaborationsend_message: "toolMessage",
  collaborationspawn_agent: "toolSpawn",
  collaborationwait_agent: "toolWaitAgent",
  exec_command: "toolExec",
  request_user_input: "toolUserInput",
  wait: "toolWait",
  write_stdin: "toolStdin",
});

const AGENT_ROLE_KEYS = Object.freeze({
  explorer: "roleExplorer",
  reviewer: "roleReviewer",
  worker: "roleWorker",
  default: "roleDefault",
  unknown: "roleUnknown",
});

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g;

function readStoredLanguage() {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_KEY);
    return SUPPORTED_LANGUAGES.has(stored) ? stored : "en";
  } catch {
    return "en";
  }
}

let currentLanguage = readStoredLanguage();

function t(key, replacements = {}) {
  const template = MESSAGES[currentLanguage][key] ?? MESSAGES.en[key] ?? key;
  return Object.entries(replacements).reduce(
    (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

function isExactLiveFragment(entries) {
  const tokenEntries = entries.filter(([key]) => key === "token");
  const excludeEntries = entries.filter(([key]) => key === "exclude");
  return (
    entries.length === tokenEntries.length + excludeEntries.length &&
    tokenEntries.length === 1 &&
    excludeEntries.length <= 1 &&
    VIEWER_TOKEN_PATTERN.test(tokenEntries[0][1]) &&
    (excludeEntries.length === 0 || CANONICAL_SESSION_ID_PATTERN.test(excludeEntries[0][1]))
  );
}

function consumeLiveContext() {
  const hasFragment = window.location.hash.length > 1;
  const entries = hasFragment
    ? [...new URLSearchParams(window.location.hash.slice(1)).entries()]
    : [];
  const validFragment = hasFragment && isExactLiveFragment(entries);
  const fragmentToken = validFragment
    ? entries.find(([key]) => key === "token")[1]
    : "";
  const fragmentExclude = validFragment
    ? entries.find(([key]) => key === "exclude")?.[1] || ""
    : "";

  if (window.location.hash) {
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }

  let token = fragmentToken;
  let excludedSessionId = fragmentExclude;
  try {
    if (validFragment) {
      window.sessionStorage.setItem(SESSION_TOKEN_KEY, fragmentToken);
      if (fragmentExclude) {
        window.sessionStorage.setItem(EXCLUDED_SESSION_KEY, fragmentExclude);
      } else {
        window.sessionStorage.removeItem(EXCLUDED_SESSION_KEY);
      }
    } else {
      token = window.sessionStorage.getItem(SESSION_TOKEN_KEY)?.trim() || "";
      excludedSessionId = window.sessionStorage.getItem(EXCLUDED_SESSION_KEY)?.trim() || "";
    }
  } catch {
    // Storage can be unavailable in hardened browser contexts. The fragment
    // token remains usable for this page load and is never copied elsewhere.
  }

  return {
    accessToken: VIEWER_TOKEN_PATTERN.test(token) ? token : "",
    excludedSessionId: CANONICAL_SESSION_ID_PATTERN.test(excludedSessionId)
      ? excludedSessionId
      : "",
  };
}

let { accessToken, excludedSessionId } = consumeLiveContext();

const elements = Object.freeze({
  connectionStatus: document.querySelector("#connection-status"),
  connectionLabel: document.querySelector("#connection-label"),
  language: document.querySelector("#language-select"),
  metaDescription: document.querySelector("#meta-description"),
  lastUpdated: document.querySelector("#last-updated"),
  metricSessions: document.querySelector("#metric-sessions"),
  metricRunning: document.querySelector("#metric-running"),
  metricWaiting: document.querySelector("#metric-waiting"),
  metricCompleted: document.querySelector("#metric-completed"),
  search: document.querySelector("#session-search"),
  statusFilter: document.querySelector("#status-filter"),
  toolbar: document.querySelector(".toolbar"),
  resultsSummary: document.querySelector("#results-summary"),
  stateMessage: document.querySelector("#state-message"),
  sessionList: document.querySelector("#session-list"),
});

function applyStaticTranslations() {
  document.documentElement.lang = currentLanguage;
  elements.language.value = currentLanguage;
  elements.metaDescription.content = t("metaDescription");
  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const element of document.querySelectorAll("[data-i18n-aria-label]")) {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  }
  for (const element of document.querySelectorAll("[data-i18n-placeholder]")) {
    element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
  }
}

function setLanguage(value) {
  currentLanguage = SUPPORTED_LANGUAGES.has(value) ? value : "en";
  try {
    window.localStorage.setItem(LANGUAGE_KEY, currentLanguage);
  } catch {
    // The selected language still applies for this page load.
  }
  applyStaticTranslations();
  setConnectionStatus(
    elements.connectionStatus.dataset.status,
    viewState.authenticationFailed ? t("authenticationRequired") : "",
  );
  render();
}

const viewState = {
  updatedAtMs: null,
  sessions: [],
  diagnostics: [],
  hasLoaded: false,
  errorMessage: "",
  errorKey: "",
  canRetry: true,
  authenticationFailed: false,
  requestInFlight: false,
};

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function safeString(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function sanitizedFallbackLabel(value, fallback) {
  const normalized = safeString(value, "")
    .replace(CONTROL_CHARACTERS, " ")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/[_./:-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 48);

  if (!normalized) {
    return fallback;
  }

  return normalized.replace(/\b[a-z]/g, (character) => character.toUpperCase());
}

function normalizedLookupKey(value) {
  return safeString(value, "").replace(/[^a-zA-Z0-9_]/g, "").toLocaleLowerCase();
}

function formatAgentRole(agentType) {
  const key = normalizedLookupKey(agentType);
  return AGENT_ROLE_KEYS[key]
    ? t(AGENT_ROLE_KEYS[key])
    : sanitizedFallbackLabel(agentType, t("roleUnknown"));
}

function formatToolLabel(toolName) {
  const key = normalizedLookupKey(toolName);
  return TOOL_KEYS[key]
    ? t(TOOL_KEYS[key])
    : t("toolFallback", { name: sanitizedFallbackLabel(toolName, t("nameUnknown")) });
}

function formatActivityLabel(activity) {
  if (activity.eventName === "subagent_started" && activity.agentOrdinal !== null) {
    return t("agentStarted", { ordinal: activity.agentOrdinal });
  }
  if (activity.eventName === "subagent_stopped" && activity.agentOrdinal !== null) {
    return t("agentStopped", { ordinal: activity.agentOrdinal });
  }
  if (activity.eventName === "permission_requested" && activity.toolName) {
    return t("approvalRequest", { tool: formatToolLabel(activity.toolName) });
  }
  if (
    (activity.eventName === "tool_started" || activity.eventName === "tool_completed") &&
    activity.toolName
  ) {
    return formatToolLabel(activity.toolName);
  }
  return ACTIVITY_KEYS[activity.eventName]
    ? t(ACTIVITY_KEYS[activity.eventName])
    : t("activityFallback", {
      name: sanitizedFallbackLabel(activity.eventName, t("activityUnknown")),
    });
}

function safeTimestamp(value) {
  return Number.isFinite(value) && value >= 0 && value <= 8_640_000_000_000_000
    ? value
    : null;
}

function normalizeStatus(value) {
  return typeof value === "string" && KNOWN_STATUSES.has(value) ? value : "unknown";
}

function normalizeCoreStatus(value) {
  if (value === "running") {
    return "running";
  }
  if (value === "waiting" || value === "waiting_for_user") {
    return "waiting";
  }
  if (
    value === "completed" ||
    value === "stopped" ||
    value === "stopped_without_start" ||
    value === "completed_without_start" ||
    value === "late_start_observed"
  ) {
    return "completed";
  }
  return normalizeStatus(value);
}

function normalizeAgent(value, index) {
  const agent = isRecord(value) ? value : {};
  return {
    agentId: safeString(agent.agent_id, `unknown-agent-${index + 1}`),
    agentType: safeString(agent.agent_type, "unknown"),
    status: normalizeCoreStatus(agent.status),
    startedAtMs: safeTimestamp(agent.started_at_ms),
    stoppedAtMs: safeTimestamp(agent.stopped_at_ms),
    lastActivityAtMs: safeTimestamp(agent.last_seen_at_ms),
  };
}

function agentOrderTimestamp(agent) {
  return agent.startedAtMs ?? agent.stoppedAtMs ?? agent.lastActivityAtMs ?? Number.MAX_SAFE_INTEGER;
}

function assignStableAgentOrdinals(agents) {
  const ordinalByAgentId = new Map(
    [...agents]
      .sort((left, right) => (
        agentOrderTimestamp(left) - agentOrderTimestamp(right) ||
        left.agentId.localeCompare(right.agentId)
      ))
      .map((agent, index) => [agent.agentId, index + 1]),
  );

  return agents.map((agent) => ({
    ...agent,
    ordinal: ordinalByAgentId.get(agent.agentId),
  }));
}

function normalizeActivity(value) {
  const activity = isRecord(value) ? value : {};
  return {
    eventName: safeString(activity.type, "unknown_event"),
    agentId: safeString(activity.agent_id, ""),
    agentOrdinal: null,
    toolName: safeString(activity.tool_name, ""),
    toolUseId: safeString(activity.tool_use_id, ""),
    status: normalizeCoreStatus(activity.status),
    occurredAtMs: safeTimestamp(activity.received_at_ms),
  };
}

function isToolLifecycle(activity) {
  return activity.eventName === "tool_started" || activity.eventName === "tool_completed";
}

function shouldReplaceToolActivity(candidate, current) {
  const candidateTime = candidate.occurredAtMs ?? -1;
  const currentTime = current.occurredAtMs ?? -1;
  if (candidateTime !== currentTime) {
    return candidateTime > currentTime;
  }
  return candidate.eventName === "tool_completed" && current.eventName !== "tool_completed";
}

function collapseToolActivities(activities) {
  const latestByToolUseId = new Map();

  for (const activity of activities) {
    if (!activity.toolUseId || !isToolLifecycle(activity)) {
      continue;
    }
    const current = latestByToolUseId.get(activity.toolUseId);
    if (!current || shouldReplaceToolActivity(activity, current)) {
      latestByToolUseId.set(activity.toolUseId, activity);
    }
  }

  return activities.filter((activity) => (
    !activity.toolUseId ||
    !isToolLifecycle(activity) ||
    latestByToolUseId.get(activity.toolUseId) === activity
  ));
}

function normalizeDiagnostic(value) {
  const diagnostic = isRecord(value) ? value : {};
  return {
    code: safeString(diagnostic.code, "unknown_diagnostic"),
    diagnosedAtMs: safeTimestamp(diagnostic.diagnosed_at_ms),
  };
}

function deriveSessionStatus(session, agents, recentActivities) {
  if (session.permission?.status === "waiting_for_user") {
    return "waiting";
  }
  const reportedStatus = normalizeCoreStatus(session.status);
  if (reportedStatus === "running" || reportedStatus === "completed") {
    return reportedStatus;
  }
  if (
    agents.some((agent) => agent.status === "running") ||
    recentActivities[0]?.status === "running"
  ) {
    return "running";
  }
  return "unknown";
}

function normalizeSession(value, index) {
  const session = isRecord(value) ? value : {};
  const agents = Array.isArray(session.agents)
    ? assignStableAgentOrdinals(session.agents.map(normalizeAgent))
    : [];
  const agentOrdinalById = new Map(
    agents.map((agent) => [agent.agentId, agent.ordinal]),
  );
  const recentActivities = Array.isArray(session.recent_activities)
    ? collapseToolActivities(session.recent_activities.map(normalizeActivity)).map(
      (activity) => ({
        ...activity,
        agentOrdinal: agentOrdinalById.get(activity.agentId) ?? null,
      }),
    )
    : [];

  return {
    sessionId: safeString(session.session_id, `unknown-session-${index + 1}`),
    workspaceLabel: safeString(session.workspace_label, ""),
    taskSummary: safeString(session.task_summary, ""),
    status: deriveSessionStatus(session, agents, recentActivities),
    lastActivityAtMs: safeTimestamp(session.last_seen_at_ms),
    agents,
    recentActivities,
  };
}

function normalizeState(value) {
  if (
    !isRecord(value) ||
    value.schema_version !== 1 ||
    value.source_of_truth !== "hook" ||
    !Array.isArray(value.sessions) ||
    !Array.isArray(value.diagnostics)
  ) {
    throw new TypeError(t("invalidState"));
  }

  return {
    updatedAtMs: safeTimestamp(value.updated_at_ms),
    sessions: value.sessions.map(normalizeSession),
    diagnostics: value.diagnostics.map(normalizeDiagnostic),
  };
}

function compareByActivity(left, right) {
  return (right.lastActivityAtMs ?? -1) - (left.lastActivityAtMs ?? -1);
}

function compareAgents(left, right) {
  const statusDifference = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
  return statusDifference || compareByActivity(left, right);
}

function compareSessions(left, right) {
  const statusDifference = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
  return statusDifference || compareByActivity(left, right);
}

function formatDateTime(timestampMs) {
  if (timestampMs === null) {
    return t("timeUnknown");
  }

  return new Intl.DateTimeFormat(currentLanguage, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(timestampMs));
}

function formatRelativeTime(timestampMs) {
  if (timestampMs === null) {
    return t("timeUnknown");
  }

  const differenceSeconds = Math.round((timestampMs - Date.now()) / 1_000);
  const absoluteSeconds = Math.abs(differenceSeconds);
  const formatter = new Intl.RelativeTimeFormat(currentLanguage, { numeric: "auto" });

  if (absoluteSeconds < 60) {
    return formatter.format(differenceSeconds, "second");
  }
  if (absoluteSeconds < 3_600) {
    return formatter.format(Math.round(differenceSeconds / 60), "minute");
  }
  if (absoluteSeconds < 86_400) {
    return formatter.format(Math.round(differenceSeconds / 3_600), "hour");
  }
  return formatter.format(Math.round(differenceSeconds / 86_400), "day");
}

function formatDuration(startedAtMs, stoppedAtMs) {
  if (startedAtMs === null) {
    return t("startedUnknown");
  }

  const endAtMs = stoppedAtMs ?? Date.now();
  const seconds = Math.max(0, Math.floor((endAtMs - startedAtMs) / 1_000));
  if (seconds < 60) {
    return t("durationSeconds", { count: seconds });
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return t("durationMinutes", { count: minutes });
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes
    ? t("durationHoursMinutes", { hours, minutes: remainingMinutes })
    : t("durationHours", { count: hours });
}

function createStatusBadge(status) {
  const badge = document.createElement("span");
  badge.className = "status-badge";
  badge.dataset.status = status;

  const dot = document.createElement("span");
  dot.className = "status-dot";
  dot.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.textContent = t(STATUS_KEYS[status]);

  badge.append(dot, label);
  return badge;
}

function createTime(timestampMs, prefix) {
  const wrapper = document.createElement("span");
  wrapper.className = "time-label";

  if (prefix) {
    wrapper.append(`${prefix} `);
  }

  if (timestampMs === null) {
    wrapper.append(t("timeUnknown"));
    return wrapper;
  }

  const time = document.createElement("time");
  time.dateTime = new Date(timestampMs).toISOString();
  time.title = formatDateTime(timestampMs);
  time.textContent = formatRelativeTime(timestampMs);
  wrapper.append(time);
  return wrapper;
}

function createTechnicalInfo(rows) {
  const info = document.createElement("div");
  info.className = "technical-info";

  const heading = document.createElement("p");
  heading.className = "technical-info-title";
  heading.textContent = t("technicalInfo");
  const list = document.createElement("dl");

  for (const [label, value] of rows) {
    if (!value) {
      continue;
    }
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    const code = document.createElement("code");
    code.textContent = value;
    description.append(code);
    list.append(term, description);
  }

  info.append(heading, list);
  return info;
}

function createAgentItem(agent) {
  const item = document.createElement("li");
  item.className = "agent-item";
  item.dataset.status = agent.status;

  const heading = document.createElement("div");
  heading.className = "agent-heading";

  const identity = document.createElement("div");
  identity.className = "agent-identity";
  const name = document.createElement("strong");
  name.className = "agent-name";
  name.textContent = t("subagentName", { ordinal: agent.ordinal });
  identity.append(name);

  const roleLabel = formatAgentRole(agent.agentType);
  const role = document.createElement("span");
  role.className = "agent-role";
  role.textContent = t("agentProfile", { profile: roleLabel });
  identity.append(role);
  heading.append(identity, createStatusBadge(agent.status));

  const metadata = document.createElement("div");
  metadata.className = "agent-metadata";
  metadata.append(
    createTime(agent.lastActivityAtMs, t("recent")),
    document.createTextNode(` · ${formatDuration(agent.startedAtMs, agent.stoppedAtMs)}`),
  );

  const technicalRows = [[t("agentId"), agent.agentId]];
  technicalRows.push([t("rawProfile"), agent.agentType]);

  item.append(heading, metadata, createTechnicalInfo(technicalRows));
  return item;
}

function createActivityItem(activity) {
  const item = document.createElement("li");
  item.className = "activity-item";

  const marker = document.createElement("span");
  marker.className = "activity-marker";
  marker.dataset.status = activity.status;
  marker.setAttribute("aria-hidden", "true");

  const content = document.createElement("div");
  const title = document.createElement("div");
  title.className = "activity-title";
  const eventName = document.createElement("strong");
  eventName.textContent = formatActivityLabel(activity);
  title.append(eventName);

  const metadata = document.createElement("div");
  metadata.className = "activity-metadata";
  metadata.append(createStatusBadge(activity.status), createTime(activity.occurredAtMs, ""));

  const technicalRows = [[t("rawEvent"), activity.eventName]];
  if (activity.toolName) {
    technicalRows.push([t("rawTool"), activity.toolName]);
  }

  content.append(title, metadata, createTechnicalInfo(technicalRows));
  item.append(marker, content);
  return item;
}

function createEmptyPanel(message) {
  const empty = document.createElement("p");
  empty.className = "panel-empty";
  empty.textContent = message;
  return empty;
}

function createSessionCard(session) {
  const listItem = document.createElement("li");
  const article = document.createElement("article");
  article.className = "session-card";
  article.dataset.status = session.status;

  const cardHeader = document.createElement("header");
  cardHeader.className = "session-header";

  const identity = document.createElement("div");
  identity.className = "session-identity";
  const eyebrow = document.createElement("span");
  eyebrow.className = "session-kind";
  eyebrow.textContent = t("parentTask");
  const title = document.createElement("h3");
  title.textContent = session.workspaceLabel || t("projectUnknown");
  const taskSummary = document.createElement("p");
  taskSummary.className = "task-summary";
  const taskSummaryLabel = document.createElement("strong");
  taskSummaryLabel.textContent = `${t("taskSummary")} · `;
  const taskSummaryCopy = document.createElement("span");
  taskSummaryCopy.textContent = session.taskSummary || t("taskSummaryUnavailable");
  taskSummary.append(taskSummaryLabel, taskSummaryCopy);
  identity.append(eyebrow, title, taskSummary);

  const sessionState = document.createElement("div");
  sessionState.className = "session-state";
  sessionState.append(
    createStatusBadge(session.status),
    createTime(session.lastActivityAtMs, t("recentActivity")),
  );

  cardHeader.append(identity, sessionState);

  const panels = document.createElement("div");
  panels.className = "session-panels";

  const agentPanel = document.createElement("section");
  agentPanel.className = "session-panel";
  const agentTitle = document.createElement("h4");
  agentTitle.textContent = t("subagentsCount", { count: session.agents.length });
  const profileNote = document.createElement("p");
  profileNote.className = "agent-profile-note";
  profileNote.textContent = t("agentProfileNote");
  agentPanel.append(agentTitle, profileNote);

  if (session.agents.length) {
    const list = document.createElement("ul");
    list.className = "agent-list";
    [...session.agents].sort(compareAgents).forEach((agent) => {
      list.append(createAgentItem(agent));
    });
    agentPanel.append(list);
  } else {
    agentPanel.append(createEmptyPanel(t("noSubagents")));
  }

  const activityPanel = document.createElement("section");
  activityPanel.className = "session-panel";
  const activityTitle = document.createElement("h4");
  activityTitle.textContent = t("recentActivity");
  activityPanel.append(activityTitle);

  if (session.recentActivities.length) {
    const list = document.createElement("ol");
    list.className = "activity-list";
    session.recentActivities.slice(0, 6).forEach((activity) => {
      list.append(createActivityItem(activity));
    });
    activityPanel.append(list);
  } else {
    activityPanel.append(createEmptyPanel(t("noRecentActivity")));
  }

  panels.append(agentPanel, activityPanel);
  article.append(cardHeader, panels);
  listItem.append(article);
  return listItem;
}

function sessionMatchesQuery(session, query) {
  if (!query) {
    return true;
  }

  const searchableValues = [
    session.sessionId,
    session.workspaceLabel,
    session.taskSummary,
    session.status,
    ...session.agents.flatMap((agent) => [
      agent.agentId,
      formatAgentRole(agent.agentType),
      agent.status,
    ]),
    ...session.recentActivities.flatMap((activity) => [
      activity.eventName,
      activity.toolName,
      activity.status,
    ]),
  ];

  return searchableValues.some((value) => value.toLocaleLowerCase().includes(query));
}

function sessionMatchesStatus(session, status) {
  return (
    status === "all" ||
    session.status === status ||
    session.agents.some((agent) => agent.status === status)
  );
}

function observableSessions() {
  return viewState.sessions.filter((session) => session.sessionId !== excludedSessionId);
}

function filteredSessions() {
  const query = elements.search.value.trim().toLocaleLowerCase();
  const status = elements.statusFilter.value;

  return observableSessions()
    .filter((session) => sessionMatchesQuery(session, query))
    .filter((session) => sessionMatchesStatus(session, status))
    .sort(compareSessions);
}

function renderMetrics() {
  const sessions = observableSessions();
  const agents = sessions.flatMap((session) => session.agents);
  const countStatus = (status) => agents.filter((agent) => agent.status === status).length;

  elements.metricSessions.textContent = String(sessions.length);
  elements.metricRunning.textContent = String(countStatus("running"));
  const waitingCount = countStatus("waiting") + sessions.filter(
    (session) => session.status === "waiting",
  ).length;
  elements.metricWaiting.textContent = String(waitingCount);
  elements.metricCompleted.textContent = String(countStatus("completed"));
  elements.lastUpdated.textContent = !viewState.updatedAtMs
    ? t("noReceivedActivity")
    : formatDateTime(viewState.updatedAtMs);
}

function setStateMessage(kind, title, description, retryMode = "") {
  elements.stateMessage.className = `state-message state-${kind}`;
  elements.stateMessage.replaceChildren();

  const heading = document.createElement("strong");
  heading.textContent = title;
  const copy = document.createElement("span");
  copy.textContent = description;
  elements.stateMessage.append(heading, copy);

  if (retryMode === "authentication") {
    const recovery = document.createElement("div");
    recovery.className = "recovery-guidance";

    const recoveryTitle = document.createElement("strong");
    recoveryTitle.textContent = t("recoveryTitle");
    const recoveryStep = document.createElement("p");
    recoveryStep.textContent = t("recoveryStep");
    const recoveryNote = document.createElement("p");
    recoveryNote.className = "recovery-note";
    recoveryNote.textContent = t("recoveryNote");
    recovery.append(recoveryTitle, recoveryStep, recoveryNote);
    elements.stateMessage.append(recovery);
  }

  if (retryMode) {
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "retry-button";
    retry.textContent = retryMode === "authentication"
      ? (accessToken ? t("retryAuthentication") : t("checkAuthentication"))
      : t("retry");
    retry.addEventListener(
      "click",
      retryMode === "authentication" ? retryAuthentication : refreshState,
    );
    elements.stateMessage.append(retry);
  }
}

function retryAuthentication() {
  const refreshedContext = consumeLiveContext();
  accessToken = refreshedContext.accessToken;
  excludedSessionId = refreshedContext.excludedSessionId;

  if (!accessToken) {
    viewState.hasLoaded = true;
    viewState.canRetry = false;
    viewState.authenticationFailed = true;
    viewState.errorKey = "missingToken";
    viewState.errorMessage = t(viewState.errorKey);
    setConnectionStatus("error", t("authenticationRequired"));
    render();
    return;
  }

  viewState.authenticationFailed = false;
  viewState.canRetry = true;
  viewState.errorKey = "";
  viewState.errorMessage = "";
  setConnectionStatus("connecting");
  render();
  void refreshState();
}

function setEmptyObservationMessage() {
  elements.stateMessage.className = "state-message state-empty state-empty-observation";
  elements.stateMessage.replaceChildren();

  const heading = document.createElement("strong");
  const copy = document.createElement("span");

  if (viewState.diagnostics.length) {
    heading.textContent = t("emptyWithDiagnosticsTitle");
    copy.textContent = t("emptyWithDiagnosticsCopy", { count: viewState.diagnostics.length });
  } else {
    heading.textContent = t("emptyTitle");
    copy.textContent = t("emptyCopy");
  }

  const guidance = document.createElement("div");
  guidance.className = "empty-guidance";

  const guidanceTitle = document.createElement("h3");
  guidanceTitle.textContent = t("emptyGuidanceTitle");

  const automaticTracking = document.createElement("p");
  automaticTracking.className = "automatic-tracking";
  automaticTracking.textContent = t("automaticTracking");

  const steps = document.createElement("ol");
  for (const step of [t("emptyStep1"), t("emptyStep2"), t("emptyStep3")]) {
    const item = document.createElement("li");
    item.textContent = step;
    steps.append(item);
  }

  const boundary = document.createElement("p");
  boundary.className = "observation-boundary";
  boundary.textContent = t("observationBoundary");

  guidance.append(guidanceTitle, automaticTracking, steps, boundary);

  if (viewState.diagnostics.length) {
    const diagnostics = document.createElement("div");
    diagnostics.className = "diagnostic-info";
    const diagnosticsTitle = document.createElement("p");
    diagnosticsTitle.className = "diagnostic-info-title";
    diagnosticsTitle.textContent = t("diagnosticsCount", { count: viewState.diagnostics.length });
    const codes = document.createElement("ul");
    const diagnosticCounts = new Map();
    for (const { code } of viewState.diagnostics) {
      diagnosticCounts.set(code, (diagnosticCounts.get(code) ?? 0) + 1);
    }
    for (const [diagnosticCode, count] of diagnosticCounts) {
      const item = document.createElement("li");
      const code = document.createElement("code");
      code.textContent = diagnosticCode;
      item.append(code, ` · ${t("diagnosticOccurrences", { count })}`);
      codes.append(item);
    }
    diagnostics.append(diagnosticsTitle, codes);
    guidance.append(diagnostics);
  }

  elements.stateMessage.append(heading, copy, guidance);
}

function renderSessions() {
  const sessions = observableSessions();
  const visibleSessions = filteredSessions();
  const hasFilters = elements.search.value.trim() || elements.statusFilter.value !== "all";

  elements.toolbar.hidden = sessions.length === 0;
  elements.stateMessage.hidden = false;

  elements.sessionList.replaceChildren();
  visibleSessions.forEach((session) => {
    elements.sessionList.append(createSessionCard(session));
  });

  elements.resultsSummary.textContent = hasFilters
    ? t("resultsFiltered", { total: sessions.length, visible: visibleSessions.length })
    : t("resultsTotal", { count: sessions.length });

  if (!viewState.hasLoaded) {
    elements.sessionList.hidden = true;
    setStateMessage("loading", t("loadingState"), t("connectingCopy"));
    return;
  }

  if (viewState.errorMessage) {
    elements.sessionList.hidden = !visibleSessions.length;
    const description = viewState.canRetry
      ? sessions.length
        ? t("retryWithState")
        : t("retryWithoutState")
      : viewState.errorKey ? t(viewState.errorKey) : viewState.errorMessage;
    setStateMessage(
      "error",
      viewState.canRetry
        ? t("disconnectedTitle")
        : t("authTitle"),
      description,
      viewState.canRetry ? "connection" : "authentication",
    );
    return;
  }

  if (!sessions.length) {
    elements.sessionList.hidden = true;
    setEmptyObservationMessage();
    return;
  }

  if (!visibleSessions.length) {
    elements.sessionList.hidden = true;
    setStateMessage(
      "empty",
      t("searchEmptyTitle"),
      t("searchEmptyCopy"),
    );
    return;
  }

  elements.stateMessage.hidden = true;
  elements.sessionList.hidden = false;
}

function render() {
  elements.stateMessage.hidden = false;
  renderMetrics();
  renderSessions();
}

function setConnectionStatus(status, labelOverride = "") {
  elements.connectionStatus.dataset.status = status;
  const labels = {
    connecting: t("connectionConnecting"),
    connected: t("connectionConnected"),
    error: t("connectionRetrying"),
  };
  elements.connectionLabel.textContent = labelOverride || labels[status];
}

async function refreshState() {
  if (viewState.requestInFlight || viewState.authenticationFailed) {
    return;
  }

  if (!accessToken) {
    viewState.hasLoaded = true;
    viewState.canRetry = false;
    viewState.authenticationFailed = true;
    viewState.errorKey = "missingToken";
    viewState.errorMessage = t(viewState.errorKey);
    setConnectionStatus("error", t("authenticationRequired"));
    render();
    return;
  }

  viewState.requestInFlight = true;
  if (!viewState.hasLoaded) {
    setConnectionStatus("connecting");
  }

  try {
    const response = await fetch(API_STATE_URL, {
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      await response.body?.cancel();
      viewState.hasLoaded = true;
      viewState.canRetry = false;
      viewState.authenticationFailed = true;
      viewState.errorKey = "expiredToken";
      viewState.errorMessage = t(viewState.errorKey);
      setConnectionStatus("error", t("authenticationRequired"));
      return;
    }

    if (!response.ok) {
      throw new Error(t("requestFailed", { status: response.status }));
    }

    const nextState = normalizeState(await response.json());
    viewState.updatedAtMs = nextState.updatedAtMs;
    viewState.sessions = nextState.sessions;
    viewState.diagnostics = nextState.diagnostics;
    viewState.hasLoaded = true;
    viewState.errorMessage = "";
    viewState.errorKey = "";
    viewState.canRetry = true;
    setConnectionStatus("connected");
  } catch (error) {
    viewState.hasLoaded = true;
    viewState.canRetry = true;
    viewState.errorMessage = error instanceof Error
      ? error.message
      : t("unknownConnectionError");
    viewState.errorKey = "";
    setConnectionStatus("error");
  } finally {
    viewState.requestInFlight = false;
    render();
  }
}

elements.search.addEventListener("input", renderSessions);
elements.statusFilter.addEventListener("change", renderSessions);
elements.language.addEventListener("change", (event) => setLanguage(event.target.value));
elements.toolbar.addEventListener("submit", (event) => {
  event.preventDefault();
});
window.addEventListener("online", refreshState);
window.addEventListener("offline", () => {
  if (viewState.authenticationFailed) {
    return;
  }
  viewState.canRetry = true;
  viewState.errorMessage = t("offline");
  viewState.errorKey = "offline";
  setConnectionStatus("error");
  render();
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    refreshState();
  }
});

applyStaticTranslations();
render();
refreshState();
if (accessToken) {
  window.setInterval(refreshState, POLL_INTERVAL_MS);
}
