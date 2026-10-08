"use client";
import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloudArrowUp, faFileCircleCheck, faSpinner } from "@fortawesome/free-solid-svg-icons";
import type { Worker } from "tesseract.js";
import { useExpenseOptions } from "./ExpenseOptionsProvider";
import { parseReceipt } from "@/lib/receipt-parser";
export default function ReceiptScanner({ onDraft, onBusy, onReviewRequired }: { onDraft: (draft: ReturnType<typeof parseReceipt>) => void; onBusy: (busy: boolean) => void; onReviewRequired: (required: boolean) => void }) {
  const { options } = useExpenseOptions();
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [filename, setFilename] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [text, setText] = useState("");
  const active = useRef(true);
  const activeWorker = useRef<Worker | null>(null);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; void activeWorker.current?.terminate(); };
  }, []);
  async function scan(file?: File) {
    if (!file) return;
    setText("");
    if (file.size > 10 * 1024 * 1024 || !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type)) { setStatus("Choose a PDF, JPG, PNG or WebP file up to 10 MB."); return; }
    setFilename(file.name);
    setBusy(true); onBusy(true); setStatus("Scanning on your device…");
    let worker: Awaited<ReturnType<typeof import("tesseract.js").createWorker>> | undefined;
    try {
      const getWorker = async () => {
        if (!worker) {
          const { createWorker } = await import("tesseract.js");
          worker = await createWorker("eng", 1, { workerPath: "/receipt-assets/worker.min.js", corePath: "/receipt-assets/core", langPath: "/receipt-assets/lang", workerBlobURL: false, cacheMethod: "none" });
          activeWorker.current = worker;
          if (!active.current) { await worker.terminate(); throw new Error("Scan cancelled"); }
        }
        return worker;
      };
      let extracted = "";
      if (file.type === "application/pdf") {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/receipt-assets/pdf.worker.min.mjs";
        const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), standardFontDataUrl: "/receipt-assets/standard_fonts/", wasmUrl: "/receipt-assets/pdf-wasm/" });
        try {
          const pdf = await task.promise;
          if (pdf.numPages > 5) throw new Error("Please choose a receipt PDF with at most 5 pages.");
          for (let n = 1; n <= pdf.numPages; n++) {
            const page = await pdf.getPage(n);
            const content = await page.getTextContent();
            const pageText = content.items.map((item) => "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "").join("");
            if (pageText.trim().length > 30) extracted += pageText + "\n";
            else {
              const base = page.getViewport({ scale: 1 });
              const viewport = page.getViewport({ scale: Math.min(2, 2400 / Math.max(base.width, base.height)) });
              const canvas = document.createElement("canvas");
              canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
              await page.render({ canvas, viewport }).promise;
              extracted += (await (await getWorker()).recognize(canvas)).data.text + "\n";
              canvas.width = 0; canvas.height = 0;
            }
          }
        } finally { await task.destroy(); }
      } else {
        const bitmap = await createImageBitmap(file);
        try {
          if (bitmap.width * bitmap.height > 25000000) throw new Error("Image is too large. Please resize it before scanning.");
          const scale = Math.min(1, 3000 / Math.max(bitmap.width, bitmap.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(bitmap.width * scale); canvas.height = Math.ceil(bitmap.height * scale);
          canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          extracted = (await (await getWorker()).recognize(canvas)).data.text;
          canvas.width = 0; canvas.height = 0;
        } finally { bitmap.close(); }
      }
      if (!active.current) return;
      if (!extracted.trim()) throw new Error("No readable text found. Enter the expense manually or try a clearer receipt.");
      setText(extracted.slice(0, 20000)); onDraft(parseReceipt(extracted, options)); onReviewRequired(true);
      setStatus("Check the extracted text and every suggested field before saving. Missing details need to be entered manually.");
    } catch (error) { if (active.current) setStatus(error instanceof Error ? error.message : "Scanning failed. Try a clearer receipt or enter it manually."); }
    finally { await worker?.terminate(); activeWorker.current = null; if (active.current) { setBusy(false); onBusy(false); } }
  }
  return <section className="receipt-upload" aria-label="Receipt scanner">
    <input ref={fileInput} className="sr-only" tabIndex={-1} type="file" aria-label="Scan receipt (optional)" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { void scan(event.target.files?.[0]); event.target.value = ""; }} />
    <button type="button" className="receipt-dropzone" disabled={busy} data-dragging={dragging} onClick={() => fileInput.current?.click()} onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); if (!busy) { if (event.dataTransfer.files.length !== 1) setStatus("Choose one receipt at a time."); else void scan(event.dataTransfer.files[0]); } }}>
      <span className="receipt-upload-icon"><FontAwesomeIcon icon={busy ? faSpinner : text ? faFileCircleCheck : faCloudArrowUp} spin={busy} aria-hidden="true" /></span>
      <span className="receipt-upload-copy"><strong>{busy ? "Scanning your receipt…" : filename || "Scan a receipt"}</strong><small>{busy ? "Extracting details on your device" : "Drop a PDF or image here · Up to 10 MB / 5 PDF pages"}</small></span>
      <span className="receipt-upload-action">{busy ? "Processing…" : filename ? "Change receipt" : "Browse files"}</span>
    </button>
    <p className="receipt-upload-note">Optional · Your receipt stays on this device. Review the details before saving. English text recognition.</p>
    {status && <p role="status" className="receipt-scan-status">{status}</p>}
    {text && <details className="receipt-text"><summary>Review extracted receipt text</summary><pre className="text-xs whitespace-pre-wrap max-h-32 overflow-auto mt-2">{text}</pre></details>}
  </section>;
}
