"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export default function Modal({ title, children, onClose, busy = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean }) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = useRef(onClose);
  const blocked = useRef(busy);
  useEffect(() => { close.current = onClose; blocked.current = busy; });
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !blocked.current) close.current();
      if (event.key !== "Tab") return;
      const focusable = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"]), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]');
      if (!focusable?.length) { event.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, []);
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div ref={panel} className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={busy} tabIndex={-1}>
      <div className="modal-heading"><h2 id={titleId}>{title}</h2><button type="button" className="btn btn-icon" aria-label="Close dialog" disabled={busy} onClick={onClose}>×</button></div>
      {children}
    </div>
  </div>;
}
