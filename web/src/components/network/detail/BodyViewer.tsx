import { useState } from 'react';
import { Copy, Download, ImageIcon, TriangleAlert, WrapText } from 'lucide-react';
import type { BodyInfo } from '../../../types';
import { Segmented } from '../../common/Controls';
import { CodeView, type CodeLang } from '../../common/CodeView';
import { JsonTree } from '../../common/JsonTree';
import { HexView } from '../../common/HexView';
import { cx, formatBytes } from '../../../utils/format';

type Mode = 'preview' | 'pretty' | 'raw' | 'hex';

const langOf = (b: BodyInfo): CodeLang =>
  b.kind === 'json' ? 'json' : b.kind === 'html' || b.kind === 'xml' ? 'html' : b.mime.includes('javascript') ? 'javascript' : 'text';

const minify = (text: string) => {
  try {
    return JSON.stringify(JSON.parse(text));
  } catch {
    return text;
  }
};

export function BodyViewer({ body }: { body: BodyInfo }) {
  const defaultMode: Mode = body.kind === 'json' || body.kind === 'image' ? 'preview' : body.kind === 'binary' ? 'hex' : 'pretty';
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [wrap, setWrap] = useState(false);
  const text = body.text ?? '';

  const modes: { value: Mode; label: string }[] = [
    ...(body.kind === 'json' || body.kind === 'image' || body.kind === 'html' ? [{ value: 'preview' as const, label: '预览' }] : []),
    ...(body.kind !== 'image' && body.kind !== 'binary' ? [{ value: 'pretty' as const, label: '格式化' }] : []),
    ...(body.kind !== 'image' ? [{ value: 'raw' as const, label: '原文' }] : []),
    { value: 'hex', label: 'Hex' },
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
        <button className={cx('btn btn-ghost btn-icon btn-sm', wrap && 'is-active')} data-tip="自动换行" onClick={() => setWrap((w) => !w)}>
          <WrapText size={14} />
        </button>
        <button className="btn btn-ghost btn-icon btn-sm" data-tip="复制">
          <Copy size={14} />
        </button>
        <button className="btn btn-ghost btn-icon btn-sm" data-tip="保存到文件">
          <Download size={14} />
        </button>
      </div>

      {body.truncated && (
        <div className="callout callout-warning body-callout">
          <TriangleAlert size={14} />
          Body 超过捕获上限，仅展示前 10 MB。可在「设置 → 抓包」调整上限。
        </div>
      )}

      <div className="body-content">
        {mode === 'preview' && body.kind === 'json' && (
          <div className="scroll fill">
            <JsonTree text={text} />
          </div>
        )}
        {mode === 'preview' && body.kind === 'image' && (
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
        {mode === 'preview' && body.kind === 'html' && (
          // TODO: 用 sandbox iframe 渲染（srcdoc），禁止脚本执行
          <iframe className="html-preview" sandbox="" srcDoc={text} title="preview" />
        )}
        {mode === 'pretty' && <CodeView value={text} lang={langOf(body)} readOnly wrap={wrap} />}
        {mode === 'raw' && <CodeView value={body.kind === 'json' ? minify(text) : text} readOnly wrap={wrap} lineNumbers={false} />}
        {mode === 'hex' && (
          <div className="scroll fill">
            <HexView text={text} />
          </div>
        )}
      </div>
    </div>
  );
}
