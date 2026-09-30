/** 会话（一次 HTTP 事务 / 一个隧道 / 一条 WebSocket 连接） */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD' | 'CONNECT';

export type ResourceType = 'xhr' | 'doc' | 'js' | 'css' | 'img' | 'media' | 'font' | 'ws' | 'other';

/**
 * pending   等待响应
 * done      完成
 * error     失败（连接错误 / 超时 / TLS 失败）
 * tunnel    未解密的 CONNECT 隧道
 * paused    命中断点，等待用户操作
 * aborted   在断点处被中止
 */
export type SessionState = 'pending' | 'done' | 'error' | 'tunnel' | 'paused' | 'aborted';

export type Protocol = 'HTTP/1.1' | 'HTTP/2' | 'WebSocket' | 'TCP';

/** 列表里展示用的摘要（通过事件流批量推送） */
export interface SessionSummary {
  id: number;
  clientIp: string;
  method: HttpMethod;
  scheme: 'http' | 'https' | 'ws' | 'wss';
  host: string;
  path: string;
  proto: Protocol;
  status?: number;
  type: ResourceType;
  mime?: string;
  reqSize: number;
  resSize: number;
  /** 开始时间（epoch ms） */
  startedAt: number;
  /** 总耗时 ms */
  duration?: number;
  state: SessionState;
  /** 命中规则数 */
  hits: number;
  /** 是否由 Mock / Map Local 直接生成，未访问上游 */
  mocked?: boolean;
  /** 是否被 host / mapRemote 改写了目标 */
  remapped?: boolean;
  throttled?: boolean;
}

export interface Header {
  name: string;
  value: string;
  enabled?: boolean;
}

export type BodyKind = 'json' | 'text' | 'html' | 'xml' | 'form' | 'image' | 'binary' | 'none';

export interface BodyInfo {
  kind: BodyKind;
  mime: string;
  /** 传输字节数（压缩后） */
  size: number;
  /** 解码后字节数 */
  decodedSize?: number;
  encoding?: 'gzip' | 'br' | 'zstd' | 'deflate';
  /** 超过捕获上限被截断 */
  truncated?: boolean;
  text?: string;
  /** 图片等二进制的预览地址 */
  previewUrl?: string;
}

/** 各阶段耗时（ms），缺省表示复用连接或不适用 */
export interface Timing {
  blocked?: number;
  dns?: number;
  connect?: number;
  tls?: number;
  send?: number;
  wait?: number;
  receive?: number;
}

export interface TlsInfo {
  version: string;
  cipher: string;
  sni: string;
  alpn: string;
  /** 是否被 MITM 解密 */
  intercepted: boolean;
  serverCert?: { subject: string; issuer: string; notAfter: string };
}

export interface RuleHit {
  ruleId: string;
  group: string;
  line: number;
  pattern: string;
  action: string;
  value: string;
  phase: 'request' | 'dial' | 'response';
}

export interface WsFrame {
  id: number;
  dir: 'out' | 'in';
  opcode: 'text' | 'binary' | 'ping' | 'pong' | 'close';
  size: number;
  time: number;
  data: string;
}

export interface SessionDetail extends SessionSummary {
  url: string;
  httpVersion: string;
  remoteAddr?: string;
  /** host / mapRemote 改写后的实际目标 */
  finalUrl?: string;
  reqHeaders: Header[];
  resHeaders: Header[];
  reqBody?: BodyInfo;
  resBody?: BodyInfo;
  statusText?: string;
  timing: Timing;
  tls?: TlsInfo;
  ruleHits: RuleHit[];
  frames?: WsFrame[];
  error?: string;
  device?: string;
}
