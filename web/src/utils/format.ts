export function formatBytes(n: number | undefined): string {
  if (n == null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function formatMs(n: number | undefined): string {
  if (n == null) return '—';
  if (n < 1000) return `${Math.round(n)} ms`;
  return `${(n / 1000).toFixed(2)} s`;
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  const p = (x: number, l = 2) => String(x).padStart(l, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

export function formatRelative(ts: number, now = Date.now()): string {
  const s = Math.round((now - ts) / 1000);
  if (s < 60) return `${s} 秒前`;
  if (s < 3600) return `${Math.round(s / 60)} 分钟前`;
  if (s < 86400) return `${Math.round(s / 3600)} 小时前`;
  return `${Math.round(s / 86400)} 天前`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function statusClass(status: number | undefined, state?: string): string {
  if (state === 'error' || state === 'aborted') return 'status-err';
  if (!status) return 'status-pending';
  return `status-${Math.floor(status / 100)}xx`;
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/** 生成十六进制视图的行 */
export function hexLines(text: string, width = 16): { offset: string; hex: string; ascii: string }[] {
  const bytes = new TextEncoder().encode(text);
  const lines: { offset: string; hex: string; ascii: string }[] = [];
  for (let i = 0; i < bytes.length; i += width) {
    const chunk = bytes.slice(i, i + width);
    const hex = Array.from(chunk, (b) => b.toString(16).padStart(2, '0')).join(' ');
    const ascii = Array.from(chunk, (b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('');
    lines.push({ offset: i.toString(16).padStart(8, '0'), hex, ascii });
  }
  return lines;
}
