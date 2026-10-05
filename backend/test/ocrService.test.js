import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Jimp } from "jimp";
import { preprocessImage, PREPROCESS_DEFAULTS } from "../src/services/ocrService.js";

/**
 * Synthetic test images — no fixtures needed. Solid-color JPEGs are enough
 * to verify geometry, channel flattening, and contrast behavior.
 */
async function makeSolidImage(width, height, hex = 0xff0000ff) {
  const img = new Jimp({ width, height, color: hex });
  return img.getBuffer("image/jpeg", { quality: 90 });
}

async function decode(buffer) {
  return Jimp.fromBuffer(buffer);
}

describe("ocrService preprocessing", () => {
  it("has sane frozen defaults", () => {
    assert.ok(Object.isFrozen(PREPROCESS_DEFAULTS));
    assert.equal(PREPROCESS_DEFAULTS.maxEdge, 1800);
    assert.equal(PREPROCESS_DEFAULTS.greyscale, true);
    assert.equal(PREPROCESS_DEFAULTS.contrast, 0.5);
    assert.equal(PREPROCESS_DEFAULTS.quality, 85);
  });

  /* ── Resize ──────────────────────────────────────────────────── */

  it("resizes oversized images down to the max edge, keeping aspect ratio", async () => {
    const input = await makeSolidImage(4000, 2000);
    const { buffer, meta } = await preprocessImage(input);
    assert.equal(meta.resized, true);
    assert.equal(meta.originalWidth, 4000);
    assert.equal(meta.originalHeight, 2000);
    assert.equal(meta.width, 1800);
    assert.equal(meta.height, 900);
    const out = await decode(buffer);
    assert.equal(out.width, 1800);
    assert.equal(out.height, 900);
  });

  it("leaves images under the max edge untouched", async () => {
    const input = await makeSolidImage(1000, 500);
    const { meta } = await preprocessImage(input, { greyscale: false, contrast: 0 });
    assert.equal(meta.resized, false);
    assert.equal(meta.width, 1000);
    assert.equal(meta.height, 500);
  });

  it("honors a custom maxEdge", async () => {
    const input = await makeSolidImage(4000, 2000);
    const { meta } = await preprocessImage(input, { maxEdge: 800, greyscale: false, contrast: 0 });
    assert.equal(meta.width, 800);
    assert.equal(meta.height, 400);
  });

  it("clamps out-of-range options to sane limits", async () => {
    const input = await makeSolidImage(4000, 2000);
    // maxEdge below the 200 floor is clamped up
    const { meta } = await preprocessImage(input, { maxEdge: 1, greyscale: false, contrast: 0 });
    assert.equal(meta.width, 200);
    assert.equal(meta.height, 100);
    // contrast beyond 1 is clamped down and reported as clamped
    const { meta: m2 } = await preprocessImage(input, { contrast: 99 });
    assert.equal(m2.contrast, 1);
  });

  /* ── Greyscale ───────────────────────────────────────────────── */

  it("greyscale flattens color channels", async () => {
    const input = await makeSolidImage(60, 40, 0xff0000ff); // red
    const { buffer } = await preprocessImage(input, { greyscale: true, contrast: 0 });
    const img = await decode(buffer);
    const [r, g, b] = img.bitmap.data;
    assert.ok(Math.abs(r - g) <= 3, `r/g should match, got ${r}/${g}`);
    assert.ok(Math.abs(g - b) <= 3, `g/b should match, got ${g}/${b}`);
  });

  it("skips greyscale when disabled", async () => {
    const input = await makeSolidImage(60, 40, 0xff0000ff); // red
    const { buffer } = await preprocessImage(input, { greyscale: false, contrast: 0 });
    const img = await decode(buffer);
    const [r, g] = img.bitmap.data;
    assert.ok(r > g, `red should stay reddish, got r=${r} g=${g}`);
  });

  /* ── Contrast ────────────────────────────────────────────────── */

  it("contrast changes the output bytes", async () => {
    const input = await makeSolidImage(400, 200, 0x808080ff);
    const flat = await preprocessImage(input, { greyscale: false, contrast: 0 });
    const punched = await preprocessImage(input, { greyscale: false, contrast: 0.6 });
    assert.ok(!flat.buffer.equals(punched.buffer), "contrast level should affect output bytes");
    assert.equal(flat.meta.contrast, 0);
    assert.equal(punched.meta.contrast, 0.6);
  });

  /* ── Fallback + metadata ─────────────────────────────────────── */

  it("falls back to the original buffer for undecodable input", async () => {
    const garbage = Buffer.from("this is definitely not an image");
    const { buffer, meta } = await preprocessImage(garbage);
    assert.equal(meta.fallback, true);
    assert.ok(buffer.equals(garbage));
  });

  it("reports timing and output size metadata", async () => {
    const input = await makeSolidImage(2000, 1000);
    const { meta } = await preprocessImage(input);
    assert.ok(typeof meta.durationMs === "number");
    assert.ok(meta.bytes > 0);
    assert.equal(meta.fallback, false);
  });
});
