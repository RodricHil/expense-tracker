"use client";
import { useId, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleInfo } from "@fortawesome/free-solid-svg-icons";

export default function DailyAverageInfo() {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const show = () => { if (!dismissed) setOpen(true); };
  const dismiss = () => { setOpen(false); setPinned(false); setDismissed(true); };
  return <span className="average-info" onPointerEnter={show} onPointerLeave={() => { if (!pinned) setOpen(false); setDismissed(false); }} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); dismiss(); } }}>
    <button type="button" className="average-info-trigger" aria-label="How daily averages are calculated" aria-describedby={open ? id : undefined} aria-expanded={open} onFocus={show} onClick={() => { if (pinned) dismiss(); else { setDismissed(false); setPinned(true); setOpen(true); } }} onBlur={() => { setOpen(false); setPinned(false); setDismissed(false); }}><FontAwesomeIcon icon={faCircleInfo} aria-hidden="true" /></button>
    <span id={id} role="tooltip" className="average-info-tooltip" data-open={open}>Daily averages include every calendar day in the selected range, including days without expenses.</span>
  </span>;
}
