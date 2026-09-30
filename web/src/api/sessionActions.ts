import { api, download } from "./client";
import { perform, useData } from "../store/data";
import type { SessionSummary } from "../types";
export const sessionURL = (s: SessionSummary) =>
  s.scheme + "://" + s.host + s.path;
export async function addRule(pattern: string, action: string) {
  let g = useData.getState().groups[0];
  if (!g) g = await api.createRuleGroup("快速规则");
  const current = (await api.listRuleGroups()).find((x) => x.id === g.id) ?? g;
  await api.saveRuleGroup({
    ...current,
    content: current.content + "\n" + pattern + " " + action + "\n",
  });
}
export function sessionAction(
  kind: string,
  s: SessionSummary,
  navigate: (path: string, options?: { state?: unknown }) => void,
) {
  return perform(async () => {
    switch (kind) {
      case "url":
        await navigator.clipboard.writeText(sessionURL(s));
        break;
      case "curl":
        await navigator.clipboard.writeText(await api.copyAsCurl(s.id));
        break;
      case "replay":
        await api.replay(s.id);
        break;
      case "compose":
        navigate("/compose", { state: await api.getSession(s.id) });
        break;
      case "breakpoint":
        await api.saveBreakpoints([
          ...(await api.listBreakpoints()),
          {
            id: crypto.randomUUID(),
            enabled: true,
            pattern: s.host + s.path,
            method: s.method,
            request: true,
            response: false,
            hitCount: 0,
          },
        ]);
        navigate("/breakpoints");
        break;
      case "file": {
        const path = prompt("本地文件或目录路径");
        if (path) await addRule(s.host + s.path, "file://" + path);
        break;
      }
      case "remote": {
        const url = prompt("目标 HTTP(S) URL");
        if (url) await addRule(s.host + s.path, "mapRemote://" + url);
        break;
      }
      case "mock": {
        const detail = await api.getSession(s.id);
        if (!detail.resBody?.text || detail.resBody.truncated)
          throw Error("需要完整的文本响应才能创建 Mock");
        const key = "session-" + s.id;
        await api.saveValue({
          key,
          type: detail.resBody.kind === "json" ? "json" : "text",
          content: detail.resBody.text,
        });
        await addRule(s.host + s.path, "mock://{" + key + "}");
        break;
      }
      case "rules":
        navigate("/rules");
        break;
      case "block":
        await addRule(s.host, "block://");
        break;
      case "ssl": {
        const ssl = await api.getSslProxying();
        await api.saveSslProxying({
          ...ssl,
          exclude: [...new Set([...ssl.exclude, s.host])],
        });
        break;
      }
      case "har":
        download(await api.exportHar([s.id]), "charstle-" + s.id + ".har");
        break;
      case "delete":
        await api.deleteSession(s.id);
        break;
    }
  });
}
