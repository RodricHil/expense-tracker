/** Keep custom controls inside the viewport, including in scrollable dialogs. */
export function popoverPosition(rect: DOMRect, width: number, height: number, viewportWidth: number, viewportHeight: number) {
  const margin = 12;
  const actualWidth = Math.min(width, viewportWidth - margin * 2);
  const below = viewportHeight - rect.bottom - margin;
  const above = rect.top - margin;
  const openBelow = below >= height || below >= above;
  const maxHeight = Math.max(80, Math.min(height, openBelow ? below : above));
  return {
    position: "fixed" as const,
    left: Math.max(margin, Math.min(rect.left, viewportWidth - actualWidth - margin)),
    top: openBelow ? rect.bottom + 4 : Math.max(margin, rect.top - maxHeight - 4),
    width: actualWidth,
    maxHeight,
  };
}
