/**
 * 仅用于界面展示的静态数据。接入后端后删除本文件，改由 api/ 层提供。
 */
import type {
  ActionDoc,
  BreakpointRule,
  CAInfo,
  ComposeHistoryItem,
  Device,
  LanAddress,
  MockScript,
  ParsedRule,
  PausedItem,
  PinnedHost,
  RuleDiagnostic,
  RuleGroup,
  Settings,
  SslProxyingConfig,
  ThrottleProfile,
  ValueItem,
} from '../types';

const now = Date.now();

/* ---------------- 规则 ---------------- */

export const mockRuleGroups: RuleGroup[] = [
  {
    id: 'g1',
    name: '联调环境',
    enabled: true,
    updatedAt: now - 1000 * 60 * 12,
    ruleCount: 7,
    errorCount: 0,
    content: `# 线上接口转发到本地服务（路径后缀自动拼接）
www.example.com              host://127.0.0.1:8080
api.example.com/v1/order/    http://localhost:3000/api/order/

# Mock
api.example.com/v1/user/info file://D:/mock/user.json
api.example.com/v1/user/info mock://{userInfo}
/api\\.example\\.com\\/v1\\/order\\/(\\d+)$/  script://order.js

# 只对某台手机生效
api.example.com/v1/feed      mock://{emptyFeed}   clientIp=192.168.1.42
`,
  },
  {
    id: 'g2',
    name: '异常模拟',
    enabled: true,
    updatedAt: now - 1000 * 60 * 60 * 3,
    ruleCount: 4,
    errorCount: 1,
    content: `# 支付接口 500 + 2 秒延迟
api.example.com/v1/pay       statusCode://500 delay://2000

# 弱网
cdn.example.com              throttle://50kb
ads.example.org              block://
api.example.com/v1/cart      statuscode://abc
`,
  },
  {
    id: 'g3',
    name: '通用',
    enabled: true,
    updatedAt: now - 1000 * 60 * 60 * 26,
    ruleCount: 2,
    errorCount: 0,
    content: `# 跨域
*.example.com                resHeaders://{cors}
*.example.com                reqHeaders://{debugHeaders}  method=POST
`,
  },
  {
    id: 'g4',
    name: '预发环境（停用）',
    enabled: false,
    updatedAt: now - 1000 * 60 * 60 * 24 * 6,
    ruleCount: 1,
    errorCount: 0,
    content: `*.example.com host://10.0.12.8\n`,
  },
];

export const mockParsedRules: ParsedRule[] = [
  { id: 'r1', groupId: 'g1', line: 2, enabled: true, pattern: 'www.example.com', patternKind: 'domain', actions: [{ kind: 'host', value: '127.0.0.1:8080' }], filters: [], hitCount: 128 },
  { id: 'r2', groupId: 'g1', line: 3, enabled: true, pattern: 'api.example.com/v1/order/', patternKind: 'prefix', actions: [{ kind: 'mapRemote', value: 'http://localhost:3000/api/order/' }], filters: [], hitCount: 42 },
  { id: 'r3', groupId: 'g1', line: 6, enabled: true, pattern: 'api.example.com/v1/user/info', patternKind: 'prefix', actions: [{ kind: 'file', value: 'D:/mock/user.json' }], filters: [], hitCount: 17 },
  { id: 'r4', groupId: 'g1', line: 7, enabled: false, pattern: 'api.example.com/v1/user/info', patternKind: 'prefix', actions: [{ kind: 'mock', value: '{userInfo}' }], filters: [], hitCount: 0 },
  { id: 'r5', groupId: 'g1', line: 8, enabled: true, pattern: '/api\\.example\\.com\\/v1\\/order\\/(\\d+)$/', patternKind: 'regex', actions: [{ kind: 'script', value: 'order.js' }], filters: [], hitCount: 9 },
  { id: 'r6', groupId: 'g1', line: 11, enabled: true, pattern: 'api.example.com/v1/feed', patternKind: 'prefix', actions: [{ kind: 'mock', value: '{emptyFeed}' }], filters: ['clientIp=192.168.1.42'], hitCount: 3 },
  { id: 'r7', groupId: 'g2', line: 2, enabled: true, pattern: 'api.example.com/v1/pay', patternKind: 'prefix', actions: [{ kind: 'statusCode', value: '500' }, { kind: 'delay', value: '2000' }], filters: [], hitCount: 6 },
];

export const mockDiagnostics: RuleDiagnostic[] = [
  { line: 7, col: 30, severity: 'error', message: '未知动作 "statuscode"，是否想写 "statusCode"？' },
];

export const actionDocs: ActionDoc[] = [
  { kind: 'host', phase: 'dial', syntax: 'host://ip[:port]', desc: '只改 DNS 解析结果，保留 Host 头与 SNI', example: 'www.a.com host://127.0.0.1:8080' },
  { kind: 'mapRemote', phase: 'request', syntax: 'http(s)://target', desc: '改写整个 URL，前缀匹配时自动拼接剩余路径', example: 'a.com/v1/ http://localhost:3000/' },
  { kind: 'file', phase: 'request', syntax: 'file://path', desc: 'Map Local：用本地文件/目录作为响应', example: 'a.com/cfg file://D:/mock/cfg.json' },
  { kind: 'mock', phase: 'request', syntax: 'mock://{value}', desc: '用 Values 中的内容直接响应', example: 'a.com/user mock://{user}' },
  { kind: 'script', phase: 'request', syntax: 'script://name.js', desc: 'JS 脚本动态生成响应，可用正则分组 $1', example: '/order\\/(\\d+)/ script://order.js' },
  { kind: 'reqHeaders', phase: 'request', syntax: 'reqHeaders://{value}', desc: '新增/覆盖请求头（值为空则删除）', example: 'a.com reqHeaders://{h}' },
  { kind: 'resHeaders', phase: 'response', syntax: 'resHeaders://{value}', desc: '新增/覆盖响应头', example: 'a.com resHeaders://{cors}' },
  { kind: 'reqBody', phase: 'request', syntax: 'reqBody://{value}', desc: '替换请求体', example: 'a.com/login reqBody://{b}' },
  { kind: 'resBody', phase: 'response', syntax: 'resBody://{value}', desc: '替换响应体（仍会请求上游）', example: 'a.com/cfg resBody://{c}' },
  { kind: 'statusCode', phase: 'response', syntax: 'statusCode://code', desc: '修改响应状态码', example: 'a.com/pay statusCode://500' },
  { kind: 'delay', phase: 'request', syntax: 'delay://ms', desc: '延迟发出请求', example: 'a.com delay://2000' },
  { kind: 'throttle', phase: 'response', syntax: 'throttle://50kb', desc: '对响应限速', example: 'cdn.a.com throttle://50kb' },
  { kind: 'block', phase: 'request', syntax: 'block://', desc: '直接断开连接', example: 'ads.a.com block://' },
  { kind: 'cors', phase: 'response', syntax: 'cors://', desc: '自动处理预检并补齐 CORS 头', example: 'api.a.com cors://' },
];

/* ---------------- Values / Scripts ---------------- */

export const mockValues: ValueItem[] = [
  {
    key: 'userInfo',
    type: 'json',
    updatedAt: now - 1000 * 60 * 30,
    usedBy: ['联调环境:7'],
    content: JSON.stringify({ code: 0, data: { uid: 1, nickname: 'mock-user', vip: { level: 9 } } }, null, 2),
  },
  { key: 'emptyFeed', type: 'json', updatedAt: now - 1000 * 60 * 90, usedBy: ['联调环境:11'], content: '{\n  "code": 0,\n  "data": { "list": [], "hasMore": false }\n}' },
  {
    key: 'cors',
    type: 'headers',
    updatedAt: now - 1000 * 60 * 60 * 30,
    usedBy: ['通用:2'],
    content: 'access-control-allow-origin: *\naccess-control-allow-credentials: true\naccess-control-allow-headers: *',
  },
  { key: 'debugHeaders', type: 'headers', updatedAt: now - 1000 * 60 * 60 * 50, usedBy: ['通用:3'], content: 'x-debug: 1\nx-env: local' },
  { key: 'maintenance', type: 'html', updatedAt: now - 1000 * 60 * 60 * 24 * 3, usedBy: [], content: '<h1>系统维护中</h1>\n<p>请稍后再试</p>' },
];

export const mockScripts: MockScript[] = [
  {
    name: 'order.js',
    updatedAt: now - 1000 * 60 * 20,
    usedBy: ['联调环境:8'],
    content: `/**
 * @param {Request} req  { method, url, path, query, headers, body, json }
 * @param {Context} ctx  { match: RegExpMatchArray, clientIp, values }
 * @returns {MockResponse | undefined}  返回 undefined 则继续请求上游
 */
exports.handle = (req, ctx) => {
  const id = ctx.match[1];

  if (id === '0') {
    return { status: 404, body: { code: 404, message: 'order not found' } };
  }

  return {
    status: 200,
    headers: { 'content-type': 'application/json' },
    delay: 300,
    body: {
      code: 0,
      data: {
        id,
        amount: Math.round(Math.random() * 10000) / 100,
        status: ['CREATED', 'PAID', 'SHIPPED'][id % 3],
        uid: req.query.uid ?? null,
      },
    },
  };
};
`,
  },
  {
    name: 'pagination.js',
    updatedAt: now - 1000 * 60 * 60 * 5,
    usedBy: [],
    content: `exports.handle = (req) => {
  const page = Number(req.query.page ?? 1);
  const size = 20;
  const list = Array.from({ length: size }, (_, i) => ({ id: (page - 1) * size + i + 1 }));
  return { status: 200, body: { list, page, hasMore: page < 5 } };
};
`,
  },
  { name: 'sign-check.js', updatedAt: now - 1000 * 60 * 60 * 72, usedBy: [], content: `exports.handle = (req, ctx) => {\n  console.log('sign', req.headers['x-sign']);\n  return undefined; // 放行\n};\n` },
];

/* ---------------- 断点 / 重放 / 限速 ---------------- */

export const mockBreakpoints: BreakpointRule[] = [
  { id: 'b1', enabled: true, pattern: 'api.example.com/v1/upload/*', method: 'POST', request: true, response: false, hitCount: 3 },
  { id: 'b2', enabled: true, pattern: 'api.example.com/v1/pay/*', method: '*', request: false, response: true, hitCount: 1 },
  { id: 'b3', enabled: false, pattern: '*.example.com/graphql', method: 'POST', request: true, response: true, hitCount: 0 },
];

export const mockPaused: PausedItem[] = [
  {
    id: 'p1',
    sessionId: 23,
    phase: 'request',
    method: 'POST',
    url: 'https://api.example.com/v1/upload/avatar',
    clientIp: '192.168.1.57',
    device: 'Pixel 9',
    pausedAt: now - 1000 * 14,
    headers: [
      { name: 'content-type', value: 'application/json' },
      { name: 'authorization', value: 'Bearer eyJhbGciOi…' },
      { name: 'x-request-id', value: '5b8e2c1a' },
    ],
    body: '{\n  "fileId": "f_20260930_8812",\n  "crop": { "x": 0, "y": 0, "w": 512, "h": 512 }\n}',
  },
  {
    id: 'p2',
    sessionId: 10,
    phase: 'response',
    method: 'POST',
    url: 'https://api.example.com/v1/pay/submit',
    clientIp: '192.168.1.42',
    device: 'iPhone 16',
    pausedAt: now - 1000 * 3,
    status: 200,
    headers: [{ name: 'content-type', value: 'application/json' }],
    body: '{\n  "code": 0,\n  "data": { "payId": "P88120", "status": "SUCCESS" }\n}',
  },
];

export const mockComposeHistory: ComposeHistoryItem[] = [
  { id: 'c1', method: 'POST', url: 'https://api.example.com/v1/order/create', status: 201, duration: 212, at: now - 1000 * 60 * 2 },
  { id: 'c2', method: 'GET', url: 'https://api.example.com/v1/user/info', status: 200, duration: 14, at: now - 1000 * 60 * 9 },
  { id: 'c3', method: 'GET', url: 'http://localhost:3000/api/debug/health', status: 200, duration: 3, at: now - 1000 * 60 * 40 },
  { id: 'c4', method: 'DELETE', url: 'https://api.example.com/v1/cart/items/8812', status: 404, duration: 61, at: now - 1000 * 60 * 60 * 2 },
];

export const throttleProfiles: ThrottleProfile[] = [
  { id: 'gprs', name: 'GPRS', down: 50, up: 20, latency: 500, loss: 0, builtin: true },
  { id: '2g', name: '2G / EDGE', down: 250, up: 50, latency: 300, loss: 0, builtin: true },
  { id: '3g', name: '3G', down: 780, up: 330, latency: 100, loss: 0, builtin: true },
  { id: '4g', name: '4G', down: 4000, up: 3000, latency: 20, loss: 0, builtin: true },
  { id: 'wifi-bad', name: '弱 Wi-Fi', down: 1000, up: 500, latency: 80, loss: 2, builtin: true },
  { id: 'custom', name: '自定义', down: 512, up: 128, latency: 200, loss: 1 },
];

/* ---------------- 设备 / 证书 / 设置 ---------------- */

export const mockLanAddresses: LanAddress[] = [
  { iface: 'Wi-Fi', ip: '192.168.1.23', primary: true },
  { iface: 'Ethernet', ip: '10.0.8.51' },
  { iface: 'vEthernet (WSL)', ip: '172.28.160.1' },
];

export const mockDevices: Device[] = [
  { ip: '127.0.0.1', name: '本机', userAgent: 'Chrome/141.0 Windows NT 10.0', platform: 'windows', status: 'allowed', firstSeen: now - 1000 * 60 * 60 * 5, lastSeen: now - 1000 * 2, requests: 1288, bytes: 48_203_112, isLocal: true },
  { ip: '192.168.1.42', name: 'iPhone 16', userAgent: 'iOS 26.0 CFNetwork/3860', platform: 'ios', status: 'allowed', firstSeen: now - 1000 * 60 * 60 * 2, lastSeen: now - 1000 * 5, requests: 642, bytes: 21_402_010 },
  { ip: '192.168.1.57', name: 'Pixel 9', userAgent: 'okhttp/4.12.0 Android 16', platform: 'android', status: 'allowed', firstSeen: now - 1000 * 60 * 40, lastSeen: now - 1000 * 20, requests: 318, bytes: 8_120_443 },
  { ip: '192.168.1.88', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0)', platform: 'macos', status: 'pending', firstSeen: now - 1000 * 8, lastSeen: now - 1000 * 8, requests: 0, bytes: 0 },
  { ip: '192.168.1.103', userAgent: 'curl/8.10.1', platform: 'linux', status: 'blocked', firstSeen: now - 1000 * 60 * 60 * 20, lastSeen: now - 1000 * 60 * 60 * 19, requests: 4, bytes: 2_210 },
];

export const mockWhitelist = ['127.0.0.1/32', '192.168.1.0/24'];

export const mockCA: CAInfo = {
  subject: 'CN=Charstle Root CA, O=Charstle, OU=Local Debug',
  keyType: 'ECDSA P-256',
  sha256: '3A:9F:1C:D2:77:0B:E4:5A:C8:11:6E:93:4B:F0:2D:A7:5C:18:E9:60:B3:4D:7A:0F:C2:95:1E:68:DB:03:8A:4F',
  notBefore: '2026-09-01',
  notAfter: '2036-09-01',
  path: 'C:\\Users\\me\\.charstle\\ca\\charstle-ca.pem',
  installedOnHost: true,
};

export const mockSslProxying: SslProxyingConfig = {
  enabled: true,
  include: ['*.example.com:443', 'localhost:*', '*.example.net'],
  exclude: ['*.apple.com', '*.icloud.com', 'accounts.google.com'],
};

export const mockPinnedHosts: PinnedHost[] = [
  { host: 'apple.com:443', reason: 'client rejected certificate (bad_certificate)', failures: 6, since: now - 1000 * 60 * 18, clientIp: '192.168.1.42' },
  { host: 'api.bank.example:443', reason: 'client closed connection during handshake', failures: 3, since: now - 1000 * 60 * 44, clientIp: '192.168.1.57' },
];

export const mockSettings: Settings = {
  proxyPort: 8888,
  listenAddr: '0.0.0.0',
  adminPort: 8899,
  adminLanAccess: false,
  adminPassword: '',
  maxSessions: 10000,
  maxMemoryMB: 500,
  bodyCaptureLimitKB: 10240,
  spillDir: 'C:\\Users\\me\\.charstle\\tmp',
  recordTunnels: true,
  http2: true,
  captureWebSocket: true,
  decodeBody: true,
  upstreamProxy: '',
  upstreamBypass: 'localhost, 127.0.0.1, 10.*',
  dnsServers: '',
  useHostsFile: true,
  systemProxyBypass: 'localhost;127.*;10.*;192.168.*;<local>',
};

export const appInfo = {
  version: '0.1.0',
  build: 'dev',
  dataDir: 'C:\\Users\\me\\.charstle',
  sessions: 1284,
  memoryMB: 86.4,
};
