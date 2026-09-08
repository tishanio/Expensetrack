/**
 * Parse OCR text to extract structured expense data.
 * Detects: total amount, date, and merchant/item name.
 */

const CURRENCY_SYMBOLS = /[\$\u00A3\u20B9\u20AC\u00A5]/;
const AMOUNT_KEYWORDS =
  /(?:total|amount|paid|grand\s*total|net\s*amount|bill\s*amount|sum|subtotal|due|balance|paid\s*amount)\s*[:\-]?\s*/i;
const DATE_PATTERNS = [
  // DD/MM/YYYY or DD-MM-YYYY
  /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/,
  // YYYY-MM-DD
  /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/,
  // Written dates: Jan 12, 2024 / January 12 2024 / 12 Jan 2024
  /\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{2,4})\b/i,
  /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})\s*,?\s*(\d{2,4})\b/i,
];

const MONTH_MAP = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

/**
 * Extract the total amount from OCR text.
 */
function extractAmount(text) {
  const lines = text.split("\n");

  // Strategy 1: Look for lines with amount keywords
  for (const line of lines) {
    const match = line.match(AMOUNT_KEYWORDS);
    if (match) {
      const afterKeyword = line.slice(match.index + match[0].length);
      const numMatch = afterKeyword.match(
        /[\$\u00A3\u20B9\u20AC\u00A5]?\s*(\d{1,3}(?:[,\.]\d{3})*(?:[.,]\d{1,2})?)/
      );
      if (numMatch) {
        const cleaned = numMatch[1].replace(/,/g, "");
        const amount = parseFloat(cleaned);
        if (!isNaN(amount) && amount > 0) return amount;
      }
    }
  }

  // Strategy 2: Find the largest currency amount in the text
  const allAmounts = [];
  const amountRegex =
    /[\$\u00A3\u20B9\u20AC\u00A5]\s*(\d{1,3}(?:[,\.]\d{3})*(?:[.,]\d{1,2})?)/g;
  let m;
  while ((m = amountRegex.exec(text)) !== null) {
    const cleaned = m[1].replace(/,/g, "");
    const amount = parseFloat(cleaned);
    if (!isNaN(amount) && amount > 0) allAmounts.push(amount);
  }

  // Also look for plain numbers that could be amounts (on their own line or after =)
  if (allAmounts.length === 0) {
    const plainRegex =
      /(?:^|\s|=)\s*(\d{1,3}(?:[,\.]\d{3})*(?:\.\d{1,2}))(?:\s|$)/gm;
    while ((m = plainRegex.exec(text)) !== null) {
      const cleaned = m[1].replace(/,/g, "");
      const amount = parseFloat(cleaned);
      if (!isNaN(amount) && amount > 0) allAmounts.push(amount);
    }
  }

  if (allAmounts.length > 0) {
    // Return the largest amount (likely the total)
    return Math.max(...allAmounts);
  }

  return null;
}

/**
 * Extract a date from OCR text.
 * Returns date in YYYY-MM-DD format or null.
 */
function extractDate(text) {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return parseDateMatch(match, pattern);
    }
  }
  return null;
}

function parseDateMatch(match, pattern) {
  try {
    // Pattern: DD/MM/YYYY or DD-MM-YYYY
    if (
      pattern.source.startsWith("\\b(\\d{1,2})[\\/\\-](\\d{1,2})[\\/\\-](\\d{2,4})")
    ) {
      const [, d, m, y] = match;
      return formatDate(parseInt(d), parseInt(m), parseInt(y));
    }

    // Pattern: YYYY-MM-DD
    if (pattern.source.startsWith("\\b(\\d{4})[\\/\\-](\\d{1,2})[\\/\\-](\\d{1,2})")) {
      const [, y, m, d] = match;
      return formatDate(parseInt(d), parseInt(m), parseInt(y));
    }

    // Pattern: DD Mon YYYY
    if (
      pattern.source.includes(
        "(\\d{1,2})\\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec"
      )
    ) {
      const [, d, mon, y] = match;
      const m = MONTH_MAP[mon.toLowerCase().slice(0, 3)];
      if (m) return formatDate(parseInt(d), parseInt(m), parseInt(y));
    }

    // Pattern: Mon DD YYYY
    if (
      pattern.source.includes(
        "(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec"
      ) &&
      pattern.source.includes("(\\d{1,2})")
    ) {
      const [, mon, d, y] = match;
      const m = MONTH_MAP[mon.toLowerCase().slice(0, 3)];
      if (m) return formatDate(parseInt(d), parseInt(m), parseInt(y));
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function formatDate(day, month, year) {
  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Extract the first meaningful line as a merchant/description hint.
 */
function extractMerchant(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Skip very short lines and lines that are just numbers
  for (const line of lines.slice(0, 5)) {
    const cleaned = line.replace(/[^\w\s]/g, "").trim();
    if (cleaned.length >= 3 && !/^\d+[\.\d\s]*$/.test(cleaned)) {
      return cleaned.slice(0, 100);
    }
  }
  return "";
}

/**
 * Full parse pipeline: extract structured data from OCR text.
 */
export function parseOcrText(rawText) {
  return {
    amount: extractAmount(rawText),
    date: extractDate(rawText) || new Date().toISOString().slice(0, 10),
    merchant: extractMerchant(rawText),
    rawText,
  };
}
