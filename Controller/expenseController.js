const Expense = require('../Models/expenseModel');
const Income = require('../Models/incomeModel');
const Signup = require('../Models/signupModel');
const sequelize = require('../Utils/util');
const { Op } = require('sequelize');

// Create expense for the authenticated user
const addExpense = async (req, res) => {
  console.log('🌐 POST /add-expense - Body:', req.body);
  console.log('👤 req.user:', req.user);
  
  const t = await sequelize.transaction();

  try {
    let { amount, description, category } = req.body;

    console.log('📥 Parsed input:', { amount, description, category });

    if (!amount || !description) {
      await t.rollback();
      console.log('❌ Missing required fields');
      return res.status(400).json({ error: "Amount and description are required" });
    }

    // Ensure amount is a number
    amount = parseFloat(amount);
    if (isNaN(amount) || amount <= 0) {
      await t.rollback();
      console.log('❌ Invalid amount:', amount);
      return res.status(400).json({ error: "Amount must be a valid positive number" });
    }

    const userId = req.user && req.user.userId;
    console.log('🔑 Using userId:', userId);
    
    if (!userId) {
      await t.rollback();
      console.log('❌ No userId from auth');
      return res.status(401).json({ error: 'Unauthorized - no userId' });
    }

    const expense = await Expense.create({
      amount,
      description,
      category: category || 'Uncategorized',
      status: req.body.status || 'pending',
      userId: userId
    }, { transaction: t });
    
    // 👇 NEW DIAGNOSTIC LOGS
    console.log('💾 Expense CREATED:', {
      id: expense.id,
      amount,
      userId,
      description: description.substring(0, 30) + '...'
    });
    console.log('📊 DB INSERT CONFIRMED:', expense.toJSON());

    // Safe atomic totalExpense update - direct literal (handles races)
    await Signup.update(
      { totalExpense: sequelize.literal('totalExpense + ' + amount) },
      { where: { id: userId }, transaction: t }
    );

    await t.commit();

    console.log(`✅ Expense created - User ${userId}: $${amount} (${expense.id})`);

    res.status(201).json(expense);
  } catch (err) {
    await t.rollback();
    console.error("ADD EXPENSE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get expenses belonging to authenticated user
const getExpenses = async (req, res) => {
  console.log('🌐 GET /get-expenses - req.user:', req.user);
  console.log('📅 Query params:', req.query);
  
  try {
    const userId = req.user && req.user.userId;
    console.log('🔑 Querying expenses for userId:', userId);
    
    if (!userId) {
      console.log('❌ No userId for getExpenses');
      return res.status(401).json({ error: 'Unauthorized - no userId' });
    }

    const { startDate, endDate } = req.query;
    let whereClause = { userId };

    // Add date filtering if provided
    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate + 'T23:59:59.999Z')]
      };
    } else if (startDate) {
      whereClause.createdAt = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      whereClause.createdAt = {
        [Op.lte]: new Date(endDate + 'T23:59:59.999Z')
      };
    }

    const expenses = await Expense.findAll({ 
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });
    
    // Add entryType field to each expense
    const expensesWithType = expenses.map(e => ({
      ...e.toJSON(),
      entryType: 'expense'
    }));
    
    console.log(`✅ QUERY SUCCESS - Found ${expensesWithType.length} expenses for user ${userId}`);
    res.json(expensesWithType);
  } catch(err) {
    console.error('GET EXPENSES ERROR:', err);
    res.status(500).json({error: "Error fetching expenses"});
  }
};

// Delete expense
const deleteExpense = async (req, res) => {
  console.log('🗑️ DELETE /delete-expense/' + req.params.id);
  console.log('👤 req.user:', req.user);
  
  const t = await sequelize.transaction();

  try {
    const {id} = req.params;
    const userId = req.user && req.user.userId;
    
    console.log('🔑 Delete check - userId:', userId, 'expenseId:', id);
    
    if (!userId) {
      await t.rollback();
      console.log('❌ No userId for delete');
      return res.status(401).json({ error: 'Unauthorized - no userId' });
    }

    const expense = await Expense.findOne({ where: { id }, transaction: t });
    if (!expense) {
      await t.rollback();
      console.log(`❌ Expense ${id} not found`);
      return res.status(404).json({ message: `Expense with id ${id} not found.` });
    }

    console.log('📋 Found expense:', expense.toJSON());

    if (expense.userId !== userId) {
      await t.rollback();
      console.log(`❌ User ${userId} cannot delete expense ${expense.userId}`);
      return res.status(403).json({ error: 'Forbidden - not your expense' });
    }

    // Validate amount before decrement
    const amount = parseFloat(expense.amount) || 0;
    console.log(`💰 Decrementing totalExpense by $${amount}`);
    
    if (amount > 0) {
      const result = await Signup.decrement('totalExpense', {
        by: amount,
        where: { id: userId }
      }, { transaction: t });
      console.log('📉 totalExpense decrement result:', result);
    }

    await Expense.destroy({ where: { id } }, { transaction: t });
    
    await t.commit();
    console.log(`✅ Deleted expense ${id} for user ${userId}`);
    
    return res.status(200).json({ message: `Expense with id ${id} deleted.` });
  } catch(err) {
    await t.rollback();
    console.error("DELETE EXPENSE ERROR:", err);
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
    console.error("UPDATE EXPENSE ERROR:", err);
    res.status(500).json({error: "Error updating expense"});
  }
};

// Get leaderboard using precalculated totalExpense field (denormalization for performance)
const getLeaderboard = async (req, res) => {
  try {
    const userId = req.user && req.user.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!req.user.isPremium) {
      return res.status(403).json({ error: 'Access denied. Premium membership required.' });
    }

    // O(1) database lookup using indexed totalExpense field - no joins or aggregation needed
    const leaderboard = await Signup.findAll({
      attributes: ['id', 'name', 'totalExpense'],
      where: { totalExpense: { [Op.gt]: 0 } },
      order: [['totalExpense', 'DESC']]
    });

    console.log(`✅ Leaderboard fetched - Found ${leaderboard.length} users with expenses:`, leaderboard.map(u => ({ id: u.id, name: u.name, total: u.totalExpense })));

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

// ==================== INCOME FUNCTIONS ====================

// Add income
const addIncome = async (req, res) => {
  console.log('🌐 POST /add-income - Body:', req.body);
  console.log('👤 req.user:', req.user);
  
  const t = await sequelize.transaction();

  try {
    let { amount, description, category } = req.body;

    if (!amount || !description) {
      await t.rollback();
      return res.status(400).json({ error: "Amount and description are required" });
    }

    amount = parseFloat(amount);
    if (isNaN(amount) || amount <= 0) {
      await t.rollback();
      return res.status(400).json({ error: "Amount must be a valid positive number" });
    }

    const userId = req.user && req.user.userId;
    if (!userId) {
      await t.rollback();
      return res.status(401).json({ error: 'Unauthorized - no userId' });
    }

    const income = await Income.create({
      amount,
      description,
      category: category || 'Uncategorized',
      status: req.body.status || 'completed',
      userId: userId
    }, { transaction: t });
    
    console.log(`✅ Income created - User ${userId}: $${amount} (${income.id})`);

    await t.commit();
    res.status(201).json({...income.toJSON(), entryType: 'income'});
  } catch (err) {
    await t.rollback();
    console.error("ADD INCOME ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get incomes
const getIncomes = async (req, res) => {
  console.log('🌐 GET /get-incomes - req.user:', req.user);
  console.log('📅 Query params:', req.query);
  
  try {
    const userId = req.user && req.user.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - no userId' });
    }

    const { startDate, endDate } = req.query;
    let whereClause = { userId };

    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate + 'T23:59:59.999Z')]
      };
    } else if (startDate) {
      whereClause.createdAt = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      whereClause.createdAt = {
        [Op.lte]: new Date(endDate + 'T23:59:59.999Z')
      };
    }

    const incomes = await Income.findAll({ 
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });
    
    const incomesWithType = incomes.map(i => ({
      ...i.toJSON(),
      entryType: 'income'
    }));
    
    console.log(`✅ QUERY SUCCESS - Found ${incomesWithType.length} incomes for user ${userId}`);
    res.json(incomesWithType);
  } catch(err) {
    console.error('GET INCOMES ERROR:', err);
    res.status(500).json({error: "Error fetching incomes"});
  }
};

// Delete income
const deleteIncome = async (req, res) => {
  console.log('🗑️ DELETE /delete-income/' + req.params.id);
  
  const t = await sequelize.transaction();

  try {
    const {id} = req.params;
    const userId = req.user && req.user.userId;
    
    if (!userId) {
      await t.rollback();
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const income = await Income.findOne({ where: { id }, transaction: t });
    if (!income) {
      await t.rollback();
      return res.status(404).json({ message: `Income with id ${id} not found.` });
    }

    if (income.userId !== userId) {
      await t.rollback();
      return res.status(403).json({ error: 'Forbidden - not your income' });
    }

    await Income.destroy({ where: { id } }, { transaction: t });
    
    await t.commit();
    console.log(`✅ Deleted income ${id} for user ${userId}`);
    
    return res.status(200).json({ message: `Income with id ${id} deleted.` });
  } catch(err) {
    await t.rollback();
    console.error("DELETE INCOME ERROR:", err);
    res.status(500).json({error: "Error deleting income"});
  }
};

// Update income
const updateIncome = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {id} = req.params;
    const userId = req.user && req.user.userId;
    if (!userId) {
      await t.rollback();
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const income = await Income.findOne({ where: { id }, transaction: t });
    if (!income) {
      await t.rollback();
      return res.status(404).json({ message: "Income not found" });
    }

    if (income.userId !== userId) {
      await t.rollback();
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await Income.update(req.body, { where: { id } }, { transaction: t });
    if (result[0] === 0) {
      await t.rollback();
      return res.status(400).json({ message: "No changes applied" });
    }
    
    await t.commit();
    res.json({message: `Income with id ${id} successfully updated.`});
  } catch(err) {
    await t.rollback();
    console.error("UPDATE INCOME ERROR:", err);
    res.status(500).json({error: "Error updating income"});
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
  recalculateTotals,
  addIncome,
  getIncomes,
  deleteIncome,
  updateIncome
};
