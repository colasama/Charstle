import type { SessionSummary } from "../types";
import type { NetworkFilter } from "../store/ui";
export function matchesFilter(s: SessionSummary, f: NetworkFilter) {
  if (
    (f.types.length && !f.types.includes(s.type)) ||
    (f.clientIp && s.clientIp !== f.clientIp) ||
    (f.onlyMatched && !s.hits) ||
    (f.hideTunnels && s.state === "tunnel")
  )
    return false;
  if (f.status === "error") {
    if (s.state !== "error" && s.state !== "aborted") return false;
  } else if (
    f.status !== "all" &&
    Math.floor((s.status ?? 0) / 100) !== Number(f.status[0])
  )
    return false;
  const url = s.scheme + "://" + s.host + s.path;
  const q = f.keyword.trim();
  if (q.startsWith("/") && q.endsWith("/")) {
    try {
      return new RegExp(q.slice(1, -1), "i").test(url);
    } catch {
      return false;
    }
  }
  return q.split(/\s+/).every((t) => {
    if (t.startsWith("host:")) return s.host.includes(t.slice(5));
    if (t.startsWith("method:")) return s.method === t.slice(7).toUpperCase();
    if (t.startsWith("status:")) {
      const n = t.slice(7);
      return n.endsWith("xx")
        ? String(s.status ?? "").startsWith(n[0])
        : String(s.status) === n;
    }
    return url.toLowerCase().includes(t.toLowerCase());
  });
}
