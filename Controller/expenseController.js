const Expense = require('../Models/expenseModel');
const Signup = require('../Models/signupModel');

// Create expense for the authenticated user
const addExpense = async (req, res) => {
  try {
    let { amount, description, category, note } = req.body;

    if (!amount || !description) {
      return res.status(400).json({ error: "Amount and description are required" });
    }

    // Ensure amount is a number
    amount = parseFloat(amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Amount must be a valid positive number" });
    }

    const userId = req.user && req.user.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - no userId' });
    }

    const expense = await Expense.create({
      amount,
      description,
      category: category || 'Uncategorized',
      status: req.body.status || 'pending',
      userId: userId,
      note: note || null
    });
    
    console.log('💾 Expense CREATED:', {
      id: expense._id,
      amount,
      userId,
      description: description.substring(0, 30) + '...'
    });

    // Update user total
    await Signup.updateOne(
      { _id: userId },
      { $inc: { totalExpense: amount } }
    );

    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get expenses belonging to authenticated user
const getExpenses = async (req, res) => {
  
  try {
    const userId = req.user && req.user.userId;
    
    if (!userId) {

      return res.status(401).json({ error: 'Unauthorized - no userId' });
    }

    const expenses = await Expense.find({ userId })
      .sort({ createdAt: -1 });
    
    // Add entryType field to each expense
    const expensesWithType = expenses.map(e => ({
      ...e.toObject(),
      entryType: 'expense'
    }));
    
    
    res.json(expensesWithType);
  } catch(err) {
    res.status(500).json({error: "Error fetching expenses"});
  }
};

// Delete expense
const deleteExpense = async (req, res) => {
  try {
    const {id} = req.params;
    const userId = req.user && req.user.userId;

    if (!userId) {
      console.log('❌ No userId for delete');
      return res.status(401).json({ error: 'Unauthorized - no userId' });
    }

    const expense = await Expense.findOne({ _id: id });
    if (!expense) {
      return res.status(404).json({ message: `Expense with id ${id} not found.` });
    }

    if (expense.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Forbidden - not your expense' });
    }

    // Validate amount before decrement
    const amount = parseFloat(expense.amount) || 0;
    
    if (amount > 0) {
      await Signup.updateOne(
        { _id: userId },
        { $inc: { totalExpense: -amount } }
      );
    }

    await Expense.deleteOne({ _id: id });
    
    return res.status(200).json({ message: `Expense with id ${id} deleted.` });
  } catch(err) {
    console.log('🔴 DELETE ERROR:', err.message);
    res.status(500).json({error: "Error deleting expense"});
  }
};

// Update expense
const updateExpense = async (req, res) => {
  try {
    const {id} = req.params;
    const userId = req.user && req.user.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const expense = await Expense.findOne({ _id: id });
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    if (expense.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // If amount is being updated, adjust the cached totalExpense
    let amountDiff = 0;
    if (req.body.amount && parseFloat(req.body.amount) !== expense.amount) {
      amountDiff = parseFloat(req.body.amount) - expense.amount;
      await Signup.updateOne(
        { _id: userId },
        { $inc: { totalExpense: amountDiff } }
      );
    }

    const result = await Expense.updateOne({ _id: id }, req.body);
    console.log('📝 Update result:', result, 'for id:', id, 'body:', req.body);
    if (result.modifiedCount === 0) {
      return res.status(400).json({ message: "No changes applied" });
    }
    
    res.json({message: `Expense with id ${id} successfully updated.`});
  } catch(err) {
    res.status(500).json({error: "Error updating expense"});
  }
};

// Get leaderboard using precalculated totalExpense field (denormalization for performance)
const getLeaderboard = async (req, res) => {
  try {
    const userId = req.user && req.user.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const userPremiumTier = req.user.premiumTier || 0;
    const userIsPremium = req.user.isPremium || false;
    
    if (userPremiumTier === 0 && !userIsPremium) {
      return res.status(403).json({ error: 'Access denied. Premium membership required.' });
    }

    const leaderboard = await Signup.find(
      { totalExpense: { $gt: 0 } },
      'name totalExpense'
    ).sort({ totalExpense: -1 });

    res.json(leaderboard);
  } catch (err) {
    console.error('Leaderboard error:', err.message);
    res.status(500).json({ error: 'Error fetching leaderboard' });
  }
};

const aiService = require('../services/aiService');

const suggestCategory = async (req, res) => {
  try {
    const { description } = req.query;
    if (!description) {
      return res.status(400).json({ error: 'Description required' });
    }
    const category = await aiService.suggestCategory(description);
    res.json({ suggestedCategory: category });
  } catch (err) {
    console.error('Suggest category error:', err);
    res.status(500).json({ error: 'AI suggestion failed' });
  }
};

const getInsights = async (req, res) => {
  try {
    const userId = req.user && req.user.userId;
    if (!req.user.isPremium) {
      return res.status(403).json({ error: 'Premium only' });
    }
    const expenses = await Expense.find({ userId });
    const user = await Signup.findById(userId);
    const insights = await aiService.generateInsights(expenses, user?.name || 'User');
    res.json({ insights });
  } catch (err) {
    console.error('AI insights error:', err);
    res.status(500).json({ error: 'Insights generation failed' });
  }
};

const recalculateTotals = async () => {
  try {
    const users = await Signup.find();
    for (const user of users) {
      const result = await Expense.aggregate([
        { $match: { userId: user._id } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const totalExpense = result[0]?.total || 0;
      user.totalExpense = totalExpense;
      await user.save();
    }
    console.log('✅ Recalculated totalExpense for all users');
  } catch (err) {
    console.error('⚠️ Error recalculating totals:', err.message);
  }
};

module.exports = {
  addExpense, 
  getExpenses, 
  deleteExpense, 
  updateExpense, 
  getLeaderboard, 
  suggestCategory, 
  getInsights, 
  recalculateTotals
};