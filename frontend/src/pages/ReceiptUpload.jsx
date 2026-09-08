import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { extractOcr, createExpense, fetchCategories } from "../api.js";
import { today } from "../constants.js";

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
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const dt = new DataTransfer();
      dt.items.add(file);
      if (fileInputRef.current) fileInputRef.current.files = dt.files;
      handleFileSelect({ target: { files: [file] } });
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
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Scan Receipt</h2>

      {step === "upload" && (
        <div
          className="card p-8 border-2 border-dashed border-gray-300 hover:border-brand-400 transition-colors cursor-pointer text-center relative"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="space-y-3">
            <div className="text-5xl">📸</div>
            <div>
              <p className="text-lg font-medium text-gray-700">Upload a receipt or payment screenshot</p>
              <p className="text-sm text-gray-500 mt-1">JPEG, PNG, WebP, or GIF — up to 10MB</p>
            </div>
            <button
              className="btn-primary"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              Choose File
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            style={{ position: "absolute", top: 0, left: 0 }}
            onChange={handleFileSelect}
          />
        </div>
      )}

      {(step === "review" || step === "saving") && (
        <>
          {preview && (
            <div className="card overflow-hidden">
              <img src={preview} alt="Receipt preview" className="w-full max-h-64 object-contain bg-gray-50" />
            </div>
          )}

          {!ocrResult && (
            <div className="card p-8 text-center">
              <div className="flex flex-col items-center gap-3">
                <svg className="animate-spin h-8 w-8 text-brand-600" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-gray-600 font-medium">Processing receipt with OCR...</p>
                <p className="text-sm text-gray-400">This may take a few seconds</p>
              </div>
            </div>
          )}

          {ocrResult && (
            <div className="card p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Extracted Details</h3>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${ocrResult.confidence === "good" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {ocrResult.confidence === "good" ? "✓ High confidence" : "⚠ Low confidence — verify below"}
                </span>
              </div>

              <div>
                <label className="label">Amount (₹)</label>
                <input type="number" className="input" step="0.01" min="0" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="Enter amount" />
              </div>

              <div>
                <label className="label">Description / Merchant</label>
                <input type="text" className="input" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Merchant or item name" />
              </div>

              <div>
                <label className="label">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, category: cat.name, itemType: "" }))}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                        form.category === cat.name
                          ? "bg-brand-50 border-brand-500 text-brand-700 ring-2 ring-brand-500/20"
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {cat.icon} {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {selectedCatItems.length > 0 && (
                <div>
                  <label className="label">Item Type</label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCatItems.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, itemType: item }))}
                        className={`text-xs px-2.5 py-1.5 rounded-full border transition-all ${
                          form.itemType === item
                            ? "bg-brand-50 border-brand-500 text-brand-700"
                            : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="label">Date</label>
                <input type="date" className="input" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
              </div>

              <div>
                <button type="button" onClick={() => setShowRawText(!showRawText)} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                  <span className={`transition-transform ${showRawText ? "rotate-90" : ""}`}>▶</span>
                  Raw OCR Text (for debugging)
                </button>
                {showRawText && (
                  <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 overflow-auto max-h-40 whitespace-pre-wrap">
                    {rawText || "(empty)"}
                  </pre>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={handleSave} disabled={step === "saving"} className="btn-primary flex-1">
                  {step === "saving" ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving...
                    </span>
                  ) : "Save Expense"}
                </button>
                <button onClick={handleReset} className="btn-secondary">Start Over</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
