const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const API_KEY = process.env.GOOGLE_AI_API_KEY || '';
let genAI = null;

if (API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(API_KEY);
  } catch (e) {
    console.warn('Google AI initialization failed:', e.message);
  }
}

const FALLBACK_CATEGORIES = {
  'food': ['lunch', 'dinner', 'breakfast', 'coffee', 'snack', 'restaurant', 'cafe'],
  'transport': ['gas', 'fuel', 'uber', 'lyft', 'taxi', 'bus', 'train', 'parking', 'toll'],
  'shopping': ['amazon', 'store', 'clothes', 'shoes', 'gift'],
  'entertainment': ['movie', 'netflix', 'spotify', 'game', 'concert'],
  'utilities': ['electric', 'water', 'internet', 'phone', 'bill'],
  'health': ['doctor', 'pharmacy', 'medicine', 'gym', 'hospital'],
  'housing': ['rent', 'mortgage', 'insurance', 'repair']
};

function getCategoryFromKeyword(description) {
  const desc = description.toLowerCase();
  for (const [category, keywords] of Object.entries(FALLBACK_CATEGORIES)) {
    if (keywords.some(k => desc.includes(k))) {
      return category.charAt(0).toUpperCase() + category.slice(1);
    }
  }
  return null;
}

async function suggestCategory(description) {
  if (!description || typeof description !== 'string' || description.trim().length < 3) {
    return null;
  }

  const trimmedDesc = description.trim();
  
  // First try keyword matching (instant, no API needed)
  const keywordCategory = getCategoryFromKeyword(trimmedDesc);
  if (keywordCategory) {
    return keywordCategory;
  }

  // If no API key or AI initialization failed, return null
  if (!genAI) {
    console.log('AI suggestion skipped - no API key configured');
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Analyze this expense description and suggest a single, concise category name (1-2 words max). Examples: "Lunch" → "Food", "Gas" → "Transportation", "Movie tickets" → "Entertainment", "Electricity bill" → "Utilities".
Description: "${trimmedDesc}"
Respond with ONLY the category name.`;

    const result = await model.generateContent(prompt);
    const text = (await result.response.text()).trim();

    if (text && text.length <= 20 && text.length >= 1) {
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }
    return null;
  } catch (error) {
    console.error('Gemini suggestion error:', error.message);
    return null;
  }
}

async function generateInsights(expenses, userName) {
  if (!expenses || expenses.length === 0) return null;

  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const byCategory = {};
  expenses.forEach(e => {
    const cat = e.category || 'Other';
    byCategory[cat] = (byCategory[cat] || 0) + parseFloat(e.amount || 0);
  });

  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  const avg = total / expenses.length;

  // If no AI key, return simple fallback
  if (!genAI) {
    return `• Total spending: $${total.toFixed(2)}\n• Average per expense: $${avg.toFixed(2)}\n• Top category: ${topCategory ? topCategory[0] : 'None'}`;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `User ${userName} expenses summary:
Total: $${total.toFixed(2)}
Avg per expense: $${avg.toFixed(2)}
By category: ${JSON.stringify(byCategory)}
Top category: ${topCategory[0]} (${((topCategory[1]/total)*100).toFixed(1)}%)

Give 3 short bullet point insights/tips. Premium user only.`;

    const result = await model.generateContent(prompt);
    return await result.response.text();
  } catch (error) {
    console.error('Gemini insights error:', error.message);
    return `• Total spending: $${total.toFixed(2)}\n• Average: $${avg.toFixed(2)}\n• Top category: ${topCategory[0]}`;
  }
}

module.exports = { suggestCategory, generateInsights };

