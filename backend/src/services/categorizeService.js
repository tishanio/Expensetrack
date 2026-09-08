/**
 * Auto-categorize an expense based on merchant name and description.
 * Uses keyword matching to assign one of the predefined categories.
 */

const CATEGORY_RULES = [
  {
    category: "Food",
    keywords: [
      "swiggy",
      "zomato",
      "restaurant",
      "cafe",
      "coffee",
      "food",
      "pizza",
      "burger",
      "biryani",
      "chai",
      "tea",
      "mcdonald",
      "kfc",
      "subway",
      "dominos",
      "starbucks",
      "barista",
      "pizza hut",
      "dhaba",
      "mess",
      "canteen",
      "grocery",
      "groceries",
      "bigbasket",
      "blinkit",
      "zepto",
      "instamart",
      "jio mart",
      "dmart",
      "supermarket",
      "mart",
      "bakery",
      "sweet",
      "milk",
      "bread",
      "rice",
      "dal",
      "vegetable",
      "fruit",
      "meat",
      "chicken",
      "egg",
    ],
  },
  {
    category: "Transport",
    keywords: [
      "uber",
      "ola",
      "rapido",
      "auto",
      "taxi",
      "cab",
      "bus",
      "metro",
      "train",
      "flight",
      "airline",
      "petrol",
      "diesel",
      "fuel",
      "gas station",
      "parking",
      "toll",
      "irctc",
      "redbus",
      "rapido",
      "bike",
      "rental",
      "swiggy instamart",
    ],
  },
  {
    category: "Shopping",
    keywords: [
      "amazon",
      "flipkart",
      "myntra",
      "ajio",
      "meesho",
      "nykaa",
      "shopping",
      "clothes",
      "clothing",
      "shirt",
      "pant",
      "shoe",
      "footwear",
      "watch",
      "jewelry",
      "jewellery",
      "bag",
      "electronics",
      "mobile",
      "phone",
      "laptop",
      "headphone",
      "speaker",
      "croma",
      "relance digital",
      "westside",
      "lifestyle",
      "shoppers stop",
      "dmart",
    ],
  },
  {
    category: "Bills",
    keywords: [
      "electricity",
      "electric",
      "power",
      "water bill",
      "gas bill",
      "internet",
      "wifi",
      "broadband",
      "phone bill",
      "mobile bill",
      "recharge",
      "dth",
      "cable",
      "rent",
      "emi",
      "insurance",
      "premium",
      "tax",
      "income tax",
      "gst",
      "credit card",
      "loan",
      "maintenance",
      "society",
    ],
  },
  {
    category: "Stationery",
    keywords: [
      "pen",
      "pencil",
      "notebook",
      "paper",
      "printer",
      "ink",
      "cartridge",
      "stapler",
      "file",
      "folder",
      "marker",
      "highlighter",
      "eraser",
      "ruler",
      "scissors",
      "tape",
      "envelope",
      "stamp",
      "stationery",
      "book",
      "textbook",
      "diary",
      "planner",
      "whiteboard",
      "marker",
    ],
  },
];

/**
 * Determine the best category for an expense.
 * @param {string} merchant - Merchant/item name from OCR or user input
 * @param {string} description - User-provided description
 * @returns {string} One of: Food, Stationery, Transport, Shopping, Bills, Others
 */
export function categorizeExpense(merchant = "", description = "") {
  const combined = `${merchant} ${description}`.toLowerCase();

  // Score each category by keyword matches
  let bestCategory = "Others";
  let bestScore = 0;

  for (const rule of CATEGORY_RULES) {
    let score = 0;
    for (const keyword of rule.keywords) {
      if (combined.includes(keyword)) {
        // Longer keyword matches are more specific -> higher weight
        score += keyword.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = rule.category;
    }
  }

  return bestCategory;
}
