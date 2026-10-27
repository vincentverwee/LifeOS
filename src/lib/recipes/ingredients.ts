/**
 * Everyday ingredients for the Fridge page: quick-add chips and the suggestions while typing.
 * Spelled the way Spoonacular names them, so the "what can I make" search matches.
 * Basics it assumes anyway (salt, pepper, oil, flour, water, sugar) are left out.
 */
export const COMMON_INGREDIENTS: { group: string; items: string[] }[] = [
  {
    group: "Vegetables",
    items: [
      "tomatoes", "cherry tomatoes", "onion", "red onion", "spring onions", "garlic", "potatoes", "sweet potatoes",
      "carrots", "bell pepper", "courgette", "aubergine", "broccoli", "cauliflower", "spinach", "lettuce",
      "cucumber", "mushrooms", "leek", "celery", "cabbage", "kale", "peas", "sweetcorn", "green beans",
      "avocado", "chili pepper", "ginger", "butternut squash",
    ],
  },
  {
    group: "Fruit",
    items: ["lemon", "lime", "apples", "bananas", "oranges", "berries", "strawberries", "blueberries", "mango", "pineapple"],
  },
  {
    group: "Meat & fish",
    items: [
      "chicken breast", "chicken thighs", "minced beef", "beef steak", "pork chops", "minced pork", "bacon", "ham",
      "sausages", "chorizo", "salmon", "tuna", "cod", "prawns", "turkey",
    ],
  },
  {
    group: "Dairy & eggs",
    items: [
      "eggs", "milk", "butter", "cheddar", "parmesan", "mozzarella", "feta", "cream cheese", "cream",
      "sour cream", "greek yogurt", "yogurt",
    ],
  },
  {
    group: "Cupboard",
    items: [
      "pasta", "spaghetti", "rice", "noodles", "bread", "tortillas", "couscous", "oats", "canned tomatoes",
      "tomato paste", "passata", "chickpeas", "kidney beans", "black beans", "lentils", "coconut milk",
      "stock", "soy sauce", "honey", "peanut butter", "mustard", "mayonnaise", "pesto", "olives", "tofu",
    ],
  },
  {
    group: "Herbs & spices",
    items: ["basil", "parsley", "coriander", "thyme", "rosemary", "oregano", "paprika", "cumin", "curry powder", "chili flakes", "cinnamon"],
  },
];

/**
 * Up to `limit` names matching what's being typed: names starting with it first,
 * then names with a word starting with it, then any other match.
 */
export function suggestIngredients(query: string, names: string[], exclude: Set<string>, limit = 6): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const rank = (name: string) =>
    name.startsWith(q) ? 0 : name.split(/\s+/).some((word) => word.startsWith(q)) ? 1 : name.includes(q) ? 2 : -1;
  return [...new Set(names)]
    .filter((name) => !exclude.has(name))
    .map((name) => ({ name, rank: rank(name) }))
    .filter((s) => s.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.name.length - b.name.length || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((s) => s.name);
}
