import { copyFile, mkdir, cp } from "node:fs/promises";
// Self-host executable OCR/PDF assets; never use a receipt service or CDN.
await mkdir("public/receipt-assets/core", { recursive: true });
await copyFile("node_modules/tesseract.js/dist/worker.min.js", "public/receipt-assets/worker.min.js");
await copyFile("node_modules/pdfjs-dist/build/pdf.worker.min.mjs", "public/receipt-assets/pdf.worker.min.mjs");
for (const variant of ["lstm", "simd-lstm", "relaxedsimd-lstm"]) {
  for (const extension of ["wasm", "wasm.js"]) {
    const name = `tesseract-core-${variant}.${extension}`;
    await copyFile(`node_modules/tesseract.js-core/${name}`, `public/receipt-assets/core/${name}`);
  }
}

await cp("node_modules/pdfjs-dist/standard_fonts", "public/receipt-assets/standard_fonts", { recursive: true });
await cp("node_modules/pdfjs-dist/wasm", "public/receipt-assets/pdf-wasm", { recursive: true });
