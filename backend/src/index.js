import express from "express";
import cors from "cors";
import { connectDb, closeDb } from "./db.js";
import { seedDefaultCategories } from "./routes/categories.js";
import expensesRouter from "./routes/expenses.js";
import categoriesRouter from "./routes/categories.js";
import ocrRouter from "./routes/ocr.js";

const PORT = process.env.PORT || 3001;

async function main() {
  await connectDb();
  await seedDefaultCategories();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use("/api/expenses", expensesRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/ocr", ocrRouter);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  app.listen(PORT, () => {
    console.log(`ExpenseSnap backend running on http://localhost:${PORT}`);
  });
}

process.on("SIGINT", async () => { await closeDb(); process.exit(0); });
process.on("SIGTERM", async () => { await closeDb(); process.exit(0); });

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
