import { Router } from "express";
import multer from "multer";
import { extractTextFromImage, preprocessImage } from "../services/ocrService.js";
import { parseOcrText } from "../services/parseService.js";
import { categorizeExpense } from "../services/categorizeService.js";

const router = Router();

// Configure multer for in-memory file storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WebP, and GIF images are supported"));
    }
  },
});

/**
 * POST /api/ocr/extract
 * Upload an image, run OCR, and return parsed + categorized data.
 * Body: multipart/form-data with 'receipt' field
 */
router.post("/extract", upload.single("receipt"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    // Step 1: Run OCR to extract raw text
    const rawText = await extractTextFromImage(req.file.buffer);

    if (!rawText || rawText.trim().length === 0) {
      return res.status(422).json({
        error: "Could not extract text from image. Please ensure the image is clear and readable.",
        rawText: "",
      });
    }

    // Step 2: Parse the raw text to extract structured data
    const parsed = parseOcrText(rawText);

    // Step 3: Auto-categorize based on merchant + any description hints
    const category = categorizeExpense(parsed.merchant, "");

    res.json({
      amount: parsed.amount,
      date: parsed.date,
      description: parsed.merchant,
      category,
      rawText: parsed.rawText,
      confidence: parsed.amount ? "good" : "low",
    });
  } catch (err) {
    console.error("OCR processing error:", err);
    res.status(500).json({
      error: "Failed to process image. Please try again with a clearer image.",
    });
  }
});

/**
 * POST /api/ocr/preprocess-debug
 * Debug utility: runs ONLY the preprocessing step (resize/greyscale/contrast)
 * and returns the resulting image as binary JPEG so you can eyeball exactly
 * what Tesseract sees.
 *
 * Body: multipart/form-data with 'receipt' field
 * Query params (all optional):
 *   ?maxEdge=1800   longest-edge cap in px (200-4000)
 *   ?greyscale=true/false
 *   ?contrast=0.5   -1..1
 *   ?quality=85     JPEG quality 10-100
 *
 * Preprocessing stats come back in the X-OCR-Preprocess-Meta response header.
 * Example:
 *   curl -F receipt=@receipt.jpg "http://localhost:3001/api/ocr/preprocess-debug?contrast=0.3" -o debug.jpg -D -
 */
router.post("/preprocess-debug", upload.single("receipt"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const opts = {
      maxEdge: req.query.maxEdge,
      greyscale: req.query.greyscale,
      contrast: req.query.contrast,
      quality: req.query.quality,
    };

    const { buffer, meta } = await preprocessImage(req.file.buffer, opts);

    res.set("Content-Type", "image/jpeg");
    res.set("Content-Disposition", 'inline; filename="preprocessed.jpg"');
    res.set("X-OCR-Preprocess-Meta", JSON.stringify(meta));
    res.set("Access-Control-Expose-Headers", "X-OCR-Preprocess-Meta");
    res.send(buffer);
  } catch (err) {
    console.error("Preprocess debug error:", err);
    res.status(500).json({ error: "Failed to preprocess image." });
  }
});

// Handle multer errors
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "File too large. Maximum size is 10MB." });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message && err.message.includes("Only JPEG")) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

export default router;
