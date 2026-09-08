import { Router } from "express";
import multer from "multer";
import { extractTextFromImage } from "../services/ocrService.js";
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
