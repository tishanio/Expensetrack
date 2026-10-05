import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { toast } from "../sounds.js";
import { extractOcr, createExpense, fetchCategories } from "../api.js";
import { today } from "../constants.js";
import { compressWithPreview } from "../utils.js";
import { ScreenHead } from "../components/retro.jsx";

const isNative =
  typeof window !== "undefined" && !!window.Capacitor?.isNativePlatform?.();

export default function ReceiptUpload() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

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

  // Shared ingestion path: compress (resize + JPEG re-encode), then preview
  // and OCR the exact same pixels.
  const ingest = async (rawBlob) => {
    try {
      const [blob, dataUrl] = await compressWithPreview(rawBlob);
      setPreview(dataUrl);
      processImage(blob);
    } catch (err) {
      toast.error(err?.message || "Could not read image");
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    ingest(file);
  };

  // Native camera capture (Android/iOS via Capacitor). On web, falls back to
  // a file input with capture="environment" so mobile browsers still open
  // their camera app.
  const capturePhoto = async () => {
    if (!isNative) {
      cameraInputRef.current?.click();
      return;
    }
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        quality: 90,
        width: 1600,
        correctOrientation: true,
        saveToGallery: false,
      });
      if (!photo.webPath) throw new Error("No image returned from camera");

      const res = await fetch(photo.webPath);
      ingest(await res.blob());
    } catch (err) {
      // User closing the camera without taking a photo is not an error worth a toast.
      if (err?.message?.includes("cancel")) return;
      toast.error(err?.message || "Could not open camera");
    }
  };

  // Pick an existing receipt image from the device gallery.
  // Native: @capacitor/camera photo picker. Web: the plain file input
  // already is a gallery picker, so the extra button is hidden there.
  const pickFromGallery = async () => {
    if (!isNative) {
      fileInputRef.current?.click();
      return;
    }
    try {
      const { results } = await Camera.chooseFromGallery({
        quality: 90,
        targetWidth: 1600,
        targetHeight: 1600,
        correctOrientation: true,
      });
      const photo = results?.[0];
      if (!photo?.webPath) return; // user cancelled
      const res = await fetch(photo.webPath);
      ingest(await res.blob());
    } catch (err) {
      if (err?.message?.includes("cancel")) return;
      toast.error(err?.message || "Could not open gallery");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      ingest(file);
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
      // Only trust the OCR category if it still exists (it may have been
      // renamed/deleted since the categorizer's rules were written).
      const suggested = result.category;
      const validCategory = categories.some((c) => c.name === suggested)
        ? suggested
        : categories.find((c) => c.name === "Others")?.name || categories[0]?.name || "";
      setForm({
        amount: result.amount ? String(result.amount) : "",
        category: validCategory,
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
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <div>
      <ScreenHead title="Scan Receipt" sub="Snap a bill. We guess the numbers — then you fix them." />

      {step === "upload" && (
        <div className="card">
          {/* Dropzone is ONLY drag-drop + tap-to-pick-file. The action buttons
              live OUTSIDE it below — nested buttons would bubble their clicks
              up to the dropzone's onClick and pop the file chooser over the
              native camera/gallery flows. */}
          <div
            className={"dropzone" + (dragOver ? " is-over" : "")}
            role="button"
            tabIndex={0}
            aria-label="Upload a receipt image from files"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <span className="dropzone__emoji" aria-hidden="true">📸</span>
            <span className="dropzone__head">Drop a receipt here</span>
            <p className="screen-sub" style={{ margin: "8px 0 0" }}>JPEG, PNG, WebP or GIF — up to 10MB</p>
          </div>

          <div className="od-cluster" style={{ "--od-gap": "10px", justifyContent: "center", marginTop: 14 }}>
            <button type="button" className="btn btn--pink" onClick={capturePhoto}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8a2 2 0 012-2h2l2-2h6l2 2h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><circle cx="12" cy="13" r="3.4" /></svg>
              Take Photo
            </button>
            {isNative && (
              <button type="button" className="btn btn--cyan" onClick={pickFromGallery}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.8" /><path d="M21 15l-5-5L5 21" /></svg>
                Pick from Gallery
              </button>
            )}
            <button type="button" className="btn btn--ghost" onClick={() => fileInputRef.current?.click()}>
              Choose File
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={handleFileSelect}
          />
          {/* Web/mobile-browser camera fallback: opens the rear camera directly */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
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
