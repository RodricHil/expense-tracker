The English OCR model (`lang/eng.traineddata.gz`) is from
https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz (Tesseract, Apache 2.0).

Worker, WASM, and PDF font/decoder assets are generated from pinned npm
packages by scripts/prepare-receipt-assets.mjs before dev/build. All assets
are served locally; receipt files are never uploaded or persisted.
