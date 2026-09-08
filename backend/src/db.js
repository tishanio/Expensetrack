import { MongoClient } from "mongodb";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "expensesnap";

let client = null;
let db = null;
let expensesCollection = null;
let categoriesCollection = null;

/**
 * Connect to MongoDB and initialize collections.
 */
export async function connectDb() {
  client = new MongoClient(MONGO_URI);
  await client.connect();

  db = client.db(DB_NAME);
  expensesCollection = db.collection("expenses");
  categoriesCollection = db.collection("categories");

  // Create indexes for expenses
  await expensesCollection.createIndex({ date: -1 });
  await expensesCollection.createIndex({ category: 1 });
  await expensesCollection.createIndex({ source: 1 });
  await expensesCollection.createIndex({ category: 1, date: -1 });
  await expensesCollection.createIndex({ item_type: 1 });

  // Create indexes for categories
  await categoriesCollection.createIndex({ name: 1 }, { unique: true });

  console.log(`Connected to MongoDB: ${MONGO_URI}/${DB_NAME}`);
  return db;
}

/**
 * Get the expenses collection.
 */
export function getExpenses() {
  return expensesCollection;
}

/**
 * Get the categories collection.
 */
export function getCategories() {
  return categoriesCollection;
}

/**
 * Close the MongoDB connection.
 */
export async function closeDb() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    expensesCollection = null;
    categoriesCollection = null;
  }
}
