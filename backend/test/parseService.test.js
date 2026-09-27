import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseOcrText } from "../src/services/parseService.js";

/**
 * Amount extraction only — every case goes through parseOcrText, which is
 * what the OCR route actually calls.
 */
function amountOf(text) {
  return parseOcrText(text).amount;
}

describe("parseService amount extraction", () => {
  /* ── Happy paths ─────────────────────────────────────────────── */

  it("reads a keyword line with a rupee symbol", () => {
    assert.equal(amountOf("TOTAL: ₹1280\nDate: 26/09/2026"), 1280);
  });

  it("reads grand total with decimals", () => {
    assert.equal(amountOf("GRAND TOTAL: ₹1,499.50"), 1499.5);
  });

  it("falls back to the largest symbol amount when no keyword exists", () => {
    assert.equal(amountOf("CHAI POINT\nTea ₹40\nSamosa ₹35\nCash ₹275"), 275);
  });

  /* ── Indian formatting ───────────────────────────────────────── */

  it("parses Indian comma grouping (lakh)", () => {
    assert.equal(amountOf("TOTAL: ₹1,28,000"), 128000);
  });

  it("parses Indian comma grouping (crore)", () => {
    assert.equal(amountOf("TOTAL: ₹12,34,567"), 1234567);
  });

  it("parses Western comma grouping", () => {
    assert.equal(amountOf("TOTAL: ₹1,280,000"), 1280000);
  });

  it("parses a bare 4+ digit amount (no grouping)", () => {
    assert.equal(amountOf("TOTAL: ¥1280"), 1280);
    assert.equal(amountOf("TOTAL: 128000"), 128000);
  });

  /* ── Rs / INR prefixes ───────────────────────────────────────── */

  it("parses Rs prefix on a keyword line", () => {
    assert.equal(amountOf("Total: Rs 275"), 275);
  });

  it("parses RS. with a period", () => {
    assert.equal(amountOf("TOTAL: RS. 1499"), 1499);
  });

  it("parses lowercase rs without space discipline", () => {
    assert.equal(amountOf("Grand Total: rs.275"), 275);
  });

  it("parses INR prefix", () => {
    assert.equal(amountOf("Total: INR 320"), 320);
  });

  it("finds Rs amounts via the largest-amount fallback", () => {
    assert.equal(amountOf("CHAI POINT\nTea Rs 40\nSamosa Rs 35\nPaid Rs 275"), 275);
  });

  /* ── Total vs subtotal priority ──────────────────────────────── */

  it("prefers TOTAL over an earlier Subtotal line", () => {
    assert.equal(amountOf("Subtotal: ₹900\nTax: ₹100\nTOTAL: ₹1000"), 1000);
  });

  it("prefers GRAND TOTAL over subtotal", () => {
    assert.equal(amountOf("SUBTOTAL: ₹900\nGRAND TOTAL: ₹1050"), 1050);
  });

  it("still uses subtotal when no total line exists", () => {
    assert.equal(amountOf("Subtotal: ₹900\nTax: ₹100"), 900);
  });

  /* ── Decimals and separators ─────────────────────────────────── */

  it("parses comma as decimal separator", () => {
    assert.equal(amountOf("TOTAL: ₹12,50"), 12.5);
  });

  it("parses dot decimals", () => {
    assert.equal(amountOf("TOTAL: ₹99.99"), 99.99);
  });

  it("ignores trailing garbage after the amount", () => {
    assert.equal(amountOf("TOTAL: ₹1280 **"), 1280);
  });

  /* ── OCR noise tolerance ─────────────────────────────────────── */

  it("handles mangled symbols between keyword and number", () => {
    assert.equal(amountOf("TOTAL: ¥1280\n« GEESE $3909"), 1280);
  });

  it("handles OCR noise around the number", () => {
    assert.equal(amountOf("T0TAL: #1280#"), 1280);
  });

  it("extracts from a realistic noisy receipt", () => {
    const receipt = [
      "FRESH MART",
      "Groceries 2840.00",
      "Basmati Rice 5kg ¥320.00",
      "Toor Dal 2kg 180.00",
      "TOTAL: ¥1280",
      "Date: 26/09/2026",
      "« GEESE $3909 9 b>",
    ].join("\n");
    assert.equal(amountOf(receipt), 1280);
  });

  /* ── Malformed / absent amounts ──────────────────────────────── */

  it("returns null when no number exists", () => {
    assert.equal(amountOf("FRESH MART\nThank you!"), null);
  });

  it("returns null for empty text", () => {
    assert.equal(amountOf(""), null);
  });

  it("returns null when keyword has no number after it", () => {
    assert.equal(amountOf("TOTAL: ----------"), null);
  });

  it("returns null for zero amounts", () => {
    assert.equal(amountOf("TOTAL: ₹0"), null);
  });

  /* ── Other fields still behave ───────────────────────────────── */

  it("does not lose date extraction", () => {
    assert.equal(parseOcrText("TOTAL: ₹1280\nDate: 26/09/2026").date, "2026-09-26");
  });

  it("does not lose merchant extraction", () => {
    assert.equal(parseOcrText("FRESH MART\nTOTAL: ₹1280").merchant, "FRESH MART");
  });
});
