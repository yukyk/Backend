const Expense = require('../Models/expenseModel');
const Signup = require('../Models/signupModel');
const sequelize = require('../Utils/util');

// Create expense for the authenticated user
const addExpense = async (req , res) =>{
  try {
    const { amount, description, category } = req.body;

    if (!amount || !description || !category) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const userId = req.user && req.user.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const expense = await Expense.create({
      amount,
      description,
      category,
      userId: userId
    });

    res.status(201).json(expense);
  } catch (err) {
    console.error("ADD EXPENSE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get expenses belonging to authenticated user
const getExpenses = async (req , res) =>{
  try{
    const userId = req.user && req.user.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const expenses = await Expense.findAll({ where: { userId: userId } });
    res.json(expenses)
  } catch(err){
    res.status(500).json({error: "Error fetching expenses"});
  }
};

// Delete expense
const deleteExpense = async (req , res) =>{
  try{
    const {id} = req.params;
    const userId = req.user && req.user.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const expense = await Expense.findOne({ where: { id } });
    if (!expense) return res.status(404).json({ message: `Expense with id ${id} not found.` });

    if (expense.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await Expense.destroy({ where: { id } });
    return res.status(200).json({ message: `Expense with id ${id} deleted.` });
  } catch(err){
    res.status(500).json({error: "Error deleting expense"});
  }
};

// Update expense
const updateExpense = async (req , res) =>{
  try{
    const {id} = req.params;
    const userId = req.user && req.user.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const expense = await Expense.findOne({ where: { id } });
    if (!expense) return res.status(404).json({ message: "Expense not found" });

    if (expense.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await Expense.update(req.body, { where: { id } });
    if (result[0] === 0) {
      return res.status(400).json({ message: "No changes applied" });
    }
    res.json({message: `Expense with id ${id} successfully updated.`});
  } catch(err){
    res.status(500).json({error: "Error updating expense"});
  }
};

// Get leaderboard - FIXED FOR MYSQL
const getLeaderboard = async (req, res) => {
  try {
    const userId = req.user && req.user.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!req.user.isPremium) {
      return res.status(403).json({ error: 'Access denied. Premium membership required.' });
    }

    // Raw SQL query for better MySQL compatibility
    const leaderboard = await sequelize.query(`
  SELECT s.id, s.name, SUM(e.amount) as totalExpense
  FROM signup s
  LEFT JOIN expenses e ON s.id = e.userId
  GROUP BY s.id, s.name
  HAVING SUM(e.amount) > 0
  ORDER BY totalExpense DESC
`, { type: sequelize.QueryTypes.SELECT });

    res.json(leaderboard);
  } catch (err) {
    console.error('Leaderboard error:', err.message);
    res.status(500).json({ error: 'Error fetching leaderboard' });
  }
};

module.exports = {addExpense, getExpenses, deleteExpense, updateExpense, getLeaderboard};