import { getExpenses } from "../db.js";

const DEMO_EXPENSES = [
  ["Food", "Lunch at Green Bowl", 420, "Lunch"],
  ["Transport", "Metro card recharge", 600, "Metro"],
  ["Shopping", "Everyday essentials", 1890, "Groceries"],
  ["Bills", "Internet bill", 999, "Internet"],
  ["Entertainment", "Weekend movie", 720, "Movie"],
  ["Healthcare", "Pharmacy", 580, "Medicine"],
  ["Education", "Design course", 2400, "Courses"],
  ["Utilities", "Electricity bill", 1450, "Electricity"],
  ["Rent", "Monthly apartment rent", 22000, "House Rent"],
  ["Travel", "Hotel booking", 4800, "Hotel"],
  ["Stationery", "Notebook and pens", 340, "Notebook"],
  ["Personal Care", "Salon appointment", 850, "Salon"],
  ["Pets", "Pet food", 1250, "Pet Food"],
  ["Fitness", "Monthly gym membership", 1800, "Gym Membership"],
  ["Subscriptions", "Streaming bundle", 649, "Streaming"],
  ["Technology", "Wireless keyboard", 2199, "Accessories"],
  ["Finance", "Bank service fee", 250, "Bank Fees"],
  ["Insurance", "Health insurance premium", 3200, "Health Insurance"],
  ["Family", "School supplies", 760, "School Fees"],
  ["Work", "Client meeting coffee", 480, "Client Meeting"],
  ["Gifts & Donations", "Charity contribution", 1000, "Charity"],
  ["Others", "Miscellaneous purchase", 390, "Miscellaneous"],
];

function dateMonthsAgo(monthsAgo, day) {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo, day);
  return date.toISOString().slice(0, 10);
}

export async function seedDemoExpenses() {
  const col = getExpenses();
  const count = await col.countDocuments();
  if (count > 0) return;

  const createdAt = new Date().toISOString();
  const docs = DEMO_EXPENSES.map(([category, description, amount, itemType], index) => ({
    amount,
    category,
    item_type: itemType,
    description,
    date: dateMonthsAgo(Math.floor(index / 4), (index % 4) + 5),
    source: "demo",
    raw_ocr_text: null,
    created_at: createdAt,
  }));

  await col.insertMany(docs);
  console.log(`Seeded ${docs.length} demo expenses.`);
}