import { useEffect, useState } from "react";
import {
  Copy,
  Download,
  ImageIcon,
  TriangleAlert,
  WrapText,
} from "lucide-react";
import type { BodyInfo } from "../../../types";
import { Segmented } from "../../common/Controls";
import { CodeView, type CodeLang } from "../../common/CodeView";
import { JsonTree } from "../../common/JsonTree";
import { HexView } from "../../common/HexView";
import { cx, formatBytes } from "../../../utils/format";

import { api, download } from "../../../api/client";
import { perform, report } from "../../../store/data";
type Mode = "preview" | "pretty" | "raw" | "hex";

const langOf = (b: BodyInfo): CodeLang =>
  b.kind === "json"
    ? "json"
    : b.kind === "html" || b.kind === "xml"
      ? "html"
      : b.mime.includes("javascript")
        ? "javascript"
        : "text";

export function BodyViewer({
  body,
  id,
  kind,
}: {
  body: BodyInfo;
  id: number;
  kind: "req" | "res";
}) {
  const defaultMode: Mode =
    body.kind === "json" || body.kind === "image"
      ? "preview"
      : body.kind === "binary"
        ? "hex"
        : "pretty";
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [wrap, setWrap] = useState(false);
  const text = body.text ?? "";
  const [bytes, setBytes] = useState<Uint8Array>();
  useEffect(() => {
    let stale = false;
    if (mode === "hex")
      api
        .getBody(id, kind)
        .then((b) => b.arrayBuffer())
        .then((b) => {
          if (!stale) setBytes(new Uint8Array(b));
        })
        .catch(report);
    return () => {
      stale = true;
    };
  }, [id, kind, mode, body.size]);

  const modes: { value: Mode; label: string }[] = [
    ...(body.kind === "json" || body.kind === "image" || body.kind === "html"
      ? [{ value: "preview" as const, label: "预览" }]
      : []),
    ...(body.kind !== "image" && body.kind !== "binary"
      ? [{ value: "pretty" as const, label: "格式化" }]
      : []),
    ...(body.kind !== "image"
      ? [{ value: "raw" as const, label: "原文" }]
      : []),
    { value: "hex", label: "Hex" },
  ];

  return (
    <div className="body-viewer">
      <div className="body-toolbar">
        <Segmented value={mode} onChange={setMode} options={modes} />
        <span className="muted text-xs">
          {body.mime} · {formatBytes(body.size)}
          {body.encoding && ` · ${body.encoding}`}
          {body.decodedSize && ` → ${formatBytes(body.decodedSize)}`}
        </span>
        <div className="spacer" />
        <button
          className={cx("btn btn-ghost btn-icon btn-sm", wrap && "is-active")}
          data-tip="自动换行"
          onClick={() => setWrap((w) => !w)}
        >
          <WrapText size={14} />
        </button>
        <button
          className="btn btn-ghost btn-icon btn-sm"
          data-tip="复制"
          onClick={() =>
            void perform(() => navigator.clipboard.writeText(text), "已复制")
          }
        >
          <Copy size={14} />
        </button>
        <button
          className="btn btn-ghost btn-icon btn-sm"
          data-tip="保存到文件"
          onClick={() =>
            void perform(async () =>
              download(
                await api.getBody(id, kind, false),
                "charstle-" + id + "-" + kind + ".bin",
              ),
            )
          }
        >
          <Download size={14} />
        </button>
      </div>

      {body.truncated && (
        <div className="callout callout-warning body-callout">
          <TriangleAlert size={14} />
          Body 已截断；展示内容受捕获上限和预览大小限制。
        </div>
      )}

      <div className="body-content">
        {mode === "preview" && body.kind === "json" && (
          <div className="scroll fill">
            <JsonTree text={text} />
          </div>
        )}
        {mode === "preview" && body.kind === "image" && (
          <div className="image-preview">
            {body.previewUrl ? (
              <img src={body.previewUrl} alt="" />
            ) : (
              <div className="image-placeholder">
                <ImageIcon size={32} />
                <span>{body.mime}</span>
              </div>
            )}
            <div className="muted text-xs">{formatBytes(body.size)}</div>
          </div>
        )}
        {mode === "preview" && body.kind === "html" && (
          <iframe
            className="html-preview"
            sandbox=""
            srcDoc={
              "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'; img-src data:\">" +
              text
            }
            title="preview"
          />
        )}
        {mode === "pretty" && (
          <CodeView value={text} lang={langOf(body)} readOnly wrap={wrap} />
        )}
        {mode === "raw" && (
          <CodeView value={text} readOnly wrap={wrap} lineNumbers={false} />
        )}
        {mode === "hex" && (
          <div className="scroll fill">
            <HexView text={text} bytes={bytes} />
          </div>
        )}
      </div>
    </div>
  );
}
