/**
 * Client-side image compression for OCR uploads.
 *
 * Camera photos are often 4000x3000 (4-8MB). Downscaling to a max edge of
 * 1600px and re-encoding as JPEG q0.8 typically lands at 200-400KB — plenty
 * for Tesseract, ~20x less to upload over mobile data.
 */

const MAX_EDGE = 1600; // px, longest side after resize
const QUALITY = 0.8; // JPEG quality (0-1)

/**
 * Downscale + re-encode an image as JPEG via canvas.
 * @param {Blob|File} blob - input image
 * @param {object} [opts]
 * @param {number} [opts.maxEdge] - longest edge cap in px
 * @param {number} [opts.quality] - JPEG quality 0-1
 * @returns {Promise<Blob>} JPEG blob (or original blob if already small / undecodable)
 */
export async function compressImage(blob, { maxEdge = MAX_EDGE, quality = QUALITY } = {}) {
  if (typeof document === "undefined") return blob; // non-browser safety

  let bitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    return blob; // undecodable — let the server surface the real error
  }

  const { width, height } = bitmap;
  const scale = Math.min(1, maxEdge / Math.max(width, height));

  // Already small enough and JPEG: skip the canvas round-trip.
  if (scale === 1 && blob.type === "image/jpeg") {
    bitmap.close?.();
    return blob;
  }

  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    return blob;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const out = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b || blob), "image/jpeg", quality);
  });
  return out;
}

/**
 * Convenience: returns [compressedBlob, dataURL] in one decode pass.
 * The preview shares the same pixels the OCR sees, so what you check
 * is exactly what gets scanned.
 * @param {Blob|File} blob
 * @returns {Promise<[Blob, string]>}
 */
export async function compressWithPreview(blob) {
  const compressed = await compressImage(blob);
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target.result);
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(compressed);
  });
  return [compressed, dataUrl];
}
