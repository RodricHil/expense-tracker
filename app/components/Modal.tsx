"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

export default function Modal({ title, description, children, onClose, busy = false, wide = false }: { title: string; description?: ReactNode; children: ReactNode; onClose: () => void; busy?: boolean; wide?: boolean }) {
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
      const focusable = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"]), a[href], input:not(:disabled):not([type="radio"]), input[type="radio"]:checked:not(:disabled), select:not(:disabled), [tabindex="0"]');
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
    <div ref={panel} className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={busy} tabIndex={-1}>
      <div className="modal-heading"><div><h2 id={titleId}>{title}</h2>{description && <p className="muted mt-1">{description}</p>}</div><button type="button" className="btn btn-icon" aria-label="Close dialog" disabled={busy} onClick={onClose}><FontAwesomeIcon icon={faXmark} aria-hidden="true" /></button></div>
      {children}
    </div>
  </div>;
}
