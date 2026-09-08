import { createWorker } from "tesseract.js";

/**
 * Extract raw text from an image buffer using Tesseract.js OCR.
 * @param {Buffer} imageBuffer - The image file buffer
 * @returns {Promise<string>} - Extracted raw text
 */
export async function extractTextFromImage(imageBuffer) {
  const worker = await createWorker("eng");

  try {
    const {
      data: { text },
    } = await worker.recognize(imageBuffer);
    return text;
  } finally {
    await worker.terminate();
  }
}
