const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// Removed fixed categories - AI generates freely

async function suggestCategory(description) {
  if (!description || typeof description !== 'string' || description.trim().length < 3) {
    return null; // No suggestion for short/empty desc
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Analyze this expense description and suggest a single, concise category name (1-2 words max). Examples: "Lunch" → "Food", "Gas" → "Transportation", "Movie tickets" → "Entertainment", "Electricity bill" → "Utilities".
Description: "${description.trim()}"
Respond with ONLY the category name.`;

    const result = await model.generateContent(prompt);
    const text = (await result.response.text()).trim();

    // Clean and validate (no empty, reasonable length)
    if (text && text.length <= 20 && text.length >= 1) {
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }
    return null;
  } catch (error) {
    console.error('Gemini suggestion error:', error);
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
    console.error('Gemini insights error:', error);
    return `• Total spending: $${total.toFixed(2)}\n• Average: $${avg.toFixed(2)}\n• Top category: ${topCategory[0]}`;
  }
}

module.exports = { suggestCategory, generateInsights };

