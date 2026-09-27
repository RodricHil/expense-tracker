/** Position floating controls within the viewport and, when present, their dialog. */
export function popoverPosition(rect: DOMRect, width: number, height: number, viewportWidth: number, viewportHeight: number, boundary?: Pick<DOMRect, "left" | "right" | "top" | "bottom">) {
  const margin = 12;
  const gap = 4;
  const leftEdge = Math.max(0, boundary?.left ?? 0) + margin;
  const rightEdge = Math.min(viewportWidth, boundary?.right ?? viewportWidth) - margin;
  const topEdge = Math.max(0, boundary?.top ?? 0) + margin;
  const bottomEdge = Math.min(viewportHeight, boundary?.bottom ?? viewportHeight) - margin;
  const actualWidth = Math.max(0, Math.min(width, rightEdge - leftEdge));
  const below = Math.max(0, bottomEdge - rect.bottom - gap);
  const above = Math.max(0, rect.top - topEdge - gap);
  const openBelow = below >= height || below >= above;
  const maxHeight = Math.min(height, openBelow ? below : above);
  return {
    position: "fixed" as const,
    left: Math.max(leftEdge, Math.min(rect.left, rightEdge - actualWidth)),
    top: openBelow ? Math.min(rect.bottom + gap, bottomEdge) : Math.max(topEdge, rect.top - maxHeight - gap),
    width: actualWidth,
    maxHeight,
  };
}
