import { hexLines } from '../../utils/format';

export function HexView({ text }: { text: string }) {
  const lines = hexLines(text);
  return (
    <div className="hex-view">
      {lines.map((l) => (
        <div key={l.offset} className="hex-row">
          <span className="hex-offset">{l.offset}</span>
          <span className="hex-bytes">{l.hex.padEnd(47, ' ')}</span>
          <span className="hex-ascii">{l.ascii}</span>
        </div>
      ))}
    </div>
  );
}
