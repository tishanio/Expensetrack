import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { Jimp } from "jimp";
import {
  extractTextFromImage,
  resetOcrWorker,
  warmOcrWorker,
} from "../src/services/ocrService.js";

/**
 * A blank white image: recognition returns "" but still exercises the full
 * worker lifecycle (acquire → recognize → reuse/terminate), which is what
 * these tests are about — no font fixtures needed.
 */
async function blankImage() {
  const img = new Jimp({ width: 200, height: 60, color: 0xffffffff });
  return img.getBuffer("image/jpeg", { quality: 80 });
}

describe("ocr worker lifecycle", () => {
  it("reuses the warm worker across recognitions", async () => {
    warmOcrWorker(); // kick off creation without awaiting it
    const buf = await blankImage();

    const t1 = Date.now();
    const r1 = await extractTextFromImage(buf);
    const d1 = Date.now() - t1;

    const t2 = Date.now();
    const r2 = await extractTextFromImage(buf);
    const d2 = Date.now() - t2;

    assert.equal(r1, r2);
    console.log(`    first call ${d1}ms (includes worker startup), second call ${d2}ms`);
    assert.ok(d2 <= d1, "second call must not pay worker startup again");
  });

  it("handles concurrent recognitions on the shared worker", async () => {
    const buf = await blankImage();
    const [a, b] = await Promise.all([
      extractTextFromImage(buf),
      extractTextFromImage(buf),
    ]);
    assert.equal(a, b);
  });

  it("recovers after a reset (next call recreates the worker)", async () => {
    const buf = await blankImage();
    const r1 = await extractTextFromImage(buf);
    await resetOcrWorker();
    const r2 = await extractTextFromImage(buf);
    assert.equal(r1, r2);
  });

  after(async () => {
    // Don't leave a live WASM worker hanging after the test run.
    await resetOcrWorker();
  });
});
