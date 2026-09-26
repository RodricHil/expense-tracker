"use client";

import { useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faCircleExclamation, faCircleInfo, faTriangleExclamation, faXmark, type IconDefinition } from "@fortawesome/free-solid-svg-icons";

export type NotificationType = "success" | "error" | "warning" | "info";

const variants: Record<NotificationType, { icon: IconDefinition; title: string; duration: number }> = {
  success: { icon: faCircleCheck, title: "Success", duration: 5000 },
  info: { icon: faCircleInfo, title: "Info", duration: 5000 },
  warning: { icon: faTriangleExclamation, title: "Warning", duration: 7000 },
  error: { icon: faCircleExclamation, title: "Error", duration: 8000 },
};

/**
 * One toast. Type is conveyed by icon and a visually hidden title as well as
 * colour. Auto-dismisses, but pauses while hovered or focused so it can be
 * read and its close button reached.
 */
export default function Notification({ message, type, leaving, onClose }: { message: string; type: NotificationType; leaving: boolean; onClose: () => void }) {
  const variant = variants[type] ?? variants.info;
  const timer = useRef<number | undefined>(undefined);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; });

  const start = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => close.current(), variant.duration); };
  const pause = () => window.clearTimeout(timer.current);

  useEffect(() => {
    timer.current = window.setTimeout(() => close.current(), variant.duration);
    return () => window.clearTimeout(timer.current);
  }, [variant.duration]);

  const urgent = type === "error" || type === "warning";
  return <div className={`toast toast-${type}`} data-leaving={leaving || undefined} role={urgent ? "alert" : "status"} aria-live={urgent ? "assertive" : "polite"} onMouseEnter={pause} onMouseLeave={start} onFocus={pause} onBlur={start}>
    <FontAwesomeIcon icon={variant.icon} className="toast-icon" aria-hidden="true" />
    <p className="toast-message"><span className="sr-only">{variant.title}: </span>{message}</p>
    <button type="button" className="toast-close" aria-label="Dismiss notification" onClick={onClose}><FontAwesomeIcon icon={faXmark} aria-hidden="true" /></button>
  </div>;
}
