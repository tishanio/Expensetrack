import { createWorker } from "tesseract.js";
import { Jimp } from "jimp";

/**
 * Tunable preprocessing defaults. Override per call via the opts argument,
 * or per request via /api/ocr/preprocess-debug query params.
 */
export const PREPROCESS_DEFAULTS = Object.freeze({
  maxEdge: 1800, // px cap on the longest edge — Tesseract slows sharply past ~2000px with little accuracy gain
  greyscale: true, // receipts are monochrome; removes color noise and lighting tints
  contrast: 0.5, // jimp range -1..1 — 0.5 rescues faded thermal prints, lower for glossy/high-contrast receipts
  quality: 85, // JPEG quality of the preprocessed image handed to Tesseract
});

function clampNumber(value, min, max, fallback) {
  const n = typeof value === "number" ? value : parseFloat(value);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function parseBool(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return String(value).trim().toLowerCase() === "true";
}

/** Merge user-supplied options with defaults, clamping to sane ranges. */
function sanitizeOptions(opts = {}) {
  const d = PREPROCESS_DEFAULTS;
  return {
    maxEdge: clampNumber(opts.maxEdge, 200, 4000, d.maxEdge),
    greyscale: parseBool(opts.greyscale, d.greyscale),
    contrast: clampNumber(opts.contrast, -1, 1, d.contrast),
    quality: Math.round(clampNumber(opts.quality, 10, 100, d.quality)),
  };
}

/**
 * Preprocess a receipt image for better OCR accuracy:
 * - downscale very large images (consistent, manageable size for Tesseract)
 * - convert to greyscale (receipts are monochrome; removes color noise and
 *   tint from photos taken under warm/cool lighting)
 * - boost contrast (thermal receipts are low-contrast and often fade)
 *
 * @param {Buffer} imageBuffer - raw image bytes
 * @param {object} [opts] - { maxEdge, greyscale, contrast, quality }
 * @returns {Promise<{buffer: Buffer, meta: object}>} preprocessed JPEG buffer
 *   plus timing/geometry metadata. On decode failure, falls back to the
 *   original bytes with meta.fallback = true — preprocessing never fails a request.
 */
export async function preprocessImage(imageBuffer, opts) {
  const o = sanitizeOptions(opts);
  const started = Date.now();

  try {
    const image = await Jimp.fromBuffer(imageBuffer);
    const originalWidth = image.width;
    const originalHeight = image.height;

    let resized = false;
    const longest = Math.max(originalWidth, originalHeight);
    if (longest > o.maxEdge) {
      image.resize({ w: Math.max(1, Math.round(originalWidth * (o.maxEdge / longest))) });
      resized = true;
    }

    if (o.greyscale) image.greyscale();
    if (o.contrast !== 0) image.contrast(o.contrast);

    const buffer = await image.getBuffer("image/jpeg", { quality: o.quality });

    return {
      buffer,
      meta: {
        originalWidth,
        originalHeight,
        width: image.width,
        height: image.height,
        resized,
        greyscale: o.greyscale,
        contrast: o.contrast,
        quality: o.quality,
        bytes: buffer.length,
        fallback: false,
        durationMs: Date.now() - started,
      },
    };
  } catch (err) {
    // Undecodable/unsupported formats: fall back to the original bytes and
    // let Tesseract try — a no-op preprocess should never fail the request.
    console.warn("Image preprocessing skipped:", err.message);
    return {
      buffer: imageBuffer,
      meta: { fallback: true, durationMs: Date.now() - started, error: err.message },
    };
  }
}

/**
 * Extract raw text from an image buffer using Tesseract.js OCR.
 * @param {Buffer} imageBuffer - The image file buffer
 * @param {object} [opts] - preprocessing options, see preprocessImage
 * @returns {Promise<string>} - Extracted raw text
 */
export async function extractTextFromImage(imageBuffer, opts) {
  const { buffer: processed } = await preprocessImage(imageBuffer, opts);
  const worker = await getWorker();

  try {
    const {
      data: { text },
    } = await worker.recognize(processed);
    return text;
  } catch (err) {
    // A crashed/terminated worker can surface here instead of at creation
    // time. Reset so the next request gets a fresh one.
    await resetOcrWorker();
    throw err;
  }
}

/* ── Warm worker cache ──────────────────────────────────────────
 *
 * createWorker("eng") downloads/loads language data and spins up a WASM
 * runtime — 1-2s on every request. tesseract.js workers serialize work
 * internally, so a single shared worker is safe for concurrent requests
 * (they queue) and keeps steady-state memory flat.
 *
 * Lifecycle:
 *   warmOcrWorker()  — optional eager init, called at server boot
 *   getWorker()      — lazy create-or-reuse, used by every recognition
 *   resetOcrWorker() — terminate + clear; boot recovery and shutdown
 * ──────────────────────────────────────────────────────────── */

let workerPromise = null;

/** Create-or-reuse the shared worker. Concurrent callers await one creation. */
function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("eng").catch((err) => {
      workerPromise = null; // allow the next call to retry from scratch
      throw err;
    });
  }
  return workerPromise;
}

/** Eagerly start the worker (server boot) so the first scan skips startup. */
export function warmOcrWorker() {
  getWorker();
}

/** Terminate and clear the cached worker; the next call re-creates it. */
export async function resetOcrWorker() {
  const p = workerPromise;
  workerPromise = null;
  if (p) {
    try {
      const worker = await p;
      await worker.terminate();
    } catch {
      // worker already dead — nothing to do
    }
  }
}
