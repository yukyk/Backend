const Expense = require('../Models/expenseModel');
const Signup = require('../Models/signupModel');
const sequelize = require('../Utils/util');
const { Op } = require('sequelize');

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

    // Simplify - no transaction to avoid lock issues
    const expense = await Expense.create({
      amount,
      description,
      category: category || 'Uncategorized',
      status: req.body.status || 'pending',
      userId: userId,
      note: note || null
    });
    
    console.log('💾 Expense CREATED:', {
      id: expense.id,
      amount,
      userId,
      description: description.substring(0, 30) + '...'
    });

    // Update user total
    await Signup.update(
      { totalExpense: sequelize.literal('totalExpense + ' + amount) },
      { where: { id: userId } }
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

    const whereClause = { userId };

    const expenses = await Expense.findAll({ 
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });
    
    // Add entryType field to each expense
    const expensesWithType = expenses.map(e => ({
      ...e.toJSON(),
      entryType: 'expense'
    }));
    
    
    res.json(expensesWithType);
  } catch(err) {
    res.status(500).json({error: "Error fetching expenses"});
  }
};

// Delete expense
const deleteExpense = async (req, res) => {
  
  const t = await sequelize.transaction();

  try {
    const {id} = req.params;
    const userId = req.user && req.user.userId;
  
    
    if (!userId) {
      await t.rollback();
      console.log('❌ No userId for delete');
      return res.status(401).json({ error: 'Unauthorized - no userId' });
    }

    const expense = await Expense.findOne({ where: { id }, transaction: t });
    if (!expense) {
      await t.rollback();
      return res.status(404).json({ message: `Expense with id ${id} not found.` });
    }

    if (expense.userId !== userId) {
      await t.rollback();
      return res.status(403).json({ error: 'Forbidden - not your expense' });
    }

    // Validate amount before decrement
    const amount = parseFloat(expense.amount) || 0;
    
    if (amount > 0) {
      const result = await Signup.decrement('totalExpense', {
        by: amount,
        where: { id: userId }
      }, { transaction: t });
    }

    await Expense.destroy({ where: { id } }, { transaction: t });
    
    await t.commit();
    
    return res.status(200).json({ message: `Expense with id ${id} deleted.` });
  } catch(err) {
    await t.rollback();
    res.status(500).json({error: "Error deleting expense"});
  }
};

// Update expense
const updateExpense = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {id} = req.params;
    const userId = req.user && req.user.userId;
    if (!userId) {
      await t.rollback();
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const expense = await Expense.findOne({ where: { id }, transaction: t });
    if (!expense) {
      await t.rollback();
      return res.status(404).json({ message: "Expense not found" });
    }

    if (expense.userId !== userId) {
      await t.rollback();
      return res.status(403).json({ error: 'Forbidden' });
    }

    // If amount is being updated, adjust the cached totalExpense
    let amountDiff = 0;
    if (req.body.amount && parseFloat(req.body.amount) !== expense.amount) {
      amountDiff = parseFloat(req.body.amount) - expense.amount;
      await Signup.increment('totalExpense', {
        by: amountDiff,
        where: { id: userId }
      }, { transaction: t });
    }

    const result = await Expense.update(req.body, { where: { id } }, { transaction: t });
    if (result[0] === 0) {
      await t.rollback();
      return res.status(400).json({ message: "No changes applied" });
    }
    
    await t.commit();
    res.json({message: `Expense with id ${id} successfully updated.`});
  } catch(err) {
    await t.rollback();
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
    
    // Allow if premiumTier > 0 OR isPremium is true (backward compatibility)
    if (userPremiumTier === 0 && !userIsPremium) {
      return res.status(403).json({ error: 'Access denied. Premium membership required.' });
    }

    // O(1) database lookup using indexed totalExpense field - no joins or aggregation needed
    const leaderboard = await Signup.findAll({
      attributes: ['id', 'name', 'totalExpense'],
      where: { totalExpense: { [Op.gt]: 0 } },
      order: [['totalExpense', 'DESC']]
    });

    res.json(leaderboard);
  } catch (err) {
    console.error('Leaderboard error:', err.message);
    res.status(500).json({ error: 'Error fetching leaderboard' });
  }
};

const aiService = require('../services/aiService');

// AI-powered category suggestion (public endpoint - no auth needed for suggestion)
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

// Premium-only AI insights (protected)
const getInsights = async (req, res) => {
  try {
    const userId = req.user && req.user.userId;
    if (!req.user.isPremium) {
      return res.status(403).json({ error: 'Premium only' });
    }
    const expenses = await Expense.findAll({ where: { userId } });
    const user = await Signup.findByPk(userId);
    const insights = await aiService.generateInsights(expenses, user?.name || 'User');
    res.json({ insights });
  } catch (err) {
    console.error('AI insights error:', err);
    res.status(500).json({ error: 'Insights generation failed' });
  }
};

const recalculateTotals = async () => {
  try {
    const users = await Signup.findAll();
    for (const user of users) {
      const totalExpense = await Expense.sum('amount', { where: { userId: user.id } }) || 0;
      await user.update({ totalExpense });
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
