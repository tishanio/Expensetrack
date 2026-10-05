# 📸 Expensetrack — Smart Expense Tracker

ExpenseSnap is a full-stack personal expense tracker with manual entry, receipt OCR, category and item analytics, CSV export, and an Android app powered by Capacitor.

## Features

- **Expense tracking:** create, edit, and delete expenses; choose a category, item, amount, description, and date.
- **Receipt scanning:** select an image or use a native camera/gallery flow; OCR suggests the amount, date, merchant, and category for review before saving.
- **Analytics:** view dashboard totals, category breakdowns, monthly trends, and category/item trends by day, week, month, or year.
- **Category management:** create, edit, and delete categories, with icons and optional item lists.
- **Search, filters, and export:** filter expenses by date, category, source, and item; sort results and export the displayed list to CSV.
- **Retro responsive interface:** mobile navigation, synthesized interaction sounds, and persistent mute/volume controls.

## Tech Stack

- **Frontend:** React 18, Vite, TailwindCSS, Recharts, React Router, React Hot Toast
- **Backend:** Node.js, Express
- **Database:** MongoDB
- **OCR:** Tesseract.js v5, executed by the backend after image upload
- **Native app:** Capacitor 8 and Android Gradle project

## Project Structure

```text
backend/
  src/                 Express server, MongoDB helpers, routes, OCR and parsing services
  test/                Node.js tests for parsing and OCR worker behavior
frontend/
  src/pages/           Dashboard, expense entry/list, receipt scan, breakdown, categories
  src/components/      Shared retro UI components
  android/             Capacitor Android project
  capacitor.config.json
e2e/                   Receipt fixture and captured test screenshots
scripts/               Browser/E2E helper scripts
```

## Setup & Running

### Prerequisites

- Node.js and npm
- MongoDB Community Server or a MongoDB Atlas connection string
- For Android builds: Android Studio/Android SDK and a compatible JDK

### 1. Start MongoDB

Start the MongoDB service, or configure `MONGO_URI` to use a hosted instance. At startup the backend ensures the built-in categories exist and inserts demo expenses if the expenses collection is empty. Demo records have `source: "demo"`; they can be seeded again if the collection is emptied.

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

### Run the backend tests

```bash
cd backend
npm test
```

### Android app

Build the web assets, sync them into the Capacitor Android project, then open the project in Android Studio:

```bash
cd frontend
npm run build
npx cap sync android
npx cap open android
```

The default native API address is `http://10.0.2.2:3001/api`, which reaches the host machine from the Android emulator. For a physical device or another deployment, set `VITE_API_BASE` to a backend URL reachable from that device before building. `VITE_API_BASE` must include the `/api` path. The Vite development proxy is only used when running the web dev server.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend server port |
| `MONGO_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `DB_NAME` | `expensesnap` | MongoDB database name |
| `VITE_API_BASE` | `/api` on web; `http://10.0.2.2:3001/api` in native mode | Frontend API base URL; include `/api` |

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/expenses` | List expenses; optional filters: `category`, `itemType`, `startDate`, `endDate`, `source`; sorting: `sort` (`date`, `amount`, `created_at`) and `order` (`asc`, `desc`) |
| `POST` | `/api/expenses` | Create expense (`amount`, `category`, `date`, optional `description`, `itemType`, `source`, `rawOcrText`) |
| `PUT` | `/api/expenses/:id` | Update expense fields |
| `DELETE` | `/api/expenses/:id` | Delete an expense |
| `GET` | `/api/expenses/stats` | Dashboard aggregates; optional `startDate`, `endDate` |
| `GET` | `/api/expenses/breakdown` | Category/item breakdown and trend; optional `category`, `startDate`, `endDate`, `period` (`daily`, `weekly`, `monthly`, `yearly`) |
| `GET` | `/api/expenses/search` | Search item/description matches using `q`; optional `category` |
| `GET`, `POST` | `/api/categories` | List or create categories (`name`, `icon`, `items`) |
| `GET`, `PUT`, `DELETE` | `/api/categories/:id` | Read, update, or delete a category |
| `POST` | `/api/ocr/extract` | OCR image upload as `multipart/form-data`, file field `receipt` (max 10 MB) |
| `POST` | `/api/ocr/preprocess-debug` | Return a preprocessed JPEG for OCR diagnostics |
| `GET` | `/api/health` | Health check |

## How the OCR + Categorization Pipeline Works

### Step 1: Image Upload
The user chooses a JPEG, PNG, WebP, or GIF image (max 10 MB). On web this uses the file picker/camera input; Capacitor builds can use the device camera or gallery. The client resizes and re-encodes the image before upload.

### Step 2: OCR Text Extraction
The image is sent to the backend as a `multipart/form-data` POST. The backend preprocesses it and uses **Tesseract.js v5** with English language data to extract text. A shared OCR worker is warmed when the server starts.

### Step 3: Text Parsing (`parseService.js`)
The parser extracts an amount, date, and merchant hint from OCR text:

1. **Amount:** prioritizes a non-subtotal total line, then other amount keywords; it can also use the largest currency-prefixed value, followed by a plain-number fallback. Currency prefixes include common symbols, `Rs`, and `INR`.
2. **Date:** recognizes numeric dates and written month names; uses today's date when no date is detected.
3. **Merchant:** selects the first suitable non-numeric line among the first five non-empty lines.

### Step 4: Auto-Categorization (`categorizeService.js`)
The extracted merchant name and description are matched against built-in keyword rules. The current rules cover these categories:

| Category | Example Keywords |
|----------|-----------------|
| Food | swiggy, zomato, restaurant, cafe, grocery, pizza... |
| Transport | uber, ola, bus, metro, petrol, fuel, parking... |
| Shopping | amazon, flipkart, clothes, electronics, mobile... |
| Bills | electricity, internet, rent, emi, insurance... |
| Stationery | pen, notebook, printer, ink, book, diary... |

The most specific matching keyword wins. Unmatched text falls back to `Others`; custom categories are managed in the app but are not automatically included in these keyword rules.

### Step 5: Review & Save
The suggested amount, date, merchant/description, and category are shown for review and can be edited before saving. The raw OCR text is retained with the expense for diagnostics.

## MongoDB Schema

The `expenses` collection stores documents with this structure:

```json
{
  "_id": ObjectId,
  "amount": 450,
  "category": "Food",
  "item_type": "Meal",
  "description": "Zomato order",
  "date": "2026-09-03",
  "source": "manual",
  "raw_ocr_text": null,
  "created_at": "2026-09-03T06:33:52.841Z"
}
```

**Indexes:** `date`, `category`, `source`, `category + date` (compound)

The backend also indexes `item_type` and enforces unique category names.

## License

MIT
