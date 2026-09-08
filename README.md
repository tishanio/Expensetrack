# 📸 Expensetrack — Smart Expense Tracker

A full-stack web application for tracking personal expenses with OCR receipt scanning, auto-categorization, and analytics dashboards.

## Features

| Feature | Description |
|---------|-------------|
| **Manual Entry** | Add expenses with amount, category, description, and date |
| **Receipt Scanning** | Upload a photo/screenshot → OCR extracts amount, date, merchant |
| **Auto-Categorization** | Smart keyword matching assigns categories automatically |
| **Dashboard** | Pie chart, monthly trend bar chart, summary stats |
| **Filters & Sort** | Filter by date range, category, source; sort by date/amount |
| **Responsive UI** | Mobile-friendly with bottom navigation on small screens |

## Tech Stack

- **Frontend:** React 18, Vite, TailwindCSS, Recharts, React Router, React Hot Toast
- **Backend:** Node.js, Express
- **Database:** MongoDB
- **OCR:** Tesseract.js v5 (client-to-server pipeline)

## Project Structure

```
expense-snap/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express server entry
│   │   ├── db.js                 # MongoDB connection & collection helpers
│   │   ├── routes/
│   │   │   ├── expenses.js       # CRUD + stats API (MongoDB aggregation)
│   │   │   └── ocr.js            # Image upload + OCR endpoint
│   │   └── services/
│   │       ├── ocrService.js     # Tesseract.js wrapper
│   │       ├── parseService.js   # Extract amount/date/merchant from text
│   │       └── categorizeService.js  # Keyword-based auto-categorization
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.jsx              # React entry + Router + Toaster
│   │   ├── App.jsx               # Layout + routing
│   │   ├── api.js                # Fetch wrapper for all API calls
│   │   ├── constants.js          # Categories, colors, formatters
│   │   ├── index.css             # Tailwind + custom component styles
│   │   └── pages/
│   │       ├── Dashboard.jsx     # Charts, stats, filters
│   │       ├── AddExpense.jsx    # Manual expense form
│   │       ├── ReceiptUpload.jsx # OCR upload + review form
│   │       └── ExpenseList.jsx   # Filterable/sortable expense list
│   ├── index.html
│   └── package.json
└── README.md
```

## Setup & Running

### Prerequisites

- **Node.js** v18+ (tested with v24)
- **npm** v9+
- **MongoDB Community Server** installed locally, or a MongoDB Atlas connection string

### 1. Start MongoDB

On Windows, start the **MongoDB Server** service. On macOS/Linux, start your local `mongod` service. A hosted MongoDB connection can also be used through `MONGO_URI`.

The backend automatically creates the default categories and adds demo expenses when the database has no expenses yet. Demo records use `source: "demo"` and are only inserted once.

```powershell
# Optional local health check
mongosh "mongodb://localhost:27017/expensesnap" --eval "db.runCommand({ ping: 1 })"
```

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in a separate terminal)
cd frontend
npm install
```

### 3. Start the Backend

```bash
cd backend
npm run dev
```

The server starts on `http://localhost:3001` and connects to MongoDB at `mongodb://localhost:27017/expensesnap` by default.

### 4. Start the Frontend

```bash
cd frontend
npm run dev
```

The app opens at `http://localhost:5173`. API calls are proxied to the backend automatically.

### 5. Open the App

Visit [http://localhost:5173](http://localhost:5173) in your browser.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend server port |
| `MONGO_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `DB_NAME` | `expensesnap` | MongoDB database name |

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/expenses` | List expenses (filters: `category`, `startDate`, `endDate`, `source`, `sort`, `order`) |
| `GET` | `/api/expenses/stats` | Dashboard stats with aggregation pipeline (filters: `startDate`, `endDate`) |
| `POST` | `/api/expenses` | Create expense |
| `PUT` | `/api/expenses/:id` | Update expense |
| `DELETE` | `/api/expenses/:id` | Delete expense |
| `POST` | `/api/ocr/extract` | Upload image for OCR (`multipart/form-data`, field: `receipt`) |
| `GET` | `/api/health` | Health check |

## How the OCR + Categorization Pipeline Works

### Step 1: Image Upload
The user uploads a JPEG/PNG/WebP/GIF image via the drag-and-drop zone or file picker (max 10MB).

### Step 2: OCR Text Extraction
The image is sent to the backend as a `multipart/form-data` POST. The backend uses **Tesseract.js v5** (a pure JavaScript/WASM port of the Tesseract OCR engine) to run optical character recognition and extract raw text from the image.

### Step 3: Text Parsing (`parseService.js`)
The raw OCR text is processed through a multi-strategy parser:

1. **Amount Detection** — First looks for keyword-prefixed values (`Total:`, `Amount:`, `Paid:`, etc.), then falls back to finding the largest currency-symbol-prefixed number, then to the largest plain number.
2. **Date Detection** — Tries multiple date formats: `DD/MM/YYYY`, `DD-MM-YYYY`, `YYYY-MM-DD`, and written month names (`Jan 12, 2024`). Falls back to today's date if none found.
3. **Merchant Extraction** — Takes the first non-numeric, non-trivial line as the merchant/item name (up to 100 chars).

### Step 4: Auto-Categorization (`categorizeService.js`)
The extracted merchant name and description are matched against a keyword dictionary for each category:

| Category | Example Keywords |
|----------|-----------------|
| Food | swiggy, zomato, restaurant, cafe, grocery, pizza... |
| Transport | uber, ola, bus, metro, petrol, fuel, parking... |
| Shopping | amazon, flipkart, clothes, electronics, mobile... |
| Bills | electricity, internet, rent, emi, insurance... |
| Stationery | pen, notebook, printer, ink, book, diary... |

Keywords are scored by length (longer = more specific), and the highest-scoring category wins. Defaults to "Others" if no keywords match.

### Step 5: Review & Save
The extracted fields (amount, date, merchant, category) are shown in an editable form. The user can correct any misextracted data before saving. The raw OCR text is stored in MongoDB for audit/debugging purposes.

## MongoDB Schema

The `expenses` collection stores documents with this structure:

```json
{
  "_id": ObjectId,
  "amount": 450,
  "category": "Food",
  "description": "Zomato order",
  "date": "2026-09-03",
  "source": "manual",
  "raw_ocr_text": null,
  "created_at": "2026-09-03T06:33:52.841Z"
}
```

**Indexes:** `date`, `category`, `source`, `category + date` (compound)

## License

MIT
