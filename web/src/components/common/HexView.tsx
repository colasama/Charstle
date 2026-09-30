import { hexLines } from "../../utils/format";

export function HexView({ text, bytes }: { text: string; bytes?: Uint8Array }) {
  const lines = bytes
    ? Array.from(
        { length: Math.ceil(Math.min(bytes.length, 65536) / 16) },
        (_, i) => {
          const b = [...bytes.slice(i * 16, i * 16 + 16)];
          return {
            offset: (i * 16).toString(16).padStart(8, "0"),
            hex: b.map((v) => v.toString(16).padStart(2, "0")).join(" "),
            ascii: b
              .map((v) => (v >= 32 && v <= 126 ? String.fromCharCode(v) : "."))
              .join(""),
          };
        },
      )
    : hexLines(text);
  return (
    <div className="hex-view">
      {lines.map((l) => (
        <div key={l.offset} className="hex-row">
          <span className="hex-offset">{l.offset}</span>
          <span className="hex-bytes">{l.hex.padEnd(47, " ")}</span>
          <span className="hex-ascii">{l.ascii}</span>
        </div>
      ))}
    </div>
  );
}
