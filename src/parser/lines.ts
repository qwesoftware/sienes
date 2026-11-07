// Turns positioned text items (as PDF.js returns them) into lines. Items on
// the same baseline, within a small tolerance, form one line; segments keep
// their x so column layout (left header text, right-aligned author) survives.

export type PositionedItem = { str: string; x: number; y: number; width: number; height: number };

export type Segment = { x: number; width: number; text: string };
export type Line = { y: number; segments: Segment[]; text: string };
export type PageLines = { page: number; width: number; height: number; lines: Line[] };

const Y_TOLERANCE = 2.5;

export function groupIntoLines(items: PositionedItem[]): Line[] {
  const sorted = items.filter((i) => i.str.trim().length > 0).sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: { y: number; items: PositionedItem[] }[] = [];
  for (const item of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - item.y) <= Y_TOLERANCE) last.items.push(item);
    else lines.push({ y: item.y, items: [item] });
  }
  return lines.map(({ y, items: lineItems }) => {
    lineItems.sort((a, b) => a.x - b.x);
    const segments: Segment[] = [];
    for (const item of lineItems) {
      const last = segments[segments.length - 1];
      const gap = last ? item.x - (last.x + last.width) : Infinity;
      // Adjacent items (gap under about one character) belong to the same segment.
      if (last && gap < item.height * 0.6) {
        last.text += (gap > item.height * 0.15 && !last.text.endsWith(" ") && !item.str.startsWith(" ") ? " " : "") + item.str;
        last.width = item.x + item.width - last.x;
      } else {
        segments.push({ x: item.x, width: item.width, text: item.str });
      }
    }
    for (const s of segments) s.text = s.text.replace(/\s+/g, " ").trim();
    return { y, segments: segments.filter((s) => s.text.length > 0), text: segments.map((s) => s.text).join("  ") };
  });
}
