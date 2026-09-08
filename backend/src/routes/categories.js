import { Router } from "express";
import { ObjectId } from "mongodb";
import { getCategories } from "../db.js";

const router = Router();

// Default categories with sub-items to seed on first run
const DEFAULT_CATEGORIES = [
  {
    name: "Food",
    icon: "🍔",
    items: ["Biriyani", "Chapathi", "Dosa", "Idli", "Pizza", "Burger", "Rice & Dal", "Snacks", "Tea/Coffee", "Juice", "Cake", "Other"],
  },
  {
    name: "Transport",
    icon: "🚗",
    items: ["Bus", "Auto", "Train", "Cab", "Metro", "Petrol", "Parking", "Toll", "Flight", "Bike Rental", "Other"],
  },
  {
    name: "Shopping",
    icon: "🛍️",
    items: ["Clothes", "Shoes", "Electronics", "Accessories", "Home Decor", "Groceries", "Books", "Gifts", "Other"],
  },
  {
    name: "Bills",
    icon: "📄",
    items: ["Electricity", "Water", "Internet", "Phone Recharge", "DTH/Cable", "Gas", "Rent", "Maintenance", "Other"],
  },
  {
    name: "Entertainment",
    icon: "🎬",
    items: ["Movie", "Concert", "Gaming", "Sports", "Streaming", "Books", "Events", "Other"],
  },
  {
    name: "Healthcare",
    icon: "🏥",
    items: ["Doctor Visit", "Medicine", "Lab Tests", "Dental", "Gym", "Vitamins", "Other"],
  },
  {
    name: "Education",
    icon: "📚",
    items: ["Tuition", "Books", "Courses", "Stationery", "Exam Fees", "Other"],
  },
  {
    name: "Utilities",
    icon: "💡",
    items: ["Electricity", "Water", "Internet", "Gas", "Other"],
  },
  {
    name: "Rent",
    icon: "🏠",
    items: ["House Rent", "Office Rent", "Storage", "Parking", "Other"],
  },
  {
    name: "Travel",
    icon: "✈️",
    items: ["Flight", "Hotel", "Food (Trip)", "Sightseeing", "Local Transport", "Shopping (Trip)", "Other"],
  },
  {
    name: "Stationery",
    icon: "📝",
    items: ["Pen", "Pencil", "Notebook", "Paper", "Printer Ink", "Files", "Other"],
  },
  {
    name: "Others",
    icon: "📦",
    items: ["Miscellaneous", "Other"],
  },
];

/**
 * Seed default categories if none exist.
 */
export async function seedDefaultCategories() {
  const col = getCategories();
  const count = await col.countDocuments();
  if (count === 0) {
    const docs = DEFAULT_CATEGORIES.map((c) => ({
      ...c,
      isDefault: true,
      created_at: new Date().toISOString(),
    }));
    await col.insertMany(docs);
    console.log(`Seeded ${docs.length} default categories.`);
  }
}

/**
 * GET /api/categories
 * List all categories.
 */
router.get("/", async (req, res) => {
  try {
    const col = getCategories();
    const categories = await col.find().sort({ name: 1 }).toArray();
    res.json(
      categories.map((c) => ({
        ...c,
        id: c._id.toString(),
        _id: undefined,
      }))
    );
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

/**
 * GET /api/categories/:id
 * Get a single category.
 */
router.get("/:id", async (req, res) => {
  try {
    const col = getCategories();
    let objectId;
    try {
      objectId = new ObjectId(req.params.id);
    } catch {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    const cat = await col.findOne({ _id: objectId });
    if (!cat) return res.status(404).json({ error: "Category not found" });

    res.json({ ...cat, id: cat._id.toString(), _id: undefined });
  } catch (err) {
    console.error("Error fetching category:", err);
    res.status(500).json({ error: "Failed to fetch category" });
  }
});

/**
 * POST /api/categories
 * Create a new category.
 */
router.post("/", async (req, res) => {
  try {
    const { name, icon, items } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const col = getCategories();

    // Check for duplicate name
    const existing = await col.findOne({ name: name.trim() });
    if (existing) {
      return res.status(409).json({ error: "Category with this name already exists" });
    }

    const doc = {
      name: name.trim(),
      icon: icon || "📦",
      items: Array.isArray(items) ? items.filter((i) => i.trim()) : [],
      isDefault: false,
      created_at: new Date().toISOString(),
    };

    const result = await col.insertOne(doc);
    res.status(201).json({ ...doc, id: result.insertedId.toString() });
  } catch (err) {
    console.error("Error creating category:", err);
    res.status(500).json({ error: "Failed to create category" });
  }
});

/**
 * PUT /api/categories/:id
 * Update a category (name, icon, items).
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, items } = req.body;

    const col = getCategories();
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    const existing = await col.findOne({ _id: objectId });
    if (!existing) return res.status(404).json({ error: "Category not found" });

    const updateFields = {};
    if (name !== undefined) updateFields.name = name.trim();
    if (icon !== undefined) updateFields.icon = icon;
    if (items !== undefined && Array.isArray(items)) {
      updateFields.items = items.filter((i) => i && i.trim());
    }

    // Check duplicate name if changing
    if (updateFields.name) {
      const dup = await col.findOne({
        name: updateFields.name,
        _id: { $ne: objectId },
      });
      if (dup) {
        return res.status(409).json({ error: "Category with this name already exists" });
      }
    }

    await col.updateOne({ _id: objectId }, { $set: updateFields });
    const updated = await col.findOne({ _id: objectId });
    res.json({ ...updated, id: updated._id.toString(), _id: undefined });
  } catch (err) {
    console.error("Error updating category:", err);
    res.status(500).json({ error: "Failed to update category" });
  }
});

/**
 * DELETE /api/categories/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const col = getCategories();
    let objectId;
    try {
      objectId = new ObjectId(req.params.id);
    } catch {
      return res.status(400).json({ error: "Invalid category ID" });
    }

    const result = await col.deleteOne({ _id: objectId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json({ message: "Category deleted" });
  } catch (err) {
    console.error("Error deleting category:", err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
