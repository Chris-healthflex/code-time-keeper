import { memo, useMemo } from "react";

// ── 5×7 bitmap font ──────────────────────────────────────────────────────────

function glyphBitmap(ch: string, cols: number, rows: number): boolean[][] {
  const glyphs: Record<string, number[]> = {
    "0": [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
    "1": [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
    "2": [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111],
    "3": [0b01110, 0b10001, 0b00001, 0b00110, 0b00001, 0b10001, 0b01110],
    "4": [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
    "5": [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
    "6": [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
    "7": [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
    "8": [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
    "9": [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
    ":": [0b00000, 0b00100, 0b00000, 0b00000, 0b00000, 0b00100, 0b00000],
    " ": [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000],
    "A": [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
    "B": [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
    "C": [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
    "D": [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
    "E": [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
    "G": [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110],
    "H": [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
    "I": [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
    "M": [0b10001, 0b11011, 0b10101, 0b10001, 0b10001, 0b10001, 0b10001],
    "N": [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
    "O": [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
    "P": [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
    "S": [0b01110, 0b10001, 0b10000, 0b01110, 0b00001, 0b10001, 0b01110],
    "T": [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
    "U": [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  };

  const grid = Array.from({ length: rows }, () => Array(cols).fill(false));
  const chars = ch.toUpperCase().split("");
  const gw = 5;
  const gh = 7;
  const totalW = chars.length * (gw + 1) - 1;
  let ox = Math.max(0, Math.floor((cols - totalW) / 2));
  const oy = Math.max(0, Math.floor((rows - gh) / 2));

  for (const c of chars) {
    const rowBits = glyphs[c] ?? glyphs[" "]!;
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        if (oy + y < rows && ox + x < cols) {
          grid[oy + y]![ox + x] = !!(rowBits[y]! & (1 << (gw - 1 - x)));
        }
      }
    }
    ox += gw + 1;
  }
  return grid;
}

// ── Single flip disk ──────────────────────────────────────────────────────────

const Disk = memo(({ on }: { on: boolean }) => (
  <div style={{ perspective: "400px", aspectRatio: "1", width: "100%", position: "relative" }}>
    <div
      style={{
        position: "absolute",
        inset: 0,
        transformStyle: "preserve-3d",
        transform: on ? "rotateX(180deg)" : "rotateX(0deg)",
        transition: "transform 550ms cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      {/* Off face */}
      <div
        style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          backfaceVisibility: "hidden",
          background: "#141414",
          border: "1px solid #2a2a2a",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.85)",
        }}
      />
      {/* On face */}
      <div
        style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          backfaceVisibility: "hidden",
          transform: "rotateX(180deg)",
          background: "#f0f0f0",
          border: "1px solid #d0d0d0",
          boxShadow: "inset 0 -2px 5px rgba(0,0,0,0.18)",
        }}
      />
    </div>
  </div>
));
Disk.displayName = "Disk";

// ── Public component ──────────────────────────────────────────────────────────

interface FlipDiskMatrixProps {
  /** Text to display — supports 0-9, A-Z, colon, space. Up to 5 chars fit in 31 cols. */
  display: string;
  cols?: number;
  rows?: number;
}

export function FlipDiskMatrix({ display, cols = 31, rows = 11 }: FlipDiskMatrixProps) {
  const bits = useMemo(() => glyphBitmap(display, cols, rows), [display, cols, rows]);

  return (
    <div
      style={{
        width: "100%",
        padding: 10,
        borderRadius: 14,
        background: "#080808",
        border: "1px solid #222",
        boxShadow: "inset 0 4px 24px rgba(0,0,0,0.95), 0 16px 40px rgba(0,0,0,0.6)",
      }}
    >
      <div
        style={{
          background: "#030303",
          borderRadius: 9,
          padding: "10px 12px",
          boxShadow: "inset 0 2px 12px rgba(0,0,0,1)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: "clamp(1px, 0.35vw, 3px)",
          }}
        >
          {bits.map((row, y) =>
            row.map((on, x) => <Disk key={`${x}-${y}`} on={on} />)
          )}
        </div>
      </div>
    </div>
  );
}
