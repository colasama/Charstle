/** 规则分组：一个文本块，对应规则编辑器中的一个文件 */
export interface RuleGroup {
  id: string;
  name: string;
  enabled: boolean;
  content: string;
  updatedAt: number;
  /** 最近一次解析结果 */
  ruleCount: number;
  errorCount: number;
}

export type ActionKind =
  | 'host'
  | 'mapRemote'
  | 'file'
  | 'mock'
  | 'script'
  | 'reqHeaders'
  | 'resHeaders'
  | 'reqBody'
  | 'resBody'
  | 'statusCode'
  | 'delay'
  | 'throttle'
  | 'block'
  | 'cors';

export interface RuleAction {
  kind: ActionKind;
  value: string;
}

export type PatternKind = 'domain' | 'wildcard' | 'regex' | 'prefix';

/** 解析后的单条规则（表格模式用） */
export interface ParsedRule {
  id: string;
  groupId: string;
  line: number;
  enabled: boolean;
  pattern: string;
  patternKind: PatternKind;
  actions: RuleAction[];
  filters: string[];
  hitCount: number;
}

export interface RuleDiagnostic {
  line: number;
  col: number;
  severity: 'error' | 'warning';
  message: string;
}

export type ValueType = 'json' | 'text' | 'headers' | 'html';

export interface ValueItem {
  key: string;
  type: ValueType;
  content: string;
  updatedAt: number;
  /** 被哪些规则引用（group:line） */
  usedBy: string[];
}

export interface MockScript {
  name: string;
  content: string;
  updatedAt: number;
  usedBy: string[];
}

export interface ScriptRunResult {
  ok: boolean;
  duration: number;
  status?: number;
  headers?: Record<string, string>;
  body?: string;
  logs: { level: 'log' | 'warn' | 'error'; text: string }[];
  error?: string;
}

/** 规则动作说明（速查表） */
export interface ActionDoc {
  kind: ActionKind;
  phase: 'request' | 'dial' | 'response';
  syntax: string;
  desc: string;
  example: string;
}
