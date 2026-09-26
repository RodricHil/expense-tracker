"use client";

import { popoverPosition } from "@/lib/popover";
import { useEffect, useId, useRef, useState } from "react";

type Option = { value: string; label: string };
export default function CustomSelect({ value, options, onChange, label, disabled = false, id }: { value: string; options: Option[]; onChange: (value: string) => void; label: string; disabled?: boolean; id?: string }) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const [position, setPosition] = useState<React.CSSProperties>({});
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const search = useRef({ text: "", time: 0 });
  const selected = options.findIndex((option) => option.value === value);
  const choose = (index: number) => { if (options[index]) onChange(options[index].value); setOpen(false); trigger.current?.focus(); };
  const show = () => {
    if (trigger.current) setPosition(popoverPosition(trigger.current.getBoundingClientRect(), Math.max(trigger.current.offsetWidth, 120), Math.min(options.length * 44 + 10, 250), window.innerWidth, window.innerHeight));
    setActive(Math.max(selected, 0)); setOpen(true);
  };

  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const resize = () => setOpen(false);
    const scroll = (event: Event) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", resize);
    document.addEventListener("scroll", scroll, true);
    return () => { document.removeEventListener("pointerdown", outside); window.removeEventListener("resize", resize); document.removeEventListener("scroll", scroll, true); };
  }, []);
  useEffect(() => { if (open) list.current?.focus(); }, [open]);
  useEffect(() => { if (open) list.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" }); }, [active, open]);

  const keyboard = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); return; }
    if (event.key === "Tab") { setOpen(false); return; }
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(active); return; }
    let next = active;
    if (event.key === "ArrowDown") next = Math.min(active + 1, options.length - 1);
    else if (event.key === "ArrowUp") next = Math.max(active - 1, 0);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = options.length - 1;
    else if (event.key.length === 1) {
      const now = event.timeStamp;
      const term = (now - search.current.time < 700 ? search.current.text : "") + event.key.toLowerCase();
      search.current = { text: term, time: now };
      const match = options.findIndex((option) => option.label.toLowerCase().startsWith(term));
      if (match >= 0) next = match;
    } else return;
    event.preventDefault(); setActive(next);
  };

  return <div ref={root} className="custom-control" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button ref={trigger} id={controlId} type="button" className="input select-trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${controlId}-list`} disabled={disabled} onClick={() => open ? setOpen(false) : show()} onKeyDown={(event) => { if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) { event.preventDefault(); show(); } }}>
      <span className="truncate">{options[selected]?.label ?? "Select"}</span><svg className="select-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    {open && <div ref={list} id={`${controlId}-list`} className="select-options" style={position} role="listbox" tabIndex={0} aria-label={label} aria-activedescendant={`${controlId}-option-${active}`} onKeyDown={keyboard}>
      {options.map((option, index) => <div key={option.value} id={`${controlId}-option-${index}`} role="option" aria-selected={value === option.value} data-active={index === active} className="select-option" onPointerMove={() => setActive(index)} onClick={() => choose(index)}><span>{option.label}</span>{value === option.value && <span aria-hidden="true">✓</span>}</div>)}
    </div>}
  </div>;
}
