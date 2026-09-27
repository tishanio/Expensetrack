import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "../sounds.js";
import { extractOcr, createExpense, fetchCategories } from "../api.js";
import { today } from "../constants.js";
import { ScreenHead } from "../components/retro.jsx";

export default function ReceiptUpload() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [step, setStep] = useState("upload");
  const [preview, setPreview] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [form, setForm] = useState({
    amount: "",
    category: "Others",
    itemType: "",
    description: "",
    date: today(),
  });
  const [rawText, setRawText] = useState("");
  const [showRawText, setShowRawText] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetchCategories()
      .then((cats) => {
        setCategories(cats);
        if (cats.length > 0) {
          setForm((p) => ({ ...p, category: cats.find((c) => c.name === "Others")?.name || cats[0].name }));
        }
      })
      .catch(() => {});
  }, []);

  const selectedCatItems = categories.find((c) => c.name === form.category)?.items || [];

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
    processImage(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target.result);
      reader.readAsDataURL(file);
      processImage(file);
    } else {
      toast.error("Please drop an image file");
    }
  };

  const processImage = async (file) => {
    setStep("review");
    setOcrResult(null);
    try {
      const result = await extractOcr(file);
      setOcrResult(result);
      setForm({
        amount: result.amount ? String(result.amount) : "",
        category: result.category || "Others",
        itemType: "",
        description: result.description || "",
        date: result.date || today(),
      });
      setRawText(result.rawText || "");
      if (result.confidence === "low") {
        toast("Could not detect amount confidently. Please verify.", { icon: "⚠️" });
      } else {
        toast.success("Receipt scanned successfully!");
      }
    } catch (err) {
      toast.error(err.message || "Failed to process receipt");
      setStep("upload");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    setStep("saving");
    try {
      await createExpense({
        amount: parseFloat(form.amount),
        category: form.category,
        itemType: form.itemType || "Other",
        description: form.description,
        date: form.date,
        source: "ocr",
        rawOcrText: rawText,
      });
      toast.success("Expense saved from receipt!");
      navigate("/expenses");
    } catch (err) {
      toast.error(err.message || "Failed to save expense");
      setStep("review");
    }
  };

  const handleReset = () => {
    setStep("upload");
    setPreview(null);
    setOcrResult(null);
    setRawText("");
    setShowRawText(false);
    setForm({ amount: "", category: "Others", itemType: "", description: "", date: today() });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div>
      <ScreenHead title="Scan Receipt" sub="Snap a bill. We guess the numbers — then you fix them." />

      {step === "upload" && (
        <div className="card">
          <div
            className={"dropzone" + (dragOver ? " is-over" : "")}
            role="button"
            tabIndex={0}
            aria-label="Upload a receipt image"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <span className="dropzone__emoji" aria-hidden="true">📸</span>
            <span className="dropzone__head">Drop a receipt here</span>
            <p className="screen-sub" style={{ margin: "8px 0 16px" }}>JPEG, PNG, WebP or GIF — up to 10MB</p>
            <span className="btn btn--cyan">Choose File</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={handleFileSelect}
          />
        </div>
      )}

      {(step === "review" || step === "saving") && (
        <>
          {preview && (
            <div className="card receipt-frame">
              <img className="od-media" src={preview} alt="Receipt preview" />
            </div>
          )}

          {!ocrResult && (
            <div className="card" style={{ textAlign: "center" }}>
              <div className="spinner" role="status" aria-label="Processing receipt" />
              <p className="screen-sub" style={{ marginTop: 14 }}>Processing receipt with OCR...</p>
            </div>
          )}

          {ocrResult && (
            <div className="card">
              <div className="od-row" style={{ justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap" }}>
                <h3 className="card__title" style={{ margin: 0 }}>Extracted Details</h3>
                <span className={"tag" + (ocrResult.confidence === "good" ? "" : " tag--ocr")}>
                  {ocrResult.confidence === "good" ? "✓ High confidence" : "⚠ Low — please verify"}
                </span>
              </div>

              <div className="od-stack" style={{ "--od-gap": "16px" }}>
                <div className="od-field">
                  <label className="field-label" htmlFor="scanAmount">Amount (₹) <span aria-hidden="true">*</span></label>
                  <input
                    id="scanAmount"
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                    placeholder="Enter amount"
                  />
                </div>

                <div className="od-field">
                  <label className="field-label" htmlFor="scanDesc">Merchant / Description</label>
                  <input
                    id="scanDesc"
                    className="input"
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Merchant or item name"
                  />
                </div>

                <div className="od-field">
                  <span className="field-label">Category</span>
                  <div className="od-cluster" style={{ "--od-gap": "8px" }}>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        className={"chip chip--icon" + (form.category === cat.name ? " is-on" : "")}
                        aria-pressed={form.category === cat.name}
                        onClick={() => setForm((p) => ({ ...p, category: cat.name, itemType: "" }))}
                      >
                        {cat.icon} {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedCatItems.length > 0 && (
                  <div className="od-field">
                    <span className="field-label">Item Type</span>
                    <div className="od-cluster" style={{ "--od-gap": "6px" }}>
                      {selectedCatItems.map((item) => (
                        <button
                          key={item}
                          type="button"
                          className={"chip chip--sm" + (form.itemType === item ? " is-on" : "")}
                          onClick={() => setForm((p) => ({ ...p, itemType: item }))}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="od-field">
                  <label className="field-label" htmlFor="scanDate">Date</label>
                  <input
                    id="scanDate"
                    className="input"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  />
                </div>

                <div>
                  <button type="button" className="btn btn--ghost btn--sm" aria-expanded={showRawText} onClick={() => setShowRawText(!showRawText)}>
                    {showRawText ? "▾" : "▸"} Raw OCR Text
                  </button>
                  {showRawText && (
                    <pre className="raw">{rawText || "(empty)"}</pre>
                  )}
                </div>

                <div className="od-row" style={{ "--od-gap": "12px", flexWrap: "wrap" }}>
                  <button onClick={handleSave} disabled={step === "saving"} className="btn btn--green" style={{ flex: "1 1 200px" }}>
                    {step === "saving" ? (
                      <>
                        <span className="spinner" style={{ width: 22, height: 22, borderWidth: 4, margin: 0 }} aria-hidden="true" />
                        Saving...
                      </>
                    ) : "Save Expense"}
                  </button>
                  <button onClick={handleReset} className="btn btn--ghost">Start Over</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <p className="tiny-note">Tip: receipts with a clear printed TOTAL line scan best.</p>
    </div>
  );
}
