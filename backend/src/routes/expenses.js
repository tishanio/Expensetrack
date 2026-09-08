import { Router } from "express";
import { ObjectId } from "mongodb";
import { getExpenses, getCategories } from "../db.js";

const router = Router();

/**
 * GET /api/expenses
 * List all expenses with optional filters.
 */
router.get("/", async (req, res) => {
  try {
    const { category, startDate, endDate, source, sort, order, itemType } = req.query;
    const col = getExpenses();

    const filter = {};
    if (category) filter.category = category;
    if (itemType) filter.item_type = itemType;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }
    if (source) filter.source = source;

    const sortField = ["date", "amount", "created_at"].includes(sort)
      ? sort
      : "date";
    const sortDir = order === "asc" ? 1 : -1;

    const expenses = await col
      .find(filter)
      .sort({ [sortField]: sortDir })
      .toArray();

    res.json(
      expenses.map((e) => ({
        ...e,
        id: e._id.toString(),
        _id: undefined,
      }))
    );
  } catch (err) {
    console.error("Error fetching expenses:", err);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

/**
 * GET /api/expenses/stats
 * Return aggregated stats for the dashboard.
 */
router.get("/stats", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const col = getExpenses();

    const dateFilter = {};
    if (startDate) dateFilter.$gte = startDate;
    if (endDate) dateFilter.$lte = endDate;
    const matchStage = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};

    const totalResult = await col
      .aggregate([
        { $match: matchStage },
        { $group: { _id: null, totalSpend: { $sum: "$amount" }, totalCount: { $sum: 1 } } },
      ])
      .toArray();

    const totalSpend = totalResult[0]?.totalSpend || 0;
    const totalCount = totalResult[0]?.totalCount || 0;

    const categoryBreakdown = await col
      .aggregate([
        { $match: matchStage },
        { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $project: { _id: 0, category: "$_id", total: 1, count: 1 } },
      ])
      .toArray();

    const monthlyTrend = await col
      .aggregate([
        { $match: matchStage },
        { $group: { _id: { $substr: ["$date", 0, 7] }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, month: "$_id", total: 1, count: 1 } },
      ])
      .toArray();

    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthResult = await col
      .aggregate([
        { $match: { date: { $gte: currentMonth + "-01", $lte: currentMonth + "-31" } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ])
      .toArray();

    const topCategoryResult = await col
      .aggregate([
        { $match: { date: { $gte: currentMonth + "-01", $lte: currentMonth + "-31" } } },
        { $group: { _id: "$category", total: { $sum: "$amount" } } },
        { $sort: { total: -1 } },
        { $limit: 1 },
      ])
      .toArray();

    res.json({
      totalSpend,
      totalCount,
      categoryBreakdown,
      monthlyTrend,
      currentMonthTotal: currentMonthResult[0]?.total || 0,
      topCategoryCurrentMonth: topCategoryResult[0]?._id || null,
    });
  } catch (err) {
    console.error("Error fetching stats:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

/**
 * GET /api/expenses/breakdown
 * Category-wise item breakdown with frequency and totals.
 * Query: category, startDate, endDate, period (daily|weekly|monthly|yearly)
 */
router.get("/breakdown", async (req, res) => {
  try {
    const { category, startDate, endDate, period } = req.query;
    const col = getExpenses();

    const matchStage = {};
    if (category) matchStage.category = category;
    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) matchStage.date.$gte = startDate;
      if (endDate) matchStage.date.$lte = endDate;
    }

    // Aggregate by category + item_type
    const itemBreakdown = await col
      .aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { category: "$category", item_type: { $ifNull: ["$item_type", "Unspecified"] } },
            totalAmount: { $sum: "$amount" },
            frequency: { $sum: 1 },
            avgAmount: { $avg: "$amount" },
            lastPurchase: { $max: "$date" },
          },
        },
        {
          $group: {
            _id: "$_id.category",
            items: {
              $push: {
                itemType: "$_id.item_type",
                totalAmount: { $round: ["$totalAmount", 2] },
                frequency: "$frequency",
                avgAmount: { $round: ["$avgAmount", 2] },
                lastPurchase: "$lastPurchase",
              },
            },
            categoryTotal: { $sum: "$totalAmount" },
            categoryCount: { $sum: "$frequency" },
          },
        },
        {
          $project: {
            _id: 0,
            category: "$_id",
            categoryTotal: { $round: ["$categoryTotal", 2] },
            categoryCount: 1,
            items: {
              $sortArray: { input: "$items", sortBy: { totalAmount: -1 } },
            },
          },
        },
        { $sort: { categoryTotal: -1 } },
      ])
      .toArray();

    // Time-based trend for the selected category
    let trendData = [];
    if (category) {
      let groupId;
      if (period === "daily") {
        groupId = { $substr: ["$date", 0, 10] };
      } else if (period === "weekly") {
        groupId = { $concat: [{ $substr: ["$date", 0, 4] }, "-W", { $substr: [{ $toString: { $isoWeek: { $dateFromString: { dateString: "$date" } } } }, 0, 2] }] };
      } else if (period === "yearly") {
        groupId = { $substr: ["$date", 0, 4] };
      } else {
        // monthly (default)
        groupId = { $substr: ["$date", 0, 7] };
      }

      trendData = await col
        .aggregate([
          { $match: { category, ...(matchStage.date ? { date: matchStage.date } : {}) } },
          { $group: { _id: groupId, total: { $sum: "$amount" }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, period: "$_id", total: 1, count: 1 } },
        ])
        .toArray();
    }

    res.json({ breakdown: itemBreakdown, trend: trendData });
  } catch (err) {
    console.error("Error fetching breakdown:", err);
    res.status(500).json({ error: "Failed to fetch breakdown" });
  }
});

/**
 * GET /api/expenses/search
 * Search item types for autocomplete.
 * Query: q (search term), category (optional)
 */
router.get("/search", async (req, res) => {
  try {
    const { q, category } = req.query;
    const col = getExpenses();

    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    const matchStage = {
      item_type: { $regex: q, $options: "i" },
    };
    if (category) matchStage.category = category;

    const results = await col
      .aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { category: "$category", item_type: "$item_type" },
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 0,
            category: "$_id.category",
            itemType: "$_id.item_type",
            count: 1,
            totalAmount: { $round: ["$totalAmount", 2] },
          },
        },
      ])
      .toArray();

    res.json(results);
  } catch (err) {
    console.error("Error searching items:", err);
    res.status(500).json({ error: "Failed to search items" });
  }
});

/**
 * POST /api/expenses
 * Create a new expense.
 */
router.post("/", async (req, res) => {
  try {
    const { amount, category, description, date, source, rawOcrText, itemType } = req.body;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }
    if (!category) {
      return res.status(400).json({ error: "Category is required" });
    }
    // Validate category exists
    const catCol = getCategories();
    const catExists = await catCol.findOne({ name: category });
    if (!catExists) {
      return res.status(400).json({ error: `Category '${category}' does not exist. Create it first.` });
    }
    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }

    const col = getExpenses();
    const doc = {
      amount: parseFloat(amount),
      category,
      item_type: itemType || "Other",
      description: description || "",
      date,
      source: source || "manual",
      raw_ocr_text: rawOcrText || null,
      created_at: new Date().toISOString(),
    };

    const result = await col.insertOne(doc);
    res.status(201).json({ ...doc, id: result.insertedId.toString() });
  } catch (err) {
    console.error("Error creating expense:", err);
    res.status(500).json({ error: "Failed to create expense" });
  }
});

/**
 * PUT /api/expenses/:id
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, category, description, date, itemType } = req.body;

    const col = getExpenses();
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return res.status(400).json({ error: "Invalid expense ID" });
    }

    const existing = await col.findOne({ _id: objectId });
    if (!existing) return res.status(404).json({ error: "Expense not found" });

    const updateFields = {};
    if (amount !== undefined) updateFields.amount = parseFloat(amount);
    if (category !== undefined) {
      // Validate category exists
      const catCol = getCategories();
      const catExists = await catCol.findOne({ name: category });
      if (!catExists) {
        return res.status(400).json({ error: `Category '${category}' does not exist.` });
      }
      updateFields.category = category;
    }
    if (description !== undefined) updateFields.description = description;
    if (date !== undefined) updateFields.date = date;
    if (itemType !== undefined) updateFields.item_type = itemType;

    await col.updateOne({ _id: objectId }, { $set: updateFields });
    const updated = await col.findOne({ _id: objectId });
    res.json({ ...updated, id: updated._id.toString(), _id: undefined });
  } catch (err) {
    console.error("Error updating expense:", err);
    res.status(500).json({ error: "Failed to update expense" });
  }
});

/**
 * DELETE /api/expenses/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const col = getExpenses();
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return res.status(400).json({ error: "Invalid expense ID" });
    }
    const result = await col.deleteOne({ _id: objectId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Expense not found" });
    }
    res.json({ message: "Expense deleted" });
  } catch (err) {
    console.error("Error deleting expense:", err);
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

export default router;
